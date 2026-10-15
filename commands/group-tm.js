// commands/group-tm.js
// Programme l'ouverture/fermeture d'un groupe avec un délai
// 🔧 FIX: comparaison JID avec cleanNumber (device suffix)

import { config } from "../config.js"
import { getSenderJid, cleanNumber } from '../lib/ownerSystem.js'

// Stockage des timers actifs
const activeTimers = new Map()

// Convertir le temps en millisecondes
function parseTime(timeStr) {
    const time = timeStr.toLowerCase().trim()
    
    // Patterns: 1h, 30mn, 30min, 1h30, 2h30mn, etc.
    const hourMatch = time.match(/(\d+)\s*h/)
    const minMatch = time.match(/(\d+)\s*(?:mn|min|m)/)
    
    let ms = 0
    
    if (hourMatch) {
        ms += parseInt(hourMatch[1]) * 60 * 60 * 1000 // heures en ms
    }
    
    if (minMatch) {
        ms += parseInt(minMatch[1]) * 60 * 1000 // minutes en ms
    }
    
    // Si juste un nombre (ex: "30" = 30 minutes par défaut)
    if (!hourMatch && !minMatch && /^\d+$/.test(time)) {
        ms = parseInt(time) * 60 * 1000
    }
    
    return ms
}

// Formater le temps pour l'affichage
function formatTime(ms) {
    const hours = Math.floor(ms / (60 * 60 * 1000))
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000))
    const seconds = Math.floor((ms % (60 * 1000)) / 1000)
    
    let result = []
    if (hours > 0) result.push(`${hours}h`)
    if (minutes > 0) result.push(`${minutes}mn`)
    if (seconds > 0 && hours === 0) result.push(`${seconds}s`)
    
    return result.join(' ') || '0s'
}

// Vérifier si l'utilisateur est admin du groupe
// 🔧 FIX: utilisation de cleanNumber pour comparaison fiable
async function isAdmin(sock, groupId, userId) {
    try {
        const metadata = await sock.groupMetadata(groupId)
        const userNum = cleanNumber(userId)
        const participant = metadata.participants.find(p => cleanNumber(p.id) === userNum)
        return participant?.admin === 'admin' || participant?.admin === 'superadmin'
    } catch (e) {
        return false
    }
}

export default async function groupTm(sock, sender, args, msg) {
    try {
        const userId = getSenderJid(msg, sock)
        
        // Vérifier que c'est un groupe
        if (!sender.endsWith('@g.us')) {
            return await sock.sendMessage(sender, {
                text: "🕷️ Cette commande ne fonctionne que dans les groupes."
            })
        }
        
        // Vérifier si administrateur
        const admin = await isAdmin(sock, sender, userId)
        if (!administrateur) {
            return await sock.sendMessage(sender, {
                text: "🕷️ Seuls les administrateurs peuvent utiliser cette commande."
            })
        }
        
        // Vérifier les arguments
        if (args.length < 2) {
            return await sock.sendMessage(sender, {
                text: `⚠️ *syntaxe incorrect*\n\n📖 *Syntaxe:*\n${config.prefix}group-tm <close/open> <temps>\n\n⏱️ *Exemples:*\n• ${config.prefix}group-tm close 1h\n• ${config.prefix}group-tm open 30mn\n• ${config.prefix}group-tm close 2h30mn\n• ${config.prefix}group-tm open 45min\n\n📝 *Formats acceptés:*\n• Xh = heures\n• Xmn / Xmin / Xm = minutes\n• Combinaisons: 1h30mn, 2h15min`
            })
        }
        
        const action = args[0].toLowerCase()
        const timeInput = args.slice(1).join('')
        
        if (action !== 'close' && action !== 'open') {
            return await sock.sendMessage(sender, {
                text: "🕷️ Action invalide. Utilisez *close* ou *open*."
            })
        }
        
        const delayMs = parseTime(timeInput)
        
        if (delayMs <= 0) {
            return await sock.sendMessage(sender, {
                text: "🕷️ Temps invalide. Exemples: 1h, 30mn, 2h15min"
            })
        }
        
        if (delayMs > 24 * 60 * 60 * 1000) {
            return await sock.sendMessage(sender, {
                text: "🕷️ Délai maximum: 24 heures."
            })
        }
        
        // Annuler un timer existant pour ce groupe
        if (activeTimers.has(sender)) {
            clearTimeout(activeTimers.get(sender).timeout)
            activeTimers.delete(sender)
        }
        
        const endTime = new Date(Date.now() + delayMs)
        const actionText = action === 'close' ? '🔒 FERMETURE' : '🔓 OUVERTURE'
        const actionEmoji = action === 'close' ? '🔒' : '🔓'
        
        // Envoyer confirmation
        await sock.sendMessage(sender, {
            text: `${actionEmoji} *PROGRAMMATION*\n\n⏰ ${actionText} programmée dans *${formatTime(delayMs)}*\n📅 Heure: ${endTime.toLocaleTimeString('fr-FR')}\n\n│ Pour annuler: ${config.prefix}group-tm cancel`
        })
        
        // Créer le timer
        const timeout = setTimeout(async () => {
            try {
                if (action === 'close') {
                    await sock.groupSettingUpdate(sender, 'announcement')
                    await sock.sendMessage(sender, {
                        text: `🔒 *GROUPE FERMÉ*\n\n⏰ Le groupe a été fermé automatiquement.\n👤 Action programmée par @${userId.split('@')[0]}`,
                        mentions: [userId]
                    })
                } else {
                    await sock.groupSettingUpdate(sender, 'not_announcement')
                    await sock.sendMessage(sender, {
                        text: `🔓 *GROUPE OUVERT*\n\n⏰ Le groupe a été ouvert automatiquement.\n👤 Action programmée par @${userId.split('@')[0]}`,
                        mentions: [userId]
                    })
                }
            } catch (e) {
                console.error("❌ Erreur timer group-tm:", e)
                await sock.sendMessage(sender, {
                    text: "🕷️ opération échoué lors de l'exécution programmée."
                })
            } finally {
                activeTimers.delete(sender)
            }
        }, delayMs)
        
        // Sauvegarder le timer
        activeTimers.set(sender, {
            timeout,
            action,
            endTime,
            userId,
            timeLeft: delayMs
        })
        
        console.log(`⏰ Group-tm ${action} dans ${formatTime(delayMs)} pour ${sender}`)
        
    } catch (error) {
        console.error("❌ Erreur group-tm:", error)
        await sock.sendMessage(sender, {
            text: "🕷️ opération échoué lors de la programmation."
        })
    }
}

// Commande pour annuler (intégrée)
export async function groupTmCancel(sock, sender, args, msg) {
    if (activeTimers.has(sender)) {
        const timer = activeTimers.get(sender)
        clearTimeout(timer.timeout)
        activeTimers.delete(sender)
        
        await sock.sendMessage(sender, {
            text: `│ *Programmation annulée*\n\nL'action précédente (${timer.action === 'close' ? 'fermeture' : 'ouverture'}) a été annulée.`
        })
    } else {
        await sock.sendMessage(sender, {
            text: "👁️ Aucune programmation active pour ce groupe."
        })
    }
}
