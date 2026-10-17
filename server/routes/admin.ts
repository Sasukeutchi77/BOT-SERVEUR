import { Router, Response } from 'express';
import { db } from '../db/database';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { jarvisEngine } from '../jarvis/engine';

const router = Router();

// Toutes les routes admin nécessitent une authentification administrateur
router.use(requireAuth);
router.use(requireAdmin);

// Métriques et statistiques globales de la plateforme
router.get('/stats', (req: AuthenticatedRequest, res: Response) => {
  const stats = db.getStats();
  const onlineCount = jarvisEngine.getRealOnlineCount();
  return res.json({
    success: true,
    stats: {
      ...stats,
      realTimeOnlineBots: onlineCount,
    },
  });
});

// Lister tous les utilisateurs
router.get('/users', (req: AuthenticatedRequest, res: Response) => {
  const users = db.getAllUsers();
  return res.json({ success: true, users });
});

// Mettre à jour un utilisateur (suspension, rôle, etc.)
router.patch('/users/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { isSuspended, role } = req.body;

  const user = db.getUserById(id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'Utilisateur introuvable.' });
  }

  // Ne pas permettre de suspendre le compte admin actuel
  if (req.user?.id === id && isSuspended) {
    return res.status(400).json({ success: false, error: 'Impossible de suspendre son propre compte administrateur.' });
  }

  const updated = db.updateUser(id, {
    ...(isSuspended !== undefined ? { isSuspended: Boolean(isSuspended) } : {}),
    ...(role !== undefined ? { role } : {}),
  });

  return res.json({ success: true, user: updated });
});

// Supprimer un utilisateur
router.delete('/users/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  if (req.user?.id === id) {
    return res.status(400).json({ success: false, error: 'Impossible de supprimer son propre compte administrateur.' });
  }

  const success = db.deleteUser(id);
  if (!success) {
    return res.status(404).json({ success: false, error: 'Utilisateur introuvable.' });
  }

  return res.json({ success: true, message: 'Utilisateur supprimé.' });
});

// Lister tous les bots de toutes les instances
router.get('/bots', (req: AuthenticatedRequest, res: Response) => {
  const bots = db.getAllBots().map(b => {
    const liveSession = jarvisEngine.getActiveSession(b.id);
    return {
      ...b,
      liveStatus: liveSession?.status || b.status,
    };
  });
  return res.json({ success: true, bots });
});

// Supprimer ou déconnecter un bot
router.delete('/bots/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    await jarvisEngine.stopInstance(id);
    db.deleteBot(id);
    return res.json({ success: true, message: 'Instance de bot supprimée.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Configuration globale du serveur
router.get('/config', (req: AuthenticatedRequest, res: Response) => {
  const config = db.getServerConfig();
  return res.json({ success: true, config });
});

// Mise à jour de la configuration globale
router.post('/config', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await db.updateServerConfig(req.body);
    return res.json({ success: true, config: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Réinitialiser les métriques
router.post('/reset-metrics', (req: AuthenticatedRequest, res: Response) => {
  db.resetMetrics();
  return res.json({ success: true, message: 'Compteurs et métriques réinitialisés.' });
});

export default router;
