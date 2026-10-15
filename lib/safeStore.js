import fs from 'fs'
import path from 'path'

export function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export function readJson(file, fallback = {}) {
  try {
    ensureDir(path.dirname(file))
    if (!fs.existsSync(file)) {
      writeJson(file, fallback)
      return clone(fallback)
    }
    const raw = fs.readFileSync(file, 'utf8')
    if (!raw.trim()) return clone(fallback)
    return JSON.parse(raw)
  } catch {
    try { if (fs.existsSync(file)) fs.copyFileSync(file, file + '.broken-' + Date.now()) } catch {}
    return clone(fallback)
  }
}

export function writeJson(file, data) {
  ensureDir(path.dirname(file))
  const tmp = file + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
  fs.renameSync(tmp, file)
}

export function updateJson(file, fallback, updater) {
  const data = readJson(file, fallback)
  const next = updater(data) || data
  writeJson(file, next)
  return next
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}
