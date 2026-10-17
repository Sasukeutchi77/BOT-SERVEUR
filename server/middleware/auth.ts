import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db, User, BotInstanceRecord } from '../db/database';

const JWT_SECRET = process.env.JWT_SECRET || 'jarvis_cloud_security_key_2026_prod';

export interface AuthenticatedRequest extends Request {
  user?: User;
  bot?: BotInstanceRecord;
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Autorisation directe via le Code et l'Email du Serveur (SERVER_CODE & SERVER_EMAIL)
  const reqServerCode = req.headers['x-server-code'] as string | undefined;
  const configuredServerCode = process.env.SERVER_CODE;

  if (configuredServerCode && reqServerCode && reqServerCode.trim() === configuredServerCode.trim()) {
    const serverEmail = (req.headers['x-server-email'] as string) || process.env.SERVER_EMAIL || 'server@jarviscloud.local';
    let serverUser = db.getUserByEmail(serverEmail);
    if (!serverUser) {
      serverUser = db.createUser({
        id: 'usr_server_' + Buffer.from(serverEmail).toString('hex').slice(0, 10),
        email: serverEmail,
        passwordHash: 'server_authorized_handshake',
        role: 'admin',
        isSuspended: false,
      });
    }
    req.user = serverUser;
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Non authentifié. Token Bearer manquant.',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string; email: string; role: string };
    const user = db.getUserById(payload.sub);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Utilisateur introuvable ou session expirée.',
      });
    }

    if (user.isSuspended) {
      return res.status(403).json({
        success: false,
        error: 'Votre compte a été suspendu par un administrateur. Contactez le support.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Session invalide ou expirée.',
    });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Accès refusé. Droits administrateur requis.',
    });
  }
  next();
}

export function requireBotOwner(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const botId = req.params.id || req.params.botId;
  if (!botId) {
    return res.status(400).json({ success: false, error: 'Identifiant du bot requis.' });
  }

  const bot = db.getBotById(botId);
  if (!bot) {
    return res.status(404).json({ success: false, error: 'Instance de bot introuvable.' });
  }

  // Vérification de stricte isolation des données
  if (req.user?.role !== 'admin' && bot.userId !== req.user?.id) {
    return res.status(403).json({
      success: false,
      error: 'Accès interdit. Cette instance de bot ne vous appartient pas.',
    });
  }

  req.bot = bot;
  next();
}
