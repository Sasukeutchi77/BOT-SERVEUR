// commands/tgs.js — TGS
// ╔══════════════════════════════════════════════════════╗
// ║  IMPORT DE PACKS STICKERS TELEGRAM                   ║
// ║  .tgs <lien>           → sticker n°1 + fiche du pack ║
// ║  .tgs <lien> <numéro>  → sticker précis              ║
// ║  .tgs <lien> all       → jusqu'à 10 stickers         ║
// ║  .tgs <lien> full      → PACK COMPLET (owner/sudo)   ║
// ║  .tgs stop             → annuler un import en cours  ║
// ╚══════════════════════════════════════════════════════╝

// ⚠️ NE PAS importer 'wa-sticker-formatter' / 'ffmpeg-static' / 'puppeteer-lottie'
// en haut du fichier : ce sont des imports STATIQUES. Si l'un de ces paquets
// n'est pas installé, tout le module échoue au chargement et la commande
// devient muette (voir lib/messageHandler.js → loadCommand()).
// On reproduit ici le même pattern que commands/sticker.js : Sharp (déjà une
// dépendance du projet) pour les images, et le binaire système `ffmpeg`
// (via child_process, pas le paquet npm ffmpeg-static) pour les vidéos.
import { sendMessage } from '../lib/sendMessage.js'
import { isOwner, isSudo } from '../lib/ownerSystem.js'
import fs   from 'fs'
import path from 'path'
import os   from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// 🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️
// CONFIG
// 🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️

const BOT_TOKEN  = process.env.TELEGRAM_BOT_TOKEN
const MAX_BULK   = 10       // max pour ".tgs <lien> all"
const MAX_FULL   = 120      // limite de sécurité Telegram (taille max d'un pack)
const BULK_DELAY = 800      // délai (ms) en mode "all"
const FULL_DELAY_MIN = 1200 // délai min (ms) en mode "full" — anti-ban
const FULL_DELAY_MAX = 2000 // délai max (ms) en mode "full" — anti-ban
const PROGRESS_EVERY = 10   // message de progression tous les N stickers
const FETCH_TIMEOUT = 30000

// ─── Imports en cours (pour .tgs stop) ───
const activeJobs = new Map() // senderJid → { cancelled: false }

// 🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️
// UTILITAIRES
// 🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️

function box(title, body) {
    return (
        `🕸️━━━〔 ${title} 〕━━━🕸️\n` +
        `│\n` +
        `${body}\n` +
        `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    )
}

function extractPackName(link) {
    const m = link.match(/t\.me\/(?:addstickers\/)?([a-zA-Z0-9_]+)/i)
    return m ? m[1] : null
}

// fetch natif Node 18+ avec timeout (évite les commandes qui pendent)
async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT) {
    const ctrl  = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
        return await fetch(url, { ...options, signal: ctrl.signal })
    } finally {
        clearTimeout(timer)
    }
}

async function tgApi(method, params = {}) {
    const qs  = new URLSearchParams(params).toString()
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}${qs ? '?' + qs : ''}`
    const res  = await fetchWithTimeout(url)
    const json = await res.json()
    if (!json.ok) throw new Error(json.description || `Erreur API Telegram (${method})`)
    return json.result
}

async function downloadTgFile(filePath) {
    const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`
    const res = await fetchWithTimeout(url)
    if (!res.ok) throw new Error('Téléchargement du fichier Telegram échoué')
    return Buffer.from(await res.arrayBuffer())
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

function formatDuration(ms) {
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    if (m > 0) return `${m}m ${s % 60}s`
    return `${s}s`
}

// 🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️
// CONVERSION D'UN STICKER
// 🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️

// Retourne toujours { buffer, isAnimated, unsupported }.
// - buffer=null + unsupported='lottie' → cas Lottie animé, volontairement
//   non rendu ici (nécessiterait Chromium via puppeteer-lottie, trop lourd
//   pour un hébergement à ressources limitées). On le signale proprement
//   au lieu de planter.
async function buildSticker(chosen, rawBuffer) {
    // ── Sticker animé Lottie (.tgs = JSON gzippé, vectoriel) ──
    if (chosen.is_animated && !chosen.is_video) {
        return { buffer: null, isAnimated: false, unsupported: 'lottie' }
    }

    // ── Sticker vidéo (.webm VP9) → webp animé via le binaire ffmpeg système ──
    if (chosen.is_video) {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tgv-'))
        try {
            const inputPath  = path.join(tmpDir, 'anim.webm')
            const outputPath = path.join(tmpDir, 'anim.webp')
            fs.writeFileSync(inputPath, rawBuffer)

            await execAsync(
                `ffmpeg -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0.0" -t 8 -vcodec libwebp -loop 0 -preset default -an -vsync 0 "${outputPath}"`,
                { timeout: 30000 }
            )

            if (!fs.existsSync(outputPath)) throw new Error("FFmpeg n'a produit aucune sortie")
            return { buffer: fs.readFileSync(outputPath), isAnimated: true, unsupported: null }
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true })
        }
    }

    // ── Sticker statique (.webp) → normalisation via Sharp ──
    try {
        const sharp = (await import('sharp')).default
        const buffer = await sharp(rawBuffer)
            .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .webp({ quality: 85 })
            .toBuffer()
        return { buffer, isAnimated: false, unsupported: null }
    } catch (e) {
        // Sharp échoue rarement sur un .webp déjà valide → on l'envoie tel quel
        return { buffer: rawBuffer, isAnimated: false, unsupported: null }
    }
}

