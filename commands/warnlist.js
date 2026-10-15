// commands/warnlist.js — J.A.R.V.I.S.
// ✅ Liste des avertissements avec design amélioré

import { sendMessage } from '../lib/sendMessage.js'
import { cleanNumber } from '../lib/ownerSystem.js'
import fs   from 'fs'
import path from 'path'

export default async function warnlist(sock, sender, args, msg, ctx = {}) {
  try {
    if (!ctx.isOwner && !ctx.isAdmin) {
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n│  🚫 *ACCÈS REFUSÉ* — administrateurs uniquement.\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    const file = path.join(process.cwd(), 'data', 'warnings.json')
    let data = {}
    try {
      if (fs.existsSync(file)) data = JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch {}

    const group   = data[sender] || {}
    const entries = Object.entries(group).filter(([, w]) => (w.count || 0) > 0)

    if (entries.length === 0) {
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│   ⚠️  LISTE DES AVERTISSEMENTS 🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│  ⚙️ Aucun avertissement actif.\n` +
        `│  Le groupe est calme !\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    const sorted = entries.sort((a, b) => (b[1].count || 0) - (a[1].count || 0))
    const total  = sorted.reduce((sum, [, w]) => sum + (w.count || 0), 0)

    let text =
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `│   ⚠️  LISTE DES AVERTISSEMENTS 🕷️\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️━━━〔 📊 𝐑É𝐒𝐔𝐌É 〕━━━🕸️\n│\n` +
      `│  📡 *utilisateurs avertis :* ${sorted.length}\n` +
      `│  📝 *Total warns :* ${total}\n│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️━━━〔 📋 𝐃É𝐓𝐀𝐈𝐋 〕━━━🕸️\n│\n`

    const medals = ['🥇', '🥈', '🥉']
    sorted.forEach(([jid, w], i) => {
      const medal  = medals[i] || `${i + 1}.`
      const count  = w.count || 0
      const bar    = '⚠️'.repeat(Math.min(count, 5))
      const reason = w.lastReason ? `_${w.lastReason}_` : '_Aucune raison_'
      text += `│  ${medal} @${cleanNumber(jid)}\n│      ${bar} *${count} warn(s)*\n│      └ ${reason}\n│\n`
    })

    text +=
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `_💡 \`.clearwarns @membre\` pour effacer_`

    const mentions = sorted.map(([jid]) => jid)
    await sendMessage(sock, sender, text, { mentions })

  } catch (e) {
    console.error('❌ warnlist.js:', e)
    await sendMessage(sock, sender, `│ opération échoué warnlist: ${e.message}`)
  }
}
