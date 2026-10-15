// commands/rules.js — 𝑴𝑼𝑹𝑨𝑺𝑨𝑲𝑰 𝐒𝐒𝐊 𓂀
// 🔧 FIX: syntaxe header corrigée (1// → //)
// 🔧 FIX: ctx utilisé (senderJid, isOwner, isAdmin)
// 🔧 FIX: isGroupAdmin via ctx.isAdmin (zéro appel réseau)
// 🔧 FIX: ctx = {} ajouté

import { sendMessage }                    from '../lib/sendMessage.js'
import { getSenderJid, isDeployer, isSudo } from '../lib/ownerSystem.js'
import fs   from 'fs'
import path from 'path'

const RULES_FILE = path.join(process.cwd(), 'data', 'rules.json')

//══════════════════════════════════════
// GESTION DES RÈGLES
//══════════════════════════════════════

function loadRules() {
  try {
    if (fs.existsSync(RULES_FILE)) return JSON.parse(fs.readFileSync(RULES_FILE, 'utf8'))
  } catch {}
  return {}
}

function saveRules(data) {
  try {
    const dir = path.dirname(RULES_FILE)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(RULES_FILE, JSON.stringify(data, null, 2))
    return true
  } catch { return false }
}

//══════════════════════════════════════
// COMMANDE PRINCIPALE
//══════════════════════════════════════

export default async function rules(sock, sender, args, msg, ctx = {}) {
  try {

    // ── GROUP ONLY ───────────────────────────────────────────
    if (!sender.endsWith('@g.us')) {
      return await sendMessage(sock, sender,
        "🕷️ commande groupe uniquement."
      )
    }

    // ── CTX ──────────────────────────────────────────────────
    const userId  = ctx.senderJid || getSenderJid(msg, sock)
    const isOwner = ctx.isOwner   || isDeployer(userId) || isSudo(userId)
    const isAdmin = ctx.isAdmin   || false

    const action     = args[0]?.toLowerCase()
    const data       = loadRules()
    const groupRules = data[sender] || []

    // ── VOIR LES RÈGLES (public) ─────────────────────────────
    if (!action || action === 'show' || action === 'voir') {
      if (groupRules.length === 0) {
        return await sendMessage(sock, sender,
          `🕸️━━━〔 📜 𝐑È𝐆𝐋𝐄𝐒 𝐃𝐔 𝐆𝐑𝐎𝐔𝐏𝐄 〕━━━🕸️\n\n` +
          `│ 🕷️ Aucune règle définie.\n\n` +
          `│ 💡 Pour ajouter:\n` +
          `│ *.rules add <règle>*\n\n` +
          `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        )
      }

      const rulesList = groupRules.map((r, i) => `│ *${i + 1}.* ${r}`).join('\n')

      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `     🕷️ 📜 *RÈGLES DU GROUPE* 📜 🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️━━━〔 📋 𝐋𝐈𝐒𝐓𝐄 〕━━━🕸️\n` +
        `│\n` +
        `${rulesList}\n` +
        `│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `_⚠️ Le non-respect des règles entraîne une expulsion._`
      )
    }

    // ── AIDE ─────────────────────────────────────────────────
    if (action === 'help' || action === 'aide') {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 📜 𝐑𝐔𝐋𝐄𝐒 〕━━━🕸️\n\n` +
        `│ • *.rules* — Voir les règles\n` +
        `│ • *.rules add <règle>* — Ajouter\n` +
        `│ • *.rules remove <n°>* — Supprimer\n` +
        `│ • *.rules clear* — Tout effacer\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── ACTIONS ADMIN ─────────────────────────────────────────
    // ✅ FIX : ctx.isOwner + ctx.isAdmin (zéro appel réseau)
    const canManage = isOwner || isAdmin

    if (!canManage) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 ⛔ 𝐀𝐂𝐂È𝐒 𝐑𝐄𝐅𝐔𝐒É 〕━━━🕸️\n\n` +
        `│ Seuls les *administrateurs* peuvent\n` +
        `│ gérer les règles du groupe.\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── ADD ───────────────────────────────────────────────────
    if (action === 'add' || action === 'ajouter') {
      const rule = args.slice(1).join(' ').trim()
      if (!rule) {
        return await sendMessage(sock, sender,
          `│ syntaxe: *.rules add <règle>*`
        )
      }
      if (!data[sender]) data[sender] = []
      if (data[sender].length >= 20) {
        return await sendMessage(sock, sender,
          `│ Maximum *20 règles* atteint.\nSupprimez-en d'abord avec *.rules remove <n°>*`
        )
      }
      data[sender].push(rule)
      saveRules(data)
      return await sendMessage(sock, sender,
        `🕸️━━━〔 ⚙️ 𝐑È𝐆𝐋𝐄 𝐀𝐉𝐎𝐔𝐓É𝐄 〕━━━🕸️\n\n` +
        `│ 📌 Règle #${data[sender].length}:\n` +
        `│ _${rule}_\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── REMOVE ───────────────────────────────────────────────
    if (action === 'remove' || action === 'del' || action === 'supprimer') {
      const num = parseInt(args[1])
      if (!num || num < 1 || num > groupRules.length) {
        return await sendMessage(sock, sender,
          `│ Numéro invalide.\n💡 Tapez *.rules* pour voir la liste (1 à ${groupRules.length}).`
        )
      }
      const removed = data[sender].splice(num - 1, 1)[0]
      saveRules(data)
      return await sendMessage(sock, sender,
        `🕸️━━━〔 🗑️ 𝐑È𝐆𝐋𝐄 𝐒𝐔𝐏𝐏𝐑𝐈𝐌É𝐄 〕━━━🕸️\n\n` +
        `│ 🕷️ Règle #${num} supprimée:\n` +
        `│ _${removed}_\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── CLEAR ────────────────────────────────────────────────
    if (action === 'clear' || action === 'reset' || action === 'vider') {
      const count = (data[sender] || []).length
      data[sender] = []
      saveRules(data)
      return await sendMessage(sock, sender,
        `🕸️━━━〔 ⚙️ 𝐑È𝐆𝐋𝐄𝐒 𝐄𝐅𝐅𝐀𝐂É𝐄𝐒 〕━━━🕸️\n\n` +
        `│ 🗑️ *${count}* règle(s) supprimée(s).\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── ACTION INCONNUE ──────────────────────────────────────
    return await sendMessage(sock, sender,
      `🕸️━━━〔 📜 𝐑𝐔𝐋𝐄𝐒 〕━━━🕸️\n\n` +
      `│ • *.rules* — Voir les règles\n` +
      `│ • *.rules add <règle>* — Ajouter\n` +
      `│ • *.rules remove <n°>* — Supprimer\n` +
      `│ • *.rules clear* — Tout effacer\n\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )

  } catch (e) {
    console.error("❌ Erreur rules:", e)
    await sendMessage(sock, sender, `│ opération échoué: ${e.message}`)
  }
}