// commands/restart.js — FIX: getSenderJid branché sur .env
import { sendMessage } from "../lib/sendMessage.js"
import { getSenderJid, isOwner } from '../lib/ownerSystem.js'

export default async function restart(sock, sender, args, msg) {
    try {
        const userId = getSenderJid(msg, sock)

        if (!isOwner(userId)) {
            await sendMessage(sock, sender, "⛔ Seul l'Owner peut redémarrer le Système.")
            return
        }

        await sendMessage(sock, sender, "🔄 *Redémarrage du Système...*\n\n⏳ Veuillez patienter 10-15 secondes.")
        console.log("🔄 Redémarrage demandé par", userId)
        setTimeout(() => process.exit(0), 3000)
    } catch (e) {
        await sendMessage(sock, sender, "🕷️ opération échoué: " + e.message)
    }
}
