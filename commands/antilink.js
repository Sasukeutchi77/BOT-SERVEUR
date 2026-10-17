// commands/antilink.js — 𝑴𝑼𝑹𝑨𝑺𝑨𝑲𝑰 𝐒𝐒𝐊 𓂀
// Utilise lib/antiLinkManager.js comme source de vérité (sync avec messageHandler)

import { sendMessage }   from '../lib/sendMessage.js'
import { getSenderJid, isDeployer, isSudo, matchJid, cleanNumber } from '../lib/ownerSystem.js'
import {
  isAntiLinkEnabled,
  enableAntiLink,
  disableAntiLink,
  getStats
} from '../lib/antiLinkManager.js'
import fs   from 'fs'
import path from 'path'

//🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️//
// STOCKAGE WARNS PERSISTANT
//🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️//

const WARNS_FILE = path.join(process.cwd(), 'data', 'antilink_warns.json')
const OPTS_FILE  = path.join(process.cwd(), 'data', 'antilink_opts.json')

function loadJson(file) {
  try { if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8')) } catch {}
  return {}
}

function saveJson(file, data) {
  try {
    const dir = path.dirname(file)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(file, JSON.stringify(data, null, 2))
  } catch (e) { console.error('🕷️ antilink saveJson:', e.message) }
}

const _warns = loadJson(WARNS_FILE)
const _opts  = loadJson(OPTS_FILE)

function getOpts(groupId) {
  return _opts[groupId] || { maxWarns: 3, strict: false, whitelist: [] }
}

function saveOpts(groupId, opts) {
  _opts[groupId] = { ...(getOpts(groupId)), ...opts }
  saveJson(OPTS_FILE, _opts)
}

function getWarns(groupId, userId) {
  return _warns[groupId]?.[userId] || 0
}

function addWarn(groupId, userId) {
  if (!_warns[groupId]) _warns[groupId] = {}
  _warns[groupId][userId] = (_warns[groupId][userId] || 0) + 1
  saveJson(WARNS_FILE, _warns)
  return _warns[groupId][userId]
}

function resetWarns(groupId, userId) {
  if (_warns[groupId]) delete _warns[groupId][userId]
  saveJson(WARNS_FILE, _warns)
}

//🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️//
// UTILITAIRES
//🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️//

async function checkIsGroupAdmin(sock, groupId, userId) {
  try {
    const meta   = await sock.groupMetadata(groupId)
    const admins = meta.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin')
    return admins.some(p => matchJid(p.id, userId))
  } catch { return false }
}

//🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️//
// COMMANDE PRINCIPALE
//🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️//

export default async function antilink(sock, sender, args, msg, ctx = {}) {
  try {

    if (!sender.endsWith('@g.us')) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 𝐈𝐌𝐏𝐎𝐒𝐒𝐈𝐁𝐋𝐄 〕━━━🕸️\n\n` +
        `│ Ce commande ne fonctionne\n` +
        `│ que dans les *groupes* (groupes).\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    const userId  = ctx.senderJid || getSenderJid(msg, sock)
    const isOwner = ctx.isOwner   || isDeployer(userId) || isSudo(userId)
    const isAdmin = ctx.isAdmin   || await checkIsGroupAdmin(sock, sender, userId)

    if (!isOwner && !isAdmin) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 ⛔ 𝐀𝐂𝐂È𝐒 𝐑𝐄𝐅𝐔𝐒É 〕━━━🕸️\n\n` +
        `│ 🔒 Seuls les *administrateurs* (administrateurs)\n` +
        `│    du groupe peuvent utiliser\n` +
        `│    ce commande.\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    const action   = args[0]?.toLowerCase()
    const isActive = isAntiLinkEnabled(sender)
    const opts     = getOpts(sender)
    const stats    = getStats(sender)

    // ── STATUT ───────────────────────────────────────────────
    if (!action || action === 'status' || action === 'statut') {
      const txt = isActive ? '⚙️ *ÉVEILLÉ*' : '🤖 *ENDORMI*'
      const wl  = opts.whitelist?.length > 0 ? opts.whitelist.join(', ') : 'aucune'
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `     🔗 *SESSION ANTI-LIEN* 🔗\n` +
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n\n` +
        `🕸️━━━〔 👁️ É𝐓𝐀𝐓 𝐃𝐔 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 〕━━━🕸️\n` +
        `│\n` +
        `│ 📊 Statut : ${txt}\n` +
        `│ ⚠️ Avert. avant exil : *${opts.maxWarns}*\n` +
        `│ 💥 Mode strict : ${opts.strict ? '⚙️ OUI' : '🕷️ NON'}\n` +
        `│ 🌐 Domaines bénis : ${wl}\n` +
        `│ 🗑️ Liens purifiés : *${stats.deleted || 0}*\n` +
        `│\n` +
        `│ *Syntaxes disponibles :*\n` +
        `│ • *.antilink on/off*\n` +
        `│ • *.antilink strict*\n` +
        `│ • *.antilink warns <1-10>*\n` +
        `│ • *.antilink allow <domaine>*\n` +
        `│ • *.antilink clearwarns*\n` +
        `│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── ACTIVER ──────────────────────────────────────────────
    if (action === 'on' || action === 'activer') {
      enableAntiLink(sender, { deleteMessage: true, warnUser: true, allowAdmin: true })
      saveOpts(sender, { ...opts })
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `     🔗 *SESSION ANTI-LIEN* 🔗\n` +
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n\n` +
        `🕸️━━━〔 ⚙️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐕𝐄𝐈𝐋𝐋É 〕━━━🕸️\n` +
        `│\n` +
        `│ 🛡️ Protection : *ACTIVE*\n` +
        `│\n` +
        `│ *Runes gravées :*\n` +
        `│ • Purification auto : ⚙️\n` +
        `│ • Avertissement : ⚙️\n` +
        `│ • Administrateurs exemptés : ⚙️\n` +
        `│ • Avert. avant exil : *${opts.maxWarns}*\n` +
        `│\n` +
        `│ 💡 *.antilink strict* → exil direct\n` +
        `│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── DÉSACTIVER ───────────────────────────────────────────
    if (action === 'off' || action === 'desactiver' || action === 'désactiver') {
      disableAntiLink(sender)
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `     🔗 *SESSION ANTI-LIEN* 🔗\n` +
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n\n` +
        `🕸️━━━〔 🤖 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 𝐁𝐑𝐈𝐒É 〕━━━🕸️\n` +
        `│\n` +
        `│ 🔓 Les liens sont désormais tolérés.\n` +
        `│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── MODE STRICT ──────────────────────────────────────────
    if (action === 'strict') {
      const newStrict = !opts.strict
      saveOpts(sender, { strict: newStrict })
      return await sendMessage(sock, sender,
        `│ *Mode strict : ${newStrict ? '⚙️ ÉVEILLÉ' : '🤖 BRISÉ'}*\n\n` +
        (newStrict
          ? `│ Les utilisateurs envoyant un lien seront\n*exilées immédiatement* sans avertissement.`
          : `│ Le système d'avertissements reprend son emprise.`)
      )
    }

    // ── NOMBRE DE WARNS ──────────────────────────────────────
    if (action === 'warns' || action === 'maxwarns') {
      const n = parseInt(args[1])
      if (!n || n < 1 || n > 10) {
        return await sendMessage(sock, sender,
          `│ *Syntaxe :* \`.antilink warns <1-10>\``
        )
      }
      saveOpts(sender, { maxWarns: n })
      return await sendMessage(sock, sender,
        `│ *Avertissements avant exil : ${n}*`
      )
    }

    // ── WHITELIST ────────────────────────────────────────────
    if (action === 'allow' || action === 'whitelist') {
      const domain = args[1]?.toLowerCase()
      if (!domain) {
        return await sendMessage(sock, sender,
          `│ *Syntaxe :* \`.antilink allow <domaine>\`\n*Ex :* \`.antilink allow youtube.com\``
        )
      }
      const wl = opts.whitelist || []
      if (wl.includes(domain)) {
        saveOpts(sender, { whitelist: wl.filter(d => d !== domain) })
        return await sendMessage(sock, sender, `│ *${domain}* retiré des domaines bénis.`)
      }
      wl.push(domain)
      saveOpts(sender, { whitelist: wl })
      return await sendMessage(sock, sender,
        `│ *${domain}* béni et protégé.\n│ Domaines bénis : ${wl.join(', ')}`
      )
    }

    // ── CLEAR WARNS ──────────────────────────────────────────
    if (action === 'clearwarns' || action === 'resetwarns') {
      if (_warns[sender]) delete _warns[sender]
      saveJson(WARNS_FILE, _warns)
      return await sendMessage(sock, sender,
        `│ *Tous les avertissements du groupe ont été purifiés.*`
      )
    }

    // ── INCONNU ──────────────────────────────────────────────
    return await sendMessage(sock, sender,
      `🕸️━━━〔 🕷️ 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐄𝐒 𝐃𝐈𝐒𝐏𝐎𝐍𝐈𝐁𝐋𝐄𝐒 〕━━━🕸️\n\n` +
      `│ • *.antilink on/off*\n` +
      `│ • *.antilink statut*\n` +
      `│ • *.antilink strict*\n` +
      `│ • *.antilink warns <n>*\n` +
      `│ • *.antilink allow <domaine>*\n` +
      `│ • *.antilink clearwarns*\n\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )

  } catch (e) {
    console.error('🕷️ Erreur antilink:', e)
    await sendMessage(sock, sender,
      `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
      `│ ${e.message || 'opération échoué inconnue'}\n\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )
  }
}

//🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️//
// HANDLER ANTI-LIEN — appelé dans messageHandler.js
// Utilise lib/antiLinkManager.js + opts/warns locaux
//🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️//

export async function handleAntiLink(sock, groupId, senderId, text, msg, cachedMeta = null) {
  try {
    if (!isAntiLinkEnabled(groupId)) return false

    const opts = getOpts(groupId)

    // Vérifier si admin (exemption)
    if (true /* allowAdmin est toujours activé */) {
      try {
        const meta   = cachedMeta || await sock.groupMetadata(groupId)
        const admins = meta.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin')
        const isAdmin = admins.some(p => matchJid(p.id, senderId))
        if (isAdmin) return false
      } catch {}
    }

    // Vérifier whitelist
    if (opts.whitelist?.length > 0 && text) {
      const allWhitelisted = opts.whitelist.every(domain =>
        text.toLowerCase().includes(domain.toLowerCase())
      )
      if (allWhitelisted) return false
    }

    // Supprimer le message
    try { await sock.sendMessage(groupId, { delete: msg.key }) } catch {}

    const phoneNum = cleanNumber(senderId)

    if (opts.strict) {
      try {
        await sock.groupParticipantsUpdate(groupId, [senderId], 'remove')
        await sendMessage(sock, groupId,
          `│ @${phoneNum} a été *exilé* pour avoir rompu le session.\n_🕷️ (Mode strict activé)_`,
          { mentions: [senderId] }
        )
      } catch {
        await sendMessage(sock, groupId,
          `│ @${phoneNum} — *Lien purifié* (Mode strict)\n_🕷️ (Accordez les droits d'administrateur au Système pour exiler)_`,
          { mentions: [senderId] }
        )
      }
    } else {
      const warns     = addWarn(groupId, senderId)
      const maxWarns  = opts.maxWarns || 3
      const remaining = maxWarns - warns

      if (warns >= maxWarns) {
        resetWarns(groupId, senderId)
        try {
          await sock.groupParticipantsUpdate(groupId, [senderId], 'remove')
          await sendMessage(sock, groupId,
            `│ @${phoneNum} a été *exilé* après ${maxWarns} avertissements.\n│ _Le session est rompu._`,
            { mentions: [senderId] }
          )
        } catch {
          await sendMessage(sock, groupId,
            `│ @${phoneNum} — Limite d'avertissements atteinte (${maxWarns}).\n_🕷️ (Accordez les droits d'administrateur au Système pour exiler)_`,
            { mentions: [senderId] }
          )
        }
      } else {
        await sendMessage(sock, groupId,
          `⚠️ @${phoneNum} — *Lien purifié !*\n\n` +
          `⚙️ Avertissement : *${warns}/${maxWarns}*\n` +
          `${remaining > 0 ? `│ Encore ${remaining} avert. avant l'exil` : '🕷️ Prochain lien = exil définitif !'}`,
          { mentions: [senderId] }
        )
      }
    }

    return true
  } catch (e) {
    console.error('🕷️ handleAntiLink:', e)
    return false
  }
}
