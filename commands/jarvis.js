// commands/jarvis.js — J.A.R.V.I.S. multi-IA
// ╔══════════════════════════════════════════════════════════════════╗
// ║  Un seul assistant (J.A.R.V.I.S.), propulsé par 3 IA en coulisse  ║
// ║  (Groq / ChatGPT / Gemini — voir lib/aiProviders.js) :            ║
// ║   - .jarvis <question>          → routage auto + repli en chaîne  ║
// ║   - .jarvis groq/gpt/gemini <q> → force un fournisseur précis     ║
// ║   - .jarvis council <question>  → les IA dispo répondent EN       ║
// ║     PARALLÈLE puis sont fusionnées en une seule réponse           ║
// ║   - envoie/réponds à une image  → analyse d'image (OpenAI/Gemini) ║
// ║   - .jarvis code/fix/...        → mode développeur (jarvisCoder)  ║
// ╚══════════════════════════════════════════════════════════════════╝

import { sendMessage } from '../lib/sendMessage.js'
import { isOwner, isSudo } from '../lib/ownerSystem.js'
import { checkUsage, consumeUsage } from '../lib/usageSystem.js'
import { handleCoderCommand, hasPendingCoderProposal } from '../lib/jarvisCoder.js'
import { getImageInput } from '../lib/media.js'
import { chatWithFallback, visionWithFallback, councilChat, getAvailableProviders } from '../lib/aiProviders.js'
import { tryHandleAction, confirmPendingAction, cancelPendingAction, hasPendingAction } from '../lib/jarvisActions.js'

const HISTORY_MAX = 10 // 10 messages (user+assistant) = 5 échanges gardés

const conversationHistory = new Map()

function getHistory(userId) {
    if (!conversationHistory.has(userId)) conversationHistory.set(userId, [])
    return conversationHistory.get(userId)
}
function addToHistory(userId, role, content) {
    const history = getHistory(userId)
    history.push({ role, content })
    if (history.length > HISTORY_MAX) history.splice(0, history.length - HISTORY_MAX)
}
function clearHistory(userId) { conversationHistory.delete(userId) }

function truncate(text, max = 3000) {
    if (text.length <= max) return text
    return text.slice(0, max) + '\n\n_[Réponse tronquée]_'
}

