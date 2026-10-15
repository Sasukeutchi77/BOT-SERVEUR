// ╔════════════════════════════════════════════════════════╗
// ║   .stoppair — Déconnecter et supprimer votre session  ║
// ╚════════════════════════════════════════════════════════╝

import { getBotInstance, sessionExists, removeSession } from '../lib/sessionManager.js'

export default async function stoppair(sock, sender, args, msg, ctx) {
  const { senderJid } = ctx
  const senderNumber = senderJid.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '')

  const send = (text) => sock.sendMessage(sender, { text })

  const bot = getBotInstance(senderNumber)
  const hasSession = sessionExists(senderNumber)

  if (!bot && !hasSession) {
    return send(
      '🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n' +
      '     🕷️ 🕷️ AUCUNE SESSION TROUVÉE 🕷️\n' +
      '🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n' +
      `📞 Numéro: *+${senderNumber}*\n` +
      '🕷️ Aucune session à supprimer.\n\n' +
      `💡 Utilisez *.pairing +${senderNumber}* pour créer une session.`
    )
  }

  await send(
    '🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n' +
    '     🕷️ 🔄 DÉCONNEXION EN COURS 🕷️\n' +
    '🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n' +
    `📞 Numéro: *+${senderNumber}*\n` +
    '⏳ Suppression de votre session...'
  )

  try {
    await removeSession(senderNumber)
    return send(
      '🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n' +
      '     🕷️ ⚙️ SESSION SUPPRIMÉE 🕷️\n' +
      '🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n' +
      `📞 Numéro: *+${senderNumber}*\n` +
      '⚙️ Votre session a été déliée et supprimée.\n\n' +
      `💡 Pour vous reconnecter: *.pairing +${senderNumber}*`
    )
  } catch (err) {
    return send(`│ opération échoué lors de la suppression: ${err.message}`)
  }
}
