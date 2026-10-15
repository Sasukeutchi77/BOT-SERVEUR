import fs from 'fs'
import path from 'path'

const CONFIG_FILE = path.join(process.cwd(), 'data', 'groupConfig.json')
const USERS_FILE  = path.join(process.cwd(), 'data', 'users.json')
const CACHE_TTL   = 5 * 60 * 1000
const metaCache   = new Map()

const DEFAULT_GROUP_CONFIG = {
  welcome: false,
  goodbye: false,
  maintenance: false,
  modlog: false,
  antilink: false,
  antipurge: false,
  antidemote: false,
  antipromote: false,
  locks: {
    name: false,
    desc: false,
    photo: false,
    link: false
  },
  antispam: {
    enabled: false,
    max: 6,
    windowMs: 10000
  },
  antimention: {
    enabled: false,
    max: 8
  },
  antisuppression: {
    enabled: false
  },
  antiflood: {
    enabled: false,
    max: 8,
    windowMs: 10000
  },
  antiword: {
    enabled: false,
    words: []
  },
  antitag: {
    enabled: false,
    max: 10
  },
  whitelist: [],
  blacklist: [],
  approved: []
}

export function groupMetaCache() { return metaCache }

export function invalidateGroupCache(groupId) {
  metaCache.delete(groupId)
}

export async function getGroupMeta(sock, groupId) {
  const cached = metaCache.get(groupId)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.meta
  try {
    const meta = await sock.groupMetadata(groupId)
    metaCache.set(groupId, { meta, ts: Date.now() })
    return meta
  } catch {
    return cached?.meta || null
  }
}

function ensureDir() {
  const dir = path.dirname(CONFIG_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function loadConfig() {
  ensureDir()
  try {
    if (fs.existsSync(CONFIG_FILE)) return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
  } catch {}
  return {}
}

function saveConfig(data) {
  ensureDir()
  try { fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2)) } catch {}
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function mergeDeep(base, updates) {
  const output = clone(base)
  for (const [key, value] of Object.entries(updates || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value) && output[key] && typeof output[key] === 'object' && !Array.isArray(output[key])) {
      output[key] = mergeDeep(output[key], value)
    } else {
      output[key] = value
    }
  }
  return output
}

export function getGroupConfig(groupId) {
  return mergeDeep(DEFAULT_GROUP_CONFIG, loadConfig()[groupId] || {})
}

export function setGroupConfig(groupId, updates) {
  const config = loadConfig()
  config[groupId] = mergeDeep(getGroupConfig(groupId), updates || {})
  saveConfig(config)
  return config[groupId]
}

export function updateGroupConfig(groupId, updater) {
  const config = loadConfig()
  const current = mergeDeep(DEFAULT_GROUP_CONFIG, config[groupId] || {})
  const updated = typeof updater === 'function' ? updater(current) : mergeDeep(current, updater || {})
  config[groupId] = mergeDeep(DEFAULT_GROUP_CONFIG, updated || current)
  saveConfig(config)
  return config[groupId]
}

export function updateUserProfile(jid, updater) {
  let users = {}
  try { if (fs.existsSync(USERS_FILE)) users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')) } catch {}
  const old = users[jid] || {}
  users[jid] = updater(old)
  try { fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2)) } catch {}
  return users[jid]
}

// ── Lecture d'un profil utilisateur (xp, messages, commandes…) ─────
// Utilisée par .profile et .rank. Reflète exactement les données
// écrites par updateUserProfile (daily.js, statsManager.js).
export function getUserProfile(jid) {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'))
      return users[jid] || {}
    }
  } catch {}
  return {}
}

// ── Base "V2" : groupes (messages programmés) + rappels ───────────
// Les profils utilisateurs (db.users) reflètent en direct users.json
// (la même source que updateUserProfile/getUserProfile), afin que
// .leaderboard et .rank restent synchronisés avec .daily et l'XP
// gagnée sur chaque message/commande.
const V2_FILE = path.join(process.cwd(), 'data', 'v2db.json')

function ensureV2Dir() {
  const dir = path.dirname(V2_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export function loadV2Db() {
  ensureV2Dir()
  let stored = { groups: {}, reminders: [] }
  try {
    if (fs.existsSync(V2_FILE)) stored = JSON.parse(fs.readFileSync(V2_FILE, 'utf8'))
  } catch {}
  let users = {}
  try {
    if (fs.existsSync(USERS_FILE)) users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'))
  } catch {}
  return {
    users,
    groups: stored.groups || {},
    reminders: stored.reminders || []
  }
}

export function saveV2Db(db) {
  ensureV2Dir()
  try {
    fs.writeFileSync(V2_FILE, JSON.stringify({
      groups: db.groups || {},
      reminders: db.reminders || []
    }, null, 2))
  } catch {}
}
