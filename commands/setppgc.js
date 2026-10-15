import { sendMessage } from "../lib/sendMessage.js"

export default async function setppgc(sock, sender, args, msg) {
  try {
    // Vérifier si c'est un groupe
    if (!sender.endsWith('@g.us')) {
      await sendMessage(sock, sender, "🕷️ Cette commande ne fonctionne que dans les groupes.")
      return
    }

    // Vérifier si on répond à un message avec image
    const quotedMsg = msg.message.extendedTextMessage?.contextInfo?.quotedMessage
    
    if (!quotedMsg?.imageMessage && !msg.message.imageMessage) {
      await sendMessage(sock, sender, "🕷️ Répondez à une image ou envoyez une image avec la commande.\n\nExemple: .setppgc (en répondant à une image)")
      return
    }

    // Télécharger l'image
    let imageBuffer
    
    if (msg.message.imageMessage) {
      // Image envoyée directement avec la commande
      imageBuffer = await sock.downloadMediaMessage(msg)
    } else {
      // Image en réponse à un message
      const quotedKey = {
        remoteJid: sender,
        fromMe: msg.message.extendedTextMessage.contextInfo.participant === sock.user.id,
        id: msg.message.extendedTextMessage.contextInfo.stanzaId,
        participant: msg.message.extendedTextMessage.contextInfo.participant
      }
      
      const quotedFullMsg = {
        key: quotedKey,
        message: quotedMsg
      }
      
      imageBuffer = await sock.downloadMediaMessage(quotedFullMsg)
    }

    if (!imageBuffer) {
      await sendMessage(sock, sender, "🕷️ Impossible de télécharger l'image.")
      return
    }

    // Changer la photo de profil
    await sock.updateProfilePicture(sender, imageBuffer)
    
    await sendMessage(sock, sender, "⚙️ Photo de profil du groupe mise à jour !")
    
    console.log(`✅ setppgc | Image changée`)
    
  } catch (e) {
    console.error("❌ Erreur setppgc:", e)
    await sendMessage(sock, sender, "🕷️ opération échoué. Vérifiez que:\n• Je suis administrateur\n• L'image est valide (JPG/PNG)\n• L'image n'est pas trop lourde")
  }
}
