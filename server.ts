import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import axios from 'axios';
import { timingSafeEqual } from 'node:crypto';
import authRouter from './server/routes/auth';
import botsRouter from './server/routes/bots';
import adminRouter from './server/routes/admin';
import { createRateLimiter } from './server/middleware/rateLimiter';
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
app.set('trust proxy', true);
let detectedPort = process.env.PORT || process.env.SERVER_PORT;
if (!detectedPort && fs.existsSync('/home/container/.port')) {
  try { detectedPort = fs.readFileSync('/home/container/.port', 'utf8').trim(); } catch {}
}
const PORT = parseInt(detectedPort || '3000', 10);

// Middlewares fondamentaux avec CORS universel pour les environnements iFrame
app.use(cors({
  origin: true,
  credentials: true,
}));
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// État de liaison au serveur distant du bot H24
let remoteServerUrl = (process.env.SERVER_URL || process.env.VITE_SERVER_URL || '').trim().replace(/\/+$/, '');
let remoteServerEmail = (process.env.SERVER_EMAIL || process.env.VITE_SERVER_EMAIL || '').trim();
let remoteServerCode = (process.env.SERVER_CODE || process.env.VITE_SERVER_CODE || '').trim();

const EXPECTED_REMOTE_SERVICE = 'JARVIS CLOUD Multi-Tenant WhatsApp Platform';
const serverConnectionRateLimiter = createRateLimiter(
  60 * 1000,
  5,
  'Trop de tentatives de modification du serveur. Réessayez dans une minute.',
);

function normalizeRemoteServerUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('URL du serveur invalide.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('L’URL du serveur doit commencer par http:// ou https://.');
  }
  if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
    throw new Error('En production, l’URL du serveur doit utiliser HTTPS.');
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('L’URL du serveur ne doit pas contenir d’identifiants, de paramètres ni de fragment.');
  }

  let cleanPath = parsed.pathname.replace(/\/+$/, '');
  if (cleanPath.endsWith('/api')) {
    cleanPath = cleanPath.slice(0, -4);
  }

  return `${parsed.origin}${cleanPath}`;
}

function isSelfHost(targetUrlStr: string, req: express.Request): boolean {
  try {
    const targetUrl = new URL(targetUrlStr);
    const targetHost = targetUrl.hostname.toLowerCase();
    
    const forwardedHost = ((req.headers['x-forwarded-host'] as string) || '').split(',')[0].trim().toLowerCase().split(':')[0];
    const hostHeader = (req.get('host') || '').toLowerCase().split(':')[0];
    const reqHostname = (req.hostname || '').toLowerCase();

    const isLocalTarget = ['localhost', '127.0.0.1', '0.0.0.0'].includes(targetHost);
    const isLocalReq = ['localhost', '127.0.0.1', '0.0.0.0'].includes(hostHeader);

    if (isLocalTarget && isLocalReq) return true;
    if (forwardedHost && targetHost === forwardedHost) return true;
    if (hostHeader && targetHost === hostHeader) return true;
    if (reqHostname && targetHost === reqHostname) return true;

    return false;
  } catch {
    return false;
  }
}

