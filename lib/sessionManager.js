// ╔══════════════════════════════════════════════════════╗
// ║   J.A.R.V.I.S. — Gestionnaire Multi-Session         ║
// ║   Chaque session connectée via .pairing bénéficie    ║
// ║   de TOUTES les commandes du bot                     ║
// ╚══════════════════════════════════════════════════════╝

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
} from '@whiskeysockets/baileys'
// fetchLatestWaWebVersion n'existe que sur les versions récentes de Baileys.
// Import optionnel : si absent, on retombe sur fetchLatestBaileysVersion.
let fetchLatestWaWebVersion = null
try {
  ;({ fetchLatestWaWebVersion } = await import('@whiskeysockets/baileys'))
} catch {}
import { Boom } from '@hapi/boom'
import { handleMessage, purgeMutedBatch } from './messageHandler.js'
import { isAntiSuppressionEnabled, getCachedMessage, removeCachedMessage } from './antiSuppressionManager.js'
import { cleanNumber, registerLid } from './ownerSystem.js'
import {
  setSessionOwner,
  registerSessionOwnerLid,
  loadSessionMeta,
  saveSessionMeta as saveSessionMetaSafe,
  deleteSessionMeta,
} from './sessionMetaManager.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pino from 'pino'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SESSIONS_DIR = path.join(__dirname, '..', 'sessions')
const COOLDOWN_MS  = 60_000  // 60 secondes entre chaque tentative

if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true })

const logger = pino({ level: 'silent' })

// ── Stockage global des bots actifs ──────────────────────
// Structure: { [numero]: { socket, number, connectedAt, status, afkStore, stats, instanceId, reconnectAttempts } }
const bots = {}
const pairingCooldowns = {}
const reconnectTimers = {}     // setTimeout en cours par numero
const MAX_RECONNECT_ATTEMPTS = 5
let instanceCounter = 0

// ── Référence aux fonctions sessionManager (injectée dans ctx) ─
const sessionManagerFns = {
  get createBotInstance() { return createBotInstance },
  get getBotInstance()    { return getBotInstance },
  get isOnCooldown()      { return isOnCooldown },
  get getCooldownRemaining() { return getCooldownRemaining },
  get sessionExists()     { return sessionExists },
}

// ── Helpers ───────────────────────────────────────────────
export function getSessionPath(number) {
  return path.join(SESSIONS_DIR, number.replace(/[^0-9]/g, ''))
}

export function sessionExists(number) {
  const p = getSessionPath(number)
  return fs.existsSync(p) && fs.readdirSync(p).length > 0
}

export function isOnCooldown(number) {
  const last = pairingCooldowns[number]
  if (!last) return false
  return (Date.now() - last) < COOLDOWN_MS
}

export function getCooldownRemaining(number) {
  const last = pairingCooldowns[number]
  if (!last) return 0
  const r = COOLDOWN_MS - (Date.now() - last)
  return r > 0 ? Math.ceil(r / 1000) : 0
}

export function getBotInstance(number) {
  return bots[number.replace(/[^0-9]/g, '')]
}

export function getAllBots() {
  return bots
}

