// commands/dare.js — 𝑴𝑼𝑹𝑨𝑺𝑨𝑲𝑰 𝐒𝐒𝐊 𓂀
// 😈 Défis enrichis avec catégories, niveaux de difficulté et mentions

import { sendMessage } from '../lib/sendMessage.js'

//══════════════════════════════════════
// BASE DE DÉFIS ÉTENDUE PAR CATÉGORIE
//══════════════════════════════════════

const DARES = {

  "😂 HUMOUR": [
    "Envoie une note vocale de 10 secondes en parlant comme un méchant de film.",
    "Écris une phrase dramatique comme si tu annonçais la fin du monde.",
    "Réponds aux 3 prochains messages uniquement avec des rimes.",
    "Imite le style d'écriture d'un utilisateur du groupe pendant 5 messages.",
    "Envoie un audio de toi en train de freestyler pendant 15 secondes minimum.",
    "Écris un poème de 4 lignes sur quelqu'un du groupe (bienveillant).",
    "Envoie un message comme si tu étais un robot en panne.",
    "Parle en Verlan pendant les 5 prochains messages.",
    "Commence chaque phrase par 'En tant que utilisateur légendaire...'",
    "Écris un message en majuscule SEULEMENT avec des points d'exclamation à la fin de chaque mot.",
    "Envoie un audio en imitant le cri de l'aigle pendant 10 secondes.",
    "Réponds à tous les messages pendant 10 minutes uniquement avec un seul emoji.",
    "Raconte une blague tellement mauvaise que tout le monde grogne.",
    "Imite un journaliste TV en faisant un reportage en direct sur ce qui se passe dans le groupe.",
    "Envoie un message d'amour excessif à quelqu'un du groupe (non romantique, amitié).",
    "Fais semblant d'être un détective et analyse le dernier message envoyé dans le groupe comme une preuve criminelle.",
  ],

  "😳 GÊNANT": [
    "Change ton nom de groupe pendant 5 minutes avec un surnom choisi par le groupe.",
    "Laisse le groupe choisir ta photo de profil pendant 10 minutes.",
    "Raconte une honte légère sans citer de nom.",
    "Avoue la dernière chose bizarre que tu as cherchée sur Google.",
    "Envoie le dernier texte copié sur ton téléphone.",
    "Révèle le titre de la dernière chanson que tu as écoutée.",
    "Dis à voix haute (vocal) le prénom de ton crush (peut être fictif).",
    "Révèle combien de temps tu passes sur les réseaux sociaux par jour (sois honnête).",
    "Montre ta galerie photo (juste le nombre de photos) et explique ta catégorie la plus remplie.",
    "Avoue la dernière fois que tu as menti dans ce groupe.",
    "Dis le nom du contact le plus bizarre sauvegardé dans ton téléphone.",
    "Envoie un selfie les yeux fermés maintenant.",
    "Révèle la dernière application que tu as téléchargée.",
    "Avoue quelque chose que tu fais en secret et que personne ne sait.",
  ],

  "🎭 CRÉATIF": [
    "Invente une publicité de 30 secondes pour un objet aléatoire que tu as près de toi.",
    "Écris le synopsis d'un film horrible en 3 lignes.",
    "Invente un nom de groupe pour votre bande et explique-le.",
    "Compose une chanson de 8 lignes minimum sur le thème de ce groupe.",
    "Invente un super-pouvoir absurde et décris comment tu l'utiliserais.",
    "Écris une lettre de motivation pour être 'meilleur utilisateur du groupe'.",
    "Invente une excuse créative pour arriver 2 heures en retard à un rendez-vous.",
    "Crée un menu complet d'un restaurant imaginaire avec des plats loufoques.",
    "Écris une critique de film de 5 lignes sur un film que tu n'as jamais vu.",
    "Invente un titre de livre basé sur la vie du groupe.",
    "Rédige les règles d'un jeu inventé par toi en 5 règles.",
    "Crée un slogan publicitaire pour toi-même en 10 mots maximum.",
    "Écris une histoire de 10 lignes où tu es le héros et quelqu'un du groupe est le méchant.",
  ],

  "🧠 QUIZ EXPRESS": [
    "Dis 5 pays d'Afrique en moins de 10 secondes (vocal obligatoire).",
    "Épelle à l'envers le mot 'extraordinaire' en vocal.",
    "Cite 7 chanteurs francophones en moins de 20 secondes.",
    "Dis les tables de multiplication de 7 de 1 à 10 en vocal.",
    "Nomme 5 capitales d'Afrique de l'Ouest en 15 secondes.",
    "Compte à rebours de 30 à 1 en vocal sans te tromper.",
    "Dis 10 mots commençant par la lettre 'P' en 15 secondes.",
    "Cite 6 sports olympiques en 10 secondes.",
  ],

  "📡 SOCIAL": [
    "Fais un compliment sincère à la dernière personne qui a envoyé un message.",
    "Fais une déclaration d'amitié exagérée à quelqu'un du groupe.",
    "Envoie un GIF ou sticker qui décrit ton humeur actuelle.",
    "Tague la personne du groupe que tu considères comme la plus drôle.",
    "Dis quelque chose de positif sur chaque admin du groupe.",
    "Partage un conseil de vie en 3 phrases maximum.",
    "Envoie le dernier mème que tu as sauvegardé.",
    "Raconte en 5 lignes comment tu as rencontré quelqu'un dans ce groupe.",
    "Donne un surnom à chaque administrateur et explique pourquoi.",
    "Dis honnêtement ce que tu aimes dans ce groupe.",
    "Envoie un message de motivation pour quelqu'un qui en a besoin dans le groupe.",
    "Partage le meilleur souvenir que tu as avec quelqu'un de ce groupe.",
  ],

  "🔥 EXTRÊME": [
    "Envoie une note vocale de 30 secondes en chantant une chanson populaire.",
    "Fais une vidéo de 15 secondes en train de danser et envoie-la.",
    "Change ta bio WhatsApp pendant 1 heure avec un texte choisi par le groupe.",
    "Envoie un message à une personne en dehors du groupe pour lui dire que tu penses à elle (capture obligatoire).",
    "Appelle quelqu'un au hasard dans ta liste de contacts et dis 'Bonjour, j'ai gagné un prix !' (raconter la réaction après).",
    "Laisse le groupe écrire ton prochain statut WhatsApp.",
    "Envoie une photo de ta main maintenant.",
    "Fais 20 pompes et envoie un vocal de ta respiration à la fin.",
    "Dis 3 vérités et 1 mensonge et laisse le groupe deviner.",
    "Active ton statut en ligne pendant 5 minutes et réponds à tous ceux qui t'écrivent.",
    "Mets le groupe en mode silencieux sauf pour ce groupe pendant 15 minutes.",
  ],

  "😈 DÉFI DU SYSTÈME": [
    "Le groupe choisit ton prochain statut WhatsApp et tu dois le garder 2 heures.",
    "Tu dois commencer tes 10 prochains messages par 'Votre propriétaire a parlé'.",
    "Envoie une note vocale de 45 secondes où tu racontes ta pire journée.",
    "Change ton nom de groupe en 'Nouvelle recrue du Système' pendant 30 minutes.",
    "Écris un discours de 15 lignes sur pourquoi tu mérites de survivre à l'apocalypse du Système.",
    "Révèle 3 choses que tu n'as jamais osé dire dans ce groupe.",
    "Demande à un autre utilisateur du groupe de choisir un défi pour toi.",
    "Envoie un vocal de toi en train de pleurer (fausse larme autorisée) pendant 10 secondes.",
    "Fais une déclaration publique dans le groupe sur ton pire défaut.",
    "Lance un sondage dans le groupe sur ta pire habitude.",
  ]
}

