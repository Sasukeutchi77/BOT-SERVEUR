// commands/horoscope.js — HOROSCOPE QUOTIDIEN ♈
// ✅ Horoscope pour les 12 signes
// ✅ API gratuite en ligne
// ✅ Affichage stylé avec émojis
// ✅ Support FR/EN

import { sendMessage } from '../lib/sendMessage.js'

const SIGNS = {
    'belier':     { en: 'aries',       emoji: '♈', name: 'Bélier' },
    'taureau':    { en: 'taurus',      emoji: '♉', name: 'Taureau' },
    'gemeaux':    { en: 'gemini',      emoji: '♊', name: 'Gémeaux' },
    'cancer':     { en: 'cancer',      emoji: '♋', name: 'Cancer' },
    'lion':       { en: 'leo',         emoji: '♌', name: 'Lion' },
    'vierge':     { en: 'virgo',       emoji: '♍', name: 'Vierge' },
    'balance':    { en: 'libra',       emoji: '⚖️', name: 'Balance' },
    'scorpion':   { en: 'scorpio',     emoji: '♏', name: 'Scorpion' },
    'sagittaire': { en: 'sagittarius', emoji: '♐', name: 'Sagittaire' },
    'capricorne': { en: 'capricorn',   emoji: '♑', name: 'Capricorne' },
    'verseau':    { en: 'aquarius',    emoji: '♒', name: 'Verseau' },
    'poissons':   { en: 'pisces',      emoji: '♓', name: 'Poissons' }
}

// Mapping des alias anglais vers français
const EN_TO_FR = Object.fromEntries(
    Object.entries(SIGNS).map(([fr, data]) => [data.en, fr])
)

// ─── API HOROSCOPE ────────────────────────────────────────────────────────────
async function fetchHoroscope(signEn, period = 'today') {
    const apis = [
        // API principale
        async () => {
            const res = await fetch(
                `https://horoscope-app-api.vercel.app/api/v1/get-horoscope/daily?sign=${signEn}&day=${period}`,
                { signal: AbortSignal.timeout(10000) }
            )
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            if (!data.data?.horoscope_data) throw new Error('No data')
            return {
                text: data.data.horoscope_data,
                date: data.data.date || new Date().toLocaleDateString('fr-FR')
            }
        },
        // API fallback
        async () => {
            const res = await fetch(
                `https://aztro.sameerkumar.website/?sign=${signEn}&day=${period}`,
                { method: 'POST', signal: AbortSignal.timeout(10000) }
            )
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            if (!data.description) throw new Error('No description')
            return {
                text: data.description,
                date: data.current_date || new Date().toLocaleDateString('fr-FR'),
                mood: data.mood,
                color: data.color,
                lucky_number: data.lucky_number,
                lucky_time: data.lucky_time,
                compatibility: data.compatibility
            }
        }
    ]

    for (const api of apis) {
        try {
            return await api()
        } catch { continue }
    }
    return null
}

// ─── COMMANDE PRINCIPALE ──────────────────────────────────────────────────────
export default async function horoscope(sock, sender, args, msg) {
    try {
        const input = args[0]?.toLowerCase()
        const period = args[1]?.toLowerCase() === 'demain' ? 'tomorrow' :
                       args[1]?.toLowerCase() === 'hier'   ? 'yesterday' : 'today'

        if (!input) {
            const signsList = Object.entries(SIGNS)
                .map(([fr, data]) => `│  ${data.emoji} \`${fr}\``)
                .join('\n')

            return await sendMessage(sock, sender,
                `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                `│  ✨ *HOROSCOPE DU JOUR* ✨        🕷️\n` +
                `│     ⚡ J.A.R.V.I.S. SYSTÈME ⚡           🕷️\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `🕸️━━━〔 📖 𝐒𝐘𝐍𝐓𝐀𝐗𝐄 〕━━━🕸️\n` +
                `│  *.horoscope* <signe>\n` +
                `│  *.horoscope* <signe> demain\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `🕸️━━━〔 ♈ 𝐒𝐈𝐆𝐍𝐄𝐒 𝐃𝐈𝐒𝐏𝐎𝐍𝐈𝐁𝐋𝐄𝐒 〕━━━🕸️\n` +
                `${signsList}\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `*🔥 Exemple:* .horoscope lion`
            )
        }

        // Chercher le signe
        let signKey = null
        if (SIGNS[input]) {
            signKey = input
        } else {
            // Chercher par anglais
            const frKey = EN_TO_FR[input]
            if (frKey) signKey = frKey
        }

        if (!signKey) {
            return await sendMessage(sock, sender,
                `🕸️━━━〔 🕷️ 𝐒𝐈𝐆𝐍𝐄 𝐈𝐍𝐂𝐎𝐍𝐍𝐔 〕━━━🕸️\n` +
                `│  "${input}" n'est pas reconnu.\n` +
                `│  Tapez .horoscope pour la liste.\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
        }

        const sign = SIGNS[signKey]

        await sendMessage(sock, sender,
            `🕸️━━━〔 ${sign.emoji} *${sign.name.toUpperCase()}* 〕━━━🕸️\n` +
            `│  ⏳ Chargement de l'horoscope...\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        )

        const data = await fetchHoroscope(sign.en, period)

        if (!data) {
            return await sendMessage(sock, sender,
                `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n` +
                `│  Impossible de récupérer l'horoscope.\n` +
                `│  Réessayez plus tard.\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
        }

        const periodText = period === 'tomorrow' ? 'Demain' :
                           period === 'yesterday' ? 'Hier' : "Aujourd'hui"

        let message =
            `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
            `│  ${sign.emoji} *HOROSCOPE ${sign.name.toUpperCase()}* ${sign.emoji}\n` +
            `│  📅 ${periodText} — ${data.date}\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
            `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
            `│  ✨ *Prédiction du jour:*\n` +
            `│\n` +
            `│  ${data.text}\n` +
            `│\n`

        if (data.mood)          message += `│  😊 *Humeur:* ${data.mood}\n`
        if (data.color)         message += `│  🎨 *Couleur:* ${data.color}\n`
        if (data.lucky_number)  message += `│  🍀 *Chiffre chance:* ${data.lucky_number}\n`
        if (data.lucky_time)    message += `│  ⏰ *Heure chance:* ${data.lucky_time}\n`
        if (data.compatibility) message += `│  💕 *Compatibilité:* ${data.compatibility}\n`

        message +=
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
            `_✨ J.A.R.V.I.S. BOT — Horoscope System_`

        await sendMessage(sock, sender, message)
        console.log(`♈ [HOROSCOPE] ${sign.name} | ${periodText}`)

    } catch (error) {
        console.error('❌ Erreur horoscope:', error)
        await sendMessage(sock, sender, `│ opération échoué horoscope: ${error.message}`)
    }
}
