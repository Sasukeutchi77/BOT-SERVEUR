// commands/fakereac.js — 𝑴𝑼𝑹𝑨𝑺𝑨𝑲𝑰 𝐒𝐒𝐊 𓂀
// 🎭 Envoie des réactions emoji aléatoires sur une publication de CHAÎNE WhatsApp
//
// USAGE :
//   1) Réponds (reply) à un message transféré depuis une chaîne
//   2) Tape : .fakereac 50   (ou un nombre entre 1 et 100)
//   → Le bot envoie N réactions emoji aléatoires sur la publication d'origine.

import { sendMessage } from '../lib/sendMessage.js'
import { getChannelInfoByMsgId } from '../lib/newsletterMessageCache.js'

// ════════════════════════════════════════════════════════════════
//  POOL D'EMOJIS POUR LES RÉACTIONS
// ════════════════════════════════════════════════════════════════

const EMOJI_POOL = [
  '❤️','🔥','😂','😍','🥰','😎','🤩','💯','✨','🎉',
  '👏','🙌','💪','👍','🤖','😱','🤯','🥵','🤤','🫶',
  '💖','💕','💞','💘','💝','🌹','🌟','⭐','⚡','🚀',
  '🏆','🎯','💎','👑','🦅','🐺','🦁','🐉','🦋','🌺',
  '🍑','🍒','🌈','☀️','🌙','💫','🎆','🎇','🪄','🔮'
]

const ALLOWED_LIMITS = [10, 20, 30, 50, 75, 100]
const MAX_REACTIONS  = 100
const MIN_REACTIONS  = 1
const DELAY_MS       = 120  // délai entre 2 réactions (anti-flood WhatsApp)

function randomEmoji() {
  return EMOJI_POOL[Math.floor(Math.random() * EMOJI_POOL.length)]
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// ════════════════════════════════════════════════════════════════
//  EXTRACTION : RETROUVER LA CHAÎNE D'ORIGINE
// ════════════════════════════════════════════════════════════════

/**
 * Trouve le contextInfo dans n'importe quel sous-type de message.
 */
function extractContextInfo(message) {
  if (!message) return null
  const types = [
    'extendedTextMessage','imageMessage','videoMessage','audioMessage',
    'documentMessage','stickerMessage','contactMessage','locationMessage',
    'productMessage','templateMessage','interactiveMessage','buttonsMessage',
    'listMessage'
  ]
  for (const t of types) {
    if (message[t]?.contextInfo) return message[t].contextInfo
  }
  return null
}

/**
 * Récupère les infos chaîne du message cité (reply).
 * @returns {{ newsletterJid: string, serverMessageId: number } | null}
 */
function findFwdRecursive(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 8) return null
  if (obj.forwardedNewsletterMessageInfo?.newsletterJid) {
    return obj.forwardedNewsletterMessageInfo
  }
  for (const k of Object.keys(obj)) {
    const v = obj[k]
    if (v && typeof v === 'object') {
      const f = findFwdRecursive(v, depth + 1)
      if (f) return f
    }
  }
  return null
}

function extractChannelInfoFromQuoted(msg) {
  // Scan complet du message + contextInfo + quotedMessage
  const fwd = findFwdRecursive(msg?.message)
  if (fwd?.newsletterJid && fwd?.serverMessageId && parseInt(fwd.serverMessageId,10) > 0) {
    return {
      newsletterJid  : fwd.newsletterJid,
      serverMessageId: parseInt(fwd.serverMessageId, 10)
    }
  }
  return null
}

/**
 * Récupère l'ID du message cité (stanzaId) depuis le contextInfo.
 */
function getQuotedStanzaId(msg) {
  const ctx = extractContextInfo(msg?.message)
  return ctx?.stanzaId || null
}

// ════════════════════════════════════════════════════════════════
//  ENVOI D'UNE RÉACTION SUR UN MESSAGE DE CHAÎNE
// ════════════════════════════════════════════════════════════════

async function reactToChannelMessage(sock, newsletterJid, serverMessageId, emoji) {
  // Méthode 1 : API native Baileys pour les newsletters (si dispo)
  if (typeof sock.newsletterReactMessage === 'function') {
    try {
      await sock.newsletterReactMessage(newsletterJid, String(serverMessageId), emoji)
      return true
    } catch {}
  }

  // Méthode 2 : sendMessage avec react + key newsletter (fallback)
  try {
    const key = {
      remoteJid      : newsletterJid,
      fromMe         : false,
      id             : String(serverMessageId),
      participant    : undefined,
      serverMessageId: serverMessageId
    }
    await sock.sendMessage(newsletterJid, { react: { text: emoji, key } })
    return true
  } catch {
    return false
  }
}

// ════════════════════════════════════════════════════════════════
//  COMMANDE
// ════════════════════════════════════════════════════════════════

