// lib/jarvisActions.js
// ╔══════════════════════════════════════════════════════════════════╗
// ║  JARVIS — EXÉCUTION D'ACTIONS EN LANGAGE NATUREL                  ║
// ║  "jarvis ferme le groupe" → détecte l'intention → exécute la      ║
// ║  commande correspondante (ex: group close), avec confirmation     ║
// ║  pour les actions de masse/irréversibles.                        ║
// ║                                                                    ║
// ║  Garde-fous, dans l'ordre où ils s'appliquent :                  ║
// ║   1. Catalogue FERMÉ de commandes éligibles : construit           ║
// ║      dynamiquement depuis commandRegistry.js, MOINS une liste     ║
// ║      d'exclusion (eval/exec, contrôle du process, gestion des     ║
// ║      sudo/premium, pairing...) qui restent commandes tapées       ║
// ║      UNIQUEMENT — trop dangereuses pour un malentendu de langage. ║
// ║   2. L'IA ne fait QUE choisir quelle commande + quels arguments — ║
// ║      l'exécution passe ENSUITE par evaluateCommandAccess(), le    ║
// ║      même contrôle de permissions que si l'utilisateur avait      ║
// ║      tapé la commande lui-même (admin/owner/sudo). Jarvis n'a     ║
// ║      donc jamais plus de droits que la personne qui lui parle.    ║
// ║   3. Confirmation obligatoire pour les actions de masse           ║
// ║      (kickall, kickallv2) avant exécution réelle.                ║
// ║   4. Si l'IA propose une commande hors catalogue ou invalide,     ║
// ║      on retombe silencieusement en mode conversation normale      ║
// ║      plutôt que de risquer une mauvaise exécution.                ║
// ╚══════════════════════════════════════════════════════════════════╝

import { loadCommand, LOAD_ERROR } from './messageHandler.js'
import { evaluateCommandAccess, checkCommandCooldown, listCommandMetas } from './commandRegistry.js'
import { chatWithFallback } from './aiProviders.js'

// Jamais déclenchables en langage naturel — restent des commandes tapées
// explicitement. Code arbitraire, contrôle du process, escalade de
// privilèges, et "domination" (double confirmation dédiée déjà en place,
// on respecte ce garde-fou existant plutôt que de le contourner).
const EXCLUDED_FROM_NLU = new Set([
  'jarvis',
  'eval', 'exec',
  'restart', 'stop', 'shutdown', 'reload',
  'backup', 'restore', 'maintenance',
  'addsudo', 'setsudo', 'delsudo', 'removesudo', 'sudo', 'sessionsudo',
  'addpremium', 'removepremium',
  'broadcast', 'domination',
  'pairing', 'stoppair', 'mypair',
])

// Actions de masse / irréversibles pour tout le groupe : confirmation
// J.A.R.V.I.S. obligatoire avant exécution, même pour l'Owner.
const CONFIRM_REQUIRED = new Set(['kickall', 'kickallv2'])

// Commandes dont le fichier exige lui-même un argument "confirm" — une
// fois la confirmation J.A.R.V.I.S. obtenue, on le lui fournit automatiquement.
const NEEDS_CONFIRM_ARG = new Set(['kickallv2'])

const pendingActions = new Map() // senderJid -> { command, args, msg, ctx, summary, createdAt }
const ACTION_TTL_MS = 5 * 60 * 1000

// ── Résolution défensive du JID (évite les crashs si ctx est incomplet) ──
function resolveSenderJid(ctx, msg) {
    return ctx?.senderJid || msg?.key?.participant || msg?.key?.remoteJid || 'unknown'
}

function getCatalog() {
  return listCommandMetas().filter(m => !EXCLUDED_FROM_NLU.has(m.command))
}

function catalogText() {
  return getCatalog()
    .map(m => `- ${m.command} (${m.permission}) : ${m.description}`)
    .join('\n')
}

function stripFences(text) {
  const trimmed = text.trim()
  const m = trimmed.match(/^```[a-zA-Z]*\n([\s\S]*?)\n?```$/)
  return (m ? m[1] : trimmed).trim()
}

