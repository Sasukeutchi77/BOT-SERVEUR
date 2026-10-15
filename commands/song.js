// ╔══════════════════════════════════════════════╗
// ║   SONG COMMAND — VERSION   ║
// ║   🔧 FIX: commentaire header corrigé     ║
// ║   🔧 FIX: ctx = {} ajouté               ║
// ╚══════════════════════════════════════════════╝

import fs   from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

const TEMP_DIR = path.join(__dirname, "../temp/songs")
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

  // API 1 : ytapi.njxzc.repl.co
  try {
    const res  = await safeFetch(`https://ytapi.njxzc.repl.co/search?q=${q}&limit=1`, {}, 8000)
    const data = await res.json()
    const v    = data?.items?.[0] || data?.[0]
    if (v?.url || v?.id) {
      return {
        title:     v.title     || query,
        url:       v.url       || `https://www.youtube.com/watch?v=${v.id}`,
        duration:  v.duration  || "??:??",
        thumbnail: v.thumbnail?.url || v.thumbnail || "",
        views:     v.views     || "N/A",
        channel:   v.channel?.name || v.author || "N/A"
      }
    }
  } catch {}

  // API 2 : Invidious principal
  try {
    const res  = await safeFetch(
      `https://invidious.nerdvpn.de/api/v1/search?q=${q}&type=video&page=1`, {}, 10000
    )
    const data = await res.json()
    const v    = data?.[0]
    if (v?.videoId) {
      const dur = v.lengthSeconds
        ? `${Math.floor(v.lengthSeconds / 60)}:${String(v.lengthSeconds % 60).padStart(2, "0")}`
        : "??:??"
      return {
        title:     v.title  || query,
        url:       `https://www.youtube.com/watch?v=${v.videoId}`,
        duration:  dur,
        thumbnail: v.videoThumbnails?.[0]?.url || "",
        views:     v.viewCount?.toLocaleString() || "N/A",
        channel:   v.author || "N/A"
      }
    }
  } catch {}

  // API 3 : Invidious backup
  try {
    const res  = await safeFetch(
      `https://inv.tux.pizza/api/v1/search?q=${q}&type=video`, {}, 10000
    )
    const data = await res.json()
    const v    = data?.[0]
    if (v?.videoId) {
      const dur = v.lengthSeconds
        ? `${Math.floor(v.lengthSeconds / 60)}:${String(v.lengthSeconds % 60).padStart(2, "0")}`
        : "??:??"
      return {
        title:     v.title  || query,
        url:       `https://www.youtube.com/watch?v=${v.videoId}`,
        duration:  dur,
        thumbnail: v.videoThumbnails?.[0]?.url || "",
        views:     v.viewCount?.toLocaleString() || "N/A",
        channel:   v.author || "N/A"
      }
    }
  } catch {}

  // API 4 : scrape YouTube direct
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
// TÉLÉCHARGEMENT MP3
//══════════════════════════════════════════════════════════════

