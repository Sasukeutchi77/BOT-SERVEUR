// lib/antiTagManager.js — VERSION CORRIGÉE
// ╔══════════════════════════════════════════════╗
// ║  GESTIONNAIRE ANTI-TAG (mass mention)        ║
// ║  FIX: Ajout exports manquants                ║
// ║  - getAntiTagSettings, setAntiTagConfig      ║
// ╚══════════════════════════════════════════════╝

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { isDeployer, isSudo, matchJid } from './ownerSystem.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

const ANTITAG_FILE = path.join(__dirname, '../data/antitag.json')

const TAG_THRESHOLD_DEFAULT = 10  // Seuil par défaut (configurable)

function readJson(f, d) {
    try { if (fs.existsSync(f)) { const c = fs.readFileSync(f,'utf8').trim(); if(c) return JSON.parse(c) } } catch {}
    return d
}

function writeJson(f, data) {
    try {
        const dir = path.dirname(f)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(f, JSON.stringify(data, null, 2))
        return true
    } catch { return false }
}

// ════════════════════════════════════════════════════════════════
//  LECTURE / ECRITURE DES DONNÉES
// ════════════════════════════════════════════════════════════════

function readData() {
    return readJson(ANTITAG_FILE, { groups: {} })
}

function writeData(data) {
    return writeJson(ANTITAG_FILE, data)
}

// ════════════════════════════════════════════════════════════════
//  FONCTIONS PRINCIPALES
// ════════════════════════════════════════════════════════════════

export function isAntiTagEnabled(groupJid) {
    const data   = readData()
    const groups = data.groups || {}

    // Compatibilité ancien format (tableau)
    if (Array.isArray(groups)) return groups.includes(groupJid)

    return !!(groups[groupJid]?.active)
}

export function setAntiTag(groupJid, enable) {
    const data   = readData()
    let groups = data.groups || {}

    // Migration ancien format tableau → objet
    if (Array.isArray(groups)) {
        const newGroups = {}
        groups.forEach(g => { newGroups[g] = { active: true, seuil: TAG_THRESHOLD_DEFAULT, mode: 'delete' } })
        groups = newGroups
    }

    if (!groups[groupJid]) {
        groups[groupJid] = { active: false, seuil: TAG_THRESHOLD_DEFAULT, mode: 'delete' }
    }

    groups[groupJid].active = enable
    return writeData({ groups })
}

/**
 * Obtenir les paramètres anti-tag pour un groupe
 * @returns {{ active: boolean, seuil: number, mode: string }}
 */
export function getAntiTagSettings(groupJid) {
    const data   = readData()
    const groups = data.groups || {}

    // Ancien format (tableau)
    if (Array.isArray(groups)) {
        return {
            active : groups.includes(groupJid),
            seuil  : TAG_THRESHOLD_DEFAULT,
            mode   : 'delete'
        }
    }

    const group = groups[groupJid] || {}
    return {
        active : !!group.active,
        seuil  : group.seuil || TAG_THRESHOLD_DEFAULT,
        mode   : group.mode  || 'delete'
    }
}

/**
 * Mettre à jour la configuration anti-tag d'un groupe
 * @param {string} groupJid
 * @param {{ seuil?: number, mode?: string }} config
 */
export function setAntiTagConfig(groupJid, config = {}) {
    const data   = readData()
    let groups = data.groups || {}

    // Migration ancien format
    if (Array.isArray(groups)) {
        const newGroups = {}
        groups.forEach(g => { newGroups[g] = { active: true, seuil: TAG_THRESHOLD_DEFAULT, mode: 'delete' } })
        groups = newGroups
    }

    if (!groups[groupJid]) {
        groups[groupJid] = { active: false, seuil: TAG_THRESHOLD_DEFAULT, mode: 'delete' }
    }

    // Appliquer les changements
    if (config.seuil !== undefined) groups[groupJid].seuil = config.seuil
    if (config.mode  !== undefined) groups[groupJid].mode  = config.mode
    if (config.active !== undefined) groups[groupJid].active = config.active

    return writeData({ groups })
}

// ════════════════════════════════════════════════════════════════
//  DÉTECTION
// ════════════════════════════════════════════════════════════════

/**
 * Vérifier si un message contient un mass-tag
 */
export function isMassTag(msg, groupJid) {
    const m = msg?.message || {}
    const types = ['extendedTextMessage', 'imageMessage', 'videoMessage', 'documentMessage']

    let mentions = []

    for (const type of types) {
        const ctx = m[type]?.contextInfo
        if (ctx?.mentionedJid?.length) {
            mentions = ctx.mentionedJid
            break
        }
    }

    // Obtenir le seuil configuré pour ce groupe
    const threshold = groupJid
        ? (getAntiTagSettings(groupJid).seuil || TAG_THRESHOLD_DEFAULT)
        : TAG_THRESHOLD_DEFAULT

    return {
        isMassTag : mentions.length >= threshold,
        count     : mentions.length
    }
}

/**
 * Vérifier si un utilisateur est admin du groupe
 */
export async function isGroupAdmin(sock, groupJid, userJid) {
    try {
        const meta = await sock.groupMetadata(groupJid)
        const p    = meta.participants.find(p => matchJid(p.id, userJid))
        return p?.admin === 'admin' || p?.admin === 'superadmin'
    } catch { return false }
}

/**
 * Vérifier si l'utilisateur peut utiliser tagall/hidetag
 */
export async function checkAntiTag(sock, groupJid, senderJid) {
    if (!isAntiTagEnabled(groupJid)) return true
    if (isDeployer(senderJid) || isSudo(senderJid)) return true

    const isAdmin = await isGroupAdmin(sock, groupJid, senderJid)
    return isAdmin
}
