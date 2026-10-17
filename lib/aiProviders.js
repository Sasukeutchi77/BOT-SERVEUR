// lib/aiProviders.js
// ╔══════════════════════════════════════════════════════════════════╗
// ║  MULTI-IA POUR .jarvis — Groq + OpenAI (ChatGPT) + Gemini         ║
// ║                                                                    ║
// ║  Aucune nouvelle dépendance npm : les 3 API sont appelées en REST ║
// ║  via fetch() natif (Node 18+), exactement comme .jarvis le        ║
// ║  faisait déjà avec Groq. Rien à installer dans package.json.      ║
// ║                                                                    ║
// ║  - Chat texte      : fallback en chaîne (si un fournisseur échoue ║
// ║    ou n'a pas de clé configurée, on passe automatiquement au      ║
// ║    suivant — le bot ne tombe en panne que si LES TROIS échouent). ║
// ║  - Vision (image)  : uniquement OpenAI/Gemini (Groq n'est pas     ║
// ║    garanti compatible image selon le modèle configuré), avec      ║
// ║    fallback entre les deux.                                       ║
// ║  - Mode "council"  : interroge TOUTES les IA dispo EN PARALLÈLE   ║
// ║    puis fusionne leurs réponses en une seule — la vraie            ║
// ║    réalisation de "3 IA qui travaillent ensemble comme une seule". ║
// ╚══════════════════════════════════════════════════════════════════╝

const TIMEOUT_MS = 30000

async function fetchWithTimeout(url, options, timeout = TIMEOUT_MS) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Délai dépassé (30s)')
    throw e
  } finally {
    clearTimeout(id)
  }
}

// ─────────────────────────────────────────────────────────────────
// GROQ
// ─────────────────────────────────────────────────────────────────
const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b'

async function groqChat(history, systemPrompt, question, opts = {}) {
  const apiKey = process.env.CLE_GROQ
  if (!apiKey) throw new Error('CLE_GROQ non configurée')

  const res = await fetchWithTimeout(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: opts.model || GROQ_MODEL,
      messages: [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: question }],
      max_tokens: opts.maxTokens || 1024,
      temperature: opts.temperature ?? 0.7
    })
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`Groq [${res.status}]: ${err.slice(0, 200)}`)
  }
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('Réponse Groq vide')
  return text
}

// Groq n'est volontairement PAS utilisé pour la vision par défaut : le
// modèle configuré dans GROQ_MODEL n'est pas garanti compatible image.
async function groqVision() {
  throw new Error("Groq n'est pas utilisé pour l'analyse d'image (utilise OpenAI ou Gemini)")
}

// ─────────────────────────────────────────────────────────────────
// OPENAI (ChatGPT)
// ─────────────────────────────────────────────────────────────────
const OPENAI_URL   = 'https://api.openai.com/v1/chat/completions'
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

async function openaiChat(history, systemPrompt, question, opts = {}) {
  const apiKey = process.env.CLE_OPENAI
  if (!apiKey) throw new Error('CLE_OPENAI non configurée')

  const res = await fetchWithTimeout(OPENAI_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: opts.model || OPENAI_MODEL,
      messages: [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: question }],
      max_tokens: opts.maxTokens || 1024,
      temperature: opts.temperature ?? 0.7
    })
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`OpenAI [${res.status}]: ${err.slice(0, 200)}`)
  }
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('Réponse OpenAI vide')
  return text
}

