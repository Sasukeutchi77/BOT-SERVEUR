// ╔══════════════════════════════════════════════════════╗
// ║   J.A.R.V.I.S. — Gestionnaire de messages partagé      ║
// ║   Utilisé par le bot principal ET les sessions       ║
// ║   secondaires créées via .pairing                    ║
// ╚══════════════════════════════════════════════════════╝

import {
  isSudo, isPremium, isOwner,
  getSenderJid, cleanNumber, matchJid,
  getMode,
} from './ownerSystem.js'
import { autoDetectLidFromMessage, autoDetectLidFromGroup } from './lidAutoDetector.js'
import { getGroupMeta, invalidateGroupCache } from './groupConfig.js'
import { checkAntiLink } from './antiLinkManager.js'
import { checkAntiChannel } from './antiChannelManager.js'
import { rememberIfChannelMessage } from './newsletterMessageCache.js'
import { cacheMessage } from './antiSuppressionManager.js'
import { evaluateCommandAccess, checkCommandCooldown, formatAccessDenied, formatCooldownDenied } from './commandRegistry.js'
import { isMuted } from './muteManager.js'
import { isFlaggedBot } from './antiBotManager.js'
import { auditLog } from './auditLogger.js'
import {
  loadSessionMeta,
  isSessionOwner as checkSessionOwner,
  isSessionSudo  as checkSessionSudo,
  isSessionPremium as checkSessionPremium,
  registerSessionOwnerLid,
  registerSessionSudoLid,
} from './sessionMetaManager.js'
import { config } from '../config.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const COMMANDS_DIR = path.join(__dirname, '..', 'commands')

// Cache des commandes chargées (partagé entre toutes les instances)
const commandCache = new Map()

// Symbole distinct de `null` : permet de différencier "commande inconnue"
// (silence normal, ex: quelqu'un tape ".xyz" par erreur) de "commande trouvée
// mais dont le chargement a planté" (ex: dépendance npm manquante). Sans ça,
// une commande cassée reste muette pour toujours sans que personne ne le
// sache avant de checker les logs — c'est exactement ce qui est arrivé avec
// tgs.js (paquet 'wa-sticker-formatter' non installé).
export const LOAD_ERROR = Symbol('command-load-error')

// Exportée pour lib/jarvisActions.js (exécution de commandes déclenchées
// en langage naturel par .jarvis — réutilise le même chargeur, donc les
// mêmes garanties : LOAD_ERROR géré pareil, cache partagé).
export async function loadCommand(name) {
  if (commandCache.has(name)) return commandCache.get(name)
  const filePath = path.join(COMMANDS_DIR, name + '.js')
  if (!fs.existsSync(filePath)) return null
  try {
    const mod = await import(filePath + '?v=' + Date.now())
    const fn  = mod.default
    if (typeof fn === 'function') { commandCache.set(name, fn); return fn }
    console.error(`❌ Erreur chargement cmd ${name}: pas d'export default (function attendue)`)
    return LOAD_ERROR
  } catch (e) {
    console.error(`❌ Erreur chargement cmd ${name}:`, e.message)
    return LOAD_ERROR
  }
}

// ── Auto-détection LID pour Session Owner / Sudos ────────────
// Quand le Session Owner écrit (fromMe=true sur sa session secondaire),
// on capte son LID directement depuis msg.key et on l'enregistre.
// Pour les autres participants en groupe, si leur numéro résolu matche
// le Session Owner ou un Session Sudo, on enregistre leur LID aussi.
function autoDetectSessionLid(sock, msg, sessionBotNumber) {
  if (!sessionBotNumber) return
  try {
    const meta = loadSessionMeta(sessionBotNumber)
    if (!meta.owner.number) return

    // Récupérer le JID brut de l'expéditeur
    const rawJid =
      msg.key?.participant ||
      msg.participant ||
      msg.key?.remoteJid ||
      ''
    if (!rawJid) return

    // Cas 1 : message fromMe sur la session secondaire
    // = l'utilisateur du téléphone lié = le Session Owner
    if (msg.key?.fromMe) {
      // Son JID est sock.user.id (souvent @lid)
      const selfId = sock.user?.id || ''
      if (selfId && selfId.includes('@lid')) {
        registerSessionOwnerLid(sessionBotNumber, cleanNumber(selfId))
      }
      // En groupe, msg.key.participant peut aussi être son @lid
      if (rawJid.includes('@lid')) {
        registerSessionOwnerLid(sessionBotNumber, cleanNumber(rawJid))
      }
      return
    }

    // Cas 2 : message d'un autre participant
    // Si son numéro résolu = Session Owner → c'est lui qui écrit depuis un alias
    // Si son numéro résolu = un Session Sudo → idem
    if (!rawJid.includes('@lid')) return
    const lidNum = cleanNumber(rawJid)
    if (!lidNum) return

    // Tenter résolution via la map LID globale
    const resolvedJid = getSenderJid(msg, sock)
    const resolvedNum = cleanNumber(resolvedJid)

    if (resolvedNum && resolvedNum === meta.owner.number && lidNum !== resolvedNum) {
      registerSessionOwnerLid(sessionBotNumber, lidNum)
      return
    }
    for (const sudo of meta.sudos) {
      if (resolvedNum && resolvedNum === sudo.number && lidNum !== resolvedNum) {
        registerSessionSudoLid(sessionBotNumber, sudo.number, lidNum)
        return
      }
    }
  } catch (e) {
    // silencieux : la détection est opportuniste
  }
}

