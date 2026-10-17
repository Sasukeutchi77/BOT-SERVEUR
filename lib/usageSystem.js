// ╔══════════════════════════════════════════════════════╗
// ║  USAGE SYSTEM — J.A.R.V.I.S.                        ║
// ║  Gère les quotas d'utilisation des commandes         ║
// ║  jarvis / pairing                                    ║
// ║                                                      ║
// ║  Système :                                           ║
// ║   - Owner/Sudo → accès illimité                      ║
// ║   - Autres     → 10 utilisations via .partager       ║
// ╚══════════════════════════════════════════════════════╝

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

const USAGE_FILE = path.join(__dirname, '../data/usage.json')
const MAX_USES   = 10

//══════════════════════════════════════
// BASE DE DONNÉES
//══════════════════════════════════════

let usageDb = {}

function ensureDir() {
  const dir = path.dirname(USAGE_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function loadUsageDb() {
  try {
    ensureDir()
    if (fs.existsSync(USAGE_FILE)) {
      const raw = fs.readFileSync(USAGE_FILE, 'utf8')
      if (raw.trim()) usageDb = JSON.parse(raw)
    } else {
      saveUsageDb()
    }
  } catch (err) {
    console.error('[usageSystem] Load error:', err.message)
    usageDb = {}
  }
}

function saveUsageDb() {
  try {
    ensureDir()
    fs.writeFileSync(USAGE_FILE, JSON.stringify(usageDb, null, 2))
  } catch (err) {
    console.error('[usageSystem] Save error:', err.message)
  }
}

loadUsageDb()

//══════════════════════════════════════
// UTILITAIRES
//══════════════════════════════════════

function cleanNum(jid = '') {
  return jid.toString().split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
}

function getUserEntry(jid) {
  const num = cleanNum(jid)
  if (!num) return null
  if (!usageDb[num]) usageDb[num] = { uses: 0, granted: false }
  return usageDb[num]
}

//══════════════════════════════════════
// API PUBLIQUE
//══════════════════════════════════════

/**
 * Octroie MAX_USES utilisations à un utilisateur.
 * Appelé depuis la commande .partager après partage réussi.
 * @param {string} jid
 * @returns {{ success: boolean, uses: number, alreadyGranted: boolean }}
 */
export function grantUsage(jid) {
  const num = cleanNum(jid)
  if (!num) return { success: false, uses: 0, alreadyGranted: false }

  const entry = getUserEntry(jid)
  const hadUses = entry.uses > 0

  entry.uses = MAX_USES
  entry.granted = true
  saveUsageDb()

  return { success: true, uses: MAX_USES, alreadyGranted: hadUses }
}

/**
 * Vérifie si un utilisateur peut utiliser les commandes jarvis/pairing.
 * @param {string} jid
 * @returns {{ allowed: boolean, remaining: number, needsPartager: boolean }}
 */
export function checkUsage(jid) {
  const entry = getUserEntry(jid)
  if (!entry) return { allowed: false, remaining: 0, needsPartager: true }

  if (entry.uses > 0) {
    return { allowed: true, remaining: entry.uses, needsPartager: false }
  }

  return { allowed: false, remaining: 0, needsPartager: true }
}

/**
 * Consomme 1 utilisation pour l'utilisateur.
 * @param {string} jid
 * @returns {{ remaining: number }}
 */
export function consumeUsage(jid) {
  const entry = getUserEntry(jid)
  if (!entry) return { remaining: 0 }

  if (entry.uses > 0) {
    entry.uses -= 1
    saveUsageDb()
  }

  return { remaining: entry.uses }
}

/**
 * Retourne le nombre d'utilisations restantes.
 * @param {string} jid
 * @returns {number}
 */
export function getRemainingUses(jid) {
  const entry = getUserEntry(jid)
  return entry ? entry.uses : 0
}

export { MAX_USES }
