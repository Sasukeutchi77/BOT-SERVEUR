// commands/joke.js — NOUVELLE COMMANDE
// 😂 Blagues aléatoires

import { sendMessage } from '../lib/sendMessage.js'

const JOKES = [
    { question: "Pourquoi les plongeurs plongent-ils toujours en arrière ?", answer: "Parce que s'ils plongeaient en avant, ils tomberaient dans le bateau !" },
    { question: "Qu'est-ce qu'un canif ?", answer: "Le petit fils du caniche !" },
    { question: "Comment appelle-t-on un chat tombé dans un pot de peinture le jour de Noël ?", answer: "Un chat-peint de Noël !" },
    { question: "Pourquoi Batman est-il entré dans la bibliothèque en courant ?", answer: "Parce qu'il cherchait Robin !" },
    { question: "Qu'est-ce qu'une vache qui disparaît ?", answer: "Un vachement bonne blague !" },
    { question: "Quel est le comble pour un électricien ?", answer: "De ne pas être au courant !" },
    { question: "Qu'est-ce qu'un vampire végétarien ?", answer: "Le Comte Haricots !" },
    { question: "Pourquoi les fantômes ne mentent-ils pas ?", answer: "Parce qu'on peut voir à travers eux !" },
    { question: "Qu'est-ce qu'un crocodile qui surveille la cour d'école ?", answer: "Un sac à dents !" },
    { question: "Quel est le sport préféré des chasseurs ?", answer: "La course au gibier !" },
    { question: "Pourquoi les plantes ne peuvent pas utiliser Internet ?", answer: "Parce qu'elles n'ont pas de racines WiFi !" },
    { question: "Comment s'appelle un chat tombé dans un puits ?", answer: "Un miaou-crobate !" },
    { question: "Quelle est la différence entre une orange ?", answer: "Les deux roues car un vélo n'a pas de toit !" },
    { question: "Qu'est-ce qu'un poussin qui ouvre des huîtres ?", answer: "Le petit bibi !" },
    { question: "Pourquoi les éléphants ne vont-ils pas sur Internet ?", answer: "Parce qu'ils ont peur de la souris !" },
]

export default async function joke(sock, sender, args, msg) {
    try {
        const random = JOKES[Math.floor(Math.random() * JOKES.length)]

        await sendMessage(sock, sender,
            `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
            `│  😂 *BLAGUE DU JOUR*  \n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
            `🕸️━━━〔 🎭 𝐐𝐔𝐄𝐒𝐓𝐈𝐎𝐍 〕━━━🕸️\n` +
            `│\n` +
            `│ ❓ ${random.question}\n` +
            `│\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
            `🕸️━━━〔 😂 𝐑É𝐏𝐎𝐍𝐒𝐄 〕━━━🕸️\n` +
            `│\n` +
            `│ ⚙️ ${random.answer}\n` +
            `│\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
            `😂😂😂`
        )

    } catch (e) {
        await sendMessage(sock, sender, `│ opération échoué: ${e.message}`)
    }
}