function matchesConfiguredServerCode(candidate: unknown): boolean {
  const configuredCode = (process.env.SERVER_CODE || '').trim();
  if (!configuredCode || typeof candidate !== 'string') return false;

  const expected = Buffer.from(configuredCode);
  const provided = Buffer.from(candidate.trim());
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

async function probeRemoteServer(
  url: string,
  currentHost?: string,
): Promise<{ isConnected: boolean; testError?: string }> {
  try {
    const normalizedUrl = normalizeRemoteServerUrl(url);
    if (!normalizedUrl) return { isConnected: false };
    if (currentHost && new URL(normalizedUrl).host === currentHost.trim().toLowerCase()) {
      return {
        isConnected: false,
        testError: 'SERVER_URL pointe vers ce même site. Utilisez l’URL distincte du serveur bot pour éviter une boucle.',
      };
    }

    const health = await axios.get(`${normalizedUrl}/api/health`, {
      timeout: 10000,
      validateStatus: () => true,
    });

    const responseText = typeof health.data === 'string' ? health.data : JSON.stringify(health.data || {});
    if (responseText.includes('pterodactyl') || responseText.includes('Cipher')) {
      return {
        isConnected: false,
        testError: 'Cette URL correspond à un panel Pterodactyl (interface de gestion d’hébergement) et non à l’API JARVIS. Sur Render ou en local, utilisez le Mode Cloud Autonome : le bot tourne déjà en interne 24h/24 sans serveur externe !',
      };
    }

    if (health.status !== 200) {
      return {
        isConnected: false,
        testError: `Le serveur distant a répondu avec le statut HTTP ${health.status}. Vérifiez son fonctionnement.`,
      };
    }

    // Tester la présence de l'API des bots
    const botsApi = await axios.get(`${normalizedUrl}/api/bots`, {
      timeout: 10000,
      validateStatus: () => true,
    });
    // 401 (non authentifié) ou 200 (liste reçue) confirme que l'API est active
    if (![200, 401, 403].includes(botsApi.status)) {
      return {
        isConnected: false,
        testError: `L'API des bots n'a pas répondu comme attendu (HTTP ${botsApi.status}).`,
      };
    }

    return { isConnected: true };
  } catch (error: any) {
    return {
      isConnected: false,
      testError: error.message || 'Serveur distant injoignable (délai dépassé ou URL inaccessible).',
    };
  }
}

// Endpoint de consultation & statut de la liaison
app.get('/api/server-connection', async (req, res) => {
  const probe = remoteServerUrl
    ? await probeRemoteServer(remoteServerUrl, req.get('host'))
    : { isConnected: false, testError: undefined };
  return res.json({
    serverUrl: remoteServerUrl,
    serverEmail: remoteServerEmail,
    serverCode: remoteServerCode ? '••••••••' : '',
    isConnected: probe.isConnected,
    testError: probe.testError,
    mode: remoteServerUrl ? 'remote' : 'cloud',
  });
});

// Endpoint de mise à jour à chaud de la liaison au serveur distant
app.post('/api/server-connection', serverConnectionRateLimiter, async (req, res) => {
  const configuredCode = (process.env.SERVER_CODE || '').trim();
  const providedCode = typeof req.body?.serverCode === 'string' ? req.body.serverCode.trim() : '';

  const rawUrl = typeof req.body?.serverUrl === 'string' ? req.body.serverUrl.trim() : '';
  const isResetting = !rawUrl;

  if (!isResetting && configuredCode && !matchesConfiguredServerCode(providedCode)) {
    return res.status(403).json({ success: false, error: 'Code de configuration (SERVER_CODE) incorrect.' });
  }

  if (!configuredCode && providedCode && !isResetting) {
    process.env.SERVER_CODE = providedCode;
    remoteServerCode = providedCode;
  }

  // Si on réinitialise vers le mode Cloud autonome
  if (isResetting) {
    remoteServerUrl = '';
    remoteServerEmail = '';
    process.env.SERVER_URL = '';
    process.env.SERVER_EMAIL = '';
    return res.json({
      success: true,
      serverUrl: '',
      serverEmail: '',
      serverCode: remoteServerCode ? '••••••••' : '',
      isConnected: false,
      mode: 'cloud',
      message: 'Mode Cloud Autonome activé avec succès. Les bots WhatsApp tournent localement sur ce serveur 24h/24.',
    });
  }

  let nextServerUrl = remoteServerUrl;
  try {
    nextServerUrl = normalizeRemoteServerUrl(rawUrl);
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message || 'URL du serveur invalide.' });
  }

  const nextServerEmail = typeof req.body?.serverEmail === 'string'
    ? req.body.serverEmail.trim()
    : remoteServerEmail;

  if (nextServerUrl) {
    const probe = await probeRemoteServer(nextServerUrl, req.get('host'));
    if (!probe.isConnected) {
      return res.json({
        success: false,
        serverUrl: remoteServerUrl,
        serverEmail: remoteServerEmail,
        serverCode: remoteServerCode ? '••••••••' : '',
        isConnected: false,
        testError: probe.testError || 'Le serveur distant n’a pas pu être validé.',
        mode: remoteServerUrl ? 'remote' : 'cloud',
      });
    }
  }

  remoteServerUrl = nextServerUrl;
  remoteServerEmail = nextServerEmail;
  remoteServerCode = (process.env.SERVER_CODE || providedCode).trim();
  process.env.SERVER_URL = remoteServerUrl;
  process.env.SERVER_EMAIL = remoteServerEmail;

  return res.json({
    success: true,
    serverUrl: remoteServerUrl,
    serverEmail: remoteServerEmail,
    serverCode: remoteServerCode ? '••••••••' : '',
    isConnected: !!remoteServerUrl,
    mode: remoteServerUrl ? 'remote' : 'cloud',
  });
});

