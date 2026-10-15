import { sendMessage } from "../lib/sendMessage.js"

export default async function setdesc(sock, sender, args, msg) {
  try {
    // Vérifier si c'est un groupe
    if (!sender.endsWith('@g.us')) {
      await sendMessage(sock, sender, "🕷️ Cette commande ne fonctionne que dans les groupes.")
      return
    }

    // Vérifier si une description est fournie
    const newDesc = args.join(' ')
    
    if (!newDesc) {
      await sendMessage(sock, sender, "🕷️ Indiquez une description.\n\nExemple: .setdesc Bienvenue dans notre groupe !")
      return
    }

    // Changer la description
    await sock.groupUpdateDescription(sender, newDesc)
    
    await sendMessage(sock, sender, `⚙️ Description mise à jour :\n\n${newDesc}`)
    
    console.log(`✅ setdesc | ${newDesc.substring(0, 30)}...`)
    
  } catch (e) {
    console.error("❌ Erreur setdesc:", e)
    await sendMessage(sock, sender, "🕷️ opération échoué. Vérifiez que:\n• Je suis administrateur\n• La description ne dépasse pas 500 caractères")
  }
}
