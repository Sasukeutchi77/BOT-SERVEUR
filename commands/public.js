// commands/public.js — 𝑴𝑼𝑹𝑨𝑺𝑨𝑲𝑰 𝐒𝐒𝐊 𓂀
// 🔧 FIX: ctx utilisé (senderJid, isOwner, isSudo)
// 🔧 FIX: cleanNumber pour affichage propre
// 🔧 FIX: ctx = {} ajouté

import { sendMessage }                                from '../lib/sendMessage.js'
import { showActionLoader, deleteLoader, formatTime } from '../lib/animLoader.js'
import {
  getMode,
  getSenderJid,
  isDeployer,
  isSudo,
  setMode,
  cleanNumber
} from '../lib/ownerSystem.js'

export default async function publicCmd(sock, sender, args, msg, ctx = {}) {
  let loaderKey = null

  try {

    // ── CTX ──────────────────────────────────────────────────
    const userId = ctx.senderJid || getSenderJid(msg, sock)

    // ── PERMISSION : Owner ou SUDO ───────────────────────────
    const isAllowed = ctx.isOwner || ctx.isSudo ||
                      isDeployer(userId) || isSudo(userId)

    if (!isAllowed) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 ⛔ 𝐀𝐂𝐂È𝐒 𝐑𝐄𝐅𝐔𝐒É 〕━━━🕸️\n\n` +
        `│ 🔒 Seuls le *Propriétaire*\n` +
        `│    et les *SUDO* peuvent\n` +
        `│    changer le mode du Système.\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── MODE DÉJÀ ACTIF ──────────────────────────────────────
    if (getMode() === 'public') {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 👁️ 𝐌𝐎𝐃𝐄 𝐀𝐂𝐓𝐔𝐄𝐋 〕━━━🕸️\n\n` +
        `│ Le Système est déjà en\n` +
        `│ mode *⚙️ PUBLIC*.\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── ACTIVATION ───────────────────────────────────────────
    loaderKey = await showActionLoader(sock, sender, 'CHANGEMENT DE MODE', '⚙️')

    setMode('public')

    await deleteLoader(sock, sender, loaderKey)
    loaderKey = null

    const userNum = cleanNumber(userId)

    return await sendMessage(sock, sender,
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `     🕷️ ⚙️ *MODE PUBLIC* ⚙️ 🕷️\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️━━━〔 ⚙️ 𝐌𝐎𝐃𝐄 𝐀𝐂𝐓𝐈𝐕É 〕━━━🕸️\n` +
      `│\n` +
      `│ 📊 Mode: *PUBLIC*\n` +
      `│ 📡 Accès: *Tout le monde*\n` +
      `│ 🕐 Heure: ${formatTime()}\n` +
      `│ 👮 Par: @${userNum}\n` +
      `│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `⚙️ _Tous les utilisateurs peuvent\nmaintenant utiliser les commandes._`,
      { mentions: [userId] }
    )

    console.log(`🟢 Mode PUBLIC | par: +${userNum}`)

  } catch (err) {
    if (loaderKey) await deleteLoader(sock, sender, loaderKey)
    console.error('❌ Erreur public:', err)
    await sendMessage(sock, sender,
      `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
      `│ 📝 _${err.message || 'opération échoué inconnue'}_\n\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )
  }
}