// commands/info.js — J.A.R.V.I.S.
// ✅ Informations complètes du bot avec design premium

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { sendMessage } from "../lib/sendMessage.js"
import { showProgressLoader, deleteLoader } from "../lib/animLoader.js"
import { config } from "../config.js"
import { BOT_START_TIME } from "../index.js"

const COMMAND_GIF_PATH = path.join(process.cwd(), 'assets', 'command-animation.mp4')

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

export default async function info(sock, sender, args, msg) {
    let loadKey = null
    try {
        loadKey = await showProgressLoader(sock, sender, "INFOS BOT")

        const botUptime = BOT_START_TIME ? Math.floor((Date.now() - BOT_START_TIME) / 1000) : Math.floor(process.uptime())
        const mem       = process.memoryUsage()
        const ramMB     = Math.round(mem.rss / 1024 / 1024)
        const totalCmds = sock.commandsCache ? Object.keys(sock.commandsCache).length : 0
        const time      = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        const date      = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

        await deleteLoader(sock, sender, loadKey)
        loadKey = null

        const text =
            `🕸️━━━〔 👁️ 𝐈𝐍𝐅𝐎𝐒 𝐒𝐘𝐒𝐓È𝐌𝐄 〕━━━🕸️\n` +
            `│\n` +
            `│  🤖 *Nom :* ${config.botName || 'J.A.R.V.I.S.'}\n` +
            `│  🏷️ *Version :* v1 Ultimate\n` +
            `│  👨‍💻 *Développeur :* ${config.developerName || '𝐋𝐎𝐑𝐃 𝐃𝐄𝐌𝐎𝐍'}\n` +
            `│  🛠️ *Équipe :* ${config.teamName || '𝐍𝐄𝐗𝐔𝐒-𝐅𝐎𝐑𝐆𝐄𝐑'}\n` +
            `│\n` +
            `│  ⚙️ *Statut :* En ligne\n` +
            `│  ⏱️ *Uptime :* ${formatUptime(botUptime)}\n` +
            `│  📦 *commandes :* ${totalCmds}\n` +
            `│  💾 *RAM utilisée :* ${ramMB} MB\n` +
            `│  📦 *Node.js :* ${process.version}\n` +
            `│\n` +
            `│  🔧 *Préfixe :* \`${config.prefix || '.'}\`\n` +
            `│  🕐 *Heure :* ${time}\n` +
            `│  📅 *Date :* ${date}\n` +
            `│\n` +
            `│  📡 *Framework :* @whiskeysockets/baileys\n` +
            `│  🖥️ *Plateforme :* ${process.platform}\n` +
            `│\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
            `_🔥 𝐉.𝐀.𝐑.𝐕.𝐈.𝐒 — Le Bot WhatsApp Ultime_`

        try {
            const gif = await readFile(COMMAND_GIF_PATH)
            await sock.sendMessage(sender, { video: gif, gifPlayback: true, caption: text })
        } catch (imageError) {
            console.warn('⚠️ GIF de info indisponible, envoi du texte seul :', imageError?.message || imageError)
            await sendMessage(sock, sender, text)
        }

    } catch (e) {
        console.error("❌ info.js:", e)
        if (loadKey) await deleteLoader(sock, sender, loadKey)
        await sendMessage(sock, sender, `│ opération échoué info: ${e.message}`)
    }
}
