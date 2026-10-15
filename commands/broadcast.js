// commands/broadcast.js — FIX: getSenderJid branché sur .env
import { sendMessage } from "../lib/sendMessage.js"
import { getSenderJid, isOwner } from '../lib/ownerSystem.js'

export default async function broadcast(sock, sender, args, msg) {
    try {
        const userId = getSenderJid(msg, sock)

        if (!isOwner(userId)) {
            await sendMessage(sock, sender, "⛔ Seul l'Owner peut faire un broadcast.")
            return
        }

        const message = args.join(" ")
        if (!message) {
            await sendMessage(sock, sender, "🕷️ syntaxe: `.broadcast <message>`")
            return
        }

        const chats = await sock.groupFetchAllParticipating()
        const groups = Object.keys(chats)

        await sendMessage(sock, sender, `📢 *Broadcast en cours...*\n\nEnvoi à ${groups.length} groupes.`)

        let sent = 0
        for (const groupId of groups) {
            try {
                await sock.sendMessage(groupId, { text: `📢 *BROADCAST*\n\n${message}\n\n_— Envoyé par l'Owner_` })
                sent++
                await new Promise(r => setTimeout(r, 1000))
            } catch (e) {
                console.log(`Erreur envoi à ${groupId}:`, e.message)
            }
        }

        await sendMessage(sock, sender, `⚙️ *Broadcast terminé*\n\n📤 Envoyé à ${sent}/${groups.length} groupes.`)
    } catch (e) {
        await sendMessage(sock, sender, "🕷️ opération échoué: " + e.message)
    }
}