export default async function fakereac(sock, sender, args, msg, ctx = {}) {
  try {
    // ── 1) Vérifier que la commande répond à un message ────────
    //   a) Tentative directe depuis le quotedMessage
    let channelInfo = extractChannelInfoFromQuoted(msg)

    //   b) Fallback : retrouver via le cache à partir du stanzaId
    if (!channelInfo) {
      const stanzaId = getQuotedStanzaId(msg)
      if (stanzaId) {
        const cached = getChannelInfoByMsgId(stanzaId)
        if (cached) channelInfo = cached
      }
    }

    if (!channelInfo) {
      // Debug : on log la structure pour diagnostic
      try {
        const stanzaId = getQuotedStanzaId(msg)
        const ctx = msg?.message?.extendedTextMessage?.contextInfo
        console.log('🔍 [FAKEREAC DEBUG] Aucune info chaîne détectée.')
        console.log('   - stanzaId:', stanzaId)
        console.log('   - quotedMessage keys:', ctx?.quotedMessage ? Object.keys(ctx.quotedMessage) : 'aucun')
        console.log('   - msg.message keys:', Object.keys(msg?.message || {}))
        console.log('   - dump:', JSON.stringify(msg?.message, null, 2).slice(0, 1500))
      } catch {}
      return await sendMessage(sock, sender,
        `🕸️━━━〔 🕷️ 𝐒𝐘𝐍𝐓𝐀𝐗𝐄 𝐈𝐍𝐂𝐎𝐑𝐑𝐄𝐂𝐓 〕━━━🕸️\n` +
        `│\n` +
        `│ 📌 *Réponds à un message*\n` +
        `│ *transféré depuis une chaîne*\n` +
        `│ puis tape :\n` +
        `│\n` +
        `│ • *.fakereac 10*\n` +
        `│ • *.fakereac 50*\n` +
        `│ • *.fakereac 100*\n` +
        `│\n` +
        `│ ⚠️ Le message doit contenir\n` +
        `│ le bouton _"Voir la chaîne"_.\n` +
        `│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── 2) Lire le nombre demandé ──────────────────────────────
    let count = parseInt(args[0], 10)
    if (!count || isNaN(count)) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 ❓ 𝐍𝐎𝐌𝐁𝐑𝐄 𝐌𝐀𝐍𝐐𝐔𝐀𝐍𝐓 〕━━━🕸️\n` +
        `│\n` +
        `│ Indique combien de réactions :\n` +
        `│\n` +
        `│ • *.fakereac 10*\n` +
        `│ • *.fakereac 50*\n` +
        `│ • *.fakereac 100*\n` +
        `│\n` +
        `│ 📊 Max: *${MAX_REACTIONS}*\n` +
        `│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    if (count < MIN_REACTIONS) count = MIN_REACTIONS
    if (count > MAX_REACTIONS) count = MAX_REACTIONS

    // ── 3) Message d'attente ───────────────────────────────────
    await sendMessage(sock, sender,
      `🕸️━━━〔 🎭 𝐅𝐀𝐊𝐄 𝐑𝐄𝐀𝐂 〕━━━🕸️\n` +
      `│\n` +
      `│ 🚀 Envoi de *${count}* réactions\n` +
      `│ 📡 Cible: chaîne WhatsApp\n` +
      `│ ⏳ Patiente quelques secondes...\n` +
      `│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )

    // ── 4) Envoi en boucle ─────────────────────────────────────
    let success = 0
    let failed  = 0

    for (let i = 0; i < count; i++) {
      const emoji = randomEmoji()
      const ok = await reactToChannelMessage(
        sock,
        channelInfo.newsletterJid,
        channelInfo.serverMessageId,
        emoji
      )
      if (ok) success++
      else    failed++

      // Petit délai pour éviter le throttling
      if (i < count - 1) await delay(DELAY_MS)
    }

    // ── 5) Rapport ─────────────────────────────────────────────
    return await sendMessage(sock, sender,
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `     🕷️ 🎭 *FAKE REAC* 🎭 🕷️\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️━━━〔 ⚙️ 𝐓𝐄𝐑𝐌𝐈𝐍É 〕━━━🕸️\n` +
      `│\n` +
      `│ ⚙️ Réussies: *${success}*\n` +
      `│ 🕷️ Échouées: *${failed}*\n` +
      `│ 📊 Total demandé: *${count}*\n` +
      `│\n` +
      `│ 📡 Chaîne ciblée\n` +
      `│ 🆔 Msg: \`${channelInfo.serverMessageId}\`\n` +
      `│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )

  } catch (err) {
    console.error('❌ Erreur fakereac:', err)
    await sendMessage(sock, sender,
      `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
      `│ ${err.message || 'opération échoué inconnue'}\n\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )
  }
}
