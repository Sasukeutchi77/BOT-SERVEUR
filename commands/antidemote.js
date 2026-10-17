import { sendMessage } from "../lib/sendMessage.js"
import fs from "fs"
import path from "path"
import {
    getSenderJid, isDeployer, isSudo, isSuperAdmin,
    isGroupAdmin as isUserGroupAdmin, cleanNumber
} from '../lib/ownerSystem.js'

// ─── PERSISTANCE ─────────────────────────────────────────────────────────────
const DATA_FILE = path.join(process.cwd(), 'data', 'antidemote_config.json')

// Cache mémoire (TTL court) pour limiter les I/O à chaque event
let _cache = null
let _cacheStamp = 0
const CACHE_TTL_MS = 3000

function loadConfig() {
    const now = Date.now()
    if (_cache && (now - _cacheStamp) < CACHE_TTL_MS) return _cache
    try {
        if (fs.existsSync(DATA_FILE)) {
            _cache = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) || {}
        } else {
            _cache = {}
        }
    } catch (e) {
        console.error('❌ Erreur chargement antidemote:', e.message)
        _cache = _cache || {}
    }
    _cacheStamp = now
    return _cache
}

function saveConfig(data) {
    try {
        const dir = path.dirname(DATA_FILE)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
        _cache = data
        _cacheStamp = Date.now()
        return true
    } catch (e) {
        console.error('❌ Erreur sauvegarde antidemote:', e.message)
        return false
    }
}

// ─── FONCTIONS PUBLIQUES ──────────────────────────────────────────────────────

export function isAntiDemoteActive(groupId) {
    if (!groupId) return false
    const cfg = loadConfig()
    return cfg[groupId]?.enabled === true
}

export function getProtectedGroups() {
    const cfg = loadConfig()
    return Object.entries(cfg)
        .filter(([_, v]) => v.enabled)
        .map(([groupId]) => groupId)
}

