import { Router, Response } from 'express';
import { db } from '../db/database';
import { requireAuth, requireBotOwner, AuthenticatedRequest } from '../middleware/auth';
import { pairingRateLimiter } from '../middleware/rateLimiter';
import { maskPhoneNumber } from '../middleware/sanitizer';
import { jarvisEngine } from '../jarvis/engine';
import { builtInCommands, ALL_COMMAND_NAMES } from '../jarvis/commands';

const router = Router();

// Toutes les routes bots requièrent une authentification
router.use(requireAuth);

// Lister les bots de l'utilisateur
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const rawBots = db.getBotsByUserId(user.id);

  const bots = rawBots.map(b => {
    const liveSession = jarvisEngine.getActiveSession(b.id);
    return {
      ...b,
      phoneNumberMasked: maskPhoneNumber(b.phoneNumber),
      liveStatus: liveSession?.status || b.status,
    };
  });

  return res.json({ success: true, bots });
});

// Créer une nouvelle instance de bot
router.post('/', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { name } = req.body;

  // Limite stricte : max 3 numéros par utilisateur
  const userBots = db.getBotsByUserId(user.id);
  if (user.role !== 'admin' && userBots.length >= 3) {
    return res.status(400).json({
      success: false,
      error: 'Limite atteinte : vous pouvez connecter jusqu\'à 3 numéros WhatsApp au bot JARVIS.',
    });
  }

  const slotNumber = userBots.length + 1;
  const newBot = db.createBot({
    id: 'bot_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    userId: user.id,
    name: name?.trim() || `Numéro WhatsApp #${slotNumber}`,
    status: 'OFFLINE',
    config: {
      botName: 'JARVIS',
      prefix: '.',
      autoRead: false,
      reactToStatus: false,
      antiDelete: false,
      antiSpam: true,
      welcomeMessage: 'Bonjour ! Je suis JARVIS, votre assistant personnel.',
      enabledCommands: [...ALL_COMMAND_NAMES],
    },
    stats: {
      messagesHandled: 0,
      commandsExecuted: 0,
      reconnectAttempts: 0,
    },
  });

  return res.status(201).json({
    success: true,
    message: `Emplacement pour le numéro #${slotNumber} prêt pour liaison au bot JARVIS.`,
    bot: {
      ...newBot,
      phoneNumberMasked: maskPhoneNumber(newBot.phoneNumber),
    },
  });
});

// Récupérer les détails d'un bot
router.get('/:id', requireBotOwner, (req: AuthenticatedRequest, res: Response) => {
  const bot = req.bot!;
  const liveSession = jarvisEngine.getActiveSession(bot.id);

  return res.json({
    success: true,
    bot: {
      ...bot,
      phoneNumberMasked: maskPhoneNumber(bot.phoneNumber),
      liveStatus: liveSession?.status || bot.status,
      hasActiveSession: !!liveSession,
      hasPairingCode: !!liveSession?.pairingCode,
      hasQrCode: !!liveSession?.qrCodeDataUrl,
    },
  });
});

// Demander un code de jumelage (Pairing Code)
router.post('/:id/pairing', requireBotOwner, pairingRateLimiter, async (req: AuthenticatedRequest, res: Response) => {
  const bot = req.bot!;
  const { phoneNumber, prefix } = req.body;

  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Le numéro de téléphone avec indicatif pays est obligatoire (ex: +33612345678).',
    });
  }

  // Mettre à jour le préfixe si spécifié par l'utilisateur
  if (prefix && typeof prefix === 'string' && prefix.trim().length <= 5) {
    db.updateBot(bot.id, {
      config: {
        ...bot.config,
        prefix: prefix.trim(),
      },
    });
  }

  try {
    const pairingCode = await jarvisEngine.requestPairingCode(bot.id, phoneNumber);
    return res.json({
      success: true,
      message: 'Code de jumelage généré. Ouvrez WhatsApp > Appareils connectés > Associer avec un code.',
      pairingCode,
      instructions: [
        'Ouvrez WhatsApp sur votre smartphone.',
        'Allez dans Paramètres (ou Menu ⋮) > Appareils connectés.',
        'Appuyez sur "Connecter un appareil", puis choisissez "Associer avec le numéro de téléphone".',
        'Saisissez le code de jumelage à 8 caractères affiché ci-dessous.',
      ],
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Échec de la génération du code de jumelage.',
    });
  }
});

