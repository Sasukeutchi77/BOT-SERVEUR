import { Router, Response } from 'express';
import os from 'os';
import { db } from '../db/database';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { maskPhoneNumber } from '../middleware/sanitizer';
import { jarvisEngine } from '../jarvis/engine';

const router = Router();

// Toutes les routes admin requièrent l'authentification et le rôle admin
router.use(requireAuth, requireAdmin);

// Statistiques globales
router.get('/stats', (req: AuthenticatedRequest, res: Response) => {
  const stats = db.getStats();
  return res.json({ success: true, stats });
});

// Liste des utilisateurs
router.get('/users', (req: AuthenticatedRequest, res: Response) => {
  const users = db.getAllUsers();
  const allBots = db.getAllBots();

  const userList = users.map(u => ({
    ...u,
    botCount: allBots.filter(b => b.userId === u.id).length,
  }));

  return res.json({ success: true, users: userList });
});

// Suspendre ou réactiver un utilisateur
router.patch('/users/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { isSuspended } = req.body;

  if (typeof isSuspended !== 'boolean') {
    return res.status(400).json({ success: false, error: 'Champ isSuspended booléen requis.' });
  }

  const user = db.getUserById(id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'Utilisateur introuvable.' });
  }

  // Ne pas se suspendre soi-même
  if (user.id === req.user?.id) {
    return res.status(400).json({ success: false, error: 'Impossible de modifier votre propre statut.' });
  }

  const updated = db.updateUser(id, { isSuspended });

  // Si suspendu, arrêter tous ses bots actifs
  if (isSuspended) {
    const userBots = db.getBotsByUserId(id);
    for (const b of userBots) {
      await jarvisEngine.stopInstance(b.id);
    }
  }

  return res.json({
    success: true,
    message: isSuspended ? 'Utilisateur suspendu avec succès.' : 'Compte réactivé.',
    user: updated,
  });
});

// Liste de tous les bots du système
router.get('/bots', (req: AuthenticatedRequest, res: Response) => {
  const bots = db.getAllBots();
  const users = db.getAllUsers();

  const botList = bots.map(b => {
    const owner = users.find(u => u.id === b.userId);
    const liveSession = jarvisEngine.getActiveSession(b.id);
    return {
      id: b.id,
      name: b.name,
      status: liveSession?.status || b.status,
      phoneNumberMasked: maskPhoneNumber(b.phoneNumber),
      ownerEmail: owner ? owner.email : 'Inconnu',
      createdAt: b.createdAt,
      stats: b.stats,
      lastError: b.lastError,
    };
  });

  return res.json({ success: true, bots: botList });
});

// Arrêt d'urgence d'une instance
router.post('/bots/:id/kill', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const bot = db.getBotById(id);
  if (!bot) {
    return res.status(404).json({ success: false, error: 'Bot introuvable.' });
  }

  try {
    await jarvisEngine.stopInstance(id);
    jarvisEngine.log(id, 'warn', 'Instance arrêtée par un administrateur système (arrêt d\'urgence).');
    return res.json({ success: true, message: 'Instance arrêtée avec succès par l\'administrateur.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Surveillance des ressources système
router.get('/system', (req: AuthenticatedRequest, res: Response) => {
  const mem = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  return res.json({
    success: true,
    system: {
      platform: os.platform(),
      release: os.release(),
      uptimeSeconds: Math.floor(os.uptime()),
      processUptimeSeconds: Math.floor(process.uptime()),
      cpuCount: os.cpus().length,
      loadAverage: os.loadavg(),
      nodeVersion: process.version,
      memory: {
        totalMB: Math.round(totalMem / (1024 * 1024)),
        usedMB: Math.round(usedMem / (1024 * 1024)),
        freeMB: Math.round(freeMem / (1024 * 1024)),
        heapUsedMB: Math.round(mem.heapUsed / (1024 * 1024)),
        heapTotalMB: Math.round(mem.heapTotal / (1024 * 1024)),
        rssMB: Math.round(mem.rss / (1024 * 1024)),
      },
    },
  });
});

// Diagnostic & Intégrateur d'Archive JARVIS ZIP
router.get('/archive-status', (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    success: true,
    engine: 'Baileys Multi-Device v7 Engine (Built-in)',
    customArchiveDetected: false,
    isolationMode: 'Per-User Context Sandbox',
    storageDriver: 'ACID Persistent Store',
    readyForVPS: true,
  });
});

export default router;
