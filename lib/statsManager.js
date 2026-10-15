import path from 'path'
import { readJson, writeJson } from './safeStore.js'
import { updateUserProfile } from './groupConfig.js'

const FILE = path.join(process.cwd(), 'data', 'stats.json')
const DEFAULT = { startedAt: new Date().toISOString(), messages: 0, commands: 0, groups: {}, users: {}, commandUsage: {} }

function dayKey() { return new Date().toISOString().slice(0, 10) }
function load() { return readJson(FILE, DEFAULT) }
function save(db) { writeJson(FILE, db) }

export function recordMessage({ groupId, userId }) {
  const db = load()
  db.messages++
  db.groups[groupId] ||= { messages: 0, commands: 0, daily: {} }
  db.groups[groupId].messages++
  db.groups[groupId].daily[dayKey()] ||= { messages: 0, commands: 0 }
  db.groups[groupId].daily[dayKey()].messages++
  db.users[userId] ||= { messages: 0, commands: 0 }
  db.users[userId].messages++
  save(db)
  updateUserProfile(userId, p => ({ ...p, messages: (p.messages || 0) + 1, xp: (p.xp || 0) + 1 }))
}

export function recordCommand({ groupId, userId, command }) {
  const db = load()
  db.commands++
  db.commandUsage[command] = (db.commandUsage[command] || 0) + 1
  db.groups[groupId] ||= { messages: 0, commands: 0, daily: {} }
  db.groups[groupId].commands++
  db.groups[groupId].daily[dayKey()] ||= { messages: 0, commands: 0 }
  db.groups[groupId].daily[dayKey()].commands++
  db.users[userId] ||= { messages: 0, commands: 0 }
  db.users[userId].commands++
  save(db)
  updateUserProfile(userId, p => ({ ...p, commands: (p.commands || 0) + 1, xp: (p.xp || 0) + 3 }))
}

export function getStats() { return load() }
export function getTopUsers(limit = 10) {
  const db = load()
  return Object.entries(db.users).sort((a, b) => (b[1].messages + b[1].commands) - (a[1].messages + a[1].commands)).slice(0, limit)
}
