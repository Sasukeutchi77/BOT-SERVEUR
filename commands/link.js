// commands/link.js — 𝑴𝑼𝑹𝑨𝑺𝑨𝑲𝑰 𝐒𝐒𝐊 𓂀
// 🔧 FIX: ctx utilisé (senderJid, groupMeta cache, isAdmin, botAdmin)
// 🔧 FIX: matchJid au lieu de normalizeJid maison
// 🔧 FIX: zéro appel groupMetadata direct

import { sendMessage }                    from '../lib/sendMessage.js'
import { getSenderJid, isDeployer, isSudo, matchJid, cleanNumber } from '../lib/ownerSystem.js'

export default async function link(sock, sender, args, msg, ctx = {}) {
  try {

    // ── GROUP ONLY ───────────────────────────────────────────
    if (!sender.endsWith('@g.us')) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
        `│ Cette commande ne fonctionne\n` +
        `│ que dans les *groupes*.\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── CTX ──────────────────────────────────────────────────
    const userId   = ctx.senderJid  || getSenderJid(msg, sock)
    const isAdmin  = ctx.isAdmin    || false
    const isOwner  = ctx.isOwner    || isDeployer(userId) || isSudo(userId)
    const botAdmin = ctx.botAdmin   || false

    // ── USER PERMISSION ──────────────────────────────────────
    if (!isOwner && !isAdmin) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 ⛔ 𝐀𝐂𝐂È𝐒 𝐑𝐄𝐅𝐔𝐒É 〕━━━🕸️\n\n` +
        `│ 🔒 Seuls les *administrateurs* du\n` +
        `│    groupe peuvent obtenir\n` +
        `│    le lien d'invitation.\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── BOT ADMIN CHECK ──────────────────────────────────────
    // ✅ FIX : utilise ctx.botAdmin (cache index.js)
    if (!botAdmin) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 🕷️ 𝐒𝐘𝐒𝐓È𝐌𝐄 𝐍𝐎𝐍 𝐀𝐃𝐌𝐈𝐍𝐈𝐒𝐓𝐑𝐀𝐓𝐄𝐔𝐑 〕━━━🕸️\n\n` +
        `│ Je dois être *administrateur*\n` +
        `│ du groupe pour obtenir\n` +
        `│ le lien d'invitation.\n\n` +
        `│ 📌 Ajoutez le Système comme\n` +
        `│    administrateur du groupe.\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── GROUP META ───────────────────────────────────────────
    // ✅ FIX : utilise ctx.groupMeta (cache, zéro appel réseau)
    const groupMeta = ctx.groupMeta
      || await sock.groupMetadata(sender)

    const action = args[0]?.toLowerCase()

    // ── RESET / RÉVOQUER ─────────────────────────────────────
    if (action === 'reset' || action === 'regen' || action === 'nouveau') {
      try {
        await sock.groupRevokeInvite(sender)
        await new Promise(r => setTimeout(r, 500))
      } catch (e) {
        return await sendMessage(sock, sender,
          `│ Impossible de révoquer l'ancien lien: ${e.message}`
        )
      }
    }

    // ── OBTENIR LE LIEN ──────────────────────────────────────
    let inviteCode
    try {
      inviteCode = await sock.groupInviteCode(sender)
    } catch (err) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
        `│ Impossible de récupérer\n` +
        `│ le lien d'invitation.\n` +
        `│\n` +
        `│ 📝 _${err.message}_\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    const inviteLink = `https://chat.whatsapp.com/${inviteCode}`
    const resetNote  = ['reset', 'regen', 'nouveau'].includes(action)
      ? '\n│ ♻️ _Lien régénéré_' : ''

    await sendMessage(sock, sender,
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `     🕷️ 🔗 *LIEN D'INVITATION* 🕷️\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️━━━〔 📋 𝐆𝐑𝐎𝐔𝐏𝐄 〕━━━🕸️\n` +
      `│\n` +
      `│ 📛 Nom: *${groupMeta.subject}*\n` +
      `│ 📡 utilisateurs: *${groupMeta.participants.length}*\n` +
      `│ 🔒 Type: *${groupMeta.announce ? 'Fermé' : 'Ouvert'}*\n` +
      `🕷️${resetNote}\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🔗 *Lien:*\n${inviteLink}\n\n` +
      `💡 *.link reset* pour révoquer et générer un nouveau lien\n` +
      `_⚠️ Ne partagez ce lien qu'avec des personnes de confiance_`
    )

    console.log(`🔗 link [${action || 'get'}] | Groupe: ${groupMeta.subject}`)

  } catch (err) {
    console.error('❌ Erreur link:', err)
    await sendMessage(sock, sender,
      `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
      `│ 📝 _${err.message || 'opération échoué inconnue'}_\n\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )
  }
}