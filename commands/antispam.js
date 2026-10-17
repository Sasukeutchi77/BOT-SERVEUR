// commands/antispam.js — VERSION

import { sendMessage } from "../lib/sendMessage.js"
import { spamManager, SPAM_CONFIG } from "../lib/spamManager.js"
import fs from "fs"
import path from "path"
import { 
    getSenderJid,
    isOwner,
    isSudo,
    isDeployer,
    isSuperAdmin
} from "../lib/ownerSystem.js"

//══════════════════════════════════════
// ANTISPAM GROUP DATABASE (CACHE)
//══════════════════════════════════════

const ANTISPAM_FILE = path.join(process.cwd(), "data", "antispam_groups.json")

let groupCache = {}

function loadGroups() {

    try {

        if (fs.existsSync(ANTISPAM_FILE)) {
            groupCache = JSON.parse(fs.readFileSync(ANTISPAM_FILE))
        }

    } catch {
        groupCache = {}
    }

}

function saveGroups() {

    try {

        const dir = path.dirname(ANTISPAM_FILE)

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }

        fs.writeFileSync(
            ANTISPAM_FILE,
            JSON.stringify(groupCache, null, 2)
        )

    } catch {}

}

loadGroups()

export function setGroupAntiSpam(groupId, enabled) {

    groupCache[groupId] = {
        enabled,
        updatedAt: Date.now()
    }

    saveGroups()

}

export function isGroupAntiSpamEnabled(groupId) {

    if (!groupCache[groupId]) return true

    return groupCache[groupId].enabled === true

}

//══════════════════════════════════════
// ADMIN CHECK
//══════════════════════════════════════

function clean(jid) {
    return jid?.split("@")[0]?.split(":")[0] || ""
}

async function isGroupAdmin(sock, groupId, userId) {

    try {

        const meta = await sock.groupMetadata(groupId)

        const userNum = clean(userId)

        const participant = meta.participants.find(
            p => clean(p.id) === userNum
        )

        return (
            participant?.admin === "admin" ||
            participant?.admin === "superadmin"
        )

    } catch {

        return false

    }

}

//══════════════════════════════════════
// MAIN COMMAND
//══════════════════════════════════════

export default async function antispam(sock, sender, args, msg) {

    try {

        const isGroup = sender.endsWith("@g.us")
        const userId = getSenderJid(msg, sock)
        const action = args[0]?.toLowerCase()

        const owner = isOwner(userId)
        const sudo = isSudo(userId)
        const deployer = isDeployer(userId)
        const superAdmin = isSuperAdmin(userId)

        let groupAdmin = false

        if (isGroup && !owner && !sudo && !deployer && !superAdmin) {

            groupAdmin = await isGroupAdmin(sock, sender, userId)

        }

        const hasAdminRights =
            owner || sudo || deployer || superAdmin || groupAdmin

        //══════════════════════════════
        // ACTIVER
        //══════════════════════════════

        if (action === "on" || action === "enable") {

            if (!isGroup)
                return sendMessage(sock, sender, "🕷️ groupe uniquement.")

            if (!hasAdminRights)
                return sendMessage(sock, sender, "⛔ Admin requis.")

            setGroupAntiSpam(sender, true)

            return sendMessage(sock, sender,
`🛡️ *ANTI-SPAM ACTIVÉ*

• Max messages : ${SPAM_CONFIG.FLOOD_MAX_MESSAGES}
• Fenêtre : ${SPAM_CONFIG.FLOOD_TIME_WINDOW/1000}s
• Warn max : ${SPAM_CONFIG.WARN_LIMIT}
• Mute : ${SPAM_CONFIG.MUTE_DURATION/1000}s`
            )

        }

        //══════════════════════════════
        // DÉSACTIVER
        //══════════════════════════════

        if (action === "off" || action === "disable") {

            if (!isGroup)
                return sendMessage(sock, sender, "🕷️ groupe uniquement.")

            if (!hasAdminRights)
                return sendMessage(sock, sender, "⛔ Admin requis.")

            setGroupAntiSpam(sender, false)

            return sendMessage(sock, sender,
`│ *ANTI-SPAM DÉSACTIVÉ*

Plus aucune limitation dans ce groupe.`)

        }

        //══════════════════════════════
        // STATUT
        //══════════════════════════════

        if (!action) {

            const stats = spamManager.getStats(userId)

            if (isGroup) {

                const enabled = isGroupAntiSpamEnabled(sender)

                return sendMessage(sock, sender,
`🛡️ *ANTI-SPAM*

Statut : ${enabled ? "⚙️ Activé" : "🕷️ Désactivé"}

Vos warns : ${stats?.warns || 0}/${SPAM_CONFIG.WARN_LIMIT}
Mute : ${stats?.muted ? "🔇 Oui" : "Non"}

commandes administrateur :
.antispam on
.antispam off
.antispam check @user`
                )

            }

            return sendMessage(sock, sender,
`📊 *Vos statistiques*

Warns : ${stats?.warns || 0}
Mute : ${stats?.muted ? "🔇 Oui" : "Non"}`
            )

        }

        //══════════════════════════════
        // ACTIONS ADMIN
        //══════════════════════════════

        if (!hasAdminRights)
            return sendMessage(sock, sender, "⛔ Commande admin.")

        if (action === "check" && args[1]) {

            const num = args[1].replace(/\D/g, "")
            const target = num + "@s.whatsapp.net"

            const stats = spamManager.getStats(target)

            return sendMessage(sock, sender,
`🔍 *Stats*

@${num}

Warns : ${stats?.warns || 0}
Mute : ${stats?.muted ? "Oui" : "Non"}`,
            { mentions:[target] })

        }

        if (action === "unmute" && args[1]) {

            const num = args[1].replace(/\D/g,"")
            const target = num+"@s.whatsapp.net"

            spamManager.unmute(target)

            return sendMessage(sock,sender,
`⚙️ @${num} démuté`,
{mentions:[target]})

        }

        if (action === "reset" && args[1]) {

            const num = args[1].replace(/\D/g,"")
            const target = num+"@s.whatsapp.net"

            spamManager.resetUser(target)

            return sendMessage(sock,sender,
`♻️ Stats reset pour @${num}`,
{mentions:[target]})

        }

        if (action === "config") {

            return sendMessage(sock,sender,
`⚙️ *CONFIG ANTI-SPAM*

Cooldown : ${SPAM_CONFIG.COOLDOWN}s
Max msgs : ${SPAM_CONFIG.FLOOD_MAX_MESSAGES}
Fenêtre : ${SPAM_CONFIG.FLOOD_TIME_WINDOW/1000}s
Warn max : ${SPAM_CONFIG.WARN_LIMIT}
Mute : ${SPAM_CONFIG.MUTE_DURATION/1000}s`)

        }

    } catch (err) {

        console.log("AntiSpam Error:",err)

        await sendMessage(sock,sender,"🕷️ opération échoué anti-spam.")

    }

}