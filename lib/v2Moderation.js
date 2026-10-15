import { getGroupConfig, updateGroupConfig } from './groupConfig.js'
import { sendMessage } from './sendMessage.js'
import { cleanNumber } from './ownerSystem.js'
import { logAction } from './auditLogger.js'

const floodMap = new Map()

export async function handleV2Automod(sock, chatJid, senderJid, text, msg, ctx = {}) {
  if (!chatJid.endsWith('@g.us')) return false
  const cfg = getGroupConfig(chatJid)
  const senderNum = cleanNumber(senderJid)
  if (ctx.isOwner || ctx.isAdmin || cfg.approved.includes(senderNum) || cfg.whitelist.includes(senderNum)) return false
  if (cfg.blacklist.includes(senderNum)) {
    await sock.groupParticipantsUpdate(chatJid, [senderJid], 'remove').catch(() => {})
    logAction('blacklist-kick', { groupId: chatJid, userId: senderJid })
    return true
  }
  if (cfg.antiword?.enabled && text) {
    const lower = text.toLowerCase()
    const hit = (cfg.antiword.words || []).find(w => lower.includes(String(w).toLowerCase()))
    if (hit) {
      await sock.sendMessage(chatJid, { delete: msg.key }).catch(() => {})
      await sendMessage(sock, chatJid, 'Mot interdit détecté chez @' + senderNum + '.', { mentions: [senderJid] })
      logAction('antiword', { groupId: chatJid, userId: senderJid, word: hit })
      return true
    }
  }
  if (cfg.antiflood?.enabled) {
    const key = chatJid + ':' + senderNum
    const now = Date.now()
    const list = (floodMap.get(key) || []).filter(t => now - t < (cfg.antiflood.windowMs || 5000))
    list.push(now)
    floodMap.set(key, list)
    if (list.length > (cfg.antiflood.max || 6)) {
      await sock.sendMessage(chatJid, { delete: msg.key }).catch(() => {})
      await sendMessage(sock, chatJid, 'Anti-flood: @' + senderNum + ', ralentis.', { mentions: [senderJid] })
      logAction('antiflood', { groupId: chatJid, userId: senderJid, count: list.length })
      return true
    }
  }
  return false
}

export function setListValue(groupId, listName, number, enabled) {
  return updateGroupConfig(groupId, cfg => {
    cfg[listName] ||= []
    cfg[listName] = enabled ? [...new Set([...cfg[listName], number])] : cfg[listName].filter(n => n !== number)
    return cfg
  })
}
