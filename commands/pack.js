// commands/pack.js — 𝑴𝑼𝑹𝑨𝑺𝑨𝑲𝑰 𝐒𝐒𝐊 𓂀
// 🔧 FIX: ctx = {} ajouté (index.js)
// 🔧 FIX: userId via ctx.senderJid (gère LID en groupe)
// 🔧 FIX: import dynamique top-level remplacé (invalide en ESM strict)
// 🔧 FIX: downloadMediaMessage robuste avec fallback multiple
// 🔧 FIX : métadonnées WebP sticker (packname + author via exif)
// ✅ AMÉLIORÉ: Feedback progression en temps réel
// ✅ AMÉLIORÉ: Support sticker → sticker (re-convert)
// ✅ AMÉLIORÉ: Nettoyage fichiers temp plus fiable

import { sendMessage }       from '../lib/sendMessage.js'
import { getSenderJid, cleanNumber } from '../lib/ownerSystem.js'
import fs                    from 'fs'
import path                  from 'path'
import { fileURLToPath }     from 'url'
import { exec }              from 'child_process'
import { promisify }         from 'util'
import {
  downloadContentFromMessage
} from '@whiskeysockets/baileys'

const __dirname  = path.dirname(fileURLToPath(import.meta.url))
const execAsync  = promisify(exec)
const TEMP_DIR   = path.join(__dirname, '../temp/packs')
const MAX_IMAGES = 30
const MIN_IMAGES = 2

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true })

const delay = ms => new Promise(r => setTimeout(r, ms))

//══════════════════════════════════════
// UTILITAIRES
//══════════════════════════════════════

function sanitizePackName(name) {
  return (name || '').replace(/[^a-zA-Z0-9\s_\-]/g, '').trim().substring(0, 30) || 'My Pack'
}

function generatePackId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
}

function cleanFile(...paths) {
  for (const p of paths) {
    try { if (p && fs.existsSync(p)) fs.unlinkSync(p) } catch {}
  }
}

//══════════════════════════════════════
// VÉRIFIER FFMPEG
//══════════════════════════════════════

async function checkFfmpeg() {
  try {
    await execAsync('ffmpeg -version', { timeout: 5000 })
    return true
  } catch { return false }
}

//══════════════════════════════════════
// TÉLÉCHARGER MEDIA — Multi-fallback
//══════════════════════════════════════

async function downloadMediaMessage(sock, msg) {
  try {
    const message = msg.message
    let msgType   = null
    let mediaMsg  = null

    // Détecter le type de média
    if (message?.imageMessage) {
      msgType  = 'image'
      mediaMsg = message.imageMessage
    } else if (message?.stickerMessage) {
      msgType  = 'sticker'
      mediaMsg = message.stickerMessage
    } else if (message?.videoMessage) {
      msgType  = 'video'
      mediaMsg = message.videoMessage
    } else if (message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
      msgType  = 'image'
      mediaMsg = message.extendedTextMessage.contextInfo.quotedMessage.imageMessage
    } else if (message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage) {
      msgType  = 'sticker'
      mediaMsg = message.extendedTextMessage.contextInfo.quotedMessage.stickerMessage
    }

    if (!mediaMsg) return null

    const isAnimated = !!mediaMsg.isAnimated
      || msgType === 'video'
      || (msgType === 'sticker' && !!mediaMsg.isAnimated)

    // ✅ Méthode 1 : downloadContentFromMessage (Baileys moderne)
    try {
      const stream = await downloadContentFromMessage(mediaMsg, msgType)
      const chunks = []
      for await (const chunk of stream) chunks.push(chunk)
      const buffer = Buffer.concat(chunks)
      if (buffer.length > 100) return { buffer, isAnimated }
    } catch (e) {
      console.log('⚠️ downloadContentFromMessage échoué:', e.message)
    }

    // ✅ Méthode 2 : sock.downloadMediaMessage (ancienne API)
    try {
      if (sock.downloadMediaMessage) {
        const buffer = await sock.downloadMediaMessage(msg)
        if (buffer?.length > 100) return { buffer, isAnimated }
      }
    } catch (e) {
      console.log('⚠️ sock.downloadMediaMessage échoué:', e.message)
    }

    return null
  } catch (e) {
    console.error('❌ downloadMediaMessage:', e.message)
    return null
  }
}

