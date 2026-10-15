import path from 'path';
import fs from 'fs';
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  proto,
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import { db, BotInstanceRecord } from '../db/database';
import { ActiveBotSession, CommandContext } from './types';
import { builtInCommands } from './commands';
import { sanitizeLogMessage } from '../middleware/sanitizer';

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
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    this.log(instanceId, 'info', `Initialisation du jumelage pour le numéro +${cleanNumber}`);
    db.updateBot(instanceId, {
      status: 'PAIRING',
      phoneNumber: `+${cleanNumber}`,
    });

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    // Pino silent logger pour ne rien fuiter dans la console standard
    const pino = (await import('pino')).default;
    const silentLogger = pino({ level: 'silent' });

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: silentLogger,
      browser: ['JARVIS CLOUD', 'Chrome', '1.0.0'],
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
    sock.ev.on('creds.update', saveCreds);

    // Liaison du gestionnaire de connexion
    this.bindConnectionHandlers(instanceId, sock, saveCreds);

    // Demander le code de jumelage Baileys si non enregistré
    let pairingCode = '';
    if (!sock.authState.creds.registered) {
      // Petite temporisation pour que le socket stabilise la connexion initiale
      await new Promise(r => setTimeout(r, 2000));
      try {
        pairingCode = await sock.requestPairingCode(cleanNumber);
        activeSession.pairingCode = pairingCode;
        this.log(instanceId, 'info', 'Code de jumelage généré avec succès. En attente de saisie dans WhatsApp.');
      } catch (err: any) {
        this.log(instanceId, 'error', `Échec de génération du code de jumelage: ${err.message}`);
        db.updateBot(instanceId, { status: 'ERROR', lastError: err.message });
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
    const { version } = await fetchLatestBaileysVersion();
    const pino = (await import('pino')).default;

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: ['JARVIS CLOUD', 'Chrome', '1.0.0'],
    });

    const activeSession: ActiveBotSession = {
      instanceId,
      userId: botRecord.userId,
      sock,
      status: 'PAIRING',
      reconnectAttempts: 0,
    };
    this.activeSessions.set(instanceId, activeSession);

    sock.ev.on('creds.update', saveCreds);

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
    const { version } = await fetchLatestBaileysVersion();
    const pino = (await import('pino')).default;

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: ['JARVIS CLOUD', 'Chrome', '1.0.0'],
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
        }

        // Lier les écouteurs de messages dès que connecté
        this.bindMessageHandlers(instanceId, sock);
      } else if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const reason = lastDisconnect?.error?.message || 'Connexion interrompue';
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        this.log(instanceId, 'warn', `Connexion interrompue (Code: ${statusCode || 'inconnu'}) : ${reason}`);

        if (statusCode === DisconnectReason.loggedOut) {
          this.log(instanceId, 'error', 'Session WhatsApp déconnectée depuis le téléphone. Suppression des clés.');
          await this.destroySession(instanceId);
          db.updateBot(instanceId, {
            status: 'OFFLINE',
            lastError: 'Session déconnectée depuis WhatsApp',
          });
          return;
        }

        if (shouldReconnect && botRecord && botRecord.status !== 'STOPPED') {
          const attempts = (active?.reconnectAttempts || 0) + 1;
          const maxAttempts = 5;

          if (attempts <= maxAttempts) {
            const delay = Math.min(5000 * Math.pow(2, attempts - 1), 60000);
            this.log(instanceId, 'info', `Tentative de reconnexion automatique ${attempts}/${maxAttempts} dans ${delay / 1000}s...`);

            db.updateBot(instanceId, {
              status: 'CONNECTING',
              stats: {
                ...botRecord.stats,
                reconnectAttempts: attempts,
              },
            });

            if (active) {
              active.reconnectAttempts = attempts;
              active.reconnectTimeout = setTimeout(() => {
                this.startInstance(instanceId).catch(err => {
                  this.log(instanceId, 'error', `Échec reconnexion automatique: ${err.message}`);
                });
              }, delay);
            }
          } else {
            this.log(instanceId, 'error', 'Nombre maximal de tentatives de reconnexion atteint. Instance arrêtée.');
            db.updateBot(instanceId, {
              status: 'ERROR',
              lastError: 'Échec de reconnexion automatique après 5 tentatives.',
            });
            if (active) active.status = 'ERROR';
          }
        } else {
          db.updateBot(instanceId, { status: 'OFFLINE' });
          if (active) active.status = 'OFFLINE';
        }
      }
    });
  }

  /**
   * Gestionnaire des messages et exécution des commandes en contexte isolé
   */
  private bindMessageHandlers(instanceId: string, sock: any) {
    sock.ev.on('messages.upsert', async (m: any) => {
      try {
        if (m.type !== 'notify') return;

        for (const msg of m.messages) {
          if (!msg.message) continue;
          if (msg.key.fromMe && !msg.message.conversation && !msg.message.extendedTextMessage) continue;

          const from = msg.key.remoteJid || '';
          const isGroup = from.endsWith('@g.us');
          const sender = msg.key.participant || from;

          // Extraire le texte du message
          const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            msg.message.videoMessage?.caption ||
            '';

          if (!text) continue;

          const botRecord = db.getBotById(instanceId);
          if (!botRecord) return;

          const prefix = botRecord.config.prefix || '.';

          // Incrémenter les messages traités
          db.updateBot(instanceId, {
            stats: {
              ...botRecord.stats,
              messagesHandled: (botRecord.stats?.messagesHandled || 0) + 1,
              lastActivityAt: new Date().toISOString(),
            },
          });

          // Vérifier si c'est une commande
          if (!text.startsWith(prefix)) continue;

          const trimmed = text.slice(prefix.length).trim();
          const args = trimmed.split(/\s+/);
          const commandName = args.shift()?.toLowerCase() || '';

          if (!commandName) continue;

          // Chercher la commande
          const cmd = builtInCommands.find(
            c => c.name === commandName || c.aliases?.includes(commandName)
          );

          if (!cmd) continue;

          // Vérifier si la commande est activée par cet utilisateur
          const enabledCommands = botRecord.config.enabledCommands || [];
          if (!enabledCommands.includes(cmd.name)) {
            // Commande désactivée par le propriétaire
            continue;
          }

          // Contexte d'exécution strictement isolé
          const reply = async (replyText: string) => {
            await sock.sendMessage(from, { text: replyText }, { quoted: msg });
          };

          const ctx: CommandContext = {
            sock,
            msg,
            from,
            sender,
            body: text,
            command: commandName,
            args,
            isGroup,
            isOwner: msg.key.fromMe || false,
            botConfig: botRecord.config,
            reply,
            logger: (level, m, d) => this.log(instanceId, level, m, d),
          };

          this.log(instanceId, 'info', `Commande reçue : ${prefix}${commandName} de ${sender}`);

          await cmd.execute(ctx);

          // Incrémenter le compteur de commandes exécutées
          db.updateBot(instanceId, {
            stats: {
              ...botRecord.stats,
              commandsExecuted: (botRecord.stats?.commandsExecuted || 0) + 1,
              lastActivityAt: new Date().toISOString(),
            },
          });
        }
      } catch (err: any) {
        this.log(instanceId, 'error', `Erreur traitement message: ${err.message}`);
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
