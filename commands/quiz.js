// commands/quiz.js — NOUVELLE COMMANDE 🧠
// Questions de culture générale en français avec timer
import { sendMessage } from '../lib/sendMessage.js'

const QUESTIONS = [
  { q:"Quelle est la capitale de la France ?", r:["paris"], explication:"🗼 Paris est la capitale et la plus grande ville de France." },
  { q:"Combien de côtés a un hexagone ?", r:["6","six"], explication:"📐 Hexa = 6 en grec." },
  { q:"Quel est le plus grand océan du monde ?", r:["pacifique","océan pacifique"], explication:"🌊 L'océan Pacifique couvre 30% de la surface terrestre." },
  { q:"En quelle année a eu lieu la Révolution française ?", r:["1789"], explication:"⚔️ La Révolution française a débuté le 14 juillet 1789." },
  { q:"Quelle planète est la plus proche du Soleil ?", r:["mercure"], explication:"☀️ Mercure est la planète la plus proche du Soleil." },
  { q:"Qui a peint la Joconde ?", r:["léonard de vinci","leonard de vinci","da vinci"], explication:"🎨 La Joconde (Mona Lisa) a été peinte par Léonard de Vinci vers 1503-1506." },
  { q:"Quel est le symbole chimique de l'or ?", r:["au"], explication:"⚗️ Au vient du latin 'Aurum' qui signifie or." },
  { q:"Combien de joueurs dans une équipe de football ?", r:["11","onze"], explication:"⚽ Chaque équipe de football a 11 joueurs sur le terrain." },
  { q:"Quelle est la langue la plus parlée dans le monde ?", r:["mandarin","chinois","chinois mandarin"], explication:"🌍 Le mandarin est parlé par plus de 1 milliard de personnes." },
  { q:"Quel animal est le plus rapide du monde ?", r:["guépard"], explication:"🐆 Le guépard peut atteindre 110 km/h en sprint." },
  { q:"Combien y a-t-il d'os dans le corps humain adulte ?", r:["206"], explication:"🦴 Le corps humain adulte compte 206 os." },
  { q:"Quel est le plus haut sommet du monde ?", r:["everest","mont everest"], explication:"🏔️ Le Mont Everest culmine à 8 849 mètres." },
  { q:"Quelle est la formule chimique de l'eau ?", r:["h2o"], explication:"💧 H2O : 2 atomes d'hydrogène et 1 d'oxygène." },
  { q:"Qui a écrit 'Les Misérables' ?", r:["victor hugo"], explication:"📚 Victor Hugo a publié Les Misérables en 1862." },
  { q:"Quelle est la monnaie du Japon ?", r:["yen"], explication:"🇯🇵 Le yen est la monnaie officielle du Japon." },
  { q:"Combien de secondes y a-t-il dans une heure ?", r:["3600"], explication:"⏰ 1h = 60min × 60sec = 3600 secondes." },
  { q:"Quel est le continent le plus grand du monde ?", r:["asie"], explication:"🌏 L'Asie couvre 44 millions de km² environ." },
  { q:"Qui a inventé le téléphone ?", r:["alexander graham bell","graham bell","bell"], explication:"📞 Alexander Graham Bell a breveté le téléphone en 1876." },
  { q:"Quelle couleur obtient-on en mélangeant le bleu et le jaune ?", r:["vert"], explication:"🎨 Bleu + Jaune = Vert (couleurs primaires)." },
  { q:"Quelle est la vitesse de la lumière (en km/s) ?", r:["300000","299792","299 792"], explication:"💡 La lumière voyage à environ 299 792 km/s dans le vide." }
]

// Sessions de quiz actives { jid: { question, reponses, timeout, explication } }
const activeSessions = new Map()

export default async function quiz(sock, sender, args, msg) {
    const sub = args[0]?.toLowerCase()

    // Arrêter le quiz
    if (sub === 'stop' || sub === 'fin') {
        if (activeSessions.has(sender)) {
            clearTimeout(activeSessions.get(sender).timeout)
            activeSessions.delete(sender)
            return await sendMessage(sock, sender, `🕸️━━━〔 🛑 𝐐𝐔𝐈𝐙 𝐀𝐑𝐑Ê𝐓É 〕━━━🕸️\n│  Le quiz a été arrêté.\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`)
        }
        return await sendMessage(sock, sender, `👁️ Aucun quiz en cours.`)
    }

    // Vérifier la réponse
    if (activeSessions.has(sender)) {
        const session = activeSessions.get(sender)
        const userAnswer = args.join(' ').toLowerCase().trim()
        const isCorrect = session.reponses.some(r => r.toLowerCase() === userAnswer)

        clearTimeout(session.timeout)
        activeSessions.delete(sender)

        if (isCorrect) {
            return await sendMessage(sock, sender,
                `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                `│   ⚙️ *BONNE RÉPONSE !* 🎉        🕷️\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `🏆 Félicitations, c'est correct !\n\n` +
                `📚 *Explication:*\n${session.explication}\n\n` +
                `💡 Lance un nouveau quiz avec \`.quiz\``
            )
        } else {
            return await sendMessage(sock, sender,
                `🕸️━━━〔 🕷️ 𝐌𝐀𝐔𝐕𝐀𝐈𝐒𝐄 𝐑É𝐏𝐎𝐍𝐒𝐄 〕━━━🕸️\n\n` +
                `│  Dommage ! La bonne réponse était:\n` +
                `│  *${session.reponses[0]}*\n\n` +
                `│  📚 ${session.explication}\n\n` +
                `│  💡 Retente avec \`.quiz\`\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
        }
    }

    // Nouvelle question
    const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)]

    const timeoutId = setTimeout(async () => {
        if (activeSessions.has(sender)) {
            activeSessions.delete(sender)
            await sendMessage(sock, sender,
                `🕸️━━━〔 ⏰ 𝐓𝐄𝐌𝐏𝐒 É𝐂𝐎𝐔𝐋É ! 〕━━━🕸️\n\n` +
                `│  La réponse était: *${q.r[0]}*\n` +
                `│  📚 ${q.explication}\n\n` +
                `│  💡 Rejoue avec \`.quiz\`\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            ).catch(() => {})
        }
    }, 30000)

    activeSessions.set(sender, { question: q.q, reponses: q.r, timeout: timeoutId, explication: q.explication })

    await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│   🧠 *QUIZ J.A.R.V.I.S.* 🧠        🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `❓ *Question:*\n${q.q}\n\n` +
        `⏰ *Tu as 30 secondes pour répondre!*\n` +
        `💬 *Réponds directement dans ce chat*\n\n` +
        `• \`.quiz stop\` pour arrêter\n` +
        `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n` +
        `_🤖 J.A.R.V.I.S. BOT — Quiz System_`
    )
}
