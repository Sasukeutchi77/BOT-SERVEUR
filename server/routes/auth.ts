import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/database';
import { generateToken, requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import { ALL_COMMAND_NAMES } from '../jarvis/commands';

const router = Router();

// Validation simple d'email
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Session Invité Automatique (Accès direct sans inscription ni mot de passe)
router.post('/guest', (req, res: Response) => {
  try {
    const guestId = 'usr_guest_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const guestUser = db.createUser({
      id: guestId,
      email: `utilisateur_${guestId.slice(-5)}@jarvis.local`,
      passwordHash: 'guest_auto_session',
      role: 'user',
      isSuspended: false,
    });

    const bot = db.createBot({
      id: 'bot_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      userId: guestUser.id,
      name: 'Mon Assistant JARVIS',
      status: 'OFFLINE',
      config: {
        botName: 'JARVIS',
        prefix: '.',
        autoRead: false,
        reactToStatus: false,
        antiDelete: false,
        antiSpam: true,
        welcomeMessage: 'Bonjour ! Je suis JARVIS, votre assistant personnel WhatsApp.',
        enabledCommands: [...ALL_COMMAND_NAMES],
      },
      stats: {
        messagesHandled: 0,
        commandsExecuted: 0,
        reconnectAttempts: 0,
      },
    });

    const token = generateToken(guestUser);

    return res.json({
      success: true,
      token,
      user: {
        id: guestUser.id,
        email: guestUser.email,
        role: guestUser.role,
        createdAt: guestUser.createdAt,
      },
      bot,
    });
  } catch (err: any) {
    console.error('[Guest Auth Error]:', err);
    return res.status(500).json({ success: false, error: 'Erreur lors de la création de la session instantanée.' });
  }
});

// Inscription
router.post('/register', authRateLimiter, async (req, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email et mot de passe requis.' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'Format d\'adresse email invalide.' });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Le mot de passe doit comporter au moins 6 caractères.',
      });
    }

    const existing = db.getUserByEmail(email);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Un compte avec cette adresse email existe déjà.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const isFirstUser = db.getAllUsers().length === 0;

    const user = db.createUser({
      id: 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      email: email.trim().toLowerCase(),
      passwordHash,
      role: isFirstUser ? 'admin' : 'user',
      isSuspended: false,
    });

    // Créer automatiquement une première instance de bot pour l'utilisateur
    db.createBot({
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
        welcomeMessage: 'Bonjour ! Je suis JARVIS, votre assistant personnel WhatsApp.',
        enabledCommands: ['help', 'ping', 'runtime', 'info', 'ai', 'calc', 'qr', 'quote', 'tagall'],
      },
      stats: {
        messagesHandled: 0,
        commandsExecuted: 0,
        reconnectAttempts: 0,
      },
    });

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'Compte créé avec succès.',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    console.error('[Auth Register Error]:', err);
    return res.status(500).json({ success: false, error: 'Erreur interne du serveur lors de l\'inscription.' });
  }
});

// Connexion
router.post('/login', authRateLimiter, async (req, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email et mot de passe requis.' });
    }

    const user = db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Identifiants incorrects.' });
    }

    if (user.isSuspended) {
      return res.status(403).json({
        success: false,
        error: 'Votre compte a été suspendu par un administrateur. Contactez le support.',
      });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Identifiants incorrects.' });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Connexion réussie.',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    console.error('[Auth Login Error]:', err);
    return res.status(500).json({ success: false, error: 'Erreur interne du serveur lors de la connexion.' });
  }
});

// Profil utilisateur courant
router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  return res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    },
  });
});

// Informations publiques sur la configuration du serveur (Email & Code / Status)
router.get('/server-info', (req, res: Response) => {
  const cfg = db.getServerConfig();
  const allUsers = db.getAllUsers();
  const isDefaultAdmin = cfg.adminEmail === 'admin@jarviscloud.local';

  return res.json({
    success: true,
    adminEmail: isDefaultAdmin ? 'Non configuré (Compte par défaut)' : cfg.adminEmail,
    isDefaultAdmin,
    hasGeminiKey: !!(process.env.GEMINI_API_KEY || cfg.geminiApiKey),
    ownerNumberConfigured: !!(process.env.OWNER_NUMBER || cfg.ownerNumber),
    totalUsers: allUsers.length,
  });
});

// Installation initiale de l'Email et du Code Serveur Admin directement depuis l'interface web
router.post('/setup-admin', async (req, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email et code d\'accès serveur requis.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'Format d\'adresse email invalide.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Le code serveur doit comporter au moins 6 caractères.' });
    }

    const cfg = db.getServerConfig();
    const isDefaultAdmin = cfg.adminEmail === 'admin@jarviscloud.local';

    if (isDefaultAdmin) {
      await db.updateServerConfig({
        adminEmail: email,
        newAdminPassword: password,
      });

      const adminUser = db.getUserByEmail(email);
      if (adminUser) {
        const token = generateToken(adminUser);
        return res.json({
          success: true,
          message: 'Email et code d\'accès administrateur configurés avec succès !',
          token,
          user: {
            id: adminUser.id,
            email: adminUser.email,
            role: adminUser.role,
            createdAt: adminUser.createdAt,
          },
        });
      }
    }

    return res.status(403).json({
      success: false,
      error: 'Un administrateur personnalisé est déjà configuré. Utilisez l\'onglet Connexion avec votre email et code.',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Déconnexion
router.post('/logout', (req, res: Response) => {
  return res.json({ success: true, message: 'Déconnexion effectuée.' });
});

export default router;
