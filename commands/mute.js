// commands/mute.js
// Coupe la parole à un membre du groupe : ses messages sont
// automatiquement supprimés par le bot (nécessite que le bot
// soit admin). Voir lib/messageHandler.js pour l'application.

import { sendMessage } from '../lib/sendMessage.js'
import { isMuted, muteUser, unmuteUser } from '../lib/muteManager.js'
import { formatTime } from '../lib/animLoader.js'
import { getSenderJid, isSuperAdmin } from '../lib/ownerSystem.js'

export default async function mute(sock, sender, args, msg) {
    try {
        const userId  = getSenderJid(msg, sock)
        const isGroup = sender.endsWith('@g.us')

        if (!isGroup) {
            await sendMessage(sock, sender,
                `🕸️━━━〔 🕷️ OPÉRATION ÉCHOUÉE 〕━━━🕸️\n\n` +
                `│ commande *groupe* uniquement.\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
            return
        }

        if (!isSuperAdmin(userId)) {
            await sendMessage(sock, sender,
                `🕸️━━━〔 ⛔ ACCÈS REFUSÉ 〕━━━🕸️\n\n` +
                `│ 🔒 Requis: *SuperAdmin* du Système\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
            return
        }

        let targetId = null
        const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
        if (mentions?.length > 0) {
            targetId = mentions[0]
        } else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            targetId = msg.message.extendedTextMessage.contextInfo.participant
        } else if (args[0]) {
            const num = args[0].replace(/[^0-9]/g, '')
            if (num.length >= 8) targetId = num + '@s.whatsapp.net'
        }

        if (!targetId) {
            await sendMessage(sock, sender,
                `🕸️━━━〔 🕷️ SYNTAXE 〕━━━🕸️\n\n` +
                `│ • *.mute @utilisateur*\n` +
                `│ • Répondre + *.mute*\n\n` +
                `│ 💡 Les messages de la personne mutée\n` +
                `│    seront supprimés automatiquement\n` +
                `│    (le bot doit être admin).\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
            return
        }

        if (isMuted(sender, targetId)) {
            await sendMessage(sock, sender,
                `🕸️━━━〔 👁️ DÉJÀ MUTÉ 〕━━━🕸️\n\n` +
                `│ @${targetId.split('@')[0]} est déjà\n` +
                `│ muté actuellement.\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`,
                { mentions: [targetId] }
            )
            return
        }

        muteUser(sender, targetId)

        await sendMessage(sock, sender,
            `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
            `│  🔇 *MUTE* 🔇  \n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
            `🕸️━━━〔 ⚙️ ACTIVÉ 〕━━━🕸️\n` +
            `│\n` +
            `│ 👤 Utilisateur: @${targetId.split('@')[0]}\n` +
            `│ 🔇 Statut: *Messages supprimés auto*\n` +
            `│ 🕐 Heure: ${formatTime()}\n` +
            `│ 👮 Par: @${userId.split('@')[0]}\n` +
            `│\n` +
            `│ 💡 .unmute @${targetId.split('@')[0]} pour réactiver\n` +
            `│\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`,
            { mentions: [targetId, userId] }
        )

    } catch (err) {
        console.error('❌ Erreur mute:', err)
        await sendMessage(sock, sender,
            `🕸️━━━〔 🕷️ OPÉRATION ÉCHOUÉE 〕━━━🕸️\n\n` +
            `│ 📝 _${err.message || 'opération échoué inconnue'}_\n\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        )
    }
}

// Ré-exports pour compatibilité avec unmute.js (import { isMuted, unmuteUser } from './mute.js')
export { isMuted, unmuteUser }
