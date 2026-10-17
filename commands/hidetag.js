
import { sendMessage } from "../lib/sendMessage.js"
import {
  getSenderJid,
  isDeployer,
  isSudo,
  matchJid
} from "../lib/ownerSystem.js"

const DEFAULT_MESSAGE = "📢 Message du système"
const MAX_MESSAGE_LENGTH = 3000

const DESIGN = {
  line: "━━━━━━━━━━━━━━━━━━━━━━",
  header: "「 J.A.R.V.I.S. / HIDETAG 」"
}

function isGroupJid(jid) {
  return typeof jid === "string" && jid.endsWith("@g.us")
}

function getParticipantJids(participant) {
  if (!participant || typeof participant !== "object") return []

  return [
    participant.id,
    participant.jid,
    participant.lid,
    participant.phoneNumber
  ].filter(value => typeof value === "string" && value.length > 0)
}

function isSameJid(participant, jid) {
  return getParticipantJids(participant).some(candidate => {
    try {
      return matchJid(candidate, jid)
    } catch {
      return candidate === jid
    }
  })
}

function getUniqueParticipants(participants = []) {
  const seen = new Set()
  const result = []

  for (const participant of participants) {
    const jid = getParticipantJids(participant)[0]

    if (!jid || seen.has(jid)) continue

    seen.add(jid)
    result.push(jid)
  }

  return result
}

function cleanMessage(args = []) {
  const message = Array.isArray(args)
    ? args.join(" ").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim()
    : ""

  return (message || DEFAULT_MESSAGE).slice(0, MAX_MESSAGE_LENGTH)
}

function isAdminParticipant(participant) {
  return participant?.admin === "admin" ||
    participant?.admin === "superadmin"
}

function formatError(message) {
  return [
    `╭─ ${DESIGN.header}`,
    "│ Une erreur est survenue.",
    "│",
    `│ ${message}`,
    "╰──────────────────────"
  ].join("\n")
}

async function safeSendPrivate(sock, jid, text) {
  if (!jid || !sock || typeof sock.sendMessage !== "function") return

  try {
    await sendMessage(sock, jid, text)
  } catch (error) {
    console.warn("[HIDETAG] Impossible d'envoyer la confirmation privée :", error.message)
  }
}

export default async function hidetag(sock, sender, args = [], msg, ctx = {}) {
  try {
    // 1. Vérifier le contexte du groupe.
    if (!isGroupJid(sender)) {
      await safeSendPrivate(
        sock,
        sender,
        formatError("Cette commande est disponible uniquement dans un groupe WhatsApp.")
      )
      return
    }

    if (typeof sock.groupMetadata !== "function") {
      throw new Error("La récupération des informations du groupe est indisponible.")
    }

    // 2. Charger les métadonnées une seule fois.
    const metadata = await sock.groupMetadata(sender)
    const participants = Array.isArray(metadata?.participants)
      ? metadata.participants
      : []

    if (!participants.length) {
      await safeSendPrivate(
        sock,
        sender,
        formatError("Impossible de récupérer la liste des membres.")
      )
      return
    }

    // 3. Déterminer l'utilisateur qui exécute la commande.
    const userJid = ctx.senderJid || getSenderJid(msg, sock)

    if (!userJid) {
      await safeSendPrivate(
        sock,
        sender,
        formatError("Impossible d'identifier l'expéditeur de la commande.")
      )
      return
    }

    const owner = ctx.isOwner === true ||
      isDeployer(userJid) ||
      isSudo(userJid)

    const userIsAdmin = ctx.isAdmin === true ||
      participants.some(participant =>
        isAdminParticipant(participant) &&
        isSameJid(participant, userJid)
      )

    if (!owner && !userIsAdmin) {
      await safeSendPrivate(
        sock,
        sender,
        formatError("Seuls les administrateurs du groupe peuvent utiliser cette commande.")
      )
      return
    }

    // 4. Vérifier que le bot est administrateur du groupe.
    const botJid = sock.user?.id || sock.user?.jid
    const botParticipant = botJid
      ? participants.find(participant => isSameJid(participant, botJid))
      : null

    if (!botParticipant || !isAdminParticipant(botParticipant)) {
      await safeSendPrivate(
        sock,
        sender,
        formatError("Le bot doit être administrateur du groupe pour cette opération.")
      )
      return
    }

    // 5. Construire les mentions et le message.
    const mentions = getUniqueParticipants(participants)
    const customMessage = cleanMessage(args)

    if (!mentions.length) {
      await safeSendPrivate(
        sock,
        sender,
        formatError("Aucun membre à mentionner n'a été trouvé.")
      )
      return
    }

    // 6. Envoyer les mentions cachées dans le groupe.
    await sock.sendMessage(sender, {
      text: customMessage,
      mentions
    })

    // 7. Confirmer en privé.
    const confirmation = [
      `╭─ ${DESIGN.header}`,
      "│ Opération terminée",
      "├──────────────────────",
      `│ Membres mentionnés : ${mentions.length}`,
      "│ Type : mentions cachées",
      `│ Groupe : ${metadata.subject || "Groupe WhatsApp"}`,
      "├──────────────────────",
      "│ Message envoyé :",
      ...customMessage.split("\n").slice(0, 8).map(line => `│ ${line}`),
      "╰──────────────────────"
    ].join("\n")

    await safeSendPrivate(sock, userJid, confirmation)

    console.log(
      `[HIDETAG] Succès | Groupe: ${sender} | Membres: ${mentions.length} | Par: ${userJid}`
    )
  } catch (error) {
    console.error("[HIDETAG] Erreur :", error)

    await safeSendPrivate(
      sock,
      ctx.senderJid || getSenderJid(msg, sock) || sender,
      formatError(
        error?.message || "Erreur inconnue lors de l'envoi des mentions."
      )
    )
  }
}
