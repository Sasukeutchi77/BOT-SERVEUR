// commands/demote.js — 𝑴𝑼𝑹𝑨𝑺𝑨𝑲𝑰 𝐒𝐒𝐊 𓂀
// 🔧 FIX v1: isBotAdmin utilise matchJid pour gérer les LID
// 🔧 FIX v1: targetMember.find utilise matchJid aussi

import { sendMessage }                                   from '../lib/sendMessage.js'
import { showActionLoader, deleteLoader, formatTime }    from '../lib/animLoader.js'
import { resolveTarget }                                 from '../lib/targetResolver.js'
import { cleanNumber, matchJid }                         from '../lib/ownerSystem.js'

function isAdminFlag(a) {
  return a === 'admin' || a === 'superadmin'
}

// ✅ FIX v9.6 : vérifie si le bot est admin en gérant LID + numéro
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

export default async function demote(sock, sender, args, msg, ctx = {}) {

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
    // ✅ FIX : recheck toujours avec la fonction corrigée
    //          pour éviter les faux négatifs dus aux LID
    const botIsAdmin = (botAdmin === true) ? true : await checkBotAdmin(sock, sender)

    if (!botIsAdmin) {
      return await sendMessage(sock, sender,
        "🕷️ Je dois être administrateur pour rétrograder un utilisateur."
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
        "🕷️ syntaxe:\n.demote @administrateur\n.demote 226xxxxxxxx"
      )
    }

    // ✅ FIX v9.6 : matchJid pour trouver le membre même si LID
    const targetMember = participants.find(p => matchJid(p.id, targetId))

    if (!targetMember) {
      return await sendMessage(sock, sender,
        "🕷️ utilisateur non trouvé dans le groupe."
      )
    }

    // ────────── CREATOR PROTECTION ──────────────────────────
    if (targetMember.admin === 'superadmin') {
      return await sendMessage(sock, sender,
        `⚠️ Impossible : @${targetMember.id.split('@')[0]} est le créateur du groupe.`,
        { mentions: [targetMember.id] }
      )
    }

    // ────────── NOT ADMIN ────────────────────────────────────
    if (!isAdminFlag(targetMember.admin)) {
      return await sendMessage(sock, sender,
        `👁️ @${targetMember.id.split('@')[0]} n'est pas administrateur.`,
        { mentions: [targetMember.id] }
      )
    }

    // ────────── DEMOTE ──────────────────────────────────────
    loaderKey = await showActionLoader(sock, sender, "RÉTROGRADATION", "⬇️")

    await sock.groupParticipantsUpdate(sender, [targetMember.id], "demote")

    await deleteLoader(sock, sender, loaderKey)
    loaderKey = null

    return await sendMessage(sock, sender,
      `⬇️ RÉTROGRADATION\n\n👤 @${targetMember.id.split('@')[0]}\n📉 Nouveau rôle : UTILISATEUR\n🕐 ${formatTime()}`,
      { mentions: [targetMember.id] }
    )

  } catch (err) {
    if (loaderKey) await deleteLoader(sock, sender, loaderKey)
    console.error("demote error:", err)
    return await sendMessage(sock, sender, "🕷️ opération échoué lors de la rétrogradation.")
  }
}