// commands/antibot.js
// Supprime automatiquement les messages des comptes marqués comme
// "bots" dans le groupe — sauf si l'expéditeur est administrateur.
// L'application effective se fait dans lib/messageHandler.js.

import { sendMessage } from '../lib/sendMessage.js'
import { getGroupMeta } from '../lib/groupConfig.js'
import { matchJid, getSenderJid } from '../lib/ownerSystem.js'
import {
    isAntibotEnabled,
    setAntibotEnabled,
    addBot,
    removeBot,
    getBotList
} from '../lib/antiBotManager.js'

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

export default async function antibot(sock, sender, args, msg, ctx = {}) {
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

        const sub = (args[0] || '').toLowerCase()

        // ── AFFICHAGE STATUT + AIDE (pas d'argument) ──────────────
        if (!sub) {
            const enabled = isAntibotEnabled(sender)
            const bots    = getBotList(sender)

            let text =
                `🕸️━━━〔 🤖 ANTI-BOT 〕━━━🕸️\n` +
                `│\n` +
                `│  Statut : ${enabled ? '✅ Activé' : '❌ Désactivé'}\n` +
                `│  Bots marqués : ${bots.length}\n` +
                `│\n` +
                `│  💡 *Syntaxe :*\n` +
                `│  • .antibot on / off\n` +
                `│  • .antibot add @bot\n` +
                `│  • .antibot remove @bot\n` +
                `│  • .antibot list\n` +
                `│\n` +
                `│  ℹ️ Marque un compte comme "bot" pour\n` +
                `│  que ses messages soient supprimés\n` +
                `│  automatiquement — sauf s'il devient\n` +
                `│  administrateur du groupe.\n` +
                `│\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`

            return await sendMessage(sock, sender, text)
        }

        // ── ON / OFF ───────────────────────────────────────────────
        if (sub === 'on' || sub === 'off') {
            if (!isOwner && !isAdmin) {
                return await sendMessage(sock, sender,
                    `🕸️━━━〔 ⛔ ACCÈS REFUSÉ 〕━━━🕸️\n\n` +
                    `│ 🔒 Réservé aux *administrateurs*\n` +
                    `│    du groupe.\n\n` +
                    `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
                )
            }

            setAntibotEnabled(sender, sub === 'on')
            return await sendMessage(sock, sender,
                `🕸️━━━〔 🤖 ANTI-BOT 〕━━━🕸️\n\n` +
                `│ ${sub === 'on' ? '✅ Activé' : '❌ Désactivé'}\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
        }

        // ── LIST ───────────────────────────────────────────────────
        if (sub === 'list') {
            const bots = getBotList(sender)
            if (!bots.length) {
                return await sendMessage(sock, sender,
                    `🕸️━━━〔 🤖 ANTI-BOT 〕━━━🕸️\n\n` +
                    `│ Aucun bot marqué dans ce groupe.\n\n` +
                    `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
                )
            }
            return await sendMessage(sock, sender,
                `🕸️━━━〔 🤖 ANTI-BOT — LISTE 〕━━━🕸️\n\n` +
                bots.map(jid => `│ • @${jid.split('@')[0]}`).join('\n') +
                `\n\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`,
                { mentions: bots }
            )
        }

        // ── ADD / REMOVE ─────────────────────────────────────────────
        if (sub === 'add' || sub === 'remove') {
            if (!isOwner && !isAdmin) {
                return await sendMessage(sock, sender,
                    `🕸️━━━〔 ⛔ ACCÈS REFUSÉ 〕━━━🕸️\n\n` +
                    `│ 🔒 Réservé aux *administrateurs*\n` +
                    `│    du groupe.\n\n` +
                    `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
                )
            }

            const target = resolveTarget(msg, args.slice(1))
            if (!target) {
                return await sendMessage(sock, sender,
                    `🕸️━━━〔 🕷️ SYNTAXE 〕━━━🕸️\n\n` +
                    `│ • .antibot ${sub} @utilisateur\n` +
                    `│ • Répondre + .antibot ${sub}\n\n` +
                    `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
                )
            }

            if (sub === 'add') {
                addBot(sender, target)
                return await sendMessage(sock, sender,
                    `🕸️━━━〔 🤖 ANTI-BOT 〕━━━🕸️\n\n` +
                    `│ ✅ @${target.split('@')[0]} marqué comme bot.\n` +
                    `│ Ses messages seront supprimés tant\n` +
                    `│ qu'il n'est pas administrateur.\n\n` +
                    `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`,
                    { mentions: [target] }
                )
            } else {
                removeBot(sender, target)
                return await sendMessage(sock, sender,
                    `🕸️━━━〔 🤖 ANTI-BOT 〕━━━🕸️\n\n` +
                    `│ ✅ @${target.split('@')[0]} retiré de la liste.\n\n` +
                    `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`,
                    { mentions: [target] }
                )
            }
        }

        // ── SOUS-COMMANDE INCONNUE ───────────────────────────────────
        return await sendMessage(sock, sender,
            `🕸️━━━〔 🕷️ SYNTAXE 〕━━━🕸️\n\n` +
            `│ • .antibot on / off\n` +
            `│ • .antibot add @bot\n` +
            `│ • .antibot remove @bot\n` +
            `│ • .antibot list\n\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        )

    } catch (err) {
        console.error('❌ Erreur antibot:', err)
        await sendMessage(sock, sender,
            `🕸️━━━〔 🕷️ OPÉRATION ÉCHOUÉE 〕━━━🕸️\n\n` +
            `│ 📝 _${err.message || 'erreur inconnue'}_\n\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        )
    }
}
