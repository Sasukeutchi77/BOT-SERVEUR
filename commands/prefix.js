// commands/prefix.js
// Changer le préfixe du bot (Owner/SUDO). Persisté dans data/prefix.json.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { sendMessage } from '../lib/sendMessage.js'
import { getSenderJid, isDeployer, isSudo } from '../lib/ownerSystem.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.join(__dirname, '..', 'data')
const PREFIX_FILE = path.join(DATA_DIR, 'prefix.json')

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function loadPrefix() {
    try {
        if (fs.existsSync(PREFIX_FILE)) {
            const data = JSON.parse(fs.readFileSync(PREFIX_FILE, 'utf8'))
            return data?.prefix || null
        }
    } catch {}
    return null
}

function savePrefix(prefix) {
    ensureDataDir()
    fs.writeFileSync(PREFIX_FILE, JSON.stringify({ prefix, updatedAt: new Date().toISOString() }, null, 2))
}

export default async function prefix(sock, sender, args, msg) {
    const userId = getSenderJid(msg, sock)
    if (!isDeployer(userId) && !isSudo(userId)) {
        await sendMessage(sock, sender, "⛔ Seuls Owner/SUDO peuvent changer le préfixe.")
        return
    }

    const action = (args[0] || '').toLowerCase()
    if (!action || action === 'show' || action === 'status') {
        const p = loadPrefix() || '(défaut: .)'
        await sendMessage(sock, sender, `🔧 Préfixe actuel: *${p}*\n\nUsage: .prefix set !  |  .prefix reset`)
        return
    }

    if (action === 'reset') {
        ensureDataDir()
        if (fs.existsSync(PREFIX_FILE)) fs.unlinkSync(PREFIX_FILE)
        await sendMessage(sock, sender, "⚙️ Préfixe réinitialisé sur `.` (défaut). Redémarrez le Système si besoin.")
        return
    }

    if (action === 'set') {
        const newPrefix = args[1]
        if (!newPrefix || newPrefix.length > 3) {
            await sendMessage(sock, sender, "🕷️ syntaxe: .prefix set <prefix> (1 à 3 caractères)")
            return
        }
        savePrefix(newPrefix)
        await sendMessage(sock, sender, `⚙️ Nouveau préfixe sauvegardé: *${newPrefix}*\nRedémarrez le Système si le préfixe ne change pas immédiatement.`)
        return
    }

    await sendMessage(sock, sender, "🕷️ syntaxe: .prefix  |  .prefix set !  |  .prefix reset")
}
