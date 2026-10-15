// commands/kickall.js — 𝑴𝑼𝑹𝑨𝑺𝑨𝑲𝑰 𝐒𝐒𝐊 𓂀
// 🔧 FIX: ctx utilisé (senderJid, groupMeta cache, isOwner)
// 🔧 FIX: zéro appel groupMetadata direct
// 🔧 FIX: invalidateGroupCache après expulsion
// 🔧 FIX: filtrage bot du lot d'expulsion

import { sendMessage }                          from "../lib/sendMessage.js"
import { getSenderJid, isSuperAdmin, cleanNumber } from '../lib/ownerSystem.js'

export default async function kickall(sock, sender, args, msg, ctx = {}) {
  try {

    // ── GROUP ONLY ───────────────────────────────────────────
    if (!sender.endsWith('@g.us')) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 𝐈𝐌𝐏𝐎𝐒𝐒𝐈𝐁𝐋𝐄 〕━━━🕸️\n\n` +
        `│ Ce commande ne fonctionne que dans les *groupes* (groupes).\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── CTX ──────────────────────────────────────────────────
    const userId  = ctx.senderJid || getSenderJid(msg, sock)
    const isOwner = ctx.isOwner   || isSuperAdmin(userId)

    // ── PERMISSION : SuperAdmin uniquement ───────────────────
    if (!isOwner) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 ⛔ 𝐀𝐂𝐂È𝐒 𝐑𝐄𝐅𝐔𝐒É 〕━━━🕸️\n\n` +
        `│ Seuls les *Propriétaires Suprêmes*\n` +
        `│ peuvent déclencher ce châtiment.\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── BOT administrateur CHECK ──────────────────────────────────────
    if (!ctx.botAdmin) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 🕷️ 𝐒𝐘𝐒𝐓È𝐌𝐄 𝐍𝐎𝐍 𝐀𝐃𝐌𝐈𝐍𝐈𝐒𝐓𝐑𝐀𝐓𝐄𝐔𝐑 〕━━━🕸️\n\n` +
        `│ Je dois être *administrateur* (administrateur) pour\n` +
        `│ exiler les utilisateurs du groupe.\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── GROUP META ───────────────────────────────────────────
    // ✅ FIX : ctx.groupMeta (cache, zéro appel réseau)
    const groupMetadata = ctx.groupMeta
      || await sock.groupMetadata(sender)

    const participants = groupMetadata.participants
    const groupName    = groupMetadata.subject
    const botNum       = cleanNumber(sock.user?.id || "")

    // ── SÉPARER administrateurs ET MEMBRES ────────────────────────────
    const administrateurs  = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin')
    const members = participants.filter(p => {
      if (p.admin) return false
      // ✅ FIX : exclure le bot du lot d'expulsion
      if (cleanNumber(p.id) === botNum) return false
      return true
    })

    const adminIds  = admins.map(p => p.id)
    const memberIds = members.map(p => p.id)

    if (memberIds.length === 0) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 👁️ 𝐆𝐑𝐎𝐔𝐏𝐄 𝐕𝐈𝐃𝐄 〕━━━🕸️\n\n` +
        `│ Aucun utilisateur à exiler — seuls les administrateurs demeurent.\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── CONFIRMATION ─────────────────────────────────────────
    await sendMessage(sock, sender,
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `      🤖 *EXIL MASSIF* 🤖\n` +
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n\n` +
      `│ 📛 Groupe : *${groupName}*\n` +
      `│ 📡 Utilisateurs à exiler : *${memberIds.length}*\n` +
      `│ 🛡️ Administrateurs protégés : *${adminIds.length}*\n\n` +
      `│ ⏳ _Le châtiment commence..._`
    )

    console.log(`🚨 KICKALL démarré par +${cleanNumber(userId)} | ${memberIds.length} membres | Groupe: ${sender}`)

    // ── EXPULSION PAR LOTS ───────────────────────────────────
    const batchSize    = 5
    let   successCount = 0
    let   failCount    = 0

    for (let i = 0; i < memberIds.length; i += batchSize) {
      const batch = memberIds.slice(i, i + batchSize)

      try {
        await sock.groupParticipantsUpdate(sender, batch, "remove")
        successCount += batch.length
        console.log(`│ Lot exilé : ${batch.length} (${i + batch.length}/${memberIds.length})`)
      } catch (e) {
        console.error(`│ Erreur lot ${i}:`, e.message)
        failCount += batch.length
      }

      // Pause entre les lots pour éviter le rate-limit
      if (i + batchSize < memberIds.length) {
        await new Promise(r => setTimeout(r, 1500))
      }
    }

    // ✅ FIX : invalider le cache après les expulsions
    if (ctx.invalidateGroupCache) ctx.invalidateGroupCache(sender)

    // ── MESSAGE FINAL ────────────────────────────────────────
    await sendMessage(sock, sender,
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `    🕷️ *CHÂTIMENT ACCOMPLI* 🕷️\n` +
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n\n` +
      `🕸️━━━〔 ⚙️ 𝐁𝐈𝐋𝐀𝐍 𝐃𝐔 𝐌𝐀𝐒𝐒𝐀𝐂𝐑𝐄 〕━━━🕸️\n` +
      `│\n` +
      `│ ⚙️ Exilés : *${successCount}*\n` +
      `│ 🕷️ Échecs  : *${failCount}*\n` +
      `│ 🛡️ Administrateurs épargnés : *${adminIds.length}*\n` +
      `│\n` +
      `│ 👑 Ordonné par : @${cleanNumber(userId)}\n` +
      `│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`,
      { mentions: [userId] }
    )

    console.log(`│ KICKALL terminé | ⚙️ ${successCount} exilés | 🕷️ ${failCount} échecs`)

  } catch (e) {
    console.error("🕷️ Erreur kickall.js:", e)
    await sendMessage(sock, sender,
      `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
      `│ ${e.message || 'opération échoué inconnue'}\n\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )
  }
}
