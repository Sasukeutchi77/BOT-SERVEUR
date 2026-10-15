// commands/tts.js — TEXT TO SPEECH 🔊
// ✅ Convertit du texte en voix WhatsApp
// ✅ Multi-langues (fr, en, es, ar...)
// ✅ Utilise API Google TTS gratuite
// ✅ Envoie en note vocale WhatsApp

import { sendMessage } from '../lib/sendMessage.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEMP_DIR = path.join(__dirname, '../temp/tts')

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true })

const SUPPORTED_LANGS = {
    'fr': '🇫🇷 Français',
    'en': '🇬🇧 Anglais',
    'es': '🇪🇸 Espagnol',
    'ar': '🇸🇦 Arabe',
    'pt': '🇧🇷 Portugais',
    'de': '🇩🇪 Allemand',
    'it': '🇮🇹 Italien',
    'ru': '🇷🇺 Russe',
    'ja': '🇯🇵 Japonais',
    'zh': '🇨🇳 Chinois',
    'ko': '🇰🇷 Coréen'
}

// ─── GOOGLE TTS API (gratuite) ────────────────────────────────────────────────
async function googleTTS(text, lang = 'fr') {
    const maxChars = 200
    const truncated = text.length > maxChars ? text.substring(0, maxChars) : text
    const encoded = encodeURIComponent(truncated)

    // URL Google TTS officielle
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${lang}&client=tw-ob`

    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://translate.google.com/'
        },
        signal: AbortSignal.timeout(15000)
    })

    if (!res.ok) throw new Error(`Google TTS HTTP ${res.status}`)

    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length < 1000) throw new Error('Audio trop court, réessayez')

    return { buffer, truncated: text.length > maxChars }
}

// ─── ALTERNATIVE: VoiceRSS ────────────────────────────────────────────────────
async function voiceRSSTTS(text, lang = 'fr-fr') {
    // API publique alternative
    const url = `https://api.voicerss.org/?key=2d9f8f3f9e9f4e3f9e9f4e3f9e9f4e3f&hl=${lang}&src=${encodeURIComponent(text)}&f=16khz_16bit_mono`
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) throw new Error(`VoiceRSS HTTP ${res.status}`)
    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length < 1000) throw new Error('Échec VoiceRSS')
    return buffer
}

// ─── COMMANDE PRINCIPALE ──────────────────────────────────────────────────────
export default async function tts(sock, sender, args, msg) {
    try {
        // Détecter la langue si spécifiée: .tts -fr Bonjour
        let lang = 'fr'
        let textArgs = [...args]

        if (args[0]?.startsWith('-') && SUPPORTED_LANGS[args[0].substring(1)]) {
            lang = args[0].substring(1)
            textArgs = args.slice(1)
        }

        const text = textArgs.join(' ').trim()

        if (!text) {
            const langList = Object.entries(SUPPORTED_LANGS)
                .map(([code, name]) => `│  \`-${code}\` → ${name}`)
                .join('\n')

            return await sendMessage(sock, sender,
                `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                `│  🔊 *TEXT TO SPEECH* 🔊           🕷️\n` +
                `│     ⚡ J.A.R.V.I.S. SYSTÈME ⚡           🕷️\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `🕸️━━━〔 📖 𝐒𝐘𝐍𝐓𝐀𝐗𝐄 〕━━━🕸️\n` +
                `│  *.tts* <texte>\n` +
                `│  *.tts* -<langue> <texte>\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `🕸️━━━〔 🌍 𝐋𝐀𝐍𝐆𝐔𝐄𝐒 𝐃𝐈𝐒𝐏𝐎 〕━━━🕸️\n` +
                `${langList}\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `*🔥 Exemples:*\n` +
                `  • .tts Bonjour tout le monde !\n` +
                `  • .tts -en Hello World !\n` +
                `  • .tts -ar مرحبا بالعالم`
            )
        }

        // Limite 200 caractères
        const displayText = text.length > 200 ? text.substring(0, 197) + '...' : text

        await sendMessage(sock, sender,
            `🕸️━━━〔 🔊 𝐓𝐓𝐒 〕━━━🕸️\n` +
            `│  🌍 Langue: ${SUPPORTED_LANGS[lang] || lang}\n` +
            `│  📝 "${displayText}"\n` +
            `│  ⏳ Génération...\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        )

        let audioBuffer = null
        let method = ''

        // Essai Google TTS
        try {
            const result = await googleTTS(text, lang)
            audioBuffer = result.buffer
            method = 'Google TTS'
            if (result.truncated) {
                await sendMessage(sock, sender, `⚠️ Texte tronqué à 200 caractères (limite TTS)`)
            }
        } catch (e) {
            console.error('❌ Google TTS:', e.message)
        }

        if (!audioBuffer) {
            return await sendMessage(sock, sender,
                `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 𝐓𝐓𝐒 〕━━━🕸️\n` +
                `│  Impossible de générer l'audio.\n` +
                `│  Réessayez plus tard.\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
        }

        // Sauvegarder temporairement
        const tmpPath = path.join(TEMP_DIR, `tts_${Date.now()}.mp3`)
        fs.writeFileSync(tmpPath, audioBuffer)

        // Envoyer en note vocale
        await sock.sendMessage(sender, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            ptt: true,  // ← Note vocale WhatsApp
            fileName: 'tts.mp3'
        })

        console.log(`🔊 [TTS] Lang: ${lang} | "${displayText.substring(0, 30)}..." | ${method}`)

        // Nettoyage
        setTimeout(() => {
            try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath) } catch {}
        }, 30000)

    } catch (error) {
        console.error('❌ Erreur tts:', error)
        await sendMessage(sock, sender, `│ opération échoué TTS: ${error.message}`)
    }
}
