// lib/media.js — Utilitaires pour les médias WhatsApp
// ╔══════════════════════════════════════════════════════════════╗
// ║  GESTIONNAIRE MÉDIAS — download, viewonce, quoted            ║
// ║  Utilisé par: commands/url.js, commands/vv.js               ║
// ╚══════════════════════════════════════════════════════════════╝

import { downloadContentFromMessage, getContentType } from '@whiskeysockets/baileys'

// ─────────────────────────────────────────────────────────────────
//  Types de médias supportés
// ─────────────────────────────────────────────────────────────────
const MEDIA_TYPES = new Set([
    'imageMessage',
    'videoMessage',
    'audioMessage',
    'documentMessage',
    'stickerMessage',
    'ptvMessage'
])

// Mapping type → kind simple
const KIND_MAP = {
    imageMessage   : 'image',
    videoMessage   : 'video',
    audioMessage   : 'audio',
    documentMessage: 'document',
    stickerMessage : 'sticker',
    ptvMessage     : 'video'
}

// ─────────────────────────────────────────────────────────────────
//  getQuotedMessage — Extraire le message cité
// ─────────────────────────────────────────────────────────────────

/**
 * Récupère le message cité (quoted) dans un message WhatsApp
 * @param {object} msg - Message WhatsApp complet
 * @returns {object|null} Message cité ou null
 */
export function getQuotedMessage(msg) {
    if (!msg?.message) return null

    const m = msg.message

    // Cas 1: extendedTextMessage avec contextInfo
    const ctx1 = m.extendedTextMessage?.contextInfo
    if (ctx1?.quotedMessage) {
        return {
            key    : {
                id         : ctx1.stanzaId,
                remoteJid  : ctx1.participant || msg.key.remoteJid,
                participant: ctx1.participant,
                fromMe     : false
            },
            message: ctx1.quotedMessage
        }
    }

    // Cas 2: imageMessage avec contextInfo
    const ctx2 = m.imageMessage?.contextInfo
    if (ctx2?.quotedMessage) {
        return {
            key    : {
                id         : ctx2.stanzaId,
                remoteJid  : ctx2.participant || msg.key.remoteJid,
                participant: ctx2.participant,
                fromMe     : false
            },
            message: ctx2.quotedMessage
        }
    }

    // Cas 3: videoMessage avec contextInfo
    const ctx3 = m.videoMessage?.contextInfo
    if (ctx3?.quotedMessage) {
        return {
            key    : {
                id         : ctx3.stanzaId,
                remoteJid  : ctx3.participant || msg.key.remoteJid,
                participant: ctx3.participant,
                fromMe     : false
            },
            message: ctx3.quotedMessage
        }
    }

    // Cas 4: audioMessage avec contextInfo
    const ctx4 = m.audioMessage?.contextInfo
    if (ctx4?.quotedMessage) {
        return {
            key    : {
                id         : ctx4.stanzaId,
                remoteJid  : ctx4.participant || msg.key.remoteJid,
                participant: ctx4.participant,
                fromMe     : false
            },
            message: ctx4.quotedMessage
        }
    }

    // Cas 5: documentMessage avec contextInfo
    const ctx5 = m.documentMessage?.contextInfo
    if (ctx5?.quotedMessage) {
        return {
            key    : {
                id         : ctx5.stanzaId,
                remoteJid  : ctx5.participant || msg.key.remoteJid,
                participant: ctx5.participant,
                fromMe     : false
            },
            message: ctx5.quotedMessage
        }
    }

    return null
}

// ─────────────────────────────────────────────────────────────────
//  isViewOnceMessageObject — Détecter view-once
// ─────────────────────────────────────────────────────────────────

/**
 * Vérifie si un objet message est un message "voir une seule fois"
 * @param {object} message - Objet message (pas msg complet)
 * @returns {boolean}
 */
export function isViewOnceMessageObject(message) {
    if (!message) return false

    // viewOnceMessage wrapper
    if (message.viewOnceMessage) return true
    if (message.viewOnceMessageV2) return true
    if (message.viewOnceMessageV2Extension) return true

    // Vérifier le flag viewOnce dans les types média
    if (message.imageMessage?.viewOnce) return true
    if (message.videoMessage?.viewOnce) return true

    return false
}

// ─────────────────────────────────────────────────────────────────
//  unwrapViewOnce — Déballer un message view-once
// ─────────────────────────────────────────────────────────────────

/**
 * Débarrasse le wrapper viewOnce pour accéder au message réel
 * @param {object} message - Message potentiellement wrappé
 * @returns {object} Message déballé
 */
