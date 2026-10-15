import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const COMMANDS_DIR = path.join(__dirname, '..', 'commands')

const cooldowns = new Map()

export const COMMAND_CATEGORIES = [
  {
    id: 'general',
    title: '🔥 Général',
    aliases: ['general', 'général', 'base', 'main'],
    commands: ['menu', 'help', 'ping', 'info', 'uptime', 'whoami', 'vv', 'url', 'style', 'profile', 'status', 'pairing', 'mypair', 'stoppair', 'sessionsudo']
  },
  {
    id: 'ia',
    title: '🤖 Intelligence artificielle',
    aliases: ['ia', 'jarvis', 'intelligence', 'intelligence artificielle'],
    commands: ['jarvis', 'summarize', 'ocr', 'transcribe']
  },
  {
    id: 'media',
    title: '🎵 Médias',
    aliases: ['media', 'médias', 'musique', 'video', 'vidéo'],
    commands: ['song', 'image', 'sticker', 'ytmp4', 'lyrics', 'download', 'qrcode', 'tts']
  },
  {
    id: 'utilitaires',
    title: '🌍 Utilitaires',
    aliases: ['utilitaires', 'utils', 'tools', 'outil'],
    commands: ['weather', 'translate', 'calc', 'quote', 'joke', 'horoscope', 'remind', 'schedule', 'poll', 'ascii', 'apkinfo']
  },
  {
    id: 'jeux',
    title: '🎮 Jeux & fun',
    aliases: ['jeux', 'game', 'games', 'fun'],
    commands: ['coinflip', 'dice', 'rps', 'tictactoe', 'quiz', 'dare', 'ship', 'gay', 'nitro', 'daily', 'rank', 'leaderboard']
  },
  {
    id: 'admin',
    title: '👥 Administration groupe',
    aliases: ['admin', 'admins', 'groupe', 'group', 'moderation', 'modération'],
    commands: ['kick', 'add', 'promote', 'demote', 'mute', 'unmute', 'tgl', 'kickall', 'ban', 'unban', 'warn', 'unwarn', 'warnlist', 'clearwarns']
  },
  {
    id: 'groupe',
    title: '⚙️ Configuration groupe',
    aliases: ['config', 'configuration', 'parametres', 'paramètres'],
    commands: ['group', 'groupconfig', 'setdesc', 'setppgc', 'link', 'tagall', 'hidetag', 'group-tm', 'pseudo', 'pp', 'role', 'modlog', 'lock', 'approve', 'whitelist', 'blacklist', 'welcome', 'goodbye', 'rules', 'notes', 'afk']
  },
  {
    id: 'protection',
    title: '🛡️ Protections',
    aliases: ['protection', 'protections', 'security', 'sécurité', 'anti'],
    commands: ['antipurge', 'antidemote', 'antipromote', 'antitag', 'antilink', 'antichannel', 'antispam', 'antimention', 'antisuppression', 'antiword', 'antiflood', 'antibot']
  },
  {
    id: 'owner',
    title: '👑 Owner & système',
    aliases: ['owner', 'sudo', 'system', 'système', 'supreme', 'suprême'],
    commands: ['sudo', 'setsudo', 'addsudo', 'delsudo', 'removesudo', 'listsudo', 'broadcast', 'reload', 'restart', 'stop', 'shutdown', 'eval', 'exec', 'dit', 'pack', 'addpremium', 'removepremium', 'public', 'private', 'prefix', 'maintenance', 'logs', 'backup', 'restore', 'cmdinfo', 'kickallv2', 'domination']
  }
]

