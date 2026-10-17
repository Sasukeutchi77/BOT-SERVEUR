// lib/newsletterMessageCache.js
// ╔══════════════════════════════════════════════╗
// ║  CACHE DES MESSAGES TRANSFÉRÉS DE CHAÎNE     ║
// ║  Permet de retrouver l'info chaîne à partir  ║
// ║  d'un message cité (reply).                  ║
// ╚══════════════════════════════════════════════╝

const CACHE     = new Map()    // key: messageId  →  { newsletterJid, serverMessageId, ts }
const TTL_MS    = 24 * 60 * 60 * 1000   // 24h
const MAX_SIZE  = 2000

/**
 * Scanner récursif : retourne le PREMIER forwardedNewsletterMessageInfo
 * trouvé n'importe où dans l'objet (couvre viewOnce/ephemeral/etc).
 */
function findForwardedNewsletter(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 8) return null
  if (obj.forwardedNewsletterMessageInfo?.newsletterJid) {
    return obj.forwardedNewsletterMessageInfo
  }
  for (const k of Object.keys(obj)) {
    const v = obj[k]
    if (v && typeof v === 'object') {
      const found = findForwardedNewsletter(v, depth + 1)
      if (found) return found
    }
  }
  return null
}

/**
 * Si le message contient une info de chaîne, on la stocke
 * indexée par l'ID du message (pour la retrouver plus tard via reply).
 */
export function rememberIfChannelMessage(msg) {
  try {
    const id = msg?.key?.id
    if (!id) return false

    const fwd = findForwardedNewsletter(msg?.message)
    if (!fwd?.newsletterJid || fwd?.serverMessageId == null) return false

    const serverMessageId = parseInt(fwd.serverMessageId, 10)
    if (!serverMessageId || serverMessageId <= 0) return false

    console.log(`📡 [CHANNEL CACHE] Stored msg ${id} → ${fwd.newsletterJid}#${serverMessageId}`)

    // Nettoyage TTL
    const now = Date.now()
    for (const [k, v] of CACHE) {
      if (now - v.ts > TTL_MS) CACHE.delete(k)
    }
    // Limite de taille
    while (CACHE.size >= MAX_SIZE) {
      const firstKey = CACHE.keys().next().value
      CACHE.delete(firstKey)
    }

    CACHE.set(id, {
      newsletterJid : fwd.newsletterJid,
      serverMessageId,
      newsletterName: fwd.newsletterName || null,
      ts            : now
    })
    return true
  } catch { return false }
}

/**
 * Retrouve l'info chaîne associée à un ID de message.
 */
export function getChannelInfoByMsgId(id) {
  if (!id) return null
  const entry = CACHE.get(id)
  if (!entry) return null
  if (Date.now() - entry.ts > TTL_MS) {
    CACHE.delete(id)
    return null
  }
  return {
    newsletterJid  : entry.newsletterJid,
    serverMessageId: entry.serverMessageId,
    newsletterName : entry.newsletterName
  }
}

export function _debugSize() { return CACHE.size }
