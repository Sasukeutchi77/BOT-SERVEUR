// commands/cmdinfo.js — J.A.R.V.I.S.

import { sendMessage } from '../lib/sendMessage.js'
import { getSenderJid, isOwner, isSudo } from '../lib/ownerSystem.js'
import { getDynamicPrefix } from '../lib/prefixManager.js'
import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default async function cmdinfo(sock, sender, args, msg) {
  try {
    const user = getSenderJid(msg, sock)
    if (!isOwner(user) && !isSudo(user)) {
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n│  🚫 *ACCÈS REFUSÉ* — Owner/SUDO uniquement.\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    const cmd = (args[0] || '').toLowerCase().replace(/^\./, '')

    if (!cmd) {
      const files    = fs.readdirSync(__dirname).filter(f => f.endsWith('.js'))
      const total    = files.length
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│   🔍  INFOS SUR COMMANDE       🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│  📝 *SYNTAXE*\n│\n` +
        `│  \`.cmdinfo <commande>\`\n│\n` +
        `│  💡 *Exemple :*\n` +
        `│  \`.cmdinfo ping\`\n` +
        `│  \`.cmdinfo menu\`\n│\n` +
        `│  📦 *${total} commandes* chargées\n│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    const file = path.join(__dirname, cmd + '.js')

    if (!fs.existsSync(file)) {
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│   🔍  INFOS SUR COMMANDE       🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│  🕷️ commande *${cmd}* introuvable.\n│\n` +
        `│  💡 Tapez \`.menu\` pour voir\n` +
        `│  toutes les commandes disponibles.\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    const prefix  = getDynamicPrefix('.')
    const stat    = fs.statSync(file)
    const content = fs.readFileSync(file, 'utf8')
    const lines   = content.split('\n').length
    const sizeKB  = (stat.size / 1024).toFixed(1)
    const modDate = stat.mtime.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

    // Extraire description depuis le commentaire du fichier
    const descMatch = content.match(/\/\/\s*✅\s*(.+)/)
    const desc      = descMatch ? descMatch[1] : 'Aucune description'

    // Détecter les imports pour voir les dépendances
    const imports = (content.match(/from ['"]([^'"]+)['"]/g) || [])
      .map(i => i.replace(/from ['"](.+)['"]/, '$1'))
      .filter(i => !i.startsWith('node:'))
      .slice(0, 5)

    await sendMessage(sock, sender,
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `│   🔍  INFOS: .${cmd.toUpperCase().padEnd(20)}🕷️\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️━━━〔 📄 𝐅𝐈𝐂𝐇𝐈𝐄𝐑 〕━━━🕸️\n│\n` +
      `│  📁 *Fichier :* \`commands/${cmd}.js\`\n` +
      `│  📏 *Taille :* ${sizeKB} KB — ${lines} lignes\n` +
      `│  📅 *Modifié :* ${modDate}\n` +
      `│  ⚙️ *Statut :* Chargée\n│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️━━━〔 👁️ 𝐃𝐄𝐒𝐂𝐑𝐈𝐏𝐓𝐈𝐎𝐍 〕━━━🕸️\n│\n` +
      `│  ${desc}\n│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️━━━〔 🔗 𝐃É𝐏𝐄𝐍𝐃𝐀𝐍𝐂𝐄𝐒 〕━━━🕸️\n│\n` +
      (imports.length > 0
        ? imports.map(i => `│  › \`${i}\``).join('\n') + '\n'
        : `│  Aucune dépendance externe\n`
      ) +
      `│\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `_💡 \`${prefix}help ${cmd}\` → Aide utilisateur_`
    )

  } catch (e) {
    console.error('❌ cmdinfo.js:', e)
    await sendMessage(sock, sender, `│ opération échoué cmdinfo: ${e.message}`)
  }
}
