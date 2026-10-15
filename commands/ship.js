import { sendMessage } from '../lib/sendMessage.js'

const COMMENTS = [
  { max: 15, text: "Même le Système refuse de bénir ce naufrage." },
  { max: 35, text: "Ça grince, ça brûle, mais il reste une étincelle perdue." },
  { max: 55, text: "Un duo instable. Drôle à regarder, dangereux à vivre." },
  { max: 75, text: "Le chaos commence à ressembler à de l'alchimie." },
  { max: 90, text: "Compatibilité brûlante. Le groupe va parler de vous." },
  { max: 100, text: "Fusion validée. Même le système applaudit." }
]

function getContextInfo(msg) {
  const m = msg?.message || {}
  return m.extendedTextMessage?.contextInfo ||
    m.imageMessage?.contextInfo ||
    m.videoMessage?.contextInfo ||
    m.documentMessage?.contextInfo ||
    null
}

function jidFromArg(arg) {
  const num = String(arg || '').replace(/[^0-9]/g, '')
  return num.length >= 7 ? `${num}@s.whatsapp.net` : null
}

function getTargets(args, msg) {
  const mentions = getContextInfo(msg)?.mentionedJid || []
  const targets = [...mentions]
  for (const arg of args || []) {
    const jid = jidFromArg(arg)
    if (jid && !targets.includes(jid)) targets.push(jid)
  }
  return targets.slice(0, 2)
}

function scoreFor(a, b) {
  const seed = [a, b].sort().join('|')
  let hash = 0
  for (const char of seed) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0
  return Math.abs(hash) % 101
}

function progressBar(value) {
  const filled = Math.round(value / 10)
  return '█'.repeat(filled) + '░'.repeat(10 - filled)
}

function numberOf(jid) {
  return jid.split('@')[0].split(':')[0]
}

export default async function ship(sock, sender, args, msg) {
  const targets = getTargets(args, msg)

  if (targets.length < 2) {
    return await sendMessage(sock, sender,
      `🕸️━━━〔 🔥 𝐒𝐇𝐈𝐏 𝐃𝐔 𝐒𝐘𝐒𝐓È𝐌𝐄 〕━━━🕸️\n` +
      `│ syntaxe: *.ship @membre1 @membre2*\n` +
      `│ Exemple: *.ship @22500000000 @22511111111*\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )
  }

  const percent = scoreFor(targets[0], targets[1])
  const comment = COMMENTS.find(item => percent <= item.max)?.text || COMMENTS.at(-1).text
  const a = numberOf(targets[0])
  const b = numberOf(targets[1])

  await sendMessage(sock, sender,
    `🕸️━━━〔 🔥 𝐒𝐇𝐈𝐏 𝐃𝐔 𝐒𝐘𝐒𝐓È𝐌𝐄 〕━━━🕸️\n` +
    `│ @${a} × @${b}\n` +
    `│\n` +
    `│ Compatibilité: *${percent}%*\n` +
    `│ ${progressBar(percent)}\n` +
    `│\n` +
    `│ 😈 ${comment}\n` +
    `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`,
    { mentions: targets }
  )
}