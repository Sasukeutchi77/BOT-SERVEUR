// commands/goodbye.js
// 🚪 Configurer le message d'au revoir automatique

import { sendMessage } from '../lib/sendMessage.js'
import fs from 'fs'
import path from 'path'
import { getSenderJid, isDeployer, isGroupAdmin, isSudo } from '../lib/ownerSystem.js'

const GOODBYE_FILE = path.join(process.cwd(), 'data', 'goodbye.json')

// ─── Persistance ────────────────────────────────────────────────────────────

function loadData() {
  try {
    if (fs.existsSync(GOODBYE_FILE))
      return JSON.parse(fs.readFileSync(GOODBYE_FILE, 'utf8'))
  } catch (e) {
    console.error('❌ Erreur lecture goodbye.json:', e.message)
  }
  return {}
}

function saveData(data) {
  try {
    const dir = path.dirname(GOODBYE_FILE)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(GOODBYE_FILE, JSON.stringify(data, null, 2))
    return true
  } catch (e) {
    console.error('❌ Erreur écriture goodbye.json:', e.message)
    return false
  }
}

// ─── Templates de messages ───────────────────────────────────────────────────

const MSG = {
  groupOnly: `│ Cette commande est réservée aux groupes.`,

  accessDenied:
    `🕸️━━━〔 ⛔ 𝐀𝐂𝐂È𝐒 𝐑𝐄𝐅𝐔𝐒É 〕━━━🕸️\n` +
    `│ 🔒 Réservé aux administrateurs du groupe\n` +
    `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`,

  enabled:
    `🕸️━━━〔 🚪 𝐆𝐎𝐎𝐃𝐁𝐘𝐄 𝐀𝐂𝐓𝐈𝐕É 〕━━━🕸️\n` +
    `│ ⚙️ Message d'au revoir *activé* !\n` +
    `│\n` +
    `│ 💡 *.goodbye set <msg>* — Personnaliser\n` +
    `│ 📌 Variables: *{name}* *{group}*\n` +
    `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`,

  disabled:
    `🕸️━━━〔 🚪 𝐆𝐎𝐎𝐃𝐁𝐘𝐄 𝐃É𝐒𝐀𝐂𝐓𝐈𝐕É 〕━━━🕸️\n` +
    `│ 🕷️ Message d'au revoir *désactivé*.\n` +
    `│ 💡 *.goodbye on* pour réactiver\n` +
    `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`,

  setUsage: `│ syntaxe: *.goodbye set <message>*\n📌 Variables: *{name}* *{group}*`,

  saveFailed: `│ Échec de la sauvegarde. Vérifie les permissions du dossier *data/*.`,

  help:
    `🕸️━━━〔 🚪 𝐆𝐎𝐎𝐃𝐁𝐘𝐄 𝐂𝐎𝐍𝐅𝐈𝐆 〕━━━🕸️\n` +
    `│ 📋 *commandes disponibles:*\n` +
    `│\n` +
    `│ • *.goodbye on* — Activer\n` +
    `│ • *.goodbye off* — Désactiver\n` +
    `│ • *.goodbye set <msg>* — Personnaliser\n` +
    `│ • *.goodbye reset* — Message par défaut\n` +
    `│ • *.goodbye test* — Prévisualiser\n` +
    `│\n` +
    `│ 📌 Variables: *{name}* *{group}*\n` +
    `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`,
}

const DEFAULT_MESSAGE = `👋 Au revoir *{name}* ! Tu nous manqueras dans *{group}* 😢`

// ─── Utilitaire de rendu du message ─────────────────────────────────────────

function renderMessage(template, name, groupName) {
  return template
    .replace(/\{name\}/g, name)
    .replace(/\{group\}/g, groupName)
}

// ─── Commande principale ─────────────────────────────────────────────────────

export default async function goodbye(sock, sender, args, msg) {
  try {
    const userId = getSenderJid(msg, sock)

    if (!sender.endsWith('@g.us')) {
      return await sendMessage(sock, sender, MSG.groupOnly)
    }

    const canUse = isDeployer(userId) || isSudo(userId) || await isGroupAdmin(sock, sender, userId)
    if (!canUse) {
      return await sendMessage(sock, sender, MSG.accessDenied)
    }

    const action = args[0]?.toLowerCase()
    const data   = loadData()
    const group  = data[sender] || {}

    // ── ON ──────────────────────────────────────────────────────────────────
    if (action === 'on') {
      data[sender] = { ...group, enabled: true }
      const saved = saveData(data)
      return await sendMessage(sock, sender, saved ? MSG.enabled : MSG.saveFailed)
    }

    // ── OFF ─────────────────────────────────────────────────────────────────
    if (action === 'off') {
      data[sender] = { ...group, enabled: false }
      const saved = saveData(data)
      return await sendMessage(sock, sender, saved ? MSG.disabled : MSG.saveFailed)
    }

    // ── SET ─────────────────────────────────────────────────────────────────
    if (action === 'set') {
      const newMsg = args.slice(1).join(' ').trim()
      if (!newMsg) return await sendMessage(sock, sender, MSG.setUsage)

      data[sender] = { ...group, message: newMsg }
      const saved = saveData(data)
      return await sendMessage(sock, sender,
        saved
          ? `⚙️ *Message d'au revoir sauvegardé !*\n\n📝 _${newMsg}_`
          : MSG.saveFailed
      )
    }

    // ── RESET ───────────────────────────────────────────────────────────────
    if (action === 'reset') {
      data[sender] = { ...group, message: null }
      saveData(data)
      return await sendMessage(sock, sender,
        `⚙️ Message remis par défaut !\n\n📝 _${DEFAULT_MESSAGE}_`
      )
    }

    // ── TEST ────────────────────────────────────────────────────────────────
    if (action === 'test') {
      const template = group.message || DEFAULT_MESSAGE
      const preview  = renderMessage(template, 'John Doe', 'Mon Groupe')
      return await sendMessage(sock, sender,
        `🕸️━━━〔 🔍 𝐀𝐏𝐄𝐑Ç𝐔 𝐆𝐎𝐎𝐃𝐁𝐘𝐄 〕━━━🕸️\n` +
        `│\n` +
        `│ ${preview}\n` +
        `│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── STATUT (défaut) ──────────────────────────────────────────────────────
    const status     = group.enabled ? '⚙️ *ACTIVÉ*' : '🕷️ *DÉSACTIVÉ*'
    const currentMsg = group.message || `_(par défaut)_`

    return await sendMessage(sock, sender,
      `🕸️━━━〔 🚪 𝐆𝐎𝐎𝐃𝐁𝐘𝐄 𝐒𝐓𝐀𝐓𝐔𝐒 〕━━━🕸️\n` +
      `│ 📊 Statut : ${status}\n` +
      `│ 📝 Message : ${currentMsg}\n` +
      `│\n` +
      `│ *.goodbye help* pour les commandes\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )

  } catch (e) {
    console.error('❌ Erreur goodbye:', e)
    await sendMessage(sock, sender, `│ opération échoué inattendue : _${e.message}_`)
  }
}