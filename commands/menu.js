// ╔══════════════════════════════════════════════════════════════╗
// ║                    ✦ J.A.R.V.I.S. — MENU ✦                      ║
// ║                         𝗣𝗿𝗲𝗺𝗶𝘂𝗺 𝗘𝗱𝗶𝘁𝗶𝗼𝗻                          ║
// ╚══════════════════════════════════════════════════════════════╝

import { config } from "../config.js"
import fs   from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)
const IMAGES_DIR = path.join(__dirname, "../assets")
const COMMANDS_DIR = __dirname
const CHANNEL_LINK = "https://whatsapp.com/channel/0029VbCRcEJLdQeYxw5g3m2o"
const CHANNEL_INVITE = "0029VbCRcEJLdQeYxw5g3m2o"
const FALLBACK_CHANNEL_JID = "1203631999978746@newsletter"
let channelJidCache = null

// ═════════════════════════════════════════════════════════════════
//  CATÉGORIES & ICÔNES
// ═════════════════════════════════════════════════════════════════

const CATEGORIES = {
  "🕷️ Général"            : ["menu","help","ping","info","uptime","whoami","vv","url","style","partager"],
  "🤖 Intelligence artificielle" : ["jarvis","summarize","ocr","transcribe"],
  "🎵 Médias"              : ["song","image","sticker","ytmp4","lyrics","download"],
  "🧰 Utilitaires"         : ["weather","translate","calc","quote","joke","horoscope","qrcode","tts","remind","schedule","poll","ascii"],
  "🎮 Jeux & divertissement": ["coinflip","dice","rps","tictactoe","quiz","dare"],
  "🎭 Fun & pièges"        : ["ship","gay","nitro","fakereac"],
  "🧪 Outils avancés"      : ["apkinfo"],
  "👥 Membres"             : ["kick","add","promote","demote","mute","unmute","tgl","kickall","kickallv2","ban","unban"],
  "⚙️ Configuration groupe" : ["group","groupconfig","setdesc","setppgc","link","tagall","hidetag","domination","group-tm","pseudo","pp","role","modlog","lock","approve","whitelist","blacklist"],
  "🛡️ Protections"         : ["antipurge","antidemote","antipromote","antitag","antilink","antichannel","antispam","antimention","antisuppression","antiword","antiflood","antibot"],
  "🕯️ Accueil & règles"    : ["welcome","goodbye","rules","notes","afk"],
  "🔗 Sessions liées"      : ["pairing","mypair","sessionsudo","stoppair"],
  "⚠️ Avertissements"      : ["warn","unwarn","warnlist","clearwarns"],
  "📊 Statistiques & gestion": ["status","stats","logs","backup","restore","maintenance","shutdown","profile","rank","leaderboard","daily","cmdinfo"],
  "⚙️ Modes du bot"        : ["public","private","prefix"],
  "👁️ Owner & sudo"        : ["sudo","setsudo","addsudo","delsudo","removesudo","listsudo","broadcast","reload","restart","stop","eval","exec","dit","pack","addpremium","removepremium"]
}

