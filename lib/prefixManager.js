// lib/prefixManager.js — VERSION CORRIGÉE
// ╔══════════════════════════════════════════════╗
// ║  GESTIONNAIRE DE PRÉFIXE DYNAMIQUE           ║
// ╚══════════════════════════════════════════════╝

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

const PREFIX_FILE = path.join(__dirname, '../data/prefix.json')

let currentPrefix = null

function loadPrefixFromFile() {
    try {
        if (fs.existsSync(PREFIX_FILE)) {
            const data = JSON.parse(fs.readFileSync(PREFIX_FILE, 'utf8'))
            return data.prefix || null
        }
    } catch {}
    return null
}

/**
 * Obtenir le préfixe actuel (fichier > argument > défaut '.')
 */
export function getDynamicPrefix(defaultPrefix = '.') {
    if (!currentPrefix) {
        currentPrefix = loadPrefixFromFile() || defaultPrefix
    }
    return currentPrefix
}

/**
 * Modifier le préfixe
 */
export function setPrefix(prefix) {
    if (!prefix || prefix.length > 3) return false
    currentPrefix = prefix

    try {
        const dir = path.dirname(PREFIX_FILE)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(PREFIX_FILE, JSON.stringify({ prefix }, null, 2))
        return true
    } catch (err) {
        console.error('❌ setPrefix erreur:', err.message)
        return false
    }
}
