// commands/warn.js — Gestion des avertissements J.A.R.V.I.S.
import fs from 'fs'
import path from 'path'
import { sendMessage } from '../lib/sendMessage.js'
import { resolveTarget } from '../lib/targetResolver.js'
import { config } from '../config.js'

const DATA_DIR = path.resolve(process.cwd(), 'data')
const WARNS_FILE = path.join(DATA_DIR, 'warnings.json')

function loadWarns() {
  try {
    if (fs.existsSync(WARNS_FILE)) {
      return JSON.parse(fs.readFileSync(WARNS_FILE, 'utf8'))
    }
  } catch {}
  return {}
}

function saveWarns(data) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(WARNS_FILE, JSON.stringify(data, null, 2), 'utf8')
  } catch (e) {
    console.error('Erreur sauvegarde warnings:', e)
  }
}

export function getWarnings(groupId, userId) {
  const all = loadWarns()
  return (all[groupId]?.[userId] || []).length
}

export function addWarning(groupId, userId, reason = 'Avertissement') {
  const all = loadWarns()
  if (!all[groupId]) all[groupId] = {}
  if (!all[groupId][userId]) all[groupId][userId] = []
  all[groupId][userId].push({ reason, timestamp: Date.now() })
  saveWarns(all)
  return all[groupId][userId].length
}

export function clearWarnings(groupId, userId) {
  const all = loadWarns()
  if (all[groupId] && all[groupId][userId] && all[groupId][userId].length > 0) {
    delete all[groupId][userId]
    saveWarns(all)
    return true
  }
  return false
}

export function removeWarning(groupId, userId) {
  const all = loadWarns()
  if (all[groupId] && all[groupId][userId] && all[groupId][userId].length > 0) {
    all[groupId][userId].pop()
    saveWarns(all)
    return all[groupId][userId].length
  }
  return 0
}

export default async function warn(sock, sender, args, msg, ctx = {}) {
  try {
    if (!ctx.isGroup) {
      return await sendMessage(sock, sender, '❌ Cette commande est utilisable uniquement dans un groupe.')
    }
    if (!ctx.isOwner && !ctx.isAdmin) {
      return await sendMessage(sock, sender, '🚫 Réservé aux administrateurs du groupe.')
    }

    const { targetId, targetNumber } = resolveTarget(msg, args)
    if (!targetId) {
      return await sendMessage(sock, sender, '⚠️ Mentionnez un utilisateur ou répondez à son message : `.warn @user [motif]`')
    }

    const reason = args.slice(1).join(' ') || 'Non spécifié'
    const currentWarns = addWarning(sender, targetId, reason)
    const maxWarns = config.maxWarns || 3

    if (currentWarns >= maxWarns) {
      clearWarnings(sender, targetId)
      await sendMessage(sock, sender, `🚨 *EXPULSION* : @${targetNumber} a atteint la limite de ${maxWarns} avertissements !`, { mentions: [targetId] })
      try {
        await sock.groupParticipantsUpdate(sender, [targetId], 'remove')
      } catch (kickErr) {
        await sendMessage(sock, sender, '⚠️ Impossible d\'expulser l\'utilisateur. Vérifiez que le bot est administrateur du groupe.')
      }
    } else {
      await sendMessage(sock, sender, `⚠️ *AVERTISSEMENT* pour @${targetNumber}\n\n📝 Motif : ${reason}\n📊 Avertissements : ${currentWarns}/${maxWarns}`, { mentions: [targetId] })
    }
  } catch (err) {
    console.error('Erreur commande warn:', err)
    await sendMessage(sock, sender, `❌ Erreur : ${err.message}`)
  }
}
