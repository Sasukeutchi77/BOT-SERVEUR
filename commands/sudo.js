// commands/sudo.js — VERSION CORRIGÉE
// ╔══════════════════════════════════════╗
// ║   SUDO - Gestion des droits SUDO     ║
// ║   ✅ FIX: getSudoList() retourne     ║
// ║      maintenant un objet complet     ║
// ╚══════════════════════════════════════╝

import { sendMessage } from "../lib/sendMessage.js"
import { resolveTarget } from "../lib/targetResolver.js"
import { config } from "../config.js"
import { addSudo, checkUserAccess, cleanNumber, getSenderJid, getSudoList, getUserStatus, isDeployer, isSudo, removeSudo } from '../lib/ownerSystem.js'

// ── Formatter un numéro pour affichage ──────────────────────────
function formatNumber(jid) {
    if (!jid) return 'N/A'
    const num = String(jid).split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
    return num ? '+' + num : jid
}

// ── Animation de chargement ──────────────────────────────────────
async function showLoading(sock, sender, text = "Chargement...") {
    try {
        const msg = await sock.sendMessage(sender, { text: `⏳ ${text}` })
        return msg?.key || null
    } catch {
        return null
    }
}

export default async function sudo(sock, sender, args, msg) {
    let loadingKey = null

    try {
        // ── Résolution robuste du sender ─────────────────────────────────────
        const userId = getSenderJid(msg, sock)

        // ── Vérification d'accès ─────────────────────────────────────────────
        const access = checkUserAccess(userId)

        if (!access.authorized) {
            await sendMessage(sock, sender,
                `🕸️━━━〔 ⛔ 𝐀𝐂𝐂È𝐒 𝐑𝐄𝐅𝐔𝐒É 〕━━━🕸️\n\n` +
                `│ Cette commande est réservée\n` +
                `│ aux administrateurs du Système.\n\n` +
                `│ 👤 Votre statut: *${getUserStatus(userId)}*\n` +
                `│ 🔐 Requis: *SUDO* ou *PROPRIÉTAIRE*\n\n` +
                `│ 📌 Votre numéro: ${access.cleanNumber}\n` +
                `│\n` +
                `│ 💡 Vérifiez OWNER_NUMBER dans .env\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
            return
        }

        const isOwner = access.isDeployer
        const action  = args[0]?.toLowerCase()

        // ── MENU PRINCIPAL ────────────────────────────────────────────────────
        if (!action) {
            // ✅ FIX: getSudoList() retourne maintenant un objet {deployer, direct, file, count}
            const sudoData  = getSudoList()
            const totalSudo = sudoData.count.total
            const roleEmoji = isOwner ? '👑' : '⭐'
            const roleText  = isOwner ? 'PROPRIÉTAIRE' : 'SUDO'

            let menuText =
                `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                `│  ${roleEmoji} *PANEL SUDO*  \n` +
                `│  🔐 ${roleText}\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +

                `🕸️━━━〔 📊 𝐒𝐓𝐀𝐓𝐈𝐒𝐓𝐈𝐐𝐔𝐄𝐒 〕━━━🕸️\n` +
                `│\n` +
                `│ 👤 Votre rôle: *${roleText}*\n` +
                `│ 📡 Total SUDO: *${totalSudo}*\n` +
                `│\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n`

            if (isOwner) {
                menuText +=
                    `🕸️━━━〔 🎮 𝐂𝐎𝐍𝐓𝐑Ô𝐋𝐄𝐒 𝐏𝐑𝐎𝐏𝐑𝐈É𝐓𝐀𝐈𝐑𝐄 〕━━━🕸️\n` +
                    `│\n` +
                    `│ • *.sudo add @user*\n` +
                    `│   ➜ Ajouter un SUDO\n` +
                    `│\n` +
                    `│ • *.sudo del @user*\n` +
                    `│   ➜ Retirer un SUDO\n` +
                    `│\n` +
                    `│ • *.sudo list*\n` +
                    `│   ➜ Voir tous les SUDO\n` +
                    `│\n` +
                    `│ • *.sudo info*\n` +
                    `│   ➜ Voir votre statut\n` +
                    `│\n` +
                    `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            } else {
                menuText +=
                    `🕸️━━━〔 🎮 𝐂𝐎𝐍𝐓𝐑Ô𝐋𝐄𝐒 𝐒𝐔𝐃𝐎 〕━━━🕸️\n` +
                    `│\n` +
                    `│ • *.sudo list* → Liste SUDO\n` +
                    `│ • *.sudo info* → Votre statut\n` +
                    `│\n` +
                    `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            }

            await sendMessage(sock, sender, menuText)
            return
        }

        // ── LISTE DES SUDO ────────────────────────────────────────────────────
        if (['list', 'voir', 'ls', 'liste'].includes(action)) {
            loadingKey = await showLoading(sock, sender, "Chargement liste...")
            // ✅ FIX: getSudoList() retourne l'objet attendu
            const sudoData = getSudoList()
            if (loadingKey) await sock.sendMessage(sender, { delete: loadingKey }).catch(() => {})

            let listText =
                `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                `│  📋 *LISTE DES SUDO*  \n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `🕸️━━━〔 👑 𝐏𝐫𝐨𝐩𝐫𝐢é𝐭𝐚𝐢𝐫𝐞 〕━━━🕸️\n` +
                `│\n` +
                `│ • ${sudoData.deployer ? formatNumber(sudoData.deployer) : 'N/A'}\n` +
                `│\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n`

            if (sudoData.file.length > 0) {
                listText += `🕸️━━━〔 📁 SUDO LISTE (${sudoData.file.length}) 〕━━━🕸️\n│\n`
                sudoData.file.forEach((jid, i) => {
                    listText += `│ ${i + 1}. ${formatNumber(jid)}\n`
                })
                listText += `│\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n`
            } else {
                listText += `🕸️━━━〔 📁 𝐒𝐔𝐃𝐎 𝐋𝐈𝐒𝐓𝐄 〕━━━🕸️\n│\n🕷️ Aucun sudo ajouté\n│\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n`
            }

            listText += `📊 *Total:* ${sudoData.count.total} SUDO`
            await sendMessage(sock, sender, listText)
            return
        }

        // ── INFO UTILISATEUR ──────────────────────────────────────────────────
        if (['info', 'statut', 'status', 'me'].includes(action)) {
            let targetId = userId

            if (args[1] && isOwner) {
                const raw = args[1].replace(/[^0-9]/g, '')
                if (raw.length >= 7) targetId = raw + '@s.whatsapp.net'
            }

            const targetAccess = checkUserAccess(targetId)

            const infoText =
                `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                `│  👁️ *STATUT UTILISATEUR*  \n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `🕸️━━━〔 👤 𝐈𝐍𝐅𝐎𝐒 〕━━━🕸️\n` +
                `│\n` +
                `│ 📱 Numéro: ${formatNumber(targetId)}\n` +
                `│ Rôle: *${getUserStatus(targetId)}*\n` +
                `│\n` +
                `│ ${targetAccess.isDeployer ? '⚙️' : '🕷️'} Owner\n` +
                `│ ${targetAccess.isSudo     ? '⚙️' : '🕷️'} Sudo\n` +
                `│ ${targetAccess.isPremium  ? '⚙️' : '🕷️'} Premium\n` +
                `│\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`

            await sendMessage(sock, sender, infoText)
            return
        }

        // ── MODIFICATIONS (OWNER UNIQUEMENT) ──────────────────────────────────
        if (!isOwner) {
            await sendMessage(sock, sender,
                `🕸️━━━〔 ⛔ 𝐀𝐂𝐂È𝐒 𝐑𝐄𝐅𝐔𝐒É 〕━━━🕸️\n\n` +
                `│ Seul le *Propriétaire* peut\n` +
                `│ effectuer cette action.\n\n` +
                `│ Vous êtes: *SUDO* ⭐\n` +
                `│ Requis: *PROPRIÉTAIRE* 👑\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
            return
        }

        // ── AJOUTER SUDO ──────────────────────────────────────────────────────
        if (['add', 'ajouter', '+', 'ajout'].includes(action)) {
            const { targetId, targetNumber: tNum } = resolveTarget(msg, args.slice(1))

            if (!targetId) {
                await sendMessage(sock, sender,
                    `🕸️━━━〔 🕷️ 𝐒𝐘𝐍𝐓𝐀𝐗𝐄 𝐈𝐍𝐂𝐎𝐑𝐑𝐄𝐂𝐓 〕━━━🕸️\n\n` +
                    `│ *.sudo add @user*\n` +
                    `│ *.sudo add 22501...*\n` +
                    `│ Répondre + *.sudo add*\n\n` +
                    `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
                )
                return
            }

            if (isDeployer(targetId)) {
                await sendMessage(sock, sender,
                    `🕸️━━━〔 ⚠️ 𝐃É𝐉À 𝐏𝐑𝐎𝐏𝐑𝐈É𝐓𝐀𝐈𝐑𝐄 〕━━━🕸️\n\n` +
                    `│ Cet utilisateur est déjà\n` +
                    `│ le *Propriétaire* du Système.\n\n` +
                    `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
                )
                return
            }

            loadingKey = await showLoading(sock, sender, "Ajout en cours...")
            const result = addSudo(targetId)
            if (loadingKey) await sock.sendMessage(sender, { delete: loadingKey }).catch(() => {})

            if (result.success) {
                await sock.sendMessage(sender, {
                    text:
                        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                        `│  ⭐ *SUDO AJOUTÉ*  \n` +
                        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                        `🕸️━━━〔 ⚙️ 𝐂𝐎𝐍𝐅𝐈𝐑𝐌𝐀𝐓𝐈𝐎𝐍 〕━━━🕸️\n` +
                        `│\n` +
                        `│ 👤 @${tNum || targetId.split('@')[0]}\n` +
                        `│ 📊 Total SUDO: ${result.total}\n` +
                        `│\n` +
                        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`,
                    mentions: [targetId]
                })
                try {
                    await sock.sendMessage(targetId, {
                        text: `⭐ *FÉLICITATIONS !*\n\nVous êtes maintenant *SUDO* sur *${config.botName || 'Système'}*.\nVous avez accès aux commandes administrateurs.`
                    })
                } catch {}
            } else {
                await sendMessage(sock, sender,
                    `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n│ ${result.error}\n\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
                )
            }
            return
        }

        // ── RETIRER SUDO ──────────────────────────────────────────────────────
        if (['del', 'delete', 'remove', '-', 'supprimer'].includes(action)) {
            const { targetId } = resolveTarget(msg, args.slice(1))

            if (!targetId) {
                await sendMessage(sock, sender,
                    `🕸️━━━〔 🕷️ 𝐒𝐘𝐍𝐓𝐀𝐗𝐄 𝐈𝐍𝐂𝐎𝐑𝐑𝐄𝐂𝐓 〕━━━🕸️\n\n` +
                    `│ *.sudo del @user*\n` +
                    `│ *.sudo del 22501...*\n\n` +
                    `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
                )
                return
            }

            if (isDeployer(targetId)) {
                await sendMessage(sock, sender,
                    `🕸️━━━〔 ⛔ 𝐀𝐂𝐓𝐈𝐎𝐍 𝐈𝐍𝐓𝐄𝐑𝐃𝐈𝐓𝐄 〕━━━🕸️\n\n` +
                    `│ Vous ne pouvez pas retirer\n` +
                    `│ le *Propriétaire* du Système.\n\n` +
                    `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
                )
                return
            }

            loadingKey = await showLoading(sock, sender, "Suppression...")
            const result = removeSudo(targetId)
            if (loadingKey) await sock.sendMessage(sender, { delete: loadingKey }).catch(() => {})

            if (result.success) {
                await sendMessage(sock, sender,
                    `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                    `│  🕷️ *SUDO RETIRÉ*  \n` +
                    `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                    `⚙️ SUDO retiré avec succès.\n` +
                    `📊 Restants: ${result.total} SUDO`
                )
            } else {
                await sendMessage(sock, sender,
                    `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n│ ${result.error}\n\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
                )
            }
            return
        }

        // ── COMMANDE INCONNUE ─────────────────────────────────────────────────
        await sendMessage(sock, sender,
            `🕸️━━━〔 🕷️ 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐄 𝐈𝐍𝐂𝐎𝐍𝐍𝐔𝐄 〕━━━🕸️\n\n` +
            `│ Actions: list | info | add | del\n\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        )

    } catch (error) {
        console.error("❌ Erreur sudo.js:", error)
        if (loadingKey) await sock.sendMessage(sender, { delete: loadingKey }).catch(() => {})
        await sendMessage(sock, sender,
            `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 𝐂𝐑𝐈𝐓𝐈𝐐𝐔𝐄 〕━━━🕸️\n\n` +
            `│ ${error.message}\n\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        )
    }
}
