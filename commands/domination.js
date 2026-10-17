// commands/domination.js — 𝑴𝑼𝑹𝑨𝑺𝑨𝑲𝑰 𝐒𝐒𝐊 𓂀
// 🔧 FIX: ctx utilisé (senderJid, groupMeta cache, isOwner)
// 🔧 FIX: matchJid pour comparaisons LID
// 🔧 FIX: expulsion par lots (anti rate-limit)
// 🔧 FIX: invalidateGroupCache après opération

import { sendMessage }                             from "../lib/sendMessage.js"
import { config }                                  from "../config.js"
import { getSenderJid, isOwner, cleanNumber, matchJid } from '../lib/ownerSystem.js'

export default async function domination(sock, sender, args, msg, ctx = {}) {
  try {

    // ── GROUP ONLY ───────────────────────────────────────────
    if (!sender.endsWith('@g.us')) {
      return await sendMessage(sock, sender,
        "🕷️ Cette commande ne fonctionne que dans les groupes."
      )
    }

    // ── CTX ──────────────────────────────────────────────────
    const userId        = ctx.senderJid   || getSenderJid(msg, sock)
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

    // ── DOUBLE CONFIRMATION ──────────────────────────────────
    const confirm = args[0]?.toLowerCase()
    const code    = args[1]?.toLowerCase()

    if (confirm !== 'confirm' || code !== 'destroy') {
      return await sendMessage(sock, sender,
        `🤖 *DOMINATION — CONFIRMATION ULTRA REQUISE*\n\n` +
        `Cette commande va :\n` +
        `• exiler *TOUS les administrateurs*\n` +
        `• *Créateur du groupe INCLUS*\n` +
        `• *SAUF toi* (protégé) ⚙️\n` +
        `• Le Système deviendra seul propriétaire avec toi\n` +
        `• *IRRÉVERSIBLE ET INSTANTANÉ*\n\n` +
        `Pour confirmer l'apocalypse :\n` +
        `\`${config.prefix || '.'}domination confirm destroy\``
      )
    }

    // ── GROUP META ───────────────────────────────────────────
    // ✅ FIX : ctx.groupMeta (cache, zéro appel réseau)
    const groupMetadata = ctx.groupMeta
      || await sock.groupMetadata(sender)

    const participants = groupMetadata.participants
    const groupName    = groupMetadata.subject
    const botNum       = cleanNumber(sock.user?.id || "")

    // ── IDENTIFIER LES ADMINS À EXPULSER ─────────────────────
    const creator = participants.find(p => p.admin === 'superadmin')

    // ✅ FIX : matchJid pour exclure bot et owner (gère LID)
    const toDestroy = participants
      .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
      .filter(p => {
        if (cleanNumber(p.id) === botNum) return false // exclure bot
        if (matchJid(p.id, userId))       return false // exclure owner
        return true
      })
      .map(p => p.id)

    if (toDestroy.length === 0) {
      return await sendMessage(sock, sender,
        "👁️ Il n'y a aucun autre administrateur à exiler."
      )
    }

    // ── DÉMARRAGE ────────────────────────────────────────────
    await sendMessage(sock, sender,
      `🤖 *DOMINATION EN COURS*\n\n` +
      `📛 groupe: *${groupName}*\n` +
      `🎯 Cibles: *${toDestroy.length} administrateurs*\n` +
      `👑 Créateur: *${creator ? 'INCLUS' : 'Non trouvé'}*\n` +
      `🛡️ Protégé: *Toi + Système* ⚙️\n\n` +
      `🔥 L'apocalypse commence...`
    )

    console.log(`🤖 DOMINATION par +${cleanNumber(userId)} | ${toDestroy.length} admins | Groupe: ${sender}`)

    // ── ÉTAPE 1 : Démote le créateur d'abord ─────────────────
    if (creator?.id && toDestroy.includes(creator.id)) {
      try {
        await sock.groupParticipantsUpdate(sender, [creator.id], "demote")
        console.log(`👑 Créateur démoté: ${creator.id}`)
        await new Promise(r => setTimeout(r, 800))
      } catch (e) {
        console.error(`❌ Échec démote créateur:`, e.message)
      }
    }

    // ── ÉTAPE 2 : Expulsion par lots ─────────────────────────
    // ✅ FIX : lots de 5 au lieu de tout en une fois
    const batchSize = 5
    let   success   = 0
    let   failed    = 0

    for (let i = 0; i < toDestroy.length; i += batchSize) {
      const batch = toDestroy.slice(i, i + batchSize)

      try {
        await sock.groupParticipantsUpdate(sender, batch, "remove")
        success += batch.length
        console.log(`✅ Lot expulsé: ${batch.length} (${i + batch.length}/${toDestroy.length})`)
      } catch (e) {
        console.error(`❌ Erreur lot ${i}:`, e.message)

        // Fallback : démote + expulsion un par un
        for (const adminId of batch) {
          try {
            await sock.groupParticipantsUpdate(sender, [adminId], "demote").catch(() => {})
            await new Promise(r => setTimeout(r, 300))
            await sock.groupParticipantsUpdate(sender, [adminId], "remove")
            success++
          } catch (err) {
            failed++
            console.error(`❌ Échec ${adminId}:`, err.message)
          }
          await new Promise(r => setTimeout(r, 300))
        }
      }

      // Pause entre les lots
      if (i + batchSize < toDestroy.length) {
        await new Promise(r => setTimeout(r, 1500))
      }
    }

    // ✅ FIX : invalider le cache après opération
    if (ctx.invalidateGroupCache) ctx.invalidateGroupCache(sender)

    // ── MESSAGE FINAL ────────────────────────────────────────
    const finalText = success === toDestroy.length
      ? `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `     🕷️ 🤖 *DOMINATION COMPLÈTE* 🤖 🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️━━━〔 📊 𝐑É𝐒𝐔𝐋𝐓𝐀𝐓𝐒 〕━━━🕸️\n` +
        `│\n` +
        `│ 🔥 Détruits : *${success}* administrateurs\n` +
        `│ 👑 Créateur : *INCLUS*\n` +
        `│ ⚡ Toi + Système régnez seuls\n` +
        `│\n` +
        `│ *La domination est totale.* 🤖\n` +
        `│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      : `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `     🕷️ ⚠️ *DOMINATION PARTIELLE* ⚠️ 🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️━━━〔 📊 𝐑É𝐒𝐔𝐋𝐓𝐀𝐓𝐒 〕━━━🕸️\n` +
        `│\n` +
        `│ ⚙️ Détruits  : *${success}*\n` +
        `│ 🕷️ Survivants: *${failed}*\n` +
        `│\n` +
        `│ Toi et le Système dominez...\n` +
        `│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`

    await sendMessage(sock, sender, finalText)

    // Message de proclamation
    try {
      await sock.sendMessage(sender, {
        text:
          `🤖 *DOMINATION*\n\n` +
          `Ce groupe est maintenant sous le contrôle exclusif de ` +
          `*${config.botName}* et son Owner.\n\n` +
          `Tous les administrateurs (créateur inclus) ont été exilés.\n\n` +
          `👑 Nouveau régime instauré.`
      })
    } catch {}

    console.log(`🤖 Domination terminée | ✅ ${success} | ❌ ${failed}`)

  } catch (e) {
    console.error("❌ Erreur domination.js:", e)
    await sendMessage(sock, sender, `│ opération échoué: ${e.message}`)
  }
}