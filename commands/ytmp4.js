// ╔══════════════════════════════════════════════╗
// ║   YTMP4 COMMAND — VERSION                 ║
// ║   🔧 FIX: APIs gratuites stables 2026    ║
// ║   🔧 FIX: Zéro dépendance yt-dlp        ║
// ║   🔧 FIX: Envoi vidéo robuste 3 essais  ║
// ║   🔧 FIX: Recherche + URL directe       ║
// ╚══════════════════════════════════════════════╝

import fs   from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

const TEMP_DIR = path.join(__dirname, "../temp/videos")
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true })

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

// ── Guard fetch (Node < 18) ──────────────────────────────────
const _fetch = typeof fetch !== "undefined"
  ? fetch
  : (...args) => import("node-fetch").then(m => m.default(...args))

//══════════════════════════════════════════════════════════════
// UTILITAIRES
//══════════════════════════════════════════════════════════════

function extractYtId(url = "") {
  const match = url.match(
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
  )
  return match?.[1] || ""
}

function isYouTubeUrl(text = "") {
  return /(?:youtube\.com|youtu\.be)/.test(text)
}

// Fetch avec timeout et retry automatique
async function safeFetch(url, options = {}, timeoutMs = 15000, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await _fetch(url, {
        ...options,
        signal: AbortSignal.timeout(timeoutMs)
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res
    } catch (err) {
      if (i === retries) throw err
      await delay(1000 * (i + 1))
    }
  }
}

//══════════════════════════════════════════════════════════════
// RECHERCHE YOUTUBE
//══════════════════════════════════════════════════════════════

async function searchYouTube(query) {
  const q = encodeURIComponent(query)

  // ── API 1 : Invidious instance principale ─────────────────
  try {
    const res  = await safeFetch(
      `https://invidious.nerdvpn.de/api/v1/search?q=${q}&type=video&page=1`,
      {}, 10000
    )
    const data = await res.json()
    const v    = data?.[0]
    if (v?.videoId) {
      const dur = v.lengthSeconds
        ? `${Math.floor(v.lengthSeconds / 60)}:${String(v.lengthSeconds % 60).padStart(2, "0")}`
        : "??:??"
      return {
        title:     v.title    || query,
        url:       `https://www.youtube.com/watch?v=${v.videoId}`,
        videoId:   v.videoId,
        duration:  dur,
        thumbnail: v.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
        views:     v.viewCount?.toLocaleString() || "N/A",
        channel:   v.author   || "N/A"
      }
    }
  } catch {}

  // ── API 2 : Invidious instance backup ─────────────────────
  try {
    const res  = await safeFetch(
      `https://inv.tux.pizza/api/v1/search?q=${q}&type=video`,
      {}, 10000
    )
    const data = await res.json()
    const v    = data?.[0]
    if (v?.videoId) {
      const dur = v.lengthSeconds
        ? `${Math.floor(v.lengthSeconds / 60)}:${String(v.lengthSeconds % 60).padStart(2, "0")}`
        : "??:??"
      return {
        title:     v.title    || query,
        url:       `https://www.youtube.com/watch?v=${v.videoId}`,
        videoId:   v.videoId,
        duration:  dur,
        thumbnail: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
        views:     v.viewCount?.toLocaleString() || "N/A",
        channel:   v.author   || "N/A"
      }
    }
  } catch {}

  // ── API 3 : scrape YouTube direct ─────────────────────────
  try {
    const res  = await safeFetch(
      `https://www.youtube.com/results?search_query=${q}&sp=EgIQAQ%3D%3D`,
      {
        headers: {
          "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept-Language": "fr-FR,fr;q=0.9"
        }
      },
      10000
    )
    const html  = await res.text()
    const match = html.match(/"videoId":"([^"]{11})".*?"title":\{"runs":\[\{"text":"([^"]+)"/)
    if (match) {
      return {
        title:     match[2] || query,
        url:       `https://www.youtube.com/watch?v=${match[1]}`,
        videoId:   match[1],
        duration:  "??:??",
        thumbnail: `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg`,
        views:     "N/A",
        channel:   "N/A"
      }
    }
  } catch {}

  return null
}

//══════════════════════════════════════════════════════════════
// RÉCUPÉRER INFOS DEPUIS UNE URL YOUTUBE DIRECTE
//══════════════════════════════════════════════════════════════

