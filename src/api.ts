import { User, BotInstance, BotLog, BotCommand, SystemStats, SystemMetrics } from './types';

const TOKEN_KEY = 'jarvis_cloud_token';

export const api = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },

  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  },

  async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401 && !endpoint.includes('/api/auth/login')) {
        this.clearToken();
      }
      throw new Error(data.error || `Erreur HTTP ${response.status}`);
    }

    return data;
  },

  // Session instantanée sans inscription
  async initGuestSession() {
    const data = await this.request<{ success: boolean; token: string; user: User; bot: BotInstance }>('/api/auth/guest', {
      method: 'POST',
    });
    this.setToken(data.token);
    return data;
  },

  // Nombre d'utilisateurs connectés en temps réel
  async getConnectedStats() {
    return this.request<{
      success: boolean;
      totalSessions: number;
      activeSessions: number;
      connectedCount: number;
      timestamp: string;
    }>('/api/stats/connected');
  },

  // Auth
  async register(email: string, password: string) {
    const data = await this.request<{ success: boolean; token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  },

  async login(email: string, password: string) {
    const data = await this.request<{ success: boolean; token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  },

  async getMe() {
    return this.request<{ success: boolean; user: User }>('/api/auth/me');
  },

  logout() {
    this.clearToken();
  },

  // Bots
  async getBots() {
    return this.request<{ success: boolean; bots: BotInstance[] }>('/api/bots');
  },

  async createBot(name?: string) {
    return this.request<{ success: boolean; bot: BotInstance }>('/api/bots', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  async getBot(id: string) {
    return this.request<{ success: boolean; bot: BotInstance }>(`/api/bots/${id}`);
  },

  async requestPairingCode(id: string, phoneNumber: string) {
    return this.request<{ success: boolean; pairingCode: string; instructions: string[] }>(`/api/bots/${id}/pairing`, {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    });
  },

  async requestQrCode(id: string) {
    return this.request<{ success: boolean; qrCodeDataUrl: string }>(`/api/bots/${id}/qr`, {
      method: 'POST',
    });
  },

  async getBotStatus(id: string) {
    return this.request<{
      success: boolean;
      status: string;
      pairingCode?: string;
      qrCodeDataUrl?: string;
      phoneNumberMasked?: string;
      stats?: BotInstance['stats'];
      lastError?: string;
    }>(`/api/bots/${id}/status`);
  },

  async startBot(id: string) {
    return this.request<{ success: boolean; message: string }>(`/api/bots/${id}/start`, {
      method: 'POST',
    });
  },

  async stopBot(id: string) {
    return this.request<{ success: boolean; message: string }>(`/api/bots/${id}/stop`, {
      method: 'POST',
    });
  },

  async disconnectBot(id: string) {
    return this.request<{ success: boolean; message: string }>(`/api/bots/${id}/disconnect`, {
      method: 'POST',
    });
  },

  async deleteBot(id: string) {
    return this.request<{ success: boolean; message: string }>(`/api/bots/${id}`, {
      method: 'DELETE',
    });
  },

  async updateBotSettings(id: string, payload: { name?: string; config?: Partial<BotInstance['config']> }) {
    return this.request<{ success: boolean; config: BotInstance['config']; name?: string }>(`/api/bots/${id}/settings`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async getBotLogs(id: string, limit = 100) {
    return this.request<{ success: boolean; logs: BotLog[] }>(`/api/bots/${id}/logs?limit=${limit}`);
  },

  async clearBotLogs(id: string) {
    return this.request<{ success: boolean; message: string }>(`/api/bots/${id}/logs`, {
      method: 'DELETE',
    });
  },

  async getBotCommands(id: string) {
    return this.request<{ success: boolean; prefix: string; commands: BotCommand[] }>(`/api/bots/${id}/commands`);
  },

  async toggleCommand(id: string, commandName: string, enabled: boolean) {
    return this.request<{ success: boolean; commandName: string; isEnabled: boolean }>(`/api/bots/${id}/commands/toggle`, {
      method: 'POST',
      body: JSON.stringify({ commandName, enabled }),
    });
  },

  async simulateCommand(id: string, message: string) {
    return this.request<{ success: boolean; reply: string }>(`/api/bots/${id}/test-message`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },

  // Admin
  async getAdminStats() {
    return this.request<{ success: boolean; stats: SystemStats }>('/api/admin/stats');
  },

  async getAdminUsers() {
    return this.request<{ success: boolean; users: any[] }>('/api/admin/users');
  },

  async toggleUserSuspension(userId: string, isSuspended: boolean) {
    return this.request<{ success: boolean; user: any }>(`/api/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isSuspended }),
    });
  },

  async getAdminBots() {
    return this.request<{ success: boolean; bots: any[] }>('/api/admin/bots');
  },

  async emergencyKillBot(botId: string) {
    return this.request<{ success: boolean; message: string }>(`/api/admin/bots/${botId}/kill`, {
      method: 'POST',
    });
  },

  async getAdminSystem() {
    return this.request<{ success: boolean; system: SystemMetrics }>('/api/admin/system');
  },
};
