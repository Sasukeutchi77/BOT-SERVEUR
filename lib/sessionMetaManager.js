// ╔══════════════════════════════════════════════════════════╗
// ║   J.A.R.V.I.S. — Session Meta Manager                     ║
// ║                                                          ║
// ║   Gère le fichier sessions/{numero}/meta.json :          ║
// ║   - Session Owner (numéro qui a fait .pairing)           ║
// ║   - LIDs auto-détectés du Session Owner                  ║
// ║   - Session Sudos (sudos locaux à cette session)         ║
// ║   - Session Premium                                      ║
// ║                                                          ║
// ║   Le Session Owner est OWNER+SUDO de SA session          ║
// ║   uniquement, pas du bot principal ni des autres.        ║
// ╚══════════════════════════════════════════════════════════╝

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { cleanNumber, registerLid, matchJid } from './ownerSystem.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SESSIONS_DIR = path.join(__dirname, '..', 'sessions')

// Cache mémoire { sessionNumber: meta }
const metaCache = new Map()

function metaPath(sessionNumber) {
  return path.join(SESSIONS_DIR, sessionNumber, 'meta.json')
}

function emptyMeta() {
  return {
    owner: { number: '', lids: [] },
    sudos: [],     // [{ number, lids: [] }]
    premium: [],   // [{ number, lids: [] }]
    createdAt: Date.now()
  }
}

export function loadSessionMeta(sessionNumber) {
  const sn = cleanNumber(sessionNumber)
  if (!sn) return emptyMeta()
  if (metaCache.has(sn)) return metaCache.get(sn)

  const file = metaPath(sn)
  let meta = emptyMeta()
  try {
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf8').trim()
      if (raw) {
        const parsed = JSON.parse(raw)
        meta = { ...emptyMeta(), ...parsed }
        meta.owner = { number: '', lids: [], ...(parsed.owner || {}) }
        if (!Array.isArray(meta.owner.lids)) meta.owner.lids = []
        if (!Array.isArray(meta.sudos))      meta.sudos      = []
        if (!Array.isArray(meta.premium))    meta.premium    = []
      }
    }
  } catch (e) {
    console.error(`[SessionMeta] Erreur chargement ${sn}:`, e.message)
  }
  metaCache.set(sn, meta)
  return meta
}

export function saveSessionMeta(sessionNumber, meta) {
  const sn = cleanNumber(sessionNumber)
  if (!sn) return false
  const dir = path.join(SESSIONS_DIR, sn)
  try {
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(metaPath(sn), JSON.stringify(meta, null, 2))
    metaCache.set(sn, meta)
    return true
  } catch (e) {
    console.error(`[SessionMeta] Erreur sauvegarde ${sn}:`, e.message)
    return false
  }
}

// ── Définit le Session Owner au moment du pairing ───────────
export function setSessionOwner(sessionNumber, ownerNumber) {
  const meta = loadSessionMeta(sessionNumber)
  const num = cleanNumber(ownerNumber)
  if (!num) return false
  meta.owner.number = num
  if (!meta.owner.lids.includes(num)) {
    // pas un LID, mais on garantit la structure
  }
  meta.createdAt = meta.createdAt || Date.now()
  return saveSessionMeta(sessionNumber, meta)
}

// ── Enregistre un LID pour le Session Owner ─────────────────
// Si le LID est nouveau, on l'ajoute + on enrichit la map LID globale
// pour que matchJid() le reconnaisse partout.
export function registerSessionOwnerLid(sessionNumber, lid) {
  const meta = loadSessionMeta(sessionNumber)
  const lidNum = cleanNumber(lid)
  if (!lidNum || !meta.owner.number) return false
  if (lidNum === meta.owner.number) return false // c'est le numéro, pas un LID
  if (meta.owner.lids.includes(lidNum)) return false

  meta.owner.lids.push(lidNum)
  saveSessionMeta(sessionNumber, meta)

  // Enrichir la map LID globale pour matchJid()
  try { registerLid(lidNum, meta.owner.number) } catch {}

  console.log(`🆔 [Session +${cleanNumber(sessionNumber)}] LID owner enregistré: ${lidNum} → +${meta.owner.number}`)
  return true
}

