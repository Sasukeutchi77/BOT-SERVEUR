// lib/scheduler.js — J.A.R.V.I.S.
// ╔══════════════════════════════════════════════════════════╗
// ║  SYSTÈME DE TÂCHES PROGRAMMÉES                           ║
// ║                                                          ║
// ║  • Persistance sur disque   : database/tasks.json        ║
// ║  • Parsing intelligent FR   : "dans 30mn", "à 13h30"     ║
// ║  • Actions supportées       :                            ║
// ║       - sendMessage         (envoyer un texte)           ║
// ║       - removeMember        (supprimer un membre)        ║
// ║       - closeGroup          (fermer le groupe)           ║
// ║       - openGroup           (ouvrir le groupe)           ║
// ║  • Scheduler global         : tick toutes les 5 s        ║
// ╚══════════════════════════════════════════════════════════╝

import fs from 'fs'
import path from 'path'

// ─────────────────────────────────────────────────────────────
// PERSISTANCE
// ─────────────────────────────────────────────────────────────
const TASKS_DIR  = path.join(process.cwd(), 'database')
const TASKS_FILE = path.join(TASKS_DIR, 'tasks.json')

function ensureFile() {
    try {
        if (!fs.existsSync(TASKS_DIR))  fs.mkdirSync(TASKS_DIR, { recursive: true })
        if (!fs.existsSync(TASKS_FILE)) fs.writeFileSync(TASKS_FILE, '[]', 'utf8')
    } catch (e) { console.error('scheduler ensureFile:', e.message) }
}

export function loadTasks() {
    ensureFile()
    try {
        const raw = fs.readFileSync(TASKS_FILE, 'utf8')
        const arr = JSON.parse(raw)
        return Array.isArray(arr) ? arr : []
    } catch (e) {
        console.error('scheduler loadTasks:', e.message)
        return []
    }
}

export function saveTasks(tasks) {
    ensureFile()
    try {
        fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf8')
        return true
    } catch (e) {
        console.error('scheduler saveTasks:', e.message)
        return false
    }
}

function nextId(tasks) {
    let max = 0
    for (const t of tasks) if (typeof t.id === 'number' && t.id > max) max = t.id
    return max + 1
}

export function addTask(task) {
    const tasks = loadTasks()
    const item = {
        id:        nextId(tasks),
        time:      task.time,
        type:      task.type,
        chatId:    task.chatId  || null,
        target:    task.target  || null,
        message:   task.message || null,
        createdBy: task.createdBy || null,
        createdAt: Date.now(),
        done:      false
    }
    tasks.push(item)
    saveTasks(tasks)
    return item
}

export function listPendingTasks(chatId = null) {
    const tasks = loadTasks().filter(t => !t.done)
    if (chatId) return tasks.filter(t => t.chatId === chatId)
    return tasks
}

export function cancelTask(id) {
    const tasks = loadTasks()
    const idx = tasks.findIndex(t => t.id === Number(id) && !t.done)
    if (idx === -1) return false
    tasks.splice(idx, 1)
    saveTasks(tasks)
    return true
}

function markDone(id) {
    const tasks = loadTasks()
    const t = tasks.find(x => x.id === id)
    if (!t) return
    t.done = true
    t.executedAt = Date.now()
    saveTasks(tasks)
}

