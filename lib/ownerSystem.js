// ╔══════════════════════════════════════════════════════╗
// ║          OWNER SYSTEM — J.A.R.V.I.S.               ║
// ║                                                     ║
// ║  SOURCE DE VÉRITÉ : process.env (lu via config.js)  ║
// ║                                                     ║
// ║  Hiérarchie des droits :                            ║
// ║    OWNER     → OWNER_NUMBER dans .env (unique)      ║
// ║    SUDO      → ajoutés/retirés via commandes        ║
// ║    PREMIUM   → ajoutés/retirés via commandes        ║
// ║    USER      → tout le monde                        ║
// ╚══════════════════════════════════════════════════════╝

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { config } from "../config.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

const DB_FILE            = path.join(__dirname, "../data/users.json")
const LID_DB_FILE        = path.join(__dirname, "../data/lid_map.json")
const LEGACY_LIB_DB_FILE = path.join(__dirname, "../data/lib_map.json")

//══════════════════════════════════════════════════════════
// RUNTIME OWNER — injecté au démarrage depuis le sock
// Complète config.ownerNumber pour la gestion LID
//══════════════════════════════════════════════════════════

let RUNTIME_OWNER_NUMBER = ""
let RUNTIME_OWNER_LID    = ""

export function setRuntimeOwner({ ownerNumber = "", ownerLid = "" } = {}) {
  const num = cleanNumber(ownerNumber)
  const lid = cleanNumber(ownerLid)

  if (num) RUNTIME_OWNER_NUMBER = num
  if (lid) RUNTIME_OWNER_LID    = lid

  if (num && lid) {
    lidToPhone.set(lid, num)
    phoneToLid.set(num, lid)
    saveLidMap()
    console.log(`✅ Runtime owner injecté: ${lid} → +${num}`)
  }

  if (num) console.log(`✅ Runtime owner number: +${num}`)
}

//══════════════════════════════════════
// DATABASE USERS (sudo, premium, ban)
//══════════════════════════════════════

let db = { sudo: [], premium: [], banned: [] }

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf8")
      if (raw.trim()) db = JSON.parse(raw)
      if (!Array.isArray(db.sudo))    db.sudo    = []
      if (!Array.isArray(db.premium)) db.premium = []
      if (!Array.isArray(db.banned))  db.banned  = []
    } else {
      fs.mkdirSync(path.dirname(DB_FILE), { recursive: true })
      saveDB()
    }
    // Synchroniser les sudo pré-configurés dans .env
    _syncEnvSudo()
  } catch (err) {
    console.log("DB LOAD ERROR:", err)
  }
}

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
  } catch (err) {
    console.log("DB SAVE ERROR:", err)
  }
}

// Synchronise les numéros SUDO définis dans .env (SUDO=...)
// Ils sont ajoutés à la DB si absents, mais ne deviennent jamais owner
function _syncEnvSudo() {
  const envSudos = config.sudo || []
  let changed = false
  for (const num of envSudos) {
    const cleaned = cleanNumber(num)
    if (cleaned && !db.sudo.includes(cleaned)) {
      db.sudo.push(cleaned)
      changed = true
    }
  }
  if (changed) saveDB()
}

loadDB()

//══════════════════════════════════════
// LID / LIB MAP (résolution @lid ↔ numéro)
//══════════════════════════════════════

const lidToPhone = new Map()
const phoneToLid = new Map()

function registerAlias(aliasJid, phoneJid) {
  const alias = cleanNumber(aliasJid)
  const phone = cleanNumber(phoneJid)
  if (!alias || !phone) return false

  const prev = lidToPhone.get(alias)
  lidToPhone.set(alias, phone)

  if (!phoneToLid.has(phone) || phoneToLid.get(phone) === alias) {
    phoneToLid.set(phone, alias)
  }

  return prev !== phone
}

