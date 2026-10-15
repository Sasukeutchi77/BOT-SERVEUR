// commands/exec.js — VERSION CORRIGÉE — BRANCHÉ SUR ownerHelper.js
// ✅ FIX: isOwner() lit DIRECTEMENT .env via ownerHelper
// ✅ FIX: getSenderJid() résolution robuste

import { sendMessage } from "../lib/sendMessage.js"
import { exec } from "child_process"
import { promisify } from "util"
import { getSenderJid, isOwner, isSudo } from '../lib/ownerSystem.js'

const execAsync = promisify(exec)

export default async function execCmd(sock, sender, args, msg) {
    try {
        const userId = getSenderJid(msg, sock)

        if (process.env.ENABLE_EXEC !== "true") {
            await sendMessage(sock, sender, "Exec est désactivé par défaut dans J.A.R.V.I.S. V2. Active ENABLE_EXEC=true uniquement si nécessaire.")
            return
        }

        if (!isOwner(userId)) {
            await sendMessage(sock, sender,
                `🕸️━━━〔 ⛔ 𝐀𝐂𝐂È𝐒 𝐑𝐄𝐅𝐔𝐒É 〕━━━🕸️\n\n` +
                `│ 🔒 Seul le *PROPRIÉTAIRE* peut exécuter\n` +
                `│    des commandes système.\n\n` +
                `│ 📱 Votre numéro: \`${userId.split('@')[0]}\`\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
            return
        }

        const command = args.join(" ")
        if (!command) {
            await sendMessage(sock, sender, "🕷️ syntaxe: `.exec <commande shell>`\n\nExemple: `.exec ls -la`")
            return
        }

        await sendMessage(sock, sender, "⏳ *Exécution...*")

        const start = Date.now()
        try {
            const { stdout, stderr } = await execAsync(command, { timeout: 30000 })
            const time = Date.now() - start
            let output = stdout || stderr || "⚙️ Pas de sortie (succès)"
            if (output.length > 4000) output = output.substring(0, 4000) + "\n\n... (tronqué)"

            const roleTag = '👑 OWNER'

            await sendMessage(sock, sender,
                `🕸️━━━〔 💻 𝐄𝐗𝐄𝐂 〕━━━🕸️\n` +
                `│ ⏱️ Temps: ${time}ms | ${roleTag}\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                "```bash\n$ " + command + "\n\n" + output + "\n```"
            )
        } catch (err) {
            await sendMessage(sock, sender,
                `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 𝐄𝐗𝐄𝐂 〕━━━🕸️\n\n` +
                `│ commande: \`${command}\`\n\n` +
                "```\n" + err.message + "\n```\n\n" +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
        }

    } catch (e) {
        await sendMessage(sock, sender, "🕷️ opération échoué: " + e.message)
    }
}