// ─────────────────────────────────────────────────────────────
// FORMATTAGE
// ─────────────────────────────────────────────────────────────
export function formatDateFr(ts) {
    const d = new Date(ts)
    const pad = n => String(n).padStart(2, '0')
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} à ${pad(d.getHours())}h${pad(d.getMinutes())}`
}

function jidFromNumber(num) {
    const clean = String(num).replace(/[^0-9]/g, '')
    if (!clean) return null
    return `${clean}@s.whatsapp.net`
}

// ─────────────────────────────────────────────────────────────
// PARSING — TEMPS
// ─────────────────────────────────────────────────────────────
// Retourne { time: <timestamp ms>, raw: <portion matchée> } ou null
export function parseTime(text) {
    if (!text || typeof text !== 'string') return null
    const t = text.toLowerCase()

    // ── "dans X (sec|s|secondes|mn|min|minutes|h|heures|j|jours)" ──
    const reIn = /\bdans\s+(\d+)\s*(secondes?|sec|s|minutes?|min|mn|heures?|h|jours?|j)\b/i
    const m1 = t.match(reIn)
    if (m1) {
        const n    = parseInt(m1[1], 10)
        const unit = m1[2].toLowerCase()
        let ms = 0
        if (/^(s|sec|seconde|secondes)$/.test(unit))   ms = n * 1_000
        else if (/^(mn|min|minute|minutes)$/.test(unit)) ms = n * 60_000
        else if (/^(h|heure|heures)$/.test(unit))        ms = n * 3_600_000
        else if (/^(j|jour|jours)$/.test(unit))          ms = n * 86_400_000
        if (ms > 0) return { time: Date.now() + ms, raw: m1[0] }
    }

    // ── "à HHhMM", "a HHh", "à 13:30" ──
    // ⚠️ \b ne reconnaît pas les accents en JS → on utilise (?:^|\s)
    const reAt = /(?:^|\s)([àa])\s*(\d{1,2})\s*(?:[hH:]\s*(\d{0,2})|h)/
    const m2 = t.match(reAt)
    if (m2) {
        const hh = parseInt(m2[2], 10)
        const mm = m2[3] ? parseInt(m2[3], 10) : 0
        if (hh >= 0 && hh < 24 && mm >= 0 && mm < 60) {
            const target = new Date()
            target.setHours(hh, mm, 0, 0)
            if (target.getTime() <= Date.now()) {
                target.setDate(target.getDate() + 1)
            }
            const raw = m2[0].replace(/^\s+/, '')
            return { time: target.getTime(), raw }
        }
    }

    return null
}

// ─────────────────────────────────────────────────────────────
// PARSING — ACTION
// ─────────────────────────────────────────────────────────────
// text  = la phrase entière SANS la portion "temps"
// chatId = sender (groupe ou DM)
// Retourne { type, target, message, chatId } ou { error }
export function parseAction(text, chatId) {
    if (!text || !text.trim()) return { error: 'Aucune action détectée.' }
    const lower = text.toLowerCase().trim()

    // ─────────────────────────────────────────────────────────
    // FERMER LE GROUPE
    // Exemples couverts :
    //   "ferme le groupe", "fermer le groupe", "il faut fermer le groupe"
    //   "ferme le gp", "close le group", "verrouille le groupe"
    // ─────────────────────────────────────────────────────────
    const reClose = /\b(ferme(?:r)?|clos(?:e(?:r)?)?|verrouille(?:r)?|lock)\b[\s\S]*\b(groupe?|group|gp)\b/i
    if (reClose.test(lower)) {
        if (!chatId || !chatId.endsWith('@g.us')) {
            return { error: "L'action *fermer le groupe* doit être lancée depuis un groupe." }
        }
        return { type: 'closeGroup', chatId }
    }

    // ─────────────────────────────────────────────────────────
    // OUVRIR LE GROUPE
    // Exemples couverts :
    //   "ouvre le groupe", "ouvrir le groupe", "il faut ouvrir le groupe"
    //   "open le group", "déverrouille le groupe"
    // ─────────────────────────────────────────────────────────
    const reOpen = /\b(ouvre(?:r)?|open|d[ée]verrouille(?:r)?|unlock)\b[\s\S]*\b(groupe?|group|gp)\b/i
    if (reOpen.test(lower)) {
        if (!chatId || !chatId.endsWith('@g.us')) {
            return { error: "L'action *ouvrir le groupe* doit être lancée depuis un groupe." }
        }
        return { type: 'openGroup', chatId }
    }

    // ─────────────────────────────────────────────────────────
    // SUPPRIMER / KICK UN MEMBRE
    // Exemples couverts :
    //   "supprime +226XXXXXXXX", "supprimer+226XXXXXXXX" (pas d'espace)
    //   "kick +226...", "expulse +226...", "retire +226...", "vire +226..."
    //   "il faut supprimer +226..."
    // ─────────────────────────────────────────────────────────
    const reKick = /\b(supprime(?:r)?|kick(?:er)?|expulse(?:r)?|retire(?:r)?|vire(?:r)?|ban(?:nir)?|remove)\b/i
    if (reKick.test(lower)) {
        const num = extractPhoneNumber(text)
        if (!num) {
            return { error: 'Numéro introuvable.\nFormat attendu : *+226XXXXXXXX* ou *226XXXXXXXX*' }
        }
        if (!chatId || !chatId.endsWith('@g.us')) {
            return { error: "L'action *supprimer* doit être lancée depuis un groupe." }
        }
        return { type: 'removeMember', chatId, target: jidFromNumber(num) }
    }

    // ─────────────────────────────────────────────────────────
    // ENVOYER UN MESSAGE
    // Exemples couverts :
    //   "envoie bonjour", "envoyer salut à +226...", "dis bonjour"
    //   "envoie bonjour à +226...", "écris coucou"
    // ─────────────────────────────────────────────────────────
    const reSend = /\b(envoie(?:r|z)?|envoi(?:s)?|send|dis|dire|[ée]cri(?:s|re|vez)?)\b/i
    if (reSend.test(lower)) {
        const num     = extractPhoneNumber(text)
        const message = extractMessageBody(text)
        if (!message) {
            return { error: 'Message à envoyer introuvable après le verbe.' }
        }
        const target = num ? jidFromNumber(num) : chatId
        if (!target) {
            return { error: 'Destinataire introuvable.' }
        }
        return { type: 'sendMessage', chatId: target, message }
    }

    return {
        error:
            '⚠️ Action non reconnue.\n\n' +
            '*Actions disponibles :*\n' +
            '• envoyer <message> [à +numéro]\n' +
            '• supprimer +numéro\n' +
            '• fermer le groupe\n' +
            '• ouvrir le groupe'
    }
}

// ─────────────────────────────────────────────────────────────
// HELPERS PARSING
// ─────────────────────────────────────────────────────────────

// Récupère un numéro de téléphone complet depuis le texte
// Supporte : "+226XXXXXXXX", "226XXXXXXXX", "supprimer+226XXXXXXXX" (sans espace)
function extractPhoneNumber(text) {
    if (!text) return null
    // Cherche un + optionnel suivi de 8 à 15 chiffres consécutifs
    const m = text.match(/\+?(\d[\d]{7,14}\d)/)
    if (!m) return null
    const digits = m[1].replace(/\D/g, '')
    if (digits.length < 8 || digits.length > 16) return null
    return digits
}

// Extrait le corps du message après le verbe d'envoi
// Retire les "à +numéro" et guillemets parasites
function extractMessageBody(text) {
    if (!text) return null

    const vMatch = text.match(/\b(envoie(?:r|z)?|envoi(?:s)?|send|dis|dire|[ée]cri(?:s|re|vez)?)\b/i)
    if (!vMatch) return null
    let body = text.slice(vMatch.index + vMatch[0].length).trim()

    // Retirer "à +numéro" à la fin ou au milieu
    body = body.replace(/\s*[àa]\s*\+?\d{8,15}\s*$/i, '').trim()
    body = body.replace(/\s*[àa]\s*\+?\d{8,15}\b/i,    '').trim()

    // Retirer "le message" / "ce message" en début
    body = body.replace(/^(le\s+message|ce\s+message)\s*[:,-]?\s*/i, '').trim()

    // Retirer guillemets autour
    body = body.replace(/^["'«»\u201c\u201d](.+)["'«»\u201c\u201d]$/s, '$1').trim()

    return body || null
}

// ─────────────────────────────────────────────────────────────
// EXÉCUTION DES ACTIONS
// ─────────────────────────────────────────────────────────────
async function executeTask(sock, task) {
    try {
        if (!sock) throw new Error('socket non disponible')
        switch (task.type) {
            case 'sendMessage':
                await sock.sendMessage(task.chatId, { text: task.message || '' })
                break
            case 'removeMember':
                await sock.groupParticipantsUpdate(task.chatId, [task.target], 'remove')
                break
            case 'closeGroup':
                await sock.groupSettingUpdate(task.chatId, 'announcement')
                break
            case 'openGroup':
                await sock.groupSettingUpdate(task.chatId, 'not_announcement')
                break
            default:
                console.warn('scheduler: type inconnu :', task.type)
                return false
        }
        return true
    } catch (e) {
        console.error(`scheduler exec [${task.type} #${task.id}] :`, e.message)
        return false
    }
}

