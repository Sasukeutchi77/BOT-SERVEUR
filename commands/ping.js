// commands/ping.js — 𝑴𝑼𝑹𝑨𝑺𝑨𝑲𝑰 𝐒𝐒𝐊 𓂀
// ✅ Loader animé premium
// ✅ Mesure latence précise
// ✅ Mode détaillé avec --detailed

import { sendMessage } from "../lib/sendMessage.js"
import { showProgressLoader, deleteLoader } from "../lib/animLoader.js"

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

function getQuality(ms) {
    if (ms < 50)  return { label: "Excellente", emoji: "🚀", bar: "▓▓▓▓▓▓▓▓▓▓", color: "⚙️" }
    if (ms < 150) return { label: "Très bonne", emoji: "⚡", bar: "▓▓▓▓▓▓▓▓░░", color: "⚙️" }
    if (ms < 300) return { label: "Bonne",      emoji: "⚙️", bar: "▓▓▓▓▓▓░░░░", color: "🟡" }
    if (ms < 600) return { label: "Moyenne",    emoji: "🐢", bar: "▓▓▓▓░░░░░░", color: "🟡" }
    return               { label: "Faible",     emoji: "🐌", bar: "▓▓░░░░░░░░", color: "🤖" }
}

export default async function ping(sock, sender, args, msg) {
    let loadKey = null
    try {
        const t1 = Date.now()

        // Loader animé premium
        loadKey = await showProgressLoader(sock, sender, "TEST DE LATENCE")

        const t2 = Date.now()
        const latency = Math.min(t2 - t1, 999)
        const quality = getQuality(latency)
        const time    = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })

        await deleteLoader(sock, sender, loadKey)
        loadKey = null

        const isDetailed = args.includes("-d") || args.includes("--detailed")
        let text

        if (isDetailed) {
            const mem    = process.memoryUsage()
            const ramMB  = Math.round(mem.rss / 1024 / 1024)
            const heapMB = Math.round(mem.heapUsed / 1024 / 1024)
            const upSec  = Math.floor(process.uptime())
            const m      = Math.floor(upSec / 60)
            const s      = upSec % 60

            text =
                `🕸️━━━〔 🏓 𝐏𝐎𝐍𝐆 𝐃É𝐓𝐀𝐈𝐋𝐋É 〕━━━🕸️\n` +
                `│\n` +
                `│  ⏱️ *Latence :* ${latency}ms\n` +
                `│  ${quality.bar}  ${quality.color}\n` +
                `│\n` +
                `│  ${quality.emoji} *Performance :* ${quality.label}\n` +
                `│  🕐 *Heure :* ${time}\n` +
                `│  💾 *RAM (RSS) :* ${ramMB} MB\n` +
                `│  🧠 *Heap :* ${heapMB} MB\n` +
                `│  ⏱️ *Uptime :* ${m}m ${s}s\n` +
                `│\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        } else {
            text =
                `🕸️━━━〔 🏓 𝐏𝐎𝐍𝐆 〕━━━🕸️\n` +
                `│\n` +
                `│  ⏱️ *Latence :* ${latency}ms\n` +
                `│  ${quality.bar}\n` +
                `│\n` +
                `│  ${quality.emoji} *Qualité :* ${quality.label}\n` +
                `│  ${quality.color} *Statut :* En ligne\n` +
                `│  🕐 *Heure :* ${time}\n` +
                `│\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `_💡 Tip: \`.ping --detailed\` pour plus d'infos_`
        }

        await sendMessage(sock, sender, text)

    } catch (e) {
        console.error("❌ ping.js:", e)
        if (loadKey) await deleteLoader(sock, sender, loadKey)
        await sendMessage(sock, sender,
            `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 𝐏𝐈𝐍𝐆 〕━━━🕸️\n│  ${e.message}\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        )
    }
}
