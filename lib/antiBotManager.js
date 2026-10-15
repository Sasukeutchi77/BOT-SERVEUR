// ╔══════════════════════════════════════════════════════╗
// ║  ANTI-BOT MANAGER — J.A.R.V.I.S.                     ║
// ║  Supprime automatiquement les messages des comptes   ║
// ║  marqués comme "bots" dans un groupe — sauf si        ║
// ║  l'expéditeur est administrateur du groupe.          ║
// ╚══════════════════════════════════════════════════════╝

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

const DATA_FILE = path.join(__dirname, '../data/antibot.json')

let db = {} // { [groupId]: { enabled: boolean, bots: string[] } }

function ensureDir() {
    const dir = path.dirname(DATA_FILE)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function load() {
    try {
        ensureDir()
        if (fs.existsSync(DATA_FILE)) {
            const raw = fs.readFileSync(DATA_FILE, 'utf8')
            if (raw.trim()) db = JSON.parse(raw)
        } else {
            save()
        }
    } catch (err) {
        console.error('[antiBotManager] Load error:', err.message)
        db = {}
    }
}

function save() {
    try {
        ensureDir()
        fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2))
    } catch (err) {
        console.error('[antiBotManager] Save error:', err.message)
    }
}

function ensureGroup(groupId) {
    if (!db[groupId]) db[groupId] = { enabled: false, bots: [] }
    return db[groupId]
}

load()

/** Le anti-bot est-il activé dans ce groupe ? */
export function isAntibotEnabled(groupId) {
    return Boolean(db[groupId]?.enabled)
}

/** Active/désactive le anti-bot pour un groupe. */
export function setAntibotEnabled(groupId, enabled) {
    ensureGroup(groupId).enabled = enabled
    save()
}

/**
 * Un message de cet utilisateur doit-il être supprimé ?
 * (anti-bot activé + utilisateur marqué comme bot dans ce groupe)
 * L'appelant doit vérifier séparément que l'expéditeur n'est pas admin.
 */
export function isFlaggedBot(groupId, userId) {
    if (!isAntibotEnabled(groupId)) return false
    return Boolean(db[groupId]?.bots?.includes(userId))
}

/** Marque un utilisateur comme "bot" dans ce groupe. */
export function addBot(groupId, userId) {
    const g = ensureGroup(groupId)
    if (!g.bots.includes(userId)) {
        g.bots.push(userId)
        save()
    }
}

/** Retire le marquage "bot" d'un utilisateur dans ce groupe. */
export function removeBot(groupId, userId) {
    const g = ensureGroup(groupId)
    g.bots = g.bots.filter(id => id !== userId)
    save()
}

/** Liste des JID marqués comme bots dans ce groupe. */
export function getBotList(groupId) {
    return db[groupId]?.bots || []
}