// Middleware Proxy : si un serveur distant est défini, relayer les requêtes API (bots, auth, stats, admin)
app.use(async (req, res, next) => {
  if (!remoteServerUrl || !req.path.startsWith('/api') || req.path === '/api/server-connection' || req.path === '/api/health') {
    return next();
  }

  // Si l'URL distante pointe vers ce même serveur, exécuter directement les routes locales
  if (isSelfHost(remoteServerUrl, req)) {
    return next();
  }

  try {
    const targetUrl = `${remoteServerUrl}${req.originalUrl || req.url}`;
    const headers: Record<string, string> = {};
    if (req.headers.authorization) headers['authorization'] = req.headers.authorization as string;
    if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'] as string;
    if (req.headers['x-visitor-id']) headers['x-visitor-id'] = req.headers['x-visitor-id'] as string;
    if (remoteServerCode) headers['x-server-code'] = remoteServerCode;
    if (remoteServerEmail) headers['x-server-email'] = remoteServerEmail;

    const proxyRes = await axios({
      method: req.method as any,
      url: targetUrl,
      data: ['GET', 'HEAD'].includes(req.method.toUpperCase()) ? undefined : req.body,
      headers,
      validateStatus: () => true,
      timeout: 10000,
    });

    const contentType = (proxyRes.headers['content-type'] as string) || '';
    if (contentType.includes('application/json') || (typeof proxyRes.data === 'object' && proxyRes.data !== null)) {
      res.status(proxyRes.status);
      for (const [k, v] of Object.entries(proxyRes.headers)) {
        if (k.toLowerCase() !== 'content-length' && k.toLowerCase() !== 'transfer-encoding') {
          res.setHeader(k, v as string);
        }
      }
      return res.send(proxyRes.data);
    }

    // Le serveur distant a renvoyé du contenu non-JSON (ex: page HTML d'un panel Pterodactyl ou erreur 404 Nginx).
    // Basculement immédiat et transparent sur le moteur JARVIS local !
    console.warn(`[JARVIS Proxy] Réponse non-JSON du serveur distant sur ${targetUrl} (HTTP ${proxyRes.status}). Basculement automatique sur le moteur JARVIS local.`);
    return next();
  } catch (err: any) {
    // Si le serveur distant est injoignable, basculer sur le moteur local plutôt que de planter l'application
    console.warn(`[JARVIS Proxy] Échec du transfert vers le serveur distant (${err.message}). Basculement sur le moteur JARVIS local.`);
    return next();
  }
});

// Routes API REST locales (exécutées si pas de serveur distant ou en fallback)
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

  // Cumul des messages traités par toutes les instances (persisté dans les compteurs)
  const totalMessages = db.getTotalMessages();

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
  const distPath = path.resolve(__dirname, 'dist');
  const indexPath = path.join(distPath, 'index.html');
  const hasDist = fs.existsSync(indexPath);
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction && hasDist) {
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ success: false, error: 'Route API introuvable' });
      }
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
      next();
    });
    console.log('[JARVIS CLOUD] Fichiers statiques servis depuis /dist en mode PRODUCTION.');
  } else {
    if (isProduction && !hasDist) {
      console.warn('[JARVIS CLOUD] Note: /dist introuvable en mode production. Montage automatique du serveur Vite à la volée.');
    } else {
      console.log('[JARVIS CLOUD] Montage des middlewares Vite en mode DEV.');
    }
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
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
