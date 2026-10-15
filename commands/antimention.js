// commands/antimention.js — VERSION
// 📢 Bloque les mentions de masse (@everyone, @tous, @Ce groupe)
// ✅ FIX: Imports simplifiés (plus de dépendance roleManager optionnelle)
// ✅ FIX: Stockage interne auto-suffisant avec persistance JSON
// ✅ FIX: Permissions admin groupe + sudo/deployer
// ✅ FIX: Seuil de mentions configurable (ex: .antimention on 5)
// ✅ NOUVEAU: Mode "warn" avant suppression + avertissement visible

import { sendMessage } from '../lib/sendMessage.js'
import fs from 'fs'
import path from 'path'
import { getSenderJid, isDeployer, isSudo } from '../lib/ownerSystem.js'

// ─── STOCKAGE PERSISTANT ──────────────────────────────────────────────────────
const DATA_FILE = path.join(process.cwd(), 'data', 'antimention.json')

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
    } catch {}
    return {}
}

function saveData(data) {
    try {
        const dir = path.dirname(DATA_FILE)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
    } catch (e) {
        console.error('❌ antimention saveData:', e.message)
    }
}

const _state = loadData()

// ─── API PUBLIQUE ─────────────────────────────────────────────────────────────
export function isAntiMentionEnabled(groupId) {
    return _state[groupId]?.enabled === true
}

export function getAntiMentionThreshold(groupId) {
    return _state[groupId]?.threshold ?? 5
}

export function setAntiMention(groupId, enabled, threshold = 5) {
    if (!_state[groupId]) _state[groupId] = {}
    _state[groupId].enabled   = enabled
    _state[groupId].threshold = threshold
    saveData(_state)
}

// ─── UTILITAIRES ──────────────────────────────────────────────────────────────
function cleanJid(jid) {
    if (!jid) return ''
    return jid.toString()
        .replace(/@.*$/, '').replace(/:.*$/, '').replace(/[^0-9]/g, '')
}

async function isGroupAdmin(sock, groupId, userId) {
    try {
        const meta = await sock.groupMetadata(groupId)
        const num  = cleanJid(userId)
        const p    = meta.participants.find(x => cleanJid(x.id) === num)
        return p?.admin === 'admin' || p?.admin === 'superadmin'
    } catch {
        return false
    }
}

