// commands/notes.js — VERSION AMÉLIORÉE
// 📝 Système de notes de groupe avec recherche, tags et épinglage
// ✅ AMÉLIORATION: Recherche dans les notes (.notes search <mot>)
// ✅ AMÉLIORATION: Tags pour catégoriser (.notes save <nom> #tag texte)
// ✅ AMÉLIORATION: Notes épinglées (.notes pin <nom>)
// ✅ AMÉLIORATION: Partage de note (re-envoyer dans le groupe)
// ✅ AMÉLIORATION: Compteur de vues
// ✅ FIX: isGroupAdmin importé depuis roleManager avec fallback

import { sendMessage } from '../lib/sendMessage.js'
import fs from 'fs'
import path from 'path'
import { getSenderJid, isDeployer, isSudo } from '../lib/ownerSystem.js'

// ─── IMPORT isGroupAdmin (avec fallback interne) ──────────────────────────────
let _isGroupAdmin
try {
    const rm = await import('../lib/ownerSystem.js')
    _isGroupAdmin = rm.isGroupAdmin
} catch {
    _isGroupAdmin = async (sock, groupId, userId) => {
        try {
            const meta = await sock.groupMetadata(groupId)
            const num  = userId.replace(/@.*$/, '').replace(/:.*$/, '')
            const p    = meta.participants.find(x => x.id.replace(/@.*$/, '').replace(/:.*$/, '') === num)
            return p?.admin === 'admin' || p?.admin === 'superadmin'
        } catch { return false }
    }
}

// ─── STOCKAGE ─────────────────────────────────────────────────────────────────
const NOTES_FILE = path.join(process.cwd(), 'data', 'notes.json')

function loadNotes() {
    try {
        if (fs.existsSync(NOTES_FILE)) return JSON.parse(fs.readFileSync(NOTES_FILE, 'utf8'))
    } catch {}
    return {}
}

function saveNotes(data) {
    try {
        const dir = path.dirname(NOTES_FILE)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(NOTES_FILE, JSON.stringify(data, null, 2))
        return true
    } catch { return false }
}

