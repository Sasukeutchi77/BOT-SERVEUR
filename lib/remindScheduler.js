// lib/remindScheduler.js — J.A.R.V.I.S.
// ── Envoie réellement les rappels (.remind) et les messages
//    programmés (.schedule), qui jusqu'ici étaient seulement
//    enregistrés sur disque sans jamais être délivrés.

import { loadV2Db, saveV2Db } from './groupConfig.js'

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function currentHHMM() {
  const d = new Date()
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

async function tick(sock) {
  let db
  try {
    db = loadV2Db()
  } catch (e) {
    console.error('[RemindScheduler] loadV2Db:', e.message)
    return
  }

  let changed = false
  const now = Date.now()

  // ── Rappels (.remind) ─────────────────────────────────────
  if (Array.isArray(db.reminders) && db.reminders.length) {
    const due = db.reminders.filter(r => r.dueAt <= now)
    if (due.length) {
      for (const r of due) {
        try {
          await sock.sendMessage(r.chatJid, {
            text:
              `🕸️━━━〔 ⏰ 𝐑𝐀𝐏𝐏𝐄𝐋 〕━━━🕸️\n\n` +
              `│ @${(r.userJid || '').split('@')[0]}\n` +
              `│ ${r.text}\n\n` +
              `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`,
            mentions: r.userJid ? [r.userJid] : []
          })
        } catch (e) {
          console.error('[RemindScheduler] envoi rappel:', e.message)
        }
      }
      db.reminders = db.reminders.filter(r => r.dueAt > now)
      changed = true
    }
  }

  // ── Messages programmés (.schedule) ───────────────────────
  const hhmm = currentHHMM()
  const today = todayKey()
  if (db.groups && typeof db.groups === 'object') {
    for (const groupId of Object.keys(db.groups)) {
      const schedules = db.groups[groupId]?.schedules
      if (!Array.isArray(schedules)) continue
      for (const s of schedules) {
        if (s.time === hhmm && s.lastSent !== today) {
          try {
            await sock.sendMessage(groupId, { text: s.text })
          } catch (e) {
            console.error('[RemindScheduler] envoi programmé:', e.message)
          }
          s.lastSent = today
          changed = true
        }
      }
    }
  }

  if (changed) {
    try { saveV2Db(db) } catch (e) { console.error('[RemindScheduler] saveV2Db:', e.message) }
  }
}

// ── Démarrage : vérifie toutes les intervalMs (défaut 30s) ─────
export function startRemindScheduler(sock, intervalMs = 30000) {
  const timer = setInterval(() => {
    tick(sock).catch(e => console.error('[RemindScheduler] tick:', e.message))
  }, intervalMs)
  // Ne bloque pas l'arrêt normal du process
  if (typeof timer.unref === 'function') timer.unref()
  return timer
}
