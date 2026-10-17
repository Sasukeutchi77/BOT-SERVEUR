// commands/pp.js — Photo de profil d'un membre 👤
import { sendMessage } from '../lib/sendMessage.js'

export default async function pp(sock, sender, args, msg) {
    try {
        let targetJid = null

        // Mention ?
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
        if (mentioned && mentioned.length > 0) {
            targetJid = mentioned[0]
        }
        // Réponse ?
        else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
            targetJid = msg.message.extendedTextMessage.contextInfo.participant
        }
        // Numéro en argument ?
        else if (args[0]) {
            const num = args[0].replace(/[^0-9]/g, '')
            if (num.length >= 8) targetJid = num + '@s.whatsapp.net'
        }
        // Propre PP
        else {
            targetJid = msg.key.participant || msg.key.remoteJid
        }

        const ppUrl = await sock.profilePictureUrl(targetJid, 'image').catch(() => null)
        const num = targetJid.split('@')[0]

        if (!ppUrl) {
            return await sendMessage(sock, sender,
                `🕸️━━━〔 👤 𝐏𝐇𝐎𝐓𝐎 𝐃𝐄 𝐏𝐑𝐎𝐅𝐈𝐋 〕━━━🕸️\n` +
                `│  😔 Aucune photo de profil\n` +
                `│  pour @${num}\n` +
                `│  (Compte privé ou photo cachée)\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
        }

        const res = await fetch(ppUrl, { signal: AbortSignal.timeout(15000) })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const buffer = Buffer.from(await res.arrayBuffer())

        await sock.sendMessage(sender, {
            image: buffer,
            caption:
                `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                `│   👤 *PHOTO DE PROFIL*           🕷️\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `📱 *Numéro:* @${num}\n` +
                `⚙️ *Qualité:* Haute résolution\n\n` +
                `_🤖 J.A.R.V.I.S. BOT — Profile System_`,
            mentions: [targetJid]
        })
    } catch (e) {
        await sendMessage(sock, sender, `│ opération échoué: ${e.message}`)
    }
}
