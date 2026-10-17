import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db, User, BotInstanceRecord } from '../db/database';

export interface AuthenticatedRequest extends Request {
  user?: User;
  bot?: BotInstanceRecord;
}

const JWT_SECRET = process.env.JWT_SECRET || 'jarvis_cloud_secret_key_secure_2026';

/**
 * Génère un jeton de session sécurisé HMAC-SHA256
 */
export function generateToken(user: User): string {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    exp: Date.now() + 14 * 24 * 60 * 60 * 1000, // 14 jours
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(body).digest('base64url');
  return `${body}.${signature}`;
}

/**
 * Valide et décode le jeton de session
 */
export function verifyToken(token: string): { userId: string; email: string; role: string; exp: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [body, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(body).digest('base64url');
    if (signature !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Middleware vérifiant la présence et la validité d'une session authentifiée
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentification requise.' });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ success: false, error: 'Jeton de session expiré ou invalide.' });
  }

  const user = db.getUserById(payload.userId);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Utilisateur introuvable.' });
  }

  if (user.isSuspended) {
    return res.status(403).json({ success: false, error: 'Ce compte a été suspendu par un administrateur.' });
  }

  req.user = user;
  next();
}

/**
 * Middleware vérifiant que l'utilisateur a le rôle administrateur
 */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
  }
  next();
}

/**
 * Middleware vérifiant que le bot demandé appartient bien à l'utilisateur appelant
 */
export function requireBotOwner(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const botId = req.params.id;
  if (!botId) {
    return res.status(400).json({ success: false, error: 'Identifiant du bot manquant.' });
  }

  let bot = db.getBotById(botId);
  if (!bot) {
    // Si l'utilisateur est authentifié et que le bot n'existe pas en base (ex: session invité, redémarrage du serveur), on le crée à la volée
    if (req.user) {
      bot = db.createBot({
        id: botId,
        userId: req.user.id,
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
    } else {
      return res.status(404).json({ success: false, error: 'Instance de bot introuvable.' });
    }
  }

  if (req.user?.role !== 'admin' && bot.userId !== req.user?.id) {
    return res.status(403).json({ success: false, error: 'Vous n\'êtes pas autorisé à accéder à cette instance.' });
  }

  req.bot = bot;
  next();
}
