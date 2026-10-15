// commands/reload.js
// Recharge à chaud les commandes (Owner/SUDO)

import { sendMessage } from "../lib/sendMessage.js"
import { loadCommands } from "../lib/loader.js"
import { getSenderJid, isDeployer, isSudo } from '../lib/ownerSystem.js'

export default async function reload(sock, sender, args, msg) {
    try {
        const userId = getSenderJid(msg, sock)

        if (!isDeployer(userId) && !isSudo(userId)) {
            await sendMessage(sock, sender, "⛔ Seuls Owner/SUDO peuvent recharger les commandes.")
            return
        }

        await sendMessage(sock, sender, "⏳ Rechargement des commandes...")

        const fresh = await loadCommands(true)
        sock.commandsCache = fresh

        await sendMessage(sock, sender, `⚙️ commandes rechargées: *${Object.keys(fresh).length}*`) 

    } catch (e) {
        await sendMessage(sock, sender, "🕷️ opération échoué reload: " + e.message)
    }
}