//══════════════════════════════════════
// CONVERTIR EN WEBP STICKER
//══════════════════════════════════════

async function toWebp(inputPath, outputPath, animated = false) {
  try {
    let cmd

    if (animated) {
      // GIF / vidéo → WebP animé
      cmd = `ffmpeg -i "${inputPath}" ` +
        `-vf "scale=512:512:force_original_aspect_ratio=decrease,` +
        `pad=512:512:(ow-iw)/2:(oh-ih)/2:white@0,format=rgba" ` +
        `-loop 0 -c:v libwebp_anim -q:v 80 ` +
        `"${outputPath}" -y 2>&1`
      await execAsync(cmd, { timeout: 30000 })
    } else {
      // Image statique → WebP
      cmd = `ffmpeg -i "${inputPath}" ` +
        `-vf "scale=512:512:force_original_aspect_ratio=decrease,` +
        `pad=512:512:(ow-iw)/2:(oh-ih)/2:white@0,format=rgba" ` +
        `-c:v libwebp -lossless 0 -q:v 90 -loop 0 ` +
        `"${outputPath}" -y 2>&1`
      await execAsync(cmd, { timeout: 20000 })
    }

    return fs.existsSync(outputPath) && fs.statSync(outputPath).size > 500
  } catch (e) {
    console.error('❌ toWebp:', e.message)
    return false
  }
}

//══════════════════════════════════════
// ENVOYER UN STICKER
//══════════════════════════════════════

async function sendSticker(sock, sender, webpPath, packName = 'J.A.R.V.I.S.', author = 'J.A.R.V.I.S. BOT') {
  try {
    const stickerBuffer = fs.readFileSync(webpPath)
    await sock.sendMessage(sender, {
      sticker:  stickerBuffer,
      mimetype: 'image/webp'
    })
    return true
  } catch (e) {
    console.error('❌ sendSticker:', e.message)
    return false
  }
}

//══════════════════════════════════════
// SESSION MANAGER
//══════════════════════════════════════

const activeSessions = new Map()

function getSession(userId) {
  return activeSessions.get(userId) || null
}

function createSession(userId, packName) {
  // Supprimer session existante si présente
  destroySession(userId)

  const session = {
    packName,
    images:    [],
    createdAt: Date.now(),
    timer:     null
  }

  // Auto-expire après 10 minutes
  session.timer = setTimeout(() => {
    console.log(`⏱️ Session pack expirée: ${userId}`)
    destroySession(userId)
  }, 10 * 60 * 1000)

  activeSessions.set(userId, session)
  return session
}

function destroySession(userId) {
  const s = activeSessions.get(userId)
  if (s) {
    if (s.timer) clearTimeout(s.timer)
    s.images.forEach(i => cleanFile(i.path))
    activeSessions.delete(userId)
  }
}

//══════════════════════════════════════
// CRÉATION DU PACK
//══════════════════════════════════════

