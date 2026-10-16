
import { config } from "../config.js"
import { getSenderJid, cleanNumber } from "../lib/ownerSystem.js"

const MAX_DELAY_MS = 24 * 60 * 60 * 1000
const MIN_DELAY_MS = 1000
const MAX_TIMER_TIMEOUT = 2_147_000_000

// Un timer actif par groupe.
const activeTimers = new Map()

const UI = {
  header: "「 J.A.R.V.I.S. / GROUP TIMER 」",
  line: "━━━━━━━━━━━━━━━━━━━━━━"
}

function isGroupJid(jid) {
  return typeof jid === "string" && jid.endsWith("@g.us")
}

function getPrefix() {
  return typeof config.prefix === "string" && config.prefix.length
    ? config.prefix
    : "."
}

function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const parts = []

  if (days) parts.push(`${days}j`)
  if (hours) parts.push(`${hours}h`)
  if (minutes) parts.push(`${minutes}min`)
  if (seconds && !days) parts.push(`${seconds}s`)

  return parts.join(" ") || "0s"
}

/**
 * Formats acceptés :
 * 30
 * 30m / 30mn / 30min
 * 1h
 * 1h30
 * 1h30m / 1h30mn / 1h30min
 * 2h15m
 *
 * Un nombre seul signifie des minutes.
 */
function parseTime(input) {
  if (typeof input !== "string") return null

  const value = input.toLowerCase().replace(/\s+/g, "")

  if (!value) return null

  // Nombre seul : minutes.
  if (/^\d+$/.test(value)) {
    const minutes = Number(value)
    if (!Number.isSafeInteger(minutes) || minutes <= 0) return null
    return minutes * 60_000
  }

  // Durée composée d'heures et/ou de minutes.
  const match = value.match(
    /^(?:(\d+)h)?(?:(\d+)(?:mn|min|m)?)?$/
  )

  if (!match || (!match[1] && !match[2])) return null

  const hours = Number(match[1] || 0)
  const minutes = Number(match[2] || 0)

  if (
    !Number.isSafeInteger(hours) ||
    !Number.isSafeInteger(minutes) ||
    hours < 0 ||
    minutes < 0
  ) {
    return null
  }

  // Refuse les valeurs manifestement incohérentes.
  if (minutes > 59 && match[1]) return null

  const result = hours * 3_600_000 + minutes * 60_000

  return Number.isSafeInteger(result) && result > 0
    ? result
    : null
}

function cleanJidNumber(jid) {
  try {
    return cleanNumber(jid)
  } catch {
    return typeof jid === "string" ? jid.split("@")[0].split(":")[0] : ""
  }
}

function sameJid(a, b) {
  if (!a || !b) return false
  if (a === b) return true

  const first = cleanJidNumber(a)
  const second = cleanJidNumber(b)

  return Boolean(first && second && first === second)
}

function isAdminParticipant(participant) {
  return participant?.admin === "admin" ||
    participant?.admin === "superadmin"
}

async function getGroupContext(sock, groupId, userId) {
  const metadata = await sock.groupMetadata(groupId)
  const participants = Array.isArray(metadata?.participants)
    ? metadata.participants
    : []

  const user = participants.find(participant => {
    return sameJid(participant.id, userId) ||
      sameJid(participant.jid, userId) ||
      sameJid(participant.lid, userId)
  })

  const botJid = sock.user?.id || sock.user?.jid

  const bot = botJid
    ? participants.find(participant => {
        return sameJid(participant.id, botJid) ||
          sameJid(participant.jid, botJid) ||
          sameJid(participant.lid, botJid)
      })
    : null

  return {
    metadata,
    userIsAdmin: isAdminParticipant(user),
    botIsAdmin: isAdminParticipant(bot)
  }
}