function loadAliasFile(file, label) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, "{}")
      return
    }
    const raw = fs.readFileSync(file, "utf8")
    if (!raw.trim()) return
    const data = JSON.parse(raw)
    for (const [alias, phone] of Object.entries(data)) {
      registerAlias(alias, phone)
    }
  } catch (err) {
    console.log(`${label} LOAD ERROR:`, err)
  }
}

function loadLidMap() {
  loadAliasFile(LID_DB_FILE, "LID MAP")
  loadAliasFile(LEGACY_LIB_DB_FILE, "LIB MAP")
}

function saveLidMap() {
  try {
    const data = {}
    for (const [alias, phone] of lidToPhone.entries()) data[alias] = phone
    fs.writeFileSync(LID_DB_FILE, JSON.stringify(data, null, 2))
    fs.writeFileSync(LEGACY_LIB_DB_FILE, JSON.stringify(data, null, 2))
  } catch (err) {
    console.log("LID/LIB MAP SAVE ERROR:", err)
  }
}

function injectConfigLid() {
  const ownerPhone = cleanNumber(config.ownerNumber)
  const ownerLid   = cleanNumber(config.ownerLid || "")
  if (ownerPhone && ownerLid) {
    lidToPhone.set(ownerLid, ownerPhone)
    phoneToLid.set(ownerPhone, ownerLid)
    console.log(`✅ Owner LID injecté (.env): ${ownerLid} → +${ownerPhone}`)
  }
}

loadLidMap()
injectConfigLid()
console.log(`📋 LID map prête: ${lidToPhone.size} entrée(s)`)

export function registerLid(lidJid, phoneJid) {
  if (!lidJid || !phoneJid) return
  const changed = registerAlias(lidJid, phoneJid)
  if (changed) saveLidMap()
}

function resolveLidToPhone(jid = "") {
  const l = jid.toString().split("@")[0].split(":")[0].replace(/\D/g, "")
  return lidToPhone.get(l) || null
}

function resolvePhoneToLid(num = "") {
  return phoneToLid.get(num.toString().replace(/\D/g, "")) || null
}

//══════════════════════════════════════════════════════════
// UTILITAIRES JID
//══════════════════════════════════════════════════════════

export function cleanNumber(jid = "") {
  if (!jid) return ""
  return jid.toString().split("@")[0].split(":")[0].replace(/[^0-9]/g, "")
}

function toComparablePhone(jid = "") {
  const num = cleanNumber(jid)
  if (!num) return ""
  const resolved = lidToPhone.get(num)
  return resolved || num
}

export function resolveToPhone(jid = "") {
  if (!jid) return ""
  return toComparablePhone(jid)
}

export function normalizeJid(jid = "") {
  if (!jid) return ""
  if (jid.includes("@g.us")) return jid
  const phone = toComparablePhone(jid)
  if (!phone) return jid
  return phone + "@s.whatsapp.net"
}

export function isGroupMessage(msg) {
  return msg?.key?.remoteJid?.endsWith("@g.us") === true
}

export function matchJid(jidA, jidB) {
  if (!jidA || !jidB) return false

  const numA = cleanNumber(jidA)
  const numB = cleanNumber(jidB)
  if (numA && numB && numA === numB) return true

  const phoneA = toComparablePhone(jidA)
  const phoneB = toComparablePhone(jidB)
  if (phoneA && phoneB && phoneA === phoneB) return true
  if (phoneA && phoneA === numB) return true
  if (phoneB && phoneB === numA) return true

  const lidA = jidA.includes("@lid") ? numA : resolvePhoneToLid(phoneA || numA)
  const lidB = jidB.includes("@lid") ? numB : resolvePhoneToLid(phoneB || numB)
  if (lidA && lidB && lidA === lidB) return true

  return false
}

//══════════════════════════════════════════════════════════
// GET SENDER JID
//══════════════════════════════════════════════════════════

