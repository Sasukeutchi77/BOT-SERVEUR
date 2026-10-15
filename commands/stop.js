// commands/stop.js — FIX: getSenderJid branché sur .env
import { sendMessage } from "../lib/sendMessage.js"
import { getSenderJid, isOwner } from '../lib/ownerSystem.js'

export default async function stop(sock, sender, args, msg) {
    try {
        const userId = getSenderJid(msg, sock)

        if (!isOwner(userId)) {
            await sendMessage(sock, sender, "⛔ Seul l'Owner peut arrêter le Système.")
            return
        }

        await sendMessage(sock, sender, "⏹️ *Arrêt du Système...*\n\nLe process va se fermer dans 3 secondes.")
        console.log('⏹️ Stop demandé par', userId)
        setTimeout(() => process.exit(0), 3000)
    } catch (e) {
        await sendMessage(sock, sender, "🕷️ opération échoué: " + e.message)
    }
}
