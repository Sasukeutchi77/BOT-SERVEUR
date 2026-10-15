// commands/dice.js — Lancer les dés 🎲
import { sendMessage } from '../lib/sendMessage.js'
const DICE_FACES = ['⚀','⚁','⚂','⚃','⚄','⚅']

export default async function dice(sock, sender, args, msg) {
    const count = Math.min(parseInt(args[0]) || 1, 6)
    const results = Array.from({length: count}, () => Math.floor(Math.random() * 6))
    const total = results.reduce((a, b) => a + b + 1, 0)
    const faces = results.map(r => DICE_FACES[r]).join('  ')

    await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│   🎲 *LANCÉ DE DÉ(S)* 🎲        🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `${faces}\n\n` +
        (count > 1 ? `📊 *Total :* ${total}\n\n` : '') +
        `🎯 Résultat: *${results.map(r => r+1).join(' + ')}*\n` +
        `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n` +
        `_🤖 J.A.R.V.I.S. SYSTÈME — Dice System_\n` +
        `_Utilisation: \`.dice [1-6]\`_`
    )
}