async function downloadMp3(videoUrl) {
  const ytId    = extractYtId(videoUrl)
  const encoded = encodeURIComponent(videoUrl)

  if (!ytId) return null

  // API 1 : cobalt.tools
  try {
    const res  = await safeFetch("https://api.cobalt.tools/", {
      method:  "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body:    JSON.stringify({ url: videoUrl, downloadMode: "audio", audioFormat: "mp3", audioBitrate: "128" })
    }, 30000)
    const data = await res.json()
    if (data?.url) { console.log("✅ cobalt.tools OK"); return data.url }
  } catch (e) { console.log("cobalt fail:", e.message) }

  // API 2 : y2mate
  try {
    const res1 = await safeFetch("https://www.y2mate.com/mates/analyzeV2/ajax", {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    `k_query=https://www.youtube.com/watch?v=${ytId}&k_page=home&hl=en&q_auto=0`
    }, 15000)
    const d1  = await res1.json()
    const kId = d1?.links?.mp3?.mp3128?.k
    if (kId) {
      const res2 = await safeFetch("https://www.y2mate.com/mates/convertV2/index", {
        method:  "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body:    `vid=${ytId}&k=${kId}`
      }, 30000)
      const d2 = await res2.json()
      if (d2?.dlink) { console.log("✅ y2mate OK"); return d2.dlink }
    }
  } catch (e) { console.log("y2mate fail:", e.message) }

  // API 3 : loader.to
  try {
    const res1 = await safeFetch(
      `https://loader.to/ajax/download.php?format=mp3&url=${encoded}`, {}, 15000
    )
    const d1   = await res1.json()
    const dlId = d1?.id
    if (dlId) {
      for (let i = 0; i < 10; i++) {
        await delay(3000)
        const res2 = await safeFetch(
          `https://loader.to/ajax/progress.php?id=${dlId}`, {}, 10000
        )
        const d2 = await res2.json()
        if (d2?.download_url) { console.log("✅ loader.to OK"); return d2.download_url }
        if (d2?.success === false) break
      }
    }
  } catch (e) { console.log("loader.to fail:", e.message) }

  // API 4 : yt5s.io
  try {
    const res1 = await safeFetch("https://yt5s.io/api/ajaxSearch/index", {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    `q=https://www.youtube.com/watch?v=${ytId}&vt=mp3`
    }, 15000)
    const d1  = await res1.json()
    const key = d1?.links?.mp3?.["mp3-128"]?.k || d1?.links?.mp3?.mp3128?.k
    if (key) {
      const res2 = await safeFetch("https://yt5s.io/api/ajaxConvert/convert", {
        method:  "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body:    `vid=${ytId}&k=${key}`
      }, 30000)
      const d2 = await res2.json()
      if (d2?.dlink) { console.log("✅ yt5s OK"); return d2.dlink }
    }
  } catch (e) { console.log("yt5s fail:", e.message) }

  // API 5 : mp3download.to
  try {
    const res  = await safeFetch(
      `https://mp3download.to/api/button/mp3/${ytId}`,
      { headers: { "Referer": "https://mp3download.to/", "User-Agent": "Mozilla/5.0" } },
      20000
    )
    const data = await res.json()
    const dl   = data?.url || data?.download || data?.link
    if (dl) { console.log("✅ mp3download.to OK"); return dl }
  } catch (e) { console.log("mp3download fail:", e.message) }

  console.log("❌ Toutes les APIs MP3 ont échoué pour:", videoUrl)
  return null
}

//══════════════════════════════════════════════════════════════
// FETCH AUDIO EN BUFFER
//══════════════════════════════════════════════════════════════

async function fetchAudioBuffer(url) {
  const res = await safeFetch(url, { headers: { "User-Agent": "Mozilla/5.0" } }, 60000)
  const ab  = await res.arrayBuffer()
  return Buffer.from(ab)
}

//══════════════════════════════════════════════════════════════
// ENVOI AUDIO — 3 tentatives
//══════════════════════════════════════════════════════════════

