// lib/animLoader.js
// ╔══════════════════════════════════════════════════════╗
// ║  Les commandes répondent directement, sans temps de  ║
// ║  chargement affiché — ces fonctions ne font plus     ║
// ║  qu'exécuter les commandes immédiatement.            ║
// ╚══════════════════════════════════════════════════════╝

// Chacune de ces fonctions renvoyait auparavant un message animé en
// plusieurs étapes (barre de progression, spinner, scan...) avant le
// résultat de la commande. Elles sont neutralisées : elles ne créent
// plus aucun message et retournent immédiatement, pour que les
// commandes qui les appellent s'exécutent sans délai artificiel.
// deleteLoader() reste un no-op sûr (key === null → rien à faire).

export async function showProgressLoader() {
    return null
}

export async function showSpinnerLoader() {
    return null
}

export async function showPremiumLoader() {
    return null
}

export async function showScanLoader() {
    return null
}

export async function showActionLoader() {
    return null
}

// ═══════════════════════════════════════════════════════
//  SUPPRIMER UN LOADER (no-op si key est null)
// ═══════════════════════════════════════════════════════
export async function deleteLoader(sock, sender, key) {
    if (!key) return
    await sock.sendMessage(sender, { delete: key }).catch(() => {})
}

// ═══════════════════════════════════════════════════════
//  UTILITAIRES EXPORTÉS (inchangés — pas des loaders)
// ═══════════════════════════════════════════════════════
export function getProgressBar(percent, length = 10) {
    const filled = Math.round((percent / 100) * length)
    return "▓".repeat(filled) + "░".repeat(length - filled) + ` ${percent}%`
}

export function formatDate() {
    return new Date().toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric'
    })
}

export function formatTime() {
    return new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
}