async function getVideoInfo(videoUrl) {
  const ytId = extractYtId(videoUrl)
  if (!ytId) return null

  try {
    const res  = await safeFetch(
      `https://invidious.nerdvpn.de/api/v1/videos/${ytId}`,
      {}, 10000
    )
    const v = await res.json()
    if (v?.videoId) {
      const dur = v.lengthSeconds
        ? `${Math.floor(v.lengthSeconds / 60)}:${String(v.lengthSeconds % 60).padStart(2, "0")}`
        : "??:??"
      return {
        title:     v.title    || ytId,
        url:       videoUrl,
        videoId:   ytId,
        duration:  dur,
        thumbnail: v.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
        views:     v.viewCount?.toLocaleString() || "N/A",
        channel:   v.author   || "N/A"
      }
    }
  } catch {}

  // Fallback minimal si Invidious échoue
  return {
    title:     ytId,
    url:       videoUrl,
    videoId:   ytId,
    duration:  "??:??",
    thumbnail: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
    views:     "N/A",
    channel:   "N/A"
  }
}

//══════════════════════════════════════════════════════════════
// TÉLÉCHARGEMENT MP4 — APIs gratuites stables 2026
//══════════════════════════════════════════════════════════════

async function downloadMp4(videoUrl) {
  const ytId    = extractYtId(videoUrl)
  const encoded = encodeURIComponent(videoUrl)

  if (!ytId) return null

  // ── API 1 : cobalt.tools (la plus fiable, 100% gratuite) ──
  try {
    const res  = await safeFetch(
      "https://api.cobalt.tools/",
      {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept":        "application/json"
        },
        body: JSON.stringify({
          url:          videoUrl,
          downloadMode: "auto",
          videoQuality: "720"
        })
      },
      30000
    )
    const data = await res.json()
    if (data?.url) {
      console.log("✅ cobalt.tools MP4 OK")
      return { url: data.url, quality: "720p" }
    }
  } catch (e) { console.log("cobalt fail:", e.message) }

  // ── API 2 : y2mate MP4 ────────────────────────────────────
  try {
    const res1 = await safeFetch(
      "https://www.y2mate.com/mates/analyzeV2/ajax",
      {
        method:  "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body:    `k_query=https://www.youtube.com/watch?v=${ytId}&k_page=home&hl=en&q_auto=0`
      },
      15000
    )
    const d1 = await res1.json()

    // Chercher la meilleure qualité disponible (720p → 480p → 360p)
    const mp4Links = d1?.links?.mp4
    const quality  = mp4Links?.["720p"] || mp4Links?.["480p"] || mp4Links?.["360p"]
    const kId      = quality?.k

    if (kId) {
      const res2 = await safeFetch(
        "https://www.y2mate.com/mates/convertV2/index",
        {
          method:  "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body:    `vid=${ytId}&k=${kId}`
        },
        30000
      )
      const d2 = await res2.json()
      if (d2?.dlink) {
        const q = mp4Links?.["720p"] ? "720p" : mp4Links?.["480p"] ? "480p" : "360p"
        console.log(`✅ y2mate MP4 OK (${q})`)
        return { url: d2.dlink, quality: q }
      }
    }
  } catch (e) { console.log("y2mate fail:", e.message) }

  // ── API 3 : yt5s.io MP4 ───────────────────────────────────
  try {
    const res1 = await safeFetch(
      "https://yt5s.io/api/ajaxSearch/index",
      {
        method:  "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body:    `q=https://www.youtube.com/watch?v=${ytId}&vt=mp4`
      },
      15000
    )
    const d1      = await res1.json()
    const mp4Data = d1?.links?.mp4
    const quality = mp4Data?.["720p"] || mp4Data?.["480p"] || mp4Data?.["360p"]
    const key     = quality?.k

    if (key) {
      const res2 = await safeFetch(
        "https://yt5s.io/api/ajaxConvert/convert",
        {
          method:  "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body:    `vid=${ytId}&k=${key}`
        },
        30000
      )
      const d2 = await res2.json()
      if (d2?.dlink) {
        console.log("✅ yt5s MP4 OK")
        return { url: d2.dlink, quality: "480p" }
      }
    }
  } catch (e) { console.log("yt5s fail:", e.message) }

  // ── API 4 : loader.to MP4 ─────────────────────────────────
  try {
    const res1 = await safeFetch(
      `https://loader.to/ajax/download.php?format=360p&url=${encoded}`,
      {}, 15000
    )
    const d1   = await res1.json()
    const dlId = d1?.id

    if (dlId) {
      for (let i = 0; i < 12; i++) {
        await delay(3000)
        const res2 = await safeFetch(
          `https://loader.to/ajax/progress.php?id=${dlId}`,
          {}, 10000
        )
        const d2 = await res2.json()
        if (d2?.download_url) {
          console.log("✅ loader.to MP4 OK")
          return { url: d2.download_url, quality: "360p" }
        }
        if (d2?.success === false) break
      }
    }
  } catch (e) { console.log("loader.to fail:", e.message) }

  // ── API 5 : Invidious stream direct ──────────────────────
  try {
    const res  = await safeFetch(
      `https://invidious.nerdvpn.de/api/v1/videos/${ytId}`,
      {}, 10000
    )
    const data = await res.json()

    // Chercher le stream MP4 le plus adapté (≤ 720p)
    const streams = data?.adaptiveFormats || data?.formatStreams || []
    const stream  = streams
      .filter(f => f.type?.includes("video/mp4") || f.container === "mp4")
      .sort((a, b) => {
        const qa = parseInt(a.resolution || a.qualityLabel || "0")
        const qb = parseInt(b.resolution || b.qualityLabel || "0")
        return qb - qa
      })
      .find(f => parseInt(f.resolution || f.qualityLabel || "0") <= 720)

    if (stream?.url) {
      console.log("✅ Invidious stream MP4 OK")
      return { url: stream.url, quality: stream.resolution || stream.qualityLabel || "?" }
    }
  } catch (e) { console.log("invidious stream fail:", e.message) }

  console.log("❌ Toutes les APIs MP4 ont échoué pour:", videoUrl)
  return null
}

