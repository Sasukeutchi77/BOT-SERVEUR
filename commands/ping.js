
'use strict';

// commands/ping.js
// JARVIS-AI — Commande PING premium
//
// Fonctionnalités :
// - Loader animé avec nettoyage sécurisé
// - Mesure monotone du temps de réponse initial
// - Mode détaillé : .ping -d / .ping --detailed
// - Mémoire RSS, Heap, External et ArrayBuffers
// - Uptime détaillé, CPU, version Node.js et plateforme
// - Qualité et barre de performance adaptatives
// - Messages d'erreur sécurisés
// - Compatible avec les helpers existants du projet

import { performance } from 'node:perf_hooks';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { listCommandMetas } from '../lib/commandRegistry.js';
import { sendMessage } from '../lib/sendMessage.js';
import {
    showProgressLoader,
    deleteLoader
} from '../lib/animLoader.js';

const PREFIX = config.prefix || '.';
const MAX_DISPLAY_MS = 60_000;
const COMMAND_GIF_PATH = path.join(process.cwd(), 'assets', 'command-animation.mp4');

const FR_TIME = new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
});

const MB = 1024 * 1024;
const GB = 1024 * MB;

function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return 'N/A';

    if (bytes < MB) {
        return `${(bytes / 1024).toFixed(1)} Ko`;
    }

    if (bytes < GB) {
        return `${(bytes / MB).toFixed(1)} Mo`;
    }

    return `${(bytes / GB).toFixed(2)} Go`;
}

function formatDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) {
        return 'N/A';
    }

    seconds = Math.floor(seconds);

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];

    if (days) parts.push(`${days}j`);
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}min`);

    // Toujours afficher les secondes si tout est inférieur à une minute.
    if (secs || parts.length === 0) {
        parts.push(`${secs}s`);
    }

    return parts.join(' ');
}

function getQuality(ms) {
    if (ms < 50) {
        return {
            label: 'Excellente',
            emoji: '🚀',
            color: '🟢',
            filled: 10,
            description: 'Réponse très rapide'
        };
    }

    if (ms < 150) {
        return {
            label: 'Très bonne',
            emoji: '⚡',
            color: '🟢',
            filled: 8,
            description: 'Réponse rapide'
        };
    }

    if (ms < 300) {
        return {
            label: 'Bonne',
            emoji: '✨',
            color: '🟡',
            filled: 6,
            description: 'Réponse correcte'
        };
    }

    if (ms < 600) {
        return {
            label: 'Moyenne',
            emoji: '🐢',
            color: '🟠',
            filled: 4,
            description: 'Réponse un peu lente'
        };
    }

    return {
        label: 'Faible',
        emoji: '🐌',
        color: '🔴',
        filled: 2,
        description: 'Réponse lente'
    };
}

function makeBar(filled, total = 10) {
    const count = Math.max(0, Math.min(total, filled));

    return '▓'.repeat(count) + '░'.repeat(total - count);
}

function getArgs(args) {
    const values = Array.isArray(args)
        ? args.map(value => String(value).toLowerCase())
        : [];

    return {
        detailed: !values.some(value => value === '--short' || value === '-s'),
        short: values.some(value => value === '--short' || value === '-s'),

        help: values.some(value =>
            value === '-h' ||
            value === '--help'
        )
    };
}

function getMemory() {
    const memory = process.memoryUsage();

    return {
        rss: memory.rss,
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        external: memory.external,
        arrayBuffers: memory.arrayBuffers ?? 0
    };
}

function getProcessInfo() {
    const cpus = typeof process.availableMemory === 'function'
        ? process.availableMemory()
        : null;

    return {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
        availableMemory: Number.isFinite(cpus) ? cpus : null
    };
}

function buildBasicMessage({ latency, quality, time }) {
    return [
        `╭━━━〔 🏓 ${config.botName || 'J.A.R.V.I.S.'} • PONG 〕━━━╮`,
        '│',
        `│  ⏱️ *Temps mesuré :* ${latency.toFixed(2)} ms`,
        `│  📊 *Performance :* ${quality.label}`,
        `│  ${makeBar(quality.filled)} ${quality.color}`,
        `│  ${quality.emoji} ${quality.description}`,
        '│',
        '│  🟢 *Statut :* Actif',
        `│  🕐 *Heure :* ${time}`,
        '│',
        '╰━━━━━━━━━━━━━━━━━━━━━━━━╯',
        '',
        `💡 _${PREFIX}ping --short pour afficher un résultat compact._`
    ].join('\n');
}

function buildDetailedMessage({
    latency,
    quality,
    time,
    memory,
    uptime,
    info,
    cpu,
    connected,
    commandCount,
    developer,
    team
}) {
    const lines = [
        `╭━━━〔 ⚡ ${config.botName || 'J.A.R.V.I.S.'} • PONG PRO 〕━━━╮`,
        '│',
        '├─〔 📡 LATENCE 〕',
        `│  ⏱️ Temps mesuré : ${latency.toFixed(2)} ms`,
        `│  📊 Qualité : ${quality.label} ${quality.emoji}`,
        `│  ${makeBar(quality.filled)} ${quality.color}`,
        `│  📝 ${quality.description}`,
        '│',
        '├─〔 💾 MÉMOIRE 〕',
        `│  📦 RSS : ${formatBytes(memory.rss)}`,
        `│  🧠 Heap utilisé : ${formatBytes(memory.heapUsed)}`,
        `│  📚 Heap total : ${formatBytes(memory.heapTotal)}`,
        `│  🔌 Mémoire externe : ${formatBytes(memory.external)}`,
        `│  🗃️ ArrayBuffers : ${formatBytes(memory.arrayBuffers)}`,
        '│',
        '├─〔 ⚙️ PROCESSUS 〕',
        `│  ⏳ Uptime : ${uptime}`,
        `│  🧮 CPU utilisateur : ${formatDuration(cpu.user / 1e6)}`,
        `│  🔧 CPU système : ${formatDuration(cpu.system / 1e6)}`,
        `│  🟢 Node.js : ${info.node}`,
        `│  🖥️ Plateforme : ${info.platform} (${info.arch})`,
        `│  🆔 PID : ${info.pid}`,
        `│  📶 WhatsApp : ${connected ? 'Connecté' : 'État non confirmé'}`,
        `│  📚 Commandes disponibles : ${commandCount}`,
        `│  👑 Développeur : ${developer}`,
        `│  ⚒️ Équipe : ${team}`
    ];

    if (info.availableMemory !== null) {
        lines.push(
            `│  🧮 Mémoire disponible : ${formatBytes(info.availableMemory)}`
        );
    }

    lines.push(
        '│',
        `├─〔 🕐 ${time} 〕`,
        '│  ✅ Bot opérationnel',
        '│',
        '╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯',
        '',
        '_ℹ️ La latence affichée mesure le temps de réponse initial de l’envoi du loader, pas un aller-retour réseau complet._'
    );

    return lines.join('\n');
}

function buildHelp() {
    return [
        '╭━━━〔 🏓 𝐏𝐈𝐍𝐆 𝐇𝐄𝐋𝐏 〕━━━╮',
        '│',
        '│  🏓 *.ping*',
        '│  └─ Test rapide',
        '│',
        '│  ⚡ *.ping*',
        '│  └─ Diagnostic complet',
        '│',
        '│  ⚡ *.ping --short*',
        '│  └─ Résultat compact',
        '│',
        '╰━━━━━━━━━━━━━━━━━━━━━━━━╯'
    ].join('\n');
}

async function safeDeleteLoader(sock, sender, loadKey) {
    if (loadKey === null || loadKey === undefined) {
        return;
    }

    try {
        await deleteLoader(sock, sender, loadKey);
    } catch (error) {
        // Le nettoyage ne doit jamais masquer l'erreur d'origine.
        console.error(
            '[PING] Impossible de supprimer le loader :',
            error?.stack || error?.message || error
        );
    }
}

export default async function ping(sock, sender, args = [], msg) {
    let loadKey = null;
    let cpuStart = null;
    let startTime = 0;
    let loaderLatency = null;

    try {
        if (!sock || !sender) {
            throw new Error('Socket WhatsApp ou destinataire manquant.');
        }

        const options = getArgs(args);

        if (options.help) {
            await sendMessage(sock, sender, buildHelp());
            return;
        }

        // Horloge monotone : insensible aux changements d'heure système.
        startTime = performance.now();
        cpuStart = process.cpuUsage();

        // Afficher le loader avant les mesures complémentaires.
        try {
            loadKey = await showProgressLoader(
                sock,
                sender,
                'TEST DE LATENCE'
            );

            loaderLatency = performance.now() - startTime;
        } finally {
            await safeDeleteLoader(sock, sender, loadKey);
            loadKey = null;
        }

        const measuredLatency = Math.max(0, loaderLatency ?? 0);

        // Évite une valeur aberrante si le processus a été suspendu.
        // La valeur brute reste utilisée pour le diagnostic.
        const latency = Math.min(measuredLatency, MAX_DISPLAY_MS);
        const quality = getQuality(latency);
        const time = FR_TIME.format(new Date());

        let text;

        if (options.detailed) {
            const memory = getMemory();
            const info = getProcessInfo();
            const cpu = process.cpuUsage(cpuStart);
            const uptime = formatDuration(process.uptime());
            const connected = Boolean(sock.user?.id || sock.user?.jid || sock.user?.lid);
            const commandCount = listCommandMetas().length;
            const developer = config.developerName || process.env.DEVELOPER_NAME || '𝐋𝐎𝐑𝐃 𝐃𝐄𝐌𝐎𝐍';
            const team = config.teamName || process.env.TEAM_NAME || '𝐍𝐄𝐗𝐔𝐒-𝐅𝐎𝐑𝐆𝐄𝐑';

            text = buildDetailedMessage({
                latency,
                quality,
                time,
                memory,
                uptime,
                info,
                cpu,
                connected,
                commandCount,
                developer,
                team
            });
        } else {
            text = buildBasicMessage({
                latency,
                quality,
                time
            });
        }

        // Visuel dédié aux commandes ping/info/repo ; le GIF Welcome/Goodbye reste inchangé.
        try {
            const gif = await readFile(COMMAND_GIF_PATH);
            await sock.sendMessage(sender, { video: gif, gifPlayback: true, caption: text });
        } catch (imageError) {
            console.warn('[PING] GIF indisponible, envoi du texte seul :', imageError?.message || imageError);
            await sendMessage(sock, sender, text);
        }

    } catch (error) {
        console.error(
            '[PING] Échec de la commande :',
            error?.stack || error?.message || error
        );

        await safeDeleteLoader(sock, sender, loadKey);
        loadKey = null;

        // Ne pas exposer les chemins, jetons ou détails internes au chat.
        try {
            await sendMessage(
                sock,
                sender,
                [
                    '╭━━━〔 ⚠️ 𝐏𝐈𝐍𝐆 𝐄𝐑𝐑𝐎𝐑 〕━━━╮',
                    '│',
                    '│  ❌ Impossible de terminer le test.',
                    '│  🔄 Réessaie dans quelques instants.',
                    '│',
                    '╰━━━━━━━━━━━━━━━━━━━━━━━━╯'
                ].join('\n')
            );
        } catch (sendError) {
            console.error(
                '[PING] Impossible d’envoyer le message d’erreur :',
                sendError?.stack || sendError?.message || sendError
            );
        }
    }
}
