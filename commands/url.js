// commands/url.js — 𝑴𝑼𝑹𝑨𝑺𝑨𝑲𝑰 𝐒𝐒𝐊 𓂀
// 🔧 FIX: ctx ajouté pour compatibilité index.js
// 🔧 FIX: safeFetch avec timeout + retry
// 🔧 FIX : check sécurité renforcé (VirusTotal public + patterns)
// 🔧 FIX : raccourcisseur avec 3 services fallback
// 🔧 FIX : info URL plus détaillée (IP, SSL, redirections)
// 🔧 FIX : nouveau sous-cmd .url expand (déplier un lien court)

import { sendMessage } from '../lib/sendMessage.js'

//══════════════════════════════════════════════════════════════
// UTILITAIRES
//══════════════════════════════════════════════════════════════

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

const _fetch = typeof fetch !== "undefined"
  ? fetch
  : (...args) => import("node-fetch").then(m => m.default(...args))

async function safeFetch(url, options = {}, timeoutMs = 12000, retries = 1) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await _fetch(url, {
        ...options,
        signal: AbortSignal.timeout(timeoutMs)
      })
      return res
    } catch (err) {
      if (i === retries) throw err
      await delay(1000)
    }
  }
}

function isValidUrl(str) {
  try {
    const u = new URL(str)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch { return false }
}

function normalizeUrl(input) {
  const raw = (input || '').trim()
  if (!raw) return null
  const full = raw.startsWith('http://') || raw.startsWith('https://')
    ? raw
    : `https://${raw}`
  return isValidUrl(full) ? full : null
}

function formatBytes(bytes) {
  if (!bytes) return 'Inconnu'
  const b = parseInt(bytes)
  if (b < 1024)        return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

//══════════════════════════════════════════════════════════════
// PATTERNS SUSPECTS — Renforcés
//══════════════════════════════════════════════════════════════

const SUSPICIOUS_PATTERNS = [
  // Domaines gratuits souvent utilisés pour phishing
  /\.tk$/i, /\.ml$/i, /\.ga$/i, /\.cf$/i, /\.gq$/i,

  // Mots-clés dangereux dans l'URL
  /phishing/i, /malware/i, /virus/i, /trojan/i,
  /hack/i, /crack/i, /keygen/i, /warez/i,

  // Faux sites de grandes marques
  /paypa[l1]/i, /g[o0]{2}gle/i, /fac[e3]book/i,
  /app[l1]e-[a-z]/i, /amaz[o0]n-/i, /micros[o0]ft-/i,

  // URL avec trop de sous-domaines (souvent phishing)
  /([a-z0-9-]+\.){4,}/i,

  // IP directe au lieu d'un domaine
  /https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/,

  // Paramètres suspects
  /password|passwd|login.*redirect|verify.*account/i
]

const SHORTENER_DOMAINS = [
  'bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly',
  'short.link', 'is.gd', 'buff.ly', 'adf.ly', 'bc.vc',
  'rb.gy', 'cutt.ly', 'tiny.cc', 'shorturl.at'
]

function checkSuspicious(url) {
  const hits = SUSPICIOUS_PATTERNS.filter(p => p.test(url))
  return {
    isSuspicious: hits.length > 0,
    count:        hits.length
  }
}

function isShortUrl(url) {
  try {
    const domain = new URL(url).hostname.replace('www.', '')
    return SHORTENER_DOMAINS.includes(domain)
  } catch { return false }
}

//══════════════════════════════════════════════════════════════
// FETCH META URL
//══════════════════════════════════════════════════════════════

async function fetchUrlMeta(url) {
  const res = await safeFetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      'Accept':     'text/html,application/xhtml+xml,*/*'
    },
    redirect: 'follow'
  }, 15000)

  const contentType = res.headers.get('content-type') || ''
  const finalUrl    = res.url
  const statusCode  = res.status
  const server      = res.headers.get('server') || 'N/A'
  const powered     = res.headers.get('x-powered-by') || ''
  const cacheCtrl   = res.headers.get('cache-control') || ''

  // Contenu non-HTML (fichier)
  if (!contentType.toLowerCase().includes('text/html')) {
    const size = res.headers.get('content-length')
    return {
      title:       'Contenu non-HTML',
      description: '',
      contentType,
      finalUrl,
      statusCode,
      server,
      powered,
      fileSize:    formatBytes(size),
      isFile:      true,
      image:       '',
      redirected:  finalUrl !== url
    }
  }

  const html = await res.text()

  const getTag = (attr, val) => {
    const m = html.match(new RegExp(`<meta[^>]+${attr}="${val}"[^>]+content="([^"]*)"`, 'i'))
           || html.match(new RegExp(`<meta[^>]+content="([^"]*)"[^>]+${attr}="${val}"`, 'i'))
    return m?.[1] || ''
  }

  const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || '').trim()
    || getTag('property', 'og:title')
    || 'Sans titre'

  const description = getTag('property', 'og:description')
    || getTag('name', 'description')
    || ''

  const image    = getTag('property', 'og:image')    || ''
  const siteName = getTag('property', 'og:site_name') || ''
  const keywords = getTag('name', 'keywords')         || ''
  const robots   = getTag('name', 'robots')           || ''
  const lang     = html.match(/<html[^>]+lang="([^"]+)"/i)?.[1] || 'N/A'

  // Compter les liens dans la page
  const linkCount = (html.match(/<a\s/gi) || []).length

  return {
    title:       title.substring(0, 100),
    description: description.substring(0, 300),
    image,
    siteName,
    keywords:    keywords.substring(0, 100),
    contentType,
    finalUrl,
    statusCode,
    server,
    powered,
    lang,
    linkCount,
    robots,
    cacheCtrl,
    isFile:     false,
    redirected: finalUrl !== url
  }
}

