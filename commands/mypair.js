// ╔════════════════════════════════════════════════════════╗
// ║   .mypair — Vérifier l'état de votre session          ║
// ╚════════════════════════════════════════════════════════╝

import { getBotInstance, sessionExists, getAllBots } from '../lib/sessionManager.js'
import { loadSessionMeta, listSessionSudos } from '../lib/sessionMetaManager.js'

export default async function mypair(sock, sender, args, msg, ctx) {
  const { senderJid } = ctx
  const senderNumber = senderJid.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '')

  const send = (text) => sock.sendMessage(sender, { text })

  const bot = getBotInstance(senderNumber)

  if (!bot) {
    if (sessionExists(senderNumber)) {
      return send(
        '🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n' +
        '     🕷️ 📱 SESSION SAUVEGARDÉE 🕷️\n' +
        '🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n' +
        `📞 Numéro: *+${senderNumber}*\n` +
        `⚠️  Statut: *Inactif (session sauvegardée)*\n\n` +
        `💡 Utilisez *.pairing +${senderNumber}* pour reconnecter.\n` +
        '🗑️  Utilisez *.stoppair* pour supprimer la session.'
      )
    }

    return send(
      '🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n' +
      '     🕷️ 🕷️ AUCUNE SESSION TROUVÉE 🕷️\n' +
      '🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n' +
      `📞 Numéro: *+${senderNumber}*\n` +
      '🕷️ Aucune session actif ou sauvegardée.\n\n' +
      `💡 Utilisez *.pairing +${senderNumber}* pour créer une session.`
    )
  }

  const statusEmoji = bot.status === 'connected' ? '⚙️' : bot.status === 'connecting' ? '🟡' : '🤖'
  const statusLabel = bot.status === 'connected' ? 'Connecté' : bot.status === 'connecting' ? 'Connexion...' : 'Déconnecté'
  const connectedSince = bot.connectedAt?.toLocaleString('fr-FR') || 'Inconnu'

  // Compter tous les bots actifs
  const allBots = getAllBots()
  const totalActive = Object.values(allBots).filter(b => b.status === 'connected').length

  // Charger la meta de la session
  const meta  = loadSessionMeta(bot.number)
  const sudos = listSessionSudos(bot.number)
  const lidLine = meta.owner.lids.length
    ? `🆔 LIDs détectés: ${meta.Propriétaire.lids.length} (${meta.Propriétaire.lids.map(l => l.slice(0,6)+'…').join(', ')})`
    : `🆔 LIDs détectés: en attente du 1er message en groupe`

  return send(
    '🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n' +
    '     🕷️ 📊 ÉTAT DE VOTRE SESSION 🕷️\n' +
    '🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n' +
    `📞 Numéro: *+${Système.number}*\n` +
    `${statusEmoji} Statut: *${statusLabel}*\n` +
    `🕐 Depuis: ${connectedSince}\n\n` +
    `👑 *Session Owner :* +${meta.Propriétaire.number || Système.number}\n` +
    `${lidLine}\n` +
    `⭐ Session Sudos: ${sudos.length}\n\n` +
    `🌐 Sessions actives sur le serveur: ${totalActive}\n\n` +
    '🔧 *.sessionsudo list* pour gérer les sudos\n' +
    '🗑️  *.stoppair* pour déconnecter'
  )
}
