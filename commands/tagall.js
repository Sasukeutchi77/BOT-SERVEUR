
'use strict';

// commands/tagall.js
// JARVIS-AI — TAGALL Premium
//
// Fonctionnalités :
// - Vérification du groupe et des permissions
// - Mentions natives WhatsApp
// - Support des JID classiques et LID lorsque disponibles
// - Déduplication des participants
// - Mention de tous les membres ou des administrateurs
// - Messages répartis en lots pour les grands groupes
// - Contrôle des messages trop longs
// - Gestion des erreurs et logs sécurisés
//
// Utilisation :
// .tagall [message]
// .tagall --admins [message]
// .tagall --everyone [message]
// .tagall --help

import { sendMessage } from '../lib/sendMessage.js';
import { config } from '../config.js';

const PREFIX = config.prefix || '.';
const MAX_TEXT_LENGTH = 3500;
const MAX_MENTIONS_PER_MESSAGE = 40;
const DELAY_BETWEEN_MESSAGES_MS = 500;

const DEFAULT_MESSAGE = '👋 Attention tout le monde !';

const sleep = ms =>
    new Promise(resolve => setTimeout(resolve, ms));

function normalizeJid(value) {
    if (typeof value !== 'string') return '';

    return value.trim();
}

function getParticipantJids(participant) {
    if (!participant || typeof participant !== 'object') {
        return [];
    }

    return [
        participant.id,
        participant.jid,
        participant.lid,
        participant.phoneNumber
    ]
        .filter(value => typeof value === 'string' && value.trim())
        .map(normalizeJid);
}

function getUniqueParticipants(participants) {
    const seen = new Set();
    const result = [];

    for (const participant of participants) {
        const jids = getParticipantJids(participant);
        const primaryJid = jids[0];

        if (!primaryJid || seen.has(primaryJid)) {
            continue;
        }

        seen.add(primaryJid);

        result.push({
            ...participant,
            id: primaryJid,
            jids
        });
    }

    return result;
}

function getActorJid(msg) {
    const candidates = [
        msg?.key?.participant,
        msg?.participant,
        msg?.key?.participantAlt,
        msg?.participantAlt
    ];

    return candidates.find(
        value => typeof value === 'string' && value.includes('@')
    ) || '';
}

function getBotJids(sock) {
    const user = sock?.user;

    return new Set([
        user?.id,
        user?.lid,
        user?.phoneNumber
    ]
        .filter(value => typeof value === 'string' && value.includes('@'))
        .map(normalizeJid));
}

function isSameParticipant(participant, jid) {
    if (!jid) return false;

    const target = normalizeJid(jid);

    return participant.jids.some(value => value === target);
}

function isAdmin(participant) {
    return participant?.admin === 'admin' ||
        participant?.admin === 'superadmin';
}

function mentionLabel(jid) {
    const value = normalizeJid(jid);

    // Le label visible est associé au JID utilisé dans le tableau
    // mentions. Les suffixes de serveur ne sont pas affichés.
    const localPart = value.split('@')[0];

    return localPart.replace(/:\d+$/, '');
}

function parseArgs(args = []) {
    const values = Array.isArray(args)
        ? args.map(value => String(value))
        : [];

    let mode = 'everyone';
    let help = false;
    const messageParts = [];

    for (const value of values) {
        const normalized = value.toLowerCase();

        if (normalized === '--help' || normalized === '-h') {
            help = true;
            continue;
        }

        if (normalized === '--admins') {
            mode = 'admins';
            continue;
        }

        if (normalized === '--everyone') {
            mode = 'everyone';
            continue;
        }

        messageParts.push(value);
    }

    const message = messageParts.join(' ').trim() || DEFAULT_MESSAGE;

    return {
        mode,
        help,
        message
    };
}

function buildHelp() {
    return [
        '╭━━━〔 📣 𝐓𝐀𝐆𝐀𝐋𝐋 𝐇𝐄𝐋𝐏 〕━━━╮',
        '│',
        `│  ${PREFIX}tagall`,
        '│  └─ Mentionner tous les membres',
        '│',
        `│  ${PREFIX}tagall Réunion dans 5 minutes`,
        '│  └─ Avec un message personnalisé',
        '│',
        `│  ${PREFIX}tagall --admins`,
        '│  └─ Mentionner les administrateurs',
        '│',
        `│  ${PREFIX}tagall --everyone`,
        '│  └─ Mentionner tout le monde',
        '│',
        `│  ${PREFIX}tagall --help`,
        '│  └─ Afficher cette aide',
        '╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯'
    ].join('\n');
}

function createBatches(participants, message) {
    const batches = [];
    let current = [];
    let currentLength = 0;

    for (const participant of participants) {
        const label = `@${mentionLabel(participant.id)}`;
        const addedLength = label.length + 1;

        if (
            current.length > 0 &&
            (
                current.length >= MAX_MENTIONS_PER_MESSAGE ||
                currentLength + addedLength > MAX_TEXT_LENGTH - message.length - 200
            )
        ) {
            batches.push(current);
            current = [];
            currentLength = 0;
        }

        current.push({
            participant,
            label
        });

        currentLength += addedLength;
    }

    if (current.length > 0) {
        batches.push(current);
    }

    return batches;
}

