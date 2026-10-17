// commands/profile.js — J.A.R.V.I.S.
// ✅ Profil utilisateur avec design amélioré

import { sendMessage } from '../lib/sendMessage.js'
import { getSenderJid, cleanNumber, isDeployer, isSudo, isPremium, isBanned } from '../lib/ownerSystem.js'
import { getUserProfile } from '../lib/groupConfig.js'

function getLevel(xp) {
  return Math.floor(Math.sqrt((xp || 0) / 10)) + 1
}

function getXpBar(xp) {
  const level    = getLevel(xp)
  const xpForLvl = ((level - 1) ** 2) * 10
  const xpNext   = (level ** 2) * 10
  const progress = Math.min(Math.round(((xp - xpForLvl) / (xpNext - xpForLvl)) * 10), 10)
  return '▓'.repeat(progress) + '░'.repeat(10 - progress)
}

function getRole(jid) {
  if (isDeployer(jid)) return { label: 'DÉPLOYEUR', emoji: '👑' }
  if (isSudo(jid))     return { label: 'SUDO', emoji: '🔐' }
  if (isPremium(jid))  return { label: 'PREMIUM', emoji: '💎' }
  if (isBanned(jid))   return { label: 'BANNI', emoji: '🚫' }
  return                      { label: 'MEMBRE', emoji: '👤' }
}

export default async function profile(sock, sender, args, msg, ctx = {}) {
  try {
    const jid  = ctx.senderJid || getSenderJid(msg, sock)
    const p    = getUserProfile(jid)
    const role = getRole(jid)
    const xp   = p.xp || 0
    const lvl  = getLevel(xp)
    const xpNext = (lvl ** 2) * 10
    const streak = p.dailyStreak || 0

    await sendMessage(sock, sender,
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `│   👤  PROFIL UTILISATEUR       🕷️\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️━━━〔 🪪 𝐈𝐃𝐄𝐍𝐓𝐈𝐓É 〕━━━🕸️\n│\n` +
      `│  ${role.emoji} *Rôle :* ${role.label}\n` +
      `│  📱 *Numéro :* +${cleanNumber(jid)}\n│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️━━━〔 🏆 𝐏𝐑𝐎𝐆𝐑𝐄𝐒𝐒𝐈𝐎𝐍 〕━━━🕸️\n│\n` +
      `│  ⭐ *Niveau :* ${lvl}\n` +
      `│  ✨ *XP :* ${xp} / ${xpNext}\n` +
      `│  ${getXpBar(xp)}  Niv.${lvl + 1}\n│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️━━━〔 📊 𝐀𝐂𝐓𝐈𝐕𝐈𝐓É 〕━━━🕸️\n│\n` +
      `│  💬 *Messages :* ${p.messages || 0}\n` +
      `│  ⚡ *commandes :* ${p.commands || 0}\n` +
      `│  🔥 *Streak daily :* ${streak} jour(s)\n` +
      `│  ${streak >= 7 ? '🔥 Série active !' : streak >= 3 ? '⚡ Bonne série !' : '💡 Faites \`.daily\` chaque jour !'}\n│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `_💡 \`.daily\` → +50 XP chaque jour_`,
      { mentions: [jid] }
    )

  } catch (e) {
    console.error('❌ profile.js:', e)
    await sendMessage(sock, sender, `│ opération échoué profile: ${e.message}`)
  }
}
