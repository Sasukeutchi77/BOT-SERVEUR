'use strict';

// commands/menu.js — J.A.R.V.I.S. | Menu principal
import { config } from '../config.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const CHANNEL_LINK = 'https://whatsapp.com/channel/0029VbCRcEJLdQeYxw5g3m2o';
const CHANNEL_INVITE = '0029VbCRcEJLdQeYxw5g3m2o';
const FALLBACK_CHANNEL_JID = '1203631999978746@newsletter';
let channelJidCache = null;

const CATEGORIES = {
  '🕷️ Général': ['menu', 'help', 'ping', 'info', 'uptime', 'whoami', 'vv', 'url', 'style', 'partager'],
  '🤖 Intelligence artificielle': ['jarvis', 'summarize', 'ocr', 'transcribe'],
  '🎵 Médias': ['song', 'image', 'sticker', 'ytmp4', 'lyrics', 'download'],
  '🧰 Utilitaires': ['weather', 'translate', 'calc', 'quote', 'joke', 'horoscope', 'qrcode', 'tts', 'remind', 'schedule', 'poll', 'ascii'],
  '🎮 Jeux & divertissement': ['coinflip', 'dice', 'rps', 'tictactoe', 'quiz', 'dare'],
  '🎭 Fun & pièges': ['ship', 'gay', 'nitro', 'fakereac'],
  '🧪 Outils avancés': ['apkinfo'],
  '👥 Membres': ['kick', 'add', 'promote', 'demote', 'mute', 'unmute', 'tgl', 'kickall', 'kickallv2', 'ban', 'unban'],
  '⚙️ Configuration groupe': ['group', 'groupconfig', 'setdesc', 'setppgc', 'link', 'tagall', 'hidetag', 'domination', 'group-tm', 'pseudo', 'pp', 'role', 'modlog', 'lock', 'approve', 'whitelist', 'blacklist'],
  '🛡️ Protections': ['antipurge', 'antidemote', 'antipromote', 'antitag', 'antilink', 'antichannel', 'antispam', 'antimention', 'antisuppression', 'antiword', 'antiflood', 'antibot'],
  '🕯️ Accueil & règles': ['welcome', 'goodbye', 'rules', 'notes', 'afk'],
  '🔗 Sessions liées': ['pairing', 'mypair', 'sessionsudo', 'stoppair'],
  '⚠️ Avertissements': ['warn', 'unwarn', 'warnlist', 'clearwarns'],
  '📊 Statistiques & gestion': ['status', 'stats', 'logs', 'backup', 'restore', 'maintenance', 'shutdown', 'profile', 'rank', 'leaderboard', 'daily', 'cmdinfo'],
  '⚙️ Modes du bot': ['public', 'private', 'prefix'],
  '👁️ Owner & sudo': ['sudo', 'setsudo', 'addsudo', 'delsudo', 'removesudo', 'listsudo', 'broadcast', 'reload', 'restart', 'stop', 'eval', 'exec', 'dit', 'pack', 'addpremium', 'removepremium'],
  '🔗 Liens officiels': ['repo']
};

