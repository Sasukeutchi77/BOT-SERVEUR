// commands/stats.js — J.A.R.V.I.S. v4 PREMIUM
// ✅ Statistiques d'usage avec design amélioré

import { sendMessage } from '../lib/sendMessage.js'
import { cleanNumber } from '../lib/ownerSystem.js'
import { getStats, getTopUsers } from '../lib/statsManager.js'

export default async function stats(sock, sender) {
  try {
    const s          = getStats()
    const topCmds    = Object.entries(s.commandUsage || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
    const topUsers   = getTopUsers(5)
    const medals     = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣']

    let text =
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `│   📈  STATISTIQUES D'SYNTAXE     🕷️\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️━━━〔 📊 𝐆𝐋𝐎𝐁𝐀𝐋 〕━━━🕸️\n│\n` +
      `│  💬 *Messages traités :* ${s.messages || 0}\n` +
      `│  ⚡ *commandes lancées :* ${s.commands || 0}\n` +
      `│  🕷️ *Erreurs :* ${s.errors || 0}\n│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n`

    if (topCmds.length > 0) {
      text += `\n🕸️━━━〔 🏆 𝐓𝐎𝐏 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐄𝐒 〕━━━🕸️\n│\n`
      topCmds.forEach(([cmd, count], i) => {
        const bar = '▓'.repeat(Math.min(Math.round((count / (topCmds[0][1] || 1)) * 8), 8))
        text += `│  ${medals[i]} \`.${cmd}\` — *${count}x*\n│      ${bar}\n`
      })
      text += `│\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n`
    }

    if (topUsers.length > 0) {
      text += `\n🕸️━━━〔 📡 𝐓𝐎𝐏 𝐔𝐓𝐈𝐋𝐈𝐒𝐀𝐓𝐄𝐔𝐑𝐒 𝐀𝐂𝐓𝐈𝐅𝐒 〕━━━🕸️\n│\n`
      const mentions = []
      topUsers.forEach(([jid, u], i) => {
        const actions = (u.messages || 0) + (u.commands || 0)
        text += `│  ${medals[i]} @${cleanNumber(jid)} — *${actions}* actions\n`
        mentions.push(jid)
      })
      text += `│\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      await sendMessage(sock, sender, text, { mentions })
    } else {
      await sendMessage(sock, sender, text)
    }

  } catch (e) {
    console.error('❌ stats.js:', e)
    await sendMessage(sock, sender, `│ opération échoué stats: ${e.message}`)
  }
}
