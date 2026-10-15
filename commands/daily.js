// commands/daily.js — J.A.R.V.I.S.
// ✅ Récompense quotidienne avec design amélioré

import { sendMessage } from '../lib/sendMessage.js'
import { getSenderJid, cleanNumber } from '../lib/ownerSystem.js'
import { updateUserProfile } from '../lib/groupConfig.js'

function getLevel(xp) { return Math.floor(Math.sqrt((xp || 0) / 10)) + 1 }

function getStreakBonus(streak) {
  if (streak >= 30) return { bonus: 200, label: '🔥🔥🔥 Série légendaire (30j+)' }
  if (streak >= 14) return { bonus: 100, label: '🔥🔥 Série de feu (14j+)' }
  if (streak >= 7)  return { bonus: 50,  label: '🔥 Série enflammée (7j+)' }
  if (streak >= 3)  return { bonus: 20,  label: '⚡ Bonne série (3j+)' }
  return                   { bonus: 0,   label: '💡 Revenez chaque jour !' }
}

export default async function daily(sock, sender, args, msg, ctx = {}) {
  try {
    const jid  = ctx.senderJid || getSenderJid(msg, sock)
    const now  = Date.now()
    const BASE_XP = 50
    let claimed   = false
    let newProfile

    newProfile = updateUserProfile(jid, old => {
      if (now - (old.lastDaily || 0) < 86400000) return old
      claimed = true
      const streak      = (old.dailyStreak || 0) + 1
      const { bonus }   = getStreakBonus(streak)
      const totalXP     = BASE_XP + bonus
      return {
        ...old,
        lastDaily:   now,
        dailyStreak: streak,
        xp:          (old.xp || 0) + totalXP,
        _earnedToday: totalXP
      }
    })

    if (!claimed) {
      const remaining = 86400000 - (now - (newProfile.lastDaily || 0))
      const h   = Math.floor(remaining / 3600000)
      const m   = Math.floor((remaining % 3600000) / 60000)
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│   🎁  RÉCOMPENSE QUOTIDIENNE   🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n│\n` +
        `│  ⏳ *Déjà récupéré aujourd'hui !*\n│\n` +
        `│  🕐 *Disponible dans :*\n` +
        `│  ${h}h ${m}m\n│\n` +
        `│  🔥 *Streak actuel :* ${newProfile.dailyStreak || 0} jour(s)\n` +
        `│  ✨ *XP total :* ${newProfile.xp || 0} XP\n│\n` +
        `│  💡 Revenez demain !\n│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    const streak     = newProfile.dailyStreak
    const earned     = newProfile._earnedToday || BASE_XP
    const { label }  = getStreakBonus(streak)
    const bonus      = earned - BASE_XP
    const newLvl     = getLevel(newProfile.xp || 0)

    await sendMessage(sock, sender,
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `│   🎁  RÉCOMPENSE QUOTIDIENNE   🕷️\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️━━━〔 ⚙️ 𝐑É𝐂𝐔𝐏É𝐑É ! 〕━━━🕸️\n│\n` +
      `│  🎉 *Daily récupéré avec succès !*\n│\n` +
      `│  ✨ *XP gagné :* +${BASE_XP} XP\n` +
      (bonus > 0 ? `│  🔥 *Bonus streak :* +${bonus} XP\n│  *Total :* +${earned} XP\n` : '') +
      `│\n` +
      `│  🔥 *Streak :* ${streak} jour(s)\n` +
      `│  ⭐ *Niveau :* ${newLvl}\n` +
      `│  ✨ *XP total :* ${newProfile.xp || 0} XP\n│\n` +
      `│  ${label}\n│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `_💡 Revenez demain pour continuer votre série !_`
    )

  } catch (e) {
    console.error('❌ daily.js:', e)
    await sendMessage(sock, sender, `│ opération échoué daily: ${e.message}`)
  }
}