const CMD_ICONS = {
  menu:"📋", help:"🕷️", ping:"⚡", info:"🜏", uptime:"⏱️", vv:"👁️",
  url:"🔗", song:"🎵", image:"🖼️", style:"🕷️", sticker:"🎭", partager:"📤",
  jarvis:"🤖",
  prefix:"🔧", reload:"♻️", whoami:"🔍", lyrics:"🎤", ytmp4:"🎬", download:"⬇️",
  weather:"🌑", translate:"🌍", calc:"🧮", quote:"💬", joke:"🤖",
  horoscope:"⭐", qrcode:"🔳", tts:"🔊",
  remind:"⏰", schedule:"📆", poll:"📊", summarize:"📝", ocr:"🔎", transcribe:"🎙️",
  coinflip:"🪙", dice:"🎲", rps:"✊", tictactoe:"🕷️", quiz:"🧠",
  kick:"🗄️", add:"➕", promote:"⬆️", demote:"⬇️",
  mute:"🔇", unmute:"🔊", tgl:"🔀", kickall:"💥", kickallv2:"💣",
  ban:"🚫", unban:"⚙️",
  group:"⚙️", setdesc:"📝", setppgc:"🖼️", link:"🔗",
  tagall:"📢", hidetag:"📡", domination:"🔥", "group-tm":"⏰",
  pseudo:"✏️", pp:"🖼️", role:"🎭",
  groupconfig:"🗂️", modlog:"📓", lock:"🔒", approve:"⚙️", whitelist:"📃", blacklist:"🕷️️",
  antipurge:"🛡️", antidemote:"🕷️", antipromote:"🕷️",
  antitag:"🕷️", antilink:"🔗", antispam:"📵", antimention:"📵", antisuppression:"🗑️",
  antiword:"🚫", antiflood:"🌊", antibot:"🤖",
  welcome:"🕯️", goodbye:"🗄️", rules:"📜", notes:"📝", afk:"🤖",
  warn:"⚠️", unwarn:"⚙️", warnlist:"📋", clearwarns:"🧹",
  public:"⚙️", private:"🔒",
  sudo:"👁️", setsudo:"⭐", addsudo:"⭐", delsudo:"🕷️",
  removesudo:"🕷️", listsudo:"📋",
  broadcast:"📡", sendmsg:"📨", restart:"🔄", stop:"⏹️",
  eval:"💻", exec:"⌨️", dit:"💬", send:"📤", pack:"📦",
  addpremium:"💎", removepremium:"💎",
  ship:"🔥", gay:"🌈", ascii:"🔤", nitro:"💎", apkinfo:"📦", dare:"🎲",
  antichannel:"📡", fakereac:"🎭",
  pairing:"🔗", mypair:"📱", sessionsudo:"👤", stoppair:"❌"
}

