// commands/setsudo.js — VERSION CORRIGÉE
// ╔══════════════════════════════════════╗
// ║   SETSUDO - AJOUTER SUDO             ║
// ╚══════════════════════════════════════╝

import { sendMessage } from '../lib/sendMessage.js'
import { resolveTarget } from '../lib/targetResolver.js'
import { config } from '../config.js'
import { addSudo, getSenderJid, isDeployer, isSudo } from '../lib/ownerSystem.js'

export default async function setsudo(sock, sender, args, msg) {
    try {
        // Déterminer le vrai sender (owner en DM fromMe=true)
        const userId = getSenderJid(msg, sock)

        // Seul le déployeur (owner) peut ajouter des sudos
        if (!isDeployer(userId)) {
            await sendMessage(sock, sender,
                `🕸️━━━〔 ⛔ 𝐀𝐂𝐂È𝐒 𝐑𝐄𝐅𝐔𝐒É 〕━━━🕸️\n\n` +
                `│ 🔒 Seul le *Propriétaire*\n` +
                `│    peut ajouter des SUDO.\n\n` +
                `│ 👑 Requis: *PROPRIÉTAIRE*\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
            return
        }

        // Récupérer la cible via resolveTarget (mention / reply / numéro)
        const { targetId, targetNumber } = resolveTarget(msg, args)

        if (!targetId) {
            await sendMessage(sock, sender,
                `🕸️━━━〔 🕷️ 𝐒𝐘𝐍𝐓𝐀𝐗𝐄 𝐈𝐍𝐂𝐎𝐑𝐑𝐄𝐂𝐓 〕━━━🕸️\n\n` +
                `│ 📌 syntaxe:\n` +
                `│ • *.setsudo @user*\n` +
                `│ • *.setsudo 22601234567*\n` +
                `│ • Répondre + *.setsudo*\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
            return
        }

        // Vérifier si déjà owner
        if (isDeployer(targetId)) {
            await sendMessage(sock, sender,
                `🕸️━━━〔 ⚠️ 𝐃É𝐉À 𝐏𝐑𝐎𝐏𝐑𝐈É𝐓𝐀𝐈𝐑𝐄 〕━━━🕸️\n\n` +
                `│ Cet utilisateur est déjà\n` +
                `│ le *Propriétaire* du Système.\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
            return
        }

        const result = addSudo(targetId)

        if (result.success) {
            const num = targetNumber || targetId.split('@')[0]
            await sendMessage(sock, sender,
                `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                `│  ⭐ *SUDO AJOUTÉ*  \n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `🕸️━━━〔 ⚙️ 𝐂𝐎𝐍𝐅𝐈𝐑𝐌𝐀𝐓𝐈𝐎𝐍 〕━━━🕸️\n` +
                `│\n` +
                `│ 👤 Utilisateur: @${num}\n` +
                `│ 📊 Total SUDO: ${result.total}\n` +
                `│\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`,
                { mentions: [targetId] }
            )
            // Notifier l'utilisateur
            try {
                await sock.sendMessage(targetId, {
                    text: `⭐ *FÉLICITATIONS !*\n\nVous êtes maintenant *SUDO* sur le Système.\n\nVous avez accès aux commandes administrateurs.`
                })
            } catch (e) {}
        } else {
            await sendMessage(sock, sender,
                `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
                `│ ${result.error}\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
        }

    } catch (err) {
        console.error('❌ Erreur setsudo:', err)
        await sendMessage(sock, sender, `│ opération échoué: ${err.message}`)
    }
}
