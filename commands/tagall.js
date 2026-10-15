import { sendMessage } from "../lib/sendMessage.js"

export default async function tagall(sock, sender, args, msg) {
  try {
    // Vérifier si c'est un groupe
    if (!sender.endsWith('@g.us')) {
      await sendMessage(sock, sender, "🕷️ Cette commande ne fonctionne que dans les groupes.")
      return
    }

    // Récupérer les infos du groupe
    const groupMetadata = await sock.groupMetadata(sender)
    const participants = groupMetadata.participants
    
    // Créer la liste des mentions
    const mentions = participants.map(p => p.id)
    
    // Message personnalisé ou message par défaut
    const customMessage = args.join(' ') || "👋 Attention tout le monde !"
    
    // Envoyer le message avec mentions
    const text = `
🕸️━━━〔 𝐓𝐀𝐆 𝐀𝐋𝐋 〕━━━🕸️
🕷️
🕷️ 📢 ${customMessage}
🕷️
🕷️ 📡 ${participants.length} utilisateurs tagués
🕷️
🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`

    await sock.sendMessage(sender, { 
      text: text,
      mentions: mentions
    })
    
    console.log(`✅ tagall | ${participants.length} membres`)
    
  } catch (e) {
    console.error("❌ Erreur tagall:", e)
    await sendMessage(sock, sender, "🕷️ opération échoué. Vérifiez que je suis administrateur du groupe.")
  }
}
