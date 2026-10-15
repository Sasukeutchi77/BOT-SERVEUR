// commands/antipromote.js — VERSION CORRIGÉE— PERSISTANCE JSON
// ✅ Sauvegarde dans data/antipromote_config.json (persistance redémarrage)
// ✅ blockPromote() lisible par roleManager.js

import { sendMessage } from "../lib/sendMessage.js"
import fs from "fs"
import path from "path"
import { getSenderJid, isDeployer, isSudo, isGroupAdmin, cleanNumber } from '../lib/ownerSystem.js'

const ANTIPROMOTE_FILE = path.join(process.cwd(), 'data', 'antipromote_config.json')

// Cache mémoire pour limiter les I/O à chaque event participants.update
let _cache = null
let _cacheStamp = 0
const CACHE_TTL_MS = 3000

function loadConfig() {
    const now = Date.now()
    if (_cache && (now - _cacheStamp) < CACHE_TTL_MS) return _cache
    try {
        if (fs.existsSync(ANTIPROMOTE_FILE)) {
            _cache = JSON.parse(fs.readFileSync(ANTIPROMOTE_FILE, 'utf8')) || {}
        } else {
            _cache = {}
        }
    } catch (e) {
        console.error('❌ Erreur lecture antipromote_config:', e.message)
        _cache = _cache || {}
    }
    _cacheStamp = now
    return _cache
}

function saveConfig(data) {
    try {
        const dir = path.dirname(ANTIPROMOTE_FILE)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(ANTIPROMOTE_FILE, JSON.stringify(data, null, 2))
        _cache = data
        _cacheStamp = Date.now()
    } catch (e) {
        console.error('❌ Erreur sauvegarde antipromote:', e.message)
    }
}

export function isAntiPromoteActive(groupId) {
    if (!groupId) return false
    const cfg = loadConfig()
    return cfg[groupId]?.enabled === true
}

export default async function antipromote(sock, sender, args, msg, ctx = {}) {
    try {
        if (!sender || !sender.endsWith('@g.us')) {
            await sendMessage(sock, sender, "🕷️ Cette commande ne fonctionne que dans les *groupes*.")
            return
        }

        const userId = ctx.senderJid || getSenderJid(msg, sock)

        // Vérification des droits : owner, sudo, OU admin du groupe
        let hasRights = ctx.isOwner || ctx.isSudo || isDeployer(userId) || isSudo(userId)
        if (!hasRights) {
            // ctx.isAdmin est calculé par le messageHandler (plus fiable)
            if (ctx.isAdmin) {
                hasRights = true
            } else {
                try {
                    hasRights = await isGroupAdmin(sock, sender, userId)
                } catch (e) { /* silencieux */ }
            }
        }

        if (!hasRights) {
            await sendMessage(sock, sender,
                `🕸️━━━〔 ⛔ 𝐀𝐂𝐂È𝐒 𝐑𝐄𝐅𝐔𝐒É 〕━━━🕸️\n\n` +
                `│ 🔒 Seuls les *administrateurs* du groupe\n` +
                `│    ou *Owner/Sudo* peuvent\n` +
                `│    configurer l'anti-promote.\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
            return
        }

        const action = args[0]?.toLowerCase() || 'status'
        const config = loadConfig()

        if (action === 'on') {
            config[sender] = { enabled: true, updatedAt: new Date().toISOString() }
            saveConfig(config)
            await sendMessage(sock, sender,
                `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                `│  🛡️ *ANTI-PROMOTE* 🛡️  \n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `🕸️━━━〔 ⚙️ 𝐀𝐂𝐓𝐈𝐕É 〕━━━🕸️\n` +
                `│\n` +
                `│ 🛡️ Anti-promote: *ON*\n` +
                `│ ⛔ Aucune promotion autorisée.\n` +
                `│ 💾 Paramètre sauvegardé\n` +
                `│\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
        } else if (action === 'off') {
            config[sender] = { enabled: false, updatedAt: new Date().toISOString() }
            saveConfig(config)
            await sendMessage(sock, sender,
                `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                `│  🛡️ *ANTI-PROMOTE* 🛡️  \n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `🕸️━━━〔 🕷️ 𝐃É𝐒𝐀𝐂𝐓𝐈𝐕É 〕━━━🕸️\n` +
                `│\n` +
                `│ 🔓 Anti-promote: *OFF*\n` +
                `│ 📌 Les promotions sont autorisées.\n` +
                `│ 💾 Paramètre sauvegardé\n` +
                `│\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
        } else {
            const isActive = isAntiPromoteActive(sender)
            const status = isActive ? "⚙️ *ACTIVÉ*" : "🤖 *DÉSACTIVÉ*"
            await sendMessage(sock, sender,
                `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                `│  🛡️ *ANTI-PROMOTE* 🛡️  \n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `🕸️━━━〔 👁️ 𝐒𝐓𝐀𝐓𝐔𝐓 〕━━━🕸️\n` +
                `│\n` +
                `│ 📊 Statut: ${status}\n` +
                `│ 💾 Persistant: ⚙️ Oui\n` +
                `│\n` +
                `│ 💡 syntaxe:\n` +
                `│ • .antipromote on  — Activer\n` +
                `│ • .antipromote off — Désactiver\n` +
                `│\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
        }
    } catch (e) {
        console.error("❌ Erreur antipromote:", e)
        await sendMessage(sock, sender, "🕷️ opération échoué: " + e.message)
    }
}

// ─── Appelé depuis roleManager.js / index.js ──────────────────────────────────
export async function blockPromote(sock, groupId, promoterId, promotedId) {
    try {
        if (!isAntiPromoteActive(groupId)) return false

        await sock.groupParticipantsUpdate(groupId, [promotedId], "demote")

        await sock.sendMessage(groupId, {
            text:
                `🛡️ *ANTI-PROMOTE ACTIF*\n\n` +
                `@${promoterId.split('@')[0]} a tenté de nommer @${promotedId.split('@')[0]} administrateur.\n\n` +
                `⛔ Action annulée.`,
            mentions: [promoterId, promotedId]
        })

        console.log(`🛡️ Anti-promote | Promotion de ${promotedId} bloquée par ${promoterId}`)
        return true
    } catch (e) {
        console.error("❌ Erreur blockPromote:", e)
        return false
    }
}
