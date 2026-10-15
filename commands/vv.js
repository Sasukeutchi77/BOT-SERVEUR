import { sendMessage } from "../lib/sendMessage.js"
import { downloadQuotedMediaBuffer, isViewOnceMessageObject } from "../lib/media.js"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { writeFile } from "fs/promises"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const TEMP_DIR = path.join(__dirname, "../temp/vv")

if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
}

export default async function vv(sock, sender, args, msg) {
    let loadingKey = null

    try {
        // 1) Vérifier reply
        const quoted = msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage
        if (!quoted) {
            await sendMessage(sock, sender,
                "🕷️ *syntaxe incorrect*\n\n" +
                "📸 Répondez à une photo/vidéo *voir une seule fois* avec `.vv`\n\n" +
                "💡 Astuce: Appui long sur le média → Répondre → `.vv`"
            )
            return
        }

        // 2) Message de chargement
        const loadingMsg = await sock.sendMessage(sender, { text: "⏳ *Analyse du média...*" })
        loadingKey = loadingMsg?.key

        // 3) Télécharger via helper robuste
        const res = await downloadQuotedMediaBuffer(sock, msg)

        if (!res.ok) {
            if (loadingKey) await sock.sendMessage(sender, { delete: loadingKey }).catch(() => {})
            await sendMessage(sock, sender,
                "🕷️ *Impossible de récupérer ce média*\n\n" +
                `Détail: ${res.error}`
            )
            return
        }

        const { kind, buffer, rawQuoted, unwrapped } = res
        const isViewOnce = isViewOnceMessageObject(rawQuoted)

        // 4) Limiter aux images/vidéos (objectif de .vv)
        if (kind !== 'image' && kind !== 'video') {
            if (loadingKey) await sock.sendMessage(sender, { delete: loadingKey }).catch(() => {})
            await sendMessage(sock, sender,
                "🕷️ `.vv` supporte uniquement les *photos* et *vidéos* (view-once).\n" +
                `Type détecté: *${kind}*`
            )
            return
        }

        if (!buffer || buffer.length === 0) {
            throw new Error("Média vide ou inaccessible")
        }

        // 5) Sauvegarde locale (temp)
        const timestamp = Date.now()

        // Essayer de deviner extension depuis mimetype
        let mime = ''
        if (kind === 'image') mime = unwrapped?.imageMessage?.mimetype || 'image/jpeg'
        if (kind === 'video') mime = unwrapped?.videoMessage?.mimetype || 'video/mp4'

        const extension = (mime.split('/')[1] || (kind === 'image' ? 'jpg' : 'mp4')).split(';')[0]
        const filename = `vv_${timestamp}.${extension}`
        const filepath = path.join(TEMP_DIR, filename)

        await writeFile(filepath, buffer)

        // 6) Supprimer le message de chargement
        if (loadingKey) await sock.sendMessage(sender, { delete: loadingKey }).catch(() => {})

        // 7) Renvoyer le média
        const caption = isViewOnce
            ? `🔓 *View Once débloqué !*\n\n` +
              `📁 Type: ${kind === 'image' ? 'Photo' : 'Vidéo'}\n` +
              `📊 Taille: ${Math.round(buffer.length / 1024)} KB\n` +
              `🔒 Original: View Once\n\n` +
              `⚙️ Sauvegardé dans: /temp/vv/`
            : `📎 *Média récupéré*\n\n` +
              `📁 Type: ${kind === 'image' ? 'Photo' : 'Vidéo'}\n` +
              `📊 Taille: ${Math.round(buffer.length / 1024)} KB`

        if (kind === "image") {
            await sock.sendMessage(sender, {
                image: buffer,
                caption,
                mimetype: mime
            })
        } else {
            const isGif = mime.includes('gif') || unwrapped?.videoMessage?.gifPlayback
            await sock.sendMessage(sender, {
                video: buffer,
                caption,
                mimetype: mime,
                gifPlayback: Boolean(isGif)
            })
        }

        console.log(`🔓 VV: ${kind} | ${filename} | ${buffer.length} bytes | ViewOnce: ${isViewOnce}`)

        // 8) Nettoyage auto (1h)
        setTimeout(() => {
            try {
                if (fs.existsSync(filepath)) fs.unlinkSync(filepath)
            } catch {}
        }, 3600000)

    } catch (error) {
        console.error("❌ Erreur vv:", error)
        if (loadingKey) {
            await sock.sendMessage(sender, { delete: loadingKey }).catch(() => {})
        }
        await sendMessage(sock, sender,
            `│ *opération échoué:* ${error.message}\n\n` +
            `💡 *Conseils:*\n` +
            `• Le média a peut-être expiré\n` +
            `• Réessayez avec un média récent\n` +
            `• Vérifiez que c'est bien une photo/vidéo`
        )
    }
}