// Définir ou modifier le préfixe du bot
router.post('/:id/prefix', requireBotOwner, (req: AuthenticatedRequest, res: Response) => {
  const bot = req.bot!;
  const { prefix } = req.body;

  if (!prefix || typeof prefix !== 'string' || prefix.trim().length === 0 || prefix.trim().length > 5) {
    return res.status(400).json({
      success: false,
      error: 'Le préfixe doit comporter entre 1 et 5 caractères (ex: ., !, #, /, $).',
    });
  }

  const cleanPrefix = prefix.trim();
  const updated = db.updateBot(bot.id, {
    config: {
      ...bot.config,
      prefix: cleanPrefix,
    },
  });

  const liveSession = jarvisEngine.getActiveSession(bot.id);
  if (liveSession?.sock) {
    (liveSession.sock as any)._jarvisPrefix = cleanPrefix;
  }

  jarvisEngine.log(bot.id, 'info', `Préfixe de commande mis à jour : [ ${cleanPrefix} ]`);

  return res.json({
    success: true,
    message: `Préfixe configuré avec succès : "${cleanPrefix}"`,
    prefix: cleanPrefix,
    config: updated?.config,
  });
});

// Route universelle de configuration du bot (GET / POST / PATCH / PUT :id/config)
router.all('/:id/config', requireBotOwner, (req: AuthenticatedRequest, res: Response) => {
  const bot = req.bot!;
  
  if (req.method === 'GET') {
    return res.json({
      success: true,
      config: bot.config,
      prefix: bot.config.prefix,
    });
  }

  const { prefix, botName, autoRead, reactToStatus, antiDelete, antiSpam, welcomeMessage, enabledCommands } = req.body || {};

  const cleanPrefix = typeof prefix === 'string' && prefix.trim().length > 0 && prefix.trim().length <= 5
    ? prefix.trim()
    : bot.config.prefix;

  const updatedConfig = {
    ...bot.config,
    prefix: cleanPrefix,
    ...(botName !== undefined ? { botName: String(botName).trim().slice(0, 30) } : {}),
    ...(autoRead !== undefined ? { autoRead: Boolean(autoRead) } : {}),
    ...(reactToStatus !== undefined ? { reactToStatus: Boolean(reactToStatus) } : {}),
    ...(antiDelete !== undefined ? { antiDelete: Boolean(antiDelete) } : {}),
    ...(antiSpam !== undefined ? { antiSpam: Boolean(antiSpam) } : {}),
    ...(welcomeMessage !== undefined ? { welcomeMessage: String(welcomeMessage).slice(0, 300) } : {}),
    ...(Array.isArray(enabledCommands) ? { enabledCommands } : {}),
  };

  const updated = db.updateBot(bot.id, {
    config: updatedConfig,
  });

  const liveSession = jarvisEngine.getActiveSession(bot.id);
  if (liveSession?.sock) {
    (liveSession.sock as any)._jarvisPrefix = cleanPrefix;
  }

  jarvisEngine.log(bot.id, 'info', `Configuration du bot mise à jour (Préfixe: [ ${cleanPrefix} ])`);

  return res.json({
    success: true,
    message: `Configuration enregistrée avec succès.`,
    prefix: cleanPrefix,
    config: updated?.config,
  });
});

// Demander un QR Code
router.post('/:id/qr', requireBotOwner, async (req: AuthenticatedRequest, res: Response) => {
  const bot = req.bot!;
  try {
    const qrCodeDataUrl = await jarvisEngine.requestQrCode(bot.id);
    return res.json({
      success: true,
      message: 'QR Code généré.',
      qrCodeDataUrl,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Échec de la génération du QR Code.',
    });
  }
});

// Récupérer le statut temps réel (polling pour pairing et statut de connexion)
router.get('/:id/status', requireBotOwner, (req: AuthenticatedRequest, res: Response) => {
  const bot = db.getBotById(req.bot!.id)!;
  const liveSession = jarvisEngine.getActiveSession(bot.id);

  return res.json({
    success: true,
    status: liveSession?.status || bot.status,
    pairingCode: liveSession?.pairingCode,
    qrCodeDataUrl: liveSession?.qrCodeDataUrl,
    phoneNumberMasked: maskPhoneNumber(bot.phoneNumber),
    stats: bot.stats,
    lastError: bot.lastError,
  });
});