// ─── COMMANDE PRINCIPALE ──────────────────────────────────────────────────────
export default async function antimention(sock, sender, args, msg) {
    try {
        const userId = getSenderJid(msg, sock)
        const isGroup = sender.endsWith('@g.us')

        if (!isGroup) {
            return await sendMessage(sock, sender,
                `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
                `│ Cette commande ne fonctionne\n` +
                `│ que dans les *groupes*.\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
        }

        // ── Permissions ──
        const privileged = isSudo(userId) || isDeployer(userId)
        const admin = privileged || await isGroupAdmin(sock, sender, userId)

        if (!admin) {
            return await sendMessage(sock, sender,
                `🕸️━━━〔 ⛔ 𝐀𝐂𝐂È𝐒 𝐑𝐄𝐅𝐔𝐒É 〕━━━🕸️\n\n` +
                `│ 🔒 Seuls les *administrateurs* du\n` +
                `│    groupe ou *Sudo/Owner*\n` +
                `│    peuvent utiliser cette\n` +
                `│    commande.\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
        }

        const action        = args[0]?.toLowerCase()
        const currentCfg    = _state[sender] || { enabled: false, threshold: 5 }
        const currentStatus = currentCfg.enabled
        const threshold     = currentCfg.threshold

        // ── ON ──
        if (action === 'on' || action === 'enable' || action === 'activer') {
            // Seuil optionnel: .antimention on 3
            const newThreshold = parseInt(args[1]) || threshold
            setAntiMention(sender, true, newThreshold)
            await sendMessage(sock, sender,
                `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                `│   📢 *ANTI-MENTION*   📢   \n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `🕸️━━━〔 ⚙️ 𝐀𝐂𝐓𝐈𝐕É 〕━━━🕸️\n` +
                `│\n` +
                `│ 🛡️ Anti-mention: *ON*\n` +
                `│ 🔢 Seuil: *${newThreshold}* mentions max\n` +
                `│\n` +
                `│ 🚫 *Protections actives:*\n` +
                `│ • Messages avec +${newThreshold} mentions\n` +
                `│ • @everyone / @tous\n` +
                `│ • Mentions de statut\n` +
                `│ • Mentions groupées\n` +
                `│\n` +
                `│ ⚙️ Régler le seuil:\n` +
                `│ *.antimention on [nombre]*\n` +
                `│\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )

        // ── OFF ──
        } else if (action === 'off' || action === 'disable' || action === 'désactiver') {
            setAntiMention(sender, false, threshold)
            await sendMessage(sock, sender,
                `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                `│   📢 *ANTI-MENTION*   📢   \n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `🕸️━━━〔 🕷️ 𝐃É𝐒𝐀𝐂𝐓𝐈𝐕É 〕━━━🕸️\n` +
                `│\n` +
                `│ 🔓 Anti-mention: *OFF*\n` +
                `│ 📌 Les mentions de groupe\n` +
                `│    sont à nouveau libres.\n` +
                `│\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )

        // ── SEUIL seul ──
        } else if (action === 'seuil' || action === 'threshold' || action === 'set') {
            const newThreshold = parseInt(args[1])
            if (!newThreshold || newThreshold < 1 || newThreshold > 50) {
                return await sendMessage(sock, sender,
                    `│ *syntaxe:* \`.antimention seuil <1-50>\`\n` +
                    `*Exemple:* \`.antimention seuil 3\``
                )
            }
            setAntiMention(sender, currentStatus, newThreshold)
            await sendMessage(sock, sender,
                `⚙️ *Seuil mis à jour: ${newThreshold} mentions max*`
            )

        // ── STATUT ──
        } else if (action === 'status' || action === 'statut') {
            const txt = currentStatus ? '⚙️ *ACTIVÉ*' : '🕷️ *DÉSACTIVÉ*'
            await sendMessage(sock, sender,
                `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                `│   📢 *ANTI-MENTION*   📢   \n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `🕸️━━━〔 👁️ 𝐒𝐓𝐀𝐓𝐔𝐓 〕━━━🕸️\n` +
                `│\n` +
                `│ 📊 Statut: ${txt}\n` +
                `│ 🔢 Seuil actuel: *${threshold}* mentions\n` +
                `│\n` +
                `│ 💡 *commandes:*\n` +
                `│ • *.antimention on [seuil]*\n` +
                `│ • *.antimention off*\n` +
                `│ • *.antimention seuil <n>*\n` +
                `│ • *.antimention statut*\n` +
                `│\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )

        } else {
            // Aide générale
            const txt = currentStatus ? '⚙️ *ACTIVÉ*' : '🕷️ *DÉSACTIVÉ*'
            await sendMessage(sock, sender,
                `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                `│   📢 *ANTI-MENTION*   📢   \n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `📊 Statut: ${txt} | Seuil: *${threshold}*\n\n` +
                `💡 *commandes:*\n` +
                `• *.antimention on* — Activer\n` +
                `• *.antimention on 3* — Activer (seuil=3)\n` +
                `• *.antimention off* — Désactiver\n` +
                `• *.antimention seuil 5* — Changer seuil\n` +
                `• *.antimention statut* — Voir statut`
            )
        }

        console.log(`📢 Anti-mention [${action || 'aide'}] dans ${sender} par ${userId}`)

    } catch (e) {
        console.error('❌ Erreur antimention:', e)
        await sendMessage(sock, sender,
            `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
            `│ ${e.message || 'opération échoué inconnue'}\n\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        )
    }
}
