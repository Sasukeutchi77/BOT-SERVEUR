import React, { useState } from 'react';
import { BotInstance } from '../types';
import { api } from '../api';
import { Plus, Smartphone, CheckCircle2, Loader2 } from 'lucide-react';

interface MultiBotManagerProps {
  bots: BotInstance[];
  activeBot: BotInstance | null;
  onSelectBot: (bot: BotInstance) => void;
  onBotsUpdated: () => void;
}

export const MultiBotManager: React.FC<MultiBotManagerProps> = ({
  bots,
  activeBot,
  onSelectBot,
  onBotsUpdated,
}) => {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAddMore = bots.length < 3;

  const handleCreateSlot = async () => {
    if (!canAddMore || creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await api.createBot(`Assistant WhatsApp #${bots.length + 1}`);
      if (res.success && res.bot) {
        onBotsUpdated();
        onSelectBot(res.bot);
      }
    } catch (e: any) {
      setError(e.message || 'Impossible d\'ajouter un nouvel emplacement.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs px-1">
        <span className="text-slate-400 font-medium">Vos numéros connectés ({bots.length}/3)</span>
        {error && <span className="text-red-400 text-[11px]">{error}</span>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {bots.map((bot, index) => {
          const isSelected = activeBot?.id === bot.id;
          const isOnline = bot.status === 'ONLINE';
          const isPairing = bot.status === 'PAIRING' || bot.status === 'CONNECTING';

          return (
            <button
              key={bot.id}
              type="button"
              onClick={() => onSelectBot(bot)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400/50'
                  : 'bg-[#0B101D] text-slate-300 hover:text-white border border-blue-950/70 hover:border-blue-800/60'
              }`}
            >
              <Smartphone className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
              <div className="text-left">
                <span className="block font-mono text-[11px]">
                  {bot.phoneNumberMasked || bot.phoneNumber || `Numéro #${index + 1}`}
                </span>
              </div>
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnline
                    ? 'bg-emerald-400'
                    : isPairing
                    ? 'bg-blue-400 animate-pulse'
                    : 'bg-slate-600'
                }`}
              />
            </button>
          );
        })}

        {canAddMore && (
          <button
            type="button"
            onClick={handleCreateSlot}
            disabled={creating}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-blue-300 bg-[#080D18]/80 border border-dashed border-blue-950 hover:border-blue-800/80 transition-all disabled:opacity-50"
          >
            {creating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            <span>Ajouter (+{3 - bots.length})</span>
          </button>
        )}
      </div>
    </div>
  );
};
