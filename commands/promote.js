// commands/promote.js — 𝑴𝑼𝑹𝑨𝑺𝑨𝑲𝑰 𝐒𝐒𝐊 𓂀
// 🔧 FIX: isBotAdmin utilise matchJid pour gérer les LID
// 🔧 FIX: targetMember.find utilise matchJid aussi

import { sendMessage }                        from '../lib/sendMessage.js'
import { showActionLoader, deleteLoader, formatTime } from '../lib/animLoader.js'
import { resolveTarget }                      from '../lib/targetResolver.js'
import { cleanNumber, matchJid }              from '../lib/ownerSystem.js'

function isAdminFlag(a) {
  return a === 'admin' || a === 'superadmin'
}

// ✅ FIX : vérifie si le bot est admin en gérant LID + numéro
async function checkBotAdmin(sock, groupId) {
  try {
    const meta   = await sock.groupMetadata(groupId)
    const botId  = sock.user?.id || ""
    const botNum = cleanNumber(botId)
    const botLid = cleanNumber(sock.user?.lid || "")

    const botP = meta.participants.find(p => {
      const pNum = cleanNumber(p.id)
      if (botNum && pNum === botNum) return true
      if (botLid && pNum === botLid) return true
      return matchJid(p.id, botId)
    })

    return isAdminFlag(botP?.admin)
  } catch {
    return false
  }
}

export default async function promote(sock, sender, args, msg, ctx = {}) {

  let loaderKey = null

  try {

    // ────────── GROUP ONLY ──────────────────────────────────
    if (!sender.endsWith('@g.us')) {
      return await sendMessage(sock, sender,
        "🕷️ Cette commande fonctionne seulement dans les groupes."
      )
    }

    // ────────── CTX ─────────────────────────────────────────
    const { isOwner, isAdmin, botAdmin } = ctx

    // ────────── BOT ADMIN CHECK ─────────────────────────────
    // ✅ FIX : on recheck toujours avec la fonction corrigée
    //          pour éviter les faux négatifs dus aux LID
    const botIsAdmin = (botAdmin === true) ? true : await checkBotAdmin(sock, sender)

    if (!botIsAdmin) {
      return await sendMessage(sock, sender,
        "🕷️ Je dois être administrateur pour promouvoir un utilisateur."
      )
    }

    // ────────── USER PERMISSION ─────────────────────────────
    if (!isOwner && !isAdmin) {
      return await sendMessage(sock, sender,
        "⛔ Vous devez être administrateur ou Propriétaire pour utiliser cette commande."
      )
    }

    // ────────── GROUP DATA ───────────────────────────────────
    const groupMeta    = await sock.groupMetadata(sender)
    const participants = groupMeta.participants || []

    // ────────── TARGET ───────────────────────────────────────
    const { targetId } = resolveTarget(msg, args)

    if (!targetId) {
      return await sendMessage(sock, sender,
        "🕷️ syntaxe:\n.promote @user\n.promote 226xxxxxxxx"
      )
    }

    // ✅ FIX : matchJid pour trouver le membre même si son ID est un LID
    const targetMember = participants.find(p => matchJid(p.id, targetId))

    if (!targetMember) {
      return await sendMessage(sock, sender,
        "🕷️ utilisateur non trouvé dans le groupe."
      )
    }

    // ────────── ALREADY ADMIN ───────────────────────────────
    if (isAdminFlag(targetMember.admin)) {
      return await sendMessage(sock, sender,
        `👁️ @${targetMember.id.split('@')[0]} est déjà administrateur.`,
        { mentions: [targetMember.id] }
      )
    }

    // ────────── PROMOTE ─────────────────────────────────────
    loaderKey = await showActionLoader(sock, sender, "PROMOTION", "⬆️")
    await sock.groupParticipantsUpdate(sender, [targetMember.id], "promote")
    await deleteLoader(sock, sender, loaderKey)
    loaderKey = null

    return await sendMessage(sock, sender,
      `⬆️ PROMOTION\n\n👤 @${targetMember.id.split('@')[0]}\n🏅 Nouveau rôle : ADMINISTRATEUR\n🕐 ${formatTime()}`,
      { mentions: [targetMember.id] }
    )

  } catch (err) {
    if (loaderKey) await deleteLoader(sock, sender, loaderKey)
    console.error("promote error:", err)
    return await sendMessage(sock, sender, "🕷️ opération échoué lors de la promotion.")
  }
}