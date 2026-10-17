import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import { config } from './config.js'
import {
  isSuperAdmin, isSudo, isPremium, isOwner, isDeployer,
  getSenderJid, cleanNumber, matchJid, registerLid,
  isBotLid, loadOwnerLids, setRuntimeOwner
} from './lib/ownerSystem.js'
import { autoDetectOwnerLid, autoDetectLidFromMessage, autoDetectLidFromGroup } from './lib/lidAutoDetector.js'
import { groupMetaCache, getGroupMeta, invalidateGroupCache } from './lib/groupConfig.js'
import { checkAntiLink } from './lib/antiLinkManager.js'
import { checkAntiTag } from './lib/antiTagManager.js'
import { evaluateCommandAccess, checkCommandCooldown, formatAccessDenied, formatCooldownDenied } from './lib/commandRegistry.js'
import { auditLog } from './lib/auditLogger.js'
import { isAntiSuppressionEnabled, getCachedMessage, removeCachedMessage } from './lib/antiSuppressionManager.js'
import { isAntiPromoteActive } from './commands/antipromote.js'
import { isAntiDemoteActive } from './commands/antidemote.js'
import pino from 'pino'
import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { restoreActiveSessions, createBotInstance, getBotInstance, isOnCooldown, getCooldownRemaining, sessionExists } from './lib/sessionManager.js'
import { handleMessage, purgeMutedBatch } from './lib/messageHandler.js'
import { startScheduler } from './lib/scheduler.js'
import { startRemindScheduler } from './lib/remindScheduler.js'

dotenv.config()

// ── Filet de sécurité GLOBAL ──────────────────────────────
// Sans ça, la moindre Promise rejetée non catchée n'importe où (dans une
// des 128 commandes, une session secondaire, un timer...) tue TOUT le
// processus Node — donc le bot principal ET toutes les sessions pairées
// en même temps. On log l'erreur au lieu de laisser le process mourir.
// (⚠️ ceci est un filet de secours, pas un remplacement des try/catch
// déjà en place dans les commandes.)
process.on('unhandledRejection', (reason) => {
  console.error('❌ [unhandledRejection] Promesse rejetée non gérée:', reason)
})
process.on('uncaughtException', (err) => {
  console.error('❌ [uncaughtException] Erreur non interceptée:', err)
})

export const BOT_START_TIME = Date.now()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const logger    = pino({ level: 'silent' })

const COMMANDS_DIR = path.join(__dirname, 'commands')
const DATA_DIR     = path.join(__dirname, 'data')
const AUTH_DIR     = path.join(__dirname, 'auth_info_baileys')
const STATS_FILE   = path.join(DATA_DIR, 'stats.json')
const USERS_FILE   = path.join(DATA_DIR, 'users.json')