// ── Création d'une nouvelle instance bot ─────────────────
// isReconnection=true bypass le cooldown (reconnexion automatique / restauration)
export async function createBotInstance(number, onPairingCode, isReconnection = false) {
  const sanitized = number.replace(/[^0-9]/g, '')

  if (!isReconnection && isOnCooldown(sanitized)) {
    throw new Error(`Cooldown actif. Réessayez dans ${getCooldownRemaining(sanitized)} secondes.`)
  }

  if (bots[sanitized]?.status === 'connected' && !isReconnection) {
    throw new Error('Une session active existe déjà pour ce numéro. Utilisez .mypair pour vérifier.')
  }

  // ── Nettoyer proprement l'ancien socket s'il existe ──────
  // Évite les listeners fantômes qui réécrivent bots[sanitized]
  if (bots[sanitized]?.socket) {
    try { bots[sanitized].socket.ev.removeAllListeners() } catch {}
    try { bots[sanitized].socket.end(undefined) } catch {}
    bots[sanitized].stale = true
  }

  // Annuler tout reconnect en attente
  if (reconnectTimers[sanitized]) {
    clearTimeout(reconnectTimers[sanitized])
    delete reconnectTimers[sanitized]
  }

  if (!isReconnection) {
    pairingCooldowns[sanitized] = Date.now()
  }

  const sessionPath = getSessionPath(sanitized)
  fs.mkdirSync(sessionPath, { recursive: true })

  // ── Enregistrer le Session Owner ──────────────────────────
  // Le numéro pairé devient automatiquement Owner+Sudo de SA session
  // (pas du bot principal, pas des autres sessions).
  setSessionOwner(sanitized, sanitized)

  let state, saveCreds
  try {
    const authResult = await useMultiFileAuthState(sessionPath)
    state = authResult.state
    saveCreds = authResult.saveCreds
  } catch (err) {
    throw new Error(`Erreur lecture session: ${err.message}`)
  }

  // ── Version WhatsApp Web ─────────────────────────────────
  // fetchLatestBaileysVersion() peut renvoyer une version périmée tout en
  // annonçant isLatest:true, ce qui bloque la liaison ("Couldn't link
  // device"). fetchLatestWaWebVersion() (si disponible) lit la vraie
  // version depuis web.whatsapp.com et est plus fiable pour le pairing.
  let version
  if (fetchLatestWaWebVersion) {
    try {
      const r = await fetchLatestWaWebVersion({})
      version = r.version
    } catch {}
  }
  if (!version) {
    ;({ version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307] })))
  }

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: Browsers.ubuntu('Chrome'),
    printQRInTerminal: false,
    logger,
    markOnlineOnConnect: false,
    syncFullHistory: false,
    generateHighQualityLinkPreview: false,
  })

  // Chaque session a son propre AFK store et ses propres stats
  const afkStore = new Map()
  const stats    = { totalCommands: 0, startTime: Date.now() }

  // ID unique par instance pour détecter les listeners fantômes
  const myInstanceId = ++instanceCounter
  const previousAttempts = bots[sanitized]?.reconnectAttempts || 0

  bots[sanitized] = {
    socket: sock,
    number: sanitized,
    connectedAt: new Date(),
    status: 'connecting',
    afkStore,
    stats,
    instanceId: myInstanceId,
    reconnectAttempts: isReconnection ? previousAttempts : 0,
  }

  // Générer le code de pairing si le compte n'est pas encore enregistré
  if (!sock.authState.creds.registered && onPairingCode) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(sanitized)
        onPairingCode(code, null)
      } catch (err) {
        console.error('[SessionManager] Erreur code pairing:', err.message)
        onPairingCode(null, err)
      }
    }, 3000)
  }

  sock.ev.on('creds.update', saveCreds)

  // ── Codes de déconnexion qui ne doivent PAS déclencher de reconnexion ──
  // On évite de boucler sur les codes "définitifs" qui kickeraient la nouvelle session
  const NO_RECONNECT_CODES = new Set([
    DisconnectReason.loggedOut,         // 401 — utilisateur déconnecté
    DisconnectReason.forbidden,         // 403 — bannissement
    DisconnectReason.multideviceMismatch, // 411 — mismatch multi-device
    DisconnectReason.connectionReplaced, // 440 — connecté ailleurs
    DisconnectReason.badSession,        // 500 — session corrompue
    405,                                 // bad request
  ])

  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    // ── Garde-fou : ignorer les events des sockets remplacés (fantômes) ──
    if (bots[sanitized]?.instanceId !== myInstanceId) {
      return
    }

    try {
      if (connection === 'open') {
        bots[sanitized] = {
          ...(bots[sanitized] || {}),
          status: 'connected',
          connectedAt: bots[sanitized]?.connectedAt || new Date(),
          reconnectAttempts: 0,  // reset au succès
        }
        console.log(`[SessionManager] ✅ Bot connecté: +${sanitized}`)

        // ── Auto-détection LID du Session Owner via WhatsApp API ──
        try {
          const selfId = sock.user?.id || ''
          if (selfId.includes('@lid')) {
            registerSessionOwnerLid(sanitized, cleanNumber(selfId))
          }
        } catch {}

        // Tentative complémentaire via onWhatsApp (différée pour laisser
        // Baileys finir sa synchronisation initiale)
        setTimeout(async () => {
          if (bots[sanitized]?.instanceId !== myInstanceId) return
          try {
            const results = await sock.onWhatsApp(sanitized + '@s.whatsapp.net').catch(() => [])
            if (Array.isArray(results)) {
              for (const r of results) {
                if (r?.lid) {
                  const lidNum = cleanNumber(r.lid)
                  if (lidNum) registerSessionOwnerLid(sanitized, lidNum)
                }
              }
            }
          } catch {}
        }, 5000)

        // Notifier le Session Owner en privé qu'il est reconnu
        // (uniquement à la première connexion réussie ; envoi différé pour
        // laisser le temps à Baileys d'établir les sessions de chiffrement)
        setTimeout(async () => {
          if (bots[sanitized]?.instanceId !== myInstanceId) return
          try {
            const meta = loadSessionMeta(sanitized)
            if (meta._welcomed) return
            await sock.sendMessage(sanitized + '@s.whatsapp.net', {
              text:
                '╭━━━━━━━━━━━━━━━━━━━━━━━━━━━╮\n' +
                '┃  ⚡ J.A.R.V.I.S. — SESSION  ┃\n' +
                '╰━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n' +
                `✅ Ta session est connectée !\n\n` +
                `👑 Tu es *Session Owner* de ce bot.\n` +
                `   → Accès Owner+Sudo sur TES groupes\n` +
                `   → Reconnu automatiquement (numéro + LID)\n\n` +
                `🔧 Commandes utiles :\n` +
                `   • *.menu* — voir toutes les commandes\n` +
                `   • *.sessionsudo add @user* — ajouter un sudo local\n` +
                `   • *.mypair* — état de ta session\n` +
                `   • *.stoppair* — déconnecter\n\n` +
                `⚠️ Les commandes système (eval, exec, restart…)\n` +
                `   restent réservées à l'Owner du bot principal.`
            }).catch(() => {})
            meta._welcomed = true
            saveSessionMetaSafe(sanitized, meta)
          } catch (e) {
            console.error(`[SessionManager] Welcome msg error +${sanitized}: ${e.message}`)
          }
        }, 8000)
      }

      if (connection === 'close') {
        const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
        const shouldReconnect = !NO_RECONNECT_CODES.has(reason)

        const attempts = (bots[sanitized]?.reconnectAttempts || 0)
        bots[sanitized] = {
          ...(bots[sanitized] || {}),
          status: 'disconnected',
        }
        console.log(`[SessionManager] 🔴 Bot déconnecté: +${sanitized} | Raison: ${reason} | Reconnexion: ${shouldReconnect} | Tentative: ${attempts}/${MAX_RECONNECT_ATTEMPTS}`)

        if (shouldReconnect && attempts < MAX_RECONNECT_ATTEMPTS) {
          // Annuler tout reconnect déjà en file
          if (reconnectTimers[sanitized]) clearTimeout(reconnectTimers[sanitized])

          // Backoff exponentiel : 5s, 10s, 20s, 40s, 60s
          const delay = Math.min(5000 * Math.pow(2, attempts), 60000)
          bots[sanitized].reconnectAttempts = attempts + 1

          console.log(`[SessionManager] 🔄 Reconnexion dans ${delay/1000}s pour +${sanitized}...`)
          reconnectTimers[sanitized] = setTimeout(() => {
            delete reconnectTimers[sanitized]
            // Vérifier qu'aucune autre instance ne s'est connectée entre-temps
            if (bots[sanitized]?.status === 'connected') {
              console.log(`[SessionManager] ⏭️  Reconnexion +${sanitized} annulée (déjà connecté).`)
              return
            }
            createBotInstance(sanitized, null, true).catch(e =>
              console.error(`[SessionManager] Échec reconnexion ${sanitized}: ${e.message}`)
            )
          }, delay)
        } else if (!shouldReconnect) {
          console.log(`[SessionManager] 🚪 Code définitif — suppression session +${sanitized}`)
          await removeSession(sanitized).catch(() => {})
        } else {
          console.log(`[SessionManager] 🛑 Trop de tentatives échouées pour +${sanitized}, abandon.`)
          bots[sanitized] = { ...(bots[sanitized] || {}), status: 'failed' }
        }
      }
    } catch (err) {
      // Filet de sécurité : aucune erreur dans le handler ne doit crasher le process
      console.error(`[SessionManager] connection.update error +${sanitized}: ${err.message}`)
    }
  })

  // ── Traitement COMPLET des commandes pour ce bot secondaire ──
  // Chaque utilisateur qui envoie une commande à ce bot peut utiliser
  // TOUTES les fonctionnalités, exactement comme avec le bot principal.
  // msg.key.fromMe = true → le propriétaire de cette session (droits complets)
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    // Purge "tgl" en priorité, EN PARALLÈLE sur tout le batch (voir
    // purgeMutedBatch dans messageHandler.js) — même logique que sur le
    // bot principal, pour que ça tienne aussi sur les sessions pairées.
    await purgeMutedBatch(sock, messages).catch(e => console.error(`[tgl][+${sanitized}] purgeMutedBatch error:`, e.message))
    for (const msg of messages) {
      try {
        await handleMessage(sock, msg, stats, afkStore, {
          sessionManager: sessionManagerFns,
          isSecondaryBot: true,
          sessionBotNumber: sanitized,
        })
      } catch (e) {
        console.error(`[SessionManager] msg handler error [+${sanitized}]:`, e.message)
      }
    }
  })

  // ── ANTI-SUPPRESSION pour sessions secondaires ─────────────
  sock.ev.on('messages.update', async (updates) => {
    for (const update of updates) {
      try {
        const msgKey  = update.key
        const groupId = msgKey?.remoteJid
        if (!groupId || !groupId.endsWith('@g.us')) continue

        const isDelete =
          update.update?.message?.protocolMessage?.type === 0 ||
          update.update?.message?.protocolMessage?.type === 'REVOKE' ||
          (update.update?.message?.protocolMessage?.key?.id)

        if (!isDelete) continue
        if (!isAntiSuppressionEnabled(groupId)) continue

        const deletedMsgId = update.update?.message?.protocolMessage?.key?.id || msgKey?.id
        if (!deletedMsgId) continue

        const cached = getCachedMessage(deletedMsgId)
        if (!cached) continue

        const botNum    = cleanNumber(sock.user?.id || '')
        const senderNum = cleanNumber(cached.sender || '')
        if (senderNum === botNum) continue

        removeCachedMessage(deletedMsgId)

        const senderDisplay = cached.pushName || senderNum || 'Inconnu'
        let msgReveal = `🗑️ *MESSAGE SUPPRIMÉ*\n👤 *De:* ${senderDisplay}\n\n`

        if (cached.text) {
          msgReveal += `💬 *Message:*\n${cached.text}`
          await sock.sendMessage(groupId, { text: msgReveal })
        } else if (cached.type === 'image') {
          msgReveal += `📷 _(Image supprimée)_`
          await sock.sendMessage(groupId, { text: msgReveal })
          try {
            await sock.sendMessage(groupId, {
              image: cached.msg?.imageMessage,
              caption: `🗑️ Image supprimée par ${senderDisplay}`
            })
          } catch {}
        } else {
          const typeLabel = { video: '🎥 Vidéo', audio: '🎵 Audio', sticker: '🏷️ Sticker', document: '📄 Document' }
          msgReveal += `${typeLabel[cached.type] || '_(Message)'} supprimé(e)_`
          await sock.sendMessage(groupId, { text: msgReveal })
        }
      } catch (e) {
        console.error(`[SessionManager] AntiSuppression error [+${sanitized}]:`, e.message)
      }
    }
  })

  return sanitized
}

