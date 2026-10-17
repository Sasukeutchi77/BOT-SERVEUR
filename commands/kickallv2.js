// commands/kickallv2.js — 𝑴𝑼𝑹𝑨𝑺𝑨𝑲𝑰 𝐒𝐒𝐊 𓂀
// 🔧 FIX: ctx utilisé (senderJid, groupMeta cache, isOwner)
// 🔧 FIX: botId via cleanNumber (gère LID)
// 🔧 FIX: expulsion par lots de 10 (plus stable)
// 🔧 FIX: invalidateGroupCache après expulsion

import { sendMessage }                             from "../lib/sendMessage.js"
import { config }                                  from "../config.js"
import { getSenderJid, isOwner, cleanNumber, matchJid } from '../lib/ownerSystem.js'

export default async function kickallv2(sock, sender, args, msg, ctx = {}) {
  try {

    // ── GROUP ONLY ───────────────────────────────────────────
    if (!sender.endsWith('@g.us')) {
      return await sendMessage(sock, sender,
        "🕷️ Cette commande ne fonctionne que dans les groupes."
      )
    }

    // ── CTX ──────────────────────────────────────────────────
    const userId      = ctx.senderJid || getSenderJid(msg, sock)
    const senderIsOwner = ctx.isMainOwner || isOwner(userId)

    // ── PERMISSION : Owner principal uniquement ──────────────
    if (!senderIsOwner) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 ⛔ 𝐀𝐂𝐂È𝐒 𝐑𝐄𝐅𝐔𝐒É 〕━━━🕸️\n\n` +
        `│ Seul l'*Owner principal*\n` +
        `│ peut utiliser cette commande.\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── BOT ADMIN CHECK ──────────────────────────────────────
    if (!ctx.botAdmin) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 🕷️ 𝐒𝐘𝐒𝐓È𝐌𝐄 𝐍𝐎𝐍 𝐀𝐃𝐌𝐈𝐍𝐈𝐒𝐓𝐑𝐀𝐓𝐄𝐔𝐑 〕━━━🕸️\n\n` +
        `│ Je dois être *administrateur* pour\n` +
        `│ exiler des utilisateurs.\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── CONFIRMATION OBLIGATOIRE ─────────────────────────────
    const confirm = args[0]?.toLowerCase()
    if (confirm !== 'confirm') {
      return await sendMessage(sock, sender,
        `🚨 *KICKALL V2 — CONFIRMATION REQUISE*\n\n` +
        `Cette commande va :\n` +
        `• exiler *TOUS* les utilisateurs\n` +
        `• *administrateurs inclus*\n` +
        `• *SAUF toi* (protégé) ⚙️\n` +
        `• Le Système restera avec toi ⚙️\n\n` +
        `⚠️ *IRRÉVERSIBLE*\n\n` +
        `Pour confirmer :\n` +
        `\`${config.prefix || '.'}kickallv2 confirm\``
      )
    }

    // ── GROUP META ───────────────────────────────────────────
    // ✅ FIX : ctx.groupMeta (cache, zéro appel réseau)
    const groupMetadata = ctx.groupMeta
      || await sock.groupMetadata(sender)

    const participants = groupMetadata.participants
    const groupName    = groupMetadata.subject

    // ✅ FIX : botId via cleanNumber (gère LID)
    const botNum = cleanNumber(sock.user?.id || "")

    // Exclure le bot ET l'owner qui exécute
    const toKick = participants.filter(p => {
      if (cleanNumber(p.id) === botNum)    return false // exclure bot
      if (matchJid(p.id, userId))          return false // exclure owner
      return true
    }).map(p => p.id)

    if (toKick.length === 0) {
      return await sendMessage(sock, sender,
        "👁️ Il n'y a personne d'autre à exiler."
      )
    }

    // ── DÉMARRAGE ────────────────────────────────────────────
    await sendMessage(sock, sender,
      `🚨 *KICKALL V2 DÉMARRÉ*\n\n` +
      `📛 groupe: *${groupName}*\n` +
      `🎯 Cibles: *${toKick.length} personnes*\n` +
      `🛡️ Protégé: *Toi + Système* ⚙️\n\n` +
      `⏳ Expulsion en cours...`
    )

    console.log(`🚨 KICKALL V2 par +${cleanNumber(userId)} | ${toKick.length} cibles | Groupe: ${sender}`)

    // ── EXPULSION PAR LOTS DE 10 ─────────────────────────────
    // ✅ FIX : lots de 10 au lieu de tout en une fois
    // WhatsApp bloque souvent les expulsions massives > 20
    const batchSize = 10
    let success     = 0
    let failed      = 0

    for (let i = 0; i < toKick.length; i += batchSize) {
      const batch = toKick.slice(i, i + batchSize)

      try {
        await sock.groupParticipantsUpdate(sender, batch, "remove")
        success += batch.length
        console.log(`✅ Lot expulsé: ${batch.length} (${i + batch.length}/${toKick.length})`)
      } catch (e) {
        console.error(`❌ Erreur lot ${i}:`, e.message)

        // Fallback : essayer un par un dans ce lot
        for (const user of batch) {
          try {
            await sock.groupParticipantsUpdate(sender, [user], "remove")
            success++
          } catch {
            failed++
          }
          await new Promise(r => setTimeout(r, 300))
        }
      }

      // Pause entre les lots
      if (i + batchSize < toKick.length) {
        await new Promise(r => setTimeout(r, 1500))
      }
    }

    // ✅ FIX : invalider le cache après les expulsions
    if (ctx.invalidateGroupCache) ctx.invalidateGroupCache(sender)

    // ── MESSAGE FINAL ────────────────────────────────────────
    const finalText = success === toKick.length
      ? `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `     🕷️ 🚨 *KICKALL V2 TERMINÉ* 🚨 🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️━━━〔 📊 𝐑É𝐒𝐔𝐋𝐓𝐀𝐓𝐒 〕━━━🕸️\n` +
        `│\n` +
        `│ 💥 exilés : *${success}*\n` +
        `│ 🛡️ Protégés : *Toi + Système*\n` +
        `│\n` +
        `│ 🔥 groupe vidé avec succès !\n` +
        `│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      : `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `     🕷️ ⚠️ *KICKALL V2 PARTIEL* ⚠️ 🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️━━━〔 📊 𝐑É𝐒𝐔𝐋𝐓𝐀𝐓𝐒 〕━━━🕸️\n` +
        `│\n` +
        `│ ⚙️ exilés : *${success}*\n` +
        `│ 🕷️ Échecs   : *${failed}*\n` +
        `│ 🛡️ Protégés : *Toi + Système*\n` +
        `│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`

    await sendMessage(sock, sender, finalText)

    console.log(`✅ KICKALL V2 fini | ✅ ${success} | ❌ ${failed}`)

  } catch (e) {
    console.error("❌ Erreur kickallv2.js:", e)
    await sendMessage(sock, sender, `│ opération échoué: ${e.message}`)
  }
}