// lib/targetResolver.js — VERSION CORRIGÉE
// ╔══════════════════════════════════════════════╗
// ║  RÉSOLUTION DE CIBLE: mention / reply / num  ║
// ╚══════════════════════════════════════════════╝

/**
 * Résoudre la cible d'une commande depuis:
 *  1. Mention dans le message (contextInfo.mentionedJid)
 *  2. Réponse à un message (contextInfo.participant)
 *  3. Argument numérique direct (ex: 22601234567)
 *
 * @returns { targetId: string|null, targetNumber: string|null }
 */
export function resolveTarget(msg, args = []) {
    const m = msg?.message || {}

    const messageTypes = [
        'extendedTextMessage',
        'imageMessage',
        'videoMessage',
        'audioMessage',
        'documentMessage',
        'stickerMessage',
        'buttonsResponseMessage',
        'listResponseMessage',
        'templateButtonReplyMessage'
    ]

    // ── 1. Chercher dans les contextInfo de chaque type de message ──
    for (const type of messageTypes) {
        const ctx = m[type]?.contextInfo
        if (!ctx) continue

        // Mention directe
        if (ctx.mentionedJid?.length > 0) {
            const jid = ctx.mentionedJid[0]
            return {
                targetId    : jid,
                targetNumber: jid.split('@')[0].split(':')[0]
            }
        }

        // Réponse (quote)
        if (ctx.quotedMessage && ctx.participant) {
            const jid = ctx.participant
            return {
                targetId    : jid,
                targetNumber: jid.split('@')[0].split(':')[0]
            }
        }
    }

    // ── 2. Argument numérique ──────────────────────────────────────
    if (args?.length > 0) {
        // Peut être "@2260..." ou juste "2260..."
        const raw = args[0]?.toString() || ''
        const num = raw.replace(/[^0-9]/g, '')

        if (num.length >= 7) {
            const jid = num + '@s.whatsapp.net'
            return { targetId: jid, targetNumber: num }
        }
    }

    return { targetId: null, targetNumber: null }
}