export function getSenderJid(msg, sock = null) {
  if (!msg) return ""

  const isGroup = msg.key?.remoteJid?.endsWith("@g.us")

  if (msg.key?.fromMe) {
    const selfId =
      sock?.user?.id ||
      (RUNTIME_OWNER_NUMBER ? RUNTIME_OWNER_NUMBER + "@s.whatsapp.net" : "") ||
      (config.ownerNumber   ? cleanNumber(config.ownerNumber) + "@s.whatsapp.net" : "")
    return normalizeJid(selfId)
  }

  if (isGroup) {
    const raw =
      msg.key?.participant ||
      msg.participant      ||
      msg.message?.extendedTextMessage?.contextInfo?.participant ||
      ""

    if (!raw) return ""

    if (raw.includes("@lid")) {
      const resolved = resolveLidToPhone(raw)
      if (resolved) return resolved + "@s.whatsapp.net"
      return raw
    }

    return normalizeJid(raw)
  }

  return normalizeJid(msg.key?.remoteJid || "")
}

//══════════════════════════════════════════════════════════
// OWNER SYSTEM
//
// SOURCE DE VÉRITÉ : OWNER_NUMBER dans .env
// config.ownerNumber = process.env.OWNER_NUMBER
// Toutes les vérifications isOwner() passent par ici.
//══════════════════════════════════════════════════════════

function getOwnerNumbers() {
  const numbers = new Set()

  if (RUNTIME_OWNER_NUMBER) numbers.add(RUNTIME_OWNER_NUMBER)
  if (config.ownerNumber)   numbers.add(cleanNumber(config.ownerNumber))

  if (Array.isArray(config.extraOwnerNumbers)) {
    for (const n of config.extraOwnerNumbers) {
      const cleaned = cleanNumber(n)
      if (cleaned) numbers.add(cleaned)
    }
  }

  return numbers
}

function getOwnerLids() {
  const lids = new Set()
  if (RUNTIME_OWNER_LID) lids.add(RUNTIME_OWNER_LID)
  if (config.ownerLid)   lids.add(cleanNumber(config.ownerLid))
  return lids
}

export function isOwner(jid) {
  if (!jid) return false

  const owners    = getOwnerNumbers()
  const ownerLids = getOwnerLids()
  const num       = cleanNumber(jid)
  const phone     = toComparablePhone(jid)

  // ── Comparaison directe numéro ──────────────────────────
  if (num && owners.has(num)) return true
  if (phone && owners.has(phone)) return true

  // ── Comparaison directe LID (avec ou sans @lid suffix) ──
  // Vérifie si num correspond à un LID owner connu depuis .env
  // Couvre le cas où Baileys envoie "16849945247916@lid" OU juste "16849945247916"
  if (ownerLids.has(num)) return true

  if (jid.includes("@lid")) {
    const resolvedPhone = resolveLidToPhone(jid)
    if (resolvedPhone && owners.has(resolvedPhone)) return true
    for (const ownerLid of ownerLids) {
      if (ownerLid === num) return true
    }
  }

  // ── Résolution inverse phone → LID ──────────────────────
  const lid = resolvePhoneToLid(phone || num)
  if (lid && ownerLids.has(lid)) return true

  return false
}

export function isOwnerFromMsg(msg, sock = null) {
  return isOwner(getSenderJid(msg, sock))
}

export function isDeployer(jid) { return isOwner(jid) }

//══════════════════════════════════════════════════════════
// SUDO SYSTEM
//══════════════════════════════════════════════════════════

export function isSudo(jid) {
  if (isOwner(jid)) return true
  const phone = resolveToPhone(jid)
  if (phone && db.sudo.includes(phone)) return true
  const num = cleanNumber(jid)
  if (db.sudo.includes(num)) return true
  return false
}

export function addSudo(jid) {
  if (isOwner(jid)) {
    return { success: false, error: "Cet utilisateur est déjà le propriétaire.", total: db.sudo.length }
  }
  const num = resolveToPhone(jid) || cleanNumber(jid)
  if (!num) {
    return { success: false, error: "Impossible de résoudre le numéro.", total: db.sudo.length }
  }
  if (!db.sudo.includes(num)) {
    db.sudo.push(num)
    saveDB()
    console.log(`⭐ Sudo ajouté: +${num}`)
    return { success: true, num, total: db.sudo.length }
  }
  return { success: false, error: "Déjà SUDO.", total: db.sudo.length }
}