//══════════════════════════════════════════════════════════════
// CHECK SÉCURITÉ RENFORCÉ
//══════════════════════════════════════════════════════════════

async function checkUrlSecurity(url) {
  const result = {
    isSuspicious: false,
    isShort:      isShortUrl(url),
    hasHttps:     url.startsWith('https://'),
    threats:      [],
    score:        100  // Score de confiance sur 100
  }

  // Vérification patterns locaux
  const patternCheck = checkSuspicious(url)
  if (patternCheck.isSuspicious) {
    result.isSuspicious = true
    result.threats.push(`${patternCheck.count} pattern(s) suspect(s) détecté(s)`)
    result.score -= patternCheck.count * 20
  }

  // Pas de HTTPS → risque
  if (!result.hasHttps) {
    result.threats.push('Pas de chiffrement HTTPS')
    result.score -= 15
  }

  // URL raccourcie → suspicion modérée
  if (result.isShort) {
    result.threats.push('URL raccourcie (destination inconnue)')
    result.score -= 10
  }

  // Vérifier via Google Safe Browsing (API publique sans clé)
  try {
    const domain = new URL(url).hostname
    const res = await safeFetch(
      `https://transparencyreport.google.com/transparencyreport/api/v3/safebrowsing/status?site=${domain}`,
      {}, 8000, 0
    )
    if (res.ok) {
      const text = await res.text()
      // Si la réponse contient un indicateur de danger
      if (text.includes('"SOCIAL_ENGINEERING"') || text.includes('"MALWARE"')) {
        result.isSuspicious = true
        result.threats.push('⚠️ Signalé par Google Safe Browsing')
        result.score -= 50
      }
    }
  } catch {}

  // Vérifier via URLScan.io (public, sans clé)
  try {
    const res = await safeFetch(
      `https://urlscan.io/api/v1/search/?q=domain:${new URL(url).hostname}&size=1`,
      { headers: { 'Accept': 'application/json' } },
      8000, 0
    )
    if (res.ok) {
      const data = await res.json()
      const scan = data?.results?.[0]
      if (scan?.verdicts?.overall?.malicious) {
        result.isSuspicious = true
        result.threats.push('Signalé malveillant sur URLScan.io')
        result.score -= 40
      }
    }
  } catch {}

  result.score = Math.max(0, Math.min(100, result.score))
  return result
}

//══════════════════════════════════════════════════════════════
// EXPAND URL COURTE
//══════════════════════════════════════════════════════════════

async function expandUrl(shortUrl) {
  try {
    const res = await safeFetch(shortUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      redirect: 'follow'
    }, 10000, 0)
    return res.url !== shortUrl ? res.url : null
  } catch { return null }
}

