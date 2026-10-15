//🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️//
//        ADDSUDO — J.A.R.V.I.S.            //
//   🔧 FIX : ctx utilisé               //
//   🔧 FIX : addSudo résultat vérifié  //
//   🔧 FIX : isDeployer via ctx        //
//🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️//

import { sendMessage }    from "../lib/sendMessage.js"
import { resolveTarget }  from "../lib/targetResolver.js"
import { config }         from "../config.js"

import {
  addSudo,
  getSenderJid,
  getSudoList,
  isDeployer,
  isSudo,
  cleanNumber
} from "../lib/ownerSystem.js"


export default async function addsudo(sock, sender, args, msg, ctx = {}) {
  try {

    // ✅ FIX  : utiliser ctx.senderJid (déjà résolu par index.js)
    // Fallback sur getSenderJid si ctx absent
    const senderId = ctx.senderJid || getSenderJid(msg, sock)

    // ── OWNER CHECK ─────────────────────────────────────────
    // ✅ FIX : utiliser ctx.isMainOwner (déjà calculé)
    const senderIsOwner = ctx.isMainOwner || isDeployer(senderId)

    if (!senderIsOwner) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 ⛔ 𝐀𝐂𝐂È𝐒 𝐑𝐄𝐅𝐔𝐒É 〕━━━🕸️\n\n` +
        `│ 🔒 commande réservée au *PROPRIÉTAIRE*\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── TARGET ───────────────────────────────────────────────
    const { targetId, targetNumber } = resolveTarget(msg, args)

    if (!targetId) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 🕷️ 𝐒𝐘𝐍𝐓𝐀𝐗𝐄 〕━━━🕸️\n\n` +
        `│ *.addsudo @user*\n` +
        `│ *.addsudo 226XXXXXXXX*\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── SECURITY CHECK ───────────────────────────────────────
    if (isDeployer(targetId)) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 ⚠️ 𝐈𝐍𝐅𝐎 𝐒𝐘𝐒𝐓È𝐌𝐄 〕━━━🕸️\n\n` +
        `│ Cet utilisateur est déjà *PROPRIÉTAIRE*.\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    if (isSudo(targetId)) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 ⚠️ 𝐈𝐍𝐅𝐎 𝐒𝐘𝐒𝐓È𝐌𝐄 〕━━━🕸️\n\n` +
        `│ Cet utilisateur est déjà *SUDO*.\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── ADD SUDO ─────────────────────────────────────────────
    // ✅ FIX v3 : vérifier le résultat de addSudo
    const result = addSudo(targetId)

    if (!result.success) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
        `│ ${result.error || "Impossible d'ajouter ce sudo."}\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    const sudoList = getSudoList()
    const num      = targetNumber || cleanNumber(targetId)

    // ── CONFIRMATION ─────────────────────────────────────────
    await sock.sendMessage(sender, {
      text:
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `      ⭐ *OPÉRATEUR LIÉ* ⭐\n` +
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n\n` +
        `│ 👤 Opérateur : @${num}\n` +
        `│ 📊 Total SUDO : ${sudoList.count.total}\n` +
        `│ 🤖 Système : ${config.botName}\n` +
        `│ ⏰ ${new Date().toLocaleString("fr-FR")}\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`,
      mentions: [targetId]
    })

    // ── NOTIFIER L'UTILISATEUR ───────────────────────────────
    try {
      await sock.sendMessage(targetId, {
        text:
          `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
          `   ⭐ *SESSION ÉTABLIE* ⭐\n` +
          `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n\n` +
          `│ Ton compte est lié au *SYSTÈME*\n\n` +
          `│ Propriétaire : *${config.botName}*\n\n` +
          `│ Pouvoirs accordés :\n` +
          `│ • commandes administrateur\n` +
          `│ • Modération\n` +
          `│ • Mode privé\n\n` +
          `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      })
    } catch {}

    console.log(`⭐ addsudo → +${num} | par +${cleanNumber(senderId)}`)

  } catch (err) {
    console.error("❌ addsudo:", err)
    await sendMessage(sock, sender, "🕷️ opération échoué addsudo — Le opération a échoué")
  }
}
