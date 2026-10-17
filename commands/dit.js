// commands/dit.js — NOUVELLE COMMANDE
// 🎤 Convertit du texte en vocal et l'envoie dans le groupe
// ✅ TTS via StreamElements (Mathieu = voix française)
// ✅ Envoi en Note Vocale (PTT) si ffmpeg disponible, sinon audio MP3

import { sendMessage } from "../lib/sendMessage.js"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { writeFile, unlink } from "fs/promises"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEMP_DIR = path.join(__dirname, "../temp")

if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
}

// ─── SOURCES TTS ──────────────────────────────────────────────────────────────

// Source 1: StreamElements TTS (voix française: Mathieu)
async function ttsStreamElements(text) {
    const voices = ['Mathieu', 'Celine', 'Lea'] // Voix françaises
    for (const voice of voices) {
        try {
            const url = `https://api.streamelements.com/kappa/v2/speech?voice=${voice}&text=${encodeURIComponent(text)}`
            const res = await fetch(url, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                signal: AbortSignal.timeout(10000)
            })
            if (!res.ok) continue
            const contentType = res.headers.get('content-type') || ''
            if (!contentType.includes('audio')) continue
            const buffer = Buffer.from(await res.arrayBuffer())
            if (buffer.length < 1000) continue
            return { buffer, voice }
        } catch (e) {
            continue
        }
    }
    return null
}

// Source 2: Google TTS (non officiel mais fiable)
async function ttsGoogle(text) {
    try {
        const encoded = encodeURIComponent(text)
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=fr&total=1&idx=0&textlen=${text.length}&client=gtx&prev=input`
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://translate.google.com'
            },
            signal: AbortSignal.timeout(10000)
        })
        if (!res.ok) return null
        const buffer = Buffer.from(await res.arrayBuffer())
        if (buffer.length < 1000) return null
        return { buffer, voice: 'Google FR' }
    } catch (e) {
        return null
    }
}

// Source 3: VoiceRSS (fallback)
async function ttsVoiceRSS(text) {
    try {
        const url = `http://www.voicerss.org/api/?key=free&hl=fr-fr&src=${encodeURIComponent(text)}&c=mp3&f=16khz_16bit_stereo`
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
        if (!res.ok) return null
        const buffer = Buffer.from(await res.arrayBuffer())
        if (buffer.length < 1000) return null
        return { buffer, voice: 'VoiceRSS FR' }
    } catch (e) {
        return null
    }
}

// ─── CONVERSION EN OGG OPUS (pour note vocale) ───────────────────────────────
async function convertToOgg(inputPath, outputPath) {
    try {
        // Essayer ffmpeg
        await execAsync(`ffmpeg -i "${inputPath}" -c:a libopus -b:a 64k -ar 48000 "${outputPath}" -y 2>/dev/null`, {
            timeout: 15000
        })
        return fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0
    } catch (e) {
        // Essayer opusenc
        try {
            await execAsync(`opusenc "${inputPath}" "${outputPath}" 2>/dev/null`, { timeout: 10000 })
            return fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0
        } catch (e2) {
            return false
        }
    }
}

// ─── COMMANDE PRINCIPALE ──────────────────────────────────────────────────────
export default async function dit(sock, sender, args, msg) {
    try {
        const text = args.join(" ").trim()

        // ── Aide ──
        if (!text) {
            await sendMessage(sock, sender,
                `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                `│    🎤 *COMMANDE DIT* 🎤    \n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `│ *syntaxe:* \`.dit <texte>\`\n\n` +
                `*Exemples:*\n` +
                `• \`.dit Bonjour tout le monde\`\n` +
                `• \`.dit Bienvenue dans le groupe\`\n` +
                `• \`.dit Attention aux règles\`\n\n` +
                `📏 *Limite:* 200 caractères\n` +
                `🎵 *Voix:* Française (Mathieu)`
            )
            return
        }

        // ── Vérifier la longueur ──
        if (text.length > 200) {
            await sendMessage(sock, sender,
                `│ *Texte trop long!*\n\n` +
                `📏 Maximum: *200 caractères*\n` +
                `📝 Actuel: *${text.length} caractères*`
            )
            return
        }

        await sendMessage(sock, sender, `🎤 *Génération du vocal...*\n\n💬 "${text}"`)

        const timestamp = Date.now()
        const mp3Path = path.join(TEMP_DIR, `dit_${timestamp}.mp3`)
        const oggPath = path.join(TEMP_DIR, `dit_${timestamp}.ogg`)

        // ── Générer le TTS ──
        let ttsResult = null

        ttsResult = await ttsStreamElements(text)
        if (!ttsResult) ttsResult = await ttsGoogle(text)
        if (!ttsResult) ttsResult = await ttsVoiceRSS(text)

        if (!ttsResult || !ttsResult.buffer) {
            await sendMessage(sock, sender,
                `│ *opération échoué TTS*\n\n` +
                `Les services de synthèse vocale sont indisponibles.\n` +
                `Réessayez dans quelques secondes.`
            )
            return
        }

        // ── Sauvegarder le fichier ──
        await writeFile(mp3Path, ttsResult.buffer)

        // ── Tenter la conversion en OGG pour note vocale ──
        let isVoiceNote = false
        let audioPath = mp3Path

        const converted = await convertToOgg(mp3Path, oggPath)
        if (converted) {
            audioPath = oggPath
            isVoiceNote = true
        }

        // ── Envoyer l'audio ──
        const audioBuffer = fs.readFileSync(audioPath)

        if (isVoiceNote) {
            // ✅ Note vocale (bubble de voix)
            await sock.sendMessage(sender, {
                audio: audioBuffer,
                ptt: true,
                mimetype: 'audio/ogg; codecs=opus'
            })
        } else {
            // 🎵 Audio MP3 classique
            await sock.sendMessage(sender, {
                audio: audioBuffer,
                mimetype: 'audio/mpeg',
                fileName: `vocal_${timestamp}.mp3`
            })
        }

        const type = isVoiceNote ? '🎙️ Note vocale' : '🎵 Audio MP3'
        console.log(`✅ Dit: "${text}" | ${ttsResult.voice} | ${type}`)

        // ── Nettoyage ──
        setTimeout(async () => {
            try { await unlink(mp3Path) } catch (e) {}
            try { await unlink(oggPath) } catch (e) {}
        }, 60000)

    } catch (error) {
        console.error("❌ Erreur dit.js:", error)
        await sendMessage(sock, sender,
            `│ *opération échoué lors de la génération du vocal:*\n${error.message}`
        )
    }
}
