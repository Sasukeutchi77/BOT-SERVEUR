// lib/antiMentionManager.js — VERSION CORRIGÉE v1
// ╔══════════════════════════════════════════════╗
// ║  GESTIONNAIRE ANTI-MENTION (@tous)           ║
// ╚══════════════════════════════════════════════╝

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

const ANTIMENTION_FILE = path.join(__dirname, '../data/antimention.json')

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

export function isAntiMentionEnabled(groupJid) {
    const data = readJson(ANTIMENTION_FILE, { groups: [] })
    return (data.groups || []).includes(groupJid)
}

export function setAntiMention(groupJid, enable) {
    const data   = readJson(ANTIMENTION_FILE, { groups: [] })
    const groups = data.groups || []
    if (enable && !groups.includes(groupJid)) groups.push(groupJid)
    else if (!enable) { const i = groups.indexOf(groupJid); if (i !== -1) groups.splice(i, 1) }
    return writeJson(ANTIMENTION_FILE, { groups })
}

/**
 * Détecter si un message mentionne @tous ou plusieurs membres en masse
 */
export function hasGroupMentions(msg) {
    const m = msg?.message || {}

    // Détecter le texte "@tous" ou "@all"
    const texts = [
        m.conversation || '',
        m.extendedTextMessage?.text || '',
        m.imageMessage?.caption || '',
        m.videoMessage?.caption || ''
    ]

    const fullText = texts.join(' ').toLowerCase()
    if (fullText.includes('@tous') || fullText.includes('@all') || fullText.includes('@everyone')) {
        return true
    }

    return false
}