const DESCRIPTIONS = {
  menu: 'Affiche le menu dynamique par catégorie',
  help: 'Affiche l’aide détaillée d’une commande',
  ping: 'Teste la latence du bot',
  info: 'Affiche les informations du bot',
  uptime: 'Affiche le temps d’activité',
  whoami: 'Affiche votre rôle et vos permissions',
  vv: 'Récupère les médias à vue unique',
  url: 'Analyse et manipule des liens',
  style: 'Transforme le texte en styles spéciaux',
  profile: 'Affiche un profil utilisateur',
  status: 'Affiche l’état du bot',
  pairing: 'Connecter votre compte WhatsApp (multi-session)',
  mypair: 'Vérifier l’état de votre session',
  stoppair: 'Déconnecter et supprimer votre session',
  sessionsudo: 'Gérer les sudos de votre session (Session Owner uniquement)',
  jarvis: 'Discute avec l’IA (Groq)',
  summarize: 'Résume un texte long',
  ocr: 'Lit le texte dans une image',
  transcribe: 'Transcrit un vocal ou une vidéo',
  song: 'Télécharge une musique',
  image: 'Recherche une image',
  sticker: 'Crée un sticker',
  ytmp4: 'Télécharge une vidéo YouTube',
  lyrics: 'Trouve les paroles d’une chanson',
  download: 'Télécharge un média depuis une URL',
  qrcode: 'Génère un QR code',
  tts: 'Convertit un texte en vocal',
  weather: 'Affiche la météo',
  translate: 'Traduit un texte',
  calc: 'Calcule une expression',
  quote: 'Envoie une citation',
  joke: 'Envoie une blague',
  horoscope: 'Affiche l’horoscope',
  remind: 'Crée un rappel',
  schedule: 'Programme un message',
  poll: 'Crée un sondage',
  ascii: 'Transforme un mot en ASCII art',
  apkinfo: 'Analyse un fichier APK',
  kick: 'Expulse un membre',
  add: 'Ajoute un membre',
  promote: 'Promouvoit un membre',
  demote: 'Rétrograde un admin',
  mute: 'Musèle un membre (auto-suppression)',
  unmute: 'Réactive un membre muté',
  tgl: 'Bascule le silence total d\'un membre',
  kickall: 'Expulse plusieurs membres avec confirmation',
  kickallv2: 'Expulsion massive avancée',
  ban: 'Bannit un utilisateur',
  unban: 'Débannit un utilisateur',
  warn: 'Avertit un membre',
  unwarn: 'Retire un avertissement',
  warnlist: 'Liste les avertissements',
  clearwarns: 'Efface les avertissements',
  group: 'Gère le groupe',
  groupconfig: 'Affiche la configuration du groupe',
  setdesc: 'Change la description du groupe',
  setppgc: 'Change la photo du groupe',
  link: 'Affiche le lien du groupe',
  tagall: 'Mentionne tous les membres',
  hidetag: 'Mentionne tout le monde discrètement',
  'group-tm': 'Programme ouverture/fermeture du groupe',
  pseudo: 'Change le pseudo du bot',
  pp: 'Change la photo du bot',
  role: 'Affiche le rôle d’un membre',
  modlog: 'Active le journal de modération',
  lock: 'Verrouille des éléments du groupe',
  approve: 'Approuve un membre',
  whitelist: 'Gère la liste blanche',
  blacklist: 'Gère la liste noire',
  welcome: 'Gère le message de bienvenue',
  goodbye: 'Gère le message de départ',
  rules: 'Affiche ou modifie les règles',
  notes: 'Gère les notes du groupe',
  afk: 'Active le mode absent',
  antipurge: 'Protège contre les expulsions massives',
  antidemote: 'Empêche les rétrogradations abusives',
  antipromote: 'Empêche les promotions non autorisées',
  antitag: 'Bloque les tags massifs',
  antilink: 'Bloque les liens',
  antispam: 'Bloque le spam',
  antimention: 'Bloque les mentions abusives',
  antisuppression: 'Surveille les suppressions',
  antiword: 'Filtre les mots interdits',
  antibot: 'Supprime les messages des autres bots (sauf admins)',
  antiflood: 'Bloque le flood',
  sudo: 'Gère les accès sudo',
  addsudo: 'Ajoute un sudo',
  setsudo: 'Ajoute un sudo',
  delsudo: 'Retire un sudo',
  removesudo: 'Retire un sudo',
  listsudo: 'Liste les sudos',
  broadcast: 'Diffuse un message global',
  reload: 'Recharge les commandes',
  restart: 'Redémarre le bot',
  stop: 'Arrête le bot',
  shutdown: 'Arrête le bot proprement',
  eval: 'Exécute du JavaScript',
  exec: 'Exécute une commande système',
  dit: 'Fait parler le bot',
  pack: 'Gère les packs de stickers',
  addpremium: 'Ajoute un membre premium',
  removepremium: 'Retire le premium',
  public: 'Passe le bot en mode public',
  private: 'Passe le bot en mode privé',
  prefix: 'Change le préfixe',
  maintenance: 'Active le mode maintenance',
  logs: 'Affiche les logs',
  backup: 'Crée une sauvegarde',
  restore: 'Restaure une sauvegarde',
  cmdinfo: 'Affiche les infos d’une commande',
  domination: 'Contrôle avancé du groupe'
}

const GROUP_ONLY = new Set([
  'kick', 'add', 'promote', 'demote', 'mute', 'unmute', 'tgl', 'kickall', 'kickallv2', 'ban', 'unban',
  'warn', 'unwarn', 'warnlist', 'clearwarns', 'group', 'groupconfig', 'setdesc', 'setppgc',
  'link', 'tagall', 'hidetag', 'group-tm', 'modlog', 'lock', 'approve', 'whitelist',
  'blacklist', 'welcome', 'goodbye', 'rules', 'notes', 'antipurge', 'antidemote',
  'antipromote', 'antitag', 'antilink', 'antichannel', 'antispam', 'antimention', 'antisuppression',
  'antiword', 'antiflood', 'antibot', 'domination'
])

