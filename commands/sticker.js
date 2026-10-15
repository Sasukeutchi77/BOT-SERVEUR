// commands/sticker.js — NOUVELLE COMMANDE
// 🎭 Convertir une image/vidéo en sticker WhatsApp
// ✅ Utilise Sharp pour les images et FFmpeg pour les vidéos

import { sendMessage } from '../lib/sendMessage.js'
import { downloadQuotedMediaBuffer } from '../lib/media.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { promisify } from 'util'
import { exec } from 'child_process'

const execAsync = promisify(exec)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEMP_DIR  = path.join(__dirname, '../temp')

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true })

async function imageToWebp(buffer) {
    try {
        // Essai avec sharp
        const sharp = (await import('sharp')).default
        return await sharp(buffer)
            .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .webp({ quality: 80 })
            .toBuffer()
    } catch (e) {
        console.error("❌ Sharp erreur:", e.message)
        // Fallback: retourner le buffer tel quel (WhatsApp accepte les PNG/JPEG comme stickers de base)
        return buffer
    }
}

async function videoToAnimatedWebp(buffer) {
    const inputPath  = path.join(TEMP_DIR, `sticker_in_${Date.now()}.mp4`)
    const outputPath = path.join(TEMP_DIR, `sticker_out_${Date.now()}.webp`)

    try {
        fs.writeFileSync(inputPath, buffer)
        await execAsync(
            `ffmpeg -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0.0" -t 8 -vcodec libwebp -loop 0 -preset default -an -vsync 0 "${outputPath}"`,
            { timeout: 30000 }
        )
        if (fs.existsSync(outputPath)) {
            const result = fs.readFileSync(outputPath)
            return result
        }
        return null
    } catch (e) {
        console.error("❌ FFmpeg erreur:", e.message)
        return null
    } finally {
        try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath) } catch {}
        try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath) } catch {}
    }
}

export default async function sticker(sock, sender, args, msg) {
    try {
        // Récupérer le média (image/vidéo)
        const m = msg.message || {}

        // Message direct (image/vidéo envoyée avec .sticker en caption)
        const isDirectImage  = !!m.imageMessage
        const isDirectVideo  = !!m.videoMessage
        const hasQuoted      = !!(
            m.extendedTextMessage?.contextInfo?.quotedMessage ||
            m.imageMessage?.contextInfo?.quotedMessage ||
            m.videoMessage?.contextInfo?.quotedMessage
        )

        let buffer  = null
        let kind    = null

        if (hasQuoted) {
            // Image/vidéo en reply
            const result = await downloadQuotedMediaBuffer(sock, msg)
            if (!result.ok) {
                return await sendMessage(sock, sender,
                    `│ *Impossible de télécharger le média*\n_${result.error}_\n\n💡 Répondez à une image ou vidéo avec *.sticker*`
                )
            }
            buffer = result.buffer
            kind   = result.kind
        } else if (isDirectImage) {
            // Image envoyée directement avec la commande en caption
            const { downloadContentFromMessage, getContentType } = await import('@whiskeysockets/baileys')
            try {
                const stream  = await downloadContentFromMessage(m.imageMessage, 'image')
                const chunks  = []
                for await (const chunk of stream) chunks.push(chunk)
                buffer = Buffer.concat(chunks)
                kind   = 'image'
            } catch (e) {
                return await sendMessage(sock, sender, `│ opération échoué téléchargement image: ${e.message}`)
            }
        } else {
            return await sendMessage(sock, sender,
                `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                `│  🎭 *STICKER MAKER*  \n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `💡 *Comment utiliser:*\n\n` +
                `📸 *Image → Sticker:*\n` +
                `Répondre à une image avec *.sticker*\n\n` +
                `🎬 *Vidéo → Sticker animé:*\n` +
                `Répondre à une vidéo (< 10s) avec *.sticker*`
            )
        }

        const loadMsg = await sock.sendMessage(sender, {
            text: `🎭 *Création du sticker en cours...*\n⏳ Patientez...`
        })

        let stickerBuffer = null

        if (kind === 'video') {
            stickerBuffer = await videoToAnimatedWebp(buffer)
            if (!stickerBuffer) {
                await sock.sendMessage(sender, { delete: loadMsg.key }).catch(() => {})
                return await sendMessage(sock, sender,
                    `│ Conversion vidéo échouée.\n💡 Assurez-vous que FFmpeg est installé.\n\`npm install ffmpeg-static\``
                )
            }
        } else {
            stickerBuffer = await imageToWebp(buffer)
        }

        await sock.sendMessage(sender, { delete: loadMsg.key }).catch(() => {})

        // Envoyer le sticker
        await sock.sendMessage(sender, {
            sticker: stickerBuffer,
            isAnimated: kind === 'video'
        })

        console.log(`🎭 sticker | ${kind} | ${(buffer.length / 1024).toFixed(0)}KB`)

    } catch (e) {
        console.error("❌ Erreur sticker:", e)
        await sendMessage(sock, sender, `│ opération échoué: ${e.message}`)
    }
}
