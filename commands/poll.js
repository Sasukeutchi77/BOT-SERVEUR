// commands/poll.js — J.A.R.V.I.S.
// ✅ Sondages avec design amélioré et validation

import { sendMessage } from '../lib/sendMessage.js'

export default async function poll(sock, sender, args) {
  try {
    const raw   = args.join(' ')
    const parts = raw.split('|').map(x => x.trim()).filter(Boolean)

    // ── AIDE ────────────────────────────────────
    if (parts.length < 3) {
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│   📊  CRÉER UN SONDAGE         🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│  📝 *SYNTAXE*\n` +
        `│\n` +
        `│  \`.poll Question | Choix 1 | Choix 2\`\n` +
        `│\n` +
        `│  💡 *Exemples :*\n` +
        `│  › \`.poll Couleur préférée ? | 🤖 Rouge | 🔵 Bleu | ⚙️ Vert\`\n` +
        `│  › \`.poll Film ce soir ? | Action | Comédie | Horreur\`\n` +
        `│\n` +
        `│  👁️ *Règles :*\n` +
        `│  › Minimum 2 choix requis\n` +
        `│  › Maximum 10 choix possibles\n` +
        `│  › Séparer avec le symbole |\n` +
        `│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    const question = parts[0]
    const opts     = parts.slice(1).slice(0, 10)

    // ── CRÉER LE SONDAGE ────────────────────────
    try {
      await sock.sendMessage(sender, {
        poll: {
          name:            question,
          values:          opts,
          selectableCount: 1
        }
      })

      await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│  📊 *Sondage créé !* ⚙️\n` +
        `│\n` +
        `│  ❓ *Question :* ${question}\n` +
        `│  🗳️ *Choix :* ${opts.length} options\n` +
        `│\n` +
        `│  Votez ci-dessus ! 👆\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )

    } catch {
      // Fallback texte si sondage natif non supporté
      let fallback =
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│   📊  SONDAGE                  🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│\n` +
        `│  ❓ *${question}*\n` +
        `│\n`

      opts.forEach((o, i) => {
        const emojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟']
        fallback += `│  ${emojis[i] || `${i+1}.`} ${o}\n`
      })

      fallback +=
        `│\n` +
        `│  Répondez avec le numéro de\n` +
        `│  votre choix ! 🗳️\n` +
        `│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`

      await sendMessage(sock, sender, fallback)
    }

  } catch (e) {
    console.error('❌ poll.js:', e)
    await sendMessage(sock, sender, `│ opération échoué sondage: ${e.message}`)
  }
}
