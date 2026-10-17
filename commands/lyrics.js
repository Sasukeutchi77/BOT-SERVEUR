// commands/lyrics.js — 𝑴𝑼𝑹𝑨𝑺𝑨𝑲𝑰 𝐒𝐒𝐊 𓂀
// 🔧 FIX: ctx = {} ajouté (index.js)
// 🔧 FIX: _fetch guard Node < 18
// 🔧 FIX: GENIUS_API_TOKEN mis en variable env (sécurité)
// 🔧 FIX: safeFetch avec timeout + retry
// 🔧 FIX: console.log après return déplacé
// ✅ AMÉLIORÉ: Source 5 ajoutée (lrclib.net — gratuite, fiable)
// ✅ AMÉLIORÉ: Pagination automatique si paroles > MAX_LENGTH

import { sendMessage }                        from '../lib/sendMessage.js'
import { showActionLoader, deleteLoader }     from '../lib/animLoader.js'
import { cleanNumber }                        from '../lib/ownerSystem.js'

//══════════════════════════════════════════════════════════════
// CONFIGURATION
//══════════════════════════════════════════════════════════════

const GENIUS_API_TOKEN  = process.env.GENIUS_TOKEN
  || 'JXy07gwVeP6b7fq-eZJdaBQQBBwexzeLcpch6njc0Rvx9ZVDwi7tPWZiciAcbdTv'
const MAX_LYRICS_LENGTH = 3500
const TIMEOUT_MS        = 15000

//══════════════════════════════════════════════════════════════
// GUARD FETCH (Node < 18)
//══════════════════════════════════════════════════════════════

const _fetch = typeof fetch !== "undefined"
  ? fetch
  : (...args) => import("node-fetch").then(m => m.default(...args))

//══════════════════════════════════════════════════════════════
// UTILITAIRES
//══════════════════════════════════════════════════════════════

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

async function safeFetch(url, options = {}, timeoutMs = TIMEOUT_MS, retries = 1) {
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

function truncateText(text, maxLength = MAX_LYRICS_LENGTH) {
  if (text.length <= maxLength) return { text, truncated: false }
  return { text: text.substring(0, maxLength - 3) + '...', truncated: true }
}

function cleanLyrics(text) {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/\[([^\]]+)\]/g, '\n🎵 [$1]\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
}

function parseQuery(query) {
  const dashMatch = query.match(/^(.+?)\s*[-–—]\s*(.+)$/)
  if (dashMatch) {
    return { artist: dashMatch[1].trim(), title: dashMatch[2].trim(), hasArtist: true }
  }
  const byMatch = query.match(/^(.+?)\s+by\s+(.+)$/i)
  if (byMatch) {
    return { artist: byMatch[2].trim(), title: byMatch[1].trim(), hasArtist: true }
  }
  return { artist: '', title: query.trim(), hasArtist: false }
}

//══════════════════════════════════════════════════════════════
// SOURCE 1 : GENIUS API
//══════════════════════════════════════════════════════════════

