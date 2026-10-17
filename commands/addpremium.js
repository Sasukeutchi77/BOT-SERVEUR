// commands/addpremium.js — VERSION CORRIGÉE
// ╔══════════════════════════════════════╗
// ║   ADDPREMIUM - GESTION PREMIUM        ║
// ╚══════════════════════════════════════╝

import { sendMessage } from '../lib/sendMessage.js'
import { resolveTarget } from '../lib/targetResolver.js'
import { showPremiumLoader, deleteLoader, formatTime } from '../lib/animLoader.js'
import { config } from '../config.js'
import { addPremium, getSenderJid, isDeployer, isPremium } from '../lib/ownerSystem.js'

export default async function addpremium(sock, sender, args, msg) {
    let loaderKey = null

    try {
        // ── Déterminer le vrai sender (owner en DM fromMe) ────────
        const userId = getSenderJid(msg, sock)

        // ── Seul le DEPLOYER (Owner) peut gérer le premium ───────
        if (!isDeployer(userId)) {
            await sendMessage(sock, sender,
                `🕸️━━━〔 ⛔ 𝐀𝐂𝐂È𝐒 𝐑𝐄𝐅𝐔𝐒É 〕━━━🕸️\n\n` +
                `│ 🔒 Réservé au *Propriétaire*\n` +
                `│    du Système uniquement.\n\n` +
                `│ 👑 Requis: *PROPRIÉTAIRE*\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
            return
        }

        // ── Récupérer la cible (mention / reply / numéro) ────────
        // args[0] peut être un nombre de jours si c'est après le numéro
        const { targetId, targetNumber } = resolveTarget(msg, args)

        if (!targetId) {
            await sendMessage(sock, sender,
                `🕸️━━━〔 🕷️ 𝐒𝐘𝐍𝐓𝐀𝐗𝐄 𝐈𝐍𝐂𝐎𝐑𝐑𝐄𝐂𝐓 〕━━━🕸️\n\n` +
                `│ 📌 Spécifiez un utilisateur:\n\n` +
                `│ • *.addpremium @user*\n` +
                `│ • *.addpremium 22601234567*\n` +
                `│ • Répondre + *.addpremium*\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
            return
        }

        // ── Vérifier si déjà premium ─────────────────────────────
        if (isPremium(targetId) && !isDeployer(targetId)) {
            await sendMessage(sock, sender,
                `🕸️━━━〔 👁️ 𝐃É𝐉À 𝐏𝐑𝐄𝐌𝐈𝐔𝐌 〕━━━🕸️\n\n` +
                `│ @${targetNumber} possède déjà\n` +
                `│ le statut *💎 PREMIUM*.\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`,
                { mentions: [targetId] }
            )
            return
        }

        loaderKey = await showPremiumLoader(sock, sender, 'AJOUT PREMIUM')

        const addResult = addPremium(targetId)
        // addPremium retourne true/false
        const result = (addResult === true || addResult?.success === true)
            ? { success: true }
            : { success: false, error: addResult?.error || 'Erreur lors de l\'ajout' }

        await deleteLoader(sock, sender, loaderKey)

        if (result.success) {
            await sendMessage(sock, sender,
                `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                `│  💎 *NOUVEAU PREMIUM* 💎  \n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +

                `🕸️━━━〔 ⚙️ 𝐂𝐎𝐍𝐅𝐈𝐑𝐌𝐀𝐓𝐈𝐎𝐍 〕━━━🕸️\n` +
                `│\n` +
                `│ 👤 Utilisateur: @${targetNumber}\n` +
                `│ 🆔 ID: ${targetId}\n` +
                `│ 🕐 Ajouté le: ${formatTime()}\n` +
                `│\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +

                `🕸️━━━〔 💎 𝐀𝐕𝐀𝐍𝐓𝐀𝐆𝐄𝐒 𝐏𝐑𝐄𝐌𝐈𝐔𝐌 〕━━━🕸️\n` +
                `│\n` +
                `│ ⚙️ commandes groupe avancées\n` +
                `│ ⚙️ Gestion de groupes\n` +
                `│ ⚙️ Accès mode privé\n` +
                `│ ⚙️ Priorité de traitement\n` +
                `│\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +

                `👑 *Ajouté par:* Owner`,
                { mentions: [targetId] }
            )

            try {
                await sock.sendMessage(targetId, {
                    text:
                        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                        `│  💎 *FÉLICITATIONS !* 💎  \n` +
                        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                        `Vous venez d'obtenir le statut\n` +
                        `*💎 PREMIUM* sur *${config.botName}* !\n\n` +

                        `🕸️━━━〔 🎁 𝐕𝐎𝐒 𝐀𝐕𝐀𝐍𝐓𝐀𝐆𝐄𝐒 〕━━━🕸️\n` +
                        `│\n` +
                        `│ ⚙️ commandes avancées\n` +
                        `│ ⚙️ Support prioritaire\n` +
                        `│\n` +
                        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                        `👑 Accordé par l'Owner`
                })
            } catch (e) {
                console.log("⚠️ Impossible de notifier l'utilisateur")
            }

            console.log(`💎 addpremium | ${targetNumber} | par: ${userId.split('@')[0]}`)

        } else {
            await sendMessage(sock, sender,
                `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
                `│ ${result.error || 'opération échoué inconnue'}\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
        }

    } catch (err) {
        if (loaderKey) await deleteLoader(sock, sender, loaderKey).catch(() => {})
        console.error('❌ Erreur addpremium:', err)
        await sendMessage(sock, sender,
            `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 𝐂𝐑𝐈𝐓𝐈𝐐𝐔𝐄 〕━━━🕸️\n\n` +
            `│ 📝 _${err.message || 'opération échoué inconnue'}_\n\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        )
    }
}