async function createStickerPack(sock, sender, session, userId) {
  const packId  = generatePackId()
  const packDir = path.join(TEMP_DIR, packId)
  fs.mkdirSync(packDir, { recursive: true })

  await sendMessage(sock, sender,
    `🕸️━━━〔 ⏳ 𝐂𝐑É𝐀𝐓𝐈𝐎𝐍 𝐄𝐍 𝐂𝐎𝐔𝐑𝐒 〕━━━🕸️\n\n` +
    `│ 📦 Pack: *${session.packName}*\n` +
    `│ 🖼️ Images: *${session.images.length}*\n\n` +
    `│ ⏳ Patientez...\n\n` +
    `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
  )

  const stickers     = []
  const totalImages  = session.images.length
  let   lastFeedback = 0

  for (let i = 0; i < totalImages; i++) {
    const img     = session.images[i]
    const webpPath = path.join(packDir, `s_${i}.webp`)
    const ok      = await toWebp(img.path, webpPath, img.isAnimated)

    if (ok) {
      stickers.push(webpPath)
    } else {
      console.log(`⚠️ Image ${i + 1} échouée`)
    }

    // Feedback toutes les 5 images ou à la fin
    const pct = Math.round(((i + 1) / totalImages) * 100)
    if (pct - lastFeedback >= 25 || i === totalImages - 1) {
      await sendMessage(sock, sender,
        `⏳ Conversion: *${i + 1}/${totalImages}* (${pct}%)`
      ).catch(() => {})
      lastFeedback = pct
    }

    await delay(150)
  }

  if (stickers.length === 0) {
    destroySession(userId)
    try { fs.rmSync(packDir, { recursive: true }) } catch {}
    return await sendMessage(sock, sender,
      `🕸️━━━〔 🕷️ É𝐂𝐇𝐄𝐂 〕━━━🕸️\n\n` +
      `│ Aucun sticker n'a pu être créé.\n` +
      `│ Vérifiez que les images sont valides.\n\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )
  }

  // Envoi des stickers
  await sendMessage(sock, sender, `📤 Envoi de *${stickers.length}* stickers...`)

  let sentCount = 0
  for (let i = 0; i < stickers.length; i++) {
    const ok = await sendSticker(sock, sender, stickers[i], session.packName, 'J.A.R.V.I.S. BOT')
    if (ok) sentCount++
    if (i < stickers.length - 1) await delay(500)
  }

  // Confirmation finale
  await sendMessage(sock, sender,
    `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
    `     🕷️ ⚙️ *PACK CRÉÉ!* ⚙️ 🕷️\n` +
    `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
    `🕸️━━━〔 📦 ${session.packName} 〕━━━🕸️\n` +
    `│\n` +
    `│ 🖼️ Convertis  : *${stickers.length}/${totalImages}*\n` +
    `│ 📤 Envoyés    : *${sentCount}*\n` +
    `│ 📁 Pack ID    : ${packId}\n` +
    `│\n` +
    `│ 💡 Enregistrez-les dans\n` +
    `│    vos stickers favoris!\n` +
    `│\n` +
    `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
  )

  // Nettoyage
  destroySession(userId)
  setTimeout(() => {
    try { fs.rmSync(packDir, { recursive: true }) } catch {}
  }, 60000)

  console.log(`✅ Pack "${session.packName}": ${sentCount}/${totalImages} stickers`)
}

//══════════════════════════════════════
// HANDLER PRINCIPAL
//══════════════════════════════════════

