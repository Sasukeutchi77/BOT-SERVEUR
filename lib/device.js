// lib/device.js — Informations sur l'appareil du bot — BUG FIX: \\n → \n
import os from 'os'

export function getDeviceInfoText() {
    try {
        const platform  = os.platform()
        const arch      = os.arch()
        const hostname  = os.hostname()
        const nodeVer   = process.version

        const platformMap = {
            'linux'  : '🐧 Linux',
            'win32'  : '🪟 Windows',
            'darwin' : '🍎 macOS',
            'android': '🤖 Android',
        }

        const platformName = platformMap[platform] || platform

        // ✅ FIX: \n (vrai saut de ligne) au lieu de \\n (texte littéral)
        return (
            `┃ 🖥️ Plateforme: ${platformName}\n` +
            `┃ ⚙️ Arch: ${arch}\n` +
            `┃ 🏠 Host: ${hostname}\n` +
            `┃ 💚 Node.js: ${nodeVer}\n`
        )
    } catch (e) {
        return `┃ ⚠️ Infos appareil indisponibles\n`
    }
}

export default { getDeviceInfoText }
