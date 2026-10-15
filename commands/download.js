// commands/download.js — 𝑴𝑼𝑹𝑨𝑺𝑨𝑲𝑰 𝐒𝐒𝐊 𓂀
// ⬇️ Télécharger vidéo/audio depuis YouTube, TikTok, Instagram, Twitter, Facebook, etc.
// Usage: .download <url>         → vidéo
//        .download audio <url>   → audio/MP3
//        .download <url> mp3     → audio/MP3

import { sendMessage } from '../lib/sendMessage.js'

//══════════════════════════════════════
// PLATEFORMES SUPPORTÉES
//══════════════════════════════════════

const PLATFORMS = [
  { name: 'YouTube',    patterns: ['youtube.com', 'youtu.be'] },
  { name: 'TikTok',    patterns: ['tiktok.com', 'vm.tiktok.com'] },
  { name: 'Instagram', patterns: ['instagram.com', 'instagr.am'] },
  { name: 'Twitter/X', patterns: ['twitter.com', 'x.com', 't.co'] },
  { name: 'Facebook',  patterns: ['facebook.com', 'fb.watch', 'fb.com'] },
  { name: 'Reddit',    patterns: ['reddit.com', 'redd.it'] },
  { name: 'Pinterest', patterns: ['pinterest.com', 'pin.it'] },
  { name: 'Dailymotion', patterns: ['dailymotion.com', 'dai.ly'] },
  { name: 'Twitch',    patterns: ['twitch.tv', 'clips.twitch.tv'] },
  { name: 'SoundCloud',patterns: ['soundcloud.com'] },
  { name: 'Vimeo',     patterns: ['vimeo.com'] },
  { name: 'Snapchat',  patterns: ['snapchat.com'] },
]

function detectPlatform(url) {
  const lower = url.toLowerCase()
  for (const p of PLATFORMS) {
    if (p.patterns.some(pat => lower.includes(pat))) return p.name
  }
  return 'Autre'
}

function isValidUrl(str) {
  try {
    const u = new URL(str)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch { return false }
}

function formatSize(bytes) {
  if (!bytes) return '?'
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB'
  return bytes + ' B'
}

//══════════════════════════════════════
// API COBALT (v1 + v2 fallback)
//══════════════════════════════════════

async function tryCobaltV1(url, audioOnly) {
  const res = await fetch('https://api.cobalt.tools/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      url,
      downloadMode:  audioOnly ? 'audio' : 'video',
      videoQuality:  '720',
      audioFormat:   'mp3',
      filenameStyle: 'classic'
    }),
    signal: AbortSignal.timeout(40000)
  })
  const data = await res.json().catch(() => null)
  if (!data) throw new Error('Réponse vide (cobalt v1)')

  if (data.status === 'error' || data.error) {
    throw new Error(data.error?.code || data.message || 'Erreur cobalt v1')
  }

  if (data.url) return { url: data.url, filename: data.filename || (audioOnly ? 'audio.mp3' : 'video.mp4') }

  if (Array.isArray(data.picker) && data.picker.length > 0) {
    const best = audioOnly
      ? data.picker.find(p => (p.type || '').includes('mp3')) || data.picker[0]
      : data.picker.find(p => (p.type || '').includes('mp4')) || data.picker[0]
    return { url: best.url, filename: best.filename || best.title || (audioOnly ? 'audio.mp3' : 'video.mp4') }
  }

  const msg = data.error || data.message || 'Téléchargement impossible'
  throw new Error(msg)
}

async function tryCobaltV2(url, audioOnly) {
  const apis = [
    'https://cobalt-api.ggtyler.dev/',
    'https://co.wuk.sh/',
  ]
  for (const api of apis) {
    try {
      const res = await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          url,
          isAudioOnly:   audioOnly,
          audioFormat:   'mp3',
          vQuality:      '720',
          filenameStyle: 'classic'
        }),
        signal: AbortSignal.timeout(30000)
      })
      const data = await res.json().catch(() => null)
      if (!data) continue

      if (data.url) return { url: data.url, filename: audioOnly ? 'audio.mp3' : 'video.mp4' }
      if (data.status === 'stream' && data.url) return { url: data.url, filename: audioOnly ? 'audio.mp3' : 'video.mp4' }
      if (data.status === 'picker' && data.picker?.[0]?.url) {
        return { url: data.picker[0].url, filename: audioOnly ? 'audio.mp3' : 'video.mp4' }
      }
    } catch {}
  }
  throw new Error('Toutes les APIs de secours ont échoué')
}

// Essaie cobalt v1 puis v2 en fallback
async function smartDownload(url, audioOnly) {
  try {
    return await tryCobaltV1(url, audioOnly)
  } catch (e1) {
    try {
      return await tryCobaltV2(url, audioOnly)
    } catch {
      throw e1
    }
  }
}

//══════════════════════════════════════
// VÉRIFICATION TAILLE
//══════════════════════════════════════

async function headSize(url) {
  try {
    const r = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(10000) })
    const len = r.headers.get('content-length')
    return len ? parseInt(len) : null
  } catch { return null }
}

//══════════════════════════════════════
// COMMANDE PRINCIPALE
//══════════════════════════════════════

