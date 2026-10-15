// commands/tictactoe.js — Morpion vs l'IA 🎮
import { sendMessage } from '../lib/sendMessage.js'

const games = new Map()

function makeBoard() { return [' ',' ',' ',' ',' ',' ',' ',' ',' '] }

function renderBoard(b) {
    return (
        `\`\`\`\n` +
        ` ${b[0]} 🕷️ ${b[1]} 🕷️ ${b[2]} \n` +
        `───┼───┼───\n` +
        ` ${b[3]} 🕷️ ${b[4]} 🕷️ ${b[5]} \n` +
        `───┼───┼───\n` +
        ` ${b[6]} 🕷️ ${b[7]} 🕷️ ${b[8]} \n` +
        `\`\`\``
    )
}

function checkWin(b, p) {
    const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
    return wins.some(w => w.every(i => b[i] === p))
}

function isDraw(b) { return b.every(c => c !== ' ') }

function aiMove(b) {
    // Essayer de gagner
    for (let i = 0; i < 9; i++) {
        if (b[i] === ' ') { b[i] = 'O'; if (checkWin(b, 'O')) return i; b[i] = ' ' }
    }
    // Bloquer le joueur
    for (let i = 0; i < 9; i++) {
        if (b[i] === ' ') { b[i] = 'X'; if (checkWin(b, 'X')) { b[i] = ' '; return i; } b[i] = ' ' }
    }
    // Centre
    if (b[4] === ' ') return 4
    // Coin aléatoire
    const corners = [0,2,6,8].filter(i => b[i] === ' ')
    if (corners.length) return corners[Math.floor(Math.random() * corners.length)]
    // Côté libre
    return b.findIndex(c => c === ' ')
}

export default async function tictactoe(sock, sender, args, msg) {
    const sub = args[0]?.toLowerCase()

    if (sub === 'stop' || sub === 'fin') {
        games.delete(sender)
        return await sendMessage(sock, sender, `🛑 Partie de morpion arrêtée.`)
    }

    // Coup du joueur (numéro 1-9)
    if (games.has(sender)) {
        const pos = parseInt(sub) - 1
        if (isNaN(pos) || pos < 0 || pos > 8) {
            return await sendMessage(sock, sender, `│ Choisis un numéro entre 1 et 9 (case libre).`)
        }
        const g = games.get(sender)
        if (g.board[pos] !== ' ') {
            return await sendMessage(sock, sender, `│ Cette case est déjà prise ! Choisis une autre (1-9).`)
        }

        g.board[pos] = 'X'

        if (checkWin(g.board, 'X')) {
            games.delete(sender)
            return await sendMessage(sock, sender,
                `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                `│   🏆 *TU AS GAGNÉ !* 🎉          🕷️\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                renderBoard(g.board) + `\n\n` +
                `🌟 Bravo champion ! Tu as battu l'IA !\n` +
                `💡 Rejoue: \`.tictactoe\``
            )
        }
        if (isDraw(g.board)) {
            games.delete(sender)
            return await sendMessage(sock, sender,
                `🕸️━━━〔 🤝 𝐌𝐀𝐓𝐂𝐇 𝐍𝐔𝐋 ! 〕━━━🕸️\n\n` +
                renderBoard(g.board) + `\n\n` +
                `│  Bien joué ! Pas de gagnant.\n` +
                `│  💡 Rejoue: \`.tictactoe\`\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
        }

        // Tour de l'IA
        const aiPos = aiMove(g.board)
        g.board[aiPos] = 'O'

        if (checkWin(g.board, 'O')) {
            games.delete(sender)
            return await sendMessage(sock, sender,
                `🕸️━━━〔 😈 𝐋'𝐈𝐀 𝐀 𝐆𝐀𝐆𝐍É ! 〕━━━🕸️\n\n` +
                renderBoard(g.board) + `\n\n` +
                `│  L'IA t'a battu cette fois !\n` +
                `│  💡 Revanche: \`.tictactoe\`\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
        }
        if (isDraw(g.board)) {
            games.delete(sender)
            return await sendMessage(sock, sender,
                `🕸️━━━〔 🤝 𝐌𝐀𝐓𝐂𝐇 𝐍𝐔𝐋 ! 〕━━━🕸️\n\n` +
                renderBoard(g.board) + `\n\n` +
                `│  Ni toi, ni l'IA !\n` +
                `│  💡 Rejoue: \`.tictactoe\`\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
        }

        return await sendMessage(sock, sender,
            `🎮 *TON TOUR !*\n\n` +
            renderBoard(g.board) + `\n\n` +
            `▶️ Joue: tape le numéro (1-9)\n` +
            `│ = Toi  🕷️  ⭕ = IA`
        )
    }

    // Nouvelle partie
    const board = makeBoard()
    games.set(sender, { board })

    await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│   🕷️⭕ *MORPION vs IA* ⭕🕷️       🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `📋 *Légende des cases:*\n` +
        `\`\`\`\n 1 🕷️ 2 🕷️ 3 \n───┼───┼───\n 4 🕷️ 5 🕷️ 6 \n───┼───┼───\n 7 🕷️ 8 🕷️ 9 \n\`\`\`\n\n` +
        `▶️ *Tu joues en premier ! (X)*\n` +
        `💬 Tape le numéro de la case (1-9)\n` +
        `🛑 \`.tictactoe stop\` pour arrêter`
    )
}
