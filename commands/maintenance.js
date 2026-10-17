// commands/maintenance.js — J.A.R.V.I.S.
// ✅ Mode maintenance avec design amélioré

import { sendMessage } from '../lib/sendMessage.js'
import { getSenderJid, isOwner, isSudo } from '../lib/ownerSystem.js'
import { getGroupConfig, updateGroupConfig } from '../lib/groupConfig.js'

export default async function maintenance(sock, sender, args, msg, ctx = {}) {
  try {
    const user  = ctx.senderJid || getSenderJid(msg, sock)
    if (!isOwner(user) && !isSudo(user)) {
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n│  🚫 *ACCÈS REFUSÉ* — Owner/SUDO uniquement.\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    const scope  = sender.endsWith('@g.us') ? sender : 'global'
    const action = (args[0] || '').toLowerCase()

    if (action === 'on' || action === 'off') {
      updateGroupConfig(scope, c => ({ ...c, maintenance: action === 'on' }))
    } else if (action && action !== 'status') {
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│   🔧  MODE MAINTENANCE         🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│  📝 *SYNTAXE*\n│\n` +
        `│  \`.maintenance on\`     → Activer\n` +
        `│  \`.maintenance off\`    → Désactiver\n` +
        `│  \`.maintenance status\` → Voir statut\n│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    const isOn = getGroupConfig(scope).maintenance

    await sendMessage(sock, sender,
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `│   🔧  MODE MAINTENANCE         🕷️\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️━━━〔 📊 𝐒𝐓𝐀𝐓𝐔𝐓 〕━━━🕸️\n│\n` +
      `│  ${isOn ? '🟠 *MAINTENANCE ⚙️ ÉVEILLÉE*' : '⚙️ *SYSTÈME OPÉRATIONNEL*'}\n│\n` +
      `│  📍 *Portée :* ${scope === 'global' ? 'Globale (toutes les conv.)' : 'Ce groupe uniquement'}\n│\n` +
      `│  ${isOn
        ? '⚠️ En maintenance, seuls les\n│  Owner et SUDO peuvent utiliser\n│  les commandes du Système.'
        : '⚙️ Toutes les commandes sont\n│  accessibles normalement.'
      }\n│\n` +
      `│  🔧 \`.maintenance ${isOn ? 'off' : 'on'}\` → ${isOn ? 'Désactiver' : 'Activer'}\n│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )

  } catch (e) {
    console.error('❌ maintenance.js:', e)
    await sendMessage(sock, sender, `│ opération échoué maintenance: ${e.message}`)
  }
}
