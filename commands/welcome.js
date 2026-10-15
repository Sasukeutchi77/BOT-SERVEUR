import { sendMessage } from '../lib/sendMessage.js'
import fs from 'fs'
import path from 'path'
import { getSenderJid, isDeployer, isGroupAdmin, isSudo } from '../lib/ownerSystem.js'

const WELCOME_FILE = path.join(process.cwd(), 'data', 'welcome.json')

function loadData() {
    try {
        if (fs.existsSync(WELCOME_FILE)) return JSON.parse(fs.readFileSync(WELCOME_FILE, 'utf8'))
    } catch {}
    return {}
}

function saveData(data) {
    try {
        const dir = path.dirname(WELCOME_FILE)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(WELCOME_FILE, JSON.stringify(data, null, 2))
        return true
    } catch { return false }
}

export default async function welcome(sock, sender, args, msg) {
    try {
        const userId = getSenderJid(msg, sock)
        if (!sender.endsWith('@g.us')) {
            return await sendMessage(sock, sender, "🕷️ commande groupe uniquement.")
        }

        const canUse = isDeployer(userId) || isSudo(userId) || await isGroupAdmin(sock, sender, userId)
        if (!canUse) {
            return await sendMessage(sock, sender,
                `🕸️━━━〔 ⛔ 𝐀𝐂𝐂È𝐒 𝐑𝐄𝐅𝐔𝐒É 〕━━━🕸️\n\n` +
                `│ 🔒 Requis: administrateur du groupe\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
        }

        const action = args[0]?.toLowerCase()
        const data   = loadData()

        if (action === 'on') {
            data[sender] = { ...(data[sender] || {}), enabled: true }
            saveData(data)
            return await sendMessage(sock, sender,
                `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                `│  👋 *WELCOME ACTIVÉ* 👋  \n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `⚙️ Message de bienvenue *activé* !\n\n` +
                `💡 Personnaliser: *.welcome set <message>*\n` +
                `Variables: {name} {group} {count}`
            )
        }

        if (action === 'off') {
            data[sender] = { ...(data[sender] || {}), enabled: false }
            saveData(data)
            return await sendMessage(sock, sender,
                `🕸️━━━〔 🕷️ 𝐖𝐄𝐋𝐂𝐎𝐌𝐄 𝐃É𝐒𝐀𝐂𝐓𝐈𝐕É 〕━━━🕸️\n\n` +
                `│ Le message de bienvenue est désactivé.\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
        }

        if (action === 'set') {
            const newMsg = args.slice(1).join(' ')
            if (!newMsg) {
                return await sendMessage(sock, sender,
                    `│ syntaxe: *.welcome set <message>*\n\nVariables dispo:\n• {name} → mention du nouveau\n• {group} → nom du groupe\n• {count} → nb utilisateurs`
                )
            }
            data[sender] = { ...(data[sender] || {}), message: newMsg }
            saveData(data)
            return await sendMessage(sock, sender,
                `⚙️ Message de bienvenue personnalisé sauvegardé !\n\n` +
                `📝 Message:\n_${newMsg}_`
            )
        }

        if (action === 'reset') {
            if (data[sender]) {
                delete data[sender].message
                saveData(data)
            }
            return await sendMessage(sock, sender, `⚙️ Message de bienvenue réinitialisé au message par défaut.`)
        }

        // Statut
        const status = data[sender]?.enabled ? '⚙️ *ACTIVÉ*' : '🕷️ *DÉSACTIVÉ*'
        const currentMsg = data[sender]?.message || '(message par défaut)'
        await sendMessage(sock, sender,
            `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
            `│  👋 *WELCOME MESSAGE*  \n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
            `📊 Statut: ${status}\n\n` +
            `📝 Message actuel:\n_${currentMsg}_\n\n` +
            `💡 *commandes:*\n` +
            `• *.welcome on* — Activer\n` +
            `• *.welcome off* — Désactiver\n` +
            `• *.welcome set <msg>* — Personnaliser\n` +
            `• *.welcome reset* — Réinitialiser\n\n` +
            `📌 *Variables:* {name} {group} {count}`
        )

    } catch (e) {
        console.error("❌ Erreur welcome:", e)
        await sendMessage(sock, sender, `│ opération échoué: ${e.message}`)
    }
}
