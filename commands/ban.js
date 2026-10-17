// commands/ban.js — 𝑴𝑼𝑹𝑨𝑺𝑨𝑲𝑰 𝐒𝐒𝐊 𓂀
// 🔧 FIX: ctx utilisé (senderJid, isOwner, isAdmin, botAdmin)
// 🔧 FIX: matchJid pour comparaison soi-même
// 🔧 FIX: cleanNumber pour affichage propre
// 🔧 FIX: botAdmin vérifié avant expulsion
// 🔧 FIX: invalidateGroupCache après ban
// 🔧 FIX: ctx = {} ajouté

import { sendMessage }                                from '../lib/sendMessage.js'
import { showActionLoader, deleteLoader, formatTime } from '../lib/animLoader.js'
import {
  getSenderJid,
  isSuperAdmin,
  matchJid,
  cleanNumber
} from '../lib/ownerSystem.js'
import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const BAN_FILE = path.join(process.cwd(), 'data', 'banned.json')

//══════════════════════════════════════
// GESTION PERSISTANTE DES BANS
//══════════════════════════════════════

function ensureDataDir() {
  const dir = path.dirname(BAN_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function loadBans() {
  ensureDataDir()
  try {
    if (fs.existsSync(BAN_FILE)) return JSON.parse(fs.readFileSync(BAN_FILE, 'utf8'))
  } catch (e) { console.error('❌ Erreur lecture bans:', e.message) }
  return {}
}

function saveBans(data) {
  ensureDataDir()
  try {
    fs.writeFileSync(BAN_FILE, JSON.stringify(data, null, 2))
    return true
  } catch (e) {
    console.error('❌ Erreur sauvegarde bans:', e.message)
    return false
  }
}

export function isBanned(groupId, userId) {
  const bans = loadBans()
  return !!(bans[groupId]?.includes(userId))
}

export function addBan(groupId, userId) {
  const bans = loadBans()
  if (!bans[groupId]) bans[groupId] = []
  if (!bans[groupId].includes(userId)) {
    bans[groupId].push(userId)
    saveBans(bans)
    return true
  }
  return false
}

export function removeBan(groupId, userId) {
  const bans = loadBans()
  if (!bans[groupId]) return false
  const idx = bans[groupId].indexOf(userId)
  if (idx !== -1) {
    bans[groupId].splice(idx, 1)
    saveBans(bans)
    return true
  }
  return false
}

export function getBanList(groupId) {
  const bans = loadBans()
  return bans[groupId] || []
}

//══════════════════════════════════════
// COMMANDE PRINCIPALE
//══════════════════════════════════════

export default async function ban(sock, sender, args, msg, ctx = {}) {
  let loaderKey = null

  try {

    // ── GROUP ONLY ───────────────────────────────────────────
    if (!sender.endsWith('@g.us')) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
        `│ commande *groupe* uniquement.\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── CTX ──────────────────────────────────────────────────
    const userId  = ctx.senderJid || getSenderJid(msg, sock)
    const isOwner = ctx.isOwner   || isSuperAdmin(userId)
    const isAdmin = ctx.isAdmin   || false

    // ── PERMISSION : Owner ou Admin groupe ───────────────────
    if (!isOwner && !isAdmin) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 ⛔ 𝐀𝐂𝐂È𝐒 𝐑𝐄𝐅𝐔𝐒É 〕━━━🕸️\n\n` +
        `│ 🔒 Requis: *administrateur* du groupe\n` +
        `│    ou *Owner/Sudo* du Système\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── BOT ADMIN CHECK ──────────────────────────────────────
    if (!ctx.botAdmin) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 🕷️ 𝐒𝐘𝐒𝐓È𝐌𝐄 𝐍𝐎𝐍 𝐀𝐃𝐌𝐈𝐍𝐈𝐒𝐓𝐑𝐀𝐓𝐄𝐔𝐑 〕━━━🕸️\n\n` +
        `│ Je dois être *administrateur* pour\n` +
        `│ bannir des utilisateurs.\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── TARGET ───────────────────────────────────────────────
    let targetId = null

    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    if (mentions?.length > 0) {
      targetId = mentions[0]
    } else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
      targetId = msg.message.extendedTextMessage.contextInfo.participant
    } else if (args[0]) {
      const num = args[0].replace(/[^0-9]/g, '')
      if (num.length >= 8) targetId = num + '@s.whatsapp.net'
    }

    if (!targetId) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 🕷️ 𝐒𝐘𝐍𝐓𝐀𝐗𝐄 〕━━━🕸️\n\n` +
        `│ • *.ban @utilisateur*\n` +
        `│ • Répondre + *.ban*\n` +
        `│ • *.ban 22601234567*\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ✅ FIX v2 : matchJid au lieu de === (gère LID)
    if (matchJid(targetId, userId)) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 ⚠️ 𝐈𝐌𝐏𝐎𝐒𝐒𝐈𝐁𝐋𝐄 〕━━━🕸️\n\n` +
        `│ Vous ne pouvez pas vous\n` +
        `│ bannir vous-même.\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    if (isBanned(sender, targetId)) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 👁️ 𝐃É𝐉À 𝐁𝐀𝐍𝐍𝐈 〕━━━🕸️\n\n` +
        `│ @${cleanNumber(targetId)} est déjà\n` +
        `│ dans la liste des bannis.\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`,
        { mentions: [targetId] }
      )
    }

    const reason    = args.slice(1).join(' ') || 'Non spécifiée'
    const targetNum = cleanNumber(targetId)
    const userNum   = cleanNumber(userId)

    loaderKey = await showActionLoader(sock, sender, 'BANNISSEMENT EN COURS', '🚫')

    // ── BAN + EXPULSION ──────────────────────────────────────
    addBan(sender, targetId)

    try {
      await sock.groupParticipantsUpdate(sender, [targetId], 'remove')
    } catch (e) {
      console.error('⚠️ Expulsion échouée (ban enregistré quand même):', e.message)
    }

    await deleteLoader(sock, sender, loaderKey)
    loaderKey = null

    // ✅ FIX v2 : invalider le cache après ban
    if (ctx.invalidateGroupCache) ctx.invalidateGroupCache(sender)

    console.log(`🚫 ban | +${targetNum} | par: +${userNum}`)

    return await sendMessage(sock, sender,
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `     🕷️ 🚫 *BANNISSEMENT* 🚫 🕷️\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️━━━〔 ⚙️ 𝐔𝐓𝐈𝐋𝐈𝐒𝐀𝐓𝐄𝐔𝐑 𝐁𝐀𝐍𝐍𝐈 〕━━━🕸️\n` +
      `│\n` +
      `│ 👤 Cible: @${targetNum}\n` +
      `│ 📋 Raison: ${reason}\n` +
      `│ 🕐 Heure: ${formatTime()}\n` +
      `│ 👮 Par: @${userNum}\n` +
      `│ 💾 Banni en: *Mémoire + Fichier*\n` +
      `│\n` +
      `│ 💡 Pour débannir: *.unban @user*\n` +
      `│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`,
      { mentions: [targetId, userId] }
    )

  } catch (err) {
    if (loaderKey) await deleteLoader(sock, sender, loaderKey)
    console.error('❌ Erreur ban:', err)
    await sendMessage(sock, sender,
      `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
      `│ 📝 _${err.message || 'opération échoué inconnue'}_\n\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )
  }
}