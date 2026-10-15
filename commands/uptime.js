// commands/uptime.js — 𝑴𝑼𝑹𝑨𝑺𝑨𝑲𝑰 𝐒𝐒𝐊 𓂀
// ✅ Design premium avec statistiques système complètes

import { sendMessage } from "../lib/sendMessage.js"
import { showProgressLoader, deleteLoader } from "../lib/animLoader.js"
import { BOT_START_TIME } from "../index.js"

function formatUptime(seconds) {
    const d = Math.floor(seconds / 86400)
    const h = Math.floor((seconds % 86400) / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (d > 0) return `${d}j ${h}h ${m}m ${s}s`
    if (h > 0) return `${h}h ${m}m ${s}s`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
}

function getUptimeBar(seconds) {
    // Couleur selon le temps d'uptime
    if (seconds > 86400) return "⚙️ Très stable"
    if (seconds > 3600)  return "🟡 Stable"
    if (seconds > 600)   return "🟠 En cours"
    return "🤖 Démarrage récent"
}

export default async function uptime(sock, sender) {
    let loadKey = null
    try {
        loadKey = await showProgressLoader(sock, sender, "STATS SYSTÈME")

        const procUptime = Math.floor(process.uptime())
        const botUptime  = BOT_START_TIME ? Math.floor((Date.now() - BOT_START_TIME) / 1000) : procUptime
        const mem        = process.memoryUsage()
        const ramMB      = Math.round(mem.rss / 1024 / 1024)
        const heapMB     = Math.round(mem.heapUsed / 1024 / 1024)
        const heapTotMB  = Math.round(mem.heapTotal / 1024 / 1024)
        const ramPct     = Math.min(Math.round((heapMB / heapTotMB) * 100), 100)
        const stability  = getUptimeBar(botUptime)
        const time       = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

        // Barre RAM visuelle
        const ramBarLen  = 10
        const ramFilled  = Math.round((ramPct / 100) * ramBarLen)
        const ramBar     = "▓".repeat(ramFilled) + "░".repeat(ramBarLen - ramFilled)

        await deleteLoader(sock, sender, loadKey)
        loadKey = null

        const text =
            `🕸️━━━〔 ⏱️ 𝐒𝐓𝐀𝐓𝐈𝐒𝐓𝐈𝐐𝐔𝐄𝐒 𝐒𝐘𝐒𝐓È𝐌𝐄 〕━━━🕸️\n` +
            `│\n` +
            `│  ⏱️ *Uptime Système :*\n` +
            `│  └ ${formatUptime(botUptime)}\n` +
            `│\n` +
            `│  ⚙️ *Uptime Processus :*\n` +
            `│  └ ${formatUptime(procUptime)}\n` +
            `│\n` +
            `│  💾 *Mémoire RAM :* ${ramMB} MB\n` +
            `│  └ ${ramBar} ${ramPct}%\n` +
            `│\n` +
            `│  🧠 *Heap :* ${heapMB} / ${heapTotMB} MB\n` +
            `│  📦 *Node.js :* ${process.version}\n` +
            `│  🖥️ *OS :* ${process.platform}\n` +
            `│  🕐 *Heure :* ${time}\n` +
            `│\n` +
            `│  📊 *Stabilité :* ${stability}\n` +
            `│\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`

        await sendMessage(sock, sender, text)

    } catch (e) {
        console.error("❌ uptime.js:", e)
        if (loadKey) await deleteLoader(sock, sender, loadKey)
        await sendMessage(sock, sender, `│ opération échoué uptime: ${e.message}`)
    }
}
