// commands/repo.js — Liens officiels JARVIS AI
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { sendMessage } from '../lib/sendMessage.js';
import { config } from '../config.js';

const COMMAND_GIF_PATH = path.join(process.cwd(), 'assets', 'command-animation.mp4');

const LINKS = {
  telegramGroup: 'https://t.me/+kcLFkzePlwwyZjE8',
  telegramChannel: 'https://t.me/nexusforger',
  whatsappChannel: 'https://whatsapp.com/channel/0029VbCRcEJLdQeYxw5g3m2o',
  botConnect: process.env.BOT_CONNECT_LINK || ''
};

export default async function repo(sock, sender) {
  const text = [
    `╭━━━〔 🔗 ${config.botName || '𝐉.𝐀.𝐑.𝐕.𝐈.𝐒'} • LIENS OFFICIELS 〕━━━╮`,
    '│',
    '├─〔 ✈️ TELEGRAM 〕',
    `│ Groupe : ${LINKS.telegramGroup}`,
    `│ Chaîne : ${LINKS.telegramChannel}`,
    '│',
    '├─〔 🤖 CONNEXION DU BOT 〕',
    `│ ${LINKS.botConnect || 'Lien à ajouter prochainement.'}`,
    '│',
    '├─〔 📢 WHATSAPP 〕',
    `│ Voir la chaîne : ${LINKS.whatsappChannel}`,
    '│',
    `│ 👑 Développeur : ${config.developerName || '𝐋𝐎𝐑𝐃 𝐃𝐄𝐌𝐎𝐍'}`,
    `│ ⚒️ Équipe : ${config.teamName || '𝐍𝐄𝐗𝐔𝐒-𝐅𝐎𝐑𝐆𝐄𝐑'}`,
    '│',
    '╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯'
  ].join('\n');
  try {
    const gif = await readFile(COMMAND_GIF_PATH);
    return await sock.sendMessage(sender, { video: gif, gifPlayback: true, caption: text });
  } catch (imageError) {
    console.warn('[REPO] GIF indisponible, envoi du texte seul :', imageError?.message || imageError);
  }
  return sendMessage(sock, sender, text);
}
