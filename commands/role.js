// commands/role.js — 𝑴𝑼𝑹𝑨𝑺𝑨𝑲𝑰 𝐒𝐒𝐊 𓂀
// 🔧 FIX : ctx utilisé (senderJid depuis index.js )
// 🔧 FIX: getUserLevel retourne string → converti en nombre
// 🔧 FIX: ctx = {} ajouté

import { sendMessage }                              from '../lib/sendMessage.js'
import { showScanLoader, deleteLoader, formatTime } from '../lib/animLoader.js'

import {
  getSenderJid,
  getUserLevel,
  getUserRoleInfo,
  isOwner,
  isPremium,
  isSuperAdmin,
  cleanNumber
} from '../lib/ownerSystem.js'

// ✅ FIX v2 : convertir le niveau string → nombre
function getLevelNumber(jid) {
  const level = getUserLevel(jid)
  switch (level) {
    case "owner":   return 3
    case "sudo":    return 2
    case "premium": return 1
    default:        return 0
  }
}

export default async function role(sock, sender, args, msg, ctx = {}) {
  let loaderKey = null

  try {

    // ✅ FIX v2 : ctx.senderJid avec fallback
    const userId = ctx.senderJid || getSenderJid(msg, sock)

    // ── CIBLE ────────────────────────────────────────────────
    let targetId        = userId
    let isCheckingOther = false

    if (args[0]) {
      const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
      if (mentions?.length > 0) {
        targetId        = mentions[0]
        isCheckingOther = true
      } else {
        const num = args[0].replace(/[^0-9]/g, '')
        if (num.length >= 8) {
          targetId        = num + '@s.whatsapp.net'
          isCheckingOther = true
        }
      }

      // Seul l'Owner peut vérifier le rôle d'un autre
      if (isCheckingOther && !isOwner(userId)) {
        return await sendMessage(sock, sender,
          `🕸️━━━〔 ⛔ 𝐀𝐂𝐂È𝐒 𝐑𝐄𝐅𝐔𝐒É 〕━━━🕸️\n\n` +
          `│ Seul l'*Owner* peut vérifier\n` +
          `│ le rôle des autres.\n\n` +
          `│ 💡 Utilisez *.role* pour\n` +
          `│    votre propre statut.\n\n` +
          `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        )
      }
    }

    // ── LOADER ───────────────────────────────────────────────
    loaderKey = await showScanLoader(sock, sender, `+${targetId.split('@')[0]}`)

    // ── INFOS ────────────────────────────────────────────────
    // ✅ FIX v1 : niveau en nombre (0-3)
    const level     = getLevelNumber(targetId)
    const roleInfo  = getUserRoleInfo(targetId)
    const targetNum = cleanNumber(targetId)

    // ── BADGES ───────────────────────────────────────────────
    const badges = {
      3: ['👑 OWNER',   '🔑 MASTER',    '⚡ FULL ACCESS' ],
      2: ['⭐ SUDO',    '🛡️ ADMIN BOT', '🔓 ELEVATED'   ],
      1: ['💎 PREMIUM', '✨ VIP',        '🎖️ PRIVILÉGIÉ' ],
      0: ['👤 MEMBRE',  '🆓 STANDARD',  '📱 UTILISATEUR']
    }

    const currentBadges = badges[level] || badges[0]

    // ── PERMISSIONS ──────────────────────────────────────────
    const perms = {
      3: {
        cmds:   ['Toutes les commandes', 'Gestion SUDO/Premium', 'Restart/Eval', 'Broadcast'],
        access: '🔓 Accès total'
      },
      2: {
        cmds:   ['Commandes admin groupe', 'Protections', 'Ban/Warn', 'Broadcast'],
        access: '🔒 Accès SuperAdmin'
      },
      1: {
        cmds:   ['Commandes groupe', 'Gestion membres', 'Modération'],
        access: '🔐 Accès Premium'
      },
      0: {
        cmds:   ['Commandes publiques', 'Menu/Ping/Info'],
        access: '🔏 Accès standard'
      }
    }

    const currentPerms = perms[level] || perms[0]

    // ── BARRE DE NIVEAU ──────────────────────────────────────
    // ✅ FIX v1 : level est maintenant un nombre → repeat() fonctionne
    const levelBar = '⬛'.repeat(Math.max(0, 3 - level)) + '🟨'.repeat(level)

    // ── SUPPRIMER LOADER ─────────────────────────────────────
    await deleteLoader(sock, sender, loaderKey)
    loaderKey = null

    // ── MESSAGE ──────────────────────────────────────────────
    const header = isCheckingOther
      ? `📊 *STATUT D'UN UTILISATEUR*`
      : `📊 *VOTRE STATUT*`

    let roleText =
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `     🕷️ 🔎 ${header} 🕷️\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +

      `🕸️━━━〔 👤 𝐏𝐑𝐎𝐅𝐈𝐋 〕━━━🕸️\n` +
      `│\n` +
      `│ 📱 Numéro: *+${targetNum}*\n` +
      `│ 🕐 Vérifié: ${formatTime()}\n` +
      `│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +

      `🕸️━━━〔 🏅 𝐑Ô𝐋𝐄 & 𝐍𝐈𝐕𝐄𝐀𝐔 〕━━━🕸️\n` +
      `│\n` +
      `│ ${roleInfo.emoji} *${roleInfo.name}*\n` +
      `│ 📊 Niveau: *${level}/3* ${levelBar}\n` +
      `│\n` +
      `│ 🏷️ Badges:\n`

    currentBadges.forEach(badge => {
      roleText += `│   • ${badge}\n`
    })

    roleText +=
      `│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +

      `🕸️━━━〔 🔐 𝐏𝐄𝐑𝐌𝐈𝐒𝐒𝐈𝐎𝐍𝐒 〕━━━🕸️\n` +
      `│\n` +
      `│ ${currentPerms.access}\n` +
      `│\n` +
      `│ ${isOwner(targetId)      ? '⚙️' : '🕷️'} Owner (niveau 3)\n` +
      `│ ${isSuperAdmin(targetId) ? '⚙️' : '🕷️'} SuperAdmin (niveau 2)\n` +
      `│ ${isPremium(targetId)    ? '⚙️' : '🕷️'} Premium (niveau 1)\n` +
      `│\n` +
      `│ 📋 commandes:\n`

    currentPerms.cmds.forEach(cmd => {
      roleText += `│   ✓ ${cmd}\n`
    })

    roleText += `│\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`

    await sendMessage(sock, sender, roleText, { mentions: [targetId] })

  } catch (err) {
    if (loaderKey) await deleteLoader(sock, sender, loaderKey)
    console.error('❌ Erreur role:', err)
    await sendMessage(sock, sender,
      `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
      `│ 📝 _${err.message || 'opération échoué inconnue'}_\n\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )
  }
}