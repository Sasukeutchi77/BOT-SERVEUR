// commands/quote.js — NOUVELLE COMMANDE
// 💬 Citations inspirantes aléatoires

import { sendMessage } from '../lib/sendMessage.js'

const QUOTES = [
    { text: "La vie est ce qui arrive quand tu es occupé à faire d'autres plans.", author: "John Lennon" },
    { text: "Le succès, c'est d'aller d'échec en échec sans perdre son enthousiasme.", author: "Winston Churchill" },
    { text: "La seule façon de faire du bon travail est d'aimer ce que vous faites.", author: "Steve Jobs" },
    { text: "Soyez le changement que vous voulez voir dans le monde.", author: "Mahatma Gandhi" },
    { text: "L'imagination est plus importante que la connaissance.", author: "Albert Einstein" },
    { text: "La chose la plus difficile, c'est la décision d'agir. Le reste n'est que de la ténacité.", author: "Amelia Earhart" },
    { text: "Vous ratez 100% des tirs que vous ne prenez pas.", author: "Wayne Gretzky" },
    { text: "La véritable mesure de l'intelligence est la capacité de changer.", author: "Albert Einstein" },
    { text: "Ne jugez pas chaque journée par la récolte que vous faites, mais par les graines que vous semez.", author: "Robert Louis Stevenson" },
    { text: "Le seul impossible, c'est ce qu'on n'essaie pas.", author: "Nelson Mandela" },
    { text: "La persévérance, c'est ce qui rend l'impossible possible, le possible probable, et le probable réalisé.", author: "Robert Half" },
    { text: "Croyez que vous pouvez et vous êtes à mi-chemin.", author: "Theodore Roosevelt" },
    { text: "L'éducation est l'arme la plus puissante que vous pouvez utiliser pour changer le monde.", author: "Nelson Mandela" },
    { text: "Si tu veux aller vite, marche seul. Si tu veux aller loin, marche ensemble.", author: "Proverbe africain" },
    { text: "Le génie, c'est 1% d'inspiration et 99% de transpiration.", author: "Thomas Edison" },
    { text: "Tout ce que vous pouvez faire, ou rêvez de pouvoir faire, commencez-le.", author: "Goethe" },
    { text: "La vie ne se mesure pas au nombre de respirations que nous prenons, mais aux moments qui nous coupent le souffle.", author: "Maya Angelou" },
    { text: "Il n'est jamais trop tard pour devenir ce que vous auriez pu être.", author: "George Eliot" },
    { text: "Un voyage de mille lieues commence toujours par un premier pas.", author: "Lao Tseu" },
    { text: "Celui qui déplace des montagnes commence par déplacer de petites pierres.", author: "Confucius" },
]

export default async function quote(sock, sender, args, msg) {
    try {
        const random = QUOTES[Math.floor(Math.random() * QUOTES.length)]

        await sendMessage(sock, sender,
            `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
            `│  💬 *CITATION DU JOUR*  \n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
            `🕸️━━━〔 ✨ 𝐒𝐀𝐆𝐄𝐒𝐒𝐄 〕━━━🕸️\n` +
            `│\n` +
            `│ _"${random.text}"_\n` +
            `│\n` +
            `│ — *${random.author}*\n` +
            `│\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
            `💡 _Tapez à nouveau pour une autre citation_`
        )

    } catch (e) {
        await sendMessage(sock, sender, `│ opération échoué: ${e.message}`)
    }
}
