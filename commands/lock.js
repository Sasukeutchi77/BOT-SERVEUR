// commands/lock.js — J.A.R.V.I.S.
// ✅ Verrouillage fonctions groupe avec design amélioré

import { sendMessage } from '../lib/sendMessage.js'
import { getSenderJid, isSudo } from '../lib/ownerSystem.js'
import { getGroupConfig, updateGroupConfig } from '../lib/groupConfig.js'

const LOCK_KEYS = {
  name: 'name', nom: 'name',
  desc: 'desc', description: 'desc',
  photo: 'picture', picture: 'picture',
  link: 'link', lien: 'link'
}

const LOCK_LABELS = {
  name:    '✏️ Nom du groupe',
  desc:    '📝 Description',
  picture: '🖼️ Photo du groupe',
  link:    '🔗 Lien invitation'
}

export default async function lock(sock, sender, args, msg, ctx = {}) {
  try {
    if (!sender.endsWith('@g.us')) {
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│  ⚠️ *GROUPE UNIQUEMENT*\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    const senderJid = ctx.senderJid || getSenderJid(msg, sock)
    if (!ctx.isOwner && !ctx.isAdmin && !isSudo(senderJid)) {
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│  🚫 *ACCÈS REFUSÉ*\n` +
        `│  Réservé aux administrateurs du groupe.\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    const key    = (args[0] || '').toLowerCase()
    const action = (args[1] || '').toLowerCase()

    // ── AIDE ou statut ───────────────────────────
    if (!key || !LOCK_KEYS[key] || (action !== 'on' && action !== 'off')) {
      const cfg   = getGroupConfig(sender)
      const locks = cfg.locks || {}
      const onOff = (v) => v ? '🔒 Verrouillé' : '🔓 Libre'

      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│   🔒  VERROUS DU GROUPE        🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️━━━〔 📊 É𝐓𝐀𝐓 𝐀𝐂𝐓𝐔𝐄𝐋 〕━━━🕸️\n` +
        `│\n` +
        `│  ✏️  Nom        : ${onOff(locks.name)}\n` +
        `│  📝  Description: ${onOff(locks.desc)}\n` +
        `│  🖼️  Photo      : ${onOff(locks.picture)}\n` +
        `│  🔗  Lien       : ${onOff(locks.link)}\n` +
        `│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️━━━〔 🔧 𝐒𝐘𝐍𝐓𝐀𝐗𝐄 〕━━━🕸️\n` +
        `│\n` +
        `│  \`.lock <cible> on/off\`\n` +
        `│\n` +
        `│  *Cibles disponibles :*\n` +
        `│  › \`name\` ou \`nom\`\n` +
        `│  › \`desc\` ou \`description\`\n` +
        `│  › \`photo\` ou \`picture\`\n` +
        `│  › \`link\` ou \`lien\`\n` +
        `│\n` +
        `│  💡 *Exemples :*\n` +
        `│  › \`.lock name on\`  → Bloquer renomme\n` +
        `│  › \`.lock link off\` → Débloquer liens\n` +
        `│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    const lockKey = LOCK_KEYS[key]
    const lockOn  = action === 'on'

    updateGroupConfig(sender, c => { c.locks[lockKey] = lockOn; return c })

    const label = LOCK_LABELS[lockKey] || lockKey

    await sendMessage(sock, sender,
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `│   🔒  VERROU MIS À JOUR        🕷️\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `│\n` +
      `│  ${label}\n` +
      `│  ${lockOn ? '🔒 *VERROUILLÉ*' : '🔓 *DÉVERROUILLÉ*'}\n` +
      `│\n` +
      `│  ${lockOn
        ? '⚙️ Seuls les administrateurs peuvent\n│  maintenant modifier cela.'
        : '⚙️ Tous les utilisateurs peuvent\n│  maintenant modifier cela.'}\n` +
      `│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )

  } catch (e) {
    console.error('❌ lock.js:', e)
    await sendMessage(sock, sender, `│ opération échoué lock: ${e.message}`)
  }
}
