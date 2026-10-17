// commands/antitag.js — VERSION AMÉLIORÉE
// ✅ FIX: Seuil de tag configurable (défaut: 10 mentions)
// ✅ FIX: Mode avertissement avant suppression
// ✅ FIX: Admin check robuste avec normalisation JID
// ✅ AMÉLIORATION: Commandes on/off/warn/seuil + statut détaillé

import { setAntiTag, isAntiTagEnabled, getAntiTagSettings, setAntiTagConfig } from "../lib/antiTagManager.js"
import { sendMessage } from "../lib/sendMessage.js"
import { getSenderJid, isDeployer, isSudo } from '../lib/ownerSystem.js'

function cleanJidLocal(jid) {
    if (!jid) return ''
    return jid.toString()
        .replace(/@.*$/, '')
        .replace(/:.*$/, '')
        .replace(/[^0-9]/g, '')
}

async function checkGroupAdmin(sock, groupId, userId) {
    try {
        const metadata = await sock.groupMetadata(groupId)
        const userNum = cleanJidLocal(userId)
        const participant = metadata.participants.find(p => cleanJidLocal(p.id) === userNum)
        return participant?.admin === 'admin' || participant?.admin === 'superadmin'
    } catch (e) {
        console.error('❌ Erreur vérification admin antitag:', e.message)
        return false
    }
}

export default async function antitag(sock, sender, args, msg) {
    try {
        const userId = getSenderJid(msg, sock)

        // ── Vérifier si c'est un groupe ──
        if (!sender.endsWith('@g.us')) {
            return await sendMessage(sock, sender,
                `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
                `│ Cette commande ne fonctionne\n` +
                `│ que dans les *groupes*.\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
        }

        // ── Vérifier les permissions ──
        const admin = await checkGroupAdmin(sock, sender, userId)
        const isSudoUser = isSudo(userId)
        const isDeployerUser = isDeployer(userId)

        if (!administrateur && !isSudoUser && !isDeployerUser) {
            return await sendMessage(sock, sender,
                `🕸️━━━〔 ⛔ 𝐀𝐂𝐂È𝐒 𝐑𝐄𝐅𝐔𝐒É 〕━━━🕸️\n\n` +
                `│ 🔒 Seuls les *administrateurs* du\n` +
                `│    groupe ou *Owner/Sudo*\n` +
                `│    peuvent utiliser cette\n` +
                `│    commande.\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
        }

        const action = args[0]?.toLowerCase()
        const settings = getAntiTagSettings(sender)
        const currentSeuil = settings.seuil || 10
        const currentMode = settings.mode || 'delete'

        // ── Actions ──

        if (action === 'on' || action === 'enable') {
            setAntiTag(sender, true)
            await sendMessage(sock, sender,
                `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                `│  🏷️ *ANTI-TAG* 🏷️  \n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `🕸️━━━〔 ⚙️ 𝐀𝐂𝐓𝐈𝐕É 〕━━━🕸️\n` +
                `│\n` +
                `│ 🛡️ Anti-tag: *ON*\n` +
                `│ 🔢 Seuil: *${currentSeuil} mentions*\n` +
                `│ ⚙️ Mode: *${currentMode === 'warn' ? '⚠️ Avertissement' : '🗑️ Suppression'}*\n` +
                `│\n` +
                `│ 📌 Non-administrateurs bloqués\n` +
                `│    si tags > ${currentSeuil}.\n` +
                `│\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )

        } else if (action === 'off' || action === 'disable') {
            setAntiTag(sender, false)
            await sendMessage(sock, sender,
                `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                `│  🏷️ *ANTI-TAG* 🏷️  \n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `🕸️━━━〔 🕷️ 𝐃É𝐒𝐀𝐂𝐓𝐈𝐕É 〕━━━🕸️\n` +
                `│\n` +
                `│ 🔓 Anti-tag: *OFF*\n` +
                `│ 📌 Tags libres pour tous.\n` +
                `│\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )

        } else if (action === 'warn') {
            // Mode avertissement
            setAntiTagConfig(sender, { mode: 'warn' })
            await sendMessage(sock, sender,
                `🕸️━━━〔 ⚙️ 𝐂𝐎𝐍𝐅𝐈𝐆 𝐀𝐍𝐓𝐈-𝐓𝐀𝐆 〕━━━🕸️\n\n` +
                `│ ⚠️ Mode: *AVERTISSEMENT*\n` +
                `│ Le Système envoie un warn\n` +
                `│ au lieu de supprimer.\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )

        } else if (action === 'delete') {
            // Mode suppression
            setAntiTagConfig(sender, { mode: 'delete' })
            await sendMessage(sock, sender,
                `🕸️━━━〔 ⚙️ 𝐂𝐎𝐍𝐅𝐈𝐆 𝐀𝐍𝐓𝐈-𝐓𝐀𝐆 〕━━━🕸️\n\n` +
                `│ 🗑️ Mode: *SUPPRESSION*\n` +
                `│ Le Système supprime les\n` +
                `│ messages violateurs.\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )

        } else if (action === 'seuil' && args[1]) {
            // Définir le seuil de mentions
            const seuil = parseInt(args[1])
            if (isNaN(seuil) || seuil < 1 || seuil > 100) {
                return await sendMessage(sock, sender,
                    `│ *Seuil invalide!*\n\nEntrez un nombre entre *1* et *100*.`
                )
            }
            setAntiTagConfig(sender, { seuil })
            await sendMessage(sock, sender,
                `🕸️━━━〔 ⚙️ 𝐂𝐎𝐍𝐅𝐈𝐆 𝐀𝐍𝐓𝐈-𝐓𝐀𝐆 〕━━━🕸️\n\n` +
                `│ 🔢 Seuil défini: *${seuil} mentions*\n` +
                `│ Tout message avec plus de\n` +
                `│ ${seuil} tags sera bloqué.\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )

        } else {
            // Afficher le statut
            const status = isAntiTagEnabled(sender)
            const statusText = status ? '⚙️ *ACTIVÉ*' : '🕷️ *DÉSACTIVÉ*'
            await sendMessage(sock, sender,
                `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                `│  🏷️ *ANTI-TAG* 🏷️  \n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `🕸️━━━〔 👁️ 𝐒𝐓𝐀𝐓𝐔𝐓 〕━━━🕸️\n` +
                `│\n` +
                `│ 📊 Statut: ${statusText}\n` +
                `│ 🔢 Seuil: *${currentSeuil} mentions*\n` +
                `│ ⚙️ Mode: *${currentMode === 'warn' ? '⚠️ Warn' : '🗑️ Delete'}*\n` +
                `│\n` +
                `│ 💡 *syntaxe:*\n` +
                `│ • *.antitag on/off*\n` +
                `│ • *.antitag seuil 5*\n` +
                `│ • *.antitag warn/delete*\n` +
                `│\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
        }

    } catch (error) {
        console.error("❌ Erreur antitag:", error)
        await sendMessage(sock, sender,
            `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
            `│ ${error.message || 'opération échoué inconnue'}\n\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        )
    }
}
