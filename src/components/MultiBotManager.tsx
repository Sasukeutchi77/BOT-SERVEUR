import React, { useState } from 'react';
import { BotInstance } from '../types';
import { api } from '../api';
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  CheckCircle2,
} from 'lucide-react';

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
  const [loading, setLoading] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleAddSlot = async () => {
    if (bots.length >= 3) {
      showNotification('Limite de 3 numéros atteinte.');
      return;
    }

    setLoading(true);
    try {
      const slotNum = bots.length + 1;
      const defaultName = slotNum === 2 ? 'Numéro WhatsApp #2' : 'Numéro WhatsApp #3';
      const res = await api.createBot(defaultName);
      if (res.success && res.bot) {
        onBotsUpdated();
        onSelectBot(res.bot);
        showNotification(`Emplacement #${slotNum} ajouté.`);
      }
    } catch (err: any) {
      showNotification(err.message || 'Erreur lors de l\'ajout.');
    } finally {
      setLoading(false);
    }
  };

  const executeDelete = async (botId: string) => {
    if (bots.length <= 1) {
      showNotification('Vous devez conserver au moins un numéro.');
      setConfirmDeleteId(null);
      return;
    }

    setLoading(true);
    try {
      await api.deleteBot(botId);
      setConfirmDeleteId(null);
      showNotification('Numéro supprimé.');
      onBotsUpdated();

      const remaining = bots.filter((b) => b.id !== botId);
      if (remaining.length > 0) {
        onSelectBot(remaining[0]);
      }
    } catch (err: any) {
      showNotification(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!activeBot || !editingNameValue.trim()) return;
    try {
      await api.updateBotSettings(activeBot.id, { name: editingNameValue.trim() });
      setIsEditingName(false);
      onBotsUpdated();
      showNotification('Nom mis à jour.');
    } catch (err: any) {
      showNotification(`Erreur: ${err.message}`);
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* Toast de confirmation avec nuance bleue */}
      {statusMessage && (
        <div className="py-2 px-3 bg-[#0D1527] border border-blue-500/30 rounded-xl text-xs text-blue-200 flex items-center gap-2 animate-in fade-in shadow-sm">
          <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Titre & Gestionnaire de numéros en onglets sobres avec nuances bleues */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200">Comptes WhatsApp</span>
          <span className="text-slate-600">·</span>
          <span className="text-blue-300 font-mono text-[11px] bg-blue-950/40 border border-blue-900/30 px-1.5 py-0.2 rounded">{bots.length}/3 numéros</span>
        </div>

        {bots.length < 3 && (
          <button
            onClick={handleAddSlot}
            disabled={loading}
            className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors text-xs font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter un numéro</span>
          </button>
        )}
      </div>

      {/* Onglets segmented controls aux nuances saphir */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {bots.map((b) => {
          const isActive = activeBot?.id === b.id;
          const isOnline = b.status === 'ONLINE';
          const isPairing = b.status === 'PAIRING';
          const isPendingDelete = confirmDeleteId === b.id;

          return (
            <div
              key={b.id}
              onClick={() => {
                if (!isActive && !isPendingDelete) {
                  onSelectBot(b);
                }
              }}
              className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                isActive
                  ? 'bg-[#0E1629] border-blue-500/50 shadow-md shadow-blue-500/10'
                  : 'bg-[#0A0E1A]/80 border-blue-950/60 hover:bg-[#0D1426]/60 hover:border-blue-900/50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      isOnline ? 'bg-emerald-400' : isPairing ? 'bg-amber-400' : 'bg-slate-600'
                    }`} />
                    <span className={`text-xs font-semibold truncate ${isActive ? 'text-blue-100' : 'text-slate-300'}`}>
                      {b.name}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 mt-1 truncate">
                    {b.phoneNumberMasked || b.phoneNumber || 'Non connecté'}
                  </div>
                </div>

                {/* Suppression sobre sans alert/confirm */}
                {bots.length > 1 && (
                  <div onClick={(e) => e.stopPropagation()}>
                    {isPendingDelete ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => executeDelete(b.id)}
                          className="px-2 py-0.5 bg-red-600/90 hover:bg-red-600 text-white text-[10px] rounded font-medium"
                        >
                          Oui
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-1.5 py-0.5 bg-slate-800 text-slate-300 text-[10px] rounded"
                        >
                          Non
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(b.id);
                        }}
                        className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                        title="Supprimer ce numéro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Barre de détails du numéro actif avec nuances bleues */}
      {activeBot && (
        <div className="px-3 py-2 bg-[#0D1424]/70 border border-blue-900/30 rounded-xl flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">Numéro actif :</span>
            {isEditingName ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={editingNameValue}
                  onChange={(e) => setEditingNameValue(e.target.value)}
                  className="px-2 py-0.5 bg-[#080B12] border border-blue-500/50 rounded text-xs text-blue-100 focus:outline-none"
                  autoFocus
                />
                <button onClick={handleSaveName} className="text-blue-400 hover:text-blue-300">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setIsEditingName(false)} className="text-slate-500 hover:text-slate-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 font-medium text-slate-200">
                <span>{activeBot.name}</span>
                <button
                  onClick={() => {
                    setEditingNameValue(activeBot.name);
                    setIsEditingName(true);
                  }}
                  className="text-slate-500 hover:text-blue-300 p-0.5 transition-colors"
                  title="Renommer"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <span>Préfixe: <strong className="text-blue-300 font-mono bg-blue-950/60 px-1.5 py-0.2 rounded border border-blue-800/40">{activeBot.config?.prefix || '.'}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
};
