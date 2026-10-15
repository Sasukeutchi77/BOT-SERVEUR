// commands/partager.js — 𝑴𝑼𝑹𝑨𝑺𝑨𝑲𝑰 𝐒𝐒𝐊 𓂀
// 📤 Partage les liens dans tous les groupes où l'utilisateur est présent
// 🎁 Octroie 10 utilisations des commandes jarvis/pairing après partage
// Usage : .partager

import { sendMessage } from '../lib/sendMessage.js'
import { getSenderJid, matchJid } from '../lib/ownerSystem.js'
import { grantUsage, getRemainingUses, MAX_USES } from '../lib/usageSystem.js'

//══════════════════════════════════════
// LIENS À PARTAGER
//══════════════════════════════════════

const GROUPE_LINK = 'https://chat.whatsapp.com/Ht7SCfsPIY51cAq4t8Pvty?mode=gi_t'
const CANAL_LINK  = 'https://whatsapp.com/channel/0029VbCRcEJLdQeYxw5g3m2o'

//══════════════════════════════════════
// MESSAGE DE PARTAGE
//══════════════════════════════════════

const SHARE_MESSAGE =
  `*DARK PROJET GROUPE*\n` +
  `${GROUPE_LINK}\n\n` +
  `*DARK PROJET CHAÎNE*\n` +
  `${CANAL_LINK}`

//══════════════════════════════════════
// UTILITAIRES
//══════════════════════════════════════

function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}

//══════════════════════════════════════
// COMMANDE PRINCIPALE
//══════════════════════════════════════

export default async function partager(sock, sender, args, msg, ctx = {}) {
  try {
    const userId = ctx.senderJid || getSenderJid(msg, sock)

    // ── Récupérer tous les groupes du bot ─────────────────
    const chats  = await sock.groupFetchAllParticipating()
    const groups = Object.keys(chats)

    // ── Filtrer : groupes où l'utilisateur est présent ────
    const userGroups = []
    for (const groupId of groups) {
      try {
        const participants = chats[groupId]?.participants || []
        if (participants.some(p => matchJid(p.id, userId))) {
          userGroups.push(groupId)
        }
      } catch {}
    }

    if (userGroups.length === 0) {
      return await sendMessage(sock, sender,
        `│ Aucun groupe commun entre toi et le Système n'a été trouvé.`
      )
    }

    // ── Notification de début ─────────────────────────────
    await sendMessage(sock, sender,
      `⏳ Partage en cours dans *${userGroups.length}* groupe(s)...`
    )

    // ── Envoi dans chaque groupe ──────────────────────────
    let sent   = 0
    let failed = 0

    for (const groupId of userGroups) {
      try {
        await sock.sendMessage(groupId, { text: SHARE_MESSAGE })
        sent++
        await delay(1500)
      } catch (e) {
        console.error(`[partager] Échec ${groupId}:`, e.message)
        failed++
      }
    }

    // ── Octroyer les utilisations si au moins 1 groupe ────
    let usageGrantText = ''
    if (sent > 0) {
      const { uses } = grantUsage(userId)
      usageGrantText =
        `\n\n🎁 *Récompense débloquée !*\n` +
        `Tu as maintenant *${uses} utilisations* disponibles pour les commandes :\n` +
        `   • ${process.env.PREFIX || '.'}jarvis\n` +
        `   • ${process.env.PREFIX || '.'}pairing\n\n` +
        `♻️ Quand tu n'as plus d'utilisations, retape *${process.env.PREFIX || '.'}partager* pour en avoir à nouveau.`
    }

    // ── Rapport final ─────────────────────────────────────
    await sendMessage(sock, sender,
      `⚙️ *Partage terminé!*\n\n` +
      `📤 Envoyé: *${sent}* groupe(s)\n` +
      `│ Échoué: *${failed}* groupe(s)` +
      usageGrantText
    )

    console.log(`✅ [PARTAGER] ${sent}/${userGroups.length} groupes | par ${userId}`)

  } catch (e) {
    console.error('❌ partager error:', e)
    await sendMessage(sock, sender, `│ opération échoué: ${e.message || 'opération échoué inconnue'}`)
  }
}
