// ╔══════════════════════════════════════════════════════════╗
// ║         LID AUTO-DETECTOR — Système automatique         ║
// ║  Détecte et enregistre le LID du déployeur en temps    ║
// ║  réel depuis les messages, groupes et WhatsApp API.    ║
// ╚══════════════════════════════════════════════════════════╝

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { config } from "../config.js"
import { registerLid, cleanNumber, setRuntimeOwner } from "./ownerSystem.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LID_CACHE_FILE = path.join(__dirname, "../data/lid_map.json")

// Garde en mémoire les LIDs déjà trouvés pour éviter les logs répétitifs
const detectedLids = new Set()

// Throttle pour le scan des groupes (un scan par groupe max toutes les 60s)
const groupScanCooldown = new Map()

/**
 * Charge les LIDs déjà sauvegardés dans le cache
 */
function loadCachedLids() {
  try {
    if (!fs.existsSync(LID_CACHE_FILE)) return {}
    const raw = fs.readFileSync(LID_CACHE_FILE, "utf8").trim()
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

/**
 * Méthode 1 — Via sock.onWhatsApp()
 * Interroge directement l'API WhatsApp pour obtenir le LID lié au numéro
 */
async function detectLidViaApi(sock, phoneNumber) {
  try {
    const jid = phoneNumber.replace(/\D/g, "") + "@s.whatsapp.net"
    const results = await sock.onWhatsApp(jid).catch(() => [])
    if (!Array.isArray(results)) return null

    for (const r of results) {
      const lid = r?.lid || r?.jid
      const phone = r?.jid || r?.lid
      if (lid && phone) {
        const lidNum   = cleanNumber(lid)
        const phoneNum = cleanNumber(phone)
        if (lidNum && phoneNum && lidNum !== phoneNum) {
          return { lid: lidNum, phone: phoneNum }
        }
      }
    }
  } catch {}
  return null
}

/**
 * Méthode 2 — Via les métadonnées de groupe
 * Scanne les participants d'un groupe pour retrouver le LID de l'owner
 */
async function detectLidFromGroupMeta(sock, groupId, ownerPhone) {
  try {
    const meta = await sock.groupMetadata(groupId).catch(() => null)
    if (!meta?.participants) return null

    const ownerNum = cleanNumber(ownerPhone)
    for (const p of meta.participants) {
      const pNum = cleanNumber(p.id)
      if (pNum === ownerNum && p.id.includes("@lid")) {
        return { lid: pNum, phone: ownerNum }
      }
    }
    // Chercher aussi dans d'éventuels champs lid
    for (const p of meta.participants) {
      const pNum = cleanNumber(p.id)
      if (pNum === ownerNum && p.lid) {
        return { lid: cleanNumber(p.lid), phone: ownerNum }
      }
    }
  } catch {}
  return null
}

/**
 * Méthode 3 — Extraction directe depuis un message entrant
 * Quand l'owner envoie un message, son JID peut être sous forme @lid
 */
function extractLidFromMessage(msg, ownerPhone) {
  const ownerNum = cleanNumber(ownerPhone)
  if (!ownerNum) return null

  const candidates = [
    msg?.key?.participant,
    msg?.participant,
    msg?.message?.extendedTextMessage?.contextInfo?.participant,
    msg?.key?.remoteJid,
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (!candidate.includes("@lid")) continue
    const candidateNum = cleanNumber(candidate)
    // On ne peut pas confirmer le mapping sans la map existante dans ce cas
    // mais on retourne le LID pour que ownerSystem le teste
    if (candidateNum) return { lid: candidateNum, rawJid: candidate }
  }
  return null
}

/**
 * Enregistre un LID → numéro de téléphone et met à jour le runtime owner
 */
function registerOwnerLid(lid, phone, source) {
  const lidNum   = cleanNumber(lid)
  const phoneNum = cleanNumber(phone)
  if (!lidNum || !phoneNum) return false
  if (detectedLids.has(lidNum)) return false // déjà traité

  detectedLids.add(lidNum)
  registerLid(lidNum, phoneNum)
  console.log(`🔍 [LID Auto-Detect] ${source}: LID ${lidNum} → +${phoneNum}`)

  // Mettre à jour le runtime owner si c'est le déployeur
  const ownerNum = cleanNumber(config.ownerNumber)
  if (phoneNum === ownerNum) {
    setRuntimeOwner({ ownerNumber: phoneNum, ownerLid: lidNum })
    console.log(`👑 [LID Auto-Detect] LID du déployeur enregistré automatiquement!`)
    return true
  }
  return false
}

/**
 * Détection principale au démarrage — interroge l'API WhatsApp
 * Appelé une fois dès que la connexion est ouverte
 */
export async function autoDetectOwnerLid(sock) {
  const ownerPhone = cleanNumber(config.ownerNumber)
  if (!ownerPhone) {
    console.warn("⚠️  [LID Auto-Detect] OWNER_NUMBER non défini, détection impossible.")
    return
  }

  console.log(`🔍 [LID Auto-Detect] Détection automatique du LID pour +${ownerPhone}...`)

  // Vérifier d'abord si on a déjà un LID en cache
  const cached = loadCachedLids()
  for (const [lid, phone] of Object.entries(cached)) {
    if (cleanNumber(phone) === ownerPhone) {
      console.log(`✅ [LID Auto-Detect] LID trouvé en cache: ${lid} → +${phone}`)
      detectedLids.add(lid)
      setRuntimeOwner({ ownerNumber: phone, ownerLid: lid })
      // On continue quand même pour mettre à jour si besoin
      break
    }
  }

  // Méthode 1: API WhatsApp
  await new Promise(resolve => setTimeout(resolve, 2000)) // laisser WhatsApp s'initialiser
  const apiResult = await detectLidViaApi(sock, ownerPhone)
  if (apiResult) {
    registerOwnerLid(apiResult.lid, apiResult.phone, "onWhatsApp API")
  } else {
    console.log(`ℹ️  [LID Auto-Detect] API: pas de LID retourné pour +${ownerPhone} (normal si pas de LID actif)`)
  }
}

/**
 * Détection depuis un message entrant — à appeler pour chaque message
 * Stratégie sûre: on ne mappe un LID sur l'owner que si on peut le confirmer
 */
export function autoDetectLidFromMessage(msg, sock) {
  const ownerPhone = cleanNumber(config.ownerNumber)
  if (!ownerPhone || !msg) return

  const isGroup    = msg.key?.remoteJid?.endsWith("@g.us")
  const remoteJid  = msg.key?.remoteJid || ""
  const isFromMe   = msg.key?.fromMe === true

  // ─── Cas 1: Message PRIVÉ reçu (pas fromMe, pas groupe) ──────────────
  // Si le remoteJid est un @lid, c'est le LID de la personne qui écrit
  // On confirme via API que ce LID correspond bien à OWNER_NUMBER
  if (!isGroup && !isFromMe && remoteJid.includes("@lid")) {
    const lidNum = cleanNumber(remoteJid)
    if (lidNum && !detectedLids.has(lidNum)) {
      console.log(`🔍 [LID Auto-Detect] @lid détecté en message privé: ${lidNum}, vérification en cours...`)
      setTimeout(async () => {
        try {
          const apiResult = await detectLidViaApi(sock, ownerPhone)
          if (apiResult && apiResult.lid === lidNum) {
            registerOwnerLid(apiResult.lid, apiResult.phone, "message privé + confirmation API")
          }
        } catch {}
      }, 500)
    }
    return
  }

  // ─── Cas 2: Message de groupe — participant est un @lid ───────────────
  // On ne peut pas vérifier directement, on délègue à autoDetectLidFromGroup
  // (déjà appelé dans index.js pour chaque message de groupe)
}

/**
 * Détection depuis les métadonnées d'un groupe
 * À appeler quand l'owner interagit dans un groupe
 * Throttlé : un scan par groupe toutes les 60 secondes maximum
 */
export async function autoDetectLidFromGroup(sock, groupId) {
  const ownerPhone = cleanNumber(config.ownerNumber)
  if (!ownerPhone || !groupId) return

  // Throttle: ne pas scanner trop souvent le même groupe
  const now = Date.now()
  const lastScan = groupScanCooldown.get(groupId) || 0
  if (now - lastScan < 60_000) return
  groupScanCooldown.set(groupId, now)

  const result = await detectLidFromGroupMeta(sock, groupId, ownerPhone)
  if (result) {
    registerOwnerLid(result.lid, result.phone, `groupe ${groupId}`)
  }
}