export function removeSudo(jid) {
  const num = resolveToPhone(jid) || cleanNumber(jid)
  if (!db.sudo.includes(num)) {
    return { success: false, error: "Pas dans la liste SUDO.", total: db.sudo.length }
  }
  db.sudo = db.sudo.filter(n => n !== num)
  saveDB()
  return { success: true, total: db.sudo.length }
}

export function getSudoList() {
  const ownerNum = cleanNumber(config.ownerNumber) || RUNTIME_OWNER_NUMBER
  return {
    deployer: ownerNum ? ownerNum + "@s.whatsapp.net" : null,
    direct:   db.sudo,
    file:     db.sudo,
    count:    { total: db.sudo.length }
  }
}

//══════════════════════════════════════
// PREMIUM
//══════════════════════════════════════

export function isPremium(jid) {
  const phone = resolveToPhone(jid)
  if (phone && db.premium.includes(phone)) return true
  return db.premium.includes(cleanNumber(jid))
}

export function addPremium(jid) {
  const num = resolveToPhone(jid) || cleanNumber(jid)
  if (!num) return { success: false, error: "Impossible de résoudre le numéro.", total: db.premium.length }
  if (db.premium.includes(num)) return { success: false, error: "Déjà PREMIUM.", total: db.premium.length }
  db.premium.push(num)
  saveDB()
  return { success: true, num, total: db.premium.length }
}

export function removePremium(jid) {
  const num = resolveToPhone(jid) || cleanNumber(jid)
  const before = db.premium.length
  db.premium = db.premium.filter(n => n !== num && n !== cleanNumber(jid))
  saveDB()
  return { success: before !== db.premium.length, total: db.premium.length }
}

//══════════════════════════════════════
// BAN SYSTEM
//══════════════════════════════════════

export function isBanned(jid) {
  const phone = resolveToPhone(jid)
  if (phone && db.banned.includes(phone)) return true
  return db.banned.includes(cleanNumber(jid))
}

export function banUser(jid) {
  const num = resolveToPhone(jid) || cleanNumber(jid)
  if (num && !db.banned.includes(num)) { db.banned.push(num); saveDB() }
}

export function unbanUser(jid) {
  const num = resolveToPhone(jid) || cleanNumber(jid)
  db.banned = db.banned.filter(n => n !== num && n !== cleanNumber(jid))
  saveDB()
}

//══════════════════════════════════════
// BOT MODE  (persistant sur disque)
//══════════════════════════════════════

const MODE_FILE = path.join(__dirname, "../data/bot_mode.json")

function _loadModeFromDisk() {
  try {
    if (fs.existsSync(MODE_FILE)) {
      const raw = fs.readFileSync(MODE_FILE, "utf8")
      if (raw.trim()) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed.mode === "string") return parsed.mode
      }
    }
  } catch (err) {
    console.log("BOT MODE LOAD ERROR:", err.message)
  }
  return null
}

function _saveModeToDisk(mode) {
  try {
    fs.mkdirSync(path.dirname(MODE_FILE), { recursive: true })
    fs.writeFileSync(MODE_FILE, JSON.stringify({ mode, updatedAt: new Date().toISOString() }, null, 2))
  } catch (err) {
    console.log("BOT MODE SAVE ERROR:", err.message)
  }
}

let BOT_MODE = _loadModeFromDisk() || config.mode || "public"

export function setMode(mode) {
  if (typeof mode !== "string") return BOT_MODE
  BOT_MODE = mode
  _saveModeToDisk(mode)
  return BOT_MODE
}

export function getMode() { return BOT_MODE }

export function isPrivateMode() { return BOT_MODE === "private" }

//══════════════════════════════════════
// NIVEAUX UTILISATEUR
//══════════════════════════════════════

