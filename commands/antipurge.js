import { sendMessage } from "../lib/sendMessage.js"
import {
  purgeTracker,
  PURGE_THRESHOLD,
  PURGE_WINDOW_MS,
  isAntipurgeActive,
} from "../lib/antipurgeTracker.js"

export default async function antipurge(sock, sender, args, msg) {
  try {
    if (!sender.endsWith('@g.us')) {
      await sendMessage(sock, sender,
        `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 𝐈𝐌𝐏𝐎𝐒𝐒𝐈𝐁𝐋𝐄 〕━━━🕸️\n\n` +
        `│ Ce commande ne fonctionne que dans les *groupes* (groupes).\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
      return
    }

    const action = args[0]?.toLowerCase() || 'status'
    const seuilTxt = `plus de ${PURGE_THRESHOLD - 1} purifications en moins de ${PURGE_WINDOW_MS / 1000} secondes`

    if (action === 'on') {
      purgeTracker.set(`config:${sender}`, { active: true })
      await sendMessage(
        sock,
        sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `    🛡️ *SESSION ANTI-PURGE* 🛡️\n` +
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n\n` +
        `🕸️━━━〔 ⚙️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐕𝐄𝐈𝐋𝐋É 〕━━━🕸️\n` +
        `│\n` +
        `│ 🛡️ Protection : *ACTIVE*\n` +
        `│\n` +
        `│ Si le Système détecte ${seuilTxt},\n` +
        `│ il *révoque tous les administrateurs* et\n` +
        `│ *scelle le groupe* (mode annonce).\n` +
        `│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )

    } else if (action === 'off') {
      purgeTracker.set(`config:${sender}`, { active: false })
      await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `    🛡️ *SESSION ANTI-PURGE* 🛡️\n` +
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n\n` +
        `🕸️━━━〔 🤖 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 𝐁𝐑𝐈𝐒É 〕━━━🕸️\n` +
        `│\n` +
        `│ 🔓 Le session anti-purge est dissous.\n` +
        `│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )

    } else {
      const status = isAntipurgeActive(sender) ? "⚙️ *ÉVEILLÉ*" : "🤖 *ENDORMI*"
      await sendMessage(
        sock,
        sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `    🛡️ *SESSION ANTI-PURGE* 🛡️\n` +
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n\n` +
        `🕸️━━━〔 👁️ É𝐓𝐀𝐓 𝐃𝐔 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 〕━━━🕸️\n` +
        `│\n` +
        `│ 📊 Statut : ${status}\n` +
        `│ ⚙️ Seuil : ${seuilTxt}\n` +
        `│ ⚡ Châtiment : révocation de tous les administrateurs + scellement du groupe.\n` +
        `│\n` +
        `│ *Syntaxes :*\n` +
        `│ • *.antipurge on*   — Éveiller\n` +
        `│ • *.antipurge off*  — Briser\n` +
        `│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

  } catch (e) {
    console.error("🕷️ Erreur antipurge:", e)
    await sendMessage(sock, sender,
      `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
      `│ ${e.message || 'opération échoué inconnue'}\n\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )
  }
}
