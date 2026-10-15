// lib/spamManager.js — VERSION ULTRA AMÉLIORÉE
// ╔══════════════════════════════════════════════╗
// ║  ANTI-SPAM MANAGER PROFESSIONNEL             ║
// ║  Flood • Cooldown • Warn • Mute • Stats      ║
// ╚══════════════════════════════════════════════╝

export const SPAM_CONFIG = {

    FLOOD_MAX_MESSAGES : 5,
    FLOOD_TIME_WINDOW  : 5000,

    COOLDOWN           : 2,
    COOLDOWN_MS        : 2000,

    WARN_LIMIT         : 3,

    MUTE_DURATION      : 60000,

    CLEANUP_INTERVAL   : 300000

}

//────────────────────────────────
// STOCKAGE
//────────────────────────────────

const floodMap  = new Map()
const muteMap   = new Map()
const warnMap   = new Map()
const cooldowns = new Map()
const textMap   = new Map()

//────────────────────────────────
// UTIL
//────────────────────────────────

function now() {
    return Date.now()
}

function cleanOldFlood(jid) {

    const times = floodMap.get(jid) || []

    const recent = times.filter(
        t => now() - t < SPAM_CONFIG.FLOOD_TIME_WINDOW
    )

    floodMap.set(jid, recent)

    return recent

}

//────────────────────────────────
// CORE SYSTEM
//────────────────────────────────

export const spamManager = {

    //──────────────
    // MUTE
    //──────────────

    isMuted(jid) {

        const expiry = muteMap.get(jid)

        if (!expiry) return false

        if (now() < expiry) return true

        muteMap.delete(jid)

        return false
    },

    mute(jid, duration = SPAM_CONFIG.MUTE_DURATION) {

        muteMap.set(jid, now() + duration)

        warnMap.delete(jid)

    },

    unmute(jid) {

        muteMap.delete(jid)

        warnMap.delete(jid)

    },

    //──────────────
    // FLOOD
    //──────────────

    isFlooding(jid) {

        const times = cleanOldFlood(jid)

        times.push(now())

        floodMap.set(jid, times)

        return times.length > SPAM_CONFIG.FLOOD_MAX_MESSAGES

    },

    //──────────────
    // WARN
    //──────────────

    addWarn(jid) {

        const warns = (warnMap.get(jid) || 0) + 1

        warnMap.set(jid, warns)

        if (warns >= SPAM_CONFIG.WARN_LIMIT) {

            this.mute(jid)

        }

        return warns

    },

    //──────────────
    // COOLDOWN
    //──────────────

    isInCooldown(jid, cmd) {

        const key = `${jid}:${cmd}`

        const last = cooldowns.get(key)

        if (!last) return false

        return now() - last < SPAM_CONFIG.COOLDOWN_MS

    },

    setCooldown(jid, cmd) {

        cooldowns.set(`${jid}:${cmd}`, now())

    },

    //──────────────
    // SPAM TEXTE
    //──────────────

    isTextSpam(jid, text) {

        if (!text) return false

        const last = textMap.get(jid)

        textMap.set(jid, text)

        return last === text

    },

    //──────────────
    // SPAM LIEN
    //──────────────

    containsLink(text) {

        if (!text) return false

        const linkRegex =
            /(https?:\/\/|www\.|chat\.whatsapp\.com)/gi

        return linkRegex.test(text)

    },

    //──────────────
    // STATS
    //──────────────

    getStats(jid) {

        const warns = warnMap.get(jid) || 0

        const muteExpiry = muteMap.get(jid)

        const muted = this.isMuted(jid)

        return {

            warns,

            muted,

            muteRemaining : muted
                ? Math.floor((muteExpiry - now()) / 1000)
                : 0,

            recentMessages : (floodMap.get(jid) || []).length

        }

    },

    //──────────────
    // RESET
    //──────────────

    resetUser(jid) {

        floodMap.delete(jid)
        warnMap.delete(jid)
        muteMap.delete(jid)
        cooldowns.delete(jid)
        textMap.delete(jid)

    }

}

//────────────────────────────────
// NETTOYAGE AUTOMATIQUE
//────────────────────────────────

setInterval(() => {

    const current = now()

    for (const [jid, expiry] of muteMap) {

        if (current > expiry) {

            muteMap.delete(jid)

        }

    }

}, SPAM_CONFIG.CLEANUP_INTERVAL)