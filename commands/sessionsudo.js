// ╔════════════════════════════════════════════════════════╗
// ║   .sessionsudo — Gérer les sudos de SA session         ║
// ║                                                        ║
// ║   Réservé au Session Owner (le numéro qui a fait       ║
// ║   .pairing). Les sudos ajoutés ici n'ont des droits    ║
// ║   que sur cette session secondaire, pas sur le bot     ║
// ║   principal ni les autres sessions.                    ║
// ║                                                        ║
// ║   Usage:                                               ║
// ║     .sessionsudo add @user      (ou en réponse)        ║
// ║     .sessionsudo add 22612345678                       ║
// ║     .sessionsudo del @user                             ║
// ║     .sessionsudo list                                  ║
// ╚════════════════════════════════════════════════════════╝

import {
  loadSessionMeta,
  addSessionSudo,
  removeSessionSudo,
  listSessionSudos,
} from '../lib/sessionMetaManager.js'
import { cleanNumber } from '../lib/ownerSystem.js'

function extractTarget(args, msg) {
  // Mention
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
  if (mentioned) {
    return {
      number: cleanNumber(mentioned),
      lid: mentioned.includes('@lid') ? cleanNumber(mentioned) : ''
    }
  }
  // Réponse à un message
  const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant
  if (quotedParticipant) {
    return {
      number: cleanNumber(quotedParticipant),
      lid: quotedParticipant.includes('@lid') ? cleanNumber(quotedParticipant) : ''
    }
  }
  // Argument numérique
  const arg = args.find(a => /\d{6,}/.test(a))
  if (arg) {
    return { number: cleanNumber(arg), lid: '' }
  }
  return null
}

export default async function sessionsudo(sock, sender, args, msg, ctx) {
  const send = (text, extra = {}) => sock.sendMessage(sender, { text, ...extra })

  // Doit être sur une session secondaire
  if (!ctx.isSecondaryBot || !ctx.sessionBotNumber) {
    return send(
      '🕷️ Cette commande n’est utilisable que depuis une session pairée (.pairing).\n' +
      'Pour gérer les sudos du Système principal, utilise .addsudo / .delsudo.'
    )
  }

  // Doit être Session Owner
  if (!ctx.isSessionOwner && !ctx.isGlobalMainOwner) {
    return send('🔒 Réservé au *Session Owner* de cette session.')
  }

  const sub = (args[0] || '').toLowerCase()
  const sessionN = ctx.sessionBotNumber

  if (sub === 'list' || !sub) {
    const sudos = listSessionSudos(sessionN)
    const meta  = loadSessionMeta(sessionN)
    if (!sudos.length) {
      return send(
        '🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n' +
        '     🕷️ ⭐ SESSION SUDOS 🕷️\n' +
        '🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n' +
        `👑 Session Owner: *+${meta.Propriétaire.number}*\n` +
        `🆔 LIDs détectés: ${meta.Propriétaire.lids.length}\n\n` +
        '📭 Aucun Session Sudo pour le moment.\n\n' +
        'Ajoute-en avec : *.sessionsudo add @user*'
      )
    }
    let txt =
      '🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n' +
      '     🕷️ ⭐ SESSION SUDOS 🕷️\n' +
      '🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n' +
      `👑 Session Owner: *+${meta.Propriétaire.number}*\n` +
      `🆔 LIDs détectés: ${meta.Propriétaire.lids.length}\n\n` +
      `📋 ${sudos.length} sudo(s) :\n`
    sudos.forEach((s, i) => {
      txt += `   ${i + 1}. +${s.number}` + (s.lids?.length ? ` 🆔(${s.lids.length})` : '') + '\n'
    })
    return send(txt)
  }

  if (sub === 'add' || sub === 'ajouter') {
    const target = extractTarget(args.slice(1), msg)
    if (!target?.number) {
      return send('🕷️ syntaxe : .sessionsudo add @user  (ou en réponse à un message, ou .sessionsudo add 22612345678)')
    }
    const result = addSessionSudo(sessionN, target.number, target.lid)
    if (!result.ok) return send(`│ ${result.reason}`)
    return send(
      `⚙️ *+${target.number}* est désormais Session Sudo.\n` +
      `   Total : ${result.total}\n\n` +
      (target.lid
        ? `🆔 LID enregistré : ${target.lid}\n`
        : `👁️ Son LID sera détecté automatiquement à son prochain message en groupe.`)
    )
  }

  if (sub === 'del' || sub === 'remove' || sub === 'supprimer') {
    const target = extractTarget(args.slice(1), msg)
    if (!target?.number) {
      return send('🕷️ syntaxe : .sessionsudo del @user  (ou en réponse, ou .sessionsudo del 22612345678)')
    }
    const result = removeSessionSudo(sessionN, target.number)
    if (!result.ok) return send(`│ ${result.reason}`)
    return send(`⚙️ *+${target.number}* retiré des Session Sudos.\n   Total : ${result.total}`)
  }

  return send(
    '❓ syntaxe :\n' +
    '   • .sessionsudo list\n' +
    '   • .sessionsudo add @user\n' +
    '   • .sessionsudo del @user'
  )
}
