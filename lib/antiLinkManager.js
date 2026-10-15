// lib/antiLinkManager.js
// ╔══════════════════════════════════════════════╗
// ║  GESTIONNAIRE ANTI-LIEN                      ║
// ║  FIX: Ajout exports manquants                ║
// ║  - enableAntiLink, disableAntiLink           ║
// ║  - toggleAntiLink, getStats                  ║
// ╚══════════════════════════════════════════════╝

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { isDeployer, isSudo, matchJid } from './ownerSystem.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

const ANTILINK_FILE = path.join(__dirname, '../data/antilink.json')

const URL_REGEX = /https?:\/\/[^\s]+|www\.[^\s]+|chat\.whatsapp\.com\/[a-zA-Z0-9_-]+/gi

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
//  FONCTIONS PRINCIPALES
// ════════════════════════════════════════════════════════════════

export function isAntiLinkEnabled(groupJid) {
    const data = readJson(ANTILINK_FILE, { groups: {} })
    const groups = data.groups || {}
    // Support ancien format (tableau) et nouveau format (objet)
    if (Array.isArray(groups)) return groups.includes(groupJid)
    return !!(groups[groupJid]?.active)
}

export function setAntiLink(groupJid, enable) {
    const data   = readJson(ANTILINK_FILE, { groups: {} })
    let groups = data.groups || {}

    // Migration ancien format tableau → objet
    if (Array.isArray(groups)) {
        const newGroups = {}
        groups.forEach(g => { newGroups[g] = { active: true } })
        groups = newGroups
    }

    if (enable) {
        groups[groupJid] = { ...(groups[groupJid] || {}), active: true }
    } else {
        if (groups[groupJid]) groups[groupJid].active = false
    }

    return writeJson(ANTILINK_FILE, { groups })
}

/**
 * Activer l'anti-link avec options
 * @param {string} groupJid
 * @param {{ deleteMessage?: boolean, warnUser?: boolean, allowAdmin?: boolean }} options
 */
export function enableAntiLink(groupJid, options = {}) {
    const data   = readJson(ANTILINK_FILE, { groups: {} })
    let groups = data.groups || {}

    // Migration ancien format
    if (Array.isArray(groups)) {
        const newGroups = {}
        groups.forEach(g => { newGroups[g] = { active: true } })
        groups = newGroups
    }

    groups[groupJid] = {
        active        : true,
        deleteMessage : options.deleteMessage !== false,
        warnUser      : options.warnUser !== false,
        allowAdmin    : options.allowAdmin !== false,
        stats         : groups[groupJid]?.stats || { deleted: 0, warned: 0 }
    }

    return writeJson(ANTILINK_FILE, { groups })
}

/**
 * Désactiver l'anti-link
 */
export function disableAntiLink(groupJid) {
    const data   = readJson(ANTILINK_FILE, { groups: {} })
    let groups = data.groups || {}

    if (Array.isArray(groups)) {
        const newGroups = {}
        groups.forEach(g => { newGroups[g] = { active: true } })
        groups = newGroups
    }

    if (groups[groupJid]) {
        groups[groupJid].active = false
    }

    return writeJson(ANTILINK_FILE, { groups })
}

/**
 * Basculer l'anti-link (activer/désactiver)
 */
export function toggleAntiLink(groupJid) {
    const current = isAntiLinkEnabled(groupJid)
    if (current) {
        disableAntiLink(groupJid)
        return false
    } else {
        enableAntiLink(groupJid)
        return true
    }
}

/**
 * Obtenir les statistiques anti-link pour un groupe
 */
export function getStats(groupJid) {
    const data   = readJson(ANTILINK_FILE, { groups: {} })
    let groups = data.groups || {}

    if (Array.isArray(groups)) {
        return { deleted: 0, warned: 0, active: groups.includes(groupJid) }
    }

    const group = groups[groupJid] || {}
    return {
        active  : !!group.active,
        deleted : group.stats?.deleted || 0,
        warned  : group.stats?.warned  || 0
    }
}

// ════════════════════════════════════════════════════════════════
//  DETECTION & ACTION
// ════════════════════════════════════════════════════════════════

function containsLink(text) {
    if (!text) return false
    // Reset lastIndex pour éviter les faux négatifs avec les regex globales
    URL_REGEX.lastIndex = 0
    return URL_REGEX.test(text)
}

function extractText(msg) {
    const m = msg?.message || {}
    return (
        m.conversation ||
        m.extendedTextMessage?.text ||
        m.imageMessage?.caption ||
        m.videoMessage?.caption ||
        m.documentMessage?.caption ||
        ''
    )
}

/**
 * Vérifier et supprimer un message contenant un lien
 * @returns {boolean} true si supprimé
 */
export async function checkAntiLink(sock, groupJid, senderJid, msg) {
    if (!isAntiLinkEnabled(groupJid)) return false
    if (isDeployer(senderJid) || isSudo(senderJid)) return false

    // Vérifier si l'expéditeur est admin du groupe
    try {
        const meta = await sock.groupMetadata(groupJid)
        const p    = meta.participants.find(p => matchJid(p.id, senderJid))
        if (p?.admin === 'admin' || p?.admin === 'superadmin') return false
    } catch {}

    const text = extractText(msg)
    if (!containsLink(text)) return false

    try {
        await sock.sendMessage(groupJid, { delete: msg.key })
        // Mettre à jour les stats
        const data = readJson(ANTILINK_FILE, { groups: {} })
        if (!Array.isArray(data.groups) && data.groups[groupJid]) {
            if (!data.groups[groupJid].stats) data.groups[groupJid].stats = { deleted: 0, warned: 0 }
            data.groups[groupJid].stats.deleted++
            writeJson(ANTILINK_FILE, data)
        }
        return true
    } catch (err) {
        console.error('❌ antilink delete erreur:', err.message)
        return false
    }
}
