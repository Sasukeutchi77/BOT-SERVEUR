// commands/qrcode.js — Générateur de QR Code 📱
import { sendMessage } from '../lib/sendMessage.js'

export default async function qrcode(sock, sender, args, msg) {
    const text = args.join(' ').trim()
    if (!text) {
        return await sendMessage(sock, sender,
            `🕸️━━━〔 📱 𝐐𝐑 𝐂𝐎𝐃𝐄 〕━━━🕸️\n` +
            `│  syntaxe: .qrcode <texte/url>\n` +
            `│\n` +
            `│  Exemples:\n` +
            `│  • .qrcode https://google.com\n` +
            `│  • .qrcode Mon numéro WhatsApp\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        )
    }

    try {
        // API gratuite QR code
        const encoded = encodeURIComponent(text)
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encoded}&color=000000&bgcolor=FFFFFF&margin=20`

        const res = await fetch(qrUrl, { signal: AbortSignal.timeout(15000) })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const buffer = Buffer.from(await res.arrayBuffer())

        await sock.sendMessage(sender, {
            image: buffer,
            caption:
                `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                `│   📱 *QR CODE GÉNÉRÉ !*          🕷️\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `📝 *Contenu:* ${text.length > 60 ? text.substring(0, 57) + '...' : text}\n` +
                `📦 *Taille:* 512×512px\n\n` +
                `_🤖 J.A.R.V.I.S. BOT — QR System_`
        })
        console.log(`📱 [QRCODE] Généré pour: ${text.substring(0, 30)}`)
    } catch (e) {
        await sendMessage(sock, sender, `│ opération échoué génération QR Code: ${e.message}`)
    }
}
