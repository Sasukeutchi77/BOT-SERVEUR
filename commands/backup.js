// commands/backup.js — J.A.R.V.I.S.
// ✅ Sauvegarde des données avec design amélioré

import { sendMessage, sendDocument } from '../lib/sendMessage.js'
import { getSenderJid, isOwner, isSudo } from '../lib/ownerSystem.js'
import fs   from 'fs'
import path from 'path'

export default async function backup(sock, sender, args, msg) {
  try {
    const user = getSenderJid(msg, sock)
    if (!isOwner(user) && !isSudo(user)) {
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n│  🚫 *ACCÈS REFUSÉ* — Owner/SUDO uniquement.\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    await sendMessage(sock, sender,
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n│  ⏳ *Sauvegarde en cours...*\n│  Lecture des données...\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )

    const dir      = path.join(process.cwd(), 'backups')
    const dataDir  = path.join(process.cwd(), 'data')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    const stamp    = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `jarvis-v4-backup-${stamp}.json`
    const file     = path.join(dir, filename)

    const data = {}
    let fileCount = 0

    if (fs.existsSync(dataDir)) {
      for (const f of fs.readdirSync(dataDir).filter(f => f.endsWith('.json'))) {
        try {
          data[f] = JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf8') || '{}')
          fileCount++
        } catch {}
      }
    }

    const backupObj = {
      version:   'JARVIS-v4',
      createdAt: new Date().toISOString(),
      files:     fileCount,
      data
    }

    fs.writeFileSync(file, JSON.stringify(backupObj, null, 2))
    const sizeKB = Math.round(fs.statSync(file).size / 1024)

    await sendDocument(sock, sender, fs.readFileSync(file), filename, `💾 Sauvegarde J.A.R.V.I.S. v4 — ${fileCount} fichier(s) — ${sizeKB} KB`)

    await sendMessage(sock, sender,
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `│   💾  SAUVEGARDE RÉUSSIE ⚙️    🕷️\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n│\n` +
      `│  ⚙️ *Backup créé avec succès !*\n│\n` +
      `│  📁 *Fichier :* \`${filename}\`\n` +
      `│  📦 *Données :* ${fileCount} fichier(s)\n` +
      `│  💾 *Taille :* ${sizeKB} KB\n│\n` +
      `│  _Conservez ce fichier en lieu sûr._\n│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )

  } catch (e) {
    console.error('❌ backup.js:', e)
    await sendMessage(sock, sender, `│ opération échoué backup: ${e.message}`)
  }
}