function buildTagMessage({
    batch,
    message,
    batchIndex,
    batchCount,
    totalParticipants
}) {
    const mentionLines = batch.map(item => item.label).join(' ');

    const header = [
        '╭━━━〔 📣 𝐉𝐀𝐑𝐕𝐈𝐒 𝐓𝐀𝐆𝐀𝐋𝐋 〕━━━╮',
        '',
        `📢 *Message :* ${message}`,
        '',
        '👥 *Membres :*',
        mentionLines,
        '',
        `📊 *Mentions :* ${batch.length}/${totalParticipants}`,
        `📄 *Lot :* ${batchIndex}/${batchCount}`,
        '',
        '╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯'
    ].join('\n');

    return header;
}

async function sendPrivateError(sock, sender, text) {
    try {
        await sendMessage(sock, sender, text);
    } catch (error) {
        console.error(
            '[TAGALL] Impossible d’envoyer la réponse :',
            error?.message || error
        );
    }
}

export default async function tagall(sock, sender, args = [], msg) {
    try {
        if (typeof sender !== 'string' || !sender.endsWith('@g.us')) {
            await sendPrivateError(
                sock,
                sender,
                '📣 Cette commande fonctionne uniquement dans un groupe WhatsApp.'
            );
            return;
        }

        if (!sock || typeof sock.groupMetadata !== 'function') {
            throw new Error('Fonction groupMetadata indisponible.');
        }

        const options = parseArgs(args);

        if (options.help) {
            await sendPrivateError(sock, sender, buildHelp());
            return;
        }

        const metadata = await sock.groupMetadata(sender);

        if (!Array.isArray(metadata?.participants)) {
            throw new Error('Liste des participants indisponible.');
        }

        const participants = getUniqueParticipants(metadata.participants);

        if (participants.length === 0) {
            await sendPrivateError(
                sock,
                sender,
                '⚠️ Aucun participant valide trouvé dans ce groupe.'
            );
            return;
        }

        // Autoriser uniquement les administrateurs du groupe.
        const actorJid = getActorJid(msg);

        if (!actorJid) {
            await sendPrivateError(
                sock,
                sender,
                '🔒 Impossible de vérifier ton identité. Réessaie depuis le groupe.'
            );
            return;
        }

        const actor = participants.find(
            participant => isSameParticipant(participant, actorJid)
        );

        if (!actor || !isAdmin(actor)) {
            await sendPrivateError(
                sock,
                sender,
                '🔒 Cette commande est réservée aux administrateurs du groupe.'
            );
            return;
        }

        let targets = participants;

        if (options.mode === 'admins') {
            targets = participants.filter(isAdmin);
        }

        if (targets.length === 0) {
            await sendPrivateError(
                sock,
                sender,
                '⚠️ Aucun membre correspondant à cette sélection.'
            );
            return;
        }

        // Utiliser un JID exploitable par Baileys.
        const normalizedTargets = targets
            .map(participant => ({
                id: participant.id,
                jids: participant.jids,
                admin: participant.admin
            }))
            .filter(participant => participant.id.includes('@'));

        const batches = createBatches(normalizedTargets, options.message);

        if (batches.length === 0) {
            await sendPrivateError(
                sock,
                sender,
                '⚠️ Impossible de construire les mentions.'
            );
            return;
        }

        let sent = 0;

        for (let index = 0; index < batches.length; index++) {
            const batch = batches[index];

            const text = buildTagMessage({
                batch,
                message: options.message,
                batchIndex: index + 1,
                batchCount: batches.length,
                totalParticipants: normalizedTargets.length
            });

            const mentions = batch.map(item => item.participant.id);

            await sock.sendMessage(sender, {
                text,
                mentions
            });

            sent += batch.length;

            if (index < batches.length - 1) {
                await sleep(DELAY_BETWEEN_MESSAGES_MS);
            }
        }

        console.log(
            `[TAGALL] Succès | Groupe: ${sender} | ` +
            `Mode: ${options.mode} | ` +
            `Mentions: ${sent}/${normalizedTargets.length} | ` +
            `Lots: ${batches.length}`
        );

    } catch (error) {
        console.error(
            '[TAGALL] Échec :',
            error?.stack || error?.message || error
        );

        await sendPrivateError(
            sock,
            sender,
            [
                '╭━━━〔 ⚠️ 𝐓𝐀𝐆𝐀𝐋𝐋 〕━━━╮',
                '│',
                '│ ❌ Impossible de terminer les mentions.',
                '│',
                '│ Vérifie les permissions du groupe',
                '│ et la connexion WhatsApp, puis réessaie.',
                '│',
                '╰━━━━━━━━━━━━━━━━━━━━━━━━╯'
            ].join('\n')
        );
    }
}