const ICONS = {
  menu: '📋', help: '❔', ping: '⚡', info: '👁️', uptime: '⏱️', whoami: '🔍', vv: '👁️', url: '🔗', style: '✍️', partager: '📤',
  jarvis: '🤖', summarize: '📝', ocr: '🔎', transcribe: '🎙️', song: '🎵', image: '🖼️', sticker: '🎭', ytmp4: '🎬', lyrics: '🎤', download: '⬇️',
  weather: '🌦️', translate: '🌍', calc: '🧮', quote: '💬', joke: '😄', horoscope: '⭐', qrcode: '🔳', tts: '🔊', remind: '⏰', schedule: '📆', poll: '📊', ascii: '🔤',
  coinflip: '🪙', dice: '🎲', rps: '✊', tictactoe: '❎', quiz: '🧠', dare: '🎯', ship: '💞', gay: '🌈', nitro: '💎', fakereac: '🎭', apkinfo: '📦',
  kick: '👢', add: '➕', promote: '⬆️', demote: '⬇️', mute: '🔇', unmute: '🔊', tgl: '🔀', kickall: '💥', kickallv2: '💣', ban: '🚫', unban: '♻️',
  group: '⚙️', groupconfig: '🗂️', setdesc: '📝', setppgc: '🖼️', link: '🔗', tagall: '📢', hidetag: '📡', domination: '🔥', 'group-tm': '⏰', pseudo: '✏️', pp: '🖼️', role: '🎭', modlog: '📓', lock: '🔒', approve: '✅', whitelist: '📃', blacklist: '🚫',
  antipurge: '🛡️', antidemote: '🛡️', antipromote: '🛡️', antitag: '🛡️', antilink: '🔗', antichannel: '📡', antispam: '📵', antimention: '📵', antisuppression: '🗑️', antiword: '🚫', antiflood: '🌊', antibot: '🤖',
  welcome: '👋', goodbye: '🕊️', rules: '📜', notes: '📝', afk: '💤', pairing: '🔗', mypair: '📱', sessionsudo: '👤', stoppair: '❌', warn: '⚠️', unwarn: '♻️', warnlist: '📋', clearwarns: '🧹',
  status: '📊', stats: '📈', logs: '📄', backup: '💾', restore: '♻️', maintenance: '🛠️', shutdown: '⏻', profile: '👤', rank: '🏆', leaderboard: '🥇', daily: '🎁', cmdinfo: 'ℹ️', public: '🌐', private: '🔒', prefix: '🔧', sudo: '👑', setsudo: '⭐', addsudo: '⭐', delsudo: '➖', removesudo: '➖', listsudo: '📋', broadcast: '📡', reload: '♻️', restart: '🔄', stop: '⏹️', eval: '💻', exec: '⌨️', dit: '💬', pack: '📦', addpremium: '💎', removepremium: '💎', repo: '🔗'
};

const DESCRIPTIONS = {
  menu: 'Afficher le menu et rechercher une commande', help: 'Afficher l’aide détaillée', ping: 'Tester la réactivité du bot', info: 'Afficher les informations système', uptime: 'Afficher le temps de fonctionnement', whoami: 'Voir son rôle et ses permissions',
  jarvis: 'Discuter avec l’intelligence artificielle', welcome: 'Configurer le message de bienvenue', goodbye: 'Configurer le message de départ', repo: 'Afficher les liens officiels du projet', tagall: 'Mentionner les membres du groupe', hidetag: 'Mentionner les membres sans afficher leurs noms',
  ping: 'Afficher la latence et les informations système', status: 'Afficher le statut du bot', stats: 'Afficher les statistiques', prefix: 'Modifier le préfixe des commandes', pairing: 'Lier une session WhatsApp', mypair: 'Voir les sessions liées', stoppair: 'Détacher une session liée'
};

const SEP = '━━━━━━━━━━━━━━━━━━━━━━';

function stylizeBold(text) {
  return [...String(text)].map((char) => {
    const code = char.codePointAt(0);
    if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D400 + code - 65);
    if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D41A + code - 97);
    if (code >= 48 && code <= 57) return String.fromCodePoint(0x1D7CE + code - 48);
    return char;
  }).join('');
}