const ADMIN_COMMANDS = new Set([
  'kick', 'add', 'promote', 'demote', 'mute', 'unmute', 'tgl', 'kickall', 'ban', 'unban',
  'warn', 'unwarn', 'clearwarns', 'group', 'setdesc', 'setppgc', 'link', 'tagall',
  'hidetag', 'group-tm', 'modlog', 'lock', 'approve', 'whitelist', 'blacklist',
  'welcome', 'goodbye', 'rules', 'notes', 'antipurge', 'antidemote', 'antipromote',
  'antitag', 'antilink', 'antichannel', 'antispam', 'antimention', 'antisuppression', 'antiword',
  'antiflood', 'antibot'
])

const SUDO_COMMANDS = new Set([
  'sudo', 'listsudo', 'broadcast', 'reload', 'restart', 'stop', 'shutdown', 'dit',
  'pack', 'public', 'private', 'prefix', 'maintenance', 'logs', 'backup', 'restore',
  'cmdinfo'
])

const OWNER_COMMANDS = new Set([
  'addsudo', 'setsudo', 'delsudo', 'removesudo', 'addpremium', 'removepremium',
  'eval', 'exec', 'kickallv2', 'domination'
])

// Commandes "suprêmes" : réservées à l'Owner du BOT PRINCIPAL uniquement.
// Même un Session Owner ne peut PAS les exécuter sur sa session secondaire.
// → protège le serveur contre une compromission via pairing.
const SUPREME_COMMANDS = new Set([
  'eval', 'exec',
  'restart', 'stop', 'shutdown', 'reload',
  'backup', 'restore', 'maintenance',
  'addsudo', 'setsudo', 'delsudo', 'removesudo',
  'addpremium', 'removepremium',
  'broadcast',
  'kickallv2', 'domination'
])

const PREMIUM_COMMANDS = new Set([])

const HEAVY_COOLDOWNS = {
  jarvis: 10,
  summarize: 12,
  ocr: 20,
  transcribe: 30,
  song: 30,
  ytmp4: 30,
  download: 30,
  image: 12,
  sticker: 6,
  qrcode: 6,
  tts: 10
}

const categoryByCommand = new Map()
for (const category of COMMAND_CATEGORIES) {
  for (const command of category.commands) categoryByCommand.set(command, category)
}

function normalize(value) {
  return String(value || '').trim().toLowerCase()
}

export function getCommandFiles() {
  try {
    return fs.readdirSync(COMMANDS_DIR)
      .filter(file => file.endsWith('.js'))
      .map(file => path.basename(file, '.js'))
      .sort((a, b) => a.localeCompare(b))
  } catch {
    return []
  }
}

export function getCategoryByQuery(query) {
  const term = normalize(query)
  if (!term) return null
  return COMMAND_CATEGORIES.find(category =>
    category.id === term ||
    normalize(category.title).includes(term) ||
    category.aliases.some(alias => normalize(alias) === term)
  ) || null
}

export function getCommandMeta(commandName) {
  const command = normalize(commandName)
  const category = categoryByCommand.get(command) || {
    id: 'autres',
    title: '📦 Autres commandes',
    aliases: ['autres'],
    commands: []
  }

  let permission = 'public'
  if (ADMIN_COMMANDS.has(command)) permission = 'admin'
  if (SUDO_COMMANDS.has(command)) permission = 'sudo'
  if (OWNER_COMMANDS.has(command)) permission = 'owner'
  if (PREMIUM_COMMANDS.has(command)) permission = 'premium'

  return {
    command,
    categoryId: category.id,
    categoryTitle: category.title,
    description: DESCRIPTIONS[command] || `Commande ${command}`,
    permission,
    scope: GROUP_ONLY.has(command) ? 'group' : 'any',
    cooldown: HEAVY_COOLDOWNS[command] ?? (permission === 'public' ? 2 : 1)
  }
}

export function listCommandMetas() {
  const files = getCommandFiles()
  return files.map(getCommandMeta)
}

export function listCategories() {
  const existing = new Set(getCommandFiles())
  const used = new Set()
  const categories = COMMAND_CATEGORIES.map(category => {
    const commands = category.commands.filter(command => existing.has(command))
    commands.forEach(command => used.add(command))
    return { ...category, commands }
  }).filter(category => category.commands.length > 0)

  const otherCommands = [...existing].filter(command => !used.has(command))
  if (otherCommands.length) {
    categories.push({
      id: 'autres',
      title: '📦 Autres commandes',
      aliases: ['autres'],
      commands: otherCommands
    })
  }

  return categories
}

