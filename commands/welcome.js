// commands/welcome.js — messages d'accueil JARVIS AI
import fs from 'node:fs';
import path from 'node:path';
import { sendMessage } from '../lib/sendMessage.js';
import { getSenderJid, isDeployer, isGroupAdmin, isSudo } from '../lib/ownerSystem.js';
import { config } from '../config.js';

const DATA_FILE = path.join(process.cwd(), 'data', 'welcome.json');
const LINKS = {
  telegramGroup: 'https://t.me/+kcLFkzePlwwyZjE8',
  telegramChannel: 'https://t.me/nexusforger',
  botConnect: process.env.BOT_CONNECT_LINK || '',
  whatsappChannel: 'https://whatsapp.com/channel/0029VbCRcEJLdQeYxw5g3m2o'
};
const CHANNEL_LINE = `📢 *Voir la chaîne WhatsApp :* ${LINKS.whatsappChannel}`;
const LINK_BLOCK = [
  '━━━━━━━━━━━━━━━━━━',
  '🔗 *REJOINS-NOUS*',
  `✈️ Groupe Telegram : ${LINKS.telegramGroup}`,
  `📣 Chaîne Telegram : ${LINKS.telegramChannel}`,
  `🤖 *LIEN POUR CONNECTER LE BOT* : ${LINKS.botConnect || '(à renseigner)'}`,
  '🤖 *𝐉.𝐀.𝐑.𝐕.𝐈.𝐒* • 👑 *𝐋𝐎𝐑𝐃 𝐃𝐄𝐌𝐎𝐍*',
  '⚒️ Équipe : *𝐍𝐄𝐗𝐔𝐒-𝐅𝐎𝐑𝐆𝐄𝐑*',
  CHANNEL_LINE
].join('\n');

function loadData() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : {}; }
  catch (error) { console.error('[WELCOME] Lecture impossible:', error.message); return {}; }
}
function saveData(data) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); return true; }
  catch (error) { console.error('[WELCOME] Sauvegarde impossible:', error.message); return false; }
}
function help() {
  const p = config.prefix || '.';
  return [`╭━━━〔 👋 𝐖𝐄𝐋𝐂𝐎𝐌𝐄 〕━━━╮`, '│', `│ ${p}welcome set <message>`, `│ ${p}welcome reset`, `│ ${p}welcome test`, '│', '│ Variables : {name}, {group}, {count}', '╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯'].join('\n');
}
function render(template, { name, group, count }) {
  return String(template || '🎉 Bienvenue {name} dans *{group}* !\n👥 Membres : {count}')
    .replace(/\{name\}/g, name).replace(/\{group\}/g, group).replace(/\{count\}/g, String(count));
}
export default async function welcome(sock, sender, args = [], msg) {
  try {
    if (!sender?.endsWith('@g.us')) return sendMessage(sock, sender, 'Cette commande est réservée aux groupes.');
    const userId = getSenderJid(msg, sock);
    if (!(isDeployer(userId) || isSudo(userId) || await isGroupAdmin(sock, sender, userId))) return sendMessage(sock, sender, '⛔ Réservé aux administrateurs du groupe.');
    const action = String(args[0] || 'help').toLowerCase();
    const data = loadData(); const group = data[sender] || {};
    if (action === 'off') return sendMessage(sock, sender, '🔒 La bienvenue automatique est toujours activée et ne peut pas être désactivée.');
    if (action === 'on') return sendMessage(sock, sender, '✅ La bienvenue automatique est toujours activée par défaut.');
    if (group.enabled !== true) { data[sender] = { ...group, enabled: true }; saveData(data); }
    if (action === 'set') {
      const message = args.slice(1).join(' ').trim();
      if (!message) return sendMessage(sock, sender, `Usage : ${(config.prefix || '.') }welcome set <message>\nVariables : {name}, {group}, {count}`);
      data[sender] = { ...group, message };
      return sendMessage(sock, sender, saveData(data) ? '✅ Message de bienvenue enregistré.' : '❌ Impossible de sauvegarder la configuration.');
    }
    if (action === 'reset') {
      data[sender] = { ...group }; delete data[sender].message;
      return sendMessage(sock, sender, saveData(data) ? '✅ Message de bienvenue réinitialisé.' : '❌ Impossible de sauvegarder la configuration.');
    }
    if (action === 'test') {
      const meta = await sock.groupMetadata(sender);
      const preview = render(group.message, { name: '@nouveau_membre', group: meta.subject || 'ce groupe', count: meta.participants?.length || '?' });
      const caption = `╭━━━〔 👋 𝐉.𝐀.𝐑.𝐕.𝐈.𝐒 • WELCOME 〕━━━╮\n${preview}\n\n${LINK_BLOCK}`;
      const imagePath = path.join(process.cwd(), 'assets', 'jarvis-command.jpg');
      try { return await sock.sendMessage(sender, { image: fs.readFileSync(imagePath), caption }); }
      catch (error) { console.error('[WELCOME] Image de test indisponible:', error.message); return sendMessage(sock, sender, caption); }
    }
    return sendMessage(sock, sender, `${help()}\n\nStatut : 🟢 toujours activé (non désactivable)\n\n${LINK_BLOCK}`);
  } catch (error) {
    console.error('[WELCOME] Erreur:', error.stack || error);
    return sendMessage(sock, sender, '❌ Impossible de gérer la configuration de bienvenue.');
  }
}
