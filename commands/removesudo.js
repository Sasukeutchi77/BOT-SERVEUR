// commands/removesudo.js — VERSION CORRIGÉE
// ╔══════════════════════════════════════╗
// ║   REMOVESUDO - RETIRER SUDO          ║
// ╚══════════════════════════════════════╝

import { sendMessage } from '../lib/sendMessage.js'
import { resolveTarget } from '../lib/targetResolver.js'
import { showActionLoader, deleteLoader, formatTime } from '../lib/animLoader.js'
import { config } from '../config.js'
import { getSenderJid, isDeployer, isSudo, removeSudo } from '../lib/ownerSystem.js'

export default async function removesudo(sock, sender, args, msg) {
    let loaderKey = null

    try {
        // ── Déterminer le vrai sender (owner en DM fromMe) ────────
        const userId = getSenderJid(msg, sock)

        // ── Seul le DEPLOYER peut retirer un sudo ─────────────────
        if (!isDeployer(userId)) {
            await sendMessage(sock, sender,
                `🕸️━━━〔 ⛔ 𝐀𝐂𝐂È𝐒 𝐑𝐄𝐅𝐔𝐒É 〕━━━🕸️\n\n` +
                `│ 🔒 Seul le *Propriétaire*\n` +
                `│ peut retirer des SUDO.\n\n` +
                `│ 👑 Requis: *PROPRIÉTAIRE*\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
            return
        }

        // ── Récupérer la cible ────────────────────────────────────
        const { targetId, targetNumber } = resolveTarget(msg, args)

        if (!targetId) {
            await sendMessage(sock, sender,
                `🕸️━━━〔 🕷️ 𝐒𝐘𝐍𝐓𝐀𝐗𝐄 𝐈𝐍𝐂𝐎𝐑𝐑𝐄𝐂𝐓 〕━━━🕸️\n\n` +
                `│ 📌 Spécifiez un utilisateur:\n\n` +
                `│ • *.removesudo @user*\n` +
                `│ • *.removesudo 22601234567*\n` +
                `│ • Répondre + *.removesudo*\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
            return
        }

        // ── Impossible de retirer l'Owner ────────────────────────
        if (isDeployer(targetId)) {
            await sendMessage(sock, sender,
                `🕸️━━━〔 ⚠️ 𝐈𝐌𝐏𝐎𝐒𝐒𝐈𝐁𝐋𝐄 〕━━━🕸️\n\n` +
                `│ Vous ne pouvez pas retirer\n` +
                `│ le *Propriétaire* du Système.\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
            return
        }

        // ── Vérifier si est sudo ──────────────────────────────────
        if (!isSudo(targetId)) {
            await sendMessage(sock, sender,
                `🕸️━━━〔 👁️ 𝐏𝐀𝐒 𝐒𝐔𝐃𝐎 〕━━━🕸️\n\n` +
                `│ @${targetNumber} n'est pas\n` +
                `│ dans la liste *SUDO*.\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`,
                { mentions: [targetId] }
            )
            return
        }

        loaderKey = await showActionLoader(sock, sender, 'SUPPRESSION SUDO', '⭐')

        const result = removeSudo(targetId)

        await deleteLoader(sock, sender, loaderKey)

        if (result.success) {
            await sendMessage(sock, sender,
                `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                `│  🕷️ *SUDO RETIRÉ* 🕷️  \n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +

                `🕸️━━━〔 📋 𝐂𝐎𝐍𝐅𝐈𝐑𝐌𝐀𝐓𝐈𝐎𝐍 〕━━━🕸️\n` +
                `│\n` +
                `│ 👤 Utilisateur: @${targetNumber}\n` +
                `│ ⭐ Statut: *SUDO → UTILISATEUR*\n` +
                `│ 🕐 Heure: ${formatTime()}\n` +
                `│ 👑 Par: Owner\n` +
                `│\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`,
                { mentions: [targetId] }
            )

            try {
                await sock.sendMessage(targetId, {
                    text:
                        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                        `│  ⚠️ *NOTICE* ⚠️  \n` +
                        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                        `Votre statut *⭐ SUDO* sur\n` +
                        `*${config.botName}* a été révoqué.\n\n` +
                        `Vos permissions ont été supprimées.\n\n` +
                        `Pour plus d'informations,\n` +
                        `contactez l'Owner.`
                })
            } catch (e) {
                console.log("⚠️ Impossible de notifier l'utilisateur")
            }

            console.log(`❌ removesudo | ${targetNumber} | par: ${userId.split('@')[0]}`)

        } else {
            await sendMessage(sock, sender,
                `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
                `│ ${result.error || 'Impossible de retirer le SUDO.'}\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
        }

    } catch (err) {
        if (loaderKey) await deleteLoader(sock, sender, loaderKey).catch(() => {})
        console.error('❌ Erreur removesudo:', err)
        await sendMessage(sock, sender,
            `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 𝐂𝐑𝐈𝐓𝐈𝐐𝐔𝐄 〕━━━🕸️\n\n` +
            `│ 📝 _${err.message || 'opération échoué inconnue'}_\n\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        )
    }
}
