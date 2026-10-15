// commands/translate.js — NOUVELLE COMMANDE
// 🌍 Traduction multi-langues via Google Translate (API non officielle)
// ✅ 30+ langues supportées
// ✅ Détection automatique de la langue source
// ✅ Réponse à un message pour le traduire
// ✅ Fallback sur MyMemory API si Google bloque

import { sendMessage } from '../lib/sendMessage.js'

// ─── LANGUES SUPPORTÉES ───────────────────────────────────────────────────────
const LANGUAGES = {
    // Africaines
    'fr':  '🇫🇷 Français',
    'en':  '🇺🇸 Anglais',
    'es':  '🇪🇸 Espagnol',
    'pt':  '🇵🇹 Portugais',
    'ar':  '🇸🇦 Arabe',
    'sw':  '🇰🇪 Swahili',
    'ha':  '🇳🇬 Haoussa',
    'yo':  '🇳🇬 Yoruba',
    'ig':  '🇳🇬 Igbo',
    'am':  '🇪🇹 Amharique',
    'so':  '🇸🇴 Somali',
    'mg':  '🇲🇬 Malgache',
    // Européennes
    'de':  '🇩🇪 Allemand',
    'it':  '🇮🇹 Italien',
    'ru':  '🇷🇺 Russe',
    'nl':  '🇳🇱 Néerlandais',
    'tr':  '🇹🇷 Turc',
    'pl':  '🇵🇱 Polonais',
    // Asiatiques
    'zh':  '🇨🇳 Chinois',
    'ja':  '🇯🇵 Japonais',
    'ko':  '🇰🇷 Coréen',
    'hi':  '🇮🇳 Hindi',
    'bn':  '🇧🇩 Bengali',
    'fa':  '🇮🇷 Persan',
    'ur':  '🇵🇰 Ourdou',
    // Autres
    'he':  '🇮🇱 Hébreu',
    'th':  '🇹🇭 Thaï',
    'vi':  '🇻🇳 Vietnamien',
    'id':  '🇮🇩 Indonésien',
    'ms':  '🇲🇾 Malais',
}

// Alias raccourcis pour la langue cible
const LANG_ALIASES = {
    'francais': 'fr', 'français': 'fr', 'french': 'fr',
    'anglais':  'en', 'english': 'en', 'eng': 'en',
    'espagnol': 'es', 'spanish': 'es', 'esp': 'es',
    'arabe':    'ar', 'arabic': 'ar',
    'portugais':'pt', 'portuguese': 'pt',
    'allemand': 'de', 'german': 'de',
    'chinois':  'zh', 'chinese': 'zh',
    'japonais': 'ja', 'japanese': 'ja',
    'russe':    'ru', 'russian': 'ru',
    'hindi':    'hi',
    'swahili':  'sw',
    'haoussa':  'ha', 'hausa': 'ha',
    'yoruba':   'yo',
    'italien':  'it', 'italian': 'it',
    'turc':     'tr', 'turkish': 'tr',
    'coreen':   'ko', 'coréen': 'ko', 'korean': 'ko',
}

function resolveLang(input) {
    if (!input) return null
    const lower = input.toLowerCase().trim()
    if (LANGUAGES[lower]) return lower
    return LANG_ALIASES[lower] || null
}

