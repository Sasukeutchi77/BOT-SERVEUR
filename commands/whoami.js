// commands/whoami.js — 𝑴𝑼𝑹𝑨𝑺𝑨𝑲𝑰 𝐒𝐒𝐊 𓂀
// FIX CRITIQUE: utilise ctx.isMainOwner / ctx.isSudo (calculés par index.js)
// au lieu de recalculer depuis le JID brut (qui peut être @lid non résolu)

import { sendMessage }                    from "../lib/sendMessage.js"
import { showScanLoader, deleteLoader }   from "../lib/animLoader.js"
import { config }                         from "../config.js"
import {
  getMode,
  getSenderJid,
  isBanned,
  isPremium,
  cleanNumber,
  matchJid
} from "../lib/ownerSystem.js"


function getRoleInfo(isOwner, isSudo, isPremiumUser, isBannedUser, isSessionOwner, isSessionSudo) {
  if (isOwner)         return { role: "DÉPLOYEUR",      emoji: "👑", badge: "PROPRIÉTAIRE SUPRÊME",      color: "⭐" }
  if (isSessionOwner)  return { role: "SESSION OWNER",  emoji: "👑", badge: "OWNER DE TA SESSION", color: "⭐" }
  if (isSudo)          return { role: "SUDO",            emoji: "🔐", badge: "ADMINISTRATEUR",      color: "🟣" }
  if (isSessionSudo)   return { role: "SESSION SUDO",    emoji: "🔐", badge: "SUDO DE TA SESSION",  color: "🟣" }
  if (isPremiumUser)   return { role: "PREMIUM",         emoji: "💎", badge: "MEMBRE PREMIUM",      color: "🔵" }
  if (isBannedUser)    return { role: "BANNI",           emoji: "🚫", badge: "ACCÈS REFUSÉ",        color: "🤖" }
  return                      { role: "MEMBRE",          emoji: "👤", badge: "UTILISATEUR",         color: "⚪" }
}


export default async function whoami(sock, sender, args, msg, ctx = {}) {
  let loadKey = null

  try {
    const isGroup   = sender?.endsWith("@g.us")
    const senderJid = getSenderJid(msg, sock)
    const num       = cleanNumber(senderJid)

    loadKey = await showScanLoader(sock, sender, num)

    // ── RÔLE : on fait confiance au ctx calculé par index.js ──────────────
    // ctx.isMainOwner = true si l'envoyeur est OWNER (OWNER_NUMBER dans .env)
    // ctx.isSudo      = true si owner OU dans la liste sudo
    // Ces valeurs gèrent correctement fromMe + LID + numéro normal
    // Distinguer Owner global vs Session Owner pour l'affichage
    const isGlobalOwnerCtx  = Boolean(ctx.isGlobalMainOwner)
    const isSessionOwnerCtx = Boolean(ctx.isSessionOwner)
    const isSessionSudoCtx  = Boolean(ctx.isSessionSudo)
    const isOwnerCtx        = isGlobalOwnerCtx
    const isSudoCtx         = Boolean(ctx.isSudo) && !isSessionOwnerCtx && !isGlobalOwnerCtx
    const isPremiumCtx      = Boolean(ctx.isPremium) || isPremium(senderJid)
    const isBannedCtx       = isBanned(senderJid)

    const roleInfo = getRoleInfo(isOwnerCtx, isSudoCtx, isPremiumCtx, isBannedCtx, isSessionOwnerCtx, isSessionSudoCtx)

    const mode = getMode()
    const time = new Date().toLocaleTimeString("fr-FR", {
      hour:   "2-digit",
      minute: "2-digit"
    })

    // ── ADMIN GROUPE ──────────────────────────────────────────
    let isGroupAdmin = false
    if (isGroup) {
      try {
        const meta = ctx.groupMeta || await sock.groupMetadata(sender)
        const p    = meta?.participants?.find(p => matchJid(p.id, senderJid))
        isGroupAdmin = p?.admin === "admin" || p?.admin === "superadmin"
      } catch {}
    }

    await deleteLoader(sock, sender, loadKey)
    loadKey = null

    // ── DROITS D'ACCÈS ────────────────────────────────────────
    const canGroup  = isGroupAdmin || isSudoCtx || isOwnerCtx || isSessionOwnerCtx || isSessionSudoCtx
    const canAdmin  = isSudoCtx || isOwnerCtx || isSessionOwnerCtx || isSessionSudoCtx
    const canDeploy = isOwnerCtx  // commandes système suprêmes : owner principal seulement

    // ── NUMÉRO AFFICHÉ ────────────────────────────────────────
    // En groupe on affiche le numéro réel (pas le LID)
    const displayNum = num || cleanNumber(msg.key?.remoteJid || "")

    const text =
      `🕸️━━━〔 🔎 𝐏𝐑𝐎𝐅𝐈𝐋 𝐔𝐓𝐈𝐋𝐈𝐒𝐀𝐓𝐄𝐔𝐑 〕━━━🕸️\n` +
      `│\n` +
      `│  ${roleInfo.emoji} *Rôle :* ${roleInfo.role}\n` +
      `│  ${roleInfo.color} *Badge :* ${roleInfo.badge}\n` +
      `│  📱 *Numéro :* +${displayNum}\n` +
      (isGroup ? `│  👮 *administrateur groupe :* ${isGroupAdmin ? "⚙️ Oui" : "🕷️ Non"}\n` : "") +
      `│\n` +
      `│  🤖 *Mode Système :* ${mode.toUpperCase()}\n` +
      `│  🕐 *Heure :* ${time}\n` +
      `│\n` +
      `│  📊 *Droits d'accès :*\n` +
      `│  └ commandes publiques : ⚙️\n` +
      `│  └ commandes groupe : ${canGroup  ? "⚙️" : "🕷️"}\n` +
      `│  └ commandes administrateur : ${canAdmin  ? "⚙️" : "🕷️"}\n` +
      `│  └ commandes système (suprêmes) : ${canDeploy ? "⚙️" : "🕷️"}\n` +
      (ctx.isSecondaryBot
        ? `│\n🕷️  🔗 *Session pairée :* +${ctx.sessionBotNumber}\n`
        : "") +
      `│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`

    await sendMessage(sock, sender, text)

  } catch (e) {
    console.error("❌ whoami.js:", e)
    if (loadKey) await deleteLoader(sock, sender, loadKey)
    await sendMessage(sock, sender, "🕷️ opération échoué whoami")
  }
}