//══════════════════════════════════════════════════════════════
// FETCH VIDÉO EN BUFFER
//══════════════════════════════════════════════════════════════

async function fetchVideoBuffer(url) {
  const res = await safeFetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" }
  }, 120000, 1)
  const ab  = await res.arrayBuffer()
  return Buffer.from(ab)
}

//══════════════════════════════════════════════════════════════
// ENVOI VIDÉO — 3 tentatives robustes
//══════════════════════════════════════════════════════════════

async function sendVideo(sock, sender, dlUrl, title, caption) {
  const safeName = `${title.replace(/[^\w\s]/gi, "").substring(0, 50)}.mp4`

  // Tentative 1 : envoi direct par URL
  try {
    await sock.sendMessage(sender, {
      video:    { url: dlUrl },
      mimetype: "video/mp4",
      fileName: safeName,
      caption:  caption
    })
    console.log("✅ Vidéo envoyée par URL directe")
    return true
  } catch (e) {
    console.log("⚠️ URL directe échouée:", e.message)
  }

  // Tentative 2 : buffer → fichier temp
  try {
    console.log("⏳ Téléchargement buffer vidéo...")
    const videoBuffer = await fetchVideoBuffer(dlUrl)

    if (!videoBuffer || videoBuffer.length < 10000) {
      throw new Error("Buffer trop petit")
    }

    const tmpPath = path.join(TEMP_DIR, `${Date.now()}_${safeName}`)
    fs.writeFileSync(tmpPath, videoBuffer)

    await sock.sendMessage(sender, {
      video:    { url: `file://${tmpPath}` },
      mimetype: "video/mp4",
      fileName: safeName,
      caption:  caption
    })

    fs.unlink(tmpPath, () => {})
    console.log("✅ Vidéo envoyée via fichier temp")
    return true
  } catch (e) {
    console.log("⚠️ Fichier temp échoué:", e.message)
  }

  // Tentative 3 : buffer mémoire direct
  try {
    const videoBuffer = await fetchVideoBuffer(dlUrl)
    await sock.sendMessage(sender, {
      video:    videoBuffer,
      mimetype: "video/mp4",
      fileName: safeName,
      caption:  caption
    })
    console.log("✅ Vidéo envoyée via buffer mémoire")
    return true
  } catch (e) {
    console.log("❌ Toutes les tentatives d'envoi vidéo ont échoué:", e.message)
    return false
  }
}

//══════════════════════════════════════════════════════════════
// LOADER ANIMÉ
//══════════════════════════════════════════════════════════════

// showDlLoader : neutralisé (plus de temps de chargement affiché avant
// le résultat d'une commande — voir demande utilisateur).
async function showDlLoader() {
  return null
}

async function removeLoader(sock, sender, loaderKey) {
  if (!loaderKey) return
  try { await sock.sendMessage(sender, { delete: loaderKey }) } catch {}
}

//══════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
//══════════════════════════════════════════════════════════════

