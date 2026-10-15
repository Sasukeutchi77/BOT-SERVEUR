// commands/transcribe.js — J.A.R.V.I.S.
// ✅ Transcription vocale avec design amélioré

import { sendMessage } from '../lib/sendMessage.js'

export default async function transcribe(sock, sender, args, msg) {
  try {
    const quoted = msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const hasAudio = quoted?.audioMessage != null || quoted?.videoMessage != null

    // ── AIDE si pas d'audio ──────────────────────
    if (!quoted || !hasAudio) {
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│   🎙️  TRANSCRIPTION VOCALE     🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│  📋 *SYNTAXE*\n` +
        `│\n` +
        `│  1. Envoyez un message vocal\n` +
        `│     ou une vidéo avec audio\n` +
        `│\n` +
        `│  2. Répondez avec:\n` +
        `│     \`.transcribe\`\n` +
        `│\n` +
        `│  🎵 *Formats supportés :*\n` +
        `│  › Messages vocaux WhatsApp\n` +
        `│  › Notes audio\n` +
        `│  › Vidéos courtes\n` +
        `│\n` +
        `│  ⚠️ *Module Transcription :*\n` +
        `│  Connectez un service de STT\n` +
        `│  pour activer la transcription.\n` +
        `│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── Info si module non configuré ────────────
    await sendMessage(sock, sender,
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `│   🎙️  TRANSCRIPTION VOCALE     🕷️\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `│  ⏳ *Analyse de l'audio...*\n` +
      `│\n` +
      `│  👁️ Module de transcription\n` +
      `│  non encore connecté.\n` +
      `│\n` +
      `│  🔧 *Services recommandés :*\n` +
      `│  › *OpenAI Whisper* (précis, gratuit)\n` +
      `│  › *Google Speech-to-Text*\n` +
      `│  › *AssemblyAI* (API gratuite)\n` +
      `│\n` +
      `│  💡 Installation Whisper :\n` +
      `│  \`npm install openai\`\n` +
      `│\n` +
      `│  Le Système est prêt à recevoir\n` +
      `│  ce module sans modif. 🚀\n` +
      `│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )

  } catch (e) {
    console.error('❌ transcribe.js:', e)
    await sendMessage(sock, sender, `│ opération échoué transcription: ${e.message}`)
  }
}