async function sendAudio(sock, sender, dlUrl, title) {
  const safeName = `${title.replace(/[^\w\s]/gi, "").substring(0, 50)}.mp3`

  // Tentative 1 : URL directe
  try {
    await sock.sendMessage(sender, {
      audio: { url: dlUrl }, mimetype: "audio/mpeg", fileName: safeName, ptt: false
    })
    console.log("✅ Audio envoyé par URL directe")
    return true
  } catch (e) { console.log("⚠️ URL directe échouée:", e.message) }

  // Tentative 2 : buffer → fichier temp
  try {
    const audioBuffer = await fetchAudioBuffer(dlUrl)
    if (!audioBuffer || audioBuffer.length < 1000) throw new Error("Buffer trop petit")
    const tmpPath = path.join(TEMP_DIR, `${Date.now()}_${safeName}`)
    fs.writeFileSync(tmpPath, audioBuffer)
    await sock.sendMessage(sender, {
      audio: { url: `file://${tmpPath}` }, mimetype: "audio/mpeg", fileName: safeName, ptt: false
    })
    fs.unlink(tmpPath, () => {})
    console.log("✅ Audio envoyé via fichier temp")
    return true
  } catch (e) { console.log("⚠️ Fichier temp échoué:", e.message) }

  // Tentative 3 : buffer mémoire direct
  try {
    const audioBuffer = await fetchAudioBuffer(dlUrl)
    await sock.sendMessage(sender, {
      audio: audioBuffer, mimetype: "audio/mpeg", fileName: safeName, ptt: false
    })
    console.log("✅ Audio envoyé via buffer mémoire")
    return true
  } catch (e) {
    console.log("❌ Toutes les tentatives audio ont échoué:", e.message)
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

export default async function song(sock, sender, args, msg, ctx = {}) {
  let loaderKey = null

  try {
    const query = args.join(" ").trim()

    // ── AIDE ────────────────────────────────────────────────
    if (!query) {
      return sock.sendMessage(sender, {
        text:
          `🕸️━━━〔 🎵 𝐒𝐎𝐍𝐆 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃𝐄𝐑 〕━━━🕸️\n` +
          `│\n` +
          `│  📖 *syntaxe:*\n` +
          `│  .song <nom de la musique>\n` +
          `│\n` +
          `│  📝 *Exemples:*\n` +
          `│  .song gazo haine et sex\n` +
          `│  .song ninho réseaux\n` +
          `│  .song drake god's plan\n` +
          `│\n` +
          `│  👁️  Format: MP3 128kbps\n` +
          `│  ⚡ Temps: 15-45 secondes\n` +
          `│\n` +
          `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      })
    }

    // ── LOADER ──────────────────────────────────────────────
    loaderKey = await showDlLoader(sock, sender, query)

    // ── RECHERCHE ────────────────────────────────────────────
    const videoInfo = await searchYouTube(query)

    if (!videoInfo?.url) {
      await removeLoader(sock, sender, loaderKey)
      loaderKey = null
      return sock.sendMessage(sender, {
        text:
          `🕸️━━━〔 🕷️ 𝐈𝐍𝐓𝐑𝐎𝐔𝐕𝐀𝐁𝐋𝐄 〕━━━🕸️\n` +
          `│\n` +
          `│  Aucun résultat pour:\n` +
          `│  _"${query}"_\n` +
          `│\n` +
          `│  💡 Essayez:\n` +
          `│  • Un autre titre\n` +
          `│  • Artiste + titre\n` +
          `│\n` +
          `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      })
    }

    const { title, url, duration, thumbnail, views, channel } = videoInfo
    console.log(`🎵 Trouvé: ${title} | ${url}`)

    // ── TÉLÉCHARGEMENT ───────────────────────────────────────
    const dlUrl = await downloadMp3(url)

    if (!dlUrl) {
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

    // ── POCHETTE + INFOS ─────────────────────────────────────
    const caption =
      `🎵 *${title}*\n\n` +
      `📺 Chaîne  : ${channel}\n` +
      `⏱ Durée   : ${duration}\n` +
      `👁 Vues    : ${views}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `_J.A.R.V.I.S. • Song Downloader_`

    if (thumbnail) {
      try {
        await sock.sendMessage(sender, { image: { url: thumbnail }, caption })
      } catch {
        await sock.sendMessage(sender, { text: caption })
      }
    } else {
      await sock.sendMessage(sender, { text: caption })
    }

    // ── ENVOI AUDIO ──────────────────────────────────────────
    const sent = await sendAudio(sock, sender, dlUrl, title)

    if (!sent) {
      return sock.sendMessage(sender, {
        text:
          `🕸️━━━〔 ⚠️ 𝐄𝐍𝐕𝐎𝐈 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n` +
          `│\n` +
          `│  La musique a été trouvée\n` +
          `│  mais l'envoi a échoué.\n` +
          `│\n` +
          `│  💡 Réessayez la commande\n` +
          `│\n` +
          `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      })
    }

    console.log(`✅ Song complète: ${title}`)

  } catch (err) {
    console.error("SONG ERROR:", err.message)
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
        `│  .song <titre différent>\n` +
        `│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    })
  }
}