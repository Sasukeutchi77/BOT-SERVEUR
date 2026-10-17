import { sendMessage } from '../lib/sendMessage.js'

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function code(length) {
  return Array.from({ length }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('')
}

export default async function nitro(sock, sender) {
  const gift = `discord.gift/${code(16)}`
  const card = `${code(4)}-${code(4)}-${code(4)}-${code(4)}`

  await sendMessage(sock, sender,
    `🕸️━━━〔 💎 𝐍𝐈𝐓𝐑𝐎 𝐃𝐑𝐎𝐏 〕━━━🕸️\n` +
    `│ 🎁 Lien Nitro: ${gift}\n` +
    `│ 💳 Carte cadeau: ${card}\n` +
    `│ ⏳ Expire dans: ${Math.floor(Math.random() * 9) + 1} minutes\n` +
    `│\n` +
    `│ 😈 Faux cadeau généré par J.A.R.V.I.S..\n` +
    `│ Si quelqu'un court dessus, le Système a gagné.\n` +
    `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
  )
}