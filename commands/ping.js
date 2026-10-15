// commands/ping.js — 𝑴𝑼𝑹𝑨𝑺𝑨𝑲𝑰 𝐒𝐒𝐊 𓂀
// ✅ Loader animé avec nettoyage sécurisé
// ✅ Mesure du temps d'exécution du loader
// ✅ Mode détaillé : -d / --detailed
// ✅ Statistiques RAM, heap et uptime
// ✅ Gestion des erreurs sans exposer les détails internes

import { performance } from "node:perf_hooks";
import { sendMessage } from "../lib/sendMessage.js";
import {
    showProgressLoader,
    deleteLoader
} from "../lib/animLoader.js";

function getQuality(ms) {
    if (ms < 50) {
        return {
            label: "Excellente",
            emoji: "🚀",
            bar: "▓▓▓▓▓▓▓▓▓▓",
            color: "🟢"
        };
    }

    if (ms < 150) {
        return {
            label: "Très bonne",
            emoji: "⚡",
            bar: "▓▓▓▓▓▓▓▓░░",
            color: "🟢"
        };
    }

    if (ms < 300) {
        return {
            label: "Bonne",
            emoji: "⚙️",
            bar: "▓▓▓▓▓▓░░░░",
            color: "🟡"
        };
    }

    if (ms < 600) {
        return {
            label: "Moyenne",
            emoji: "🐢",
            bar: "▓▓▓▓░░░░░░",
            color: "🟠"
        };
    }

    return {
        label: "Faible",
        emoji: "🐌",
        bar: "▓▓░░░░░░░░",
        color: "🔴"
    };
}

function formatUptime(seconds) {
    const total = Math.max(0, Math.floor(seconds));

    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;

    const parts = [];

    if (days > 0) parts.push(`${days}j`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    // Toujours afficher les secondes si aucune unité supérieure
    // n'est présente, ou si elles sont utiles.
    if (parts.length === 0 || secs > 0) {
        parts.push(`${secs}s`);
    }

    return parts.join(" ");
}

function getTime() {
    return new Date().toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}

async function safelyDeleteLoader(sock, sender, loadKey) {
    if (loadKey === null || loadKey === undefined) {
        return;
    }

    try {
        await deleteLoader(sock, sender, loadKey);
    } catch (error) {
        // Le nettoyage ne doit pas empêcher l'envoi du résultat.
        console.warn(
            "[PING] Impossible de supprimer le loader :",
            error?.message ?? "Erreur inconnue"
        );
    }
}

export default async function ping(sock, sender, args = [], msg) {
    let loadKey = null;

    const isDetailed = Array.isArray(args) &&
        args.some(arg =>
            ["-d", "--detailed"].includes(
                String(arg).toLowerCase()
            )
        );

    try {
        // Cette mesure évalue la durée de l'opération du loader.
        // Elle ne constitue pas un véritable aller-retour réseau.
        const startedAt = performance.now();

        loadKey = await showProgressLoader(
            sock,
            sender,
            "TEST DE LATENCE"
        );

        const operationMs = Math.max(
            0,
            Math.round(performance.now() - startedAt)
        );

        const quality = getQuality(operationMs);
        const time = getTime();

        await safelyDeleteLoader(sock, sender, loadKey);
        loadKey = null;

        let text;

        if (isDetailed) {
            const mem = process.memoryUsage();

            const ramMB = (mem.rss / 1024 / 1024).toFixed(1);
            const heapUsedMB = (mem.heapUsed / 1024 / 1024).toFixed(1);
            const heapTotalMB = (mem.heapTotal / 1024 / 1024).toFixed(1);
            const uptime = formatUptime(process.uptime());

            text =
                `🕸️━━━〔 🏓 𝐏𝐎𝐍𝐆 𝐃É𝐓𝐀𝐈𝐋𝐋É 〕━━━🕸️\n` +
                `│\n` +
                `│  ⏱️ *Durée du loader :* ${operationMs} ms\n` +
                `│  ${quality.bar} ${quality.color}\n` +
                `│\n` +
                `│  ${quality.emoji} *Indicateur :* ${quality.label}\n` +
                `│  🕐 *Heure :* ${time}\n` +
                `│\n` +
                `│  💾 *RAM utilisée (RSS) :* ${ramMB} MB\n` +
                `│  🧠 *Heap utilisé :* ${heapUsedMB} MB\n` +
                `│  📦 *Heap total :* ${heapTotalMB} MB\n` +
                `│  ⏳ *Uptime :* ${uptime}\n` +
                `│\n` +
                `│  ℹ️ La durée affichée mesure l'opération du loader,\n` +
                `│  pas un aller-retour réseau WhatsApp.\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`;
        } else {
            text =
                `🕸️━━━〔 🏓 𝐏𝐎𝐍𝐆 〕━━━🕸️\n` +
                `│\n` +
                `│  ⏱️ *Durée du loader :* ${operationMs} ms\n` +
                `│  ${quality.bar}\n` +
                `│\n` +
                `│  ${quality.emoji} *Indicateur :* ${quality.label}\n` +
                `│  ${quality.color} *Statut :* Commande exécutée\n` +
                `│  🕐 *Heure :* ${time}\n` +
                `│\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️\n\n` +
                `_💡 Utilise .ping --detailed pour les statistiques._`;
        }

        await sendMessage(sock, sender, text);

    } catch (error) {
        console.error(
            "[PING] Échec de la commande :",
            error?.stack ?? error?.message ?? error
        );

        await safelyDeleteLoader(sock, sender, loadKey);

        try {
            await sendMessage(
                sock,
                sender,
                `🕸️━━━〔 🕷️ 𝐏𝐈𝐍𝐆 〕━━━🕸️\n` +
                `│\n` +
                `│  ❌ Impossible d'exécuter la commande.\n` +
                `│  Réessaie dans quelques instants.\n` +
                `│\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            );
        } catch (sendError) {
            console.error(
                "[PING] Impossible d'envoyer le message d'erreur :",
                sendError?.message ?? sendError
            );
        }
    }
}