// ── Suppression avec réessais (mute "tgl") ────────────────────
// Une suppression qui échoue une seule fois (aléa réseau, rafale trop
// rapide) ne doit jamais laisser passer un message d'un compte "tgl" :
// on réessaie avec un léger backoff avant d'abandonner pour de bon.
async function deleteWithRetry(sock, remoteJid, key, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      await sock.sendMessage(remoteJid, { delete: key })
      return true
    } catch (e) {
      if (i === attempts - 1) {
        console.error(`[tgl] Suppression échouée après ${attempts} tentatives (${remoteJid}):`, e.message)
        return false
      }
      await new Promise(r => setTimeout(r, 150 * (i + 1)))
    }
  }
  return false
}

// ── Purge immédiate et EN PARALLÈLE des comptes "tgl" ─────────
// À appeler AVANT la boucle séquentielle normale de `messages.upsert`.
// Sans ça, un utilisateur "tgl" qui envoie une rafale voit ses messages
// traités un par un via handleMessage (qui fait plein d'autres
// vérifications avant même d'atteindre le check mute) → le bot "n'arrive
// plus à suivre" et certains messages passent entre les mailles.
// Ici on repère d'un coup tous les messages à supprimer dans le batch et
// on lance TOUTES les suppressions en parallèle (Promise.all) : le temps
// total ne dépend plus du nombre de messages, seulement de la latence
// d'un seul aller-retour réseau.
export async function purgeMutedBatch(sock, messages) {
  if (!Array.isArray(messages) || messages.length === 0) return
  const targets = []
  for (const msg of messages) {
    if (!msg.message || msg.key.fromMe) continue
    const remoteJid = msg.key.remoteJid
    if (!remoteJid || !remoteJid.endsWith('@g.us')) continue
    const senderJid = getSenderJid(msg, sock)
    if (isMuted(remoteJid, senderJid)) targets.push(msg)
  }
  if (!targets.length) return
  await Promise.all(targets.map(m => deleteWithRetry(sock, m.key.remoteJid, m.key)))
}