// ─── PROVIDER 1: Google Translate (non officiel) ──────────────────────────────
async function translateGoogle(text, targetLang, sourceLang = 'auto') {
    try {
        const encoded = encodeURIComponent(text)
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&dt=bd&dj=1&q=${encoded}`
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Referer': 'https://translate.google.com'
            },
            signal: AbortSignal.timeout(10000)
        })
        if (!res.ok) throw new Error(`Google Translate HTTP ${res.status}`)
        const json = await res.json()

        let translated = ''
        if (json.sentences) {
            translated = json.sentences.map(s => s.trans || '').join('')
        } else if (json[0]) {
            translated = json[0].map(s => s?.[0] || '').join('')
        }

        const detectedLang = json.src || sourceLang
        return { translated, detectedLang, provider: 'Google' }
    } catch (e) {
        console.error('❌ translateGoogle:', e.message)
        return null
    }
}

// ─── PROVIDER 2: MyMemory API (fallback gratuit) ──────────────────────────────
async function translateMyMemory(text, targetLang, sourceLang = 'auto') {
    try {
        const sl  = sourceLang === 'auto' ? 'fr' : sourceLang
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sl}|${targetLang}`
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
        if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`)
        const json = await res.json()
        if (json.responseStatus !== 200) throw new Error(json.responseDetails)
        const translated = json.responseData.translatedText
        return { translated, detectedLang: sl, provider: 'MyMemory' }
    } catch (e) {
        console.error('❌ translateMyMemory:', e.message)
        return null
    }
}

// ─── COMMANDE PRINCIPALE ──────────────────────────────────────────────────────
export default async function translate(sock, sender, args, msg) {
    try {
        // ── Lire le texte quoté si disponible ──
        const quotedText = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation
            || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text
            || null

        const targetLangRaw = args[0]
        const targetLang    = resolveLang(targetLangRaw)

        // ── Déterminer le texte à traduire ──
        let textToTranslate = ''
        if (quotedText) {
            // Mode: répondre à un message → .translate <langue>
            textToTranslate = quotedText
        } else {
            // Mode: .translate <langue> <texte>
            textToTranslate = args.slice(1).join(' ').trim()
        }

        // ── Validation ──
        if (!targetLang) {
            const langList = Object.entries(LANGUAGES)
                .map(([code, name]) => `• \`${code}\` — ${name}`)
                .join('\n')

            return await sendMessage(sock, sender,
                `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                `│  🌍 *TRADUCTEUR SYSTÈME*  🌍  \n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `*Usage:*\n` +
                `• \`.translate <lang> <texte>\`\n` +
                `• Répondez à un message:\n` +
                `  \`.translate <lang>\`\n\n` +
                `*Exemples:*\n` +
                `• \`.translate en Bonjour\`\n` +
                `• \`.translate ar Comment tu vas?\`\n` +
                `• \`.translate swahili Bonsoir\`\n\n` +
                `📋 *Langues disponibles:*\n${langList}`
            )
        }

        if (!textToTranslate) {
            return await sendMessage(sock, sender,
                `│ *Texte manquant!*\n\n` +
                `*syntaxe:* \`.translate ${targetLangRaw} <texte>\`\n` +
                `*Ou:* Répondez à un message avec \`.translate ${targetLangRaw}\``
            )
        }

        if (textToTranslate.length > 1000) {
            return await sendMessage(sock, sender,
                `│ *Texte trop long!*\n📏 Maximum: *1000 caractères*\n📝 Actuel: *${textToTranslate.length}*`
            )
        }

        // ── Traduction ──
        let result = await translateGoogle(textToTranslate, targetLang)
        if (!result) result = await translateMyMemory(textToTranslate, targetLang)

        if (!result || !result.translated) {
            return await sendMessage(sock, sender,
                `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
                `│ Service de traduction\n` +
                `│ indisponible.\n` +
                `│ Réessayez plus tard.\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
        }

        const sourceName = LANGUAGES[result.detectedLang] || result.detectedLang
        const targetName = LANGUAGES[targetLang] || targetLang

        await sendMessage(sock, sender,
            `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
            `│   🌍 *TRADUCTION*   🌍   \n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
            `🕸️━━━〔 📝 𝐎𝐑𝐈𝐆𝐈𝐍𝐀𝐋 〕━━━🕸️\n` +
            `│ *Langue:* ${sourceName}\n` +
            `│\n` +
            `│ ${textToTranslate.substring(0, 300)}${textToTranslate.length > 300 ? '...' : ''}\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
            `🕸️━━━〔 ⚙️ 𝐓𝐑𝐀𝐃𝐔𝐂𝐓𝐈𝐎𝐍 〕━━━🕸️\n` +
            `│ *Langue:* ${targetName}\n` +
            `│\n` +
            `│ ${result.translated}\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
            `_📡 Via ${result.provider}_`
        )

        console.log(`🌍 translate: ${result.detectedLang} → ${targetLang} [${result.provider}]`)

    } catch (error) {
        console.error('❌ Erreur translate:', error)
        await sendMessage(sock, sender,
            `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
            `│ ${error.message || 'opération échoué inconnue'}\n\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        )
    }
}
