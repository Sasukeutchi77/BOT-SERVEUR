// commands/tgl.js
// Bascule rapide (toggle) du mute d'un membre : un compte "tgl" voit
// TOUS ses messages supprimés automatiquement, sans aucune exception
// (contrairement à .antibot qui épargne les admins). Réutilise le
// même système que .mute/.unmute (lib/muteManager.js) — l'application
// se fait déjà dans lib/messageHandler.js, rien à ajouter là-bas.

import { sendMessage } from '../lib/sendMessage.js'
import { isMuted, muteUser, unmuteUser } from '../lib/muteManager.js'
import { getGroupMeta } from '../lib/groupConfig.js'
import { matchJid, getSenderJid } from '../lib/ownerSystem.js'

async function isGroupAdmin(sock, groupId, userId) {
    const meta = await getGroupMeta(sock, groupId)
    return meta?.participants?.some(p => matchJid(p.id, userId) && p.admin) || false
}

function resolveTarget(msg, args) {
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    if (mentions?.length > 0) return mentions[0]

    const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant
    if (quotedParticipant) return quotedParticipant

    if (args[0]) {
        const num = args[0].replace(/[^0-9]/g, '')
        if (num.length >= 8) return num + '@s.whatsapp.net'
    }
    return null
}

export default async function tgl(sock, sender, args, msg, ctx = {}) {
    try {
        const isGroup = sender.endsWith('@g.us')

        if (!isGroup) {
            return await sendMessage(sock, sender,
                `🕸️━━━〔 🕷️ OPÉRATION ÉCHOUÉE 〕━━━🕸️\n\n` +
                `│ Commande *groupe* uniquement.\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
        }

        const userId  = ctx.senderJid || getSenderJid(msg, sock)
        const isOwner = ctx.isOwner || ctx.isSudo
        const isAdmin = ctx.isAdmin || await isGroupAdmin(sock, sender, userId)

        if (!isOwner && !isAdmin) {
            return await sendMessage(sock, sender,
                `🕸️━━━〔 ⛔ ACCÈS REFUSÉ 〕━━━🕸️\n\n` +
                `│ 🔒 Réservé aux *administrateurs*\n` +
                `│    du groupe.\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
        }

        const target = resolveTarget(msg, args)
        if (!target) {
            return await sendMessage(sock, sender,
                `🕸️━━━〔 🕷️ SYNTAXE 〕━━━🕸️\n\n` +
                `│ • .tgl @utilisateur\n` +
                `│ • Répondre + .tgl\n\n` +
                `│ ℹ️ Bascule le silence total d'un\n` +
                `│ membre : tous ses messages sont\n` +
                `│ supprimés automatiquement, sans\n` +
                `│ aucune exception, jusqu'au prochain\n` +
                `│ .tgl sur son compte.\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
        }

        if (isMuted(sender, target)) {
            unmuteUser(sender, target)
            return await sendMessage(sock, sender,
                `🕸️━━━〔 🔊 TGL 〕━━━🕸️\n\n` +
                `│ @${target.split('@')[0]} peut de nouveau\n` +
                `│ écrire normalement dans le groupe.\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`,
                { mentions: [target] }
            )
        } else {
            muteUser(sender, target)
            return await sendMessage(sock, sender,
                `🕸️━━━〔 🔇 TGL 〕━━━🕸️\n\n` +
                `│ @${target.split('@')[0]} est maintenant\n` +
                `│ réduit au silence : TOUS ses messages\n` +
                `│ (même les plus simples) seront\n` +
                `│ supprimés automatiquement, sans\n` +
                `│ exception.\n\n` +
                `│ 💡 .tgl @${target.split('@')[0]} à nouveau pour annuler.\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`,
                { mentions: [target] }
            )
        }

    } catch (err) {
        console.error('❌ Erreur tgl:', err)
        await sendMessage(sock, sender,
            `🕸️━━━〔 🕷️ OPÉRATION ÉCHOUÉE 〕━━━🕸️\n\n` +
            `│ 📝 _${err.message || 'erreur inconnue'}_\n\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        )
    }
}
