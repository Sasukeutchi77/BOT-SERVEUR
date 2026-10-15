// lib/antipurgeTracker.js — VERSION CORRIGÉE v2
// ╔══════════════════════════════════════════════════════════╗
// ║  TRACKER ANTI-PURGE (suppression de membres)             ║
// ║  - Fenêtre : 5 secondes                                  ║
// ║  - Seuil   : plus de 2 retraits (donc >= 3)              ║
// ║  - Action  : révoque tous les admins + verrouille groupe ║
// ╚══════════════════════════════════════════════════════════╝

// ════════════════════════════════════════════════════════════════
//  CONSTANTES EXPORTÉES
// ════════════════════════════════════════════════════════════════

export const PURGE_WINDOW_MS = 5 * 1000   // 5 secondes (fenêtre de détection)
export const PURGE_THRESHOLD = 3          // > 2 retraits = déclenchement (3, 4, 5...)
export const TIME_WINDOW     = PURGE_WINDOW_MS  // alias rétro-compat

// Délai anti-rebond : on ne re-déclenche pas l'action sur le même groupe
// pendant cette durée après un déclenchement.
export const PURGE_COOLDOWN_MS = 30 * 1000

// ════════════════════════════════════════════════════════════════
//  MAP PRINCIPALE EXPORTÉE
//  - clé "config:<groupJid>"   → { active: boolean }
//  - clé "<groupJid>"          → [{ jid, timestamp }, ...]
//  - clé "lastTrigger:<jid>"   → timestamp dernier déclenchement
// ════════════════════════════════════════════════════════════════

export const purgeTracker = new Map()

// ════════════════════════════════════════════════════════════════
//  FONCTIONS NOMMÉES
// ════════════════════════════════════════════════════════════════

/**
 * Enregistre le retrait d'un membre dans la fenêtre glissante.
 */
export function trackRemoval(groupJid, memberJid) {
  const now    = Date.now()
  const list   = purgeTracker.get(groupJid) || []
  const recent = list.filter(e => (now - e.timestamp) < PURGE_WINDOW_MS)
  recent.push({ jid: memberJid, timestamp: now })
  purgeTracker.set(groupJid, recent)
  return recent.length
}

/**
 * Vrai si le nombre de retraits dans la fenêtre dépasse le seuil.
 * (PURGE_THRESHOLD = 3 → vrai à partir de 3 retraits en < 5 s)
 */
export function isPurging(groupJid) {
  const list   = purgeTracker.get(groupJid) || []
  const now    = Date.now()
  const recent = list.filter(e => (now - e.timestamp) < PURGE_WINDOW_MS)
  return recent.length >= PURGE_THRESHOLD
}

/**
 * Anti-purge activé pour ce groupe ?
 */
export function isAntipurgeActive(groupJid) {
  const config = purgeTracker.get(`config:${groupJid}`)
  return !!(config?.active)
}

/**
 * Anti-rebond : empêche de déclencher l'action plusieurs fois d'affilée
 * sur le même groupe.
 */
export function canTrigger(groupJid) {
  const last = purgeTracker.get(`lastTrigger:${groupJid}`) || 0
  return (Date.now() - last) > PURGE_COOLDOWN_MS
}

export function markTriggered(groupJid) {
  purgeTracker.set(`lastTrigger:${groupJid}`, Date.now())
  // On vide aussi la fenêtre pour repartir propre
  purgeTracker.delete(groupJid)
}

/**
 * Réinitialiser le tracker de retraits pour un groupe.
 */
export function resetTracker(groupJid) {
  purgeTracker.delete(groupJid)
}

// ════════════════════════════════════════════════════════════════
//  EXPORT PAR DÉFAUT
//  Compatibilité avec index.js qui faisait `import('...').default`
//  et appelait `.track(id, jid)`.
// ════════════════════════════════════════════════════════════════

const antipurge = {
  track: trackRemoval,
  isPurging,
  isAntipurgeActive,
  canTrigger,
  markTriggered,
  resetTracker,
  PURGE_WINDOW_MS,
  PURGE_THRESHOLD,
  TIME_WINDOW,
  PURGE_COOLDOWN_MS,
}

export default antipurge