export function searchCommands(query) {
  const term = normalize(query)
  if (!term) return []
  return listCommandMetas()
    .map(meta => {
      let score = 0
      if (meta.command === term) score += 100
      if (meta.command.startsWith(term)) score += 70
      if (meta.command.includes(term)) score += 45
      if (normalize(meta.description).includes(term)) score += 25
      if (normalize(meta.categoryTitle).includes(term)) score += 20
      return { ...meta, score }
    })
    .filter(meta => meta.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
}

export function permissionLabel(permission) {
  return {
    public: 'Public',
    premium: 'Premium',
    admin: 'Admin groupe',
    sudo: 'Owner/Sudo',
    owner: 'Owner principal'
  }[permission] || permission
}

export function scopeLabel(scope) {
  return scope === 'group' ? 'Groupe uniquement' : 'Privé + groupe'
}

export function evaluateCommandAccess(commandName, ctx = {}) {
  const meta = getCommandMeta(commandName)

  if (meta.scope === 'group' && !ctx.isGroup) {
    return { ok: false, meta, reason: 'Cette commande fonctionne uniquement dans les groupes.' }
  }

  // ── Protection commandes SUPREME sur sessions secondaires ──
  // Seul l'Owner du bot principal (.env OWNER_NUMBER) peut les utiliser,
  // même si un Session Owner contrôle entièrement sa session secondaire.
  if (ctx.isSecondaryBot && SUPREME_COMMANDS.has(meta.command) && !ctx.isGlobalMainOwner) {
    return {
      ok: false,
      meta,
      reason: 'Commande système réservée à l’Owner principal du bot. Indisponible depuis une session pairée.'
    }
  }

  const isMainOwner = Boolean(ctx.isMainOwner)
  const isOwner = Boolean(ctx.isOwner)
  const isSudo = Boolean(ctx.isSudo)
  const isAdmin = Boolean(ctx.isAdmin)
  const isPremium = Boolean(ctx.isPremium)

  if (meta.permission === 'owner' && !isMainOwner) {
    return { ok: false, meta, reason: 'Commande réservée à l’Owner principal.' }
  }

  if (meta.permission === 'sudo' && !isOwner && !isSudo && !isMainOwner) {
    return { ok: false, meta, reason: 'Commande réservée à l’Owner et aux SUDO.' }
  }

  if (meta.permission === 'admin' && !isAdmin && !isOwner && !isSudo && !isMainOwner) {
    return { ok: false, meta, reason: 'Commande réservée aux admins du groupe.' }
  }

  if (meta.permission === 'premium' && !isPremium && !isOwner && !isSudo && !isMainOwner) {
    return { ok: false, meta, reason: 'Commande réservée aux membres Premium.' }
  }

  return { ok: true, meta }
}

export function checkCommandCooldown(commandName, userId, ctx = {}) {
  const meta = getCommandMeta(commandName)
  if (ctx.isMainOwner || ctx.isOwner || ctx.isSudo) return { ok: true, meta }

  const seconds = Math.max(0, Number(meta.cooldown || 0))
  if (!seconds) return { ok: true, meta }

  const key = `${userId}:${meta.command}`
  const now = Date.now()
  const next = cooldowns.get(key) || 0
  if (now < next) {
    return {
      ok: false,
      meta,
      remaining: Math.ceil((next - now) / 1000)
    }
  }

  cooldowns.set(key, now + seconds * 1000)
  return { ok: true, meta }
}

export function formatAccessDenied(result, prefix = '.') {
  const meta = result.meta
  return (
    `╭━━━〔 ⛔ 𝐀𝐂𝐂È𝐒 𝐑𝐄𝐅𝐔𝐒É 〕━━━╮\n\n` +
    `┃ Commande : *${prefix}${meta.command}*\n` +
    `┃ Raison : ${result.reason}\n` +
    `┃ Niveau requis : *${permissionLabel(meta.permission)}*\n\n` +
    `┃ Aide : \`${prefix}help ${meta.command}\`\n` +
    `╰━━━━━━━━━━━━━━━━━━━━━━╯`
  )
}

export function formatCooldownDenied(result, prefix = '.') {
  return (
    `╭━━━〔 ⏳ 𝐂𝐎𝐎𝐋𝐃𝐎𝐖𝐍 〕━━━╮\n\n` +
    `┃ Commande : *${prefix}${result.meta.command}*\n` +
    `┃ Patiente encore *${result.remaining}s*.\n\n` +
    `╰━━━━━━━━━━━━━━━━━━━━━━╯`
  )
}