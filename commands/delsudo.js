// commands/delsudo.js — VERSION CORRIGÉE
// ╔══════════════════════════════════════╗
// ║   DELSUDO - RETIRER SUDO             ║
// ╚══════════════════════════════════════╝

import { sendMessage } from '../lib/sendMessage.js'
import { resolveTarget } from '../lib/targetResolver.js'
import { config } from '../config.js'
import { getSenderJid, isDeployer, isSudo, removeSudo } from '../lib/ownerSystem.js'

export default async function delsudo(sock, sender, args, msg) {
    try {
        // Déterminer le vrai sender (owner en DM fromMe=true)
        const userId = getSenderJid(msg, sock)

        // Seul le déployeur (owner) peut retirer des sudos
        if (!isDeployer(userId)) {
            await sendMessage(sock, sender,
                `🕸️━━━〔 ⛔ 𝐀𝐂𝐂È𝐒 𝐑𝐄𝐅𝐔𝐒É 〕━━━🕸️\n\n` +
                `│ 🔒 Seul le *Propriétaire*\n` +
                `│    peut retirer des SUDO.\n\n` +
                `│ 👑 Requis: *PROPRIÉTAIRE*\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
            return
        }

        // Récupérer la cible via resolveTarget
        const { targetId, targetNumber } = resolveTarget(msg, args)

        if (!targetId) {
            await sendMessage(sock, sender,
                `🕸️━━━〔 🕷️ 𝐒𝐘𝐍𝐓𝐀𝐗𝐄 𝐈𝐍𝐂𝐎𝐑𝐑𝐄𝐂𝐓 〕━━━🕸️\n\n` +
                `│ 📌 syntaxe:\n` +
                `│ • *.delsudo @user*\n` +
                `│ • *.delsudo 22601234567*\n` +
                `│ • Répondre + *.delsudo*\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
            return
        }

        // Protéger le déployeur
        if (isDeployer(targetId)) {
            await sendMessage(sock, sender,
                `🕸️━━━〔 ⛔ 𝐈𝐌𝐏𝐎𝐒𝐒𝐈𝐁𝐋𝐄 〕━━━🕸️\n\n` +
                `│ Le *Propriétaire* ne peut\n` +
                `│ pas être retiré.\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
            return
        }

        const result = removeSudo(targetId)

        if (result.success) {
            const num = targetNumber || targetId.split('@')[0]
            await sendMessage(sock, sender,
                `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                `│  🕷️ *SUDO RETIRÉ*  \n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `🕸️━━━〔 ⚙️ 𝐂𝐎𝐍𝐅𝐈𝐑𝐌𝐀𝐓𝐈𝐎𝐍 〕━━━🕸️\n` +
                `│\n` +
                `│ 👤 Utilisateur: @${num}\n` +
                `│ 📊 SUDO restants: ${result.total - 1}\n` +
                `│\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`,
                { mentions: [targetId] }
            )
        } else {
            await sendMessage(sock, sender,
                `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
                `│ ${result.error}\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
        }

    } catch (err) {
        console.error('❌ Erreur delsudo:', err)
        await sendMessage(sock, sender, `│ opération échoué: ${err.message}`)
    }
}
