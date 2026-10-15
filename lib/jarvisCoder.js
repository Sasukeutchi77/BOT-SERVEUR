// lib/jarvisCoder.js
// ╔══════════════════════════════════════════════════════════════════╗
// ║  MODE "CODER" DE J.A.R.V.I.S.                                    ║
// ║  Owner/Sudo peuvent demander à l'IA de créer/améliorer des       ║
// ║  commandes (commands/) ou de corriger des bugs (commands/+lib/). ║
// ║                                                                    ║
// ║  Garde-fous, dans l'ordre où ils s'appliquent :                  ║
// ║   1. Portée limitée à commands/ et lib/ (jamais .env, config.js, ║
// ║      package.json, index.js) + anti path-traversal.              ║
// ║   2. Liste FERMÉE de paquets npm autorisés à l'import — exactement ║
// ║      ce qui est déjà dans package.json. C'est la leçon directe    ║
// ║      du bug tgs.js (import de 'wa-sticker-formatter', jamais      ║
// ║      installé, qui faisait planter le chargement du module).      ║
// ║   3. Validation syntaxique (node --check) AVANT de montrer le     ║
// ║      code à l'utilisateur, et une 2e fois juste avant écriture.   ║
// ║   4. Rien n'est écrit sur disque sans confirmation explicite      ║
// ║      (.jarvis confirm) — .jarvis code/fix ne fait que PROPOSER.   ║
// ║   5. Sauvegarde automatique de l'ancien fichier avant écrasement, ║
// ║      restaurable avec .jarvis rollback.                          ║
// ╚══════════════════════════════════════════════════════════════════╝

import fs from 'fs'
import path from 'path'
import os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'
import { fileURLToPath } from 'url'
import { sendMessage } from './sendMessage.js'
import { chatWithFallback } from './aiProviders.js'

const execAsync = promisify(exec)

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)
const ROOT_DIR      = path.resolve(__dirname, '..')
const COMMANDS_DIR  = path.join(ROOT_DIR, 'commands')
const LIB_DIR        = path.join(ROOT_DIR, 'lib')
const BACKUPS_DIR    = path.join(ROOT_DIR, 'data', 'jarvis_backups')

const CODE_MAX_TOKENS = 4096

// ── Dépendances npm dont l'import est autorisé — DOIT rester synchro
//    avec les "dependencies" de package.json. ────────────────────────
const ALLOWED_PACKAGES = [
  '@hapi/boom', '@whiskeysockets/baileys', 'axios', 'dotenv',
  'fluent-ffmpeg', 'jimp', 'node-fetch', 'pino', 'qrcode',
  'qrcode-terminal', 'sharp', 'yt-search', '@distube/ytdl-core'
]

const NODE_BUILTINS = new Set([
  'fs', 'path', 'os', 'url', 'util', 'child_process', 'zlib', 'crypto', 'http', 'https',
  'stream', 'events', 'readline', 'buffer', 'querystring', 'net', 'tls', 'dns', 'assert',
  'timers', 'worker_threads', 'perf_hooks', 'string_decoder', 'vm', 'module', 'process'
])

const pendingProposals = new Map() // senderJid -> { action, abs, rel, code, createdAt }
const PROPOSAL_TTL_MS  = 10 * 60 * 1000

// ─────────────────────────────────────────────────────────────────
// Utilitaires
// ─────────────────────────────────────────────────────────────────

