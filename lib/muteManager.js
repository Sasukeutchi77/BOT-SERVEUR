// ╔══════════════════════════════════════════════════════╗
// ║  MUTE MANAGER — J.A.R.V.I.S.                         ║
// ║  Gère la liste des utilisateurs mutés par groupe.    ║
// ║  Un utilisateur muté voit ses messages supprimés      ║
// ║  automatiquement par le bot (nécessite bot admin).   ║
// ╚══════════════════════════════════════════════════════╝

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

const MUTE_FILE = path.join(__dirname, '../data/mutes.json')

let muteDb = {}

function ensureDir() {
    const dir = path.dirname(MUTE_FILE)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function load() {
    try {
        ensureDir()
        if (fs.existsSync(MUTE_FILE)) {
            const raw = fs.readFileSync(MUTE_FILE, 'utf8')
            if (raw.trim()) muteDb = JSON.parse(raw)
        } else {
            save()
        }
    } catch (err) {
        console.error('[muteManager] Load error:', err.message)
        muteDb = {}
    }
}

function save() {
    try {
        ensureDir()
        fs.writeFileSync(MUTE_FILE, JSON.stringify(muteDb, null, 2))
    } catch (err) {
        console.error('[muteManager] Save error:', err.message)
    }
}

load()

/**
 * Vérifie si un utilisateur est muté dans un groupe donné.
 * @param {string} groupId
 * @param {string} userId
 * @returns {boolean}
 */
export function isMuted(groupId, userId) {
    return Boolean(muteDb[groupId]?.includes(userId))
}

/**
 * Mute un utilisateur dans un groupe.
 * @param {string} groupId
 * @param {string} userId
 */
export function muteUser(groupId, userId) {
    if (!muteDb[groupId]) muteDb[groupId] = []
    if (!muteDb[groupId].includes(userId)) {
        muteDb[groupId].push(userId)
        save()
    }
}

/**
 * Retire le mute d'un utilisateur dans un groupe.
 * @param {string} groupId
 * @param {string} userId
 */
export function unmuteUser(groupId, userId) {
    if (!muteDb[groupId]) return
    muteDb[groupId] = muteDb[groupId].filter(id => id !== userId)
    save()
}

/**
 * Liste des utilisateurs mutés dans un groupe.
 * @param {string} groupId
 * @returns {string[]}
 */
export function getMutedList(groupId) {
    return muteDb[groupId] || []
}