export default async function download(sock, sender, args) {
  try {
    const rawArgs = args.join(' ').trim()

    // ── AIDE ─────────────────────────────────────────────────
    if (!rawArgs) {
      const list = PLATFORMS.map(p => `│ • ${p.name}`).join('\n')
      return await sendMessage(sock, sender,
        `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
        `     🕷️ ⬇️ *DOWNLOAD PRO* 🕷️\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️━━━〔 💡 𝐒𝐘𝐍𝐓𝐀𝐗𝐄 〕━━━🕸️\n` +
        `│\n` +
        `│ 🎬 *Vidéo:*\n` +
        `│   \`.download <url>\`\n` +
        `│\n` +
        `│ 🎵 *Audio/MP3:*\n` +
        `│   \`.download audio <url>\`\n` +
        `│   \`.download <url> mp3\`\n` +
        `│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
        `🕸️━━━〔 🌐 𝐏𝐋𝐀𝐓𝐄𝐅𝐎𝐑𝐌𝐄𝐒 〕━━━🕸️\n` +
        `│\n` +
        `${list}\n` +
        `│\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── DÉTECTION MODE AUDIO ──────────────────────────────────
    let audioOnly = false
    let urlInput  = rawArgs

    if (rawArgs.toLowerCase().startsWith('audio ') || rawArgs.toLowerCase().startsWith('mp3 ')) {
      audioOnly = true
      urlInput  = rawArgs.replace(/^(audio|mp3)\s+/i, '').trim()
    } else if (rawArgs.toLowerCase().endsWith(' mp3') || rawArgs.toLowerCase().endsWith(' audio')) {
      audioOnly = true
      urlInput  = rawArgs.replace(/\s+(mp3|audio)$/i, '').trim()
    }

    const url = urlInput.startsWith('http') ? urlInput : `https://${urlInput}`

    if (!isValidUrl(url)) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
        `│ URL invalide.\n` +
        `│ Exemple: \`.download https://youtu.be/xxx\`\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    const platform = detectPlatform(url)
    const modeLabel = audioOnly ? '🎵 Audio (MP3)' : '🎬 Vidéo'

    // ── MESSAGE DE PROGRESSION ────────────────────────────────
    await sendMessage(sock, sender,
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `     🕷️ ⬇️ *DOWNLOAD PRO* 🕷️\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️━━━〔 ⏳ 𝐄𝐍 𝐂𝐎𝐔𝐑𝐒 〕━━━🕸️\n` +
      `│\n` +
      `│ 🌐 Plateforme: *${platform}*\n` +
      `│ 📥 Mode: *${modeLabel}*\n` +
      `│ ⚙️ Récupération du fichier...\n` +
      `│\n` +
      `│ ⏱️ Patientez quelques secondes.\n` +
      `│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )

    // ── TÉLÉCHARGEMENT ────────────────────────────────────────
    const dl = await smartDownload(url, audioOnly)

    // ── CONTRÔLE TAILLE ──────────────────────────────────────
    const MAX_SIZE = audioOnly ? 32 * 1024 * 1024 : 64 * 1024 * 1024
    const size     = await headSize(dl.url)

    if (size && size > MAX_SIZE) {
      return await sendMessage(sock, sender,
        `🕸️━━━〔 ⚠️ 𝐅𝐈𝐂𝐇𝐈𝐄𝐑 𝐓𝐑𝐎𝐏 𝐋𝐎𝐔𝐑𝐃 〕━━━🕸️\n\n` +
        `│ 📦 Taille: *${formatSize(size)}*\n` +
        `│ 🚫 Limite WhatsApp: *${audioOnly ? '32MB' : '64MB'}*\n\n` +
        `│ 🔗 *Lien direct:*\n` +
        `│ ${dl.url.substring(0, 80)}\n\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
      )
    }

    // ── ENVOI ────────────────────────────────────────────────
    const sourceShort = url.length > 55 ? url.substring(0, 55) + '…' : url
    const sizeStr     = size ? ` • ${formatSize(size)}` : ''

    if (audioOnly) {
      await sock.sendMessage(sender, {
        audio:    { url: dl.url },
        mimetype: 'audio/mpeg',
        ptt:      false,
        fileName: dl.filename || 'audio.mp3',
        caption:
          `⚙️ *AUDIO PRÊT* 🎵\n\n` +
          `🌐 ${platform}${sizeStr}\n` +
          `🔗 ${sourceShort}\n` +
          `_J.A.R.V.I.S. • Download Pro_`
      })
    } else {
      await sock.sendMessage(sender, {
        video:    { url: dl.url },
        mimetype: 'video/mp4',
        fileName: dl.filename || 'video.mp4',
        caption:
          `⚙️ *VIDÉO PRÊTE* 🎬\n\n` +
          `🌐 ${platform}${sizeStr}\n` +
          `🔗 ${sourceShort}\n` +
          `_J.A.R.V.I.S. • Download Pro_`
      })
    }

    console.log(`✅ [DOWNLOAD] ${platform} | ${modeLabel} | ${url.substring(0, 60)}`)

  } catch (err) {
    console.error('❌ download error:', err)

    const isTimeout = err.message?.includes('timed out') || err.message?.includes('timeout') || err.name === 'TimeoutError'
    const isUnsupported = err.message?.includes('unsupported') || err.message?.includes('not supported')

    let advice = '• Vérifiez que le lien est correct et public\n│ • Réessayez dans quelques secondes'
    if (isTimeout)     advice = '• La requête a pris trop de temps.\n│ • Réessayez ou utilisez un lien plus court'
    if (isUnsupported) advice = '• Cette plateforme/vidéo n\'est pas supportée\n│ • Essayez avec YouTube ou TikTok'

    return await sendMessage(sock, sender,
      `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
      `     🕷️ 🕷️ *ÉCHEC DOWNLOAD* 🕷️\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
      `🕸️━━━〔 ⚠️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n` +
      `│\n` +
      `│ ${err?.message?.substring(0, 80) || 'opération échoué inconnue'}\n` +
      `│\n` +
      `│ 💡 *Conseils:*\n` +
      `│ ${advice}\n` +
      `│\n` +
      `│ ⬇️ \`.download\` → voir l\'aide\n` +
      `│\n` +
      `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )
  }
}
