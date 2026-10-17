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
  phoneNumber?: string;
  phoneNumberMasked?: string;
  name: string;
  status: 'OFFLINE' | 'PAIRING' | 'CONNECTING' | 'ONLINE' | 'ERROR' | 'STOPPED';
  config: BotConfig;
  stats: BotStats;
  lastError?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  createdAt?: string;
}

export interface PlatformMetrics {
  success: boolean;
  onlineBots?: number;
  totalBotsEverConnected?: number;
  totalSessions?: number;
  activeSessions?: number;
  connectedCount?: number;
  totalMessages?: number;
  uptimeSeconds?: number;
  timestamp?: string;
}
