export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
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

export interface BotInstance {
  id: string;
  userId: string;
  name: string;
  phoneNumber?: string;
  phoneNumberMasked?: string;
  status: 'OFFLINE' | 'PAIRING' | 'CONNECTING' | 'ONLINE' | 'ERROR' | 'STOPPED';
  liveStatus?: string;
  config: BotConfig;
  stats: BotStats;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  hasActiveSession?: boolean;
  hasPairingCode?: boolean;
  hasQrCode?: boolean;
}

export interface BotLog {
  id: string;
  botId: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  details?: string;
  timestamp: string;
}

export interface BotCommand {
  name: string;
  category: string;
  description: string;
  usage: string;
  aliases?: string[];
  isEnabled: boolean;
}

export interface SystemStats {
  totalUsers: number;
  totalBots: number;
  activeBots: number;
  errorBots: number;
  pairingBots: number;
  totalMessages: number;
  totalCommands: number;
}

export interface SystemMetrics {
  platform: string;
  release: string;
  uptimeSeconds: number;
  processUptimeSeconds: number;
  cpuCount: number;
  loadAverage: number[];
  nodeVersion: string;
  memory: {
    totalMB: number;
    usedMB: number;
    freeMB: number;
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
  };
}
