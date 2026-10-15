import React, { useState, useEffect } from 'react';
import { api } from './api';
import { BotInstance } from './types';
import { Navbar } from './components/Navbar';
import { PairingSection } from './components/PairingSection';
import { CommunitySection } from './components/CommunitySection';
import { JarvisLoader } from './components/JarvisLoader';

export default function App() {
  const [activeBot, setActiveBot] = useState<BotInstance | null>(null);
  const [jarvisLoading, setJarvisLoading] = useState(true);
  const [totalSessions, setTotalSessions] = useState<number>(0);
  const [activeSessions, setActiveSessions] = useState<number>(0);
  const [connectedCount, setConnectedCount] = useState<number>(1);

  // Initialisation instantanée de l'instance
  const initSession = async () => {
    try {
      const existingToken = api.getToken();

      if (existingToken) {
        try {
          const res = await api.getBots();
          if (res.bots && res.bots.length > 0) {
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
      setActiveBot((prev) =>
        prev
          ? {
              ...prev,
              status: res.status as any,
              phoneNumberMasked: res.phoneNumberMasked,
              stats: res.stats || prev.stats,
              lastError: res.lastError,
            }
          : null
      );
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
    <>
      {/* Écran de Chargement Futuriste Holographique JARVIS HUD */}
      {jarvisLoading && (
        <JarvisLoader
          duration={3200}
          onComplete={() => setJarvisLoading(false)}
        />
      )}

      <div className="min-h-screen bg-[#090A0F] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
        {/* Navigation épurée */}
        <Navbar
          status={activeBot?.status}
          phoneNumber={activeBot?.phoneNumberMasked || activeBot?.phoneNumber}
          connectedCount={connectedCount}
          onlineBots={activeSessions}
        />

        {/* Contenu Principal */}
        <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col justify-center">
          {/* Métriques Exactes de l'image : Total sessions & Active sessions */}
          <div className="bg-[#0F131C] border border-slate-800/80 rounded-2xl p-4 sm:p-5 mb-6 shadow-xl">
            <div className="grid grid-cols-2 divide-x divide-slate-800/80">
              {/* Total sessions (all servers) */}
              <div className="px-3 sm:px-6 py-1">
                <span className="block text-xs sm:text-sm text-slate-400 font-sans tracking-tight">
                  Total sessions (all servers)
                </span>
                <div className="mt-1 text-2xl sm:text-3xl font-extrabold text-white font-mono">
                  {totalSessions}
                </div>
              </div>

              {/* Active sessions */}
              <div className="px-3 sm:px-6 py-1">
                <span className="block text-xs sm:text-sm text-slate-400 font-sans tracking-tight">
                  Active sessions
                </span>
                <div className="mt-1 text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
                  {activeSessions}
                </div>
              </div>
            </div>
          </div>

          {/* Module de jumelage épuré */}
          {activeBot && (
            <PairingSection
              bot={activeBot}
              onStatusUpdate={refreshBotStatus}
            />
          )}

          {/* Section Communauté : WhatsApp & Télégram (comme sur la capture) */}
          <CommunitySection />
        </main>

        {/* Footer minimaliste */}
        <footer className="border-t border-slate-900 bg-[#07080D] py-6 text-xs text-slate-500 text-center">
          <p>JARVIS CLOUD — Connexion WhatsApp Instantanée & Sécurisée</p>
        </footer>
      </div>
    </>
  );
}
