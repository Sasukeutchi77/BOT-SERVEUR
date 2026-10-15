// commands/unmute.js — VERSION AMÉLIORÉE
import { sendMessage } from '../lib/sendMessage.js'
import { isMuted, unmuteUser } from './mute.js'
import { formatTime } from '../lib/animLoader.js'
import { getSenderJid, isSuperAdmin } from '../lib/ownerSystem.js'

export default async function unmute(sock, sender, args, msg) {
    try {
        const userId = getSenderJid(msg, sock)
        const isGroup = sender.endsWith('@g.us')

        if (!isGroup) {
            await sendMessage(sock, sender,
                `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
                `│ commande *groupe* uniquement.\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
            return
        }

        if (!isSuperAdmin(userId)) {
            await sendMessage(sock, sender,
                `🕸️━━━〔 ⛔ 𝐀𝐂𝐂È𝐒 𝐑𝐄𝐅𝐔𝐒É 〕━━━🕸️\n\n` +
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
                `🕸️━━━〔 🕷️ 𝐒𝐘𝐍𝐓𝐀𝐗𝐄 〕━━━🕸️\n\n` +
                `│ • *.unmute @utilisateur*\n` +
                `│ • Répondre + *.unmute*\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
            return
        }

        if (!isMuted(sender, targetId)) {
            await sendMessage(sock, sender,
                `🕸️━━━〔 👁️ 𝐏𝐀𝐒 𝐌𝐔𝐓É 〕━━━🕸️\n\n` +
                `│ @${targetId.split('@')[0]} n'est pas\n` +
                `│ muté actuellement.\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`,
                { mentions: [targetId] }
            )
            return
        }

        unmuteUser(sender, targetId)

        await sendMessage(sock, sender,
            `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
            `│  🔊 *UNMUTE* 🔊  \n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
            `🕸️━━━〔 ⚙️ 𝐑É𝐀𝐂𝐓𝐈𝐕É 〕━━━🕸️\n` +
            `│\n` +
            `│ 👤 utilisateur: @${targetId.split('@')[0]}\n` +
            `│ 🔊 Statut: *Peut parler*\n` +
            `│ 🕐 Heure: ${formatTime()}\n` +
            `│ 👮 Par: @${userId.split('@')[0]}\n` +
            `│\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`,
            { mentions: [targetId, userId] }
        )

    } catch (err) {
        console.error('❌ Erreur unmute:', err)
        await sendMessage(sock, sender,
            `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
            `│ 📝 _${err.message || 'opération échoué inconnue'}_\n\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        )
    }
}
