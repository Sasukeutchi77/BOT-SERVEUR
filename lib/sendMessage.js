// lib/sendMessage.js — VERSION CORRIGÉE
// ╔══════════════════════════════════════════════╗
// ║  WRAPPER ENVOI DE MESSAGE - COMPLET          ║
// ║  Ajout: audio, sticker, video, document      ║
// ╚══════════════════════════════════════════════╝

/**
 * Envoyer un message texte avec options optionnelles (mentions, etc.)
 */
export async function sendMessage(sock, jid, text, options = {}) {
    try {
        return await sock.sendMessage(jid, {
            text,
            ...options
        })
    } catch (err) {
        console.error('❌ sendMessage erreur:', err.message)
        // Tentative de retry une fois
        try {
            await new Promise(r => setTimeout(r, 1000))
            return await sock.sendMessage(jid, { text, ...options })
        } catch (retryErr) {
            console.error('❌ sendMessage retry échoué:', retryErr.message)
            return null
        }
    }
}

/**
 * Envoyer une image avec légende
 */
export async function sendImage(sock, jid, imageBuffer, caption = '', options = {}) {
    try {
        return await sock.sendMessage(jid, {
            image: imageBuffer,
            caption: caption,
            ...options
        })
    } catch (err) {
        console.error('❌ sendImage erreur:', err.message)
        return null
    }
}

/**
 * Envoyer un audio (MP3)
 */
export async function sendAudio(sock, jid, audioBuffer, options = {}) {
    try {
        return await sock.sendMessage(jid, {
            audio: audioBuffer,
            mimetype: options.mimetype || 'audio/mpeg',
            fileName: options.fileName || 'audio.mp3',
            ...options
        })
    } catch (err) {
        console.error('❌ sendAudio erreur:', err.message)
        return null
    }
}

/**
 * Envoyer un sticker
 */
export async function sendSticker(sock, jid, stickerBuffer, options = {}) {
    try {
        return await sock.sendMessage(jid, {
            sticker: stickerBuffer,
            ...options
        })
    } catch (err) {
        console.error('❌ sendSticker erreur:', err.message)
        return null
    }
}

/**
 * Envoyer une vidéo
 */
export async function sendVideo(sock, jid, videoBuffer, caption = '', options = {}) {
    try {
        return await sock.sendMessage(jid, {
            video: videoBuffer,
            caption: caption,
            ...options
        })
    } catch (err) {
        console.error('❌ sendVideo erreur:', err.message)
        return null
    }
}

/**
 * Envoyer un document
 */
export async function sendDocument(sock, jid, documentBuffer, fileName, caption = '', options = {}) {
    try {
        return await sock.sendMessage(jid, {
            document: documentBuffer,
            fileName: fileName,
            caption: caption,
            ...options
        })
    } catch (err) {
        console.error('❌ sendDocument erreur:', err.message)
        return null
    }
}

/**
 * Répondre à un message (reply)
 */
export async function replyMessage(sock, msg, text, options = {}) {
    try {
        return await sock.sendMessage(
            msg.key.remoteJid,
            { text, ...options },
            { quoted: msg }
        )
    } catch (err) {
        console.error('❌ replyMessage erreur:', err.message)
        return null
    }
}

/**
 * Supprimer un message
 */
export async function deleteMessage(sock, jid, msgKey) {
    try {
        await sock.sendMessage(jid, { delete: msgKey })
        return true
    } catch (err) {
        console.error('❌ deleteMessage erreur:', err.message)
        return false
    }
}

/**
 * Réagir à un message avec un emoji
 */
export async function reactMessage(sock, jid, msgKey, emoji) {
    try {
        await sock.sendMessage(jid, {
            react: {
                text: emoji,
                key: msgKey
            }
        })
        return true
    } catch (err) {
        console.error('❌ reactMessage erreur:', err.message)
        return false
    }
}

/**
 * Envoyer un message avec des boutons (legacy, peut ne pas marcher sur tous les WhatsApp)
 */
export async function sendButtons(sock, jid, text, buttons, options = {}) {
    try {
        return await sock.sendMessage(jid, {
            text: text,
            buttons: buttons,
            ...options
        })
    } catch (err) {
        console.error('❌ sendButtons erreur:', err.message)
        // Fallback sur message texte simple
        return await sendMessage(sock, jid, text, options)
    }
}

/**
 * Modifier un message existant (edit)
 */
export async function editMessage(sock, jid, msgKey, newText) {
    try {
        return await sock.sendMessage(jid, {
            text: newText,
            edit: msgKey
        })
    } catch (err) {
        console.error('❌ editMessage erreur:', err.message)
        return null
    }
}
