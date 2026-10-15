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

// Endpoint public du nombre d'utilisateurs connectés
app.get('/api/stats/connected', (req, res) => {
  const visitorId = req.headers['x-visitor-id'] || req.ip || req.socket.remoteAddress || 'guest';
  activeVisitors.set(String(visitorId), Date.now());

  // Nombre de bots et sessions réelles
  const stats = db.getStats();
  const onlineBots = stats.activeBots;
  const totalBots = stats.totalBots;
  
  // Total utilisateurs connectés
  const currentConnected = Math.max(activeVisitors.size + onlineBots, 1);

  res.json({
    success: true,
    totalSessions: totalBots,
    activeSessions: onlineBots,
    connectedCount: currentConnected,
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
