import type { WASocket, proto } from '@whiskeysockets/baileys';
import { BotConfig } from '../db/database';

export interface CommandContext {
  sock?: WASocket;
  msg?: proto.IWebMessageInfo;
  from: string;
  sender: string;
  body: string;
  command: string;
  args: string[];
  isGroup: boolean;
  isOwner: boolean;
  botConfig: BotConfig;
  reply: (text: string) => Promise<void>;
  logger: (level: 'info' | 'warn' | 'error' | 'success', msg: string, details?: string) => void;
}

export interface CommandDefinition {
  name: string;
  aliases?: string[];
  category: 'Général' | 'Intelligence Artificielle' | 'Utilitaires' | 'Gestion & Groupe' | 'Divertissement';
  description: string;
  usage: string;
  ownerOnly?: boolean;
  groupOnly?: boolean;
  execute: (ctx: CommandContext) => Promise<void>;
}

export interface ActiveBotSession {
  instanceId: string;
  userId: string;
  sock?: WASocket;
  status: 'OFFLINE' | 'PAIRING' | 'CONNECTING' | 'ONLINE' | 'ERROR' | 'STOPPED';
  pairingCode?: string;
  qrCodeDataUrl?: string;
  lastConnectedAt?: string;
  reconnectAttempts: number;
  reconnectTimeout?: NodeJS.Timeout;
  keepAliveTimer?: NodeJS.Timeout;
}
