import React from 'react';
import { Bot } from 'lucide-react';

interface NavbarProps {
  status?: string;
  phoneNumber?: string;
  connectedCount?: number;
  onlineBots?: number;
  prefix?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ status, connectedCount = 1, prefix = '.' }) => {
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

        {/* Indicateurs sobres avec nuances bleues */}
        <div className="flex items-center gap-3 text-xs">
          {/* Nombre de connectés */}
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="font-mono text-blue-200 font-medium">{connectedCount}</span>
            <span className="text-slate-500 hidden sm:inline">en ligne</span>
          </div>

          <span className="text-slate-700 hidden sm:inline">·</span>

          {/* Préfixe actif */}
          <div className="hidden xs:flex items-center gap-1 text-slate-400 font-mono text-xs">
            <span className="text-slate-500">Préfixe</span>
            <span className="text-blue-300 font-bold bg-[#0D1527] px-1.5 py-0.5 rounded border border-blue-800/40">
              {prefix}
            </span>
          </div>

          <span className="text-slate-700 hidden sm:inline">·</span>

          {/* Statut du bot */}
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