function getCommandFiles() {
  try {
    return fs.readdirSync(__dirname, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
      .map((entry) => path.basename(entry.name, '.js'))
      .filter((name) => name !== 'index')
      .sort((a, b) => a.localeCompare(b, 'fr'));
  } catch (error) {
    console.error('[MENU] Impossible de lire les commandes :', error.message);
    return [];
  }
}

function getCategories() {
  const available = new Set(getCommandFiles());
  const used = new Set();
  const result = {};
  for (const [category, commands] of Object.entries(CATEGORIES)) {
    const existing = commands.filter((command) => available.has(command));
    if (existing.length) {
      result[category] = existing;
      existing.forEach((command) => used.add(command));
    }
  }
  const other = [...available].filter((command) => !used.has(command));
  if (other.length) result['🔹 Autres commandes'] = other;
  return result;
}

function findCategory(command, categories) {
  for (const [category, commands] of Object.entries(categories)) {
    if (commands.includes(command)) return category;
  }
  return 'Autres commandes';
}

function searchCommands(query, categories) {
  const term = String(query || '').trim().toLowerCase();
  if (!term) return [];
  const commands = Object.values(categories).flat();
  return commands.map((command) => {
    const name = command.toLowerCase();
    const description = (DESCRIPTIONS[command] || '').toLowerCase();
    let score = name === term ? 100 : name.startsWith(term) ? 80 : name.includes(term) ? 60 : 0;
    if (description.includes(term)) score += 30;
    return { command, score };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 12);
}

function buildSearchText(query, prefix, categories) {
  const results = searchCommands(query, categories);
  if (!results.length) {
    return `🔎 *Aucun résultat pour « ${query} »*\n${SEP}\nEssaie un autre mot-clé ou utilise *${prefix}menu* pour afficher toutes les commandes.`;
  }
  const lines = [`🔎 *RÉSULTATS : ${query.toUpperCase()}*`, SEP, `${results.length} commande(s) trouvée(s)`, ''];
  for (const { command } of results) {
    lines.push(`${ICONS[command] || '🔹'} *${prefix}${command}*`, `   ${DESCRIPTIONS[command] || 'Commande J.A.R.V.I.S.'}`, `   📂 ${findCategory(command, categories)}`, '');
  }
  lines.push(SEP, `💡 *${prefix}help <commande>* pour l’aide détaillée`);
  return lines.join('\n');
}

function formatUptime() {
  let seconds = Math.floor(process.uptime());
  const days = Math.floor(seconds / 86400); seconds %= 86400;
  const hours = Math.floor(seconds / 3600); seconds %= 3600;
  const minutes = Math.floor(seconds / 60); seconds %= 60;
  const parts = [];
  if (days) parts.push(`${days}j`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}min`);
  if (seconds || !parts.length) parts.push(`${seconds}s`);
  return parts.join(' ');
}

function buildMenuText(prefix, categories, searchQuery = '') {
  if (searchQuery) return buildSearchText(searchQuery, prefix, categories);
  const now = new Date();
  const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: process.env.TZ || 'Africa/Ouagadougou' });
  const date = now.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: process.env.TZ || 'Africa/Ouagadougou' });
  const total = Object.values(categories).flat().length;
  const memoryMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
  const botName = config.botName || '𝐉.𝐀.𝐑.𝐕.𝐈.𝐒';
  const developer = config.developerName || '𝐋𝐎𝐑𝐃 𝐃𝐄𝐌𝐎𝐍';
  const team = config.teamName || '𝐍𝐄𝐗𝐔𝐒-𝐅𝐎𝐑𝐆𝐄𝐑';
  const lines = [
    `╭━━━〔 🤖 ${botName} 〕━━━╮`,
    `│ ✦ *MENU PRINCIPAL*`,
    `│ 👑 Développeur : *${developer}*`,
    `│ ⚒️ Équipe : *${team}*`,
    `│ 📅 ${date.charAt(0).toUpperCase()}${date.slice(1)}`,
    `│ 🕒 ${time}  •  ⏱️ ${formatUptime()}`,
    `│ 💾 RAM : ${memoryMb} MB`,
    `│ 📚 Commandes : ${total}`,
    `│ 🗂️ Catégories : ${Object.keys(categories).length}`,
    '╰━━━━━━━━━━━━━━━━━━━━╯',
    ''
  ];
  for (const [category, commands] of Object.entries(categories)) {
    lines.push(`╭─〔 ${category} • ${commands.length} 〕`);
    for (const command of commands) {
      lines.push(`│ ${ICONS[command] || '🔹'} *${prefix}${command}*${DESCRIPTIONS[command] ? ` — ${DESCRIPTIONS[command]}` : ''}`);
    }
    lines.push('╰' + '─'.repeat(25), '');
  }
  lines.push(
    '╭━━━〔 💡 GUIDE RAPIDE 〕━━━╮',
    `│ ▸ *${prefix}help <commande>* : aide détaillée`,
    `│ ▸ *${prefix}menu <mot-clé>* : rechercher`,
    `│ ▸ *${prefix}ping* : diagnostic système`,
    '╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯',
    '',
    `⚡ *${botName}* • ${developer}`,
    `🛠️ *${team}*`
  );
  return lines.join('\n');
}

async function getChannelContextInfo(sock, botName) {
  if (!channelJidCache && typeof sock.newsletterMetadata === 'function') {
    try {
      const metadata = await sock.newsletterMetadata('invite', CHANNEL_INVITE);
      channelJidCache = metadata?.id || metadata?.jid || metadata?.newsletterJid || null;
    } catch (error) {
      console.warn('[MENU] Métadonnées de chaîne indisponibles :', error.message);
    }
  }
  return {
    forwardingScore: 1,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: channelJidCache || FALLBACK_CHANNEL_JID,
      newsletterName: botName,
      serverMessageId: -1
    },
    externalAdReply: {
      title: botName,
      body: `Chaîne officielle • ${config.teamName || '𝐍𝐄𝐗𝐔𝐒-𝐅𝐎𝐑𝐆𝐄𝐑'}`,
      sourceUrl: CHANNEL_LINK,
      mediaType: 1,
      renderLargerThumbnail: false,
      showAdAttribution: false
    }
  };
}

function getMenuMedia() {
  try {
    const files = fs.readdirSync(ASSETS_DIR).filter((file) => /\.(jpe?g|png|webp)$/i.test(file));
    if (!files.length) return null;
    // Le menu choisit uniquement une image fixe, jamais le GIF réservé à Welcome/Goodbye.
    const preferred = files.find((file) => /^jarvis[123]\.(jpe?g|png|webp)$/i.test(file));
    return path.join(ASSETS_DIR, preferred || files[0]);
  } catch {
    return null;
  }
}

export default async function menu(sock, sender, args = []) {
  try {
    if (!sock || !sender) throw new Error('Socket ou destinataire manquant.');
    const prefix = config.prefix || '.';
    const searchQuery = Array.isArray(args) && args.length ? args.join(' ').trim() : '';
    const categories = getCategories();
    const text = buildMenuText(prefix, categories, searchQuery);
    const mediaPath = searchQuery ? null : getMenuMedia();

    if (mediaPath) {
      await sock.sendMessage(sender, { image: fs.readFileSync(mediaPath), caption: text });
    } else {
      await sock.sendMessage(sender, { text });
    }

    if (!searchQuery) {
      try {
        const contextInfo = await getChannelContextInfo(sock, config.botName || '𝐉.𝐀.𝐑.𝐕.𝐈.𝐒');
        await sock.sendMessage(sender, {
          text: `📣 *${config.botName || '𝐉.𝐀.𝐑.𝐕.𝐈.𝐒'}*\nClique ici pour suivre la chaîne officielle :\n${CHANNEL_LINK}`,
          contextInfo
        });
      } catch (error) {
        console.warn('[MENU] Envoi du lien de chaîne ignoré :', error.message);
      }
    }
    console.log(`✅ [MENU] Envoyé à ${sender} (${searchQuery ? `recherche: ${searchQuery}` : `${Object.values(categories).flat().length} commandes`})`);
  } catch (error) {
    console.error('❌ [MENU] Erreur :', error?.stack || error);
    try {
      await sock.sendMessage(sender, { text: `⚠️ *Impossible d’afficher le menu.*\n${config.prefix || '.'}menu\nDétail : ${error.message}` });
    } catch (sendError) {
      console.error('[MENU] Échec de l’envoi du message d’erreur :', sendError.message);
    }
  }
}
