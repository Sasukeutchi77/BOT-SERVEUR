import React, { useState } from 'react';
import { BotInstance } from '../types';
import { api } from '../api';
import {
  Smartphone,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Phone,
  CheckCircle2,
  Zap,
  Info,
  AlertTriangle
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

  // Création instantanée d'un nouvel emplacement de numéro (limite stricte 3)
  const handleAddSlot = async () => {
    if (bots.length >= 3) {
      showNotification('Limite atteinte : 3 numéros WhatsApp maximum.');
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
        showNotification(`Emplacement #${slotNum} ajouté. Vous pouvez maintenant lier ce numéro.`);
      }
    } catch (err: any) {
      showNotification(err.message || 'Impossible d\'ajouter un nouveau numéro.');
    } finally {
      setLoading(false);
    }
  };

  // Suppression directe sans window.confirm pour compatibilité 100% mobile et iframe
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
      showNotification('Numéro supprimé avec succès.');
      onBotsUpdated();

      const remaining = bots.filter((b) => b.id !== botId);
      if (remaining.length > 0) {
        onSelectBot(remaining[0]);
      }
    } catch (err: any) {
      showNotification(`Erreur lors de la suppression: ${err.message}`);
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
    <div className="w-full space-y-4">
      {/* Notification in-app */}
      {statusMessage && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* En-tête explicatif multi-numéros */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 sm:p-5 rounded-2xl backdrop-blur-md space-y-3 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 border border-emerald-500/30 shadow-sm">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Numéros WhatsApp Connectés au Bot JARVIS
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                  {bots.length} / 3 numéros max
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                C'est le <strong>même bot JARVIS</strong> qui tourne sur chacun de vos numéros (avec toutes ses commandes).
              </p>
            </div>
          </div>

          {/* Bouton pour ajouter un 2ème ou 3ème numéro */}
          {bots.length < 3 ? (
            <button
              onClick={handleAddSlot}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-emerald-500/20 active:scale-95 self-start sm:self-auto shrink-0"
              title="Ajouter un autre numéro de téléphone pour le bot JARVIS"
            >
              <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
              <span>{bots.length === 1 ? '+ Connecter un 2ème numéro' : '+ Connecter un 3ème numéro'}</span>
            </button>
          ) : (
            <div className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1.5 rounded-xl self-start sm:self-auto flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Limite de 3 numéros atteinte</span>
            </div>
          )}
        </div>

        {/* Note informative */}
        <div className="pt-2 border-t border-slate-800/60 flex items-start gap-2 text-[11px] text-slate-400">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <span>
            Cliquez sur un numéro pour voir son état ou le lier à WhatsApp. Le bot JARVIS répondra de façon autonome sur chaque numéro actif.
          </span>
        </div>
      </div>

      {/* Cartes des 1 à 3 numéros */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {bots.map((b, index) => {
          const isActive = activeBot?.id === b.id;
          const isOnline = b.status === 'ONLINE';
          const isPairing = b.status === 'PAIRING';
          const slotLabel = index === 0 ? 'Numéro #1 (Principal)' : `Numéro #${index + 1}`;
          const isPendingDelete = confirmDeleteId === b.id;

          return (
            <div
              key={b.id}
              onClick={() => {
                if (!isActive && !isPendingDelete) {
                  onSelectBot(b);
                }
              }}
              className={`group relative p-4 rounded-2xl border transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900/95 border-emerald-500/60 shadow-lg ring-2 ring-emerald-500/30'
                  : 'bg-slate-950/60 border-slate-800 hover:bg-slate-900/50 hover:border-slate-700'
              }`}
            >
              {/* En-tête de carte : Slot et bouton supprimer */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${isActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {slotLabel}
                    </span>
                    {isActive && (
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-sans">
                        Actif
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-white mt-1 font-sans truncate">
                    {b.name}
                  </h4>
                </div>

                {/* Bouton de suppression in-app sans window.confirm */}
                {bots.length > 1 && (
                  <div onClick={(e) => e.stopPropagation()}>
                    {isPendingDelete ? (
                      <div className="flex items-center gap-1 bg-red-950/90 p-1 rounded-xl border border-red-500/50 animate-in fade-in">
                        <button
                          onClick={() => executeDelete(b.id)}
                          disabled={loading}
                          className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] rounded-lg shadow-sm"
                        >
                          Supprimer
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="p-1 text-slate-400 hover:text-white"
                          title="Annuler"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(b.id);
                        }}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-xl transition-all"
                        title="Supprimer ce numéro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Statut & Numéro WhatsApp */}
              <div className="mt-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isOnline
                        ? 'bg-emerald-400 animate-pulse'
                        : isPairing
                        ? 'bg-amber-400 animate-ping'
                        : 'bg-slate-600'
                    }`}
                  />
                  <span className={`text-[11px] font-mono font-semibold ${isOnline ? 'text-emerald-400' : isPairing ? 'text-amber-400' : 'text-slate-400'}`}>
                    {isOnline ? 'En ligne (JARVIS actif)' : isPairing ? 'Jumelage en cours...' : 'Non connecté'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
                  <div className="flex items-center gap-1 truncate">
                    <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate">{b.phoneNumberMasked || b.phoneNumber || 'Non associé'}</span>
                  </div>
                  <span className="font-bold ml-1 text-emerald-400">
                    {b.config?.prefix || '.'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Barre d'état du numéro actif avec option de renommage ET bouton de suppression explicite */}
      {activeBot && (
        <div className="px-4 py-3 bg-slate-950/50 border border-slate-800/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-slate-400 text-xs">Numéro sélectionné :</span>
            {isEditingName ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={editingNameValue}
                  onChange={(e) => setEditingNameValue(e.target.value)}
                  className="px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-emerald-500 font-sans"
                  autoFocus
                />
                <button onClick={handleSaveName} className="p-1 text-emerald-400 hover:text-emerald-300">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setIsEditingName(false)} className="p-1 text-slate-500 hover:text-slate-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 font-bold text-white">
                <span>{activeBot.name}</span>
                <button
                  onClick={() => {
                    setEditingNameValue(activeBot.name);
                    setIsEditingName(true);
                  }}
                  className="text-slate-500 hover:text-slate-300 p-0.5"
                  title="Renommer ce numéro"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-emerald-400 font-mono text-[11px]">
              ✓ Même bot JARVIS v2
            </span>

            {/* Bouton direct de suppression pour le numéro actif s'il y a plus d'1 numéro */}
            {bots.length > 1 && (
              confirmDeleteId === activeBot.id ? (
                <div className="flex items-center gap-1 bg-red-950/90 px-2 py-1 rounded-lg border border-red-500/50">
                  <span className="text-[10px] text-red-200">Supprimer ?</span>
                  <button
                    onClick={() => executeDelete(activeBot.id)}
                    disabled={loading}
                    className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] rounded"
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
                  onClick={() => setConfirmDeleteId(activeBot.id)}
                  className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 bg-red-950/30 hover:bg-red-950/60 border border-red-900/40 px-2.5 py-1 rounded-lg transition-all"
                  title="Supprimer ce numéro"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Supprimer ce numéro</span>
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};
