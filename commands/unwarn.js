// commands/unwarn.js — 𝑴𝑼𝑹𝑨𝑺𝑨𝑲𝑰 𝐒𝐒𝐊 𓂀
// 🔧 FIX: ctx utilisé (senderJid, isOwner, isAdmin)
// 🔧 FIX: cleanNumber pour affichage propre
// 🔧 FIX: ctx = {} ajouté

import { sendMessage }                from '../lib/sendMessage.js'
import { getWarnings, clearWarnings } from './warn.js'
import { formatTime }                 from '../lib/animLoader.js'
import {
  getSenderJid,
  isSuperAdmin,
  cleanNumber,
  matchJid
} from '../lib/ownerSystem.js'

export default async function unwarn(sock, sender, args, msg, ctx = {}) {
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
        `│ • *.unwarn @utilisateur*\n` +
        `│ • Répondre + *.unwarn*\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── VÉRIFIER LES AVERTISSEMENTS ──────────────────────────
    const currentWarns = getWarnings(sender, targetId)
    const targetNum    = cleanNumber(targetId)
    const userNum      = cleanNumber(userId)

    if (currentWarns === 0) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 👁️ 𝐀𝐔𝐂𝐔𝐍 𝐀𝐕𝐄𝐑𝐓. 〕━━━🕸️\n\n` +
        `│ @${targetNum} n'a aucun\n` +
        `│ avertissement actif.\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`,
        { mentions: [targetId] }
      )
    }

    // ── EFFACER LES AVERTISSEMENTS ───────────────────────────
    clearWarnings(sender, targetId)

    return await sendMessage(sock, sender,
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `     🕷️ ⚙️ *AVERTISS. RETIRÉS* ⚙️ 🕷️\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️━━━〔 🧹 𝐍𝐄𝐓𝐓𝐎𝐘𝐀𝐆𝐄 〕━━━🕸️\n` +
      `│\n` +
      `│ 👤 Utilisateur: @${targetNum}\n` +
      `│ 🗑️ Avert. retirés: *${currentWarns}*\n` +
      `│ 🕐 Heure: ${formatTime()}\n` +
      `│ 👮 Par: @${userNum}\n` +
      `│\n` +
      `│ ⚙️ Ardoise *effacée* avec succès.\n` +
      `│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`,
      { mentions: [targetId, userId] }
    )

  } catch (err) {
    console.error('❌ Erreur unwarn:', err)
    await sendMessage(sock, sender,
      `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
      `│ 📝 _${err.message || 'opération échoué inconnue'}_\n\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )
  }
}