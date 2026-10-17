import { sendMessage } from '../lib/sendMessage.js'

const COMMENTS = [
  "Radar démoniaque silencieux.",
  "Petit signal suspect détecté.",
  "Le compteur chauffe doucement.",
  "L'aura commence à danser.",
  "Diagnostic flamboyant confirmé.",
  "Arc-en-ciel maximal. Rien à ajouter."
]

function getContextInfo(msg) {
  const m = msg?.message || {}
  return m.extendedTextMessage?.contextInfo ||
    m.imageMessage?.contextInfo ||
    m.videoMessage?.contextInfo ||
    m.documentMessage?.contextInfo ||
    null
}

function resolveTarget(args, msg) {
  const ctx = getContextInfo(msg)
  const mention = ctx?.mentionedJid?.[0]
  if (mention) return mention
  if (ctx?.quotedMessage && ctx?.participant) return ctx.participant
  const num = String(args?.[0] || '').replace(/[^0-9]/g, '')
  return num.length >= 7 ? `${num}@s.whatsapp.net` : null
}

function bar(value) {
  const filled = Math.round(value / 10)
  return '█'.repeat(filled) + '░'.repeat(10 - filled)
}

export default async function gay(sock, sender, args, msg) {
  const target = resolveTarget(args, msg)

  if (!target) {
    return await sendMessage(sock, sender,
      `🕸️━━━〔 🌈 𝐆𝐀𝐘 𝐌𝐄𝐓𝐄𝐑 〕━━━🕸️\n` +
      `│ syntaxe: *.gay @utilisateur*\n` +
      `│ Ou réponds à un message avec *.gay*\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )
  }

  const percent = Math.floor(Math.random() * 101)
  const comment = COMMENTS[Math.min(Math.floor(percent / 20), COMMENTS.length - 1)]
  const number = target.split('@')[0].split(':')[0]

  await sendMessage(sock, sender,
    `🕸️━━━〔 🌈 𝐆𝐀𝐘 𝐌𝐄𝐓𝐄𝐑 〕━━━🕸️\n` +
    `│ Cible: @${number}\n` +
    `│ Score: *${percent}%*\n` +
    `│ ${bar(percent)}\n` +
    `│\n` +
    `│ 😈 ${comment}\n` +
    `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`,
    { mentions: [target] }
  )
}