const CMD_DESCRIPTIONS = {
  partager:"Partager les liens dans tous les groupes",
  menu:"Menu principal avec recherche", help:"Aide détaillée commande",
  ping:"Test latence système", info:"Informations système",
  uptime:"Temps d'activité", whoami:"Voir votre rôle & permissions",
  vv:"Voir médias masqués/expirés", url:"Outils URL avancés",
  style:"Style de texte personnalisé", song:"Télécharger Musique MP3",
  image:"Recherche d'images HD", sticker:"Créer stickers animés",
  ytmp4:"Télécharger Vidéo YouTube HD", lyrics:"Paroles synchronisées",
  download:"Télécharger vidéo/audio URL",
  weather:"Météo en temps réel", translate:"Traduction multilingue",
  calc:"Calculatrice scientifique", quote:"Citations inspirantes",
  joke:"Blagues aléatoires premium", horoscope:"Horoscope détaillé",
  qrcode:"Générer QR Code personnalisé", tts:"Texte en vocal HD",
  remind:"Rappels programmables", schedule:"Planificateur messages",
  poll:"Sondages interactifs", summarize:"Résumé IA intelligent",
  ocr:"Lecture texte image", transcribe:"Transcription audio",
  coinflip:"Pile ou face animé", dice:"Dés 3D animés",
  rps:"Pierre feuille ciseaux tournoi", tictactoe:"Morpion multijoueur",
  quiz:"Quiz culture générale", kick:"Expulser membre",
  add:"Ajouter membre", promote:"Promouvoir admin",
  demote:"Rétrograder admin", mute:"Museler un membre (auto-suppression)",
  unmute:"Réactiver un membre muté", tgl:"Bascule le silence total d'un membre", kickall:"Expulser tous (confirmation)", kickallv2:"Expulser tous V2",
  ban:"Bannir utilisateur", unban:"Débannir utilisateur",
  group:"Paramètres groupe avancés", setdesc:"Modifier description",
  setppgc:"Photo groupe HD", link:"Lien invitation",
  tagall:"Mentionner tous membres", hidetag:"Mention discrète administrateur",
  domination:"Mode domination groupe", "group-tm":"Minuterie groupe",
  pseudo:"Changer nom bot", pp:"Photo profil bot",
  role:"Voir rôle membre", groupconfig:"Configuration complète",
  modlog:"Journal modération", lock:"Verrouiller fonctions",
  approve:"Approuver membre", whitelist:"Liste blanche",
  blacklist:"Liste noire",
  antipurge:"Anti-purge messages", antidemote:"Anti-rétrogradation auto",
  antipromote:"Anti-promotion non autorisée", antitag:"Anti-tag massif",
  antilink:"Suppression liens auto", antispam:"Anti-spam intelligent",
  antimention:"Anti-mention abusive", antisuppression:"Anti-suppression auto",
  antiword:"Filtre mots interdits", antiflood:"Anti-flood intelligent", antibot:"Supprime les messages des autres bots",
  welcome:"Message bienvenue personnalisé", goodbye:"Message au revoir",
  rules:"Règles groupe détaillées", notes:"Notes groupe", afk:"Mode absent avancé",
  warn:"Avertir membre", unwarn:"Retirer avertissement",
  warnlist:"Liste avertissements", clearwarns:"Effacer historique",
  public:"Mode public", private:"Mode privé",
  sudo:"commandes Propriétaire", setsudo:"Ajouter sudo",
  addsudo:"Ajouter sudo", delsudo:"Retirer sudo",
  removesudo:"Retirer sudo", listsudo:"Lister sudos",
  broadcast:"Diffusion globale", sendmsg:"Envoyer message privé",
  reload:"Recharger commandes", restart:"Redémarrage système",
  stop:"Arrêt sécurisé", eval:"Exécution JavaScript", exec:"Exécution système",
  dit:"Faire parler bot", send:"Envoyer fichier", pack:"Pack stickers",
  addpremium:"Ajouter premium", removepremium:"Retirer premium",
  ship:"Test compatibilité amour", gay:"Compteur aléatoire",
  ascii:"Art ASCII premium", nitro:"Générateur Nitro fake",
  apkinfo:"Analyseur APK détaillé", dare:"Défi du Système",
  antichannel:"Bloquer transferts de chaînes",
  fakereac:"Réactions emoji fake sur chaîne",
  status:"Statut détaillé du système", stats:"Statistiques d'utilisation",
  logs:"Consulter les journaux système", backup:"Sauvegarder les données",
  restore:"Restaurer une sauvegarde", maintenance:"Mode maintenance",
  shutdown:"Éteindre le système", profile:"Voir ton profil (XP, niveau)",
  rank:"Ton classement XP", leaderboard:"Classement top 10",
  daily:"Récompense quotidienne", cmdinfo:"Détails d'une commande",
  prefix:"Changer le préfixe des commandes",
  jarvis:"Discuter avec l'IA (Groq)",
  mypair:"Voir tes sessions liées", pairing:"Lier ton propre numéro",
  sessionsudo:"Gérer les opérateurs de ta session",
  stoppair:"Détacher une session liée"
}

// ═════════════════════════════════════════════════════════════════
//  FONCTIONS UTILITAIRES
// ═════════════════════════════════════════════════════════════════

const SEP = "▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬"

// ── Conversion typographique (Unicode Mathematical Alphanumeric) ──
// IMPORTANT : ces caractères stylés ne sont produits QUE par ces
// fonctions, jamais recopiés comme identifiants de code — c'est ce
// qui avait causé des bugs "... is not defined" par le passé.

// Gras sérif : 𝐀𝐁𝐂 𝐚𝐛𝐜 𝟎𝟏𝟐 — utilisé pour les commandes et les stats
function toBoldSerif(text) {
  return [...text].map(ch => {
    const code = ch.codePointAt(0)
    if (code >= 65 && code <= 90)  return String.fromCodePoint(0x1D400 + (code - 65))  // A-Z
    if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D41A + (code - 97))  // a-z
    if (code >= 48 && code <= 57)  return String.fromCodePoint(0x1D7CE + (code - 48))  // 0-9
    return ch
  }).join("")
}

// Gras sans-sérif : 𝗔𝗕𝗖 𝗮𝗯𝗰 𝟬𝟭𝟮 — utilisé pour les titres de catégories
function toSansBold(text) {
  return [...text].map(ch => {
    const code = ch.codePointAt(0)
    if (code >= 65 && code <= 90)  return String.fromCodePoint(0x1D5D4 + (code - 65))
    if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D5EE + (code - 97))
    if (code >= 48 && code <= 57)  return String.fromCodePoint(0x1D7EC + (code - 48))
    return ch
  }).join("")
}

