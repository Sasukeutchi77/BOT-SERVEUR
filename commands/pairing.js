// 🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️
// ║   .pairing — Lier un utilisateur WhatsApp via code       ║
// ║   Usage: .pairing +226XXXXXXXX                    ║
// ║   Accès : OWNER UNIQUEMENT                        ║
// 🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️

import {
  createBotInstance,
  getBotInstance,
  isOnCooldown,
  getCooldownRemaining,
  sessionExists,
} from '../lib/sessionManager.js'
import { isOwner } from '../lib/ownerSystem.js'

export default async function pairing(sock, sender, args, msg, ctx) {
  const { senderJid } = ctx
  const senderNumber = senderJid.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '')
  const prefix = process.env.PREFIX || '.'

  const send = (text) => sock.sendMessage(sender, { text })

  // ── Vérification accès : OWNER UNIQUEMENT ────────────
  if (!isOwner(senderJid)) {
    return send(
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `   🕷️ *J.A.R.V.I.S. — PAIRING* 🕷️\n` +
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n\n` +
      `🕸️━━━〔 ⛔ 𝐀𝐂𝐂È𝐒 𝐑𝐄𝐅𝐔𝐒É 〕━━━🕸️\n` +
      `│\n` +
      `│ 🔒 commande réservée au *Propriétaire* (Owner).\n\n` +
      `│ Seul le propriétaire du Système peut\n` +
      `│ lier un utilisateur via ce opération.\n` +
      `│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )
  }

  // ── Vérifier le numéro fourni ─────────────────────────
  const rawNumber = args[0]
  if (!rawNumber) {
    return send(
      `🕸️━━━〔 🕷️ 𝐒𝐘𝐍𝐓𝐀𝐗𝐄 〕━━━🕸️\n\n` +
      `│ *Commande :* .pairing +226XXXXXXXX\n\n` +
      `│ *Exemple :* .pairing +22670123456\n\n` +
      `│ Fournissez le numéro avec l'indicatif du pays.\n\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )
  }

  const sanitized = rawNumber.replace(/[^0-9]/g, '')
  if (sanitized.length < 7 || sanitized.length > 15) {
    return send(
      `🕸️━━━〔 🕷️ 𝐔𝐓𝐈𝐋𝐈𝐒𝐀𝐓𝐄𝐔𝐑 𝐈𝐍𝐕𝐀𝐋𝐈𝐃𝐄 〕━━━🕸️\n\n` +
      `│ Numéro invalide. Exemple : .pairing +22670000000\n\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )
  }

  // ── Vérifier le cooldown ──────────────────────────────
  if (isOnCooldown(senderNumber)) {
    const remaining = getCooldownRemaining(senderNumber)
    return send(
      `🕸️━━━〔 ⏳ 𝐒𝐄𝐒𝐒𝐈𝐎𝐍 𝐄𝐍 𝐂𝐎𝐔𝐑𝐒 〕━━━🕸️\n\n` +
      `│ Patientez *${remaining} secondes* avant de réinvoquer.\n` +
      `│ Bouclier anti-spam actif.\n\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )
  }

  // ── Vérifier session existante ────────────────────────
  if (getBotInstance(sanitized)?.status === 'connected') {
    return send(
      `🕸️━━━〔 👁️ 𝐔𝐓𝐈𝐋𝐈𝐒𝐀𝐓𝐄𝐔𝐑 𝐃É𝐉À 𝐋𝐈É𝐄 〕━━━🕸️\n\n` +
      `│ Le numéro *+${sanitized}* possède déjà un session actif.\n` +
      `│ Utilisez *${prefix}mypair* pour voir les détails.\n\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )
  }

  await send(
    `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
    `   🕷️ *J.A.R.V.I.S. — PAIRING* 🕷️\n` +
    `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n\n` +
    `│ ⏳ _Gravure du sceau pour_\n` +
    `│ *+${sanitized}*...\n\n` +
    `│ _Patientez, le opération s'accomplit..._`
  )

  try {
    await createBotInstance(sanitized, async (code) => {
      const formatted = code?.match(/.{1,4}/g)?.join('-') || code
      await sock.sendMessage(sender, {
        text:
          `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
          `   🕷️ *J.A.R.V.I.S. — PAIRING* 🕷️\n` +
          `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n\n` +
          `🕸️━━━〔 ⚙️ 𝐒𝐂𝐄𝐀𝐔 𝐆𝐑𝐀𝐕É 〕━━━🕸️\n` +
          `│\n` +
          `│ 📞 Utilisateur : *+${sanitized}*\n` +
          `│\n` +
          `│ 🔑 *Code du session :*\n\n` +
          `        *${formatted}*\n\n` +
          `🕸️━━━〔 📜 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 𝐃'𝐄𝐍𝐓𝐑É𝐄 〕━━━🕸️\n` +
          `│\n` +
          `│ 1️⃣  Ouvrez WhatsApp sur votre téléphone\n` +
          `│ 2️⃣  Paramètres › Appareils liés\n` +
          `│ 3️⃣  Appuyez "Lier un appareil"\n` +
          `│ 4️⃣  Choisissez "Lier avec numéro de téléphone"\n` +
          `│ 5️⃣  Entrez le code ci-dessus\n` +
          `│\n` +
          `│ ⏱️  Ce sceau expire dans ~60 secondes\n` +
          `│ 🕷️  Le Système se lie automatiquement après validation.\n` +
          `│\n` +
          `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      })
    })
  } catch (err) {
    await send(
      `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
      `│ ${err.message}\n\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )
  }
}