export function getUserLevel(jid) {
  if (isOwner(jid))   return "owner"
  if (isSudo(jid))    return "sudo"
  if (isPremium(jid)) return "premium"
  return "user"
}

export function getUserRoleInfo(jid) {
  if (isOwner(jid))   return { role: "owner",   emoji: "👑", name: "Owner"   }
  if (isSudo(jid))    return { role: "sudo",     emoji: "⭐", name: "Sudo"    }
  if (isPremium(jid)) return { role: "premium",  emoji: "💎", name: "Premium" }
  return                     { role: "user",     emoji: "👤", name: "User"    }
}

export function getUserStatus(jid) {
  if (isOwner(jid))   return "OWNER 👑"
  if (isSudo(jid))    return "SUDO ⭐"
  if (isPremium(jid)) return "PREMIUM 💎"
  return "USER 👤"
}

export function isSuperAdmin(jid) { return isOwner(jid) || isSudo(jid) }

export function checkUserAccess(jid) {
  const num      = resolveToPhone(jid) || cleanNumber(jid)
  const deployer = isOwner(jid)
  const sudo     = isSudo(jid)
  const premium  = isPremium(jid)
  return {
    authorized:  deployer || sudo,
    isDeployer:  deployer,
    isSudo:      sudo,
    isPremium:   premium,
    cleanNumber: num ? "+" + num : jid
  }
}

//══════════════════════════════════════════════════════════
// ADMIN GROUPE
//══════════════════════════════════════════════════════════

export async function isGroupAdmin(sock, groupId, userId) {
  try {
    const metadata = await sock.groupMetadata(groupId)
    const admins   = metadata.participants.filter(
      p => p.admin === "admin" || p.admin === "superadmin"
    )
    return admins.some(p => matchJid(p.id, userId))
  } catch {
    return false
  }
}

export async function isGroupAdminFromMsg(sock, msg) {
  try {
    const groupId   = msg.key?.remoteJid
    const senderJid = getSenderJid(msg, sock)
    if (!groupId || !senderJid) return false
    return await isGroupAdmin(sock, groupId, senderJid)
  } catch {
    return false
  }
}

export async function isBotAdmin(sock, groupId) {
  try {
    const metadata = await sock.groupMetadata(groupId)

    const botId  = sock.user?.id || ""
    const botNum = cleanNumber(botId) || cleanNumber(config.botNumber || "")
    const botLid = cleanNumber(sock.user?.lid || config.botLid || "")

    const botP = metadata.participants.find(p => {
      const pNum = cleanNumber(p.id)
      if (botNum && pNum === botNum) return true
      if (botLid && pNum === botLid) return true
      return matchJid(p.id, botId)
    })

    return botP?.admin === "admin" || botP?.admin === "superadmin"
  } catch {
    return false
  }
}

export function isBotLid(jid = "") {
  if (!jid) return false
  const num    = cleanNumber(jid)
  const botLid = cleanNumber(config?.botLid || "")
  return botLid ? num === botLid : false
}

//══════════════════════════════════════════════════════════
// LOAD OWNER LIDS (résolution via WhatsApp au démarrage)
//══════════════════════════════════════════════════════════

export async function loadOwnerLids(sock) {
  try {
    if (!sock || !config.ownerNumber) return
    const ownerPhone = cleanNumber(config.ownerNumber) + "@s.whatsapp.net"
    const results = await sock.onWhatsApp(ownerPhone).catch(() => [])
    if (Array.isArray(results)) {
      for (const r of results) {
        if (r?.lid && r?.jid) {
          registerLid(r.lid, r.jid)
          const resolvedLid = cleanNumber(r.lid)
          const resolvedNum = cleanNumber(r.jid)
          if (resolvedNum === cleanNumber(config.ownerNumber)) {
            if (!RUNTIME_OWNER_LID && resolvedLid) {
              RUNTIME_OWNER_LID = resolvedLid
              console.log(`✅ Owner LID auto-détecté: ${resolvedLid} → +${resolvedNum}`)
            }
          }
        }
      }
    }
  } catch {}
}
