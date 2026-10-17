// ╔══════════════════════════════════════════════════╗
// ║  CONFIG — J.A.R.V.I.S.                            ║
// ║                                                  ║
// ║  ADAPTÉ POUR LE SITE WEB & MULTI-TENANT          ║
// ╚══════════════════════════════════════════════════╝

import dotenv from 'dotenv'
dotenv.config()

// ═══════════════════════════════════════════════════════
// ── FUSEAU HORAIRE
// ═══════════════════════════════════════════════════════
process.env.TZ = process.env.TZ || 'Africa/Ouagadougou'

// ═══════════════════════════════════════════════════════
// ── OWNER — LU DEPUIS .env OU CONFIGURÉ VIA LE SITE WEB ─
// ═══════════════════════════════════════════════════════
const primaryOwnerRaw = process.env.OWNER_NUMBER || process.env.OWNER || ""
const extraOwnersRaw  = process.env.OWNER_NUMBERS || ""
const ownerLidRaw     = process.env.OWNER_LID     || ""

if (!primaryOwnerRaw || !primaryOwnerRaw.replace(/\D/g, "")) {
  console.log("ℹ️ [JARVIS CLOUD] Mode Web actif : les numéros WhatsApp et préfixes sont configurés dynamiquement par les utilisateurs sur le site web.")
}

// ── SUDO pré-configurés depuis .env ──────────────────────
const sudoRaw = process.env.SUDO || process.env.SUDO_NUMBERS || ""

export const config = {
  // ── Owner ─────────────────────────────────────────────
  ownerNumber: primaryOwnerRaw.replace(/\D/g, ""),
  extraOwnerNumbers: extraOwnersRaw
    ? extraOwnersRaw.split(",").map(n => n.replace(/\D/g, "")).filter(Boolean)
    : [],
  ownerLid: ownerLidRaw.replace(/\D/g, ""),

  // ── Bot (rempli automatiquement à la connexion) ───────
  botNumber: "",
  botLid:    "",

  // ── Paramètres généraux ──────────────────────────────
  prefix:  process.env.PREFIX   || ".",
  botName: process.env.BOT_NAME || "𝐉.𝐀.𝐑.𝐕.𝐈.𝐒",
  developerName: process.env.DEVELOPER_NAME || "𝐋𝐎𝐑𝐃 𝐃𝐄𝐌𝐎𝐍",
  teamName: process.env.TEAM_NAME || "𝐍𝐄𝐗𝐔𝐒-𝐅𝐎𝐑𝐆𝐄𝐑",
  mode:    process.env.MODE     || "public",

  // ── Sudo pré-configurés depuis .env ──────────────────
  sudo: sudoRaw
    ? sudoRaw.split(",").map(n => n.replace(/\D/g, "")).filter(Boolean)
    : [],

  // ── Modération ───────────────────────────────────────
  maxWarns:    parseInt(process.env.MAX_WARNS    || "3"),
  cooldownMs:  parseInt(process.env.COOLDOWN_MS  || "2000"),
  floodMax:    parseInt(process.env.FLOOD_MAX    || "5"),
  floodWindow: parseInt(process.env.FLOOD_WINDOW || "5000"),

  // ── Report / Signalement ─────────────────────────────
  reportCooldownMs:    parseInt(process.env.REPORT_COOLDOWN_MS || "10000"),
  reportBridgeEnabled: process.env.REPORT_BRIDGE_ENABLED !== "false",

  // ── Comportement du bot ──────────────────────────────
  settings: {
    autoRead:      process.env.AUTO_READ   !== "false",
    autoTyping:    process.env.AUTO_TYPING !== "false",
    autoRecording: false,
    antiDelete:    false
  }
}
