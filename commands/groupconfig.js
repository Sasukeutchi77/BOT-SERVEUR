// commands/groupconfig.js — J.A.R.V.I.S.
// ✅ Configuration complète du groupe avec design amélioré

import { sendMessage } from '../lib/sendMessage.js'
import { getSenderJid, isSudo } from '../lib/ownerSystem.js'
import { getGroupConfig } from '../lib/groupConfig.js'

export default async function groupconfig(sock, sender, args, msg, ctx = {}) {
  try {
    if (!sender.endsWith('@g.us')) {
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│  ⚠️ *GROUPE UNIQUEMENT*\n` +
        `│  Cette commande est réservée\n` +
        `│  aux groupes WhatsApp.\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    const c = getGroupConfig(sender)

    const onOff = (v) => v ? '⚙️ ON' : '🤖 OFF'
    const locks  = Object.entries(c.locks || {}).filter(x => x[1]).map(x => x[0])

    await sendMessage(sock, sender,
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `│   🗂️  CONFIG GROUPE COMPLÈTE   🕷️\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️━━━〔 🔧 𝐏𝐑𝐎𝐓𝐄𝐂𝐓𝐈𝐎𝐍 & 𝐌𝐎𝐃É𝐑𝐀𝐓𝐈𝐎𝐍 〕━━━🕸️\n` +
      `│\n` +
      `│  🔧  Maintenance  : ${onOff(c.maintenance)}\n` +
      `│  📓  Modlog       : ${onOff(c.modlog)}\n` +
      `│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️━━━〔 🛡️ 𝐀𝐍𝐓𝐈-𝐅𝐎𝐍𝐂𝐓𝐈𝐎𝐍𝐒 〕━━━🕸️\n` +
      `│\n` +
      `│  🔗  Antilink    : ${onOff(c.antilink)}\n` +
      `│  📵  Antispam    : ${onOff(c.antispam?.enabled)}\n` +
      `│  📵  Antimention : ${onOff(c.antimention?.enabled)}\n` +
      `│  🗑️  Antisuppr.  : ${onOff(c.antisuppression?.enabled)}\n` +
      `│  🌊  Antiflood   : ${onOff(c.antiflood?.enabled)}\n` +
      `│  🚫  Antiword    : ${onOff(c.antiword?.enabled)} (${(c.antiword?.words || []).length} mots)\n` +
      `│  🛡️  Antipurge   : ${onOff(c.antipurge)}\n` +
      `│  🛡️  Antidemote  : ${onOff(c.antidemote)}\n` +
      `│  🛡️  Antipromote : ${onOff(c.antipromote)}\n` +
      `│  🛡️  Antitag     : ${onOff(c.antitag?.enabled)}\n` +
      `│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️━━━〔 📋 𝐋𝐈𝐒𝐓𝐄𝐒 〕━━━🕸️\n` +
      `│\n` +
      `│  📃  domaines bénis   : ${(c.whitelist || []).length} utilisateur(s)\n` +
      `│  🚷  Blacklist   : ${(c.blacklist || []).length} utilisateur(s)\n` +
      `│  ⚙️  Approuvés   : ${(c.approved || []).length} utilisateur(s)\n` +
      `│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️━━━〔 🔒 𝐕𝐄𝐑𝐑𝐎𝐔𝐒 𝐀𝐂𝐓𝐈𝐅𝐒 〕━━━🕸️\n` +
      `│\n` +
      `│  ${locks.length === 0 ? '🔓 Aucun verrou actif' : locks.map(l => `  🔒 ${l}`).join('\n│  ')}\n` +
      `│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `_💡 Modifiez avec \`.lock\`, \`.antipurge on\`, etc._`
    )

  } catch (e) {
    console.error('❌ groupconfig.js:', e)
    await sendMessage(sock, sender, `│ opération échoué config: ${e.message}`)
  }
}
