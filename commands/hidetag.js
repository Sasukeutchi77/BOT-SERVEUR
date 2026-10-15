import { sendMessage } from "../lib/sendMessage.js"
import { getSenderJid, isDeployer, isSudo, matchJid } from "../lib/ownerSystem.js"

export default async function hidetag(sock, sender, args, msg, ctx = {}) {
  try {
    // ── VÉRIFICATION GROUPE ──────────────────────────────────
    if (!sender.endsWith('@g.us')) {
      await sendMessage(sock, sender,
        `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 𝐈𝐌𝐏𝐎𝐒𝐒𝐈𝐁𝐋𝐄 〕━━━🕸️\n\n` +
        `│ Ce commande ne fonctionne que dans les *groupes* (groupes).\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
      return
    }

    // ── VÉRIFICATION ADMIN ───────────────────────────────────
    const userId  = ctx.senderJid || getSenderJid(msg, sock)
    const isOwner = ctx.isOwner   || isDeployer(userId) || isSudo(userId)
    const isAdmin = ctx.isAdmin   || await checkIsGroupAdmin(sock, sender, userId)

    if (!isOwner && !isAdmin) {
      await sendMessage(sock, sender,
        `🕸️━━━〔 ⛔ 𝐀𝐂𝐂È𝐒 𝐑𝐄𝐅𝐔𝐒É 〕━━━🕸️\n\n` +
        `│ 🔒 Seuls les *administrateurs* (administrateurs)\n` +
        `│    du groupe peuvent utiliser ce commande.\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
      return
    }

    // ── RÉCUPÉRATION DES MEMBRES ─────────────────────────────
    const groupMetadata = await sock.groupMetadata(sender)
    const participants  = groupMetadata.participants
    const mentions      = participants.map(p => p.id)

    // ── MESSAGE PERSONNALISÉ ─────────────────────────────────
    const customMessage = args.join(' ') || "🕷️ *Message du Système* 🕷️"

    // ── ENVOI AVEC MENTIONS CACHÉES ──────────────────────────
    await sock.sendMessage(sender, {
      text: customMessage,
      mentions: mentions
    })

    // ── CONFIRMATION PRIVÉE ──────────────────────────────────
    await sendMessage(sock, sender,
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `     📡 *HIDETAG UTILISÉ* 📡\n` +
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n\n` +
      `🕸️━━━〔 ⚙️ 𝐔𝐓𝐈𝐋𝐈𝐒𝐀𝐓𝐄𝐔𝐑𝐒 𝐌𝐀𝐑𝐐𝐔É𝐄𝐒 〕━━━🕸️\n` +
      `│\n` +
      `│ 📡 Utilisateurs convoquées : *${participants.length}*\n` +
      `│ 📡 Mentions : *cachées*\n` +
      `│ 📜 Message : _${customMessage}_\n` +
      `│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )

    console.log(`│ hidetag | ${participants.length} utilisateurs convoquées`)

  } catch (e) {
    console.error("🕷️ Erreur hidetag:", e)
    await sendMessage(sock, sender,
      `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
      `│ ${e.message || 'opération échoué inconnue'}\n` +
      `│ Vérifiez que le *Système* est administrateur du groupe.\n\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )
  }
}

// ── UTILITAIRE ADMIN ─────────────────────────────────────────
async function checkIsGroupAdmin(sock, groupId, userId) {
  try {
    const meta   = await sock.groupMetadata(groupId)
    const admins = meta.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin')
    return admins.some(p => matchJid(p.id, userId))
  } catch { return false }
}