// ── Traitement principal d'un message ─────────────────────
// sock           : instance Baileys du bot concerné
// msg            : message WhatsApp reçu
// stats          : objet stats { totalCommands, startTime }
// afkStore       : Map() AFK, une par instance bot
// opts           :
//   opts.sessionManager  : { createBotInstance, getBotInstance, ... }
//   opts.isSecondaryBot  : true si c'est une session secondaire
//   opts.sessionBotNumber: numéro du bot secondaire (pour charger sa meta)
export async function handleMessage(sock, msg, stats, afkStore, opts = {}) {
  if (!msg.message) return

  const sender = msg.key.remoteJid
  if (!sender || sender === 'status@broadcast') return

  const bodyRaw =
    msg.message.conversation ||
    msg.message.extendedTextMessage?.text ||
    msg.message.imageMessage?.caption ||
    msg.message.videoMessage?.caption ||
    ''

  const senderJid = getSenderJid(msg, sock)
  const isGroup   = sender.endsWith('@g.us')

  // ── MUTE — filet de sécurité (fallback) ─────────────────────
  // Le gros du travail est déjà fait EN AMONT par purgeMutedBatch(),
  // appelée en parallèle sur tout le batch avant cette boucle. Ce check
  // reste ici en filet de sécurité (si handleMessage est un jour appelé
  // hors de ce chemin), et surtout il est placé TOUT EN HAUT — avant la
  // détection LID, le cache anti-suppression, la gestion AFK et le
  // getGroupMeta() — pour qu'un message d'un compte "tgl" coûte le moins
  // cher possible à traiter et ne retarde jamais le reste de la file.
  if (isGroup && !msg.key.fromMe && isMuted(sender, senderJid)) {
    await deleteWithRetry(sock, sender, msg.key)
    return
  }

  autoDetectLidFromMessage(msg, sock)
  if (isGroup) {
    autoDetectLidFromGroup(sock, sender).catch(() => {})
  }

  // ── Auto-détection LID pour Session Owner/Sudos ─────────────
  if (opts.isSecondaryBot && opts.sessionBotNumber) {
    autoDetectSessionLid(sock, msg, opts.sessionBotNumber)
  }

  // ── CACHE POUR ANTI-SUPPRESSION ────────────────────────────
  if (isGroup && !msg.key.fromMe) {
    try { cacheMessage(msg) } catch {}
  }

  // ── Gestion AFK ───────────────────────────────────────────
  if (afkStore) {
    const afkEntry = afkStore.get(senderJid)
    if (afkEntry && bodyRaw) {
      afkStore.delete(senderJid)
      const dur = Math.floor((Date.now() - afkEntry.since) / 1000)
      const h = Math.floor(dur/3600), m = Math.floor((dur%3600)/60), s = dur%60
      const durStr = h ? h+'h '+m+'m' : m ? m+'m '+s+'s' : s+'s'
      await sock.sendMessage(sender, {
        text: "✅ Bienvenue de retour @" + cleanNumber(senderJid) + "!\n⏱️ Absent: *" + durStr + "*",
        mentions: [senderJid]
      })
    }

    if (isGroup && bodyRaw) {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
      for (const mentionedJid of mentioned) {
        const afkData = afkStore.get(mentionedJid)
        if (afkData) {
          const durMs = Date.now() - afkData.since
          const m = Math.floor(durMs / 60000)
          await sock.sendMessage(sender, {
            text: "😴 @" + cleanNumber(mentionedJid) + " est AFK depuis " + m + "m: _" + afkData.reason + "_",
            mentions: [mentionedJid]
          })
        }
      }
    }
  }

  let __groupMetaForGuards = null
  if (isGroup) {
    __groupMetaForGuards = await getGroupMeta(sock, sender)
  }

  // ── ANTI-BOT — supprime les messages des comptes marqués comme
  //    bots via .antibot, sauf si l'expéditeur est admin du groupe ──
  if (isGroup && !msg.key.fromMe && isFlaggedBot(sender, senderJid)) {
    const senderIsAdmin = __groupMetaForGuards?.participants
      ?.some(p => matchJid(p.id, senderJid) && p.admin) || false
    if (!senderIsAdmin) {
      await sock.sendMessage(sender, { delete: msg.key }).catch(() => {})
      return
    }
  }

  // ── ANTI-LINK ─────────────────────────────────────────────
  if (isGroup && bodyRaw) {
    const blocked = await checkAntiLink(sock, sender, senderJid, msg)
    if (blocked) return
  }

  // ── MÉMORISER LES MESSAGES DE CHAÎNE (pour fakereac) ──────
  try { rememberIfChannelMessage(msg) } catch {}

  // ── ANTI-CHAÎNE (newsletter forwards) ─────────────────────
  if (isGroup) {
    const blockedChan = await checkAntiChannel(sock, sender, senderJid, msg)
    if (blockedChan) return
  }

  const prefix = config.prefix || '.'
  if (!bodyRaw.startsWith(prefix)) return

  const [rawCmd, ...args] = bodyRaw.slice(prefix.length).trim().split(/\s+/)
  const cmdName = rawCmd.toLowerCase()
  if (!cmdName) return

  if (config.settings?.autoTyping) {
    try { await sock.sendPresenceUpdate('composing', sender) } catch {}
  }

  // ── Construction du CTX ──────────────────────────────────
  const isSelfCommand = msg.key.fromMe === true

  // Owner global du bot principal (.env OWNER_NUMBER)
  const isGlobalMainOwner = isOwner(senderJid)

  // Permissions liées à CETTE session (si on est sur une session secondaire)
  let sessionOwnerFlag = false
  let sessionSudoFlag  = false
  let sessionPremiumFlag = false
  if (opts.isSecondaryBot && opts.sessionBotNumber) {
    sessionOwnerFlag   = checkSessionOwner(opts.sessionBotNumber, senderJid)
    sessionSudoFlag    = checkSessionSudo(opts.sessionBotNumber, senderJid)
    sessionPremiumFlag = checkSessionPremium(opts.sessionBotNumber, senderJid)
    // fromMe sur une session secondaire = c'est le téléphone lié = Session Owner
    if (isSelfCommand) sessionOwnerFlag = true
  }

  // Owner / Sudo "effectifs" pour cette instance bot
  const isMainOwner = isGlobalMainOwner || isSelfCommand || sessionOwnerFlag
  const isSudoUser  = isSudo(senderJid) || isSelfCommand || sessionOwnerFlag || sessionSudoFlag
  const isPremiumUser = isPremium(senderJid) || sessionPremiumFlag

  const groupMeta = isGroup ? await getGroupMeta(sock, sender) : null
  const botAdmin  = isGroup
    ? groupMeta?.participants?.some(p => matchJid(p.id, sock.user?.id||'') && p.admin) || false
    : false
  const isAdmin   = isGroup
    ? groupMeta?.participants?.some(p => matchJid(p.id, senderJid) && p.admin) || false
    : false

  const ctx = {
    sessionManager: opts.sessionManager || {},
    afkStore,
    senderJid,
    isMainOwner,
    isOwner:           isMainOwner,
    isSudo:            isSudoUser,
    isPremium:         isPremiumUser,
    isSelfCommand,
    isGroup,
    isAdmin,
    botAdmin,
    groupMeta,
    invalidateGroupCache,
    isSecondaryBot:    opts.isSecondaryBot || false,
    sessionBotNumber:  opts.sessionBotNumber || '',
    isGlobalMainOwner,
    isSessionOwner:    sessionOwnerFlag,
    isSessionSudo:     sessionSudoFlag,
    isSessionPremium:  sessionPremiumFlag,
  }

  // ── Mode du bot (lu DYNAMIQUEMENT, persisté sur disque) ──
  // ⚠️ Important : utiliser getMode() et NON config.mode, sinon le
  // changement effectué par .private / .public n'est jamais pris en compte.
  const currentMode = getMode()

  // Mode privé : seuls le propriétaire et les SUDO peuvent utiliser le bot.
  // On autorise aussi les messages "fromMe" (le téléphone lié) pour ne pas
  // se bloquer soi-même.
  if (currentMode === 'private' && !isMainOwner && !isSudoUser && !isSelfCommand) {
    // En mode privé, on reste silencieux pour ne pas spammer les utilisateurs
    // (sinon chaque message non-commande recevrait une réponse).
    // On ne répond que si l'utilisateur a vraiment tenté une commande.
    return await sock.sendMessage(sender, {
      text: "🔒 *Bot en mode PRIVÉ*\n\nSeuls le *propriétaire* et les *SUDO* peuvent utiliser les commandes."
    })
  }

  if (currentMode === 'group' && !isGroup && !isSudoUser && !isMainOwner) {
    return await sock.sendMessage(sender, { text: "🏠 Ce bot fonctionne uniquement en groupe." })
  }

  const fn = await loadCommand(cmdName)
  if (fn === LOAD_ERROR) {
    return await sock.sendMessage(sender, {
      text:
        `⚠️ *Commande indisponible*\n\n` +
        `La commande *${prefix}${cmdName}* n'a pas pu être chargée ` +
        `(dépendance manquante ou erreur interne).\n` +
        `👉 Vérifie les logs du bot pour le détail, ou contacte l'owner.`
    })
  }
  if (!fn) return

  const access = evaluateCommandAccess(cmdName, ctx)
  if (!access.ok) {
    return await sock.sendMessage(sender, { text: formatAccessDenied(access, prefix) })
  }

  const cooldown = checkCommandCooldown(cmdName, senderJid, ctx)
  if (!cooldown.ok) {
    return await sock.sendMessage(sender, { text: formatCooldownDenied(cooldown, prefix) })
  }

  try {
    stats.totalCommands = (stats.totalCommands || 0) + 1
    await fn(sock, sender, args, msg, ctx)
    const botLabel = opts.isSecondaryBot
      ? `[session +${cleanNumber(sock.user?.id||'')}]`
      : '[bot principal]'
    console.log(`⚡ ${cmdName} | ${cleanNumber(senderJid)} | ${isGroup ? 'groupe' : 'privé'} ${botLabel}`)
    auditLog({ action: cmdName, by: senderJid, context: sender, date: new Date().toISOString() })
  } catch (e) {
    console.error(`❌ cmd error [${cmdName}]:`, e.message)
    try { await sock.sendMessage(sender, { text: "❌ Erreur interne: " + e.message.slice(0, 100) }) } catch {}
  }
}