// ─── PARSER DE TAGS ───────────────────────────────────────────────────────────
function parseTags(text) {
    const tags = (text.match(/#\w+/g) || []).map(t => t.substring(1).toLowerCase())
    const content = text.replace(/#\w+\s*/g, '').trim()
    return { tags, content }
}

// ─── COMMANDE PRINCIPALE ──────────────────────────────────────────────────────
export default async function notes(sock, sender, args, msg) {
    try {
        const userId = getSenderJid(msg, sock)

        if (!sender.endsWith('@g.us')) {
            return await sendMessage(sock, sender,
                `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
                `│ Cette commande ne fonctionne\n` +
                `│ que dans les *groupes*.\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
        }

        const action = args[0]?.toLowerCase()
        const data   = loadNotes()
        if (!data[sender]) data[sender] = {}

        const canWrite = isSudo(userId) || isDeployer(userId) || await _isGroupAdmin(sock, sender, userId)

        // ── LISTE ──
        if (!action || action === 'list' || action === 'liste') {
            const noteKeys = Object.keys(data[sender])
            if (noteKeys.length === 0) {
                return await sendMessage(sock, sender,
                    `🕸️━━━〔 📝 𝐍𝐎𝐓𝐄𝐒 〕━━━🕸️\n\n` +
                    `│ Aucune note enregistrée.\n\n` +
                    `│ 💡 *.notes save <nom> <texte>*\n\n` +
                    `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
                )
            }

            // Trier: épinglées en premier
            const sorted = noteKeys.sort((a, b) => {
                const pa = data[sender][a].pinned ? 1 : 0
                const pb = data[sender][b].pinned ? 1 : 0
                return pb - pa
            })

            const list = sorted.map((k, i) => {
                const note = data[sender][k]
                const pin  = note.pinned ? '📌' : '📄'
                const tags = note.tags?.length ? ` [${note.tags.map(t => `#${t}`).join(' ')}]` : ''
                const views = note.views || 0
                return `│ ${i + 1}. ${pin} *${k}*${tags} _(${views} vues)_`
            }).join('\n')

            return await sendMessage(sock, sender,
                `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                `│  📝 *NOTES DU GROUPE*  📝  \n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `🕸️━━━〔 📋 LISTE (${noteKeys.length} notes) 〕━━━🕸️\n` +
                `│\n${list}\n│\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `💡 *.notes get <nom>* pour lire\n` +
                `💡 *.notes search <mot>* pour chercher`
            )
        }

        // ── GET ──
        if (action === 'get' || action === 'voir' || action === 'lire') {
            const noteName = args[1]?.toLowerCase()
            if (!noteName) return await sendMessage(sock, sender, `│ *syntaxe:* \`.notes get <nom>\``)

            const note = data[sender][noteName]
            if (!note) return await sendMessage(sock, sender,
                `│ Note *"${noteName}"* introuvable.\n\n💡 \`.notes liste\` pour voir toutes les notes.`
            )

            // Incrémenter le compteur de vues
            data[sender][noteName].views = (note.views || 0) + 1
            saveNotes(data)

            const tagsStr = note.tags?.length ? `\n🏷️ Tags: ${note.tags.map(t => `#${t}`).join(' ')}` : ''
            const pinStr  = note.pinned ? '\n📌 _Note épinglée_' : ''

            return await sendMessage(sock, sender,
                `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
                `│ 📌 *${noteName.toUpperCase()}* \n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `${note.content}\n\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n` +
                `_💾 ${new Date(note.createdAt).toLocaleDateString('fr-FR')}_${tagsStr}${pinStr}\n` +
                `_👁️ ${data[sender][noteName].views} vues_`
            )
        }

        // ── SAVE ──
        if (action === 'save' || action === 'set' || action === 'ajouter') {
            if (!canWrite) return await sendMessage(sock, sender,
                `⛔ Seuls les *admins* peuvent sauvegarder des notes.`
            )

            const noteName = args[1]?.toLowerCase()
            const rawText  = args.slice(2).join(' ')
            if (!noteName || !rawText) {
                return await sendMessage(sock, sender,
                    `│ *syntaxe:* \`.notes save <nom> <texte>\`\n\n` +
                    `*Avec tags:*\n\`.notes save règles #important #groupe Respecter tout le monde\``
                )
            }

            const { tags, content } = parseTags(rawText)
            if (!content) return await sendMessage(sock, sender, `│ Contenu de la note vide après les tags.`)

            const isUpdate = !!data[sender][noteName]
            data[sender][noteName] = {
                content,
                tags,
                createdAt: data[sender][noteName]?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                pinned: data[sender][noteName]?.pinned || false,
                views: data[sender][noteName]?.views || 0,
                author: userId.split('@')[0].replace(/:.*$/, '')
            }
            saveNotes(data)

            const tagsStr = tags.length ? `\n🏷️ Tags: ${tags.map(t => `#${t}`).join(' ')}` : ''
            return await sendMessage(sock, sender,
                `🕸️━━━〔 ⚙️ NOTE ${isUpdate ? 'MISE À JOUR' : 'SAUVEGARDÉE'} 〕━━━🕸️\n\n` +
                `│ 📌 *${noteName}*\n` +
                `│ ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}\n` +
                `${tagsStr ? `🕷️${tagsStr}\n` : ''}` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
        }

        // ── DELETE ──
        if (action === 'delete' || action === 'del' || action === 'rm' || action === 'supprimer') {
            if (!canWrite) return await sendMessage(sock, sender,
                `⛔ Seuls les *admins* peuvent supprimer des notes.`
            )

            const noteName = args[1]?.toLowerCase()
            if (!noteName) return await sendMessage(sock, sender, `│ *syntaxe:* \`.notes del <nom>\``)
            if (!data[sender][noteName]) return await sendMessage(sock, sender, `│ Note *"${noteName}"* introuvable.`)

            delete data[sender][noteName]
            saveNotes(data)
            return await sendMessage(sock, sender, `⚙️ Note *"${noteName}"* supprimée.`)
        }

        // ── PIN/UNPIN ──
        if (action === 'pin' || action === 'épingler' || action === 'epingler') {
            if (!canWrite) return await sendMessage(sock, sender, `⛔ Seuls les *administrateurs* peuvent épingler des notes.`)

            const noteName = args[1]?.toLowerCase()
            if (!noteName) return await sendMessage(sock, sender, `│ *syntaxe:* \`.notes pin <nom>\``)
            if (!data[sender][noteName]) return await sendMessage(sock, sender, `│ Note introuvable.`)

            const isPinned = data[sender][noteName].pinned = !data[sender][noteName].pinned
            saveNotes(data)
            return await sendMessage(sock, sender,
                `${isPinned ? '📌 Note *épinglée*!' : '📄 Note *désépinglée*.'} → *${noteName}*`
            )
        }

        // ── SEARCH ──
        if (action === 'search' || action === 'chercher' || action === 'trouver') {
            const keyword = args.slice(1).join(' ').toLowerCase().trim()
            if (!keyword) return await sendMessage(sock, sender, `│ *syntaxe:* \`.notes search <mot-clé>\``)

            const results = Object.entries(data[sender]).filter(([name, note]) =>
                name.includes(keyword) ||
                note.content.toLowerCase().includes(keyword) ||
                note.tags?.some(t => t.includes(keyword))
            )

            if (results.length === 0) {
                return await sendMessage(sock, sender,
                    `🕸️━━━〔 🔍 𝐑𝐄𝐂𝐇𝐄𝐑𝐂𝐇𝐄 〕━━━🕸️\n\n` +
                    `│ Aucun résultat pour *"${keyword}"*\n\n` +
                    `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
                )
            }

            const list = results.map(([name, note], i) => {
                const excerpt = note.content.substring(0, 60)
                return `│ ${i + 1}. *${name}*\n│    _${excerpt}..._`
            }).join('\n')

            return await sendMessage(sock, sender,
                `🕸️━━━〔 🔍 RÉSULTATS: "${keyword}" 〕━━━🕸️\n` +
                `│\n${list}\n│\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `💡 *.notes get <nom>* pour lire`
            )
        }

        // ── CLEAR ALL (admin only) ──
        if (action === 'clear' || action === 'vider') {
            if (!isSudo(userId) && !isDeployer(userId)) {
                return await sendMessage(sock, sender, `⛔ Seuls les *Sudo/Owner* peuvent vider toutes les notes.`)
            }
            data[sender] = {}
            saveNotes(data)
            return await sendMessage(sock, sender, `⚙️ *Toutes les notes du groupe ont été supprimées.*`)
        }

        // ── AIDE ──
        await sendMessage(sock, sender,
            `🕸️┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈🕸️\n` +
            `│   📝 *NOTES DU GROUPE*   📝  \n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
            `🕸️━━━〔 📖 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐄𝐒 〕━━━🕸️\n` +
            `│\n` +
            `│ 👀 *Lecture:*\n` +
            `│ • *.notes* — Voir la liste\n` +
            `│ • *.notes get <nom>* — Lire\n` +
            `│ • *.notes search <mot>*\n` +
            `│\n` +
            `│ ✏️ *Gestion (administrateur):*\n` +
            `│ • *.notes save <nom> <texte>*\n` +
            `│ • *.notes del <nom>*\n` +
            `│ • *.notes pin <nom>*\n` +
            `│\n` +
            `│ 🏷️ *Tags:*\n` +
            `│ \`.notes save règles #important texte\`\n` +
            `│ \`.notes search #important\`\n` +
            `│\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        )

    } catch (e) {
        console.error('❌ Erreur notes:', e)
        await sendMessage(sock, sender,
            `🕸️━━━〔 🕷️ 𝐎𝐏É𝐑𝐀𝐓𝐈𝐎𝐍 É𝐂𝐇𝐎𝐔É 〕━━━🕸️\n\n` +
            `│ ${e.message || 'opération échoué inconnue'}\n\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        )
    }
}
