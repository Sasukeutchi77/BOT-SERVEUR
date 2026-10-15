import { sendMessage } from "../lib/sendMessage.js"

export default async function add(sock, sender, args, msg) {
  try {
    // Vérifier si c'est un groupe
    if (!sender.endsWith('@g.us')) {
      await sendMessage(sock, sender, "🕷️ Cette commande ne fonctionne que dans les groupes.")
      return
    }

    // Vérifier si un numéro est fourni
    if (!args[0]) {
      await sendMessage(sock, sender, "🕷️ Indiquez un numéro.\n\nExemple: .add 22601234567")
      return
    }

    // Nettoyer le numéro
    const number = args[0].replace(/[^0-9]/g, '')
    
    if (number.length < 10) {
      await sendMessage(sock, sender, "🕷️ Numéro invalide.")
      return
    }

    const targetId = number + '@s.whatsapp.net'

    // Ajouter le membre
    await sock.groupParticipantsUpdate(sender, [targetId], "add")
    
    await sendMessage(sock, sender, `⚙️ +${number} a été ajouté au groupe.`)
    
    console.log(`✅ add | ${number}`)
    
  } catch (e) {
    console.error("❌ Erreur add:", e)
    await sendMessage(sock, sender, "🕷️ opération échoué. Vérifiez que:\n• Je suis administrateur\n• Le numéro est correct\n• La personne peut être ajoutée")
  }
}