for (const dir of [DATA_DIR, AUTH_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

const afkStore     = new Map()
const commandCache = new Map()

function loadStats() {
  try { return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')) }
  catch { return { totalCommands: 0, startTime: Date.now() } }
}
function saveStats(d) { try { fs.writeFileSync(STATS_FILE, JSON.stringify(d, null, 2)) } catch {} }
function loadUsers() { try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')) } catch { return {} } }
function saveUsers(d) { try { fs.writeFileSync(USERS_FILE, JSON.stringify(d, null, 2)) } catch {} }
function updateUserStats(jid) {
  const users = loadUsers()
  if (!users[jid]) users[jid] = { xp: 0, msgCount: 0, registeredAt: Date.now() }
  users[jid].msgCount = (users[jid].msgCount || 0) + 1
  users[jid].lastSeen = Date.now()
  saveUsers(users)
}

async function askPhoneNumber() {
  // Source de vérité : OWNER_NUMBER dans le fichier .env
  const envNumber = process.env.OWNER_NUMBER || config.ownerNumber
  if (envNumber && envNumber.toString().trim().replace(/[^0-9]/g, '').length >= 7) {
    const cleaned = envNumber.toString().trim().replace(/[^0-9]/g, '')
    console.log('📱 Numéro détecté depuis .env (OWNER_NUMBER): +' + cleaned)
    return cleaned
  }
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question('\n📱 Entrez votre numéro WhatsApp (avec indicatif pays, ex: 22612345678): ', (answer) => {
      rl.close()
      resolve(answer.replace(/[^0-9]/g, ''))
    })
  })
}

async function loadCommand(name) {
  if (commandCache.has(name)) return commandCache.get(name)
  const filePath = path.join(COMMANDS_DIR, name + '.js')
  if (!fs.existsSync(filePath)) return null
  try {
    const mod = await import(filePath + '?v=' + Date.now())
    const fn  = mod.default
    if (typeof fn === 'function') { commandCache.set(name, fn); return fn }
  } catch (e) { console.error(`❌ Erreur chargement cmd ${name}:`, e.message) }
  return null
}

async function main() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307] }))
  const stats = loadStats()

  const sock = makeWASocket({
    version,
    logger,
    auth: state,
    browser: ['Ubuntu', 'Chrome', '22.0.4'],
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    printQRInTerminal: false,
  })

  sock.ev.on('creds.update', saveCreds)

  if (!sock.authState.creds.registered) {
    const phoneNumber = await askPhoneNumber()

    if (!phoneNumber || phoneNumber.length < 7) {
      console.log('❌ Numéro invalide. Arrêt.')
      process.exit(1)
    }

    console.log('\n⏳ Connexion au serveur WhatsApp...')
    await new Promise(resolve => setTimeout(resolve, 3000))

    try {
      const code = await sock.requestPairingCode(phoneNumber)
      const formatted = code?.match(/.{1,4}/g)?.join('-') || code

      console.log('\n╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮')
      console.log('┃      ⚡ J.A.R.V.I.S. V2 — PAIRING       ┃')
      console.log('╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯')
      console.log('┃')
      console.log('┃  📱 Numéro: +' + phoneNumber)
      console.log('┃')
      console.log('┃  🔑 CODE DE COUPLAGE:')
      console.log('┃')
      console.log('┃        ' + formatted)
      console.log('┃')
      console.log('┃  📋 Comment entrer le code:')
      console.log('┃  1. Ouvrez WhatsApp sur votre téléphone')
      console.log('┃  2. Paramètres > Appareils liés')
      console.log('┃  3. Appuyez "Lier un appareil"')
      console.log('┃  4. Choisissez "Lier avec numéro de téléphone"')
      console.log('┃  5. Entrez le code ci-dessus')
      console.log('┃')
      console.log('┃  ⏱️  Ce code est valide ~60 secondes')
      console.log('╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n')
    } catch (e) {
      console.error('\n❌ Échec de génération du code de couplage:', e.message)
      console.log('💡 Solutions possibles:')
      console.log('   → Supprimez le dossier auth_info_baileys et réessayez')
      console.log('   → Vérifiez que le numéro est correct (avec indicatif pays)')
      console.log('   → Vérifiez votre connexion internet')
      process.exit(1)
    }
  }

  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      config.botNumber = cleanNumber(sock.user?.id || '')
      config.botLid    = sock.user?.id || ''

      // Injecter l'owner depuis .env (OWNER_NUMBER) au démarrage
      // setRuntimeOwner lit config.ownerNumber qui vient de process.env.OWNER_NUMBER
      if (config.ownerNumber) {
        setRuntimeOwner({
          ownerNumber: config.ownerNumber,
          ownerLid:    config.ownerLid || ""
        })
      }

      await loadOwnerLids(sock).catch(() => {})
      autoDetectOwnerLid(sock).catch(() => {})

      console.log('\n╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮')
      console.log('┃  ⚡ J.A.R.V.I.S. V2 CONNECTÉ  ┃')
      console.log('╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯')
      console.log('┃ 📱 Bot: +' + config.botNumber)
      console.log('┃ 👑 Owner: +' + (config.ownerNumber || 'NON DÉFINI ⚠️ — ajoutez OWNER_NUMBER dans .env'))
      const commandCount = fs.readdirSync(COMMANDS_DIR).filter(file => file.endsWith('.js')).length
      console.log('┃ 📋 Commandes: ' + commandCount)
      console.log('┃ 🔤 Préfixe: ' + (config.prefix || '.'))
      console.log('┃ 📦 Mode: ' + (config.mode || 'public'))
      console.log('╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n')

      // ── Démarrage du scheduler de tâches programmées ──
      try { startScheduler(sock, 5000) } catch (e) { console.error('scheduler start:', e.message) }

      // ── Démarrage de l'envoi des rappels (.remind) et messages
      //    programmés (.schedule) — jusque-là jamais délivrés ──
      try { startRemindScheduler(sock, 30000) } catch (e) { console.error('remindScheduler start:', e.message) }
    }
    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
      const willReconnect = reason !== DisconnectReason.loggedOut
      console.log('🔴 Connexion fermée, raison:', reason)
      if (willReconnect) { console.log('🔄 Reconnexion dans 5s...'); setTimeout(main, 5000) }
      else { console.log('🚪 Déconnexion définitive. Supprimez auth_info_baileys pour se reconnecter.') }
    }
  })

  sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
    try {
      const meta = await getGroupMeta(sock, id)
      const conf = (await import('./lib/groupConfig.js')).getGroupConfig(id)
      const fsPromises = await import('node:fs/promises')
      const pathModule = await import('node:path')
      const dataDir = pathModule.join(process.cwd(), 'data')
      const readGroupSettings = async (filename) => {
        try { return JSON.parse(await fsPromises.readFile(pathModule.join(dataDir, filename), 'utf8'))[id] || {} }
        catch { return {} }
      }
      const welcomeSettings = await readGroupSettings('welcome.json')
      const goodbyeSettings = await readGroupSettings('goodbye.json')
      const linkBlock = [
        '━━━━━━━━━━━━━━━━━━',
        '🔗 *REJOINS-NOUS*',
        '✈️ Groupe Telegram : https://t.me/+kcLFkzePlwwyZjE8',
        '📣 Chaîne Telegram : https://t.me/nexusforger',
        `🤖 *LIEN POUR CONNECTER LE BOT* : ${process.env.BOT_CONNECT_LINK || '(à renseigner)'}`,
        `🤖 *${config.botName}* • Développeur : *${config.developerName}*`,
        `⚒️ Équipe : *${config.teamName}*`,
        '',
        '📢 *Voir la chaîne WhatsApp :* https://whatsapp.com/channel/0029VbCRcEJLdQeYxw5g3m2o'
      ].join('\n')

      for (const jid of participants) {
        const num = cleanNumber(jid)
        if (action === 'add') {
          const groupName = meta?.subject || 'ce groupe'
          const template = welcomeSettings.message || conf.welcomeMsg || '🎉 Bienvenue {name} dans *{group}* !\n👥 Membres : {count}\n📜 Consulte les règles avec *.rules*.'
          const welcomeMsg = String(template)
            .replace(/\{name\}/g, '@' + num)
            .replace(/\{group\}/g, groupName)
            .replace(/\{count\}/g, String(meta?.participants?.length || '?'))
          const caption = `${welcomeMsg}\n\n${linkBlock}`
          const imagePath = pathModule.join(process.cwd(), 'assets', 'jarvis-command.jpg')
          try {
            const image = await fsPromises.readFile(imagePath)
            await sock.sendMessage(id, { image, caption, mentions: [jid] })
          } catch (imageError) {
            console.error('[WELCOME] Image indisponible :', imageError.message)
            await sock.sendMessage(id, { text: caption, mentions: [jid] })
          }
        }
        if (action === 'remove') {
          const groupName = meta?.subject || 'ce groupe'
          const template = goodbyeSettings.message || conf.goodbyeMsg || '👋 Au revoir {name} ! Tu nous manqueras dans *{group}*.'
          const goodbyeMsg = String(template)
            .replace(/\{name\}/g, '@' + num)
            .replace(/\{group\}/g, groupName)
          const caption = `${goodbyeMsg}\n\n${linkBlock}`
          const imagePath = pathModule.join(process.cwd(), 'assets', 'jarvis-command.jpg')
          try {
            const image = await fsPromises.readFile(imagePath)
            await sock.sendMessage(id, { image, caption, mentions: [jid] })
          } catch (imageError) {
            console.error('[GOODBYE] Image indisponible :', imageError.message)
            await sock.sendMessage(id, { text: caption, mentions: [jid] })
          }
        }
        if (action === 'remove') {
          const anti = (await import('./lib/antipurgeTracker.js')).default
          if (anti?.track) anti.track(id, jid)

          // ── DÉCLENCHEMENT ANTI-PURGE ──────────────────────────
          if (anti.isAntipurgeActive(id) && anti.isPurging(id) && anti.canTrigger(id)) {
            anti.markTriggered(id)
            try {
              const freshMeta = await getGroupMeta(sock, id)
              const botJid = sock.user?.id || ''
              const admins = (freshMeta?.participants || [])
                .filter(p => p.admin && !matchJid(p.id, botJid))
                .map(p => p.id)

              await sock.sendMessage(id, {
                text:
                  "🚨 *ALERTE ANTI-PURGE !*\n\n" +
                  `Plus de ${anti.PURGE_THRESHOLD - 1} suppressions détectées en moins de ` +
                  `${anti.PURGE_WINDOW_MS / 1000} secondes.\n\n` +
                  "🔻 Révocation de *tous les admins*\n" +
                  "🔒 *Verrouillage* du groupe (mode annonce)"
              })

              // 1) Révoquer tous les admins (sauf le bot)
              if (admins.length) {
                try { await sock.groupParticipantsUpdate(id, admins, 'demote') }
                catch (e) { console.error('antipurge demote error:', e.message) }
              }

              // 2) Verrouiller le groupe : seuls les admins peuvent écrire
              try { await sock.groupSettingUpdate(id, 'announcement') }
              catch (e) { console.error('antipurge lock error:', e.message) }

            } catch (e) {
              console.error('antipurge trigger error:', e.message)
            }
          }
        }
      }
      invalidateGroupCache(id)
    } catch (e) { console.error('group-participants error:', e.message) }
  })

  // ╔══════════════════════════════════════════════════════════╗
  // ║  ANTI-PROMOTE / ANTI-DEMOTE — version stabilisée         ║
  // ║                                                          ║
  // ║  Corrections apportées :                                 ║
  // ║  • Garde anti-écho : on ignore les events provoqués      ║
  // ║    par les actions du bot lui-même (sinon ping-pong      ║
  // ║    infini entre antipromote↔antidemote).                 ║
  // ║  • Appels groupés : un seul groupParticipantsUpdate      ║
  // ║    pour tous les participants au lieu d'une boucle       ║
  // ║    (évite les rate-limits et les échecs partiels).       ║
  // ║  • Retry automatique sur erreur réseau.                  ║
  // ║  • Vérification "bot admin" avec message clair.          ║
  // ║  • Gestion robuste de l'auteur manquant (Baileys).       ║
  // ║  • Pas de notification si action ignorée (silence).      ║
  // ╚══════════════════════════════════════════════════════════╝

  // Garde anti-écho : enregistre les actions que LE BOT vient d'exécuter
  // pour les ignorer quand l'event de retour arrive. Auto-purge après 6s.
  const _selfActionGuard = new Set()
  function _markSelfAction(groupId, action, jids) {
    for (const jid of jids) {
      const key = `${groupId}|${action}|${cleanNumber(jid)}`
      _selfActionGuard.add(key)
      setTimeout(() => _selfActionGuard.delete(key), 6000)
    }
  }
  function _isSelfAction(groupId, action, jid) {
    return _selfActionGuard.has(`${groupId}|${action}|${cleanNumber(jid)}`)
  }

  // Wrapper avec retry pour groupParticipantsUpdate
  async function _safeGroupAction(groupId, jids, action, label = '') {
    const targets = (jids || []).filter(Boolean)
    if (!targets.length) return { ok: true, results: [] }
    _markSelfAction(groupId, action, targets)

    let lastErr = null
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const results = await sock.groupParticipantsUpdate(groupId, targets, action)
        return { ok: true, results }
      } catch (e) {
        lastErr = e
        // Délai progressif : 500ms, 1.2s, 2.5s
        const wait = 500 * attempt + 200 * attempt
        await new Promise(r => setTimeout(r, wait))
      }
    }
    console.error(`❌ ${label || action} échec après 3 tentatives:`, lastErr?.message)
    return { ok: false, error: lastErr }
  }

  sock.ev.on('group-participants.update', async ({ id, author, participants, action }) => {
    try {
      // Filtrer rapidement : on ne traite que promote/demote
      if (action !== 'promote' && action !== 'demote') return
      if (!Array.isArray(participants) || participants.length === 0) return

      // ── Garde anti-écho ──────────────────────────────────
      // Si TOUS les participants modifiés correspondent à une action
      // que LE BOT vient lui-même de déclencher, on ignore l'event
      // pour éviter la boucle antipromote↔antidemote.
      const allFromBot = participants.every(p => _isSelfAction(id, action, p))
      if (allFromBot) return

      // Filtrer les participants dont l'event vient du bot (les autres
      // sont les vraies actions externes à traiter)
      const realTargets = participants.filter(p => !_isSelfAction(id, action, p))
      if (realTargets.length === 0) return

      const antiPromoteOn = action === 'promote' && isAntiPromoteActive(id)
      const antiDemoteOn  = action === 'demote'  && isAntiDemoteActive(id)
      if (!antiPromoteOn && !antiDemoteOn) return

      // ── Vérifier que le bot est admin (sinon impossible d'agir) ──
      const meta = await getGroupMeta(sock, id).catch(() => null)
      const botJid = sock.user?.id || ''
      const botIsAdmin = meta?.participants?.some(p => matchJid(p.id, botJid) && p.admin)
      if (!botIsAdmin) {
        // On notifie une fois que le bot doit être admin pour appliquer la règle
        try {
          await sock.sendMessage(id, {
            text:
              `🛡️ *${antiPromoteOn ? 'ANTI-PROMOTE' : 'ANTI-DEMOTE'} actif*\n\n` +
              `⚠️ Je ne suis *pas administrateur* du groupe : impossible d'appliquer la règle.\n` +
              `👉 Promouvez-moi admin pour que la protection fonctionne.`
          })
        } catch {}
        return
      }

      // ── Identifier l'auteur de l'action ─────────────────
      // Sur certaines versions de Baileys, "author" est absent.
      const actor = author || ''
      const actorIsBot = actor && matchJid(actor, botJid)
      const actorIsProtected =
        !actor || actorIsBot ||
        isOwner(actor) || isDeployer(actor) || isSuperAdmin(actor)

      // Cibles à traiter (jamais le bot lui-même)
      const targets = realTargets.filter(p => !matchJid(p, botJid))

      // ─────────────────────────────────────────────────────
      // ANTI-PROMOTE
      // ─────────────────────────────────────────────────────
      if (antiPromoteOn) {
        // 1) Démoter d'un coup tous les nouveaux admins (hors bot)
        if (targets.length > 0) {
          await _safeGroupAction(id, targets, 'demote', 'antipromote.revert')
        }

        // 2) Rétrograder l'auteur s'il n'est pas protégé
        if (!actorIsProtected) {
          await _safeGroupAction(id, [actor], 'demote', 'antipromote.actor')
        }

        // 3) Notifier le groupe
        try {
          const mentions = []
          if (actor && !actorIsBot) mentions.push(actor)
          mentions.push(...targets)
          await sock.sendMessage(id, {
            text:
              "🛡️ *ANTI-PROMOTE ACTIF*\n\n" +
              (actor && !actorIsBot
                ? `⚠️ @${cleanNumber(actor)} a tenté de promouvoir un membre.\n\n`
                : "⚠️ Une tentative de promotion a été détectée.\n\n") +
              "⛔ Promotion annulée" +
              (actorIsProtected ? "." : " et l'auteur a été *rétrogradé*."),
            mentions
          })
        } catch (e) { console.error('antipromote notify error:', e.message) }
        return
      }

      // ─────────────────────────────────────────────────────
      // ANTI-DEMOTE
      // ─────────────────────────────────────────────────────
      if (antiDemoteOn) {
        // 1) Re-promouvoir d'un coup tous les admins rétrogradés (hors bot)
        if (targets.length > 0) {
          await _safeGroupAction(id, targets, 'promote', 'antidemote.restore')
        }

        // 2) Si le bot lui-même a été démoté, tenter de se re-promouvoir
        const botWasDemoted = realTargets.some(p => matchJid(p, botJid))
        if (botWasDemoted) {
          setTimeout(() => {
            _safeGroupAction(id, [botJid], 'promote', 'antidemote.bot-self').catch(() => {})
          }, 1500)
        }

        // 3) Rétrograder l'auteur s'il n'est pas protégé
        if (!actorIsProtected) {
          await _safeGroupAction(id, [actor], 'demote', 'antidemote.actor')
        }

        // 4) Notifier le groupe
        try {
          const mentions = []
          if (actor && !actorIsBot) mentions.push(actor)
          mentions.push(...targets)
          await sock.sendMessage(id, {
            text:
              "🛡️ *ANTI-DEMOTE ACTIF*\n\n" +
              (actor && !actorIsBot
                ? `⚠️ @${cleanNumber(actor)} a tenté de rétrograder un admin.\n\n`
                : "⚠️ Une tentative de rétrogradation a été détectée.\n\n") +
              "✅ Admin(s) rétabli(s)" +
              (actorIsProtected ? "." : " et auteur *rétrogradé*."),
            mentions
          })
        } catch (e) { console.error('antidemote notify error:', e.message) }
        return
      }
    } catch (e) {
      console.error('promote/demote handler error:', e.message)
    }
  })

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    // Purge "tgl" en priorité, EN PARALLÈLE sur tout le batch — avant
    // le traitement séquentiel normal. Voir purgeMutedBatch() pour le détail.
    await purgeMutedBatch(sock, messages).catch(e => console.error('[tgl] purgeMutedBatch error:', e.message))
    for (const msg of messages) {
      try { await handleMessage(sock, msg, stats, afkStore, { sessionManager: { createBotInstance, getBotInstance, isOnCooldown, getCooldownRemaining, sessionExists } }) } catch (e) { console.error('msg handler error:', e.message) }
    }
    saveStats(stats)
  })

  // ── ANTI-SUPPRESSION — détection des messages supprimés ────
  sock.ev.on('messages.update', async (updates) => {
    for (const update of updates) {
      try {
        // Un message supprimé a une clé avec protocolMessage de type REVOKE
        const msgKey   = update.key
        const groupId  = msgKey?.remoteJid
        if (!groupId || !groupId.endsWith('@g.us')) continue

        // Vérifier si c'est bien une suppression (protocolMessage REVOKE)
        const isDelete =
          update.update?.message?.protocolMessage?.type === 0 ||
          update.update?.message?.protocolMessage?.type === 'REVOKE' ||
          (update.update?.message?.protocolMessage?.key?.id)

        if (!isDelete) continue
        if (!isAntiSuppressionEnabled(groupId)) continue

        // Récupérer l'ID du message supprimé
        const deletedMsgId = update.update?.message?.protocolMessage?.key?.id || msgKey?.id
        if (!deletedMsgId) continue

        // Retrouver le message dans le cache
        const cached = getCachedMessage(deletedMsgId)
        if (!cached) continue

        // Ne pas renvoyer les messages du bot lui-même
        const botNum = cleanNumber(sock.user?.id || '')
        const senderNum = cleanNumber(cached.sender || '')
        if (senderNum === botNum) continue

        // Retirer du cache pour éviter les doublons
        removeCachedMessage(deletedMsgId)

        // Construire le message à renvoyer
        const senderDisplay = cached.pushName || senderNum || 'Inconnu'
        let msgReveal = `🗑️ *MESSAGE SUPPRIMÉ*\n👤 *De:* ${senderDisplay}\n\n`

        if (cached.text) {
          // Message texte
          msgReveal += `💬 *Message:*\n${cached.text}`
          await sock.sendMessage(groupId, { text: msgReveal })
        } else if (cached.type === 'image') {
          // Image — on envoie le message d'alerte + la médias si possible
          msgReveal += `📷 _(Image supprimée)_`
          await sock.sendMessage(groupId, { text: msgReveal })
          // Tenter de transférer l'image originale
          try {
            await sock.sendMessage(groupId, {
              image: cached.msg?.imageMessage,
              caption: `🗑️ Image supprimée par ${senderDisplay}`
            })
          } catch {}
        } else if (cached.type === 'video') {
          msgReveal += `🎥 _(Vidéo supprimée)_`
          await sock.sendMessage(groupId, { text: msgReveal })
        } else if (cached.type === 'audio') {
          msgReveal += `🎵 _(Audio supprimé)_`
          await sock.sendMessage(groupId, { text: msgReveal })
        } else if (cached.type === 'sticker') {
          msgReveal += `🏷️ _(Sticker supprimé)_`
          await sock.sendMessage(groupId, { text: msgReveal })
        } else if (cached.type === 'document') {
          msgReveal += `📄 _(Document supprimé)_`
          await sock.sendMessage(groupId, { text: msgReveal })
        } else {
          msgReveal += `_(Message supprimé)_`
          await sock.sendMessage(groupId, { text: msgReveal })
        }
      } catch (e) {
        console.error('❌ AntiSuppression update error:', e.message)
      }
    }
  })

  return sock
}


// Restaurer les sessions sauvegardées au démarrage
restoreActiveSessions().catch(err => console.error('[Sessions] Erreur restauration:', err.message))

main().catch(err => {
  console.error('❌ Erreur fatale:', err)
  process.exit(1)
})
