import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
  isSuspended: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BotConfig {
  botName: string;
  prefix: string;
  autoRead: boolean;
  reactToStatus: boolean;
  antiDelete: boolean;
  antiSpam: boolean;
  welcomeMessage: string;
  enabledCommands: string[];
}

export interface BotStats {
  messagesHandled: number;
  commandsExecuted: number;
  lastConnectedAt?: string;
  lastActivityAt?: string;
  reconnectAttempts: number;
}

export interface BotInstanceRecord {
  id: string;
  userId: string;
  phoneNumber?: string;
  name: string;
  status: 'OFFLINE' | 'PAIRING' | 'CONNECTING' | 'ONLINE' | 'ERROR' | 'STOPPED';
  config: BotConfig;
  stats: BotStats;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BotLog {
  id: string;
  botId: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  details?: string;
  timestamp: string;
}

export interface PlatformMetrics {
  totalBotsEverConnected: number;
  connectedBotIds: string[];
  totalConnectionsEstablished: number;
  lastConnectionAt?: string;
}

interface DatabaseSchema {
  version: number;
  users: User[];
  bots: BotInstanceRecord[];
  logs: BotLog[];
  metrics?: PlatformMetrics;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

class DatabaseService {
  private data: DatabaseSchema = {
    version: 1,
    users: [],
    bots: [],
    logs: [],
    metrics: {
      totalBotsEverConnected: 0,
      connectedBotIds: [],
      totalConnectionsEstablished: 0,
    },
  };

  private isLoaded = false;

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        if (!this.data.users) this.data.users = [];
        if (!this.data.bots) this.data.bots = [];
        if (!this.data.logs) this.data.logs = [];
      } else {
        this.save();
      }

      // Initialiser et synchroniser les métriques réelles de la plateforme
      if (!this.data.metrics) {
        this.data.metrics = {
          totalBotsEverConnected: 0,
          connectedBotIds: [],
          totalConnectionsEstablished: 0,
        };
      }
      if (!Array.isArray(this.data.metrics.connectedBotIds)) {
        this.data.metrics.connectedBotIds = [];
      }

      // Scanner l'historique complet pour comptabiliser tous les bots qui ont été connectés depuis le lancement
      const historicallyConnected = new Set<string>(this.data.metrics.connectedBotIds);

      // 1. Tous les bots existants avec un statut ONLINE ou une date lastConnectedAt ou des messages traités
      for (const b of this.data.bots) {
        if (b.status === 'ONLINE' || b.stats?.lastConnectedAt || (b.stats?.messagesHandled && b.stats.messagesHandled > 0)) {
          historicallyConnected.add(b.id);
        }
      }

      // 2. Tous les dossiers de session enregistrés sur le disque
      try {
        const sessionsDir = path.join(DATA_DIR, 'sessions');
        if (fs.existsSync(sessionsDir)) {
          const dirs = fs.readdirSync(sessionsDir);
          for (const d of dirs) {
            const credsP = path.join(sessionsDir, d, 'creds.json');
            if (fs.existsSync(credsP)) {
              historicallyConnected.add(d);
            }
          }
        }
      } catch (e) {}

      // 3. Tous les bots mentionnés dans les logs de connexion
      for (const log of this.data.logs) {
        if (log.botId && log.message && (
          log.message.includes('Connexion') ||
          log.message.includes('connecté') ||
          log.message.includes('Connecté')
        )) {
          historicallyConnected.add(log.botId);
        }
      }

      this.data.metrics.connectedBotIds = Array.from(historicallyConnected);
      this.data.metrics.totalBotsEverConnected = Math.max(
        this.data.metrics.connectedBotIds.length,
        this.data.metrics.totalBotsEverConnected || 0
      );

