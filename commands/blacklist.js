// commands/blacklist.js — J.A.R.V.I.S.
// ✅ Liste noire avec design amélioré

import { sendMessage } from '../lib/sendMessage.js'
import { resolveTarget } from '../lib/targetResolver.js'
import { getGroupConfig } from '../lib/groupConfig.js'
import { setListValue } from '../lib/v2Moderation.js'

export default async function blacklist(sock, sender, args, msg, ctx = {}) {
  try {
    if (!sender.endsWith('@g.us')) {
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│  ⚠️ *GROUPE UNIQUEMENT*\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    if (!ctx.isOwner && !ctx.isAdmin) {
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│  🚫 *ACCÈS REFUSÉ*\n` +
        `│  Réservé aux administrateurs du groupe.\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    const action = (args[0] || '').toLowerCase()

    // ── LISTE ───────────────────────────────────
    if (action === 'list') {
      const list = getGroupConfig(sender).blacklist || []
      if (!list.length) {
        return await sendMessage(sock, sender,
          `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
          `│   🚷  LISTE NOIRE              🕷️\n` +
          `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
          `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
          `│  📭 Aucun utilisateur en blacklist.\n` +
          `│\n` +
          `│  💡 \`.blacklist add @utilisateur\`\n` +
          `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        )
      }

      let text =
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│   🚷  LISTE NOIRE              🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│  🚫 *${list.length} utilisateur(s) en blacklist*\n` +
        `│\n`

      list.forEach((num, i) => {
        text += `│  ${i+1}. 📱 +${num}\n`
      })

      text += `│\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      return await sendMessage(sock, sender, text)
    }

    // ── AIDE ────────────────────────────────────
    if (!action || (!['add','remove','del'].includes(action) && !args[0]?.includes('@'))) {
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│   🚷  LISTE NOIRE              🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│  📝 *SYNTAXE*\n` +
        `│\n` +
        `│  \`.blacklist add @utilisateur\`\n` +
        `│  \`.blacklist remove @utilisateur\`\n` +
        `│  \`.blacklist list\`\n` +
        `│\n` +
        `│  ⚠️ *Description :*\n` +
        `│  Les utilisateurs en blacklist\n` +
        `│  sont surveillés de plus près.\n` +
        `│  Leurs actions déclenchent\n` +
        `│  les protections immédiatement.\n` +
        `│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── AJOUTER / SUPPRIMER ─────────────────────
    const shifted = ['add','remove','del'].includes(action) ? args.slice(1) : args
    const { targetId, targetNumber } = resolveTarget(msg, shifted)

    if (!targetId) {
      return await sendMessage(sock, sender, `│ Ciblez un utilisateur: \`.blacklist add @utilisateur\``)
    }

    const isAdding = action !== 'remove' && action !== 'del'
    setListValue(sender, 'blacklist', targetNumber, isAdding)

    await sendMessage(sock, sender,
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `│   🚷  LISTE NOIRE MIS À JOUR   🕷️\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `│\n` +
      `│  ${isAdding ? '🚫 *Ajouté à la liste noire*' : '⚙️ *Retiré de la liste noire*'}\n` +
      `│  📱 @${targetNumber}\n` +
      `│\n` +
      `│  💡 \`.blacklist list\` → Voir la liste\n` +
      `│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`,
      { mentions: [targetId] }
    )

  } catch (e) {
    console.error('❌ blacklist.js:', e)
    await sendMessage(sock, sender, `│ opération échoué blacklist: ${e.message}`)
  }
}