// ─────────────────────────────────────────────────────────────────
// Classification d'intention : "chat" normal ou "action" à exécuter
// ─────────────────────────────────────────────────────────────────
export async function classifyIntent(question, ctx) {
  const isGroup = ctx?.isGroup ?? false
  const systemPrompt = [
    `Tu analyses un message envoyé à un bot WhatsApp pour déterminer s'il s'agit :`,
    `(a) d'une question/discussion normale, OU`,
    `(b) d'une demande d'ACTION correspondant à une commande précise du bot ci-dessous.`,
    ``,
    `Contexte : ${isGroup ? 'message envoyé DANS UN GROUPE' : 'message privé (pas de commandes de groupe possibles)'}.`,
    ``,
    `Commandes disponibles (nom (permission) : description) :`,
    catalogText(),
    ``,
    `Réponds STRICTEMENT en JSON, une seule ligne, sans markdown, sans explication :`,
    `- Si c'est une question normale : {"type":"chat"}`,
    `- Si c'est une demande d'action claire et sans ambiguïté : {"type":"action","command":"<nom exact de la liste>","args":"<arguments texte simples si besoin, sinon vide>","summary":"<résumé court en français de l'action, à la 3e personne, ex: 'fermer le groupe'>"}`,
    ``,
    `Règles :`,
    `- Ne choisis "action" QUE si l'intention est explicite et non ambiguë (ex: "ferme le groupe", "kick cette personne", "mute-le pendant 10 min"). En cas de doute, réponds {"type":"chat"}.`,
    `- N'invente JAMAIS de nom de commande hors de la liste fournie.`,
    `- Pour "args", ne mets QUE ce qui est explicitement dans le message (ex: une durée, un motif) — ne mets JAMAIS de nom/numéro de personne en "args", les mentions/réponses WhatsApp sont gérées séparément.`,
  ].join('\n')

  let raw
  try {
    const result = await chatWithFallback([], systemPrompt, question, { purpose: 'chat', opts: { maxTokens: 200, temperature: 0.1 } })
    raw = result.text
  } catch {
    return { type: 'chat' } // en cas d'échec de classification, on retombe en conversation normale
  }

  try {
    const parsed = JSON.parse(stripFences(raw))
    if (parsed?.type === 'action' && typeof parsed.command === 'string') {
      const allowed = getCatalog().some(m => m.command === parsed.command)
      if (!allowed) return { type: 'chat' } // commande hallucinée/hors catalogue → repli sûr
      return {
        type: 'action',
        command: parsed.command,
        args: typeof parsed.args === 'string' ? parsed.args : '',
        summary: typeof parsed.summary === 'string' ? parsed.summary : parsed.command,
      }
    }
  } catch { /* JSON invalide → repli sûr */ }

  return { type: 'chat' }
}

// ─────────────────────────────────────────────────────────────────
// Exécution réelle — passe TOUJOURS par evaluateCommandAccess()
// ✅ CORRIGÉ : tout le corps est enveloppé dans try/catch — une
//    commande qui throw renvoie { ok:false } au lieu de crasher
//    le process (chemin confirm inclus).
// ─────────────────────────────────────────────────────────────────
async function runCommand(sock, sender, msg, ctx, command, argsArray) {
  try {
    const fn = await loadCommand(command)
    if (!fn || fn === LOAD_ERROR) {
      return { ok: false, error: `Commande "${command}" indisponible (erreur de chargement).` }
    }

    const senderJid = resolveSenderJid(ctx, msg)

    const access = evaluateCommandAccess(command, ctx)
    if (!access.ok) {
      return { ok: false, error: access.reason }
    }

    const cooldown = checkCommandCooldown(command, senderJid, ctx)
    if (!cooldown.ok) {
      return { ok: false, error: `Patientez encore ${cooldown.remaining}s avant de réutiliser cette action.` }
    }

    await fn(sock, sender, argsArray, msg, ctx)
    return { ok: true }
  } catch (e) {
    console.error(`❌ jarvisActions: la commande "${command}" a planté:`, e?.message || e)
    return { ok: false, error: e?.message || 'Erreur interne lors de l\'exécution.' }
  }
}

// ─────────────────────────────────────────────────────────────────
// API haut niveau appelée depuis commands/jarvis.js
// ─────────────────────────────────────────────────────────────────

// Retourne { handled: true, ... } si une action a été traitée (exécutée,
// refusée, ou mise en attente de confirmation) ; { handled: false } si le
// message doit être traité comme une question normale.
export async function tryHandleAction(sock, sender, msg, ctx, question) {
  const intent = await classifyIntent(question, ctx)
  if (intent.type !== 'action') return { handled: false }

  const { command, args, summary } = intent
  const argsArray = args ? args.split(/\s+/).filter(Boolean) : []
  const senderJid = resolveSenderJid(ctx, msg)

  if (CONFIRM_REQUIRED.has(command)) {
    pendingActions.set(senderJid, { command, args: argsArray, msg, ctx, summary, createdAt: Date.now() })
    return {
      handled: true,
      needsConfirm: true,
      summary,
    }
  }

  const result = await runCommand(sock, sender, msg, ctx, command, argsArray)
  return { handled: true, executed: true, ok: result.ok, error: result.error, summary }
}

export async function confirmPendingAction(sock, sender, senderJid) {
  const p = pendingActions.get(senderJid)
  if (!p || Date.now() - p.createdAt > ACTION_TTL_MS) {
    pendingActions.delete(senderJid)
    return { found: false }
  }
  pendingActions.delete(senderJid)

  const argsArray = NEEDS_CONFIRM_ARG.has(p.command) ? [...p.args, 'confirm'] : p.args
  const result = await runCommand(sock, sender, p.msg, p.ctx, p.command, argsArray)
  return { found: true, ok: result.ok, error: result.error, summary: p.summary }
}

export function cancelPendingAction(senderJid) {
  const existed = pendingActions.has(senderJid)
  pendingActions.delete(senderJid)
  return existed
}

export function hasPendingAction(senderJid) {
  const p = pendingActions.get(senderJid)
  if (!p) return false
  if (Date.now() - p.createdAt > ACTION_TTL_MS) { pendingActions.delete(senderJid); return false }
  return true
}
