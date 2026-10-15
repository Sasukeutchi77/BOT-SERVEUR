// commands/remind.js — J.A.R.V.I.S.
// ✅ Rappels intelligents avec design amélioré

import { sendMessage } from '../lib/sendMessage.js'
import { getSenderJid, isSudo } from '../lib/ownerSystem.js'
import { loadV2Db, saveV2Db } from '../lib/groupConfig.js'

function parseDelay(input) {
  const m = String(input || '').match(/^(\d+)(s|m|h|d)$/i)
  if (!m) return 0
  const n = Number(m[1])
  const unit = m[2].toLowerCase()
  return n * (unit === 's' ? 1000 : unit === 'm' ? 60000 : unit === 'h' ? 3600000 : 86400000)
}

function formatDuration(input) {
  const m = String(input || '').match(/^(\d+)(s|m|h|d)$/i)
  if (!m) return input
  const n = m[1]
  const unit = m[2].toLowerCase()
  const labels = { s: 'seconde(s)', m: 'minute(s)', h: 'heure(s)', d: 'jour(s)' }
  return `${n} ${labels[unit]}`
}

export default async function remind(sock, sender, args, msg, ctx = {}) {
  try {
    const delayMs  = parseDelay(args[0])
    const timeStr  = args[0]
    const text     = args.slice(1).join(' ').trim()
    const user     = ctx.senderJid || getSenderJid(msg, sock)

    // ── AIDE ────────────────────────────────────
    if (!delayMs || !text) {
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│   ⏰  RAPPEL AUTOMATIQUE       🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│  📝 *SYNTAXE*\n` +
        `│\n` +
        `│  \`.remind <durée> <message>\`\n` +
        `│\n` +
        `│  ⏱️ *Durées valides :*\n` +
        `│  › \`10s\`  → 10 secondes\n` +
        `│  › \`5m\`   → 5 minutes\n` +
        `│  › \`2h\`   → 2 heures\n` +
        `│  › \`1d\`   → 1 jour\n` +
        `│\n` +
        `│  💡 *Exemples :*\n` +
        `│  › \`.remind 10m Boire de l'eau\`\n` +
        `│  › \`.remind 1h Réunion groupe\`\n` +
        `│  › \`.remind 2h30m\` 🕷️ (non valide)\n` +
        `│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    const db = loadV2Db()
    db.reminders ||= []
    const id = Date.now().toString(36)
    db.reminders.push({
      id,
      chatJid:  sender,
      userJid:  user,
      text,
      dueAt:    Date.now() + delayMs,
      createdAt: Date.now()
    })
    saveV2Db(db)

    await sendMessage(sock, sender,
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `│   ⏰  RAPPEL ENREGISTRÉ ⚙️     🕷️\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `│\n` +
      `│  ⚙️ *Rappel créé avec succès !*\n` +
      `│\n` +
      `│  ⏱️ *Dans :* ${formatDuration(timeStr)}\n` +
      `│  📝 *Message :*\n` +
      `│  _${text}_\n` +
      `│\n` +
      `│  🔖 *ID :* \`${id}\`\n` +
      `│\n` +
      `│  💡 Je vous enverrai ce rappel\n` +
      `│  dans ${formatDuration(timeStr)} !\n` +
      `│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )

  } catch (e) {
    console.error('❌ remind.js:', e)
    await sendMessage(sock, sender, `│ opération échoué rappel: ${e.message}`)
  }
}