// ── Enregistre un LID pour un Session Sudo ──────────────────
export function registerSessionSudoLid(sessionNumber, sudoNumber, lid) {
  const meta = loadSessionMeta(sessionNumber)
  const num = cleanNumber(sudoNumber)
  const lidNum = cleanNumber(lid)
  if (!num || !lidNum || lidNum === num) return false

  const sudo = meta.sudos.find(s => s.number === num)
  if (!sudo) return false
  if (!Array.isArray(sudo.lids)) sudo.lids = []
  if (sudo.lids.includes(lidNum)) return false

  sudo.lids.push(lidNum)
  saveSessionMeta(sessionNumber, meta)
  try { registerLid(lidNum, num) } catch {}
  return true
}

// ── Vérifications de permission par session ─────────────────

function jidMatchesEntry(jid, entry) {
  if (!entry || !entry.number) return false
  const num = cleanNumber(jid)
  if (num === entry.number) return true
  if (Array.isArray(entry.lids) && entry.lids.includes(num)) return true
  // Cross-resolution via matchJid global
  try {
    if (matchJid(jid, entry.number + '@s.whatsapp.net')) return true
    for (const l of (entry.lids || [])) {
      if (matchJid(jid, l + '@lid')) return true
    }
  } catch {}
  return false
}

export function isSessionOwner(sessionNumber, jid) {
  if (!jid) return false
  const meta = loadSessionMeta(sessionNumber)
  return jidMatchesEntry(jid, meta.owner)
}

export function isSessionSudo(sessionNumber, jid) {
  if (!jid) return false
  const meta = loadSessionMeta(sessionNumber)
  return meta.sudos.some(s => jidMatchesEntry(jid, s))
}

export function isSessionPremium(sessionNumber, jid) {
  if (!jid) return false
  const meta = loadSessionMeta(sessionNumber)
  return meta.premium.some(p => jidMatchesEntry(jid, p))
}

// ── Gestion des Session Sudos ───────────────────────────────

export function addSessionSudo(sessionNumber, targetNumber, targetLid = '') {
  const meta = loadSessionMeta(sessionNumber)
  const num = cleanNumber(targetNumber)
  if (!num) return { ok: false, reason: 'Numéro invalide.' }
  if (num === meta.owner.number) return { ok: false, reason: 'Cet utilisateur est déjà Session Owner.' }
  if (meta.sudos.some(s => s.number === num)) return { ok: false, reason: 'Déjà Session Sudo.' }

  const lids = []
  const lidNum = cleanNumber(targetLid)
  if (lidNum && lidNum !== num) lids.push(lidNum)

  meta.sudos.push({ number: num, lids })
  saveSessionMeta(sessionNumber, meta)
  if (lidNum) { try { registerLid(lidNum, num) } catch {} }
  return { ok: true, total: meta.sudos.length }
}

export function removeSessionSudo(sessionNumber, targetNumber) {
  const meta = loadSessionMeta(sessionNumber)
  const num = cleanNumber(targetNumber)
  const before = meta.sudos.length
  meta.sudos = meta.sudos.filter(s => s.number !== num)
  if (meta.sudos.length === before) return { ok: false, reason: 'Pas dans la liste Session Sudo.' }
  saveSessionMeta(sessionNumber, meta)
  return { ok: true, total: meta.sudos.length }
}

export function listSessionSudos(sessionNumber) {
  const meta = loadSessionMeta(sessionNumber)
  return meta.sudos.slice()
}

// ── Suppression de la meta (à appeler depuis removeSession) ─
export function deleteSessionMeta(sessionNumber) {
  const sn = cleanNumber(sessionNumber)
  metaCache.delete(sn)
  // Le fichier est supprimé avec le dossier session par removeSession()
}