async function openaiVision(imageBuffer, mimetype, prompt, systemPrompt, opts = {}) {
  const apiKey = process.env.CLE_OPENAI
  if (!apiKey) throw new Error('CLE_OPENAI non configurée')

  const base64 = imageBuffer.toString('base64')
  const res = await fetchWithTimeout(OPENAI_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: opts.model || OPENAI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:${mimetype};base64,${base64}` } }
        ] }
      ],
      max_tokens: opts.maxTokens || 1024
    })
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`OpenAI Vision [${res.status}]: ${err.slice(0, 200)}`)
  }
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('Réponse OpenAI Vision vide')
  return text
}

// ─────────────────────────────────────────────────────────────────
// GEMINI
// ─────────────────────────────────────────────────────────────────
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash'

function geminiUrl(model) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.CLE_GEMINI}`
}

// Convertit l'historique interne { role: 'user'|'assistant' } vers le
// format Gemini { role: 'user'|'model' } (Gemini n'utilise pas "assistant").
function toGeminiContents(history, question, imagePart = null) {
  const contents = history.map(h => ({
    role: h.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: h.content }]
  }))
  const parts = [{ text: question }]
  if (imagePart) parts.push(imagePart)
  contents.push({ role: 'user', parts })
  return contents
}

async function geminiChat(history, systemPrompt, question, opts = {}) {
  const apiKey = process.env.CLE_GEMINI
  if (!apiKey) throw new Error('CLE_GEMINI non configurée')

  const res = await fetchWithTimeout(geminiUrl(opts.model || GEMINI_MODEL), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: toGeminiContents(history, question),
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { maxOutputTokens: opts.maxTokens || 1024, temperature: opts.temperature ?? 0.7 }
    })
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`Gemini [${res.status}]: ${err.slice(0, 200)}`)
  }
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('').trim()
  if (!text) throw new Error('Réponse Gemini vide (filtrée ou bloquée ?)')
  return text
}

async function geminiVision(imageBuffer, mimetype, prompt, systemPrompt, opts = {}) {
  const apiKey = process.env.CLE_GEMINI
  if (!apiKey) throw new Error('CLE_GEMINI non configurée')

  const imagePart = { inline_data: { mime_type: mimetype, data: imageBuffer.toString('base64') } }
  const res = await fetchWithTimeout(geminiUrl(opts.model || GEMINI_MODEL), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: toGeminiContents([], prompt, imagePart),
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { maxOutputTokens: opts.maxTokens || 1024 }
    })
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`Gemini Vision [${res.status}]: ${err.slice(0, 200)}`)
  }
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('').trim()
  if (!text) throw new Error('Réponse Gemini Vision vide (filtrée ou bloquée ?)')
  return text
}

// ─────────────────────────────────────────────────────────────────
// Registre + disponibilité
// ─────────────────────────────────────────────────────────────────
const PROVIDERS = {
  groq:   { name: 'groq',   label: 'Groq',             envKey: 'CLE_GROQ',   chat: groqChat,   vision: groqVision },
  openai: { name: 'openai', label: 'ChatGPT (OpenAI)', envKey: 'CLE_OPENAI', chat: openaiChat, vision: openaiVision },
  gemini: { name: 'gemini', label: 'Gemini (Google)',  envKey: 'CLE_GEMINI', chat: geminiChat, vision: geminiVision },
}

export function isProviderAvailable(name) {
  const p = PROVIDERS[name]
  return !!(p && process.env[p.envKey])
}

export function getAvailableProviders() {
  return Object.values(PROVIDERS).filter(p => process.env[p.envKey])
}

// Groq exclu par défaut de la vision (voir groqVision ci-dessus)
export function getVisionCapableProviders() {
  return getAvailableProviders().filter(p => p.name !== 'groq')
}

// purpose 'chat' = priorité vitesse/coût (Groq d'abord).
// purpose 'code' = priorité qualité de génération (OpenAI/Gemini d'abord,
// Groq en dernier recours) — utilisé par lib/jarvisCoder.js.
const PRIORITY = {
  chat: ['groq', 'openai', 'gemini'],
  code: ['openai', 'gemini', 'groq'],
}

// ─────────────────────────────────────────────────────────────────
// Fallback en chaîne — chat texte
// ─────────────────────────────────────────────────────────────────
export async function chatWithFallback(history, systemPrompt, question, { purpose = 'chat', forceProvider = null, opts = {} } = {}) {
  const order = forceProvider ? [forceProvider] : (PRIORITY[purpose] || PRIORITY.chat)
  const errors = []
  for (const name of order) {
    if (!PROVIDERS[name]) continue
    if (!isProviderAvailable(name)) { errors.push(`${PROVIDERS[name].label}: clé API absente`); continue }
    try {
      const text = await PROVIDERS[name].chat(history, systemPrompt, question, opts)
      return { text, provider: name }
    } catch (e) {
      errors.push(`${PROVIDERS[name].label}: ${e.message}`)
    }
  }
  throw new Error(`Toutes les IA ont échoué —\n${errors.join('\n')}`)
}