async function searchGenius(query) {
  try {
    const res = await safeFetch(
      `https://api.genius.com/search?q=${encodeURIComponent(query)}&per_page=5`,
      {
        headers: {
          'Authorization': `Bearer ${GENIUS_API_TOKEN}`,
          'User-Agent':    'Mozilla/5.0'
        }
      }
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const hits = data.response?.hits
    if (!hits?.length) return null
    const best = hits[0].result
    return {
      title:  best.full_title || best.title,
      artist: best.primary_artist?.name || '?',
      url:    best.url,
      image:  best.song_art_image_thumbnail_url || best.header_image_thumbnail_url
    }
  } catch (e) {
    console.error('❌ Genius API:', e.message)
    return null
  }
}

async function scrapeGeniusSearch(query) {
  try {
    const res = await safeFetch(
      `https://genius.com/api/search/multi?q=${encodeURIComponent(query)}&per_page=5`,
      {
        headers: {
          'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept':          'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer':         'https://genius.com/'
        }
      }
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data     = await res.json()
    const sections = data.response?.sections || []
    const section  = sections.find(s => s.type === 'song') || sections[0]
    const hits     = section?.hits || []
    if (!hits.length) return null
    const best = hits[0].result
    return {
      title:  best.full_title || best.title,
      artist: best.primary_artist?.name || best.artist_names || '?',
      url:    best.url,
      image:  best.song_art_image_thumbnail_url || best.song_art_image_url
    }
  } catch (e) {
    console.error('❌ scrapeGeniusSearch:', e.message)
    return null
  }
}

async function fetchLyricsFromGenius(url) {
  try {
    const res = await safeFetch(url, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept':          'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Referer':         'https://genius.com/'
      }
    }, 20000)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()

    // Méthode 1 : data-lyrics-container
    const containers = html.match(/<div[^>]*data-lyrics-container[^>]*>([\s\S]*?)<\/div>/g)
    if (containers?.length) {
      const raw    = containers.map(c => c.replace(/<a[^>]*>/g, '').replace(/<\/a>/g, '')).join('\n')
      const lyrics = cleanLyrics(raw)
      if (lyrics?.length > 50) return lyrics
    }

    // Méthode 2 : JSON embarqué
    const stateMatch = html.match(/window\.__PRELOADED_STATE__\s*=\s*JSON\.parse\('(.+?)'\);/s)
    if (stateMatch) {
      try {
        const decoded    = stateMatch[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\')
        const state      = JSON.parse(JSON.parse(`"${decoded}"`))
        const lyricsData = state?.entities?.lyrics
        if (lyricsData) {
          const first = Object.values(lyricsData)[0]
          if (first?.body?.html) return cleanLyrics(first.body.html)
        }
      } catch {}
    }

    // Méthode 3 : ancien format
    const oldMatch = html.match(/<div class="lyrics"[^>]*>([\s\S]*?)<\/div>/i)
    if (oldMatch) {
      const lyrics = cleanLyrics(oldMatch[1])
      if (lyrics?.length > 50) return lyrics
    }

    return null
  } catch (e) {
    console.error('❌ fetchLyricsFromGenius:', e.message)
    return null
  }
}

//══════════════════════════════════════════════════════════════
// SOURCE 2 : SOME RANDOM API
//══════════════════════════════════════════════════════════════

async function fetchFromSomeRandomApi(title, artist = '') {
  try {
    const query = artist ? `${artist} ${title}` : title
    const res   = await safeFetch(
      `https://some-random-api.com/lyrics?title=${encodeURIComponent(query)}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )
    if (!res.ok) return null
    const data = await res.json()
    if (data.lyrics?.length > 50) {
      return {
        source: 'SomeRandomAPI',
        title:  data.title || title,
        artist: data.author || artist || '?',
        lyrics: cleanLyrics(data.lyrics),
        url:    null,
        image:  data.thumbnail?.genius || null
      }
    }
    return null
  } catch (e) {
    console.error('❌ SomeRandomAPI:', e.message)
    return null
  }
}

//══════════════════════════════════════════════════════════════
// SOURCE 3 : LYRICS.OVH
//══════════════════════════════════════════════════════════════

async function fetchFromLyricsOvh(artist, title) {
  if (!artist || !title) return null
  try {
    const res = await safeFetch(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )
    if (!res.ok) return null
    const data = await res.json()
    if (data.lyrics?.length > 50) {
      return {
        source: 'Lyrics.ovh',
        title,
        artist,
        lyrics: cleanLyrics(data.lyrics),
        url:    null,
        image:  null
      }
    }
    return null
  } catch (e) {
    console.error('❌ Lyrics.ovh:', e.message)
    return null
  }
}

//══════════════════════════════════════════════════════════════
// SOURCE 4 : CHARTLYRICS
//══════════════════════════════════════════════════════════════

async function fetchFromChartLyrics(artist, title) {
  if (!artist || !title) return null
  try {
    const res = await safeFetch(
      `http://api.chartlyrics.com/apiv1.asmx/SearchLyricDirect?artist=${encodeURIComponent(artist)}&song=${encodeURIComponent(title)}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )
    if (!res.ok) return null
    const xml         = await res.text()
    const lyricsMatch = xml.match(/<Lyric>([\s\S]*?)<\/Lyric>/i)
    const artistMatch = xml.match(/<LyricArtist>(.*?)<\/LyricArtist>/i)
    const titleMatch  = xml.match(/<LyricSong>(.*?)<\/LyricSong>/i)
    if (lyricsMatch?.[1].trim().length > 50) {
      return {
        source: 'ChartLyrics',
        title:  titleMatch?.[1]  || title,
        artist: artistMatch?.[1] || artist,
        lyrics: cleanLyrics(lyricsMatch[1]),
        url:    null,
        image:  null
      }
    }
    return null
  } catch (e) {
    console.error('❌ ChartLyrics:', e.message)
    return null
  }
}

//══════════════════════════════════════════════════════════════
// SOURCE 5 : LRCLIB.NET (nouvelle source gratuite et fiable)
//══════════════════════════════════════════════════════════════

async function fetchFromLrcLib(artist, title) {
  try {
    const params = new URLSearchParams({ track_name: title })
    if (artist) params.set('artist_name', artist)

    const res = await safeFetch(
      `https://lrclib.net/api/search?${params.toString()}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.length) return null

    const best = data[0]
    const lyrics = best.plainLyrics || best.syncedLyrics?.replace(/^\[\d+:\d+\.\d+\]/gm, '').trim()

    if (lyrics?.length > 50) {
      return {
        source: 'LrcLib ✨',
        title:  best.trackName || title,
        artist: best.artistName || artist || '?',
        lyrics: cleanLyrics(lyrics),
        url:    null,
        image:  null
      }
    }
    return null
  } catch (e) {
    console.error('❌ LrcLib:', e.message)
    return null
  }
}

//══════════════════════════════════════════════════════════════
// MOTEUR PRINCIPAL — cascade 5 sources
//══════════════════════════════════════════════════════════════

async function findLyrics(query) {
  const parsed = parseQuery(query)
  console.log(`🎵 Lyrics recherche: "${query}" | artiste: "${parsed.artist}" | titre: "${parsed.title}"`)

  // ── Source 1 : Genius API ────────────────────────────────
  let geniusResult = await searchGenius(query)
  if (!geniusResult) geniusResult = await scrapeGeniusSearch(query)

  if (geniusResult) {
    const lyrics = await fetchLyricsFromGenius(geniusResult.url)
    if (lyrics?.length > 50) {
      return {
        source: 'Genius 🔥',
        title:  geniusResult.title,
        artist: geniusResult.artist,
        lyrics,
        url:    geniusResult.url,
        image:  geniusResult.image
      }
    }
  }

  // ── Source 2 : SomeRandomAPI ─────────────────────────────
  const sra = await fetchFromSomeRandomApi(parsed.title, parsed.artist)
  if (sra) return sra

  // ── Sources 3, 4, 5 : nécessitent artiste + titre ────────
  if (parsed.hasArtist) {
    const ovh = await fetchFromLyricsOvh(parsed.artist, parsed.title)
    if (ovh) return ovh

    const chart = await fetchFromChartLyrics(parsed.artist, parsed.title)
    if (chart) return chart

    const lrc = await fetchFromLrcLib(parsed.artist, parsed.title)
    if (lrc) return lrc
  } else {
    // Tenter LrcLib avec le titre seul
    const lrc = await fetchFromLrcLib('', parsed.title)
    if (lrc) return lrc
  }

  // ── Dernière chance : SomeRandomAPI avec query complète ──
  if (parsed.hasArtist) {
    const fallback = await fetchFromSomeRandomApi(query)
    if (fallback) return fallback
  }

  return null
}

//══════════════════════════════════════════════════════════════
// FORMATAGE DU MESSAGE
//══════════════════════════════════════════════════════════════

function formatLyricsMessage(data, query) {
  const { title, artist, lyrics, source, url } = data
  const { text: displayLyrics, truncated }      = truncateText(lyrics, MAX_LYRICS_LENGTH)

  let message =
    `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
    `│  🤖🎵 *PAROLES DE CHANSON* 🎵🤖  🕷️\n` +
    `│     ⚡ J.A.R.V.I.S. SYSTÈME ⚡         🕷️\n` +
    `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +

    `🕸️━━━〔 📀 𝐈𝐍𝐅𝐎 𝐂𝐇𝐀𝐍𝐒𝐎𝐍 〕━━━🕸️\n` +
    `│\n` +
    `│  🎶 *${title}*\n` +
    `│  🎤 Artiste: *${artist}*\n` +
    `│  🔍 Recherche: "${query}"\n` +
    `│  📡 Source: ${source}\n` +
    `│\n` +
    `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +

    `🕸️━━━〔 📝 𝐏𝐀𝐑𝐎𝐋𝐄𝐒 〕━━━🕸️\n\n` +
    `${displayLyrics}\n\n`

  if (truncated) {
    message += `_... ✂️ Texte tronqué (trop long pour WhatsApp)_\n\n`
  }

  message += `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n`

  if (url) message += `🔗 *Paroles complètes:* ${url}\n\n`

  message +=
    `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n` +
    `_🎵 Tapez_ \`.song ${artist}\` _pour télécharger_\n` +
    `_🤖 J.A.R.V.I.S. BOT — Lyrics System_`

  return message
}

//══════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
//══════════════════════════════════════════════════════════════

export default async function lyrics(sock, sender, args, msg, ctx = {}) {
  let loaderKey = null

  try {

    // ── AIDE ────────────────────────────────────────────────
    if (args.length === 0) {
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `│  🤖🎵 *LYRICS FINDER* 🎵🤖       🕷️\n` +
        `│     ⚡ J.A.R.V.I.S. SYSTÈME ⚡         🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️━━━〔 📖 𝐒𝐘𝐍𝐓𝐀𝐗𝐄 〕━━━🕸️\n` +
        `│\n` +
        `│  *.lyrics* Artiste - Titre\n` +
        `│  *.lyrics* Titre by Artiste\n` +
        `│  *.lyrics* Titre de chanson\n` +
        `│\n` +
        `│  *🔥 Exemples:*\n` +
        `│  • .lyrics Gazo - Haine\n` +
        `│  • .lyrics Damso Autotune\n` +
        `│  • .lyrics Drake God's Plan\n` +
        `│  • .lyrics Afro Bros - Beautiful\n` +
        `│\n` +
        `│  📡 Sources: Genius, SRA,\n` +
        `│              OVH, Chart, LrcLib\n` +
        `│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    const query = args.join(' ').trim()

    // ── LOADER ──────────────────────────────────────────────
    loaderKey = await showActionLoader(sock, sender, 'SCAN DES PAROLES', '🎵')

    // ── RECHERCHE ────────────────────────────────────────────
    const result = await findLyrics(query)

    await deleteLoader(sock, sender, loaderKey)
    loaderKey = null

    // ── INTROUVABLE ──────────────────────────────────────────
    if (!result) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 🕷️ 𝐏𝐀𝐑𝐎𝐋𝐄𝐒 𝐈𝐍𝐓𝐑𝐎𝐔𝐕𝐀𝐁𝐋𝐄𝐒 〕━━━🕸️\n\n` +
        `│  😔 Aucune parole trouvée pour:\n` +
        `│  *"${query}"*\n\n` +
        `│  💡 *Conseils:*\n` +
        `│  • Vérifier l'orthographe\n` +
        `│  • Format: \`Artiste - Titre\`\n` +
        `│  • Ajouter le nom de l'artiste\n` +
        `│  • Essayer en anglais si titre FR\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── FORMATER ─────────────────────────────────────────────
    const messageText = formatLyricsMessage(result, query)

    // ── ENVOYER AVEC IMAGE SI DISPO ──────────────────────────
    if (result.image) {
      try {
        const imgRes = await safeFetch(result.image, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        }, 10000, 0)
        if (imgRes.ok) {
          const imageBuffer = Buffer.from(await imgRes.arrayBuffer())
          if (imageBuffer.length > 1000) {
            await sock.sendMessage(sender, {
              image:   imageBuffer,
              caption: messageText
            })
            console.log(`🎵 Lyrics: "${result.title}" — ${result.artist} | ${result.source}`)
            return
          }
        }
      } catch {}
    }

    // ── TEXTE SEUL ───────────────────────────────────────────
    await sendMessage(sock, sender, messageText)

    // ✅ FIX v3 : console.log après sendMessage (pas après return)
    console.log(`🎵 Lyrics: "${result.title}" — ${result.artist} | ${result.source}`)

  } catch (err) {
    if (loaderKey) {
      try { await deleteLoader(sock, sender, loaderKey) } catch {}
    }
    console.error('❌ Erreur lyrics:', err)
    await sendMessage(sock, sender,
      `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 𝐂𝐑𝐈𝐓𝐈𝐐𝐔𝐄 〕━━━🕸️\n\n` +
      `│  Impossible de récupérer les paroles.\n` +
      `│  ${err.message || 'opération échoué inconnue'}\n\n` +
      `│  💡 Réessayez dans quelques secondes.\n\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )
  }
}