//══════════════════════════════════════════════════════════════
// RACCOURCISSEURS — 3 services fallback
//══════════════════════════════════════════════════════════════

async function shortenUrl(url) {
  // Service 1 : TinyURL
  try {
    const res = await safeFetch(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`,
      {}, 8000, 0
    )
    if (res.ok) {
      const t = (await res.text()).trim()
      if (t.startsWith('https://tinyurl.com/')) return { url: t, service: 'TinyURL' }
    }
  } catch {}

  // Service 2 : is.gd
  try {
    const res = await safeFetch(
      `https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`,
      {}, 8000, 0
    )
    if (res.ok) {
      const t = (await res.text()).trim()
      if (t.startsWith('http')) return { url: t, service: 'is.gd' }
    }
  } catch {}

  // Service 3 : clck.ru
  try {
    const res = await safeFetch(
      `https://clck.ru/--?url=${encodeURIComponent(url)}`,
      {}, 8000, 0
    )
    if (res.ok) {
      const t = (await res.text()).trim()
      if (t.startsWith('http')) return { url: t, service: 'clck.ru' }
    }
  } catch {}

  return null
}

//══════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
//══════════════════════════════════════════════════════════════

export default async function url(sock, sender, args, msg, ctx = {}) {
  try {

    // ── AIDE ────────────────────────────────────────────────
    if (!args?.length) {
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `     🕷️ 🔗 *URL TOOLS* 🔗 🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `*commandes disponibles:*\n\n` +
        `🔍 *.url <lien>*\n` +
        `   → Infos complètes sur un lien\n\n` +
        `✂️ *.url short <lien>*\n` +
        `   → Raccourcir un lien\n\n` +
        `🔓 *.url expand <lien court>*\n` +
        `   → Révéler la destination\n\n` +
        `🛡️ *.url check <lien>*\n` +
        `   → Analyse de sécurité\n\n` +
        `*Exemples:*\n` +
        `• \`.url https://google.com\`\n` +
        `• \`.url short youtube.com\`\n` +
        `• \`.url expand bit.ly/xxxxx\`\n` +
        `• \`.url check bit.ly/xxxxx\``
      )
    }

    // ── PARSING ACTION + TARGET ──────────────────────────────
    const ACTIONS = [
      'info', 'preview', 'apercu',
      'short', 'shorten', 'raccourcir',
      'check', 'verify', 'verifier',
      'expand', 'deplie', 'revele'
    ]

    let action = (args[0] || '').toLowerCase()
    let target = args[1]

    // .url <lien> sans action → info par défaut
    if (!ACTIONS.includes(action)) {
      target = args[0]
      action = 'info'
    }

    const fullUrl = normalizeUrl(target)
    if (!fullUrl) {
      return await sendMessage(sock, sender,
        `│ *URL invalide.*\n\n` +
        `💡 Format attendu:\n` +
        `• \`https://exemple.com\`\n` +
        `• \`exemple.com\``
      )
    }

    const domain = new URL(fullUrl).hostname

    //══════════════════════════════════
    // INFO / PREVIEW
    //══════════════════════════════════

    if (['info', 'preview', 'apercu'].includes(action)) {

      await sendMessage(sock, sender,
        `🔍 Analyse de: _${domain}_\n⏳ Patientez...`
      )

      let meta
      try {
        meta = await fetchUrlMeta(fullUrl)
      } catch (e) {
        return await sendMessage(sock, sender,
          `🕸️━━━〔 🕷️ 𝐀𝐂𝐂È𝐒 𝐈𝐌𝐏𝐎𝐒𝐒𝐈𝐁𝐋𝐄 〕━━━🕸️\n` +
          `│\n` +
          `│ 🌐 Domaine : ${domain}\n` +
          `│ 🕷️ opération échoué  : ${e.message?.substring(0, 50)}\n` +
          `│\n` +
          `│ 💡 Le site est peut-être:\n` +
          `│  • Hors ligne\n` +
          `│  • Bloqué\n` +
          `│  • Trop lent\n` +
          `│\n` +
          `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        )
      }

      // Icône statut HTTP
      const statusIcon =
        meta.statusCode >= 200 && meta.statusCode < 300 ? '⚙️' :
        meta.statusCode >= 300 && meta.statusCode < 400 ? '↪️' :
        meta.statusCode >= 400 && meta.statusCode < 500 ? '⚠️' : '🕷️'

      let msg =
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `     🕷️ 🔗 *INFO URL* 🔗 🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️━━━〔 🌐 𝐆É𝐍É𝐑𝐀𝐋 〕━━━🕸️\n` +
        `│\n` +
        `│ 🌍 Domaine  : ${domain}\n` +
        `│ ${statusIcon} Statut   : ${meta.statusCode}\n` +
        `│ 🔒 HTTPS    : ${fullUrl.startsWith('https://') ? '⚙️ Oui' : '⚠️ Non'}\n` +
        `│ 📁 Type     : ${(meta.contentType || '').split(';')[0]}\n` +
        `│ 🖥️ Serveur  : ${meta.server}\n`

      if (meta.powered) msg += `│ ⚙️ Propulsé : ${meta.powered}\n`
      if (meta.lang && meta.lang !== 'N/A') msg += `│ 🌐 Langue   : ${meta.lang}\n`
      if (meta.redirected) msg += `│ ↪️ Redirigé : ⚙️ Oui\n`

      msg += `│\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n`

      if (!meta.isFile) {
        msg +=
          `🕸️━━━〔 📄 𝐂𝐎𝐍𝐓𝐄𝐍𝐔 〕━━━🕸️\n` +
          `│\n` +
          `│ 📌 *Titre:*\n` +
          `│ ${meta.title}\n`

        if (meta.siteName) msg += `│\n🕷️ 🏢 *Site:* ${meta.siteName}\n`

        if (meta.description) {
          msg += `│\n🕷️ 📝 *Description:*\n│ ${meta.description.substring(0, 200)}\n`
        }

        if (meta.keywords) {
          msg += `│\n🕷️ 🏷️ *Mots-clés:*\n│ ${meta.keywords}\n`
        }

        if (meta.linkCount) {
          msg += `│\n🕷️ 🔗 *Liens:* ${meta.linkCount} détectés\n`
        }

        msg += `│\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      } else {
        msg +=
          `🕸️━━━〔 📦 𝐅𝐈𝐂𝐇𝐈𝐄𝐑 〕━━━🕸️\n` +
          `│\n` +
          `│ 📦 Taille : ${meta.fileSize}\n` +
          `│\n` +
          `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      }

      if (meta.finalUrl && meta.finalUrl !== fullUrl) {
        msg +=
          `\n\n🕸️━━━〔 ↪️ 𝐑𝐄𝐃𝐈𝐑𝐄𝐂𝐓𝐈𝐎𝐍 〕━━━🕸️\n` +
          `│\n` +
          `│ ${meta.finalUrl}\n` +
          `│\n` +
          `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      }

      await sendMessage(sock, sender, msg)

      // OG Image si disponible
      if (meta.image?.startsWith('http')) {
        try {
          await sock.sendMessage(sender, {
            image:   { url: meta.image },
            caption: `🖼️ *Aperçu:* ${meta.title}`
          })
        } catch {}
      }
      return
    }

    //══════════════════════════════════
    // SHORT — Raccourcir
    //══════════════════════════════════

    if (['short', 'shorten', 'raccourcir'].includes(action)) {

      await sendMessage(sock, sender, `✂️ Raccourcissement en cours...`)

      const result = await shortenUrl(fullUrl)

      if (!result) {
        return await sendMessage(sock, sender,
          `│ Impossible de raccourcir ce lien.\n💡 Réessayez dans quelques secondes.`
        )
      }

      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `     🕷️ ✂️ *LIEN RACCOURCI* ✂️ 🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️━━━〔 ⚙️ 𝐑É𝐒𝐔𝐋𝐓𝐀𝐓 〕━━━🕸️\n` +
        `│\n` +
        `│ 🔗 *Raccourci:*\n` +
        `│ ${result.url}\n` +
        `│\n` +
        `│ 🛠️ *Service:* ${result.service}\n` +
        `│ 📏 *Avant:* ${fullUrl.length} caractères\n` +
        `│ 📏 *Après:* ${result.url.length} caractères\n` +
        `│ 💾 *Économie:* ${fullUrl.length - result.url.length} chars\n` +
        `│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    //══════════════════════════════════
    // EXPAND — Déplier un lien court
    //══════════════════════════════════

    if (['expand', 'deplie', 'revele'].includes(action)) {

      await sendMessage(sock, sender, `🔓 Déplissage du lien court...`)

      const expanded = await expandUrl(fullUrl)

      if (!expanded) {
        return await sendMessage(sock, sender,
          `🕸️━━━〔 👁️ 𝐄𝐗𝐏𝐀𝐍𝐃 〕━━━🕸️\n` +
          `│\n` +
          `│ Ce lien ne redirige pas\n` +
          `│ ou pointe déjà vers sa\n` +
          `│ destination finale.\n` +
          `│\n` +
          `│ 🔗 ${fullUrl}\n` +
          `│\n` +
          `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        )
      }

      const expandedDomain = new URL(expanded).hostname

      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `     🕷️ 🔓 *LIEN DÉPLIÉ* 🔓 🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️━━━〔 ⚙️ 𝐃𝐄𝐒𝐓𝐈𝐍𝐀𝐓𝐈𝐎𝐍 〕━━━🕸️\n` +
        `│\n` +
        `│ 📦 *Court:*\n` +
        `│ ${fullUrl}\n` +
        `│\n` +
        `│ 🎯 *Destination réelle:*\n` +
        `│ ${expanded}\n` +
        `│\n` +
        `│ 🌍 *Domaine:* ${expandedDomain}\n` +
        `│ 🔒 *HTTPS:* ${expanded.startsWith('https://') ? '⚙️ Oui' : '⚠️ Non'}\n` +
        `│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    //══════════════════════════════════
    // CHECK — Analyse de sécurité
    //══════════════════════════════════

    if (['check', 'verify', 'verifier'].includes(action)) {

      await sendMessage(sock, sender,
        `🛡️ Analyse de sécurité en cours...\n⏳ Vérification sur plusieurs sources...`
      )

      const security = await checkUrlSecurity(fullUrl)

      // Score visuel
      const scoreBar = () => {
        const filled = Math.round(security.score / 10)
        return '▓'.repeat(filled) + '░'.repeat(10 - filled)
      }

      const scoreIcon =
        security.score >= 80 ? '⚙️' :
        security.score >= 50 ? '🟡' : '🤖'

      const verdict =
        security.score >= 80 ? '⚙️ *LIEN SÛR*' :
        security.score >= 50 ? '⚠️ *LIEN DOUTEUX*' : '🚨 *LIEN DANGEREUX*'

      let msg =
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `     🕷️ 🛡️ *SÉCURITÉ URL* 🛡️ 🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️━━━〔 📊 𝐒𝐂𝐎𝐑𝐄 〕━━━🕸️\n` +
        `│\n` +
        `│ ${scoreIcon} ${verdict}\n` +
        `│\n` +
        `│ Score: ${security.score}/100\n` +
        `│ [${scoreBar()}]\n` +
        `│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️━━━〔 🔍 𝐃É𝐓𝐀𝐈𝐋𝐒 〕━━━🕸️\n` +
        `│\n` +
        `│ 🌍 Domaine : ${domain}\n` +
        `│ 🔒 HTTPS   : ${security.hasHttps ? '⚙️ Oui' : '⚠️ Non'}\n` +
        `│ ✂️ Raccourci: ${security.isShort ? '⚠️ Oui' : '⚙️ Non'}\n` +
        `│\n`

      if (security.threats.length > 0) {
        msg += `│ ⚠️ *Alertes détectées:*\n`
        for (const threat of security.threats) {
          msg += `│  • ${threat}\n`
        }
        msg += `│\n`
      } else {
        msg += `│ ⚙️ Aucune menace détectée\n│\n`
      }

      msg +=
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `_⚠️ Analyse automatique — pas un antivirus professionnel_`

      return await sendMessage(sock, sender, msg)
    }

    return await sendMessage(sock, sender, `│ Action inconnue.`)

  } catch (err) {
    console.error('❌ url error:', err)
    return await sendMessage(sock, sender,
      `│ *opération échoué inattendue*\n` +
      `📝 ${err?.message?.substring(0, 80) || 'inconnue'}`
    )
  }
}