// ─────────────────────────────────────────────────────────────
// SCHEDULER GLOBAL
// ─────────────────────────────────────────────────────────────
// _sock est stocké séparément de l'intervalle pour pouvoir être
// mis à jour à chaque reconnexion sans redémarrer le ticker.
let _sock     = null
let _interval = null

export function startScheduler(sock, intervalMs = 5000) {
    // ── Toujours mettre à jour le socket ──────────────────
    // CORRECTION BUG : dans l'ancienne version, le socket n'était
    // jamais mis à jour en cas de reconnexion car la fonction
    // retournait trop tôt. Maintenant on met à jour _sock en premier.
    _sock = sock

    if (_interval) {
        // Intervalle déjà actif, on a juste mis à jour le socket
        console.log('⏰ Scheduler: socket mis à jour (reconnexion)')
        return
    }

    ensureFile()

    const tick = async () => {
        // Utilise toujours _sock (la référence la plus récente)
        if (!_sock) return
        try {
            const now  = Date.now()
            const tasks = loadTasks()
            const due   = tasks.filter(t => !t.done && t.time <= now)
            if (due.length === 0) return

            for (const t of due) {
                const ok = await executeTask(_sock, t)
                if (ok) {
                    markDone(t.id)
                    console.log(`✅ scheduler: tâche #${t.id} (${t.type}) exécutée`)
                } else {
                    // En cas d'échec : on repousse de 30 s (max 3 tentatives)
                    const all   = loadTasks()
                    const found = all.find(x => x.id === t.id)
                    if (found && !found.done) {
                        found.attempts = (found.attempts || 0) + 1
                        if (found.attempts >= 3) {
                            found.done  = true
                            found.error = 'Échec après 3 tentatives'
                            console.error(`✘ scheduler: tâche #${t.id} abandonnée`)
                        } else {
                            found.time = Date.now() + 30_000
                            console.warn(`⚠️ scheduler: tâche #${t.id} repoussée (tentative ${found.attempts}/3)`)
                        }
                        saveTasks(all)
                    }
                }
            }
        } catch (e) {
            console.error('scheduler tick:', e.message)
        }
    }

    _interval = setInterval(tick, intervalMs)
    console.log(`⏰ Scheduler démarré (tick = ${intervalMs} ms)`)
}

export function stopScheduler() {
    if (_interval) {
        clearInterval(_interval)
        _interval = null
        console.log('⏰ Scheduler arrêté')
    }
}
