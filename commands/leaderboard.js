// commands/leaderboard.js — J.A.R.V.I.S.
// ✅ Classement Top 10 avec design amélioré

import { sendMessage } from '../lib/sendMessage.js'
import { getSenderJid, cleanNumber } from '../lib/ownerSystem.js'
import { loadV2Db } from '../lib/groupConfig.js'

function getLevel(xp) { return Math.floor(Math.sqrt((xp || 0) / 10)) + 1 }

export default async function leaderboard(sock, sender, args, msg, ctx = {}) {
  try {
    const db   = loadV2Db()
    const myJid = ctx.senderJid || getSenderJid(msg, sock)
    const top  = Object.entries(db.users || {})
      .sort((a, b) => (b[1].xp || 0) - (a[1].xp || 0))
      .slice(0, 10)

    if (top.length === 0) {
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│   🥇  CLASSEMENT XP            🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│  📭 Aucun classement disponible.\n│  Faites \`.daily\` pour commencer !\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    const medals   = ['🥇', '🥈', '🥉']
    const mentions = top.map(([jid]) => jid)
    const myPos    = Object.entries(db.users || {})
      .sort((a, b) => (b[1].xp || 0) - (a[1].xp || 0))
      .findIndex(([j]) => j === myJid)

    let text =
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `│   🥇  CLASSEMENT TOP 10 XP     🕷️\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️━━━〔 🏆 𝐓𝐎𝐏 𝐔𝐓𝐈𝐋𝐈𝐒𝐀𝐓𝐄𝐔𝐑𝐒 〕━━━🕸️\n│\n`

    top.forEach(([jid, p], i) => {
      const medal  = medals[i] || `${i + 1}.`
      const xp     = p.xp || 0
      const lvl    = getLevel(xp)
      const isMe   = jid === myJid
      text += `│  ${medal} @${cleanNumber(jid)}${isMe ? ' 👈' : ''}\n│      Niv.${lvl}  ✨ ${xp} XP\n│\n`
    })

    text +=
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n`

    if (myPos >= 0) {
      text += `\n🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n`
      text += `│  📍 *Votre position :* #${myPos + 1}\n`
      text += `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n`
    }

    text += `\n_💡 \`.daily\` → +50 XP par jour | \`.rank\` → Votre rang_`

    await sendMessage(sock, sender, text, { mentions })

  } catch (e) {
    console.error('❌ leaderboard.js:', e)
    await sendMessage(sock, sender, `│ opération échoué leaderboard: ${e.message}`)
  }
}
