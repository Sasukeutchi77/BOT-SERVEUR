// commands/antiword.js — J.A.R.V.I.S.
// ✅ Anti-mots interdits avec design amélioré

import { sendMessage } from '../lib/sendMessage.js'
import { getSenderJid } from '../lib/ownerSystem.js'
import { getGroupConfig, updateGroupConfig } from '../lib/groupConfig.js'

export default async function antiword(sock, sender, args, msg, ctx = {}) {
  try {
    if (!sender.endsWith('@g.us')) {
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n│  ⚠️ *GROUPE UNIQUEMENT*\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }
    if (!ctx.isOwner && !ctx.isAdmin) {
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n│  🚫 *ACCÈS REFUSÉ* — administrateurs uniquement.\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    const action = (args[0] || '').toLowerCase()
    const word   = args.slice(1).join(' ').trim().toLowerCase()

    if (action === 'on' || action === 'off') {
      updateGroupConfig(sender, c => { c.antiword.enabled = action === 'on'; return c })
    } else if (action === 'add' && word) {
      updateGroupConfig(sender, c => {
        c.antiword.words = [...new Set([...(c.antiword.words || []), word])]
        return c
      })
    } else if ((action === 'remove' || action === 'del') && word) {
      updateGroupConfig(sender, c => {
        c.antiword.words = (c.antiword.words || []).filter(w => w !== word)
        return c
      })
    } else if (action && action !== 'list') {
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│   🚫  ANTI-MOTS INTERDITS      🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│  📝 *SYNTAXE*\n│\n` +
        `│  \`.antiword on\`         → Activer\n` +
        `│  \`.antiword off\`        → Désactiver\n` +
        `│  \`.antiword add <mot>\`  → Ajouter mot\n` +
        `│  \`.antiword del <mot>\`  → Retirer mot\n` +
        `│  \`.antiword list\`       → Voir la liste\n` +
        `│\n` +
        `│  💡 *Exemple :*\n` +
        `│  \`.antiword add insulte\`\n` +
        `│  \`.antiword del spam\`\n│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    const c     = getGroupConfig(sender).antiword
    const words = c.words || []

    let text =
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `│   🚫  ANTI-MOTS INTERDITS      🕷️\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️━━━〔 📊 𝐒𝐓𝐀𝐓𝐔𝐓 〕━━━🕸️\n│\n` +
      `│  ${c.enabled ? '⚙️ *ACTIVÉ*' : '🤖 *DÉSACTIVÉ*'}\n` +
      `│  📦 *${words.length}* mot(s) banni(s)\n│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n`

    if (words.length > 0) {
      text += `\n🕸️━━━〔 📋 𝐌𝐎𝐓𝐒 𝐁𝐀𝐍𝐍𝐈𝐒 〕━━━🕸️\n│\n`
      words.forEach((w, i) => { text += `│  ${i + 1}. 🚫 \`${w}\`\n` })
      text += `│\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n`
    } else {
      text += `\n🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n│  📭 Aucun mot banni pour l'instant.\n│  Ajoutez: \`.antiword add <mot>\`\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n`
    }

    text += `\n_💡 Tout message contenant un mot banni est automatiquement supprimé._`
    await sendMessage(sock, sender, text)

  } catch (e) {
    console.error('❌ antiword.js:', e)
    await sendMessage(sock, sender, `│ opération échoué antiword: ${e.message}`)
  }
}