// Gras italique sérif : 𝑨𝑩𝑪 𝒂𝒃𝒄 — utilisé pour "SASAKI-PROJET"
// (pas de variantes chiffrées en gras italique : les chiffres restent en gras sérif)
function toBoldItalicSerif(text) {
  return [...text].map(ch => {
    const code = ch.codePointAt(0)
    if (code >= 65 && code <= 90)  return String.fromCodePoint(0x1D468 + (code - 65))
    if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D482 + (code - 97))
    if (code >= 48 && code <= 57)  return String.fromCodePoint(0x1D7CE + (code - 48))
    return ch
  }).join("")
}

// Soulignage+surlignage lettre par lettre : L̲̅O̲̅R̲̅D̲̅ — pour la bannière finale
function toUnderlineOverline(text) {
  return [...text].map(ch => ch + "\u0332\u0305").join("")
}

function getLocalImages() {
  try {
    if (!fs.existsSync(IMAGES_DIR)) return []
    return fs.readdirSync(IMAGES_DIR)
      .filter(f => [".jpg",".jpeg",".png",".gif",".webp",".mp4"]
        .includes(path.extname(f).toLowerCase()))
      .map(f => path.join(IMAGES_DIR, f))
  } catch { return [] }
}

function getRandomImage() {
  const imgs = getLocalImages()
  if (!imgs.length) return null
  return imgs[Math.floor(Math.random() * imgs.length)]
}

// Envoie le média d'illustration du menu. Un .gif doit être envoyé comme
// vidéo avec gifPlayback pour s'animer sur WhatsApp — envoyé en "image",
// il resterait figé sur la première frame.
async function sendMenuMedia(sock, sender, filePath, caption, extra = {}) {
  const buffer = fs.readFileSync(filePath)
  const ext = path.extname(filePath).toLowerCase()

  if (ext === ".gif" || ext === ".mp4") {
    return sock.sendMessage(sender, {
      video: buffer,
      gifPlayback: true,
      caption,
      ...extra
    })
  }

  return sock.sendMessage(sender, {
    image: buffer,
    caption,
    ...extra
  })
}