export function unwrapViewOnce(message) {
    if (!message) return message

    if (message.viewOnceMessage?.message)
        return message.viewOnceMessage.message

    if (message.viewOnceMessageV2?.message)
        return message.viewOnceMessageV2.message

    if (message.viewOnceMessageV2Extension?.message)
        return message.viewOnceMessageV2Extension.message

    return message
}

// ─────────────────────────────────────────────────────────────────
//  downloadQuotedMediaBuffer — Télécharger le média du message cité
// ─────────────────────────────────────────────────────────────────

/**
 * Télécharge le buffer du média cité dans un message
 * @param {object} sock - Socket WhatsApp Baileys
 * @param {object} msg  - Message complet
 * @returns {Promise<{ok: boolean, kind: string, buffer: Buffer, rawQuoted: object, unwrapped: object, error?: string}>}
 */
export async function downloadQuotedMediaBuffer(sock, msg) {    try {
        const m = msg?.message
        if (!m) return { ok: false, error: 'Message invalide' }

        // Chercher le contextInfo dans tous les types possibles
        const ctxInfo =
            m.extendedTextMessage?.contextInfo ||
            m.imageMessage?.contextInfo        ||
            m.videoMessage?.contextInfo        ||
            m.audioMessage?.contextInfo        ||
            m.documentMessage?.contextInfo     ||
            null

        if (!ctxInfo?.quotedMessage) {
            return { ok: false, error: 'Aucun message cité trouvé' }
        }

        const rawQuoted = ctxInfo.quotedMessage

        // Déballer view-once si nécessaire
        const unwrapped = isViewOnceMessageObject(rawQuoted)
            ? unwrapViewOnce(rawQuoted)
            : rawQuoted

        // Trouver le type de contenu
        const contentType = getContentType(unwrapped)

        if (!contentType || !MEDIA_TYPES.has(contentType)) {
            return {
                ok   : false,
                error: `Type non supporté: ${contentType || 'inconnu'}`
            }
        }

        const kind = KIND_MAP[contentType] || contentType.replace('Message', '')

        // Télécharger le contenu
        const mediaObj    = unwrapped[contentType]
        const mediaStream = await downloadContentFromMessage(mediaObj, kind)

        // Lire le stream en buffer
        const chunks = []
        for await (const chunk of mediaStream) {
            chunks.push(chunk)
        }

        const buffer = Buffer.concat(chunks)

        if (!buffer || buffer.length === 0) {
            return { ok: false, error: 'Buffer vide — média expiré ou inaccessible' }
        }

        return {
            ok        : true,
            kind,
            buffer,
            rawQuoted,
            unwrapped
        }

    } catch (e) {
        console.error('❌ downloadQuotedMediaBuffer erreur:', e.message)
        return { ok: false, error: e.message || 'Erreur inconnue' }
    }
}

// ─────────────────────────────────────────────────────────────────
//  getImageInput — Récupère une image (directe OU en réponse/quote)
//  Utilisé par: commands/jarvis.js (analyse d'image multi-IA)
// ─────────────────────────────────────────────────────────────────

/**
 * Cherche une image utilisable pour l'analyse : soit directement sur le
 * message reçu (photo envoyée avec légende), soit dans le message cité
 * (réponse à une image déjà présente dans la conversation).
 * @param {object} sock - Socket Baileys
 * @param {object} msg - Message WhatsApp complet
 * @returns {Promise<{ok:boolean, buffer?:Buffer, mimetype?:string}>}
 */
export async function getImageInput(sock, msg) {
    try {
        // 1) Image directement sur ce message
        const direct = msg?.message?.imageMessage
        if (direct) {
            const stream = await downloadContentFromMessage(direct, 'image')
            const chunks = []
            for await (const chunk of stream) chunks.push(chunk)
            const buffer = Buffer.concat(chunks)
            if (buffer.length) {
                return { ok: true, buffer, mimetype: direct.mimetype || 'image/jpeg' }
            }
        }

        // 2) Image dans le message cité (réponse à une image)
        const quoted = await downloadQuotedMediaBuffer(sock, msg)
        if (quoted.ok && quoted.kind === 'image') {
            const mimetype = quoted.unwrapped?.imageMessage?.mimetype || 'image/jpeg'
            return { ok: true, buffer: quoted.buffer, mimetype }
        }

        return { ok: false }
    } catch (e) {
        console.error('❌ getImageInput erreur:', e.message)
        return { ok: false }
    }
}

export default {
    getQuotedMessage,
    isViewOnceMessageObject,
    unwrapViewOnce,
    downloadQuotedMediaBuffer,
    getImageInput
}
