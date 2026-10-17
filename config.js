import dotenv from 'dotenv';
dotenv.config();

process.env.TZ = process.env.TZ || 'Africa/Ouagadougou';

const primaryOwnerRaw = process.env.OWNER_NUMBER || process.env.OWNER || '';
const extraOwnersRaw = process.env.OWNER_NUMBERS || '';
const ownerLidRaw = process.env.OWNER_LID || '';

if (!primaryOwnerRaw || !primaryOwnerRaw.replace(/\D/g, '')) {
  console.warn('[JARVIS] Information: OWNER_NUMBER non défini dans .env. Vous pouvez le configurer via le panneau admin ou .env.');
}

const sudoRaw = process.env.SUDO || process.env.SUDO_NUMBERS || '';

export const config = {
  // ── Owner (lu depuis .env ou mis à jour à la volée) ──────────
  ownerNumber: primaryOwnerRaw.replace(/\D/g, ''),
  extraOwnerNumbers: extraOwnersRaw
    ? extraOwnersRaw.split(',').map((n) => n.replace(/\D/g, '')).filter(Boolean)
    : [],
  ownerLid: ownerLidRaw.replace(/\D/g, ''),

  // ── Bot (rempli automatiquement à la connexion) ───────
  botNumber: '',
  botLid: '',

  // ── Paramètres généraux ──────────────────────────────
  prefix: process.env.PREFIX || '.',
  botName: process.env.BOT_NAME || '𝐉.𝐀.𝐑.𝐕.𝐈.𝐒',
  developerName: process.env.DEVELOPER_NAME || '𝐋𝐎𝐑𝐃 𝐃𝐄𝐌𝐎𝐍',
  teamName: process.env.TEAM_NAME || '𝐍𝐄𝐗𝐔𝐒-𝐅𝐎𝐑𝐆𝐄𝐑',
  mode: process.env.MODE || 'public',

  // ── Sudo pré-configurés depuis .env ──────────────────
  sudo: sudoRaw
    ? sudoRaw.split(',').map((n) => n.replace(/\D/g, '')).filter(Boolean)
    : [],

  // ── Modération ───────────────────────────────────────
  maxWarns: parseInt(process.env.MAX_WARNS || '3', 10),
  cooldownMs: parseInt(process.env.COOLDOWN_MS || '2000', 10),
  floodMax: parseInt(process.env.FLOOD_MAX || '5', 10),
  floodWindow: parseInt(process.env.FLOOD_WINDOW || '5000', 10),

  // ── Comportement du bot ──────────────────────────────
  settings: {
    autoRead: process.env.AUTO_READ !== 'false',
    autoTyping: process.env.AUTO_TYPING !== 'false',
    autoRecording: false,
    antiDelete: false,
  },
};

export default config;
