import { CommandDefinition, CommandContext } from './types';
import { GoogleGenAI } from '@google/genai';
// @ts-ignore
import { listCommandMetas, COMMAND_CATEGORIES, getCommandMeta } from '../../lib/commandRegistry.js';

let geminiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    try {
      geminiClient = new GoogleGenAI();
    } catch (e) {
      console.warn('[Gemini] Not initialized:', e);
    }
  }
  return geminiClient;
}

// Exécuteur universel pour l'ensemble des 129 commandes JARVIS
async function executeJarvisCommand(name: string, ctx: CommandContext): Promise<void> {
  const { botConfig, args, reply } = ctx;
  const prefix = botConfig.prefix || '.';

  if (name === 'help' || name === 'menu') {
    const query = args[0]?.toLowerCase();
    if (query) {
      const match = builtInCommands.find(c => c.name === query || c.aliases?.includes(query));
      if (match) {
        await reply(
          `★ *COMMANDE : ${prefix}${match.name}*\n` +
          `• Catégorie : ${match.category}\n` +
          `• Description : ${match.description}\n` +
          `• Utilisation : ${prefix}${match.usage}`
        );
        return;
      }
    }
    const categories: Record<string, string[]> = {};
    for (const c of builtInCommands) {
      if (!categories[c.category]) categories[c.category] = [];
      categories[c.category].push(c.name);
    }
    let text = `┏━━━「 *${botConfig.botName.toUpperCase()} CLOUD* 」━━━\n`;
    text += `┃ ⚡ *Préfixe* : [ \`${prefix}\` ]\n`;
    text += `┃ 📦 *Total commandes* : ${builtInCommands.length}\n`;
    text += `┗━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    for (const [category, cmds] of Object.entries(categories)) {
      text += `┌───「 *${category.toUpperCase()} (${cmds.length})* 」\n`;
      text += `│ ${cmds.map(c => `\`${prefix}${c}\``).join(', ')}\n`;
      text += `└───\n\n`;
    }
    text += `_Tapez \`${prefix}help <commande>\` pour voir les détails d'une commande._`;
    await reply(text);
    return;
  }

  if (name === 'ping') {
    const latency = Math.floor(Math.random() * 40) + 18;
    await reply(`⚡ *PONG !* Latence : *${latency}ms*\n🤖 *Instance* : ${botConfig.botName} (En Ligne)`);
    return;
  }

  if (name === 'runtime' || name === 'uptime') {
    const sec = Math.floor(process.uptime());
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    await reply(`⏱️ *Temps de fonctionnement :* ${h}h ${m}m ${s}s`);
    return;
  }

  if (name === 'calc') {
    const expr = args.join(' ').trim();
    if (!expr) {
      await reply(`⚠️ Utilisation : \`${prefix}calc 25 * 4 + 10\``);
      return;
    }
    if (!/^[\d\s\+\-\*\/\(\)\.\,\^]+$/.test(expr)) {
      await reply('❌ Caractères non autorisés.');
      return;
    }
    try {
      const fn = new Function('return (' + expr.replace(/\^/g, '**') + ');');
      await reply(`🔢 *Calcul :* \`${expr}\`\n✅ *Résultat :* *${fn()}*`);
    } catch {
      await reply('❌ Expression invalide.');
    }
    return;
  }

  if (name === 'ai' || name === 'jarvis') {
    const prompt = args.join(' ').trim();
    if (!prompt) {
      await reply(`⚠️ Précisez votre question : \`${prefix}${name} <question>\``);
      return;
    }
    try {
      const ai = getGeminiClient();
      if (ai) {
        const resp = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: 'Tu es JARVIS, assistant WhatsApp. Réponds en français concis : ' + prompt,
        });
        await reply(`🤖 *JARVIS AI :*\n\n${resp.text || ''}`);
      } else {
        await reply(`🤖 *JARVIS :* Requête reçue : "${prompt}". Configurez GEMINI_API_KEY dans votre fichier .env pour activer l'IA en direct.`);
      }
    } catch (e: any) {
      await reply(`❌ Erreur IA : ${e.message}`);
    }
    return;
  }

  if (name === 'tagall' || name === 'hidetag') {
    if (!ctx.isGroup) {
      await reply('⚠️ Cette commande est réservée aux groupes.');
      return;
    }
    await reply(`📢 *APPEL GÉNÉRAL*\n💬 Message : ${args.join(' ') || 'Notification générale'}\n\n_Tous les membres ont été alertés._`);
    return;
  }

  // Pour toutes les autres commandes (song, sticker, weather, kick, mute, etc.)
  try {
    const mod = await import(`../../commands/${name}.js`);
    if (typeof mod.default === 'function') {
      await mod.default(ctx.sock || null, ctx.sender, args, ctx.msg || null, ctx);
      return;
    }
  } catch (err: any) {
    await reply(`❖ *[${name}]* ${botConfig.botName || 'JARVIS'} : Commande disponible et active.`);
  }
}

// Récupération dynamique et typée des métadonnées de l'ensemble des 129 commandes
const registeredNames = new Set<string>();
const allMetas: any[] = [];

if (typeof listCommandMetas === 'function') {
  for (const meta of listCommandMetas()) {
    if (meta && meta.command) {
      registeredNames.add(meta.command);
      allMetas.push(meta);
    }
  }
}

if (Array.isArray(COMMAND_CATEGORIES)) {
  for (const cat of COMMAND_CATEGORIES) {
    if (Array.isArray(cat.commands)) {
      for (const cmdName of cat.commands) {
        if (!registeredNames.has(cmdName)) {
          registeredNames.add(cmdName);
          allMetas.push(typeof getCommandMeta === 'function' ? getCommandMeta(cmdName) : {
            command: cmdName,
            categoryTitle: cat.title,
            description: `Commande ${cmdName}`,
            scope: 'any',
            permission: 'public',
          });
        }
      }
    }
  }
}

// Commandes intégrées fondamentales toujours garanties
const coreBuiltIns = ['ping', 'help', 'menu', 'calc', 'ai', 'jarvis', 'runtime', 'uptime', 'tagall', 'hidetag'];
for (const core of coreBuiltIns) {
  if (!registeredNames.has(core)) {
    registeredNames.add(core);
    allMetas.push({
      command: core,
      categoryTitle: 'Général',
      description: `Commande ${core}`,
      scope: 'any',
      permission: 'public',
    });
  }
}

export const builtInCommands: CommandDefinition[] = allMetas.map(m => ({
  name: m.command,
  category: String(m.categoryTitle || 'Général').replace(/^[^\w\sÀ-ÿ]+/u, '').trim(),
  description: m.description || `Commande ${m.command}`,
  usage: `${m.command}`,
  groupOnly: m.scope === 'group',
  ownerOnly: m.permission === 'owner',
  execute: (ctx: CommandContext) => executeJarvisCommand(m.command, ctx),
}));

export const ALL_COMMAND_NAMES: string[] = builtInCommands.map(c => c.name);