function formatHelp() {
  const prefix = getPrefix()

  return [
    `╭─ ${UI.header}`,
    "│ PROGRAMMATION AUTOMATIQUE",
    "├──────────────────────",
    "│ Actions :",
    `│ ${prefix}group-tm close <durée>`,
    "│ Fermer le groupe après le délai.",
    "│",
    `│ ${prefix}group-tm open <durée>`,
    "│ Ouvrir le groupe après le délai.",
    "│",
    `│ ${prefix}group-tm cancel`,
    "│ Annuler la programmation.",
    "├──────────────────────",
    "│ Exemples :",
    `│ ${prefix}group-tm close 30min`,
    `│ ${prefix}group-tm open 1h30`,
    `│ ${prefix}group-tm close 2h15m`,
    "│",
    "│ Délai : 1 seconde à 24 heures.",
    "╰──────────────────────"
  ].join("\n")
}

async function sendText(sock, jid, text) {
  return sock.sendMessage(jid, { text })
}

function cancelTimer(groupId) {
  const timer = activeTimers.get(groupId)
  if (!timer) return false

  clearTimeout(timer.timeout)
  activeTimers.delete(groupId)

  return true
}

function scheduleNextRun(sock, groupId, timer) {
  const remaining = timer.endTime - Date.now()

  if (remaining <= 0) {
    void executeTimer(sock, groupId, timer)
    return
  }

  // Évite la limite maximale de setTimeout.
  timer.timeout = setTimeout(() => {
    if (activeTimers.get(groupId) !== timer) return
    scheduleNextRun(sock, groupId, timer)
  }, Math.min(remaining, MAX_TIMER_TIMEOUT))
}

async function executeTimer(sock, groupId, timer) {
  // Évite qu'un ancien timer exécute une action après remplacement.
  if (activeTimers.get(groupId) !== timer) return

  try {
    const metadata = await sock.groupMetadata(groupId)
    const botJid = sock.user?.id || sock.user?.jid

    const botParticipant = metadata.participants?.find(participant =>
      sameJid(participant.id, botJid) ||
      sameJid(participant.jid, botJid) ||
      sameJid(participant.lid, botJid)
    )

    if (!isAdminParticipant(botParticipant)) {
      throw new Error("Le bot n'est plus administrateur du groupe.")
    }

    const setting = timer.action === "close"
      ? "announcement"
      : "not_announcement"

    await sock.groupSettingUpdate(groupId, setting)

    const label = timer.action === "close"
      ? "GROUPE FERMÉ"
      : "GROUPE OUVERT"

    const message = [
      `╭─ ${UI.header}`,
      `│ ${timer.action === "close" ? "🔒" : "🔓"} ${label}`,
      "├──────────────────────",
      `│ Groupe : ${metadata.subject || "Groupe WhatsApp"}`,
      `│ Programmation : ${formatTime(timer.delayMs)}`,
      "│",
      "│ L'action programmée a été exécutée.",
      "╰──────────────────────"
    ].join("\n")

    await sendText(sock, groupId, message)

    console.log(
      `[GROUP-TM] Exécuté | action=${timer.action} | groupe=${groupId}`
    )
  } catch (error) {
    console.error("[GROUP-TM] Échec de l'exécution :", error)

    try {
      await sendText(sock, groupId, [
        `╭─ ${UI.header}`,
        "│ ÉCHEC DE LA PROGRAMMATION",
        "├──────────────────────",
        `│ ${error?.message || "Erreur inconnue."}`,
        "│ Vérifie les droits du bot.",
        "╰──────────────────────"
      ].join("\n"))
    } catch (sendError) {
      console.error("[GROUP-TM] Impossible d'envoyer l'erreur :", sendError)
    }
  } finally {
    if (activeTimers.get(groupId) === timer) {
      activeTimers.delete(groupId)
    }
  }
}

