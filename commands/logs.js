// commands/logs.js — J.A.R.V.I.S.
// ✅ Journaux d'activité avec design amélioré

import { sendMessage } from '../lib/sendMessage.js'
import { getSenderJid, isOwner, isSudo } from '../lib/ownerSystem.js'
import { getRecentLogs } from '../lib/auditLogger.js'

const TYPE_ICONS = {
  kick: '👢', ban: '🚫', warn: '⚠️', promote: '⬆️', demote: '⬇️',
  antilink: '🔗', antispam: '📵', antiword: '🚫', antiflood: '🌊',
  join: '➕', leave: '🚪', error: '🕷️', info: '👁️', command: '⚡'
}

export default async function logs(sock, sender, args, msg) {
  try {
    const user = getSenderJid(msg, sock)
    if (!isOwner(user) && !isSudo(user)) {
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n│  🚫 *ACCÈS REFUSÉ* — Owner/SUDO uniquement.\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    const limit = Math.min(20, Math.max(3, Number(args[0]) || 10))
    const rows  = getRecentLogs(limit)

    if (!rows || rows.length === 0) {
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│   📋  JOURNAUX D'ACTIVITÉ      🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│  📭 Aucun log disponible.\n` +
        `│  Le journal est vide.\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    let text =
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `│   📋  JOURNAUX D'ACTIVITÉ      🕷️\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️━━━〔 📊 ${rows.length} DERNIER(S) LOG(S) 〕━━━🕸️\n│\n`

    rows.slice(0, limit).forEach((l, i) => {
      const icon  = TYPE_ICONS[l.type] || '📌'
      const ts    = l.ts ? `_${String(l.ts).slice(11, 19)}_` : ''
      const type  = (l.type || 'log').toUpperCase()
      const actor = l.actor ? `@${String(l.actor).split('@')[0].slice(-6)}` : ''
      const info  = l.target ? `→ ${String(l.target).split('@')[0].slice(-6)}` : (l.msg ? String(l.msg).slice(0, 40) : '')
      text += `│  ${icon} *${type}* ${ts}\n│      ${actor} ${info}\n│\n`
    })

    text +=
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `_💡 \`.logs 20\` → Voir les 20 derniers_`

    await sendMessage(sock, sender, text)

  } catch (e) {
    console.error('❌ logs.js:', e)
    await sendMessage(sock, sender, `│ opération échoué logs: ${e.message}`)
  }
}