function formatResponse(text) {
    return `🕸️━━━〔 🤖 J.A.R.V.I.S. 〕━━━🕸️\n│\n${text}\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
}

const PROVIDER_ALIASES = { groq: 'groq', gpt: 'openai', chatgpt: 'openai', openai: 'openai', gemini: 'gemini' }

const SYSTEM_PROMPT =
    'Tu es J.A.R.V.I.S. — Just A Rather Very Intelligent System — l\'assistant personnel d\'Iron Man. ' +
    'Tu parles comme un majordome britannique raffiné : courtois, précis, légèrement sarcastique mais toujours dévoué. ' +
    'Tu appelles l\'utilisateur "Monsieur" (ou "Madame" si c\'est une femme). ' +
    'Tu tutoies jamais. ' +
    'Tu peux glisser une pointe d\'humour sec ou une remarque ironique élégante quand c\'est pertinent, mais tu restes utile et tu réponds toujours à la demande. ' +
    'Tu fais parfois référence à M. Stark ou à la tour Avengers avec subtilité, sans en faire des caisses. ' +
    'Tes réponses sont concises, claires, sans formatage Markdown complexe. ' +
    'Tu réponds en français sauf si l\'utilisateur écrit dans une autre langue. ' +
    'Tu peux aider avec : traductions, calculs, explications, rédaction, conseils, blagues, recettes, analyse d\'image, code — toujours avec la classe d\'un majordome numérique de génie. ' +
    'Quand tu ne sais pas quelque chose, tu l\'avoues avec élégance plutôt que d\'inventer. ' +
    'Peu importe le modèle qui traite la requête en coulisse, tu réponds TOUJOURS en tant que J.A.R.V.I.S., un seul et même assistant — ne mentionne jamais Groq, OpenAI, ChatGPT ou Gemini dans tes réponses.'

export default async function jarvis(sock, sender, args, msg, ctx) {
    const senderJid  = ctx?.senderJid || msg.key.participant || msg.key.remoteJid
    const prefix     = process.env.PREFIX || '.'
    const privileged = isOwner(senderJid) || isSudo(senderJid)
    const available  = getAvailableProviders()

    if (!args.length) {
        return await sendMessage(sock, sender,
            `🕸️━━━〔 🤖 J.A.R.V.I.S. 〕━━━🕸️\n` +
            `│\n` +
            `│  *À vos ordres, Monsieur.*\n` +
            `│\n` +
            `│  💡 *syntaxe :*\n` +
            `│  .jarvis <votre demande>\n` +
            `│\n` +
            `│  📋 *Exemples :*\n` +
            `│  .jarvis C'est quoi l'IA ?\n` +
            `│  .jarvis Traduis "bonjour" en anglais\n` +
            `│  📷 Envoie/réponds à une image avec\n` +
            `│  .jarvis Que vois-tu sur cette image ?\n` +
            `│\n` +
            `│  🔁 *.jarvis reset* — effacer la mémoire\n` +
            `│  🎯 *Comprend aussi les ordres* : "ferme le\n` +
            `│  groupe", "kick cette personne"...\n` +
            `│  🧠 *.jarvis groq/gpt/gemini <q>* — forcer une IA\n` +
            (available.length > 1 ? `│  🧩 *.jarvis council <q>* — les IA en équipe\n` : '') +
            (privileged ?
            `│\n` +
            `│  🛠️ *Mode développeur (Owner/Sudo) :*\n` +
            `│  .jarvis code <nom> <description>\n` +
            `│  .jarvis fix <cible> <problème>\n` +
            `│  .jarvis confirm / .jarvis cancel\n` +
            `│  .jarvis rollback <cible>\n` : '') +
            `│\n` +
            `│  🧠 IA actives : ${available.length ? available.map(p => p.label).join(', ') : 'AUCUNE (configure .env)'}\n` +
            `│\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        )
    }

    const sub = args[0].toLowerCase()

    // ── Mode "coder" (Owner/Sudo uniquement) ────────────────────
    if (['code', 'fix', 'rollback'].includes(sub)) {
        if (!privileged) {
            return await sendMessage(sock, sender,
                `🕸️━━━〔 🔒 ACCÈS REFUSÉ 〕━━━🕸️\n│\n│  Ces commandes sont réservées à\n│  l'Owner et aux Sudo, Monsieur.\n│\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
        }
        return await handleCoderCommand(sock, sender, senderJid, sub, args.slice(1), prefix)
    }

    // ── confirm / cancel — partagés entre le mode "coder" (Owner/Sudo)
    //    et le mode "action" (ouvert à quiconque a une action en attente ;
    //    la permission réelle est de toute façon revérifiée à l'exécution
    //    via evaluateCommandAccess dans lib/jarvisActions.js). ─────────
    if (sub === 'confirm' || sub === 'cancel') {
        if (privileged && hasPendingCoderProposal(senderJid)) {
            return await handleCoderCommand(sock, sender, senderJid, sub, args.slice(1), prefix)
        }
        if (hasPendingAction(senderJid)) {
            if (sub === 'cancel') {
                cancelPendingAction(senderJid)
                return await sendMessage(sock, sender, formatResponse(`│  *Action annulée, Monsieur.*\n│  Je n'ai rien exécuté.`))
            }
            // ✅ FIX AUDIT : enveloppé dans try/catch — si confirmPendingAction
            //    throw malgré tout (régression, lib modifiée), le bot répond
            //    proprement au lieu de crasher.
            let result
            try {
                result = await confirmPendingAction(sock, sender, senderJid)
            } catch (e) {
                console.error('❌ confirmPendingAction erreur:', e?.message || e)
                return await sendMessage(sock, sender, formatResponse(
                    `│  *L'exécution a échoué, Monsieur.*\n│  ⚠️ ${String(e?.message || 'erreur inconnue').slice(0, 150)}`
                ))
            }
            if (!result.found) {
                return await sendMessage(sock, sender, formatResponse(`│  Cette action a expiré, Monsieur.\n│  Reformulez votre demande.`))
            }
            return await sendMessage(sock, sender, formatResponse(
                result.ok
                    ? `│  *${result.summary} — c'est fait, Monsieur.*`
                    : `│  Je n'ai pas pu exécuter cette action :\n│  ⚠️ ${String(result.error).slice(0, 200)}`
            ))
        }
        return await sendMessage(sock, sender, formatResponse(`│  Rien à ${sub === 'confirm' ? 'confirmer' : 'annuler'} pour l'instant, Monsieur.`))
    }

    if (sub === 'reset') {
        clearHistory(senderJid)
        return await sendMessage(sock, sender,
            `🕸️━━━〔 🤖 J.A.R.V.I.S. 〕━━━🕸️\n│\n│  *Mémoire effacée, Monsieur.*\n│  J'ai oublié tout ce que nous\n│  avons pu évoquer. Page blanche.\n│\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        )
    }

    // ── Choix explicite d'un fournisseur, ou mode "council" ─────
    let forceProvider = null
    let councilMode   = false
    let questionArgs  = args

    if (PROVIDER_ALIASES[sub]) {
        forceProvider = PROVIDER_ALIASES[sub]
        questionArgs  = args.slice(1)
    } else if (sub === 'council') {
        if (!privileged) {
            return await sendMessage(sock, sender,
                `🕸️━━━〔 🔒 ACCÈS REFUSÉ 〕━━━🕸️\n│\n│  Le mode "council" (les 3 IA en même\n│  temps) est réservé à l'Owner/Sudo\n│  pour maîtriser les coûts d'API.\n│\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
        }
        councilMode  = true
        questionArgs = args.slice(1)
    }

    // ─── Vérification accès (mode chat) ──────────────────
    if (!privileged) {
        const { allowed } = checkUsage(senderJid)
        if (!allowed) {
            return await sendMessage(sock, sender,
                `🕸️━━━〔 🤖 J.A.R.V.I.S. 〕━━━🕸️\n` +
                `│\n` +
                `│  *Je crains de ne pouvoir vous\n` +
                `│  être utile pour l'instant.*\n` +
                `│\n` +
                `│  Pour débloquer mes services,\n` +
                `│  utilisez la commande *${prefix}partager*.\n` +
                `│  Vous obtiendrez *10 utilisations*\n` +
                `│  des commandes jarvis / pairing.\n` +
                `│\n` +
                `│  💡 Tapez *${prefix}partager* pour commencer.\n` +
                `│\n` +
                `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
            )
        }
    }

    // ── Image (directe ou en réponse) → analyse d'image ─────────
    // ✅ FIX AUDIT : getImageInput est maintenant protégé — un échec de
    //    téléchargement (média expiré, réseau, Baileys) ne crashe plus
    //    le process, on retombe simplement en mode texte.
    let image = { ok: false }
    try {
        image = await getImageInput(sock, msg)
    } catch (e) {
        console.error('❌ getImageInput erreur:', e?.message || e)
    }

    let question = questionArgs.join(' ').trim()
    if (image.ok && !question) question = 'Décris cette image en détail et dis-moi ce qu\'elle contient.'

    if (!question) {
        return await sendMessage(sock, sender,
            `🕸️━━━〔 🤖 J.A.R.V.I.S. 〕━━━🕸️\n│\n│  Il me manque une question,\n│  Monsieur. Exemple :\n│  ${prefix}jarvis${forceProvider ? ' ' + sub : ''} Quelle heure est-il à Tokyo ?\n│\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        )
    }

    // ── Détection d'action en langage naturel ("ferme le groupe", "kick
    //    cette personne"...) — voir lib/jarvisActions.js pour les garde-fous.
    //    Ignorée si une image est jointe (mode vision) ou si un fournisseur
    //    précis / le mode council a été explicitement demandé.
    if (!image.ok && !forceProvider && !councilMode) {
        try {
            const actionResult = await tryHandleAction(sock, sender, msg, ctx, question)
            if (actionResult.handled) {
                if (actionResult.needsConfirm) {
                    return await sendMessage(sock, sender, formatResponse(
                        `│  🚨 *Confirmation requise, Monsieur.*\n` +
                        `│  Action demandée : *${actionResult.summary}*\n` +
                        `│\n` +
                        `│  ${prefix}jarvis confirm → exécuter\n` +
                        `│  ${prefix}jarvis cancel  → annuler`
                    ))
                }
                return await sendMessage(sock, sender, formatResponse(
                    actionResult.ok
                        ? `│  *${actionResult.summary} — c'est fait, Monsieur.*`
                        : `│  Je n'ai pas pu exécuter cette action, Monsieur :\n│  ⚠️ ${String(actionResult.error).slice(0, 200)}`
                ))
            }
        } catch (e) {
            console.error('❌ jarvisActions erreur:', e.message)
            // repli silencieux en mode conversation normale
        }
    }

    try {
        const history = getHistory(senderJid)
        let aiResponse, providerUsed = null, providersUsed = null

        if (image.ok) {
            const result = await visionWithFallback(image.buffer, image.mimetype, question, SYSTEM_PROMPT, { forceProvider })
            aiResponse = result.text
            providerUsed = result.provider
        } else if (councilMode) {
            const result = await councilChat(history, SYSTEM_PROMPT, question)
            aiResponse = result.text
            providersUsed = result.providers
        } else {
            const result = await chatWithFallback(history, SYSTEM_PROMPT, question, { purpose: 'chat', forceProvider })
            aiResponse = result.text
            providerUsed = result.provider
        }

        // ─── Consommer 1 utilisation si pas privilégié ───
        let usageNotice = ''
        if (!privileged) {
            const { remaining } = consumeUsage(senderJid)
            if (remaining <= 3) {
                usageNotice = `\n│  ⚠️ *${remaining}* utilisation(s) restante(s), Monsieur.\n│  Tapez ${prefix}partager pour recharger.`
            }
        }

        // L'historique reste du texte uniquement (les images ne sont pas
        // renvoyées dans l'historique pour ne pas surcharger l'API).
        if (!image.ok) {
            addToHistory(senderJid, 'user', question)
            addToHistory(senderJid, 'assistant', aiResponse)
        }

        const formattedLines = aiResponse.split('\n').map(line => `│  ${line}`).join('\n')
        let finalText = formatResponse(formattedLines)

        // Petit indicateur discret, seulement quand l'utilisateur a explicitement choisi le fournisseur
        if (forceProvider && providerUsed) {
            finalText = finalText.replace('🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️', `│  _via ${providerUsed}_\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`)
        }
        if (councilMode && providersUsed?.length > 1) {
            finalText = finalText.replace('🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️', `│  _réponse combinée de ${providersUsed.length} IA_\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`)
        }

        const withUsage = usageNotice
            ? finalText.replace('🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️', usageNotice + '\n🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️')
            : finalText

        await sendMessage(sock, sender, truncate(withUsage))

    } catch (e) {
        console.error('❌ jarvis.js erreur:', e.message)
        await sendMessage(sock, sender,
            `🕸️━━━〔 🕷️ J.A.R.V.I.S. 〕━━━🕸️\n` +
            `│\n` +
            `│  *Je crains qu'un incident ne soit\n` +
            `│  survenu, Monsieur.*\n` +
            `│\n` +
            `│  ⚠️ ${String(e.message).slice(0, 200)}\n` +
            `│\n` +
            `│  💡 *Suggestions :*\n` +
            `│  → Vérifiez CLE_GROQ / CLE_OPENAI / CLE_GEMINI dans .env\n` +
            `│  → Réessayez dans quelques secondes\n` +
            `│  → Tapez .jarvis reset si bloqué\n` +
            `│\n` +
            `🕸️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🕸️`
        )
    }
}
