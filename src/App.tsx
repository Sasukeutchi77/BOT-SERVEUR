import React, { useState, useEffect } from 'react';
import { api } from './api';
import { BotInstance } from './types';
import { Navbar } from './components/Navbar';
import { PairingSection } from './components/PairingSection';
import { CommunitySection } from './components/CommunitySection';
import { MultiBotManager } from './components/MultiBotManager';

export default function App() {
  const [userBots, setUserBots] = useState<BotInstance[]>([]);
  const [activeBot, setActiveBot] = useState<BotInstance | null>(null);
  const [totalSessions, setTotalSessions] = useState<number>(0);
  const [activeSessions, setActiveSessions] = useState<number>(0);
  const [connectedCount, setConnectedCount] = useState<number>(1);

  // Charger la liste des bots de l'utilisateur
  const loadUserBots = async (preferredId?: string) => {
    try {
      const res = await api.getBots();
      if (res.bots && res.bots.length > 0) {
        setUserBots(res.bots);
        if (preferredId) {
          const match = res.bots.find((b) => b.id === preferredId);
          if (match) {
            setActiveBot(match);
            return;
          }
        }
        setActiveBot((prev) => {
          if (prev) {
            const found = res.bots.find((b) => b.id === prev.id);
            return found || res.bots[0];
          }
          return res.bots[0];
        });
      }
    } catch (e) {}
  };

  // Initialisation instantanée de l'instance
  const initSession = async () => {
    try {
      const existingToken = api.getToken();

      if (existingToken) {
        try {
          const res = await api.getBots();
          if (res.bots && res.bots.length > 0) {
            setUserBots(res.bots);
            setActiveBot(res.bots[0]);
            return;
          }
        } catch (e) {
          api.clearToken();
        }
      }

      // Session instantanée libre sans formulaire de connexion
      const guestRes = await api.initGuestSession();
      if (guestRes.bot) {
        setUserBots([guestRes.bot]);
        setActiveBot(guestRes.bot);
      }
    } catch (err) {
      console.error('Erreur initialisation session:', err);
    }
  };

  const refreshBotStatus = async () => {
    if (!activeBot) return;
    try {
      const res = await api.getBotStatus(activeBot.id);
      setActiveBot((prev) => {
        if (!prev) return null;
        const updated = {
          ...prev,
          status: res.status as any,
          phoneNumberMasked: res.phoneNumberMasked,
          stats: res.stats || prev.stats,
          lastError: res.lastError,
        };
        setUserBots((list) => list.map((b) => (b.id === updated.id ? updated : b)));
        return updated;
      });
    } catch (err) {}
  };

  // Suivi en direct du nombre de sessions
  const fetchStats = async () => {
    try {
      const res = await api.getConnectedStats();
      if (res.success) {
        setTotalSessions(res.totalSessions);
        setActiveSessions(res.activeSessions);
        setConnectedCount(res.connectedCount);
      }
    } catch (e) {}
  };

  useEffect(() => {
    initSession();
    fetchStats();

    // Actualisation du compteur toutes les 5 secondes
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#080B12] text-slate-100 flex flex-col font-sans selection:bg-blue-600/30 selection:text-blue-200 relative overflow-hidden">
      {/* Nuance d'ambiance bleue subtile en haut de page */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-80 bg-gradient-to-b from-blue-600/[0.08] via-indigo-600/[0.03] to-transparent pointer-events-none blur-3xl -z-10" />

      {/* Navigation épurée avec nuances bleues saphir */}
      <Navbar
        status={activeBot?.status}
        phoneNumber={activeBot?.phoneNumberMasked || activeBot?.phoneNumber}
        connectedCount={connectedCount}
        onlineBots={activeSessions}
        prefix={activeBot?.config?.prefix || '.'}
      />

      {/* Contenu Principal */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col justify-center space-y-4">
        {/* Bandeau de synthèse du statut des serveurs actifs */}
        <div className="flex items-center justify-between px-3 py-2 bg-[#0D1424]/60 border border-blue-900/30 rounded-xl text-xs text-slate-400 backdrop-blur-sm shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Serveurs actifs :</span>
            <span className="text-blue-300 font-mono font-semibold">{activeSessions} en ligne</span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <span className={`w-1.5 h-1.5 rounded-full ${activeSessions > 0 ? 'bg-emerald-400' : 'bg-blue-400'} animate-pulse`} />
            <span className="text-blue-200/90 font-medium">Serveur opérationnel</span>
          </div>
        </div>

        {/* Gestionnaire Multi-Comptes WhatsApp en onglets saphir sobres */}
        <MultiBotManager
          bots={userBots}
          activeBot={activeBot}
          onSelectBot={(bot) => setActiveBot(bot)}
          onBotsUpdated={() => loadUserBots(activeBot?.id)}
        />

        {/* Module de jumelage et préfixe pour le bot sélectionné */}
        {activeBot && (
          <PairingSection
            key={activeBot.id}
            bot={activeBot}
            onStatusUpdate={refreshBotStatus}
          />
        )}

        {/* Liens communautaires avec touches bleues coordonnées */}
        <CommunitySection />
      </main>

      {/* Footer minimaliste avec subtile bordure bleu nuit */}
      <footer className="border-t border-blue-950/40 bg-[#06080F] py-5 text-xs text-slate-500 text-center">
        <p>JARVIS Connect — Connexion WhatsApp Instantanée & Sécurisée</p>
      </footer>
    </div>
  );
}
