// commands/status.js — J.A.R.V.I.S.
// ✅ Statut système complet avec design amélioré

import { sendMessage } from '../lib/sendMessage.js'
import { getStats } from '../lib/statsManager.js'
import { config } from '../config.js'

function formatUptime(s) {
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (d > 0) return `${d}j ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${sec}s`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}

function getRamBar(pct) {
  const filled = Math.round((pct / 100) * 10)
  const color  = pct < 60 ? '⚙️' : pct < 80 ? '🟡' : '🤖'
  return '▓'.repeat(filled) + '░'.repeat(10 - filled) + `  ${color} ${pct}%`
}

export default async function status(sock, sender, args, msg) {
  try {
    const s          = getStats()
    const uptime     = Math.floor(process.uptime())
    const mem        = process.memoryUsage()
    const ramMB      = Math.round(mem.rss / 1024 / 1024)
    const heapMB     = Math.round(mem.heapUsed / 1024 / 1024)
    const heapTotMB  = Math.round(mem.heapTotal / 1024 / 1024)
    const ramPct     = Math.min(Math.round((heapMB / heapTotMB) * 100), 100)
    const cmdCount   = Object.keys(sock.commandsCache || {}).length
    const time       = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const date       = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

    const stability =
      uptime > 86400 ? '⚙️ Très stable'  :
      uptime > 3600  ? '⚙️ Stable'        :
      uptime > 600   ? '🟡 En cours'      : '🤖 Démarrage récent'

    await sendMessage(sock, sender,
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `│   📊  STATUT SYSTÈME           🕷️\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️━━━〔 🤖 𝐈𝐃𝐄𝐍𝐓𝐈𝐓É 〕━━━🕸️\n│\n` +
      `│  🤖 *Système :* ${config.botName || 'J.A.R.V.I.S.'}\n` +
      `│  🏷️ *Version :* v4 Premium\n` +
      `│  ⚙️ *Statut :* EN LIGNE\n│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️━━━〔 ⚙️ 𝐒𝐘𝐒𝐓È𝐌𝐄 〕━━━🕸️\n│\n` +
      `│  ⏱️ *Uptime :* ${formatUptime(uptime)}\n` +
      `│  📊 *Stabilité :* ${stability}\n` +
      `│  📦 *Node.js :* ${process.version}\n` +
      `│  🖥️ *Plateforme :* ${process.platform}\n│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️━━━〔 💾 𝐌É𝐌𝐎𝐈𝐑𝐄 〕━━━🕸️\n│\n` +
      `│  💾 *RAM (RSS) :* ${ramMB} MB\n` +
      `│  🧠 *Heap :* ${heapMB} / ${heapTotMB} MB\n` +
      `│  ${getRamBar(ramPct)}\n│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️━━━〔 📈 𝐀𝐂𝐓𝐈𝐕𝐈𝐓É 〕━━━🕸️\n│\n` +
      `│  📦 *commandes chargées :* ${cmdCount}\n` +
      `│  💬 *Messages traités :* ${s.messages || 0}\n` +
      `│  ⚡ *commandes exécutées :* ${s.commands || 0}\n│\n` +
      `│  🕐 *Heure :* ${time}\n` +
      `│  📅 *Date :* ${date}\n│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )

  } catch (e) {
    console.error('❌ status.js:', e)
    await sendMessage(sock, sender, `│ opération échoué status: ${e.message}`)
  }
}
