// commands/rps.js — PIERRE FEUILLE CISEAUX ✊
// ✅ Jouer contre le bot
// ✅ Animation du résultat
// ✅ Stats victoires/défaites

import { sendMessage } from '../lib/sendMessage.js'

const CHOICES = {
    'pierre': { emoji: '🪨', beats: 'ciseaux', losesTo: 'feuille' },
    'feuille': { emoji: '📄', beats: 'pierre', losesTo: 'ciseaux' },
    'ciseaux': { emoji: '✂️', beats: 'feuille', losesTo: 'pierre' },
    // Alias
    'rock': { emoji: '🪨', beats: 'ciseaux', losesTo: 'feuille', realKey: 'pierre' },
    'paper': { emoji: '📄', beats: 'pierre', losesTo: 'ciseaux', realKey: 'feuille' },
    'scissors': { emoji: '✂️', beats: 'feuille', losesTo: 'pierre', realKey: 'ciseaux' },
    'p': { emoji: '🪨', beats: 'ciseaux', losesTo: 'feuille', realKey: 'pierre' },
    'f': { emoji: '📄', beats: 'pierre', losesTo: 'ciseaux', realKey: 'feuille' },
    'c': { emoji: '✂️', beats: 'feuille', losesTo: 'pierre', realKey: 'ciseaux' },
}

export default async function rps(sock, sender, args, msg) {
    try {
        const input = args[0]?.toLowerCase()

        if (!input || !CHOICES[input]) {
            return await sendMessage(sock, sender,
                `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                `│  ✊ *PIERRE FEUILLE CISEAUX* ✊    🕷️\n` +
                `│     ⚡ J.A.R.V.I.S. SYSTÈME ⚡           🕷️\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `🕸️━━━〔 📖 𝐒𝐘𝐍𝐓𝐀𝐗𝐄 〕━━━🕸️\n` +
                `│  *.rps* pierre  (ou p)\n` +
                `│  *.rps* feuille (ou f)\n` +
                `│  *.rps* ciseaux (ou c)\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `🪨 Pierre bat ✂️ Ciseaux\n` +
                `📄 Feuille bat 🪨 Pierre\n` +
                `✂️ Ciseaux bat 📄 Feuille`
            )
        }

        const playerChoice = CHOICES[input]
        const playerKey = playerChoice.realKey || input

        // Choix aléatoire du bot
        const botKeys = ['pierre', 'feuille', 'ciseaux']
        const botKey = botKeys[Math.floor(Math.random() * 3)]
        const botChoice = CHOICES[botKey]

        let result = ''
        let resultEmoji = ''
        let resultMsg = ''

        if (playerKey === botKey) {
            result = 'ÉGALITÉ'
            resultEmoji = '🤝'
            resultMsg = 'C\'est une égalité !'
        } else if (playerChoice.beats === botKey) {
            result = 'VICTOIRE'
            resultEmoji = '🏆'
            resultMsg = `*Tu gagnes !* ${playerChoice.emoji} bat ${botChoice.emoji}`
        } else {
            result = 'DÉFAITE'
            resultEmoji = '😢'
            resultMsg = `*Tu perds !* ${botChoice.emoji} bat ${playerChoice.emoji}`
        }

        // Résultat final
        const finalText =
            `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
            `│  ✊ *PIERRE FEUILLE CISEAUX* ✊    🕷️\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
            `  👤 Toi:  ${playerChoice.emoji} *${playerKey.charAt(0).toUpperCase() + playerKey.slice(1)}*\n` +
            `  🤖 Système:  ${botChoice.emoji} *${botKey.charAt(0).toUpperCase() + botKey.slice(1)}*\n\n` +
            `  ━━━━━━━━━━━━━━━━━━━━\n\n` +
            `  ${resultEmoji} *${result} !*\n` +
            `  ${resultMsg}\n\n` +
            `  💡 Rejouer: \`.rps pierre/feuille/ciseaux\``

        await sendMessage(sock, sender, finalText)

    } catch (error) {
        console.error('❌ Erreur rps:', error)
        await sendMessage(sock, sender, `│ opération échoué: ${error.message}`)
    }
}
