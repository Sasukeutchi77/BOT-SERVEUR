// commands/schedule.js — J.A.R.V.I.S.
// ✅ Messages programmés avec design amélioré

import { sendMessage } from '../lib/sendMessage.js'
import { getSenderJid, isSudo } from '../lib/ownerSystem.js'
import { loadV2Db, saveV2Db, getGroupConfig } from '../lib/groupConfig.js'

export default async function schedule(sock, sender, args, msg, ctx = {}) {
  try {
    if (!sender.endsWith('@g.us')) {
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│  ⚠️ *GROUPE UNIQUEMENT*\n` +
        `│\n` +
        `│  Cette commande fonctionne\n` +
        `│  uniquement dans les groupes.\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    const senderJid = ctx.senderJid || getSenderJid(msg, sock)
    if (!ctx.isOwner && !ctx.isAdmin && !isSudo(senderJid)) {
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│  🚫 *ACCÈS REFUSÉ*\n` +
        `│\n` +
        `│  Réservé aux administrateurs du groupe.\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    const action = (args[0] || '').toLowerCase()

    // ── LISTE ───────────────────────────────────
    if (action === 'list') {
      const list = getGroupConfig(sender).schedules || []
      if (!list.length) {
        return await sendMessage(sock, sender,
          `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
          `│   📆  MESSAGES PROGRAMMÉS      🕷️\n` +
          `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
          `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
          `│  📭 Aucun message programmé.\n` +
          `│\n` +
          `│  💡 Ajouter: \`.schedule HH:MM message\`\n` +
          `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        )
      }

      let text =
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│   📆  MESSAGES PROGRAMMÉS      🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│  📋 *${list.length} message(s) programmé(s)*\n` +
        `│\n`

      list.forEach((s, i) => {
        text += `│  ${i+1}. ⏰ *${s.time}*\n│     _${s.text}_\n│\n`
      })

      text += `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n`
      text += `\n💡 \`.schedule clear\` → Tout supprimer`

      return await sendMessage(sock, sender, text)
    }

    // ── CLEAR ───────────────────────────────────
    if (action === 'clear') {
      const db = loadV2Db()
      if (db.groups[sender]) db.groups[sender].schedules = []
      saveV2Db(db)
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│   📆  MESSAGES PROGRAMMÉS      🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│  🗑️ *Tous les messages supprimés*\n` +
        `│\n` +
        `│  Le planning de ce groupe\n` +
        `│  a été réinitialisé.\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── AIDE ────────────────────────────────────
    const time = args[0]
    const text = args.slice(1).join(' ').trim()

    if (!/^\d{2}:\d{2}$/.test(time || '') || !text) {
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│   📆  MESSAGES PROGRAMMÉS      🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│  📝 *SYNTAXE*\n` +
        `│\n` +
        `│  \`.schedule HH:MM <message>\`\n` +
        `│  \`.schedule list\`\n` +
        `│  \`.schedule clear\`\n` +
        `│\n` +
        `│  💡 *Exemples :*\n` +
        `│  › \`.schedule 08:00 Bonjour tout le monde !\`\n` +
        `│  › \`.schedule 21:30 Bonne nuit à tous !\`\n` +
        `│\n` +
        `│  👁️ Les messages sont envoyés\n` +
        `│  chaque jour à l'heure indiquée.\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── AJOUTER ─────────────────────────────────
    const db = loadV2Db()
    db.groups[sender] ||= getGroupConfig(sender)
    db.groups[sender].schedules ||= []
    db.groups[sender].schedules.push({ time, text, lastSent: '' })
    saveV2Db(db)

    await sendMessage(sock, sender,
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `│   📆  MESSAGE PROGRAMMÉ ⚙️     🕷️\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `│\n` +
      `│  ⚙️ *Programmé avec succès !*\n` +
      `│\n` +
      `│  ⏰ *Heure :* ${time} (chaque jour)\n` +
      `│  💬 *Message :*\n` +
      `│  _${text}_\n` +
      `│\n` +
      `│  💡 \`.schedule list\` → Voir la liste\n` +
      `│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )

  } catch (e) {
    console.error('❌ schedule.js:', e)
    await sendMessage(sock, sender, `│ opération échoué schedule: ${e.message}`)
  }
}
