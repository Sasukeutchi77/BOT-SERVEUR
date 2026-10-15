import React from 'react';
import { Bot, Users } from 'lucide-react';

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
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#090A0F]/90 backdrop-blur-md">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-black font-black shadow-lg shadow-emerald-500/20">
            <Bot className="w-6 h-6 text-black stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-white text-lg font-sans">
                JARVIS <span className="text-emerald-400">CLOUD</span>
              </span>
              <span className="text-[10px] tracking-wider uppercase font-semibold text-emerald-400/90 bg-emerald-950/60 border border-emerald-800/50 px-1.5 py-0.5 rounded">
                v1.0 MD
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Connexion WhatsApp Sans Serveur
            </p>
          </div>
        </div>

        {/* Live Counters & Status */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Nombre d'utilisateurs connectés en temps réel */}
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs"
            title={`${connectedCount} utilisateur(s) en ligne sur la plateforme`}
          >
            <div className="relative flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute" />
              <span className="w-2 h-2 rounded-full bg-emerald-400 relative" />
            </div>
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono font-bold text-xs text-emerald-400">
              {connectedCount}
            </span>
            <span className="text-slate-400 text-[11px] hidden md:inline">
              connecté{connectedCount > 1 ? 's' : ''}
            </span>
          </div>

          {/* Préfixe actif sélectionné */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-xs font-mono"
            title={`Préfixe de commande actif : ${prefix}`}
          >
            <span className="text-slate-400 text-[10px] hidden sm:inline">Préfixe :</span>
            <span className="font-bold text-xs px-1.5 py-0.5 rounded bg-black/50 text-emerald-400 border border-emerald-500/40">
              {prefix}
            </span>
          </div>

          {/* Statut de l'instance courante */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-medium ${
              isOnline
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            <span>{isOnline ? 'EN LIGNE' : 'PRÊT'}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
