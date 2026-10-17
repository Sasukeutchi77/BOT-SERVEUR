// commands/ocr.js — J.A.R.V.I.S.
// ✅ OCR - Lecture de texte sur image

import { sendMessage } from '../lib/sendMessage.js'
import { downloadQuotedMediaBuffer } from '../lib/media.js'

export default async function ocr(sock, sender, args, msg) {
  try {
    const quoted = msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const hasImage = quoted?.imageMessage != null

    // ── AIDE si pas d'image ──────────────────────
    if (!quoted || !hasImage) {
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│   🔎  OCR — LIRE TEXTE IMAGE   🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│  📋 *SYNTAXE*\n` +
        `│\n` +
        `│  1. Envoyez ou transférez\n` +
        `│     une photo contenant du texte\n` +
        `│\n` +
        `│  2. Répondez à cette photo avec:\n` +
        `│     \`.ocr\`\n` +
        `│\n` +
        `│  📌 *Fonctionne sur :*\n` +
        `│  › Screenshots\n` +
        `│  › Photos de documents\n` +
        `│  › Affiches, panneaux, menus\n` +
        `│  › Captures d'écran de chat\n` +
        `│\n` +
        `│  ⚠️ *Module OCR :*\n` +
        `│  Installez Tesseract.js ou\n` +
        `│  connectez une API OCR pour\n` +
        `│  activer la reconnaissance réelle.\n` +
        `│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── Simulation si API OCR non configurée ────
    await sendMessage(sock, sender,
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `│   🔎  OCR — ANALYSE IMAGE      🕷️\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `│  ⏳ *Analyse de l'image...*\n` +
      `│\n` +
      `│  👁️ Le module OCR n'est pas\n` +
      `│  encore connecté.\n` +
      `│\n` +
      `│  🔧 *Pour activer l'OCR réel :*\n` +
      `│  Installez \`tesseract.js\` :\n` +
      `│  \`npm install tesseract.js\`\n` +
      `│\n` +
      `│  Ou connectez une API comme:\n` +
      `│  › Google Cloud Vision\n` +
      `│  › Microsoft Azure OCR\n` +
      `│  › OCR.space (gratuit)\n` +
      `│\n` +
      `│  💡 Le Système est *prêt* à recevoir\n` +
      `│  le module sans modifier le reste.\n` +
      `│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )

  } catch (e) {
    console.error('❌ ocr.js:', e)
    await sendMessage(sock, sender, `│ opération échoué OCR: ${e.message}`)
  }
}
