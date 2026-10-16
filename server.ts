import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import authRouter from './server/routes/auth';
import botsRouter from './server/routes/bots';
import adminRouter from './server/routes/admin';
import { jarvisEngine } from './server/jarvis/engine';
import { db } from './server/db/database';

dotenv.config();

// Filtrage des avertissements internes transitoires de libsignal (gérés par le mécanisme de resynchronisation)
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (
    msg.includes('Failed to decrypt message with any known session') ||
    msg.includes('Session error:Error: Bad MAC') ||
    msg.includes('Session error: Error: Bad MAC') ||
    msg.includes('No matching sessions found for message') ||
    msg.includes('Bad MAC')
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middlewares fondamentaux
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes API REST
app.use('/api/auth', authRouter);
app.use('/api/bots', botsRouter);
app.use('/api/admin', adminRouter);

// Suivi en temps réel des utilisateurs connectés
const activeVisitors = new Map<string, number>();

// Nettoyage des sessions inactives (> 45s)
setInterval(() => {
  const cutoff = Date.now() - 45000;
  for (const [id, lastSeen] of activeVisitors.entries()) {
    if (lastSeen < cutoff) {
      activeVisitors.delete(id);
    }
  }
}, 15000);

// Endpoint public du nombre d'utilisateurs et de bots connectés en temps réel
app.get('/api/stats/connected', (req, res) => {
  const visitorId = req.headers['x-visitor-id'] || req.ip || req.socket.remoteAddress || 'guest';
  activeVisitors.set(String(visitorId), Date.now());

  // Comptage 100% réel des sessions WhatsApp connectées en direct
  const realOnlineBots = jarvisEngine.getRealOnlineCount();
  
  // Nombre réel cumulatif de bots connectés depuis le lancement du site
  const totalEverConnected = db.getTotalBotsEverConnected();

  // Nombre d'utilisateurs actuellement sur le site
  const currentConnected = Math.max(activeVisitors.size, 1);

  // Cumul des messages traités par les instances
  const totalMessages = db.getAllBots().reduce((acc, b) => acc + (b.stats?.messagesHandled || 0), 0);

  res.json({
    success: true,
    onlineBots: realOnlineBots,
    totalBotsEverConnected: totalEverConnected,
    totalSessions: totalEverConnected,
    activeSessions: realOnlineBots,
    connectedCount: currentConnected,
    totalMessages,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'JARVIS CLOUD Multi-Tenant WhatsApp Platform',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Montage de Vite en développement ou des fichiers statiques en production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[JARVIS CLOUD] Vite middlewares mounted in dev mode.');
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
    console.log('[JARVIS CLOUD] Static files served from /dist in production mode.');
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🚀 JARVIS CLOUD est en écoute sur http://0.0.0.0:${PORT}`);
    console.log(`   Mode: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
    console.log(`   Architecture: Multi-Tenant WhatsApp Baileys Engine`);
    console.log(`=======================================================`);

    // Restauration automatique persistante des sessions WhatsApp actives
    jarvisEngine.restoreAllSessions().catch(err => {
      console.error('[JARVIS CLOUD] Erreur restauration sessions:', err);
    });
  });

  // Arrêt propre en cas de signal système
  const shutdown = async (signal: string) => {
    console.log(`\n[JARVIS CLOUD] Signal ${signal} reçu. Arrêt propre des instances...`);
    server.close(() => {
      console.log('[JARVIS CLOUD] Serveur HTTP arrêté.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('[JARVIS CLOUD] Fatal server error:', err);
  process.exit(1);
});