function formatUptime() {
  const s   = Math.floor(process.uptime())
  const h   = Math.floor(s / 3600)
  const m   = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${m}m ${sec}s`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}

async function getChannelContextInfo(sock, botName) {
  if (!channelJidCache && typeof sock.newsletterMetadata === "function") {
    try {
      const metadata = await sock.newsletterMetadata("invite", CHANNEL_INVITE)
      channelJidCache = metadata?.id || metadata?.jid || metadata?.newsletterJid || null
    } catch {}
  }

  return {
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: channelJidCache || FALLBACK_CHANNEL_JID,
      newsletterName: botName,
      serverMessageId: -1
    },
    externalAdReply: {
      title: botName,
      body: "✨ Rejoindre la chaîne officielle premium",
      sourceUrl: CHANNEL_LINK,
      mediaType: 1,
      renderLargerThumbnail: true,
      showAdAttribution: true
    }
  }
}

function getRamUsage() {
  return Math.round(process.memoryUsage().rss / 1024 / 1024)
}

function getCommandFiles() {
  try {
    return fs.readdirSync(COMMANDS_DIR)
      .filter(file => file.endsWith('.js'))
      .map(file => path.basename(file, '.js'))
      .sort((a, b) => a.localeCompare(b))
  } catch {
    return []
  }
}

function getSyncedCategories() {
  const commandFiles = getCommandFiles()
  const realCommands = new Set(commandFiles)
  const usedCommands = new Set()
  const synced = {}

  for (const [category, commands] of Object.entries(CATEGORIES)) {
    const filtered = commands.filter(cmd => realCommands.has(cmd))
    if (filtered.length > 0) {
      synced[category] = filtered
      filtered.forEach(cmd => usedCommands.add(cmd))
    }
  }

  const missingCommands = commandFiles.filter(cmd => !usedCommands.has(cmd))
  if (missingCommands.length > 0) {
    synced["🔹 Autres"] = missingCommands
  }

  return synced
}

// ═════════════════════════════════════════════════════════════════
//  RECHERCHE INTELLIGENTE
// ═════════════════════════════════════════════════════════════════

function searchCommands(query) {
  if (!query || query.length < 1) return []
  const searchTerm = query.toLowerCase().trim()
  const results    = []
  const categories = getSyncedCategories()
  const allCmds    = Object.values(categories).flat()

  for (const cmd of allCmds) {
    let score = 0
    const cl  = cmd.toLowerCase()
    const desc= (CMD_DESCRIPTIONS[cmd] || "").toLowerCase()

    if (cl === searchTerm)              score += 100
    else if (cl.startsWith(searchTerm)) score += 80
    else if (cl.includes(searchTerm))   score += 60
    if (desc.includes(searchTerm))      score += 40

    if (score > 0) {
      results.push({
        command: cmd,
        icon: CMD_ICONS[cmd] || "🕷️",
        description: CMD_DESCRIPTIONS[cmd] || "Pas de description",
        category: findCategory(cmd),
        score
      })
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 10)
}

function findCategory(cmd) {
  for (const [cat, cmds] of Object.entries(getSyncedCategories())) {
    if (cmds.includes(cmd)) return cat
  }
  return "Inconnu"
}

function formatSearchResults(results, prefix, query) {
  if (results.length === 0) {
    return (
      `🔍 *AUCUN RÉSULTAT*\n` +
      `${SEP}\n` +
      `Aucune commande trouvée pour : *"${query}"*\n\n` +
      `Essaie plutôt :\n` +
      `▸ *${prefix}menu* — menu complet\n` +
      `▸ *${prefix}menu fun* — commandes fun\n` +
      `▸ *${prefix}menu admin* — commandes admin`
    )
  }

  let text =
    `🔍 *RÉSULTATS POUR "${query.toUpperCase()}"*\n` +
    `${SEP}\n` +
    `${results.length} commande(s) trouvée(s)\n`

  results.forEach((res) => {
    text +=
      `\n${res.icon} *${prefix}${res.command}*\n` +
      `   ${res.description}\n` +
      `   📂 ${res.category}`
  })

  text +=
    `\n\n${SEP}\n` +
    `▸ *${prefix}help <commande>* — aide détaillée\n` +
    `▸ *${prefix}menu* — menu complet`

  return text
}

// ═════════════════════════════════════════════════════════════════
//  CONSTRUCTION DU MENU — NOUVEAU DESIGN
// ═════════════════════════════════════════════════════════════════

function buildMenuText(prefix, botName, searchQuery = null) {
  if (searchQuery) {
    return formatSearchResults(searchCommands(searchQuery), prefix, searchQuery)
  }

  const now        = new Date()
  const time       = now.toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" })
  const date       = now.toLocaleDateString("fr-FR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" })
  const categories = getSyncedCategories()
  const totalCmd   = Object.values(categories).flat().length
  const totalCat   = Object.keys(categories).length
  const uptime     = formatUptime()
  const ram        = getRamUsage()

  const dateCap = date.charAt(0).toUpperCase() + date.slice(1)
  const BS  = toBoldSerif
  const SB  = toSansBold
  const BIS = toBoldItalicSerif

  // ── EN-TÊTE ─────────────────────────────────────────────────
  let text =
    `╭─────────────\n` +
    `\n` +
    `${BS("J.A.R.V.I.S")}\n\n` +
    `────────\n` +
    `> ${BIS("SASAKI-PROJET")}\n\n` +
    `> 〆 ${SB("Menu principal")} (⌐■_■)\n` +
    `> 📅 ${BS(dateCap)}\n` +
    `> 🕐 ${BS(time)}\n` +
    `> ⏱️ ${BS(uptime)}\n` +
    `> 💾 ${BS(String(ram))} ${BS("MB")}\n` +
    `> 📋 ${BS(String(totalCmd))} ${BS("commandes")}\n` +
    `> 📂 ${BS(String(totalCat))} ${BS("catégories")}\n\n`

  // ── INDEX DES CATÉGORIES ──────────────────────────────────────
  text += `꧁༒☬ 𓆩${SB("INDEX DES CATÉGORIES")}𓆪 ☬༒꧂\n\n`
  text += Object.entries(categories)
    .map(([catName, commands]) => {
      const [icon, ...nameParts] = catName.split(" ")
      const name = nameParts.join(" ")
      return `> ${icon} ${SB(name)} ⌊${SB(String(commands.length))}⌋`
    })
    .join("\n")
  text += `\n\n`

  // ── CATÉGORIES ──────────────────────────────────────────────
  for (const [catName, commands] of Object.entries(categories)) {
    const nameOnly = catName.split(" ").slice(1).join(" ").toUpperCase()
    text += `彡 𓆩${SB(nameOnly)}𓆪 彡 ⌊${SB(String(commands.length))}⌋\n`
    text += commands.map(cmd => `> ➤ ${BS(cmd)}`).join("\n")
    text += `\n\n`
  }

  // ── GUIDE RAPIDE ────────────────────────────────────────────
  text +=
    `💡 𓆩${SB("GUIDE RAPIDE")}𓆪\n` +
    `> ✦ ${prefix}help <commande>\n` +
    `> ↳ ${BS("aide détaillée")}\n` +
    `>\n` +
    `> ✦ ${prefix}menu <mot-clé>\n` +
    `> ↳ ${BS("rechercher une commande")}\n` +
    `>\n` +
    `> ✦ ${prefix}whoami\n` +
    `> ↳ ${BS("ton rang & permissions")}\n\n` +
    `༒ ${toUnderlineOverline("LORD")} ✘${toUnderlineOverline("DEMON")}༒\n` +
    `> ⚡ ${BS("Système J.A.R.V.I.S. v2.0")}\n` +
    `> (¬‿¬) 〆 ${BS("SYSTEME ONLINE")}`

  return text
}

// ═════════════════════════════════════════════════════════════════
//  HANDLER PRINCIPAL
// ═════════════════════════════════════════════════════════════════

export default async function menu(sock, sender, args, msg) {
  try {
    const botName    = config.botName || "𝐉.𝐀.𝐑.𝐕.𝐈.𝐒."
    const prefix     = config.prefix  || "."
    const searchQuery= args?.length > 0 ? args.join(" ") : null

    // ── CONSTRUIRE LE MENU ────────────────────────────────────────
    const menuText = buildMenuText(prefix, botName, searchQuery)

    // ── ENVOYER LE MENU ───────────────────────────────────────────
    const randomImage = getRandomImage()

    if (randomImage && fs.existsSync(randomImage)) {
      await sendMenuMedia(sock, sender, randomImage, menuText)
    } else {
      await sock.sendMessage(sender, { text: menuText })
    }

    // ── BOUTON "VOIR LA CHAÎNE" ───────────────────────────────────
    // Envoi d'un message séparé avec le lien de la chaîne officielle
    // Cela génère le bouton cliquable "Voir la chaîne" dans WhatsApp
    if (!searchQuery) {
      try {
        const channelCtx = await getChannelContextInfo(sock, botName)
        await sock.sendMessage(sender, {
          text:
            `_🤖 *${botName}* — Système J.A.R.V.I.S. v2.0_\n` +
            `_⚙️ Propulsé par J.A.R.V.I.S. Technology_`,
          contextInfo: channelCtx
        })
      } catch {}
    }

    const totalCmds = Object.values(getSyncedCategories()).flat().length
    console.log(`✅ [MENU] Envoyé → ${searchQuery ? "Recherche: " + searchQuery : totalCmds + " commandes"}`)

  } catch (error) {
    console.error("❌ [MENU] ERREUR:", error)
    try {
      await sock.sendMessage(sender, {
        text:
          `⚠️ *ERREUR*\n${SEP}\n` +
          `${error.message}\n` +
          `Réessaie avec : *${config.prefix || "."}menu*`
      })
    } catch {}
  }
}
