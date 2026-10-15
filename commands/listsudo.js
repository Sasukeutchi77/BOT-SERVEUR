// commands/listsudo.js — VERSION CORRIGÉE
// ╔══════════════════════════════════════╗
// ║   LISTSUDO - LISTE DES SUDO          ║
// ╚══════════════════════════════════════╝

import { sendMessage } from '../lib/sendMessage.js'
import { config } from '../config.js'
import { cleanNumber, getSenderJid, getSudoList, isDeployer, isSudo } from '../lib/ownerSystem.js'

function formatNumber(jid) {
    const num = cleanNumber(jid)
    return `+${num}`
}

export default async function listsudo(sock, sender, args, msg) {
    try {
        // Déterminer le vrai sender
        const userId = getSenderJid(msg, sock)

        // Owner ou sudo peuvent voir la liste
        if (!isDeployer(userId) && !isSudo(userId)) {
            await sendMessage(sock, sender,
                `🕸️━━━〔 ⛔ 𝐀𝐂𝐂È𝐒 𝐑𝐄𝐅𝐔𝐒É 〕━━━🕸️\n\n` +
                `│ 🔒 Réservé aux *PROPRIÉTAIRE/SUDO*.\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
            return
        }

        const sudoData = getSudoList()

        let text =
            `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
            `│  📋 *LISTE DES SUDO*  \n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n`

        // Propriétaire
        text +=
            `🕸️━━━〔 👑 𝐏𝐫𝐨𝐩𝐫𝐢é𝐭𝐚𝐢𝐫𝐞 〕━━━🕸️\n` +
            `│\n` +
            `│ 🤖 ${formatNumber(sudoData.deployer)}\n` +
            `│   _(Déployeur — accès total)_\n` +
            `│\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n`

        // SUDO depuis .env
        if (sudoData.direct.length > 0) {
            text += `🕸️━━━〔 💾 SUDO .ENV (${sudoData.direct.length}) 〕━━━🕸️\n│\n`
            sudoData.direct.forEach((jid, i) => {
                const isYou = cleanNumber(jid) === cleanNumber(userId)
                text += `│ 🟡 ${i + 1}. ${formatNumber(jid)}${isYou ? ' 👈 (vous)' : ''}\n`
            })
            text += `│\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n`
        }

        // SUDO depuis fichier
        if (sudoData.file.length > 0) {
            text += `🕸️━━━〔 📁 SUDO FICHIER (${sudoData.file.length}) 〕━━━🕸️\n│\n`
            sudoData.file.forEach((jid, i) => {
                const isYou = cleanNumber(jid) === cleanNumber(userId)
                text += `│ ⚙️ ${i + 1}. ${formatNumber(jid)}${isYou ? ' 👈 (vous)' : ''}\n`
            })
            text += `│\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n`
        }

        if (sudoData.direct.length === 0 && sudoData.file.length === 0) {
            text += `🕸️━━━〔 👁️ 𝐈𝐍𝐅𝐎 〕━━━🕸️\n\n│ Aucun SUDO supplémentaire.\n│ Seul le Propriétaire est actif.\n\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n`
        }

        text += `📊 *Total SUDO:* ${sudoData.count.total} utilisateur(s)\n`
        text += `\n💡 Pour ajouter: *.setsudo @user*\n💡 Pour retirer: *.delsudo @user*`

        await sendMessage(sock, sender, text)

    } catch (err) {
        console.error('❌ Erreur listsudo:', err)
        await sendMessage(sock, sender, `│ opération échoué: ${err.message}`)
    }
}