function box(title, bodyLines) {
  const body = Array.isArray(bodyLines) ? bodyLines.join('\n') : bodyLines
  return `🕸️━━━〔 ${title} 〕━━━🕸️\n${body}\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
}

function truncateForPrompt(text, max = 12000) {
  if (text.length <= max) return text
  return text.slice(0, max) + '\n\n/* [... fichier tronqué pour la requête IA ...] */'
}

function stripCodeFences(text) {
  const trimmed = text.trim()
  const fenceMatch = trimmed.match(/^```[a-zA-Z]*\n([\s\S]*?)\n?```$/)
  if (fenceMatch) return fenceMatch[1].trim()
  return trimmed
}

function findDisallowedImports(code) {
  const bad = new Set()
  const re = /(?:import\s+(?:[\w{}*\s,]+)\s+from\s+|import\()\s*['"]([^'"]+)['"]/g
  let m
  while ((m = re.exec(code))) {
    const spec = m[1]
    if (spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('node:')) continue
    let pkg = spec.split('/')[0]
    if (pkg.startsWith('@')) pkg = spec.split('/').slice(0, 2).join('/')
    if (NODE_BUILTINS.has(pkg) || ALLOWED_PACKAGES.includes(pkg)) continue
    bad.add(pkg)
  }
  return [...bad]
}

async function validateSyntax(code) {
  const tmpFile = path.join(os.tmpdir(), `jarvis-check-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`)
  fs.writeFileSync(tmpFile, code, 'utf8')
  try {
    await execAsync(`node --check "${tmpFile}"`, { timeout: 10000 })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e.stderr || e.message || '').slice(0, 600) }
  } finally {
    fs.rmSync(tmpFile, { force: true })
  }
}

// Résout un NOM de commande vers commands/<nom>.js — création uniquement,
// jamais de "/" accepté (empêche toute évasion de dossier).
function safeResolveCommandPath(rawName) {
  const clean = String(rawName || '').trim().toLowerCase().replace(/\.js$/, '')
  if (!/^[a-z0-9_-]+$/.test(clean)) return null
  const abs = path.join(COMMANDS_DIR, clean + '.js')
  return { abs, rel: `commands/${clean}.js`, exists: fs.existsSync(abs) }
}

// Résout une CIBLE de correction : nom de commande simple, OU chemin
// explicite "commands/x.js" / "lib/x.js". Le chemin résolu DOIT rester
// strictement à l'intérieur de commands/ ou lib/ (anti path-traversal).
function safeResolveFixTarget(rawTarget) {
  let clean = String(rawTarget || '').trim().replace(/^\.?\/+/, '')
  if (!clean) return null
  if (!clean.includes('/')) clean = `commands/${clean.replace(/\.js$/, '')}`
  if (!clean.endsWith('.js')) clean += '.js'
  const abs = path.resolve(ROOT_DIR, clean)
  const inCommands = abs.startsWith(COMMANDS_DIR + path.sep)
  const inLib       = abs.startsWith(LIB_DIR + path.sep)
  if (!inCommands && !inLib) return null
  return { abs, rel: path.relative(ROOT_DIR, abs), exists: fs.existsSync(abs) }
}

function backupFile(absPath, rel) {
  if (!fs.existsSync(absPath)) return null
  fs.mkdirSync(BACKUPS_DIR, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.join(BACKUPS_DIR, `${rel.replace(/\//g, '__')}.${stamp}.bak`)
  fs.copyFileSync(absPath, backupPath)
  return backupPath
}

function findLatestBackup(rel) {
  if (!fs.existsSync(BACKUPS_DIR)) return null
  const prefix = rel.replace(/\//g, '__') + '.'
  const files = fs.readdirSync(BACKUPS_DIR).filter(f => f.startsWith(prefix)).sort()
  return files.length ? path.join(BACKUPS_DIR, files[files.length - 1]) : null
}

function createProposal(senderJid, proposal) {
  pendingProposals.set(senderJid, { ...proposal, createdAt: Date.now() })
}
function getProposal(senderJid) {
  const p = pendingProposals.get(senderJid)
  if (!p) return null
  if (Date.now() - p.createdAt > PROPOSAL_TTL_MS) {
    pendingProposals.delete(senderJid)
    return null
  }
  return p
}
// Exportée pour commands/jarvis.js : permet de router ".jarvis confirm"
// vers le mode coder OU le mode action selon ce qui est réellement en attente.
export function hasPendingCoderProposal(senderJid) {
  return !!getProposal(senderJid)
}
function clearProposal(senderJid) { pendingProposals.delete(senderJid) }

// ─────────────────────────────────────────────────────────────────
// Prompts
// ─────────────────────────────────────────────────────────────────

function baseSystemPrompt() {
  return [
    `Tu es un générateur de code pour un bot WhatsApp Node.js (ESM, "type":"module", Node 18+, basé sur @whiskeysockets/baileys).`,
    `RÈGLES STRICTES, à respecter sans exception :`,
    `1. Réponds UNIQUEMENT avec le code source final du fichier. Pas d'explication, pas de balises markdown \`\`\`, juste le code brut.`,
    `2. Module ESM strict : "import ... from '...'" et "export default ...". Jamais de require() ni de module.exports.`,
    `3. Dépendances npm dont l'import est autorisé (liste FERMÉE) : ${ALLOWED_PACKAGES.join(', ')}.`,
    `   Pour tout le reste, utilise UNIQUEMENT des modules natifs Node.js (fs, path, os, crypto, child_process, util, url, zlib, http, https, buffer, stream).`,
    `   ⚠️ Importer un paquet npm non listé ci-dessus fait planter TOUT le fichier au chargement — c'est une règle absolue, pas une suggestion.`,
    `4. Code robuste : try/catch systématique autour de tout appel réseau ou fichier, jamais de crash non géré, jamais de throw non catché à la racine.`,
    `5. Commentaires et messages affichés à l'utilisateur en français.`,
  ].join('\n')
}

function commandSkeletonHint() {
  return [
    `Ce fichier est une COMMANDE (dossier commands/). Signature OBLIGATOIRE :`,
    `  export default async function nomDeLaCommande(sock, sender, args, msg, ctx) { ... }`,
    `  - sock  : socket Baileys`,
    `  - sender: JID de la conversation où répondre (groupe ou DM)`,
    `  - args  : tableau des mots tapés après la commande`,
    `  - msg   : message brut Baileys`,
    `  - ctx   : { senderJid, isOwner, isSudo, isPremium, isGroup, isAdmin, ... }`,
    `Pour répondre : import { sendMessage } from '../lib/sendMessage.js' puis await sendMessage(sock, sender, texte)`,
    `Pour vérifier les droits si besoin : import { isOwner, isSudo } from '../lib/ownerSystem.js'`,
    `Entoure toujours l'exécution d'un try/catch qui envoie un message d'erreur clair au lieu de laisser planter.`,
  ].join('\n')
}

function fixHint() {
  return [
    `C'est une demande de CORRECTION DE BUG sur un fichier existant.`,
    `Corrige UNIQUEMENT ce qui est nécessaire pour résoudre le problème décrit — ne réécris pas le style ou la logique qui fonctionne déjà.`,
    `Renvoie le fichier COMPLET corrigé (pas un extrait, pas un diff).`,
  ].join('\n')
}

// Génération de code : priorité qualité (OpenAI/Gemini d'abord, Groq en
// dernier recours) via lib/aiProviders.js — voir purpose:'code'. Si une IA
// échoue ou n'a pas de clé configurée dans .env, on passe automatiquement
// à la suivante ; l'échec n'est total que si LES TROIS échouent.
async function callGroqForCode(systemPrompt, userPrompt) {
  const { text } = await chatWithFallback([], systemPrompt, userPrompt, {
    purpose: 'code',
    opts: { maxTokens: CODE_MAX_TOKENS, temperature: 0.2 }
  })
  return text
}

// ─────────────────────────────────────────────────────────────────
// API haut niveau — appelée depuis commands/jarvis.js
// ─────────────────────────────────────────────────────────────────

export async function handleCoderCommand(sock, sender, senderJid, sub, restArgs, prefix) {
  try {
    if (sub === 'code')     return await doCode(sock, sender, senderJid, restArgs, prefix)
    if (sub === 'fix')      return await doFix(sock, sender, senderJid, restArgs, prefix)
    if (sub === 'confirm')  return await doConfirm(sock, sender, senderJid, prefix)
    if (sub === 'cancel')   return await doCancel(sock, sender, senderJid)
    if (sub === 'rollback') return await doRollback(sock, sender, senderJid, restArgs)
  } catch (e) {
    console.error('❌ jarvisCoder erreur:', e)
    await sendMessage(sock, sender, box('🕷️ ERREUR', `│  ${String(e.message || e).slice(0, 300)}`))
  }
}

async function doCode(sock, sender, senderJid, restArgs, prefix) {
  const [nameArg, ...descParts] = restArgs
  if (!nameArg || !descParts.length) {
    return await sendMessage(sock, sender, box('🤖 J.A.R.V.I.S. — CODE', [
      `│  Syntaxe : ${prefix}jarvis code <nom> <description>`,
      `│`,
      `│  Exemple :`,
      `│  ${prefix}jarvis code meteo Affiche la météo`,
      `│  d'une ville via l'API Open-Meteo`,
      `│`,
      `│  💡 Si "<nom>" existe déjà, la commande`,
      `│  sera améliorée plutôt que recréée.`,
    ]))
  }

  const target = safeResolveCommandPath(nameArg)
  if (!target) {
    return await sendMessage(sock, sender, box('🕷️ NOM INVALIDE', `│  Utilise uniquement lettres, chiffres,\n│  tirets et underscores, sans "/".`))
  }

  await sendMessage(sock, sender, box('🤖 J.A.R.V.I.S.', `│  Génération en cours, Monsieur...\n│  (${target.exists ? 'amélioration' : 'nouvelle commande'} : ${target.rel})`))

  const description = descParts.join(' ')
  let existingCode = null
  if (target.exists) existingCode = truncateForPrompt(fs.readFileSync(target.abs, 'utf8'))

  const systemPrompt = baseSystemPrompt() + '\n' + commandSkeletonHint()
  const userPrompt = existingCode
    ? `Voici le contenu ACTUEL de la commande "${nameArg}" à améliorer :\n\n${existingCode}\n\nDemande : ${description}\n\nRenvoie le fichier ENTIER (commands/${nameArg}.js).`
    : `Nouvelle commande à créer, nom du fichier : commands/${nameArg}.js\n\nDemande : ${description}\n\nRenvoie le fichier ENTIER.`

  await runGenerationAndPropose(sock, sender, senderJid, prefix, target, userPrompt, systemPrompt, target.exists ? 'edit' : 'create')
}

async function doFix(sock, sender, senderJid, restArgs, prefix) {
  const [targetArg, ...descParts] = restArgs
  if (!targetArg || !descParts.length) {
    return await sendMessage(sock, sender, box('🤖 J.A.R.V.I.S. — FIX', [
      `│  Syntaxe : ${prefix}jarvis fix <cible> <problème>`,
      `│`,
      `│  <cible> = nom de commande (ex: ban)`,
      `│  ou chemin explicite (ex: lib/muteManager.js)`,
      `│`,
      `│  Exemple :`,
      `│  ${prefix}jarvis fix ban le bot dit "erreur"`,
      `│  au lieu d'exclure le membre`,
    ]))
  }

  const target = safeResolveFixTarget(targetArg)
  if (!target) {
    return await sendMessage(sock, sender, box('🕷️ CIBLE INVALIDE', `│  Chemin hors de portée.\n│  Uniquement commands/ ou lib/ acceptés.`))
  }
  if (!target.exists) {
    return await sendMessage(sock, sender, box('🕷️ INTROUVABLE', `│  Fichier introuvable : ${target.rel}`))
  }

  await sendMessage(sock, sender, box('🤖 J.A.R.V.I.S.', `│  Analyse en cours, Monsieur...\n│  (${target.rel})`))

  const description = descParts.join(' ')
  const existingCode = truncateForPrompt(fs.readFileSync(target.abs, 'utf8'))

  const systemPrompt = baseSystemPrompt() + '\n' + (target.rel.startsWith('commands/') ? commandSkeletonHint() + '\n' : '') + fixHint()
  const userPrompt = `Fichier à corriger (${target.rel}) :\n\n${existingCode}\n\nProblème rapporté : ${description}`

  await runGenerationAndPropose(sock, sender, senderJid, prefix, target, userPrompt, systemPrompt, 'edit')
}

async function runGenerationAndPropose(sock, sender, senderJid, prefix, target, userPrompt, systemPrompt, action) {
  let raw
  try {
    raw = await callGroqForCode(systemPrompt, userPrompt)
  } catch (e) {
    return await sendMessage(sock, sender, box('🕷️ ÉCHEC GÉNÉRATION', `│  ${String(e.message).slice(0, 300)}`))
  }

  const code = stripCodeFences(raw)

  const disallowed = findDisallowedImports(code)
  if (disallowed.length) {
    return await sendMessage(sock, sender, box('🕷️ DÉPENDANCE NON INSTALLÉE', [
      `│  Le code généré importe : ${disallowed.join(', ')}`,
      `│  Ces paquets ne sont pas dans package.json.`,
      `│`,
      `│  Abandon (pour éviter de reproduire le bug`,
      `│  tgs.js). Réessaie en précisant "sans`,
      `│  dépendance externe" dans ta demande.`,
    ]))
  }

  const syntax = await validateSyntax(code)
  if (!syntax.ok) {
    return await sendMessage(sock, sender, box('🕷️ SYNTAXE INVALIDE', [
      `│  Le code généré ne passe pas node --check :`,
      `│  ${syntax.error.slice(0, 250)}`,
      `│`,
      `│  Rien n'a été proposé. Réessaie, ou reformule`,
      `│  la demande.`,
    ]))
  }

  createProposal(senderJid, { action, abs: target.abs, rel: target.rel, code })

  const preview = code.length > 2500 ? code.slice(0, 2500) + '\n\n/* [... tronqué pour l\'aperçu, le fichier complet sera bien écrit] */' : code

  await sendMessage(sock, sender,
    box('📋 APERÇU — ' + target.rel, `│  ${action === 'create' ? 'Nouvelle commande' : 'Modification'} proposée :`) +
    `\n\n\`\`\`\n${preview}\n\`\`\`\n\n` +
    box('⚠️ CONFIRMATION REQUISE', [
      `│  ${prefix}jarvis confirm → appliquer`,
      `│  ${prefix}jarvis cancel  → annuler`,
      `│`,
      `│  (expire dans 10 min si non confirmé)`,
    ])
  )
}

async function doConfirm(sock, sender, senderJid, prefix) {
  const p = getProposal(senderJid)
  if (!p) {
    return await sendMessage(sock, sender, box('🕷️ RIEN À CONFIRMER', `│  Aucune proposition en attente (ou elle a\n│  expiré). Relance ${prefix}jarvis code / fix.`))
  }

  // Défense en profondeur : re-vérifier la portée et la syntaxe juste avant écriture
  const inCommands = p.abs.startsWith(COMMANDS_DIR + path.sep)
  const inLib       = p.abs.startsWith(LIB_DIR + path.sep)
  if (!inCommands && !inLib) {
    clearProposal(senderJid)
    return await sendMessage(sock, sender, box('🕷️ REFUSÉ', `│  Chemin hors de portée, rien n'a été écrit.`))
  }
  const syntax = await validateSyntax(p.code)
  if (!syntax.ok) {
    clearProposal(senderJid)
    return await sendMessage(sock, sender, box('🕷️ ANNULÉ', `│  Re-vérification syntaxe échouée juste avant\n│  écriture. Rien n'a été modifié.`))
  }

  let backupPath = null
  if (p.action === 'edit') backupPath = backupFile(p.abs, p.rel)

  fs.mkdirSync(path.dirname(p.abs), { recursive: true })
  fs.writeFileSync(p.abs, p.code, 'utf8')
  clearProposal(senderJid)

  await sendMessage(sock, sender, box('✅ APPLIQUÉ', [
    `│  ${p.rel} a été ${p.action === 'create' ? 'créé' : 'modifié'} avec succès.`,
    p.rel.startsWith('commands/') ? `│  Disponible immédiatement (sans redémarrage).` : `│  Redémarre le bot pour appliquer ce changement partout.`,
    backupPath ? `│\n│  💾 Sauvegarde : data/jarvis_backups/${path.basename(backupPath)}` : null,
    backupPath ? `│  ${prefix}jarvis rollback ${p.rel} pour revenir en arrière.` : null,
  ].filter(Boolean)))
}

async function doCancel(sock, sender, senderJid) {
  const existed = !!getProposal(senderJid)
  clearProposal(senderJid)
  await sendMessage(sock, sender, box('🚫 ANNULÉ', existed ? `│  Proposition annulée, rien n'a été écrit.` : `│  Rien à annuler.`))
}

async function doRollback(sock, sender, senderJid, restArgs) {
  const rawTarget = restArgs[0]
  if (!rawTarget) {
    return await sendMessage(sock, sender, box('🤖 ROLLBACK', `│  Syntaxe : .jarvis rollback <commande ou chemin>`))
  }
  const target = safeResolveFixTarget(rawTarget)
  if (!target) {
    return await sendMessage(sock, sender, box('🕷️ CIBLE INVALIDE', `│  Chemin hors de portée.`))
  }
  const backup = findLatestBackup(target.rel)
  if (!backup) {
    return await sendMessage(sock, sender, box('🕷️ AUCUNE SAUVEGARDE', `│  Pas de sauvegarde trouvée pour ${target.rel}.`))
  }
  fs.copyFileSync(backup, target.abs)
  await sendMessage(sock, sender, box('✅ RESTAURÉ', `│  ${target.rel} restauré depuis :\n│  ${path.basename(backup)}`))
}
