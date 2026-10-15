// commands/summarize.js — J.A.R.V.I.S.
// ✅ Résumé de texte avec design amélioré

import { sendMessage } from '../lib/sendMessage.js'

function summarizeText(text) {
  const clean     = text.replace(/\s+/g, ' ').trim()
  const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean)
  if (sentences.length <= 3) return clean.slice(0, 1200)

  const IMPORTANT_WORDS = /important|urgent|résumé|problème|solution|objectif|action|conclusion|résultat|décision|priorité|clé|essentiel/i

  const scored = sentences.map(s => ({
    s,
    score: s.length + (IMPORTANT_WORDS.test(s) ? 80 : 0) + (s.length > 50 ? 20 : 0)
  }))

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(x => x.s)
    .join(' ')
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export default async function summarize(sock, sender, args, msg) {
  try {
    let text   = args.join(' ')
    const quoted = msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage
    if (!text && quoted) {
      text = quoted.conversation
          || quoted.extendedTextMessage?.text
          || ''
    }

    // ── AIDE ────────────────────────────────────
    if (!text.trim()) {
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│   📝  RÉSUMÉ DE TEXTE          🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│  📋 *SYNTAXE*\n` +
        `│\n` +
        `│  *Option 1:* Tapez directement\n` +
        `│  \`.summarize <long texte...>\`\n` +
        `│\n` +
        `│  *Option 2:* Répondre à un msg\n` +
        `│  Répondez avec \`.summarize\`\n` +
        `│\n` +
        `│  💡 Fonctionne mieux sur les\n` +
        `│  textes de 5+ phrases.\n` +
        `│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    const originalWords  = countWords(text)
    const summary        = summarizeText(text)
    const summaryWords   = countWords(summary)
    const reduction      = Math.round((1 - summaryWords / originalWords) * 100)

    await sendMessage(sock, sender,
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `│   📝  RÉSUMÉ AUTOMATIQUE       🕷️\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `│  📊 *Statistiques*\n` +
      `│  ├ 📄 Original : ${originalWords} mots\n` +
      `│  ├ 📋 Résumé : ${summaryWords} mots\n` +
      `│  └ ✂️ Réduction : ${reduction}%\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `│  💬 *RÉSUMÉ :*\n` +
      `│\n` +
      `│  ${summary.replace(/\n/g, '\n│  ')}\n` +
      `│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `_💡 Résumé généré automatiquement_`
    )

  } catch (e) {
    console.error('❌ summarize.js:', e)
    await sendMessage(sock, sender, `│ opération échoué résumé: ${e.message}`)
  }
}
