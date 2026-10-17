import { BotInstance } from './types';

const TOKEN_KEY = 'jarvis_auth_token';

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem(TOKEN_KEY);
    }
  }

  public getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem(TOKEN_KEY);
    }
    return this.token;
  }

  public setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
    }
  }

  public clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  private async request(endpoint: string, options: RequestInit = {}, retries = 3): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let lastErr: any;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const res = await fetch(endpoint, {
          ...options,
          headers,
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || `Erreur (${res.status})`);
        }
        return data;
      } catch (err: any) {
        lastErr = err;
        // Si erreur réseau temporaire (Failed to fetch, network reset)
        if (attempt < retries - 1 && (err.name === 'TypeError' || err.message?.includes('fetch') || err.message?.includes('network'))) {
          await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
          continue;
        }
        throw err;
      }
    }
    throw lastErr;
  }

  public async initGuestSession(): Promise<{ success: boolean; token: string; user: any; bot: BotInstance }> {
    const data = await this.request('/api/auth/guest', { method: 'POST' });
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  public async getBots(): Promise<{ success: boolean; bots: BotInstance[] }> {
    return this.request('/api/bots');
  }

  public async createBot(name?: string): Promise<{ success: boolean; bot: BotInstance }> {
    return this.request('/api/bots', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  public async getBotStatus(botId: string): Promise<{
    success: boolean;
    status: string;
    phoneNumberMasked?: string;
    stats?: any;
    lastError?: string;
    pairingCode?: string;
  }> {
    const res = await this.request(`/api/bots/${botId}`);
    return {
      success: res.success,
      status: res.bot?.liveStatus || res.bot?.status || 'OFFLINE',
      phoneNumberMasked: res.bot?.phoneNumberMasked || res.bot?.phoneNumber,
      stats: res.bot?.stats,
      lastError: res.bot?.lastError,
      pairingCode: res.bot?.pairingCode,
    };
  }

  public async requestPairingCode(botId: string, phoneNumber: string, prefix?: string): Promise<{
    success: boolean;
    pairingCode?: string;
  }> {
    return this.request(`/api/bots/${botId}/pairing`, {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, prefix }),
    });
  }

  public async setBotPrefix(botId: string, prefix: string): Promise<any> {
    try {
      return await this.request(`/api/bots/${botId}/config`, {
        method: 'PATCH',
        body: JSON.stringify({ prefix }),
      });
    } catch {
      return await this.request(`/api/bots/${botId}/prefix`, {
        method: 'POST',
        body: JSON.stringify({ prefix }),
      });
    }
  }

  public async stopBot(botId: string): Promise<any> {
    return this.request(`/api/bots/${botId}/stop`, {
      method: 'POST',
    });
  }

  public async disconnectBot(botId: string): Promise<any> {
    return this.request(`/api/bots/${botId}/disconnect`, {
      method: 'POST',
    });
  }

  public async getConnectedStats(): Promise<{
    success: boolean;
    onlineBots?: number;
    totalBotsEverConnected?: number;
    totalSessions?: number;
    activeSessions?: number;
    connectedCount?: number;
    totalMessages?: number;
  }> {
    return this.request('/api/stats/connected');
  }
}

export const api = new ApiClient();
