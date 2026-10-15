import path from 'path';
import fs from 'fs';
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
  proto,
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import { db, BotInstanceRecord } from '../db/database';
import { ActiveBotSession, CommandContext } from './types';
import { builtInCommands } from './commands';
import { sanitizeLogMessage } from '../middleware/sanitizer';

async function getBaileysVersion(): Promise<[number, number, number]> {
  try {
    const { fetchLatestWaWebVersion } = await import('@whiskeysockets/baileys');
    if (fetchLatestWaWebVersion) {
      const res = await fetchLatestWaWebVersion({});
      if (res?.version && Array.isArray(res.version) && res.version.length === 3) {
        return res.version as [number, number, number];
      }
    }
  } catch {}
  try {
    const { version } = await fetchLatestBaileysVersion();
    if (Array.isArray(version) && version.length === 3) {
      return version as [number, number, number];
    }
  } catch {}
  return [2, 3000, 1050469598];
}

// Configuration paths
const SESSIONS_DIR = path.resolve(process.cwd(), 'data', 'sessions');

class JarvisEngineManager {
  private activeSessions = new Map<string, ActiveBotSession>();

  constructor() {
    this.ensureDirectories();
  }

  private ensureDirectories() {
    if (!fs.existsSync(SESSIONS_DIR)) {
      fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    }
  }

  private getSessionPath(instanceId: string): string {
    return path.join(SESSIONS_DIR, instanceId);
  }

  /**
   * Log an event with sanitization both to memory and database
   */
  public log(instanceId: string, level: 'info' | 'warn' | 'error' | 'success', message: string, details?: string) {
    const cleanMsg = sanitizeLogMessage(message);
    const cleanDetails = details ? sanitizeLogMessage(details) : undefined;
    db.addLog(instanceId, level, cleanMsg, cleanDetails);
    console.log(`[JARVIS Engine][${instanceId}] [${level.toUpperCase()}] ${cleanMsg}`);
  }

  /**
   * Récupère la session active en mémoire
   */
  public getActiveSession(instanceId: string): ActiveBotSession | undefined {
    return this.activeSessions.get(instanceId);
  }