// Liste plate de tous les défis
const ALL_DARES = Object.values(DARES).flat()

// Catégories avec leurs emojis
const CATEGORY_LIST = Object.keys(DARES)

//══════════════════════════════════════
// UTILITAIRES
//══════════════════════════════════════

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function getRandomDare(category = null) {
  if (category) {
    const found = CATEGORY_LIST.find(c =>
      c.toLowerCase().includes(category.toLowerCase())
    )
    if (found && DARES[found]) return { dare: getRandom(DARES[found]), category: found }
  }
  const cat  = getRandom(CATEGORY_LIST)
  return { dare: getRandom(DARES[cat]), category: cat }
}

const REACTIONS = [
  "😈 Refuser, c'est offrir ton utilisateur au silence.",
  "🔥 Le Système observe. Ne le déçois pas.",
  "🤖 Aucune pitié pour les lâches.",
  "⚡ Le Système a choisi. Tu dois obéir.",
  "🌑 L'heure du jugement a sonné.",
  "👁️ Le Système ne pardonne pas les refus.",
  "🎭 Montre ce que tu vaux vraiment.",
  "⚙️ Seuls les braves survivent.",
]

//══════════════════════════════════════
// COMMANDE PRINCIPALE
//══════════════════════════════════════

export default async function dare(sock, sender, args, msg, ctx = {}) {
  try {
    const prefix = '.'
    const arg0   = args[0]?.toLowerCase()

    // ── LISTE DES CATÉGORIES ──────────────────────────────────
    if (arg0 === 'liste' || arg0 === 'list' || arg0 === 'categories') {
      const total = ALL_DARES.length
      let txt =
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `     🕷️ 😈 *DARE DU SYSTÈME* 🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️━━━〔 📂 𝐂𝐀𝐓É𝐆𝐎𝐑𝐈𝐄𝐒 〕━━━🕸️\n` +
        `│\n`

      CATEGORY_LIST.forEach((cat, i) => {
        txt += `│ ${i + 1}. ${cat} *(${DARES[cat].length} défis)*\n`
      })

      txt +=
        `│\n` +
        `│ 🎲 Total: *${total} défis disponibles*\n` +
        `│\n` +
        `│ 💡 *syntaxe:*\n` +
        `│ • \`${prefix}dare\` → Défi aléatoire\n` +
        `│ • \`${prefix}dare humour\` → Catégorie\n` +
        `│ • \`${prefix}dare extreme\` → Défis extrêmes\n` +
        `│ • \`${prefix}dare liste\` → Cette liste\n` +
        `│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`

      return await sendMessage(sock, sender, txt)
    }

    // ── DÉFI AVEC CATÉGORIE SPÉCIFIQUE ────────────────────────
    const category = arg0 && arg0 !== 'liste' ? args.join(' ') : null
    const { dare: selectedDare, category: selectedCat } = getRandomDare(category)

    if (category) {
      const found = CATEGORY_LIST.find(c => c.toLowerCase().includes(category.toLowerCase()))
      if (!found) {
        return await sendMessage(sock, sender,
          `│ Catégorie introuvable.\n\n` +
          `Catégories disponibles :\n` +
          CATEGORY_LIST.map((c, i) => `${i + 1}. ${c}`).join('\n') +
          `\n\n💡 \`${prefix}dare liste\` pour les détails`
        )
      }
    }

    const reaction = getRandom(REACTIONS)
    const total    = ALL_DARES.length

    await sendMessage(sock, sender,
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `     🕷️ 😈 *DARE DU SYSTÈME* 🕷️\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️━━━〔 ${selectedCat} 〕━━━🕸️\n` +
      `│\n` +
      `│ 🎯 *TON DÉFI:*\n` +
      `│\n` +
      `│ ${selectedDare}\n` +
      `│\n` +
      `│ ${reaction}\n` +
      `│\n` +
      `│ 🎲 *${total} défis disponibles*\n` +
      `│ 💡 \`${prefix}dare liste\` → voir catégories\n` +
      `│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )

  } catch (e) {
    console.error('❌ dare error:', e)
    await sendMessage(sock, sender, `│ opération échoué dare: ${e.message}`)
  }
}