// Démarrer l'instance
router.post('/:id/start', requireBotOwner, async (req: AuthenticatedRequest, res: Response) => {
  const bot = req.bot!;
  try {
    await jarvisEngine.startInstance(bot.id);
    return res.json({
      success: true,
      message: 'Démarrage du bot en cours...',
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

// Arrêter l'instance
router.post('/:id/stop', requireBotOwner, async (req: AuthenticatedRequest, res: Response) => {
  const bot = req.bot!;
  try {
    await jarvisEngine.stopInstance(bot.id);
    return res.json({
      success: true,
      message: 'Instance arrêtée avec succès.',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// Déconnecter et supprimer complètement la session WhatsApp (avec persistance des compteurs)
router.post('/:id/disconnect', requireBotOwner, async (req: AuthenticatedRequest, res: Response) => {
  const bot = req.bot!;
  const user = req.user!;
  try {
    // 1. Incrémenter le compteur de sessions dans les métriques sans enregistrer la session
    db.recordSessionDisconnected(bot.id);

    // 2. Déconnexion propre du socket WhatsApp et suppression des clés de session sur le disque
    await jarvisEngine.destroySession(bot.id);

    // 3. Suppression définitive du bot dans la base de données
    db.deleteBot(bot.id);

    // 4. Si l'utilisateur n'a plus aucun bot, créer immédiatement un nouvel emplacement propre
    const remainingBots = db.getBotsByUserId(user.id);
    let nextBot = null;
    if (remainingBots.length === 0) {
      nextBot = db.createBot({
        id: 'bot_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        userId: user.id,
        name: 'Mon Assistant JARVIS',
        status: 'OFFLINE',
        config: {
          botName: 'JARVIS',
          prefix: '.',
          autoRead: false,
          reactToStatus: false,
          antiDelete: false,
          antiSpam: true,
          welcomeMessage: 'Bonjour ! Je suis JARVIS, votre assistant personnel.',
          enabledCommands: [...ALL_COMMAND_NAMES],
        },
        stats: {
          messagesHandled: 0,
          commandsExecuted: 0,
          reconnectAttempts: 0,
        },
      });
    } else {
      nextBot = remainingBots[0];
    }

    return res.json({
      success: true,
      message: 'Session WhatsApp déconnectée et complètement supprimée.',
      deletedBotId: bot.id,
      bot: nextBot ? {
        ...nextBot,
        phoneNumberMasked: maskPhoneNumber(nextBot.phoneNumber),
      } : null,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Erreur lors de la déconnexion.',
    });
  }
});

// Supprimer définitivement l'instance de bot (avec persistance des compteurs)
router.delete('/:id', requireBotOwner, async (req: AuthenticatedRequest, res: Response) => {
  const bot = req.bot!;
  const user = req.user!;
  try {
    db.recordSessionDisconnected(bot.id);
    await jarvisEngine.destroySession(bot.id);
    db.deleteBot(bot.id);

    const remainingBots = db.getBotsByUserId(user.id);
    let nextBot = null;
    if (remainingBots.length === 0) {
      nextBot = db.createBot({
        id: 'bot_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        userId: user.id,
        name: 'Mon Assistant JARVIS',
        status: 'OFFLINE',
        config: {
          botName: 'JARVIS',
          prefix: '.',
          autoRead: false,
          reactToStatus: false,
          antiDelete: false,
          antiSpam: true,
          welcomeMessage: 'Bonjour ! Je suis JARVIS, votre assistant personnel.',
          enabledCommands: [...ALL_COMMAND_NAMES],
        },
        stats: {
          messagesHandled: 0,
          commandsExecuted: 0,
          reconnectAttempts: 0,
        },
      });
    } else {
      nextBot = remainingBots[0];
    }

    return res.json({
      success: true,
      message: 'Instance de bot et données supprimées définitivement.',
      deletedBotId: bot.id,
      bot: nextBot,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// Obtenir les paramètres
router.get('/:id/settings', requireBotOwner, (req: AuthenticatedRequest, res: Response) => {
  const bot = req.bot!;
  return res.json({
    success: true,
    name: bot.name,
    config: bot.config,
  });
});

// Mettre à jour les paramètres
router.patch('/:id/settings', requireBotOwner, (req: AuthenticatedRequest, res: Response) => {
  const bot = req.bot!;
  const { name, config } = req.body;

  const updates: any = {};
  if (name && typeof name === 'string') {
    updates.name = name.trim().slice(0, 50);
  }

  if (config && typeof config === 'object') {
    updates.config = {
      ...bot.config,
      botName: config.botName ? String(config.botName).trim().slice(0, 30) : bot.config.botName,
      prefix: config.prefix ? String(config.prefix).trim().slice(0, 5) : bot.config.prefix,
      autoRead: typeof config.autoRead === 'boolean' ? config.autoRead : bot.config.autoRead,
      reactToStatus: typeof config.reactToStatus === 'boolean' ? config.reactToStatus : bot.config.reactToStatus,
      antiDelete: typeof config.antiDelete === 'boolean' ? config.antiDelete : bot.config.antiDelete,
      antiSpam: typeof config.antiSpam === 'boolean' ? config.antiSpam : bot.config.antiSpam,
      welcomeMessage: config.welcomeMessage ? String(config.welcomeMessage).slice(0, 300) : bot.config.welcomeMessage,
      enabledCommands: Array.isArray(config.enabledCommands) ? config.enabledCommands : bot.config.enabledCommands,
    };
  }

  const updated = db.updateBot(bot.id, updates);
  jarvisEngine.log(bot.id, 'info', 'Paramètres de configuration du bot mis à jour.');

  return res.json({
    success: true,
    message: 'Paramètres enregistrés avec succès.',
    config: updated?.config,
    name: updated?.name,
  });
});

// Journaux techniques du bot
router.get('/:id/logs', requireBotOwner, (req: AuthenticatedRequest, res: Response) => {
  const bot = req.bot!;
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 200);
  const logs = db.getLogs(bot.id, limit);

  return res.json({
    success: true,
    logs,
  });
});

// Effacer les journaux
router.delete('/:id/logs', requireBotOwner, (req: AuthenticatedRequest, res: Response) => {
  const bot = req.bot!;
  db.clearLogs(bot.id);
  return res.json({ success: true, message: 'Journaux effacés.' });
});

// Obtenir la liste des commandes et leur état d'activation
router.get('/:id/commands', requireBotOwner, (req: AuthenticatedRequest, res: Response) => {
  const bot = req.bot!;
  const enabled = bot.config.enabledCommands || [];

  const commands = builtInCommands.map(c => ({
    name: c.name,
    category: c.category,
    description: c.description,
    usage: `${bot.config.prefix}${c.usage}`,
    aliases: c.aliases,
    isEnabled: enabled.includes(c.name),
  }));

  return res.json({
    success: true,
    prefix: bot.config.prefix,
    commands,
  });
});

// Basculer l'activation d'une commande
router.post('/:id/commands/toggle', requireBotOwner, (req: AuthenticatedRequest, res: Response) => {
  const bot = req.bot!;
  const { commandName, enabled } = req.body;

  if (!commandName) {
    return res.status(400).json({ success: false, error: 'Nom de commande requis.' });
  }

  let current = [...(bot.config.enabledCommands || [])];
  if (enabled) {
    if (!current.includes(commandName)) current.push(commandName);
  } else {
    current = current.filter(c => c !== commandName);
  }

  db.updateBot(bot.id, {
    config: {
      ...bot.config,
      enabledCommands: current,
    },
  });

  return res.json({
    success: true,
    commandName,
    isEnabled: current.includes(commandName),
  });
});

// Simulateur de commande (Test interactif depuis l'interface)
router.post('/:id/test-message', requireBotOwner, async (req: AuthenticatedRequest, res: Response) => {
  const bot = req.bot!;
  const { message } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ success: false, error: 'Message de test requis.' });
  }

  try {
    const result = await jarvisEngine.simulateCommand(bot.id, message);
    return res.json({
      success: result.success,
      reply: result.reply,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

export default router;
