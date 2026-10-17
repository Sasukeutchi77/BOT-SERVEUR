// commands/calc.js — NOUVELLE COMMANDE
// 🧮 Calculatrice avancée

import { sendMessage } from '../lib/sendMessage.js'

export default async function calc(sock, sender, args, msg) {
    try {
        const expression = args.join(' ').trim()

        if (!expression) {
            return await sendMessage(sock, sender,
                `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                `│    🧮 *CALCULATRICE*    \n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `│ syntaxe: *.calc <expression>*\n\n` +
                `*Exemples:*\n` +
                `• \`.calc 2 + 2\`\n` +
                `• \`.calc 15 * 3\`\n` +
                `• \`.calc 100 / 4\`\n` +
                `• \`.calc 2 ** 10\`\n` +
                `• \`.calc Math.sqrt(144)\`\n` +
                `• \`.calc Math.PI * 5**2\``
            )
        }

        // Sécuriser l'évaluation
        const safeExpression = expression
            .replace(/[^0-9+\-*/.() **%√πMathsqrtabsceilfloorminmaxpowroundlogsin cos tan,e^]/g, '')

        // Remplacement des opérateurs spéciaux
        const processedExpr = expression
            .replace(/√/g, 'Math.sqrt')
            .replace(/π/g, 'Math.PI')
            .replace(/\^/g, '**')

        // Vérification sécurisée: pas de code dangereux
        const dangerous = /import|require|process|fetch|eval|Function|window|document|alert|console/i
        if (dangerous.test(processedExpr)) {
            return await sendMessage(sock, sender, `⛔ Expression non autorisée.`)
        }

        // Évaluation
        // eslint-disable-next-line no-new-func
        const result = Function(`'use strict'; return (${processedExpr})`)()

        if (typeof result !== 'number' || isNaN(result)) {
            return await sendMessage(sock, sender, `│ Résultat invalide pour: _${expression}_`)
        }

        const formattedResult = Number.isInteger(result)
            ? result.toLocaleString('fr-FR')
            : result.toFixed(8).replace(/\.?0+$/, '')

        await sendMessage(sock, sender,
            `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
            `│    🧮 *CALCULATRICE*    \n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
            `🕸️━━━〔 📊 𝐂𝐀𝐋𝐂𝐔𝐋 〕━━━🕸️\n` +
            `│\n` +
            `│ 📝 Expression:\n` +
            `│ _${expression}_\n` +
            `│\n` +
            `│ ⚙️ Résultat:\n` +
            `│ *${formattedResult}*\n` +
            `│\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        )

        console.log(`🧮 calc | ${expression} = ${result}`)

    } catch (e) {
        await sendMessage(sock, sender,
            `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
            `│ Expression invalide !\n` +
            `│ _${e.message}_\n\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        )
    }
}