  /**
   * Démarrer le processus de jumelage par Code (Pairing Code)
   */
  public async requestPairingCode(instanceId: string, rawPhoneNumber: string): Promise<string> {
    const cleanNumber = rawPhoneNumber.replace(/[^\d]/g, '');
    if (!cleanNumber || cleanNumber.length < 8) {
      throw new Error('Numéro de téléphone WhatsApp invalide. Incluez l\'indicatif (ex: 33612345678).');
    }

    const botRecord = db.getBotById(instanceId);
    if (!botRecord) {
      throw new Error('Instance de bot introuvable.');
    }

    // Arrêter toute session précédente en cours
    await this.stopInstance(instanceId);

    const sessionDir = this.getSessionPath(instanceId);
    // Vider le dossier pour garantir des clés éphémères de pairing fraîches
    if (fs.existsSync(sessionDir)) {
      try {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      } catch (e) {}
    }
    fs.mkdirSync(sessionDir, { recursive: true });

    this.log(instanceId, 'info', `Initialisation du jumelage pour le numéro +${cleanNumber}`);
    db.updateBot(instanceId, {
      status: 'PAIRING',
      phoneNumber: `+${cleanNumber}`,
      lastError: undefined,
    });

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const version = await getBaileysVersion();

    // Pino silent logger pour ne rien fuiter dans la console standard
    const pino = (await import('pino')).default;
    const silentLogger = pino({ level: 'silent' });

    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, silentLogger),
      },
      printQRInTerminal: false,
      logger: silentLogger,
      browser: Browsers.ubuntu('Chrome'),
      generateHighQualityLinkPreview: false,
      syncFullHistory: false,
      markOnlineOnConnect: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 30000,
    });

    const activeSession: ActiveBotSession = {
      instanceId,
      userId: botRecord.userId,
      sock,
      status: 'PAIRING',
      reconnectAttempts: 0,
    };
    this.activeSessions.set(instanceId, activeSession);

    // Écouter la mise à jour des identifiants de session
    sock.ev.on('creds.update', async () => {
      await saveCreds();
    });

    // Liaison du gestionnaire de connexion
    this.bindConnectionHandlers(instanceId, sock, saveCreds);

    // Demander le code de jumelage Baileys si non enregistré
    let pairingCode = '';
    if (!sock.authState.creds.registered) {
      // 3.5s pour que le socket WebSocket négocie le handshake Noise initial
      await new Promise(r => setTimeout(r, 3500));
      try {
        pairingCode = await sock.requestPairingCode(cleanNumber);
        activeSession.pairingCode = pairingCode;
        this.log(instanceId, 'info', `Code de jumelage généré : ${pairingCode}. En attente de saisie dans WhatsApp.`);
      } catch (err: any) {
        this.log(instanceId, 'warn', `Échec de génération du code de jumelage: ${err.message}`);
        db.updateBot(instanceId, { status: 'OFFLINE', lastError: err.message });
        throw new Error(`Impossible de générer le code de jumelage : ${err.message}`);
      }
    }

    return pairingCode;
  }

  /**
   * Démarrer le processus de jumelage par QR Code
   */
  public async requestQrCode(instanceId: string): Promise<string> {
    const botRecord = db.getBotById(instanceId);
    if (!botRecord) throw new Error('Instance introuvable');

    await this.stopInstance(instanceId);

    const sessionDir = this.getSessionPath(instanceId);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    this.log(instanceId, 'info', 'Génération d\'un QR Code de connexion');
    db.updateBot(instanceId, { status: 'PAIRING' });

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const version = await getBaileysVersion();
    const pino = (await import('pino')).default;
    const silentLogger = pino({ level: 'silent' });

    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, silentLogger),
      },
      printQRInTerminal: false,
      logger: silentLogger,
      browser: Browsers.ubuntu('Chrome'),
    });

    const activeSession: ActiveBotSession = {
      instanceId,
      userId: botRecord.userId,
      sock,
      status: 'PAIRING',
      reconnectAttempts: 0,
    };
    this.activeSessions.set(instanceId, activeSession);

    sock.ev.on('creds.update', async () => {
      await saveCreds();
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Délai dépassé pour la génération du QR Code.'));
      }, 15000);

      sock.ev.on('connection.update', async (update) => {
        const { qr, connection } = update;
        if (qr) {
          clearTimeout(timeout);
          try {
            const dataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 6 });
            activeSession.qrCodeDataUrl = dataUrl;
            this.log(instanceId, 'info', 'QR Code généré. Prêt à être scanné.');
            resolve(dataUrl);
          } catch (e: any) {
            reject(e);
          }
        }
      });

      this.bindConnectionHandlers(instanceId, sock, saveCreds);
    });
  }

  /**
   * Démarrer une instance déjà jumelée
   */
  public async startInstance(instanceId: string): Promise<void> {
    const botRecord = db.getBotById(instanceId);
    if (!botRecord) throw new Error('Instance introuvable.');

    const sessionDir = this.getSessionPath(instanceId);
    if (!fs.existsSync(sessionDir) || !fs.existsSync(path.join(sessionDir, 'creds.json'))) {
      throw new Error('Aucune session existante. Veuillez d\'abord associer votre compte WhatsApp.');
    }

    // Ne pas démarrer si déjà en ligne
    const existing = this.activeSessions.get(instanceId);
    if (existing?.status === 'ONLINE') {
      return;
    }

    await this.stopInstance(instanceId);

    this.log(instanceId, 'info', 'Démarrage du moteur JARVIS...');
    db.updateBot(instanceId, { status: 'CONNECTING' });

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const version = await getBaileysVersion();
    const pino = (await import('pino')).default;
    const silentLogger = pino({ level: 'silent' });

    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, silentLogger),
      },
      printQRInTerminal: false,
      logger: silentLogger,
      browser: Browsers.ubuntu('Chrome'),
      generateHighQualityLinkPreview: false,
      syncFullHistory: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
    });

    const activeSession: ActiveBotSession = {
      instanceId,
      userId: botRecord.userId,
      sock,
      status: 'CONNECTING',
      reconnectAttempts: 0,
    };
    this.activeSessions.set(instanceId, activeSession);

    sock.ev.on('creds.update', saveCreds);
    this.bindConnectionHandlers(instanceId, sock, saveCreds);
    this.bindMessageHandlers(instanceId, sock);
  }

  /**
   * Gestion du cycle de vie de la connexion Baileys
   */
  private bindConnectionHandlers(instanceId: string, sock: any, saveCreds: () => Promise<void>) {
    sock.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;
      const active = this.activeSessions.get(instanceId);
      const botRecord = db.getBotById(instanceId);

      if (qr && active) {
        try {
          active.qrCodeDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 6 });
        } catch (e) {}
      }

      if (connection === 'open') {
        const userJid = sock.user?.id || '';
        const phone = userJid.split(':')[0] || userJid.split('@')[0];

        this.log(instanceId, 'success', `Connexion WhatsApp établie avec succès ! Connecté sous +${phone}`);
        db.updateBot(instanceId, {
          status: 'ONLINE',
          phoneNumber: phone ? `+${phone}` : botRecord?.phoneNumber,
          lastError: undefined,
          stats: {
            messagesHandled: botRecord?.stats?.messagesHandled || 0,
            commandsExecuted: botRecord?.stats?.commandsExecuted || 0,
            lastConnectedAt: new Date().toISOString(),
            lastActivityAt: new Date().toISOString(),
            reconnectAttempts: 0,
          },
        });

        if (active) {
          active.status = 'ONLINE';
          active.pairingCode = undefined;
          active.qrCodeDataUrl = undefined;
          active.reconnectAttempts = 0;
          if (active.keepAliveTimer) clearInterval(active.keepAliveTimer);
          active.keepAliveTimer = setInterval(async () => {
            try {
              if (active.sock && active.status === 'ONLINE') {
                await active.sock.sendPresenceUpdate('available');
              }
            } catch (e) {}
          }, 25000);
        }

        // Synchroniser le propriétaire et préfixe pour le moteur JARVIS
        try {
          const cleanPhone = phone.replace(/\D/g, '');
          const { setRuntimeOwner } = await import('../../lib/ownerSystem.js');
          setRuntimeOwner({ ownerNumber: cleanPhone, ownerLid: '' });
          const { config: botConfig } = await import('../../config.js');
          botConfig.ownerNumber = cleanPhone;
          botConfig.botNumber = cleanPhone;
          if (botRecord?.config.prefix) {
            botConfig.prefix = botRecord.config.prefix;
          }
        } catch (e) {}

        // Lier les écouteurs de messages dès que connecté
        this.bindMessageHandlers(instanceId, sock);
      } else if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const reason = lastDisconnect?.error?.message || 'Connexion fermée';
        const isPairing = botRecord?.status === 'PAIRING';

        this.log(instanceId, 'info', `État connexion WhatsApp : fermée (${statusCode || 'normal'}) — ${reason}`);

        if (active?.keepAliveTimer) {
          clearInterval(active.keepAliveTimer);
          active.keepAliveTimer = undefined;
        }

        // Si le bot était en attente de code et que la fenêtre WhatsApp expire (408)
        if (isPairing && statusCode === 408) {
          this.log(instanceId, 'info', 'Le code de jumelage a expiré. Vous pouvez générer un nouveau code en un clic.');
          db.updateBot(instanceId, { status: 'OFFLINE', lastError: undefined });
          if (active) {
            active.status = 'OFFLINE';
            active.pairingCode = undefined;
          }
          return;
        }

        // Reconnexion persistante 24/7 tant que le bot n'est pas stoppé volontairement par l'utilisateur
        if (botRecord && botRecord.status !== 'STOPPED') {
          const attempts = (active?.reconnectAttempts || 0) + 1;
          // Délais progressifs (3s, 5s, 10s, 15s) puis retry continu toutes les 25s
          const delay = attempts === 1 ? 3000 : attempts === 2 ? 5000 : attempts === 3 ? 10000 : attempts === 4 ? 15000 : 25000;

          this.log(instanceId, 'info', `Reconnexion WhatsApp automatique (#${attempts}) dans ${Math.round(delay / 1000)}s...`);

          db.updateBot(instanceId, {
            status: 'CONNECTING',
            stats: {
              ...botRecord.stats,
              reconnectAttempts: attempts,
            },
          });

          if (active) {
            active.reconnectAttempts = attempts;
            if (active.reconnectTimeout) clearTimeout(active.reconnectTimeout);
            active.reconnectTimeout = setTimeout(() => {
              this.startInstance(instanceId).catch(err => {
                this.log(instanceId, 'warn', `Tentative reconnexion (#${attempts}) : ${err.message}`);
              });
            }, delay);
          }
        } else {
          db.updateBot(instanceId, { status: 'OFFLINE', lastError: undefined });
          if (active) active.status = 'OFFLINE';
        }
      }
    });
  }

  /**
   * Gestionnaire des messages et exécution des commandes JARVIS Bot v2 en contexte isolé
   */
  private bindMessageHandlers(instanceId: string, sock: any) {
    const stats = { totalCommands: 0, startTime: Date.now() };
    const afkStore = new Map();

    sock.ev.on('messages.upsert', async (m: any) => {
      try {
        if (m.type !== 'notify') return;

        const botRecord = db.getBotById(instanceId);
        const prefix = botRecord?.config.prefix || '.';
        sock._jarvisPrefix = prefix;

        // Charger et exécuter la purge tgl et le gestionnaire officiel J.A.R.V.I.S
        try {
          const { handleMessage, purgeMutedBatch } = await import('../../lib/messageHandler.js');
          await purgeMutedBatch(sock, m.messages).catch(() => {});

          for (const msg of m.messages) {
            if (!msg.message) continue;

            const text =
              msg.message.conversation ||
              msg.message.extendedTextMessage?.text ||
              msg.message.imageMessage?.caption ||
              msg.message.videoMessage?.caption ||
              '';

            if (text) {
              this.log(instanceId, 'info', `Message reçu: ${text.slice(0, 60)}`);
            }

            // Incrémenter les stats du bot
            if (botRecord) {
              db.updateBot(instanceId, {
                stats: {
                  ...botRecord.stats,
                  messagesHandled: (botRecord.stats?.messagesHandled || 0) + 1,
                  lastActivityAt: new Date().toISOString(),
                },
              });
            }

            // Traitement complet par J.A.R.V.I.S Bot v2
            await handleMessage(sock, msg, stats, afkStore, {
              prefix,
              instanceId,
              sessionBotNumber: botRecord?.phoneNumber ? botRecord.phoneNumber.replace(/\D/g, '') : '',
              isSecondaryBot: false,
              sessionManager: {
                createBotInstance: () => {},
                getBotInstance: () => null,
                isOnCooldown: () => false,
                getCooldownRemaining: () => 0,
                sessionExists: () => true,
              },
            });
          }
        } catch (botErr: any) {
          console.error('[JARVIS Engine] Message handling error:', botErr.message);
        }
      } catch (err: any) {
        this.log(instanceId, 'error', `Erreur traitement message: ${err.message}`);
      }
    });

    // ── Événements de groupe : Bienvenue, Au revoir, Anti-Purge ──
    sock.ev.on('group-participants.update', async ({ id, participants, action }: any) => {
      try {
        const { getGroupMeta, invalidateGroupCache } = await import('../../lib/groupConfig.js');
        const meta = await getGroupMeta(sock, id).catch(() => null);
        const { getGroupConfig } = await import('../../lib/groupConfig.js');
        const conf = getGroupConfig(id);

        for (const jid of participants) {
          const num = jid.replace(/\D/g, '');
          if (action === 'add' && conf.welcome) {
            const welcomeMsg = conf.welcomeMsg ||
              `╭━━━━━━━━━━━━━━━━━━━━━━╮\n┃  👋 *BIENVENUE !* 👋   ┃\n╰━━━━━━━━━━━━━━━━━━━━━━╯\n\nBienvenue @${num} dans *${meta?.subject || 'ce groupe'}* !\n📜 Lisez les règles : *.rules*`;
            await sock.sendMessage(id, { text: welcomeMsg, mentions: [jid] });
          }
          if (action === 'remove' && conf.goodbye) {
            const goodbyeMsg = conf.goodbyeMsg || `👋 @${num} a quitté le groupe. Au revoir !`;
            await sock.sendMessage(id, { text: goodbyeMsg, mentions: [jid] });
          }
        }
        invalidateGroupCache(id);
      } catch (err: any) {
        console.error('[JARVIS Engine] group-participants error:', err.message);
      }
    });

    // ── Anti-Suppression (messages révoqués) ──
    sock.ev.on('messages.update', async (updates: any) => {
      try {
        const { isAntiSuppressionEnabled, getCachedMessage, removeCachedMessage } = await import('../../lib/antiSuppressionManager.js');
        for (const update of updates) {
          const msgKey = update.key;
          const groupId = msgKey?.remoteJid;
          if (!groupId || !groupId.endsWith('@g.us')) continue;

          const isDelete =
            update.update?.message?.protocolMessage?.type === 0 ||
            update.update?.message?.protocolMessage?.type === 'REVOKE' ||
            update.update?.message?.protocolMessage?.key?.id;
          if (!isDelete) continue;
          if (!isAntiSuppressionEnabled(groupId)) continue;

          const deletedMsgId = update.update?.message?.protocolMessage?.key?.id || msgKey?.id;
          if (!deletedMsgId) continue;

          const cached = getCachedMessage(deletedMsgId);
          if (!cached) continue;
          removeCachedMessage(deletedMsgId);

          const senderDisplay = cached.pushName || cached.sender || 'Inconnu';
          if (cached.text) {
            await sock.sendMessage(groupId, {
              text: `🗑️ *MESSAGE SUPPRIMÉ*\n👤 *De:* ${senderDisplay}\n\n💬 *Message:*\n${cached.text}`
            });
          }
        }
      } catch (err: any) {
        console.error('[JARVIS Engine] anti-delete error:', err.message);
      }
    });
  }

  /**
   * Arrêt propre d'une instance
   */
  public async stopInstance(instanceId: string): Promise<void> {
    const session = this.activeSessions.get(instanceId);
    if (session) {
      if (session.reconnectTimeout) {
        clearTimeout(session.reconnectTimeout);
      }
      if (session.keepAliveTimer) {
        clearInterval(session.keepAliveTimer);
      }
      try {
        if (session.sock) {
          session.sock.end(new Error('Arrêt demandé par l\'utilisateur'));
        }
      } catch (e) {}
      this.activeSessions.delete(instanceId);
    }
    db.updateBot(instanceId, { status: 'STOPPED' });
    this.log(instanceId, 'info', 'Instance de bot arrêtée proprement.');
  }

  /**
   * Restauration automatique de toutes les sessions actives au démarrage du serveur
   */
  public async restoreAllSessions(): Promise<void> {
    const allBots = db.getAllBots();
    for (const b of allBots) {
      const sessionDir = this.getSessionPath(b.id);
      const credsFile = path.join(sessionDir, 'creds.json');
      if (fs.existsSync(credsFile)) {
        try {
          const creds = JSON.parse(fs.readFileSync(credsFile, 'utf8'));
          if (creds.registered) {
            this.log(b.id, 'info', `Restauration automatique du bot (+${b.phoneNumber || 'connecté'})...`);
            this.startInstance(b.id).catch(err => {
              this.log(b.id, 'warn', `Échec restauration automatique bot ${b.id}: ${err.message}`);
            });
          }
        } catch (e) {}
      }
    }
  }

  /**
   * Suppression complète et sécurisée d'une session
   */
  public async destroySession(instanceId: string): Promise<void> {
    await this.stopInstance(instanceId);
    const sessionDir = this.getSessionPath(instanceId);
    if (fs.existsSync(sessionDir)) {
      try {
        fs.rmSync(sessionDir, { recursive: true, force: true });
        this.log(instanceId, 'info', 'Fichiers d\'authentification WhatsApp purgés de manière sécurisée.');
      } catch (err: any) {
        this.log(instanceId, 'error', `Erreur purge session: ${err.message}`);
      }
    }
    db.updateBot(instanceId, {
      status: 'OFFLINE',
      phoneNumber: undefined,
      lastError: undefined,
    });
  }

  /**
   * Simulateur de commandes pour tester depuis le dashboard web
   */
  public async simulateCommand(instanceId: string, commandText: string): Promise<{ reply: string; success: boolean }> {
    const botRecord = db.getBotById(instanceId);
    if (!botRecord) throw new Error('Instance introuvable.');

    const prefix = botRecord.config.prefix || '.';
    const text = commandText.startsWith(prefix) ? commandText : `${prefix}${commandText}`;
    const trimmed = text.slice(prefix.length).trim();
    const args = trimmed.split(/\s+/);
    const commandName = args.shift()?.toLowerCase() || '';

    const cmd = builtInCommands.find(
      c => c.name === commandName || c.aliases?.includes(commandName)
    );

    if (!cmd) {
      try {
        const { loadCommand } = await import('../../lib/messageHandler.js');
        const dynCmd = await loadCommand(commandName);
        if (typeof dynCmd === 'function') {
          let capturedReply = '';
          const mockSock = {
            sendMessage: async (_to: string, content: any) => {
              if (typeof content === 'string') capturedReply = content;
              else if (content.text) capturedReply = content.text;
              else if (content.caption) capturedReply = content.caption;
              return { key: { id: 'SIM_' + Date.now() } };
            },
            sendPresenceUpdate: async () => {},
          };
          const mockMsg = {
            key: { remoteJid: 'simulation_user@s.whatsapp.net', fromMe: true, id: 'SIM_' + Date.now() },
            message: { conversation: text },
            pushName: 'Utilisateur Simulation',
          };
          await dynCmd(mockSock, 'simulation_user@s.whatsapp.net', args, mockMsg);
          return {
            reply: capturedReply || `Commande \`${prefix}${commandName}\` exécutée avec succès.`,
            success: true,
          };
        }
      } catch (dynErr: any) {
        return {
          reply: `Erreur commande: ${dynErr.message}`,
          success: false,
        };
      }

      return {
        reply: `❌ Commande inconnue \`${prefix}${commandName}\`. Tapez \`${prefix}help\` pour la liste.`,
        success: false,
      };
    }

    const enabledCommands = botRecord.config.enabledCommands || [];
    if (!enabledCommands.includes(cmd.name)) {
      return {
        reply: `⚠️ La commande \`${prefix}${cmd.name}\` est actuellement désactivée dans vos paramètres.`,
        success: false,
      };
    }

    let capturedReply = '';
    const ctx: CommandContext = {
      from: 'simulation_user@s.whatsapp.net',
      sender: 'simulation_user@s.whatsapp.net',
      body: text,
      command: commandName,
      args,
      isGroup: false,
      isOwner: true,
      botConfig: botRecord.config,
      reply: async (msgText: string) => {
        capturedReply = msgText;
      },
      logger: (level, m, d) => this.log(instanceId, level, m, d),
    };

    try {
      await cmd.execute(ctx);
      db.updateBot(instanceId, {
        stats: {
          ...botRecord.stats,
          commandsExecuted: (botRecord.stats?.commandsExecuted || 0) + 1,
          messagesHandled: (botRecord.stats?.messagesHandled || 0) + 1,
          lastActivityAt: new Date().toISOString(),
        },
      });
      return {
        reply: capturedReply || 'Commande exécutée sans retour texte.',
        success: true,
      };
    } catch (err: any) {
      return {
        reply: `Erreur lors de l'exécution: ${err.message}`,
        success: false,
      };
    }
  }
}

export const jarvisEngine = new JarvisEngineManager();