      this.save();
      this.isLoaded = true;
      this.seedDefaultAdmin();
    } catch (err) {
      console.error('[DB] Failed to initialize database file:', err);
      this.isLoaded = true;
    }
  }

  private save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.error('[DB] Failed to persist database:', err);
    }
  }

  private async seedDefaultAdmin() {
    // Create initial admin if none exists
    const adminExists = this.data.users.some(u => u.role === 'admin');
    if (!adminExists) {
      const email = process.env.ADMIN_EMAIL || 'admin@jarviscloud.local';
      const password = process.env.ADMIN_PASSWORD || 'JarvisCloud2026!';
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      const adminUser: User = {
        id: 'usr_admin_' + Date.now().toString(36),
        email,
        passwordHash: hash,
        role: 'admin',
        isSuspended: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.data.users.push(adminUser);
      this.save();
      console.log(`[DB] Default administrator created: ${email}`);
    }
  }

  // --- User Operations ---
  public getUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public createUser(user: Omit<User, 'createdAt' | 'updatedAt'>): User {
    const newUser: User = {
      ...user,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  public updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): User | undefined {
    const user = this.getUserById(id);
    if (!user) return undefined;
    Object.assign(user, updates, { updatedAt: new Date().toISOString() });
    this.save();
    return user;
  }

  public getAllUsers(): Omit<User, 'passwordHash'>[] {
    return this.data.users.map(({ passwordHash, ...rest }) => rest);
  }

  public deleteUser(id: string): boolean {
    const index = this.data.users.findIndex(u => u.id === id);
    if (index === -1) return false;
    this.data.users.splice(index, 1);
    this.save();
    return true;
  }

  // --- Bot Operations ---
  public getBotById(id: string): BotInstanceRecord | undefined {
    return this.data.bots.find(b => b.id === id);
  }

  public getBotsByUserId(userId: string): BotInstanceRecord[] {
    return this.data.bots.filter(b => b.userId === userId);
  }

  public getAllBots(): BotInstanceRecord[] {
    return this.data.bots;
  }

  public createBot(record: Omit<BotInstanceRecord, 'createdAt' | 'updatedAt'>): BotInstanceRecord {
    const newBot: BotInstanceRecord = {
      ...record,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.bots.push(newBot);
    this.save();
    return newBot;
  }

  public updateBot(id: string, updates: Partial<Omit<BotInstanceRecord, 'id' | 'userId' | 'createdAt'>>): BotInstanceRecord | undefined {
    const bot = this.getBotById(id);
    if (!bot) return undefined;
    Object.assign(bot, updates, { updatedAt: new Date().toISOString() });
    this.save();
    return bot;
  }

  public deleteBot(id: string): boolean {
    const index = this.data.bots.findIndex(b => b.id === id);
    if (index === -1) return false;
    this.data.bots.splice(index, 1);
    this.data.logs = this.data.logs.filter(l => l.botId !== id);
    this.save();
    return true;
  }

  // --- Log Operations ---
  public addLog(botId: string, level: BotLog['level'], message: string, details?: string): BotLog {
    const log: BotLog = {
      id: 'log_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      botId,
      level,
      message,
      details,
      timestamp: new Date().toISOString(),
    };
    this.data.logs.push(log);
    // Keep max 200 logs per bot
    const botLogs = this.data.logs.filter(l => l.botId === botId);
    if (botLogs.length > 200) {
      const oldestId = botLogs[0].id;
      this.data.logs = this.data.logs.filter(l => l.id !== oldestId);
    }
    this.save();
    return log;
  }

  public getLogs(botId: string, limit = 100): BotLog[] {
    return this.data.logs
      .filter(l => l.botId === botId)
      .slice(-limit)
      .reverse();
  }

  public clearLogs(botId: string): void {
    this.data.logs = this.data.logs.filter(l => l.botId !== botId);
    this.save();
  }

  // --- Stats & Metrics ---
  public recordBotConnected(botId: string): void {
    if (!this.data.metrics) {
      this.data.metrics = {
        totalBotsEverConnected: 0,
        connectedBotIds: [],
        totalConnectionsEstablished: 0,
      };
    }
    if (!Array.isArray(this.data.metrics.connectedBotIds)) {
      this.data.metrics.connectedBotIds = [];
    }
    if (!this.data.metrics.connectedBotIds.includes(botId)) {
      this.data.metrics.connectedBotIds.push(botId);
    }
    this.data.metrics.totalConnectionsEstablished = (this.data.metrics.totalConnectionsEstablished || 0) + 1;
    this.data.metrics.lastConnectionAt = new Date().toISOString();
    this.data.metrics.totalBotsEverConnected = Math.max(
      this.data.metrics.connectedBotIds.length,
      this.data.metrics.totalBotsEverConnected || 0
    );
    this.save();
  }

  public getTotalBotsEverConnected(): number {
    const historicalSet = new Set<string>(this.data.metrics?.connectedBotIds || []);
    for (const b of this.data.bots) {
      if (b.status === 'ONLINE' || b.stats?.lastConnectedAt || (b.stats?.messagesHandled && b.stats.messagesHandled > 0)) {
        historicalSet.add(b.id);
      }
    }
    return Math.max(
      historicalSet.size,
      this.data.metrics?.totalBotsEverConnected || 0,
      1
    );
  }

  public getStats() {
    const totalUsers = this.data.users.length;
    const totalBots = this.data.bots.length;
    const activeBots = this.data.bots.filter(b => b.status === 'ONLINE').length;
    const errorBots = this.data.bots.filter(b => b.status === 'ERROR').length;
    const pairingBots = this.data.bots.filter(b => b.status === 'PAIRING' || b.status === 'CONNECTING').length;
    const totalMessages = this.data.bots.reduce((acc, b) => acc + (b.stats?.messagesHandled || 0), 0);
    const totalCommands = this.data.bots.reduce((acc, b) => acc + (b.stats?.commandsExecuted || 0), 0);
    const totalBotsEverConnected = this.getTotalBotsEverConnected();

    return {
      totalUsers,
      totalBots,
      activeBots,
      totalBotsEverConnected,
      errorBots,
      pairingBots,
      totalMessages,
      totalCommands,
    };
  }
}

export const db = new DatabaseService();