async function fetchAndConvert(chosen) {
    const fileInfo  = await tgApi('getFile', { file_id: chosen.file_id })
    const rawBuffer = await downloadTgFile(fileInfo.file_path)
    return await buildSticker(chosen, rawBuffer)
}

// 🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️
// FICHE D'INFORMATION DU PACK
// 🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️

function packInfoBox(set) {
    const stickers = set.stickers || []
    const animated = stickers.filter(s => s.is_animated && !s.is_video).length
    const video    = stickers.filter(s => s.is_video).length
    const statique = stickers.length - animated - video

    return box('📦 ' + set.title, [
        `│  🎨 *${stickers.length}* stickers`,
        `│  ✨ animés : *${animated}*`,
        `│  🖼️ statiques : *${statique}*`,
        `│  🎬 vidéo : *${video}*`,
        `│`,
        `│  💡 *.tgs <lien> <numéro>* — un sticker précis`,
        `│  💡 *.tgs <lien> all* — les ${Math.min(MAX_BULK, stickers.length)} premiers`,
        `│  💡 *.tgs <lien> full* — le pack complet`
    ].join('\n'))
}

// 🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️
// BOUCLE D'ENVOI (partagée par "all" et "full")
// 🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️

async function sendBatch(sock, sender, set, list, job, minDelay, maxDelay) {
    const skipped = []
    const start   = Date.now()
    let   sent    = 0

    for (let i = 0; i < list.length; i++) {
        // ── Arrêt demandé via .tgs stop ──
        if (job?.cancelled) {
            return { aborted: true, sent, skipped, elapsed: Date.now() - start }
        }

        try {
            const { buffer, isAnimated } = await fetchAndConvert(list[i])
            if (buffer) {
                await sock.sendMessage(sender, { sticker: buffer, isAnimated })
                sent++
            } else {
                // Lottie animé non pris en charge → compté comme échec silencieux
                skipped.push(i + 1)
            }
        } catch {
            skipped.push(i + 1)
        }

        // ── Progression tous les N stickers ──
        if ((i + 1) % PROGRESS_EVERY === 0 && i < list.length - 1) {
            await sendMessage(sock, sender,
                `🕸️ *${set.title}* — *${i + 1}/${list.length}* convertis... _(.tgs stop pour annuler)_`
            )
        }

        // ── Délai anti-ban aléatoire (sauf après le dernier) ──
        if (i < list.length - 1) {
            const delay = minDelay + Math.random() * (maxDelay - minDelay)
            await sleep(delay)
        }
    }

    return { aborted: false, sent, skipped, elapsed: Date.now() - start }
}

// 🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️
// COMMANDE PRINCIPALE
// 🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️

