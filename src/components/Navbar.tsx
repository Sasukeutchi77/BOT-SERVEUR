import React from 'react';
import { Bot } from 'lucide-react';

interface NavbarProps {
  status?: string;
  phoneNumber?: string;
  connectedCount?: number;
  onlineBots?: number;
  totalEverConnected?: number;
  prefix?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  status,
  connectedCount = 1,
  onlineBots = 0,
  totalEverConnected = 0,
  prefix = '.',
}) => {
  const isOnline = status === 'ONLINE';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-blue-900/30 bg-[#080B12]/90 backdrop-blur-md">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand avec touche bleu saphir moderne */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-sm shadow-blue-500/10">
            <Bot className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold tracking-tight text-white text-base font-sans">
              JARVIS
            </span>
            <span className="text-xs text-blue-400/90 font-medium font-sans">
              Connect
            </span>
          </div>
        </div>

        {/* Indicateurs en temps réel bien visibles */}
        <div className="flex items-center gap-2.5 text-xs">
          {/* Bots en ligne */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#0C172B] border border-emerald-500/30 text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono font-bold text-emerald-200">{onlineBots}</span>
            <span className="text-emerald-400/80 text-[11px] hidden xs:inline">en ligne</span>
          </div>

          {/* Bots connectés depuis le lancement */}
          {totalEverConnected > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#0A1224] border border-blue-800/40 text-blue-300 text-[11px]">
              <span className="text-slate-400">Total :</span>
              <span className="font-mono font-bold text-blue-200">{totalEverConnected}</span>
            </div>
          )}

          <span className="text-slate-700 hidden sm:inline">·</span>

          {/* Préfixe actif */}
          <div className="hidden xs:flex items-center gap-1 text-slate-400 font-mono text-xs">
            <span className="text-slate-500">Préfixe</span>
            <span className="text-blue-300 font-bold bg-[#0D1527] px-1.5 py-0.5 rounded border border-blue-800/40">
              {prefix}
            </span>
          </div>

          <span className="text-slate-700 hidden sm:inline">·</span>

          {/* Statut du bot actif de l'utilisateur */}
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            <span className="text-slate-400 font-sans text-xs">
              {isOnline ? 'Connecté' : 'Prêt'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
