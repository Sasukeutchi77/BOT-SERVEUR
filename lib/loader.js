// lib/loader.js — VERSION CORRIGÉE
// ╔══════════════════════════════════════════════╗
// ║  CHARGEUR DE COMMANDES                       ║
// ╚══════════════════════════════════════════════╝

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

const COMMANDS_DIR = path.join(__dirname, '../commands')

let commandsCache = null

/**
 * Charger toutes les commandes depuis le dossier commands/
 * @param {boolean} force - Forcer le rechargement (ignorer le cache)
 * @returns {Object} - Map des commandes { nom: handler }
 */
export async function loadCommands(force = false) {
    if (commandsCache && !force) return commandsCache

    const commands = {}

    try {
        if (!fs.existsSync(COMMANDS_DIR)) {
            console.warn('⚠️ Dossier commands/ introuvable')
            return commands
        }

        const files = fs.readdirSync(COMMANDS_DIR)
            .filter(f => f.endsWith('.js'))

        for (const file of files) {
            try {
                const filePath   = path.join(COMMANDS_DIR, file)
                const cacheBuster = force ? `?t=${Date.now()}` : ''
                const module     = await import(`${filePath}${cacheBuster}`).catch(async () =>
                    await import(filePath)
                )

                const handler  = module.default
                const cmdName  = path.basename(file, '.js').toLowerCase()

                if (typeof handler === 'function') {
                    commands[cmdName] = handler
                }

            } catch (err) {
                console.error(`❌ Erreur chargement commande ${file}:`, err.message)
            }
        }

        console.log(`📦 ${Object.keys(commands).length} commandes chargées`)

    } catch (err) {
        console.error('❌ Erreur loadCommands:', err.message)
    }

    commandsCache = commands
    return commands
}

/**
 * Obtenir la liste des commandes chargées
 */
export function getCommandsList() {
    return commandsCache ? Object.keys(commandsCache) : []
}
