// commands/removepremium.js — VERSION CORRIGÉE 
// ╔══════════════════════════════════════╗
// ║   REMOVEPREMIUM - RETIRER PREMIUM    ║
// ╚══════════════════════════════════════╝

import { sendMessage } from '../lib/sendMessage.js'
import { resolveTarget } from '../lib/targetResolver.js'
import { showActionLoader, deleteLoader, formatTime } from '../lib/animLoader.js'
import { config } from '../config.js'
import { getSenderJid, isDeployer, isPremium, removePremium } from '../lib/ownerSystem.js'

export default async function removepremium(sock, sender, args, msg) {
    let loaderKey = null

    try {
        // ── Déterminer le vrai sender (owner en DM fromMe) ────────
        const userId = getSenderJid(msg, sock)

        if (!isDeployer(userId)) {
            await sendMessage(sock, sender,
                `🕸️━━━〔 ⛔ 𝐀𝐂𝐂È𝐒 𝐑𝐄𝐅𝐔𝐒É 〕━━━🕸️\n\n` +
                `│ 🔒 Réservé au *Propriétaire*\n` +
                `│    du Système uniquement.\n\n` +
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
                `│ • *.removepremium @user*\n` +
                `│ • *.removepremium 22601234567*\n` +
                `│ • Répondre + *.removepremium*\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
            return
        }

        // ── Vérifier si est premium ──────────────────────────────
        if (!isPremium(targetId)) {
            await sendMessage(sock, sender,
                `🕸️━━━〔 👁️ 𝐏𝐀𝐒 𝐏𝐑𝐄𝐌𝐈𝐔𝐌 〕━━━🕸️\n\n` +
                `│ @${targetNumber} n'est pas\n` +
                `│ *premium* actuellement.\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`,
                { mentions: [targetId] }
            )
            return
        }

        loaderKey = await showActionLoader(sock, sender, 'SUPPRESSION PREMIUM', '💎')

        const removeResult = removePremium(targetId)
        // removePremium retourne true/false
        const result = (removeResult === true || removeResult?.success === true)
            ? { success: true }
            : { success: false, error: removeResult?.error || 'Utilisateur non trouvé dans la liste premium' }

        await deleteLoader(sock, sender, loaderKey)

        if (result.success) {
            await sendMessage(sock, sender,
                `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                `│  🕷️ *PREMIUM RETIRÉ* 🕷️  \n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +

                `🕸️━━━〔 📋 𝐂𝐎𝐍𝐅𝐈𝐑𝐌𝐀𝐓𝐈𝐎𝐍 〕━━━🕸️\n` +
                `│\n` +
                `│ 👤 Utilisateur: @${targetNumber}\n` +
                `│ 💎 Statut: *PREMIUM → UTILISATEUR*\n` +
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
                        `Votre statut *💎 PREMIUM* sur\n` +
                        `*${config.botName}* a été révoqué.\n\n` +
                        `Vous redevenez *UTILISATEUR* standard.\n\n` +
                        `Pour plus d'informations,\n` +
                        `contactez l'Owner.`
                })
            } catch (e) {
                console.log("⚠️ Impossible de notifier l'utilisateur")
            }

            console.log(`❌ removepremium | ${targetNumber} | par: ${userId.split('@')[0]}`)

        } else {
            await sendMessage(sock, sender,
                `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
                `│ ${result.error || 'opération échoué inconnue'}\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
        }

    } catch (err) {
        if (loaderKey) await deleteLoader(sock, sender, loaderKey).catch(() => {})
        console.error('❌ Erreur removepremium:', err)
        await sendMessage(sock, sender,
            `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 𝐂𝐑𝐈𝐓𝐈𝐐𝐔𝐄 〕━━━🕸️\n\n` +
            `│ 📝 _${err.message || 'opération échoué inconnue'}_\n\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        )
    }
}
