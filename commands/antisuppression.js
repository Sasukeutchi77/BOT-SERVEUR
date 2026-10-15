// commands/antisuppression.js — VERSION
// Utilise lib/antiSuppressionManager.js comme source de vérité

import { sendMessage } from "../lib/sendMessage.js"
import {
  isAntiSuppressionEnabled,
  setAntiSuppression
} from "../lib/antiSuppressionManager.js"
import {
  getSenderJid,
  isOwner,
  isSudo,
  isDeployer,
  matchJid,
  cleanNumber
} from "../lib/ownerSystem.js"

//══════════════════════════════════════
// UTIL
//══════════════════════════════════════

async function isGroupAdmin(sock, groupId, userId) {
  try {
    const meta = await sock.groupMetadata(groupId)
    const p = meta.participants.find(x => matchJid(x.id, userId))
    return p?.admin === "admin" || p?.admin === "superadmin"
  } catch {
    return false
  }
}

//══════════════════════════════════════
// COMMANDE
//══════════════════════════════════════

export default async function antisuppression(sock, sender, args, msg, ctx = {}) {
  try {

    if (!sender.endsWith("@g.us")) {
      return sendMessage(sock, sender, "🕷️ Cette commande fonctionne uniquement dans les groupes.")
    }

    const userId = ctx.senderJid || getSenderJid(msg, sock)

    const privileged =
      ctx.isOwner ||
      isOwner(userId) ||
      isSudo(userId) ||
      isDeployer(userId)

    const admin =
      privileged ||
      ctx.isAdmin ||
      await isGroupAdmin(sock, sender, userId)

    if (!admin) {
      return sendMessage(sock, sender,
        `🕸️━━━〔 ⛔ 𝐀𝐂𝐂È𝐒 𝐑𝐄𝐅𝐔𝐒É 〕━━━🕸️\n\n` +
        `│ 🔒 Seuls les *administrateurs* du\n` +
        `│    groupe peuvent utiliser\n` +
        `│    cette commande.\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    const action  = args[0]?.toLowerCase()
    const current = isAntiSuppressionEnabled(sender)

    // ── ACTIVER ──────────────────────────────────────────────
    if (action === "on" || action === "enable" || action === "activer") {
      setAntiSuppression(sender, true)
      return sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `     🕷️ 🗑️ *ANTI-SUPPRESSION* 🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️━━━〔 ⚙️ 𝐀𝐂𝐓𝐈𝐕É 〕━━━🕸️\n` +
        `│\n` +
        `│ 🛡️ Surveillance: *ACTIVE*\n` +
        `│\n` +
        `│ Quand quelqu'un supprime un\n` +
        `│ message, le Système le renvoie\n` +
        `│ automatiquement dans le groupe.\n` +
        `│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── DÉSACTIVER ───────────────────────────────────────────
    if (action === "off" || action === "disable" || action === "desactiver" || action === "désactiver") {
      setAntiSuppression(sender, false)
      return sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `     🕷️ 🗑️ *ANTI-SUPPRESSION* 🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️━━━〔 🕷️ 𝐃É𝐒𝐀𝐂𝐓𝐈𝐕É 〕━━━🕸️\n` +
        `│\n` +
        `│ Les messages supprimés ne\n` +
        `│ seront plus renvoyés.\n` +
        `│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── STATUT ───────────────────────────────────────────────
    return sendMessage(sock, sender,
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `     🕷️ 🗑️ *ANTI-SUPPRESSION* 🕷️\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️━━━〔 👁️ 𝐒𝐓𝐀𝐓𝐔𝐓 〕━━━🕸️\n` +
      `│\n` +
      `│ 📊 Statut: ${current ? "⚙️ *Activé*" : "🕷️ *Désactivé*"}\n` +
      `│\n` +
      `│ 💡 *commandes:*\n` +
      `│ • *.antisuppression on*\n` +
      `│ • *.antisuppression off*\n` +
      `│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )

  } catch (err) {
    console.error("AntiSuppression Error:", err)
    await sendMessage(sock, sender, "🕷️ opération échoué interne.")
  }
}
