// commands/rank.js — J.A.R.V.I.S.
// ✅ Classement XP avec design amélioré

import { sendMessage } from '../lib/sendMessage.js'
import { getSenderJid, cleanNumber } from '../lib/ownerSystem.js'
import { getUserProfile, loadV2Db } from '../lib/groupConfig.js'

function getLevel(xp) { return Math.floor(Math.sqrt((xp || 0) / 10)) + 1 }

function getXpBar(xp) {
  const level    = getLevel(xp)
  const xpForLvl = ((level - 1) ** 2) * 10
  const xpNext   = (level ** 2) * 10
  const progress = xpNext === xpForLvl ? 10 : Math.min(Math.round(((xp - xpForLvl) / (xpNext - xpForLvl)) * 10), 10)
  return '▓'.repeat(progress) + '░'.repeat(10 - progress)
}

function getRankEmoji(pos) {
  return ['🥇', '🥈', '🥉'][pos] || `${pos + 1}.`
}

export default async function rank(sock, sender, args, msg, ctx = {}) {
  try {
    const jid  = ctx.senderJid || getSenderJid(msg, sock)
    const p    = getUserProfile(jid)
    const xp   = p.xp || 0
    const lvl  = getLevel(xp)
    const xpNext = (lvl ** 2) * 10

    // Calculer position dans le classement global
    const db   = loadV2Db()
    const all  = Object.entries(db.users || {}).sort((a, b) => (b[1].xp || 0) - (a[1].xp || 0))
    const pos  = all.findIndex(([j]) => j === jid)
    const rank = pos >= 0 ? pos + 1 : '?'

    await sendMessage(sock, sender,
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `│   🏆  CLASSEMENT XP            🕷️\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️━━━〔 👤 𝐕𝐎𝐓𝐑𝐄 𝐑𝐀𝐍𝐆 〕━━━🕸️\n│\n` +
      `│  📱 @${cleanNumber(jid)}\n│\n` +
      `│  ${pos >= 0 ? getRankEmoji(pos) : '❓'} *Position :* #${rank} sur ${all.length}\n` +
      `│  ⭐ *Niveau :* ${lvl}\n` +
      `│  ✨ *XP :* ${xp} / ${xpNext}\n` +
      `│  ${getXpBar(xp)}  → Niv.${lvl + 1}\n│\n` +
      (pos > 0 && all[pos - 1]
        ? `│  🎯 *Prochain :* @${cleanNumber(all[pos - 1][0])}\n│      (${(all[pos - 1][1].xp || 0) - xp} XP d'écart)\n│\n`
        : `│  👑 *Vous êtes #1 ! Bravo !*\n│\n`
      ) +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `_💡 \`.leaderboard\` → Top 10 global_`,
      { mentions: [jid] }
    )

  } catch (e) {
    console.error('❌ rank.js:', e)
    await sendMessage(sock, sender, `│ opération échoué rank: ${e.message}`)
  }
}