export default async function ytmp4(sock, sender, args, msg, ctx = {}) {
  let loaderKey = null

  try {
    const input = args.join(" ").trim()

    // ── AIDE ────────────────────────────────────────────────
    if (!input) {
      return sock.sendMessage(sender, {
        text:
          `🕸️━━━〔 🎬 𝐕𝐈𝐃𝐄𝐎 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃𝐄𝐑 〕━━━🕸️\n` +
          `│\n` +
          `│  📖 *syntaxe:*\n` +
          `│  .ytmp4 <titre ou URL YouTube>\n` +
          `│\n` +
          `│  📝 *Exemples:*\n` +
          `│  .ytmp4 ninho réseaux\n` +
          `│  .ytmp4 https://youtu.be/xxxxx\n` +
          `│  .ytmp4 drake god's plan clip\n` +
          `│\n` +
          `│  👁️  Format : MP4 jusqu'à 720p\n` +
          `│  ⚡ Temps  : 20-60 secondes\n` +
          `│  ⚠️  Limite : ~50 Mo max\n` +
          `│\n` +
          `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      })
    }

    // ── LOADER ──────────────────────────────────────────────
    loaderKey = await showDlLoader(sock, sender, input)

    // ── RECHERCHE OU URL DIRECTE ─────────────────────────────
    let videoInfo = null

    if (isYouTubeUrl(input)) {
      // URL YouTube directe → récupérer les infos
      videoInfo = await getVideoInfo(input)
    } else {
      // Recherche par titre
      videoInfo = await searchYouTube(input)
    }

    if (!videoInfo?.url) {
      await removeLoader(sock, sender, loaderKey)
      loaderKey = null
      return sock.sendMessage(sender, {
        text:
          `🕸️━━━〔 🕷️ 𝐈𝐍𝐓𝐑𝐎𝐔𝐕𝐀𝐁𝐋𝐄 〕━━━🕸️\n` +
          `│\n` +
          `│  Aucun résultat pour:\n` +
          `│  _"${input}"_\n` +
          `│\n` +
          `│  💡 Essayez:\n` +
          `│  • Un autre titre\n` +
          `│  • L'URL YouTube directe\n` +
          `│\n` +
          `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      })
    }

    const { title, url, duration, thumbnail, views, channel } = videoInfo
    console.log(`🎬 Trouvé: ${title} | ${url}`)

    // ── TÉLÉCHARGEMENT ───────────────────────────────────────
    const dlResult = await downloadMp4(url)

    if (!dlResult?.url) {
      await removeLoader(sock, sender, loaderKey)
      loaderKey = null
      return sock.sendMessage(sender, {
        text:
          `🕸️━━━〔 🕷️ 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n` +
          `│\n` +
          `│  ⚠️ Impossible de convertir:\n` +
          `│  _"${title}"_\n` +
          `│\n` +
          `│  💡 Solutions:\n` +
          `│  • Réessayez dans 30 sec\n` +
          `│  • Essayez un autre titre\n` +
          `│  • Vidéo peut-être bloquée\n` +
          `│\n` +
          `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      })
    }

    // ── SUPPRIMER LOADER ─────────────────────────────────────
    await removeLoader(sock, sender, loaderKey)
    loaderKey = null

    // ── CAPTION ──────────────────────────────────────────────
    const caption =
      `🎬 *${title}*\n\n` +
      `📺 Chaîne  : ${channel}\n` +
      `⏱ Durée   : ${duration}\n` +
      `👁 Vues    : ${views}\n` +
      `📊 Qualité : ${dlResult.quality}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `_J.A.R.V.I.S. • Video Downloader_`

    // ── ENVOI VIDÉO ──────────────────────────────────────────
    const sent = await sendVideo(sock, sender, dlResult.url, title, caption)

    if (!sent) {
      // Envoyer au moins le lien
      await sock.sendMessage(sender, {
        text:
          `🕸️━━━〔 ⚠️ 𝐄𝐍𝐕𝐎𝐈 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n` +
          `│\n` +
          `│  La vidéo a été trouvée\n` +
          `│  mais trop lourde à envoyer.\n` +
          `│\n` +
          `│  🔗 *Lien direct:*\n` +
          `│  ${dlResult.url}\n` +
          `│\n` +
          `│  💡 Ouvrez ce lien dans\n` +
          `│     votre navigateur.\n` +
          `│\n` +
          `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      })
    }

    console.log(`✅ Vidéo complète: ${title}`)

  } catch (err) {
    console.error("YTMP4 ERROR:", err.message)
    await removeLoader(sock, sender, loaderKey)
    loaderKey = null

    await sock.sendMessage(sender, {
      text:
        `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n` +
        `│\n` +
        `│  opération échoué inattendue.\n` +
        `│  _${err.message?.substring(0, 60)}_\n` +
        `│\n` +
        `│  💡 Réessayez avec:\n` +
        `│  .ytmp4 <titre différent>\n` +
        `│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    })
  }
}