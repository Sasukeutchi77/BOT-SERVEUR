import { Bot, Zap, Users, Radio, ShieldCheck, Server } from 'lucide-react';

interface NavbarProps {
  status?: string;
  phoneNumber?: string;
  connectedCount: number;
  onlineBots: number;
  totalEverConnected: number;
  prefix: string;
  isRemoteConnected?: boolean;
  onOpenServerModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  status,
  phoneNumber,
  connectedCount,
  onlineBots,
  prefix,
  isRemoteConnected,
  onOpenServerModal,
}) => {
  const isOnline = status === 'ONLINE';
  const isPairing = status === 'PAIRING' || status === 'CONNECTING';

  return (
    <header className="w-full border-b border-blue-950/50 bg-[#070A12]/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo & Nom */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/30 border border-blue-400/40">
            <Zap className="w-5 h-5 text-white fill-white/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base tracking-wider text-white">
                JARVIS<span className="text-blue-400">.CLOUD</span>
              </span>
              <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-950/80 border border-blue-800/40 text-blue-300">
                v2.0
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              Hébergement WhatsApp Baileys 24/7
            </p>
          </div>
        </div>

        {/* Compteurs en direct et Statut */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Indicateur de visiteurs */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0D1322] border border-blue-950/80 text-xs text-slate-300">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-mono text-[11px] font-medium text-white">{connectedCount}</span>
            <span className="text-[10px] text-slate-500">en ligne</span>
          </div>

          {/* Indicateur / Bouton Serveur H24 */}
          {onOpenServerModal && (
            <button
              onClick={onOpenServerModal}
              title="Configurer ou voir la liaison au serveur distant H24 (SERVER_URL)"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0D1322] hover:bg-blue-950/40 border border-blue-950/80 hover:border-blue-800/60 text-xs text-slate-300 transition-colors cursor-pointer"
            >
              <Server className="w-3.5 h-3.5 text-blue-400" />
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isRemoteConnected
                    ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                    : 'bg-blue-400'
                }`}
              />
              <span className="text-[10px] text-slate-400 hidden sm:inline">
                {isRemoteConnected ? 'Serveur H24' : 'Liaison Serveur'}
              </span>
            </button>
          )}

          {/* Indicateur de bots actifs */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0D1322] border border-blue-950/80 text-xs text-slate-300">
            <Bot className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-mono text-[11px] font-medium text-white">{onlineBots}</span>
            <span className="text-[10px] text-slate-500 hidden sm:inline">bots actifs</span>
          </div>

          {/* Statut du bot courant */}
          <div className="flex items-center gap-2 pl-2 border-l border-blue-950/60">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0B101D] border border-blue-900/50 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnline
                    ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                    : isPairing
                    ? 'bg-blue-400 animate-pulse'
                    : 'bg-slate-600'
                }`}
              />
              <span className="text-[11px] font-mono text-slate-200">
                {isOnline ? 'Actif' : isPairing ? 'Liaison...' : 'Prêt'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