// ─── COMMANDE PRINCIPALE ──────────────────────────────────────────────────────
export default async function antidemote(sock, sender, args, msg, ctx = {}) {
    try {
        // ── Vérifier si groupe ──
        if (!sender || !sender.endsWith('@g.us')) {
            await sendMessage(sock, sender,
                `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
                `│ Cette commande ne fonctionne\n` +
                `│ que dans les *groupes*.\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
            return
        }

        const userId = ctx.senderJid || getSenderJid(msg, sock)

        // ── Vérifier les permissions (owner / sudo / admin du groupe) ──
        let hasRights = ctx.isOwner || ctx.isSudo ||
                        isDeployer(userId) || isSudo(userId) || isSuperAdmin(userId)

        if (!hasRights) {
            if (ctx.isAdmin) {
                hasRights = true
            } else {
                try {
                    hasRights = await isUserGroupAdmin(sock, sender, userId)
                } catch (e) { /* silencieux */ }
            }
        }

        if (!hasRights) {
            await sendMessage(sock, sender,
                `🕸️━━━〔 ⛔ 𝐀𝐂𝐂È𝐒 𝐑𝐄𝐅𝐔𝐒É 〕━━━🕸️\n\n` +
                `│ 🔒 Seuls les *administrateurs* du\n` +
                `│    groupe ou *Owner/Sudo*\n` +
                `│    peuvent configurer\n` +
                `│    l'anti-demote.\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
            return
        }

        const action = args[0]?.toLowerCase()
        const config = loadConfig()

        if (action === 'on') {
            config[sender] = { enabled: true, updatedAt: new Date().toISOString() }
            saveConfig(config)
            await sendMessage(sock, sender,
                `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                `│  🛡️ *ANTI-DEMOTE* 🛡️  \n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `🕸️━━━〔 ⚙️ 𝐀𝐂𝐓𝐈𝐕É 〕━━━🕸️\n` +
                `│\n` +
                `│ 🛡️ Anti-demote: *ON*\n` +
                `│ 👑 *TOUS* les administrateurs\n` +
                `│    sont protégés.\n` +
                `│\n` +
                `│ ⛔ Aucun administrateur ne peut\n` +
                `│    être rétrogradé.\n` +
                `│ 💾 *Paramètre sauvegardé*\n` +
                `│    (résiste au redémarrage)\n` +
                `│\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
            console.log(`🛡️ Anti-demote ON dans ${sender}`)

        } else if (action === 'off') {
            config[sender] = { enabled: false, updatedAt: new Date().toISOString() }
            saveConfig(config)
            await sendMessage(sock, sender,
                `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                `│  🛡️ *ANTI-DEMOTE* 🛡️  \n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `🕸️━━━〔 🕷️ 𝐃É𝐒𝐀𝐂𝐓𝐈𝐕É 〕━━━🕸️\n` +
                `│\n` +
                `│ 🔓 Anti-demote: *OFF*\n` +
                `│ 📌 Les administrateurs peuvent\n` +
                `│    être rétrogradés.\n` +
                `│ 💾 *Paramètre sauvegardé*\n` +
                `│\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
            console.log(`🛡️ Anti-demote OFF dans ${sender}`)

        } else {
            const isActive = isAntiDemoteActive(sender)
            const status = isActive ? "⚙️ *ACTIVÉ*" : "🤖 *DÉSACTIVÉ*"
            await sendMessage(sock, sender,
                `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                `│  🛡️ *ANTI-DEMOTE* 🛡️  \n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `🕸️━━━〔 👁️ 𝐒𝐓𝐀𝐓𝐔𝐓 〕━━━🕸️\n` +
                `│\n` +
                `│ 📊 Statut: ${status}\n` +
                `│ 💾 Persistant: ⚙️ Oui\n` +
                `│\n` +
                `│ 💡 *syntaxe:*\n` +
                `│ • *.antidemote on* — Activer\n` +
                `│ • *.antidemote off* — Désactiver\n` +
                `│\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
        }

    } catch (e) {
        console.error("❌ Erreur antidemote:", e)
        await sendMessage(sock, sender,
            `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
            `│ ${e.message || 'opération échoué inconnue'}\n\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        )
    }
}

// ─── PROTECTION PRINCIPALE (appelée depuis index.js) ──────────────────────────
export async function protectAdmin(sock, groupId, demoterId, demotedId) {
    try {
        if (!isAntiDemoteActive(groupId)) return false

        console.log(`🛡️ Tentative de demote: ${demoterId} → ${demotedId}`)

        // SuperAdmin/Deployer autorisé à démoter
        const { isSuperAdmin: checkSuperAdmin } = await import("../lib/ownerSystem.js")
        if (await checkSuperAdmin(demoterId)) {
            console.log(`✅ ${demoterId} est SuperAdmin, demote autorisé`)
            return false
        }

        const demoterName = demoterId.split('@')[0]
        const demotedName = demotedId.split('@')[0]

        // ── Rétablir l'administrateur ──
        try {
            await sock.groupParticipantsUpdate(groupId, [demotedId], "promote")
            console.log(`✅ administrateur ${demotedId} rétabli`)
        } catch (promoteErr) {
            console.error("❌ Erreur rétablissement:", promoteErr.message)
            try {
                await new Promise(r => setTimeout(r, 1000))
                await sock.groupParticipantsUpdate(groupId, [demotedId], "promote")
            } catch (e) {
                console.error("❌ Échec total rétablissement:", e.message)
                return false
            }
        }

        // ── Notifier le groupe ──
        await sock.sendMessage(groupId, {
            text:
                `🛡️ *PROTECTION ADMINISTRATEUR ⚙️ ÉVEILLÉE !*\n\n` +
                `⚠️ @${demoterName} a tenté de rétrograder @${demotedName}.\n\n` +
                `⛔ *ACTION BLOQUÉE ET ANNULÉE !*\n` +
                `👑 @${demotedName} a été rétabli comme administrateur.\n\n` +
                `💡 L'anti-demote protège *TOUS* les admins.`,
            mentions: [demoterId, demotedId]
        })

        // ── Avertir en privé ──
        try {
            await sock.sendMessage(demoterId, {
                text:
                    `⚠️ *AVERTISSEMENT ANTI-DEMOTE*\n\n` +
                    `Vous avez tenté de rétrograder un administrateur dans un groupe protégé.\n\n` +
                    `⛔ Cette action a été *bloquée*.\n` +
                    `🛡️ L'anti-demote est actif dans ce groupe.`
            })
        } catch (e) {}

        return true

    } catch (e) {
        console.error("❌ Erreur protectAdmin:", e)
        return false
    }
}

export async function blockPromote(sock, groupId, promoterId, promotedId) {
    // Fonction pour bloquer les promotions non autorisées (optionnel)
    return false
}

export async function protectAllAdmins(sock, groupId) {
    try {
        const groupMetadata = await sock.groupMetadata(groupId)
        const admins = groupMetadata.participants.filter(p => p.admin)
        console.log(`🛡️ ${admins.length} admins protégés dans ${groupId}`)
        return admins.length
    } catch (e) {
        return 0
    }
}
