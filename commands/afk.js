// commands/afk.js — NOUVELLE COMMANDE
// 💤 Statut AFK (Away From Keyboard)

import { sendMessage } from '../lib/sendMessage.js'
import fs from 'fs'
import path from 'path'
import { getSenderJid } from '../lib/ownerSystem.js'

const AFK_FILE = path.join(process.cwd(), 'data', 'afk.json')

function loadAfk() {
    try {
        if (fs.existsSync(AFK_FILE)) return JSON.parse(fs.readFileSync(AFK_FILE, 'utf8'))
    } catch {}
    return {}
}

function saveAfk(data) {
    try {
        const dir = path.dirname(AFK_FILE)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(AFK_FILE, JSON.stringify(data, null, 2))
        return true
    } catch { return false }
}

function formatDuration(ms) {
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    const h = Math.floor(m / 60)
    const d = Math.floor(h / 24)
    if (d > 0) return `${d}j ${h % 24}h`
    if (h > 0) return `${h}h ${m % 60}m`
    if (m > 0) return `${m}m ${s % 60}s`
    return `${s}s`
}

export { loadAfk, saveAfk }

export default async function afk(sock, sender, args, msg) {
    try {
        const userId = getSenderJid(msg, sock)
        const num    = userId.split('@')[0]
        const reason = args.join(' ') || 'Pas disponible'
        const data   = loadAfk()

        // Si déjà AFK: quitter AFK
        if (data[userId]) {
            const duration = formatDuration(Date.now() - data[userId].since)
            const reason_  = data[userId].reason
            delete data[userId]
            saveAfk(data)

            return await sendMessage(sock, sender,
                `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                `│  ⚙️ *RETOUR EN LIGNE*  \n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `👋 Bienvenue de retour, @${num} !\n` +
                `⏱️ Absent depuis: *${duration}*\n` +
                `📝 Raison: _${reason_}_`,
                { mentions: [userId] }
            )
        }

        // Activer AFK
        data[userId] = {
            reason,
            since   : Date.now(),
            groupId : sender.endsWith('@g.us') ? sender : null
        }
        saveAfk(data)

        await sendMessage(sock, sender,
            `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
            `│  💤 *MODE AFK ACTIVÉ*  \n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
            `💤 @${num} est maintenant *AFK*\n\n` +
            `📝 Raison: _${reason}_\n\n` +
            `💡 _Envoyez n'importe quel message pour revenir en ligne_`,
            { mentions: [userId] }
        )

        console.log(`💤 afk ON | ${num} | ${reason}`)

    } catch (e) {
        console.error("❌ Erreur afk:", e)
        await sendMessage(sock, sender, `│ opération échoué: ${e.message}`)
    }
}
