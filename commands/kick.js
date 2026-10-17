// commands/kick.js — 𝑴𝑼𝑹𝑨𝑺𝑨𝑲𝑰 𝐒𝐒𝐊 𓂀
// 🔧 FIX: utilise ctx.groupMeta (cache, zéro appel réseau)
// 🔧 FIX: suppression checkBotAdmin() redondant
// 🔧 FIX: console.log déplacé avant le return
// 🔧 FIX: invalidateGroupCache après kick

import { sendMessage }                                from '../lib/sendMessage.js'
import { showActionLoader, deleteLoader, formatTime } from '../lib/animLoader.js'
import { cleanNumber, matchJid }                      from '../lib/ownerSystem.js'

function isAdminFlag(a) {
  return a === 'admin' || a === 'superadmin'
}

export default async function kick(sock, sender, args, msg, ctx = {}) {
  let loaderKey = null

  try {

    // ────────── GROUP ONLY ──────────────────────────────────
    if (!sender.endsWith('@g.us')) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
        `│ commande *groupe* uniquement.\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ────────── CTX ─────────────────────────────────────────
    const {
      isOwner,
      isAdmin,
      botAdmin,
      senderJid,
      groupMeta,           // ✅ FIX : cache groupMeta depuis index.js v2
      invalidateGroupCache // ✅ FIX v : pour invalider après kick
    } = ctx

    const userId = senderJid

    // ────────── USER PERMISSION ─────────────────────────────
    if (!isOwner && !isAdmin) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 ⛔ 𝐀𝐂𝐂È𝐒 𝐑𝐄𝐅𝐔𝐒É 〕━━━🕸️\n\n` +
        `│ 🔒 Requis: *administrateur* du groupe\n` +
        `│    ou *Owner/Sudo* du Système\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ────────── BOT ADMIN CHECK ─────────────────────────────
    // ✅ FIX : utilise ctx.botAdmin (déjà calculé dans index.js)
    // Zéro appel réseau supplémentaire
    if (!botAdmin) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 🕷️ 𝐒𝐘𝐒𝐓È𝐌𝐄 𝐍𝐎𝐍 𝐀𝐃𝐌𝐈𝐍𝐈𝐒𝐓𝐑𝐀𝐓𝐄𝐔𝐑 〕━━━🕸️\n\n` +
        `│ Je dois être *administrateur* pour\n` +
        `│ exiler des utilisateurs.\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ────────── TARGET ───────────────────────────────────────
    let targetId = null

    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    if (mentions?.length > 0) {
      targetId = mentions[0]
    } else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
      targetId = msg.message.extendedTextMessage.contextInfo.participant
    } else if (args.length > 0) {
      const num = args[0].replace(/[^0-9]/g, '')
      if (num.length >= 8) targetId = num + '@s.whatsapp.net'
    }

    if (!targetId) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 🕷️ 𝐒𝐘𝐍𝐓𝐀𝐗𝐄 〕━━━🕸️\n\n` +
        `│ • *.kick @utilisateur*\n` +
        `│ • Répondre + *.kick*\n` +
        `│ • *.kick 22601234567*\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ────────── EMPÊCHER DE SE KICKER SOI-MÊME ──────────────
    if (matchJid(targetId, userId)) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 ⚠️ 𝐈𝐌𝐏𝐎𝐒𝐒𝐈𝐁𝐋𝐄 〕━━━🕸️\n\n` +
        `│ Vous ne pouvez pas vous\n` +
        `│ exiler vous-même.\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ────────── EMPÊCHER DE KICKER LE BOT ───────────────────
    const botId = sock.user?.id || ""
    if (matchJid(targetId, botId)) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 ⚠️ 𝐈𝐌𝐏𝐎𝐒𝐒𝐈𝐁𝐋𝐄 〕━━━🕸️\n\n` +
        `│ Je ne peux pas m'exiler\n` +
        `│ moi-même.\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ────────── GROUP DATA ───────────────────────────────────
    // ✅ FIX : utilise ctx.groupMeta (cache, zéro appel réseau)
    // Fallback sur sock.groupMetadata si cache absent
    const meta         = groupMeta || await sock.groupMetadata(sender)
    const participants = meta?.participants || []

    const targetMember = participants.find(p => matchJid(p.id, targetId))

    if (!targetMember) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 🕷️ 𝐀𝐁𝐒𝐄𝐍𝐓 〕━━━🕸️\n\n` +
        `│ Ce utilisateur n'est pas dans\n` +
        `│ le groupe.\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ────────── PROTECTION ADMIN ────────────────────────────
    if (isAdminFlag(targetMember.admin) && !isOwner) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 ⛔ 𝐈𝐍𝐓𝐄𝐑𝐃𝐈𝐓 〕━━━🕸️\n\n` +
        `│ Vous ne pouvez pas exiler\n` +
        `│ un *administrateur* du groupe.\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ────────── KICK ────────────────────────────────────────
    loaderKey = await showActionLoader(sock, sender, 'EXPULSION EN COURS', '👢')

    await sock.groupParticipantsUpdate(sender, [targetMember.id], 'remove')

    await deleteLoader(sock, sender, loaderKey)
    loaderKey = null

    // ✅ FIX : invalider le cache après kick
    if (invalidateGroupCache) invalidateGroupCache(sender)

    const targetNum = targetMember.id.split('@')[0]
    const reason    = args.slice(1).join(' ') || 'Non spécifiée'

    // ✅ FIX : console.log AVANT le return (était après = code mort)
    console.log(`👢 kick | ${targetNum} | par: ${userId?.split('@')[0]}`)

    return await sendMessage(sock, sender,
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `     🕷️ 👢 *EXIL* 👢 🕷️\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️━━━〔 ⚙️ 𝐔𝐓𝐈𝐋𝐈𝐒𝐀𝐓𝐄𝐔𝐑 𝐄𝐗𝐏𝐔𝐋𝐒É 〕━━━🕸️\n` +
      `│\n` +
      `│ 👤 Cible: @${targetNum}\n` +
      `│ 📋 Raison: ${reason}\n` +
      `│ 🕐 Heure: ${formatTime()}\n` +
      `│ 👮 Par: @${userId?.split('@')[0]}\n` +
      `│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`,
      { mentions: [targetMember.id, userId] }
    )

  } catch (err) {
    if (loaderKey) await deleteLoader(sock, sender, loaderKey)
    console.error('❌ Erreur kick:', err)

    return await sendMessage(sock, sender,
      `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
      `│ • Suis-je *administrateur* du groupe ?\n` +
      `│ • Le utilisateur est-il présent ?\n` +
      `│ • Est-il administrateur ?\n\n` +
      `│ 📝 _${err.message || 'opération échoué inconnue'}_\n\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )
  }
}