export default async function tgs(sock, sender, args, msg, ctx = {}) {
    const senderJid = ctx?.senderJid || msg.key.participant || msg.key.remoteJid

    try {
        // ── Vérification du token ───────────────────────────
        if (!BOT_TOKEN) {
            return await sendMessage(sock, sender, box('⚙️ 𝐂𝐎𝐍𝐅𝐈𝐆𝐔𝐑𝐀𝐓𝐈𝐎𝐍', [
                `│  Le token du Bot Telegram n'est pas`,
                `│  configuré, Monsieur.`,
                `│`,
                `│  1. Ouvre @BotFather sur Telegram`,
                `│  2. Crée un bot → récupère le token`,
                `│  3. Ajoute *TELEGRAM_BOT_TOKEN* dans .env`
            ].join('\n')))
        }

        // ── Arrêt d'un import en cours ──────────────────────
        if (args[0] && args[0].toLowerCase() === 'stop') {
            const job = activeJobs.get(senderJid)
            if (!job) {
                return await sendMessage(sock, sender, box('🕷️ 𝐀𝐔𝐂𝐔𝐍 𝐈𝐌𝐏𝐎𝐑𝐓', [
                    `│  Aucun import en cours, Monsieur.`
                ].join('\n')))
            }
            job.cancelled = true
            return await sendMessage(sock, sender, box('🛑 𝐀𝐑𝐑Ê𝐓', [
                `│  Arrêt de l'import demandé...`,
                `│  Je termine le sticker en cours.`
            ].join('\n')))
        }

        // ── Syntaxe ─────────────────────────────────────────
        const link = args[0]
        if (!link || !link.includes('t.me')) {
            return await sendMessage(sock, sender, box('📦 𝐒𝐘𝐍𝐓𝐀𝐗𝐄', [
                `│  *.tgs <lien du pack Telegram>*`,
                `│  *.tgs <lien> <numéro>* — sticker précis`,
                `│  *.tgs <lien> all* — jusqu'à *${MAX_BULK}* stickers`,
                `│  *.tgs <lien> full* — le pack complet (owner/sudo)`,
                `│  *.tgs stop* — annuler un import en cours`,
                `│`,
                `│  📋 *Exemples :*`,
                `│  .tgs https://t.me/addstickers/MonPack`,
                `│  .tgs https://t.me/addstickers/MonPack 3`,
                `│  .tgs https://t.me/addstickers/MonPack all`,
                `│  .tgs https://t.me/addstickers/MonPack full`
            ].join('\n')))
        }

        const packName = extractPackName(link)
        if (!packName) {
            return await sendMessage(sock, sender, box('🕷️ 𝐋𝐈𝐄𝐍 𝐈𝐍𝐕𝐀𝐋𝐈𝐃𝐄', [
                `│  Impossible d'extraire le nom du pack`,
                `│  depuis ce lien, Monsieur.`
            ].join('\n')))
        }

        const mode = (args[1] || '').toLowerCase()

        // ── Mode full : réservé owner/sudo ──────────────────
        if (mode === 'full' && !isOwner(senderJid) && !isSudo(senderJid)) {
            return await sendMessage(sock, sender, box('🔒 𝐀𝐂𝐂È𝐒 𝐑É𝐒𝐄𝐑𝐕É', [
                `│  L'import complet est réservé au`,
                `│  propriétaire, Monsieur.`,
                `│`,
                `│  💡 *.tgs <lien> all* — les ${MAX_BULK} premiers`
            ].join('\n')))
        }

        // ── Un seul import à la fois par utilisateur ────────
        if (activeJobs.has(senderJid)) {
            return await sendMessage(sock, sender, box('⏳ 𝐃É𝐉À 𝐄𝐍 𝐂𝐎𝐔𝐑𝐒', [
                `│  Un import est déjà en cours, Monsieur.`,
                `│  Tapez *.tgs stop* pour l'annuler.`
            ].join('\n')))
        }

        // ── Récupération du pack ────────────────────────────
        await sendMessage(sock, sender, box('🕸️ 𝐓𝐈𝐒𝐒𝐀𝐆𝐄 𝐄𝐍 𝐂𝐎𝐔𝐑𝐒', [
            `│  Récupération du pack *${packName}*...`
        ].join('\n')))

        const set      = await tgApi('getStickerSet', { name: packName })
        const stickers = set.stickers || []

        if (!stickers.length) {
            return await sendMessage(sock, sender, box('🕷️ 𝐏𝐀𝐂𝐊 𝐕𝐈𝐃𝐄', [
                `│  Ce pack ne contient aucun sticker.`
            ].join('\n')))
        }

        // ── Limite de sécurité ──────────────────────────────
        if (mode === 'full' && stickers.length > MAX_FULL) {
            return await sendMessage(sock, sender, box('🕷️ 𝐏𝐀𝐂𝐊 𝐓𝐑𝐎𝐏 𝐆𝐑𝐎𝐒', [
                `│  *${stickers.length}* stickers détectés.`,
                `│  Limite de sécurité : *${MAX_FULL}*.`
            ].join('\n')))
        }

        // ═══ MODE FULL : pack complet ═══
        if (mode === 'full') {
            const job = { cancelled: false }
            activeJobs.set(senderJid, job)

            try {
                await sendMessage(sock, sender,
                    packInfoBox(set) +
                    `\n\n🕸️ *Import complet lancé :* ${stickers.length} stickers.\n_⏱️ ~${Math.round(stickers.length * 1.6)}s estimés • .tgs stop pour annuler_`
                )

                const res = await sendBatch(sock, sender, set, stickers, job, FULL_DELAY_MIN, FULL_DELAY_MAX)

                // ── Rapport final ──
                if (res.aborted) {
                    return await sendMessage(sock, sender, box('🛑 𝐈𝐌𝐏𝐎𝐑𝐓 𝐀𝐑𝐑Ê𝐓É', [
                        `│  *${res.sent}/${stickers.length}* stickers importés`,
                        `│  avant l'annulation.`,
                        `│  ⏱️ Durée : ${formatDuration(res.elapsed)}`,
                        res.skipped.length ? `│  ⚠️ Échecs : ${res.skipped.join(', ')}` : `│`
                    ].join('\n')))
                }

                const skipLine = res.skipped.length
                    ? `\n│  ⚠️ Échecs : ${res.skipped.join(', ')}`
                    : ''

                return await sendMessage(sock, sender, box('✅ 𝐏𝐀𝐂𝐊 𝐂𝐎𝐌𝐏𝐋𝐄𝐓', [
                    `│  *${res.sent}/${stickers.length}* stickers importés !`,
                    `│  Pack : *${set.title}*`,
                    `│  ⏱️ Durée : ${formatDuration(res.elapsed)}${skipLine}`
                ].join('\n')))
            } finally {
                activeJobs.delete(senderJid)
            }
        }

        // ═══ MODE ALL : jusqu'à MAX_BULK ═══
        if (mode === 'all') {
            const batch = stickers.slice(0, MAX_BULK)
            await sendMessage(sock, sender, packInfoBox(set))

            const res = await sendBatch(sock, sender, set, batch, null, BULK_DELAY, BULK_DELAY)

            const more = stickers.length > MAX_BULK
                ? `\n│  📄 *${stickers.length - MAX_BULK}* autres — *.tgs <lien> full* (owner).`
                : ''
            const skipLine = res.skipped.length
                ? `\n│  ⚠️ Échec sur : ${res.skipped.join(', ')}`
                : ''

            return await sendMessage(sock, sender, box('✅ 𝐓𝐄𝐑𝐌𝐈𝐍É', [
                `│  *${res.sent}/${batch.length}* stickers importés.`,
                `│  Pack : *${set.title}*${more}${skipLine}`
            ].join('\n')))
        }

        // ═══ MODE SIMPLE : un sticker précis (défaut : n°1) ═══
        const index  = parseInt(args[1]) || 1
        const chosen = stickers[index - 1]

        if (!chosen) {
            return await sendMessage(sock, sender, box('🕷️ 𝐍𝐔𝐌É𝐑𝐎 𝐈𝐍𝐕𝐀𝐋𝐈𝐃𝐄', [
                `│  Le pack *${set.title}* contient`,
                `│  *${stickers.length}* stickers.`,
                `│  Choisis un numéro entre *1* et *${stickers.length}*.`
            ].join('\n')))
        }

        const { buffer, isAnimated, unsupported } = await fetchAndConvert(chosen)

        if (!buffer) {
            const reason = unsupported === 'lottie'
                ? [
                    `│  Ce sticker est un *Lottie animé* (.tgs vectoriel).`,
                    `│  Son rendu n'est pas pris en charge sur cet`,
                    `│  hébergement (nécessite Chromium, trop lourd).`,
                    `│`,
                    `│  💡 Essaie un autre numéro : *.tgs <lien> <n°>*`
                  ].join('\n')
                : `│  Conversion impossible pour ce sticker.`
            return await sendMessage(sock, sender, box('🕷️ 𝐍𝐎𝐍 𝐒𝐔𝐏𝐏𝐎𝐑𝐓É', reason))
        }

        await sendMessage(sock, sender,
            packInfoBox(set) + `\n\n🕸️ Sticker *${index}/${stickers.length}* :`
        )

        await sock.sendMessage(sender, { sticker: buffer, isAnimated })

    } catch (e) {
        console.error('❌ tgs.js erreur:', e)
        activeJobs.delete(senderJid)
        await sendMessage(sock, sender, box('🕷️ 𝐂𝐎𝐍𝐕𝐄𝐑𝐒𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É𝐄', [
            `│  ${(e.message || 'Erreur inconnue').slice(0, 110)}`,
            `│`,
            `│  💡 Vérifie le token et le nom du pack.`
        ].join('\n')))
    }
}