export default async function groupTm(sock, sender, args = [], msg, ctx = {}) {
  try {
    if (!isGroupJid(sender)) {
      await sendText(
        sock,
        sender,
        "Cette commande est disponible uniquement dans un groupe WhatsApp."
      )
      return
    }

    const action = String(args[0] || "").toLowerCase()

    if (action === "help" || action === "--help") {
      await sendText(sock, sender, formatHelp())
      return
    }

    // Annulation.
    if (action === "cancel") {
      const userId = ctx.senderJid || getSenderJid(msg, sock)

      if (!userId) {
        await sendText(sock, sender, "Impossible d'identifier l'expéditeur.")
        return
      }

      const { userIsAdmin } = await getGroupContext(sock, sender, userId)
      if (!userIsAdmin && ctx.isOwner !== true) {
        await sendText(
          sock,
          sender,
          "Accès refusé : seuls les administrateurs du groupe peuvent annuler cette programmation."
        )
        return
      }

      if (!cancelTimer(sender)) {
        await sendText(sock, sender, "Aucune programmation active dans ce groupe.")
        return
      }

      await sendText(sock, sender, [
        `╭─ ${UI.header}`,
        "│ PROGRAMMATION ANNULÉE",
        "├──────────────────────",
        "│ Le timer actif a été supprimé.",
        "╰──────────────────────"
      ].join("\n"))

      return
    }

    if (action !== "close" && action !== "open") {
      await sendText(sock, sender, formatHelp())
      return
    }

    const userId = ctx.senderJid || getSenderJid(msg, sock)

    if (!userId) {
      await sendText(sock, sender, "Impossible d'identifier l'expéditeur.")
      return
    }

    const { metadata, userIsAdmin, botIsAdmin } =
      await getGroupContext(sock, sender, userId)

    if (!userIsAdmin && ctx.isOwner !== true) {
      await sendText(
        sock,
        sender,
        "Accès refusé : seuls les administrateurs du groupe peuvent programmer cette action."
      )
      return
    }

    if (!botIsAdmin) {
      await sendText(
        sock,
        sender,
        "Le bot doit être administrateur du groupe pour fermer ou ouvrir le groupe."
      )
      return
    }

    if (args.length < 2) {
      await sendText(sock, sender, formatHelp())
      return
    }

    const timeInput = args.slice(1).join("")
    const delayMs = parseTime(timeInput)

    if (delayMs === null) {
      await sendText(
        sock,
        sender,
        "Durée invalide. Exemples : 30min, 1h, 1h30, 2h15m."
      )
      return
    }

    if (delayMs < MIN_DELAY_MS || delayMs > MAX_DELAY_MS) {
      await sendText(
        sock,
        sender,
        "Le délai doit être compris entre 1 seconde et 24 heures."
      )
      return
    }

    // Remplacer un ancien timer seulement après validation complète.
    cancelTimer(sender)

    const timer = {
      action,
      delayMs,
      endTime: Date.now() + delayMs,
      userId,
      timeout: null
    }

    activeTimers.set(sender, timer)
    scheduleNextRun(sock, sender, timer)

    const actionLabel = action === "close" ? "fermeture" : "ouverture"
    const executionTime = new Date(timer.endTime).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    })

    await sendText(sock, sender, [
      `╭─ ${UI.header}`,
      "│ PROGRAMMATION ENREGISTRÉE",
      "├──────────────────────",
      `│ Groupe : ${metadata.subject || "Groupe WhatsApp"}`,
      `│ Action : ${actionLabel}`,
      `│ Délai : ${formatTime(delayMs)}`,
      `│ Exécution : ${executionTime}`,
      "├──────────────────────",
      `│ Annuler : ${getPrefix()}group-tm cancel`,
      "╰──────────────────────"
    ].join("\n"))

    console.log(
      `[GROUP-TM] Programmé | action=${action} | délai=${formatTime(delayMs)} | groupe=${sender}`
    )
  } catch (error) {
    console.error("[GROUP-TM] Erreur :", error)

    try {
      await sendText(
        sock,
        sender,
        `Une erreur est survenue : ${error?.message || "erreur inconnue"}.`
      )
    } catch (sendError) {
      console.error("[GROUP-TM] Échec du message d'erreur :", sendError)
    }
  }
}

// Alias conservé pour les systèmes qui importent cette fonction.
export async function groupTmCancel(sock, sender, args = [], msg, ctx = {}) {
  return groupTm(sock, sender, ["cancel"], msg, ctx)
}
