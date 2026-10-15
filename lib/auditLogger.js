import fs from 'fs'
import path from 'path'
import { ensureDir } from './safeStore.js'

const LOG_DIR = path.join(process.cwd(), 'data')
const LOG_FILE = path.join(LOG_DIR, 'logs.jsonl')

export function logAction(type, payload = {}) {
  try {
    ensureDir(LOG_DIR)
    const entry = { ts: new Date().toISOString(), type, ...payload }
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n')
  } catch {}
}

export function auditLog({ action, ...rest } = {}) {
  logAction(action || 'command', rest)
}

export function getRecentLogs(limit = 20) {
  try {
    if (!fs.existsSync(LOG_FILE)) return []
    const lines = fs.readFileSync(LOG_FILE, 'utf8').trim().split(/\n+/).filter(Boolean)
    return lines.slice(-limit).map(line => {
      try { return JSON.parse(line) } catch { return { raw: line } }
    })
  } catch { return [] }
}
