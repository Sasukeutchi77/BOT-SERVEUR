// commands/warn.js — 𝑴𝑼𝑹𝑨𝑺𝑨𝑲𝑰 𝐒𝐒𝐊 𓂀
// 🔧 FIX: ctx utilisé (senderJid, isOwner, isAdmin, botAdmin)
// 🔧 FIX: matchJid pour comparaison soi-même
// 🔧 FIX: botAdmin vérifié avant expulsion auto
// 🔧 FIX: ctx = {} ajouté

import { sendMessage }                                from '../lib/sendMessage.js'
import { showActionLoader, deleteLoader, formatTime } from '../lib/animLoader.js'
import { getSenderJid, isSuperAdmin, matchJid, cleanNumber } from '../lib/ownerSystem.js'
import fs   from 'fs'
import path from 'path'

const WARN_FILE = path.join(process.cwd(), 'data', 'warnings.json')
const MAX_WARNS = 3

//══════════════════════════════════════
// GESTION DES WARNINGS
//══════════════════════════════════════

function ensureDataDir() {
  const dir = path.dirname(WARN_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function loadWarns() {
  ensureDataDir()
  try {
    if (fs.existsSync(WARN_FILE)) return JSON.parse(fs.readFileSync(WARN_FILE, 'utf8'))
  } catch (e) { console.error('❌ Erreur lecture warns:', e.message) }
  return {}
}

function saveWarns(data) {
  ensureDataDir()
  try {
    fs.writeFileSync(WARN_FILE, JSON.stringify(data, null, 2))
    return true
  } catch (e) {
    console.error('❌ Erreur sauvegarde warns:', e.message)
    return false
  }
}

export function getWarnings(groupId, userId) {
  const warns = loadWarns()
  return warns[groupId]?.[userId]?.count || 0
}

export function clearWarnings(groupId, userId) {
  const warns = loadWarns()
  if (warns[groupId]?.[userId]) {
    delete warns[groupId][userId]
    saveWarns(warns)
    return true
  }
  return false
}

function addWarning(groupId, userId, reason = 'Non spécifiée') {
  const warns = loadWarns()
  if (!warns[groupId]) warns[groupId] = {}
  if (!warns[groupId][userId]) {
    warns[groupId][userId] = { count: 0, reasons: [] }
  }
  warns[groupId][userId].count++
  warns[groupId][userId].reasons.push({
    reason,
    date: new Date().toISOString()
  })
  saveWarns(warns)
  return warns[groupId][userId].count
}

//══════════════════════════════════════
// COMMANDE PRINCIPALE
//══════════════════════════════════════

export default async function warn(sock, sender, args, msg, ctx = {}) {
  let loaderKey = null

  try {

    // ── GROUP ONLY ───────────────────────────────────────────
    if (!sender.endsWith('@g.us')) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
        `│ commande *groupe* uniquement.\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── CTX ──────────────────────────────────────────────────
    const userId  = ctx.senderJid || getSenderJid(msg, sock)
    const isOwner = ctx.isOwner   || isSuperAdmin(userId)
    const isAdmin = ctx.isAdmin   || false

    // ── PERMISSION : Owner ou Admin groupe ───────────────────
    if (!isOwner && !isAdmin) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 ⛔ 𝐀𝐂𝐂È𝐒 𝐑𝐄𝐅𝐔𝐒É 〕━━━🕸️\n\n` +
        `│ 🔒 Requis: *administrateur* du groupe\n` +
        `│    ou *Owner/Sudo* du Système\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── TARGET ───────────────────────────────────────────────
    let targetId = null

    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    if (mentions?.length > 0) {
      targetId = mentions[0]
    } else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
      targetId = msg.message.extendedTextMessage.contextInfo.participant
    } else if (args[0]) {
      const num = args[0].replace(/[^0-9]/g, '')
      if (num.length >= 8) targetId = num + '@s.whatsapp.net'
    }

    if (!targetId) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 🕷️ 𝐒𝐘𝐍𝐓𝐀𝐗𝐄 〕━━━🕸️\n\n` +
        `│ • *.warn @utilisateur [raison]*\n` +
        `│ • Répondre + *.warn [raison]*\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ✅ FIX : matchJid au lieu de === (gère LID)
    if (matchJid(targetId, userId)) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 ⚠️ 𝐈𝐌𝐏𝐎𝐒𝐒𝐈𝐁𝐋𝐄 〕━━━🕸️\n\n` +
        `│ Vous ne pouvez pas vous\n` +
        `│ avertir vous-même.\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    const reason    = args.slice(1).join(' ') || 'Non spécifiée'
    const targetNum = cleanNumber(targetId)

    loaderKey = await showActionLoader(sock, sender, 'AVERTISSEMENT', '⚠️')

    const newWarnCount = addWarning(sender, targetId, reason)
    const isMax        = newWarnCount >= MAX_WARNS

    await deleteLoader(sock, sender, loaderKey)
    loaderKey = null

    // Indicateur visuel
    const warnDots = '🤖'.repeat(newWarnCount) +
                     '⚪'.repeat(Math.max(0, MAX_WARNS - newWarnCount))

    let warnText =
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `     🕷️ ⚠️ *AVERTISSEMENT* ⚠️ 🕷️\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️━━━〔 👤 𝐔𝐓𝐈𝐋𝐈𝐒𝐀𝐓𝐄𝐔𝐑 〕━━━🕸️\n` +
      `│\n` +
      `│ 🎯 Cible: @${targetNum}\n` +
      `│ ⚠️ Avertissements: *${newWarnCount}/${MAX_WARNS}*\n` +
      `│ ${warnDots}\n` +
      `│ 📋 Raison: ${reason}\n` +
      `│ 🕐 Heure: ${formatTime()}\n` +
      `│ 👮 Par: @${cleanNumber(userId)}\n` +
      `│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`

    if (isMax) {
      // ✅ FIX : vérifier ctx.botAdmin avant d'expulser
      if (!ctx.botAdmin) {
        warnText +=
          `\n\n🕸️━━━〔 ⚠️ 𝐋𝐈𝐌𝐈𝐓𝐄 𝐀𝐓𝐓𝐄𝐈𝐍𝐓𝐄 〕━━━🕸️\n` +
          `│\n` +
          `│ 💥 *${MAX_WARNS}* avertissements atteints!\n` +
          `│ ⚠️ Le Système n'est pas administrateur,\n` +
          `│    expulsion impossible.\n` +
          `│\n` +
          `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      } else {
        // Expulser automatiquement
        try {
          await sock.groupParticipantsUpdate(sender, [targetId], 'remove')
          clearWarnings(sender, targetId)

          // Invalider le cache après expulsion
          if (ctx.invalidateGroupCache) ctx.invalidateGroupCache(sender)

          warnText +=
            `\n\n🕸️━━━〔 🚨 𝐄𝐗𝐈𝐋 𝐀𝐔𝐓𝐎 〕━━━🕸️\n` +
            `│\n` +
            `│ 💥 *${MAX_WARNS}* avertissements atteints!\n` +
            `│ 👢 @${targetNum} a été *EXPULSÉ*\n` +
            `│ ♻️ Avertissements *réinitialisés*\n` +
            `│\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        } catch (e) {
          warnText += `\n\n⚠️ Échec expulsion auto: ${e.message}`
        }
      }
    } else {
      warnText += `\n\n💡 _Encore *${MAX_WARNS - newWarnCount}* avertissement(s) avant expulsion_`
    }

    await sendMessage(sock, sender, warnText, { mentions: [targetId, userId] })

    console.log(`⚠️ warn | +${targetNum} (${newWarnCount}/${MAX_WARNS}) | par: +${cleanNumber(userId)}`)

  } catch (err) {
    if (loaderKey) await deleteLoader(sock, sender, loaderKey)
    console.error('❌ Erreur warn:', err)
    await sendMessage(sock, sender,
      `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
      `│ 📝 _${err.message || 'opération échoué inconnue'}_\n\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )
  }
}