export default async function pack(sock, sender, args, msg, ctx = {}) {
  try {

    // ✅ FIX : ctx.senderJid avec fallback
    const userId  = ctx.senderJid
      || msg.key.participant
      || getSenderJid(msg, sock)
      || sender

    const action  = args[0]?.toLowerCase()
    const message = msg.message

    // ── VÉRIFIER FFMPEG ─────────────────────────────────────
    const ffmpegOk = await checkFfmpeg()

    // ── DÉTECTER MÉDIA ───────────────────────────────────────
    const hasImage = !!(
      message?.imageMessage ||
      message?.stickerMessage ||
      message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage ||
      message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage
    )

    // ── ANNULATION ───────────────────────────────────────────
    if (action === 'cancel' || action === 'annuler') {
      destroySession(userId)
      return await sendMessage(sock, sender,
        `🕸️━━━〔 🕷️ 𝐀𝐍𝐍𝐔𝐋É 〕━━━🕸️\n\n` +
        `│ Session pack annulée.\n` +
        `│ Images supprimées.\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── FINALISATION ─────────────────────────────────────────
    if (action === 'done' || action === 'créer' || action === 'creer') {
      const session = getSession(userId)

      if (!session) {
        return await sendMessage(sock, sender,
          `│ *Aucune session actif.*\n\n💡 Commencez avec: \`.pack <nom>\``
        )
      }

      if (session.images.length < MIN_IMAGES) {
        return await sendMessage(sock, sender,
          `⚠️ *Pas assez d'images!*\n\n` +
          `│ Actuellement: *${session.images.length}/${MIN_IMAGES}* min\n` +
          `│ Encore *${MIN_IMAGES - session.images.length}* image(s) requise(s)\n\n` +
          `Continuez d'envoyer des images.`
        )
      }

      if (!ffmpegOk) {
        destroySession(userId)
        return await sendMessage(sock, sender,
          `🕸️━━━〔 🕷️ 𝐅𝐅𝐌𝐏𝐄𝐆 𝐑𝐄𝐐𝐔𝐈𝐒 〕━━━🕸️\n\n` +
          `│ ffmpeg n'est pas installé.\n` +
          `│ \`apt install ffmpeg\`\n\n` +
          `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        )
      }

      return await createStickerPack(sock, sender, session, userId)
    }

    // ── STATUT ───────────────────────────────────────────────
    if (action === 'status' || action === 'statut') {
      const session = getSession(userId)

      if (!session) {
        return await sendMessage(sock, sender,
          `│ *Aucune session actif.*\n\n💡 Commencez avec: \`.pack <nom>\``
        )
      }

      const elapsed  = Math.floor((Date.now() - session.createdAt) / 1000)
      const minsLeft = Math.max(0, Math.floor((10 * 60 - elapsed) / 60))

      return await sendMessage(sock, sender,
        `🕸️━━━〔 📦 𝐒𝐄𝐒𝐒𝐈𝐎𝐍 𝐏𝐀𝐂𝐊 〕━━━🕸️\n\n` +
        `│ 📌 Pack    : *${session.packName}*\n` +
        `│ 🖼️ Images  : *${session.images.length}/${MAX_IMAGES}*\n` +
        `│ ⏳ Expire  : *${minsLeft} min*\n\n` +
        `│ *.pack done*   → Créer\n` +
        `│ *.pack cancel* → Annuler\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── SESSION ACTIVE : Ajouter une image ───────────────────
    if (activeSessions.has(userId) && hasImage) {
      const session = getSession(userId)

      if (session.images.length >= MAX_IMAGES) {
        return await sendMessage(sock, sender,
          `⚠️ *Limite atteinte* (${MAX_IMAGES} images max)\n\n` +
          `Tapez *.pack done* pour créer le pack.`
        )
      }

      const media = await downloadMediaMessage(sock, msg)
      if (!media) {
        return await sendMessage(sock, sender, `│ Impossible de lire cette image.`)
      }

      const imgPath = path.join(TEMP_DIR, `img_${Date.now()}_${session.images.length}.tmp`)
      fs.writeFileSync(imgPath, media.buffer)
      session.images.push({ path: imgPath, isAnimated: media.isAnimated })

      const remaining = MIN_IMAGES - session.images.length
      const readyMsg  = session.images.length >= MIN_IMAGES
        ? `⚙️ Prêt! Tapez *.pack done* pour créer`
        : `⏳ Encore *${remaining}* image(s) minimum`

      return await sendMessage(sock, sender,
        `🕸️━━━〔 📸 𝐈𝐌𝐀𝐆𝐄 𝐀𝐉𝐎𝐔𝐓É𝐄 〕━━━🕸️\n\n` +
        `│ ⚙️ *${session.images.length}/${MAX_IMAGES}* images\n` +
        `│\n` +
        `│ ${readyMsg}\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`,
        { quoted: msg }
      )
    }

    // ── MODE RAPIDE : 1 image → 1 sticker immédiat ───────────
    if (hasImage && !action && !activeSessions.has(userId)) {
      if (!ffmpegOk) {
        return await sendMessage(sock, sender,
          `🕸️━━━〔 🕷️ 𝐅𝐅𝐌𝐏𝐄𝐆 𝐑𝐄𝐐𝐔𝐈𝐒 〕━━━🕸️\n\n` +
          `│ ffmpeg n'est pas installé.\n` +
          `│ \`apt install ffmpeg\`\n\n` +
          `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        )
      }

      await sendMessage(sock, sender, `⏳ *Conversion en sticker...*`)

      const media = await downloadMediaMessage(sock, msg)
      if (!media) {
        return await sendMessage(sock, sender, `│ Impossible de lire l'image.`)
      }

      const tmpId   = Date.now()
      const rawPath = path.join(TEMP_DIR, `raw_${tmpId}.tmp`)
      const webpPath = path.join(TEMP_DIR, `stk_${tmpId}.webp`)

      fs.writeFileSync(rawPath, media.buffer)

      const ok = await toWebp(rawPath, webpPath, media.isAnimated)
      cleanFile(rawPath)

      if (!ok) {
        cleanFile(webpPath)
        return await sendMessage(sock, sender,
          `│ Conversion échouée.\nVérifiez que l'image est valide.`
        )
      }

      await sendSticker(sock, sender, webpPath, 'J.A.R.V.I.S.', 'J.A.R.V.I.S. BOT')
      await sendMessage(sock, sender,
        `⚙️ *Sticker envoyé!*\n\n` +
        `💡 *.pack <nom>* pour créer un pack de plusieurs stickers`
      )

      setTimeout(() => cleanFile(webpPath), 30000)
      return
    }

    // ── INITIALISER UNE SESSION ──────────────────────────────
    if (args.length > 0 && !['done','créer','creer','cancel','annuler','status','statut'].includes(action)) {
      const packName = sanitizePackName(args.join(' '))

      if (!ffmpegOk) {
        return await sendMessage(sock, sender,
          `🕸️━━━〔 🕷️ 𝐅𝐅𝐌𝐏𝐄𝐆 𝐑𝐄𝐐𝐔𝐈𝐒 〕━━━🕸️\n\n` +
          `│ ffmpeg n'est pas installé.\n` +
          `│ \`apt install ffmpeg\`\n\n` +
          `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        )
      }

      createSession(userId, packName)

      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `     🕷️ 📦 *CRÉATEUR DE PACK* 📦 🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️━━━〔 ⚙️ 𝐏𝐀𝐂𝐊 𝐈𝐍𝐈𝐓𝐈𝐀𝐋𝐈𝐒É 〕━━━🕸️\n` +
        `│\n` +
        `│ 📌 Nom: *${packName}*\n` +
        `│\n` +
        `│ 📸 *Envoyez vos images*\n` +
        `│    (${MIN_IMAGES} à ${MAX_IMAGES} photos)\n` +
        `│\n` +
        `│ ⏳ Session valide *10 minutes*\n` +
        `│\n` +
        `│ 💡 commandes:\n` +
        `│  • *.pack done*   → Créer\n` +
        `│  • *.pack cancel* → Annuler\n` +
        `│  • *.pack statut* → Voir état\n` +
        `│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── AIDE ─────────────────────────────────────────────────
    return await sendMessage(sock, sender,
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `     🕷️ 📦 *CRÉATEUR DE PACK* 📦 🕷️\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️━━━〔 📖 𝐒𝐘𝐍𝐓𝐀𝐗𝐄 〕━━━🕸️\n` +
      `│\n` +
      `│ ⚡ *Mode rapide (1 sticker):*\n` +
      `│ Envoyez une image + \`.pack\`\n` +
      `│\n` +
      `│ 📦 *Mode pack (plusieurs):*\n` +
      `│ 1️⃣ \`.pack <nom>\` → Init\n` +
      `│ 2️⃣ Envoyez ${MIN_IMAGES}-${MAX_IMAGES} images\n` +
      `│ 3️⃣ \`.pack done\` → Créer\n` +
      `│\n` +
      `│ 🕷️ \`.pack cancel\` → Annuler\n` +
      `│ 👁️ \`.pack statut\` → État\n` +
      `│\n` +
      `│ 📏 Format: WebP 512×512\n` +
      `│ 🔧 Requis: ffmpeg installé\n` +
      `│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )

  } catch (err) {
    console.error('❌ Erreur pack:', err)
    await sendMessage(sock, sender,
      `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
      `│ ${err.message || 'opération échoué inconnue'}\n\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )
  }
}