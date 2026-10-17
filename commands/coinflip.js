// commands/coinflip.js — PILE OU FACE 🪙
// commands/rps.js — PIERRE FEUILLE CISEAUX ✊
// ✅ Jeux fun rapides

import { sendMessage } from '../lib/sendMessage.js'

// ─── PILE OU FACE ─────────────────────────────────────────────────────────────
export async function coinflip(sock, sender, args, msg) {
    try {
        const sides = ['🪙 *PILE !*', '🔰 *FACE !*']
        const result = sides[Math.floor(Math.random() * 2)]

        const text =
            `🕸️━━━〔 🪙 𝐂𝐎𝐈𝐍 𝐅𝐋𝐈𝐏 〕━━━🕸️\n` +
            `│\n` +
            `│  ${result}\n` +
            `│\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`

        await sock.sendMessage(sender, { text })
    } catch (error) {
        await sendMessage(sock, sender, `│ opération échoué coinflip: ${error.message}`)
    }
}

export default coinflip
