import { sendMessage } from "../lib/sendMessage.js"

export default async function group(sock, sender, args, msg) {
  try {
    // Vérifier si c'est un groupe
    if (!sender.endsWith('@g.us')) {
      await sendMessage(sock, sender, "🕷️ Cette commande ne fonctionne que dans les groupes.")
      return
    }

    // Vérifier l'argument
    const action = args[0]?.toLowerCase()
    
    if (!action || (action !== 'open' && action !== 'close')) {
      await sendMessage(sock, sender, "🕷️ Indiquez 'open' ou 'close'.\n\nExemple:\n.group open - Ouvre le groupe\n.group close - Ferme le groupe")
      return
    }

    // Modifier les paramètres du groupe
    if (action === 'open') {
      await sock.groupSettingUpdate(sender, "not_announcement")
      await sendMessage(sock, sender, "⚙️ Le groupe est maintenant **ouvert**.\n\nTout le monde peut écrire.")
    } else {
      await sock.groupSettingUpdate(sender, "announcement")
      await sendMessage(sock, sender, "⚙️ Le groupe est maintenant **fermé**.\n\nSeuls les administrateurs peuvent écrire.")
    }
    
    console.log(`✅ group ${action}`)
    
  } catch (e) {
    console.error("❌ Erreur group:", e)
    await sendMessage(sock, sender, "🕷️ opération échoué. Vérifiez que je suis administrateur.")
  }
}