// ── Suppression d'une session ──────────────────────────────
export async function removeSession(number) {
  const sanitized = number.replace(/[^0-9]/g, '')
  const bot = bots[sanitized]

  // Annuler tout reconnect en attente
  if (reconnectTimers[sanitized]) {
    clearTimeout(reconnectTimers[sanitized])
    delete reconnectTimers[sanitized]
  }

  if (bot) {
    try { bot.socket?.ev?.removeAllListeners() } catch {}
    try { await bot.socket?.logout() } catch {}
    try { bot.socket?.end(undefined) } catch {}
    delete bots[sanitized]
  }

  const sessionPath = getSessionPath(sanitized)
  if (fs.existsSync(sessionPath)) {
    fs.rmSync(sessionPath, { recursive: true, force: true })
  }

  // Vider le cache meta de cette session
  deleteSessionMeta(sanitized)

  // Supprimer le cooldown pour permettre une nouvelle connexion
  delete pairingCooldowns[sanitized]

  console.log(`[SessionManager] 🗑️  Session supprimée: +${sanitized}`)
}

// ── Restaurer les sessions sauvegardées au démarrage ──────
export async function restoreActiveSessions() {
  if (!fs.existsSync(SESSIONS_DIR)) return

  const entries = fs.readdirSync(SESSIONS_DIR, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const number = entry.name
    if (!/^\d+$/.test(number)) continue
    const sessionPath = path.join(SESSIONS_DIR, number)
    const files = fs.readdirSync(sessionPath)
    if (files.length === 0) continue

    console.log(`[SessionManager] 🔄 Restauration session +${number}...`)
    createBotInstance(number, null, true).catch(err =>
      console.error(`[SessionManager] Échec restauration +${number}: ${err.message}`)
    )
  }
}
