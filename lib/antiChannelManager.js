// lib/antiChannelManager.js
// ╔══════════════════════════════════════════════╗
// ║  GESTIONNAIRE ANTI-CHAÎNE (NEWSLETTER)       ║
// ║  Détecte les messages transférés depuis      ║
// ║  une chaîne WhatsApp (forwardedNewsletter)   ║
// ╚══════════════════════════════════════════════╝

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { isDeployer, isSudo, matchJid } from './ownerSystem.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

const ANTICHANNEL_FILE = path.join(__dirname, '../data/antichannel.json')

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
//  ÉTAT (activé / désactivé par groupe)
// ════════════════════════════════════════════════════════════════

export function isAntiChannelEnabled(groupJid) {
    const data   = readJson(ANTICHANNEL_FILE, { groups: {} })
    const groups = data.groups || {}
    return !!(groups[groupJid]?.active)
}

export function enableAntiChannel(groupJid, options = {}) {
    const data   = readJson(ANTICHANNEL_FILE, { groups: {} })
    const groups = data.groups || {}

    groups[groupJid] = {
        active        : true,
        deleteMessage : options.deleteMessage !== false,
        warnUser      : options.warnUser !== false,
        allowAdmin    : options.allowAdmin !== false,
        stats         : groups[groupJid]?.stats || { deleted: 0, warned: 0 }
    }

    return writeJson(ANTICHANNEL_FILE, { groups })
}

export function disableAntiChannel(groupJid) {
    const data   = readJson(ANTICHANNEL_FILE, { groups: {} })
    const groups = data.groups || {}
    if (groups[groupJid]) groups[groupJid].active = false
    return writeJson(ANTICHANNEL_FILE, { groups })
}

export function getStats(groupJid) {
    const data   = readJson(ANTICHANNEL_FILE, { groups: {} })
    const group  = (data.groups || {})[groupJid] || {}
    return {
        active  : !!group.active,
        deleted : group.stats?.deleted || 0,
        warned  : group.stats?.warned  || 0
    }
}

// ════════════════════════════════════════════════════════════════
//  DÉTECTION D'UN MESSAGE DE CHAÎNE
// ════════════════════════════════════════════════════════════════

/**
 * Récupère le contextInfo de n'importe quel sous-type de message.
 */
function extractContextInfo(message) {
    if (!message) return null
    const types = [
        'extendedTextMessage',
        'imageMessage',
        'videoMessage',
        'audioMessage',
        'documentMessage',
        'stickerMessage',
        'contactMessage',
        'locationMessage',
        'productMessage',
        'templateMessage',
        'interactiveMessage',
        'buttonsMessage',
        'listMessage'
    ]
    for (const t of types) {
        if (message[t]?.contextInfo) return message[t].contextInfo
    }
    return null
}

/**
 * Vérifie si un message provient (ou a été transféré depuis) une chaîne WhatsApp.
 * Couvre :
 *  - forwardedNewsletterMessageInfo  (transfert depuis chaîne)
 *  - externalAdReply avec sourceUrl whatsapp.com/channel
 *  - JID se terminant par @newsletter dans le contexte
 *  - forwardingScore élevé + lien "whatsapp.com/channel"
 */
export function isChannelMessage(msg) {
    if (!msg?.message) return false
    const m   = msg.message
    const ctx = extractContextInfo(m)

    // 1) Transfert direct depuis une chaîne (cas principal du screenshot)
    if (ctx?.forwardedNewsletterMessageInfo) return true

    // 2) ExternalAdReply qui pointe vers une chaîne
    const adReply = ctx?.externalAdReply
    if (adReply?.sourceUrl && /whatsapp\.com\/channel\//i.test(adReply.sourceUrl)) return true

    // 3) JID newsletter dans le contexte
    if (ctx?.remoteJid?.endsWith?.('@newsletter')) return true
    if (ctx?.participant?.endsWith?.('@newsletter')) return true

    // 4) Texte qui contient un lien d'invitation de chaîne
    const text = (
        m.conversation ||
        m.extendedTextMessage?.text ||
        m.imageMessage?.caption ||
        m.videoMessage?.caption ||
        m.documentMessage?.caption ||
        ''
    )
    if (/https?:\/\/(whatsapp|wa)\.(com|me)\/channel\//i.test(text)) return true

    return false
}

// ════════════════════════════════════════════════════════════════
//  ACTION : SUPPRESSION
// ════════════════════════════════════════════════════════════════

/**
 * Vérifier et supprimer un message de chaîne.
 * @returns {boolean} true si bloqué.
 */
export async function checkAntiChannel(sock, groupJid, senderJid, msg) {
    if (!isAntiChannelEnabled(groupJid)) return false
    if (isDeployer(senderJid) || isSudo(senderJid)) return false

    // Admins exemptés
    try {
        const meta = await sock.groupMetadata(groupJid)
        const p    = meta.participants.find(p => matchJid(p.id, senderJid))
        if (p?.admin === 'admin' || p?.admin === 'superadmin') return false
    } catch {}

    if (!isChannelMessage(msg)) return false

    try {
        await sock.sendMessage(groupJid, { delete: msg.key })
        const data = readJson(ANTICHANNEL_FILE, { groups: {} })
        if (data.groups?.[groupJid]) {
            if (!data.groups[groupJid].stats) data.groups[groupJid].stats = { deleted: 0, warned: 0 }
            data.groups[groupJid].stats.deleted++
            writeJson(ANTICHANNEL_FILE, data)
        }
        return true
    } catch (err) {
        console.error('❌ antichannel delete erreur:', err.message)
        return false
    }
}