// ─────────────────────────────────────────────────────────────────
// Fallback en chaîne — vision (analyse d'image)
// ─────────────────────────────────────────────────────────────────
export async function visionWithFallback(imageBuffer, mimetype, prompt, systemPrompt, { forceProvider = null, opts = {} } = {}) {
  const candidates = forceProvider ? [forceProvider] : getVisionCapableProviders().map(p => p.name)
  if (!candidates.length) {
    throw new Error("Aucune IA compatible image configurée (ajoute CLE_OPENAI ou CLE_GEMINI dans .env)")
  }
  const errors = []
  for (const name of candidates) {
    if (!PROVIDERS[name]) continue
    if (!isProviderAvailable(name)) { errors.push(`${PROVIDERS[name].label}: clé API absente`); continue }
    try {
      const text = await PROVIDERS[name].vision(imageBuffer, mimetype, prompt, systemPrompt, opts)
      return { text, provider: name }
    } catch (e) {
      errors.push(`${PROVIDERS[name].label}: ${e.message}`)
    }
  }
  throw new Error(`Analyse d'image impossible —\n${errors.join('\n')}`)
}

// ─────────────────────────────────────────────────────────────────
// Mode "council" — toutes les IA dispo répondent, puis fusion en UNE
// seule réponse. C'est la vraie mise en œuvre de "3 IA qui travaillent
// ensemble comme un seul et même assistant".
// ─────────────────────────────────────────────────────────────────
export async function councilChat(history, systemPrompt, question) {
  const available = getAvailableProviders()
  if (!available.length) throw new Error('Aucune IA configurée (CLE_GROQ / CLE_OPENAI / CLE_GEMINI)')

  const settled = await Promise.allSettled(available.map(p => p.chat(history, systemPrompt, question)))

  const successes = settled
    .map((r, i) => r.status === 'fulfilled' ? { provider: available[i].name, text: r.value } : null)
    .filter(Boolean)

  if (!successes.length) {
    const errs = settled.map((r, i) => `${available[i].label}: ${r.reason?.message || r.reason}`).join('\n')
    throw new Error(`Toutes les IA ont échoué —\n${errs}`)
  }
  if (successes.length === 1) return { text: successes[0].text, providers: [successes[0].provider] }

  const synthPrompt =
    `Voici ${successes.length} réponses indépendantes à la même question, générées par différents modèles d'IA. ` +
    `Synthétise-les en UNE SEULE réponse claire, complète et cohérente qui garde le meilleur de chacune et corrige les éventuelles contradictions. ` +
    `Ne mentionne JAMAIS qu'il y a plusieurs IA, ni leurs noms — réponds comme si c'était toi-même qui répondais directement.\n\n` +
    `Question originale : ${question}\n\n` +
    successes.map((s, i) => `── Réponse ${i + 1} ──\n${s.text}`).join('\n\n')

  for (const name of ['groq', 'openai', 'gemini']) {
    if (!isProviderAvailable(name)) continue
    try {
      const text = await PROVIDERS[name].chat([], systemPrompt, synthPrompt, { maxTokens: 1200 })
      return { text, providers: successes.map(s => s.provider) }
    } catch { /* essaie le fournisseur suivant pour la synthèse */ }
  }
  // Si même la synthèse échoue, on renvoie la meilleure réponse individuelle plutôt que rien.
  return { text: successes[0].text, providers: successes.map(s => s.provider) }
}

export default {
  isProviderAvailable,
  getAvailableProviders,
  getVisionCapableProviders,
  chatWithFallback,
  visionWithFallback,
  councilChat,
}
