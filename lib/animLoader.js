// lib/animLoader.js
// ╔══════════════════════════════════════════════════════════╗
// ║  jarvis — Loaders animés                           ║
// ║  Animations progressives avec nettoyage sécurisé         ║
// ╚══════════════════════════════════════════════════════════╝

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const DEFAULT_INTERVAL = 700;
const MAX_FRAMES = 4;

const FRAMES = {
    progress: [
        "░░░░░░░░░░",
        "▓▓░░░░░░░░",
        "▓▓▓▓▓░░░░░",
        "▓▓▓▓▓▓▓▓░░",
        "▓▓▓▓▓▓▓▓▓▓"
    ],
    spinner: ["◐", "◓", "◑", "◒"],
    scan: ["▰▱▱▱▱", "▰▰▱▱▱", "▰▰▰▱▱", "▰▰▰▰▱", "▰▰▰▰▰"]
};

async function sendInitialMessage(sock, sender, text) {
    const response = await sock.sendMessage(sender, { text });

    // Baileys renvoie généralement un objet contenant key.
    // Si la clé n'existe pas, la suppression du loader sera ignorée.
    return response?.key ?? null;
}

async function updateMessage(sock, sender, key, text) {
    if (!key) return;

    await sock.sendMessage(sender, {
        text,
        edit: key
    });
}

async function runLoader(sock, sender, title, frames, options = {}) {
    const interval = Math.max(
        250,
        Number(options.interval) || DEFAULT_INTERVAL
    );

    const maxFrames = Math.max(
        1,
        Number(options.maxFrames) || MAX_FRAMES
    );

    let key = null;

    try {
        key = await sendInitialMessage(
            sock,
            sender,
            `${title}\n${frames[0]}`
        );

        if (!key) return null;

        for (let i = 1; i < Math.min(frames.length, maxFrames); i++) {
            await delay(interval);

            try {
                await updateMessage(
                    sock,
                    sender,
                    key,
                    `${title}\n${frames[i]}`
                );
            } catch (error) {
                // L'édition peut ne pas être prise en charge selon
                // la version ou le contexte de Baileys.
                // On conserve le message initial plutôt que d'échouer.
                console.warn(
                    "[animLoader] Édition impossible :",
                    error?.message ?? error
                );
                break;
            }
        }

        return key;
    } catch (error) {
        console.warn(
            "[animLoader] Impossible de créer le loader :",
            error?.message ?? error
        );

        return null;
    }
}

export async function showProgressLoader(sock, sender, title = "CHARGEMENT") {
    return runLoader(
        sock,
        sender,
        `⏳ *${title}*`,
        FRAMES.progress,
        { interval: 350, maxFrames: 4 }
    );
}

export async function showSpinnerLoader(sock, sender, title = "TRAITEMENT EN COURS") {
    const frames = FRAMES.spinner.map(
        (frame) => `${frame} ${title}...`
    );

    return runLoader(
        sock,
        sender,
        "🌀 *TRAITEMENT*",
        frames,
        { interval: 400, maxFrames: 4 }
    );
}

export async function showPremiumLoader(sock, sender, title = "MURASAKI SSK") {
    const frames = [
        "╭──────────────╮\n│ ░░░░░░░░░░ │",
        "╭──────────────╮\n│ ▓▓░░░░░░░░ │",
        "╭──────────────╮\n│ ▓▓▓▓▓░░░░░ │",
        "╭──────────────╮\n│ ▓▓▓▓▓▓▓▓▓▓ │"
    ];

    return runLoader(
        sock,
        sender,
        `💠 *${title}*`,
        frames,
        { interval: 350, maxFrames: 4 }
    );
}

export async function showScanLoader(sock, sender, title = "SCAN EN COURS") {
    const frames = FRAMES.scan.map(
        (frame) => `🔎 ${title}\n${frame}`
    );

    return runLoader(
        sock,
        sender,
        "🛰️ *ANALYSE*",
        frames,
        { interval: 350, maxFrames: 4 }
    );
}

export async function showActionLoader(sock, sender, title = "ACTION EN COURS") {
    return runLoader(
        sock,
        sender,
        `⚙️ *${title}*`,
        FRAMES.progress,
        { interval: 300, maxFrames: 3 }
    );
}

// ═══════════════════════════════════════════════════════════
// SUPPRESSION DU LOADER
// ═══════════════════════════════════════════════════════════

export async function deleteLoader(sock, sender, key) {
    if (!sock || !sender || !key) return;

    try {
        await sock.sendMessage(sender, {
            delete: key
        });
    } catch (error) {
        console.warn(
            "[animLoader] Suppression impossible :",
            error?.message ?? error
        );
    }
}

// ═══════════════════════════════════════════════════════════
// UTILITAIRES
// ═══════════════════════════════════════════════════════════

export function getProgressBar(percent, length = 10) {
    const safePercent = Math.max(
        0,
        Math.min(100, Number(percent) || 0)
    );

    const safeLength = Math.max(
        1,
        Math.min(100, Math.floor(Number(length) || 10))
    );

    const filled = Math.round((safePercent / 100) * safeLength);

    return (
        "▓".repeat(filled) +
        "░".repeat(safeLength - filled) +
        ` ${Math.round(safePercent)}%`
    );
}

export function formatDate() {
    return new Date().toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
}

export function formatTime() {
    return new Date().toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
            }
