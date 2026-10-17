import React, { useState, useEffect } from 'react';
import { api } from './api';
import { BotInstance } from './types';
import { Navbar } from './components/Navbar';
import { PairingSection } from './components/PairingSection';
import { CommunitySection } from './components/CommunitySection';
import { MultiBotManager } from './components/MultiBotManager';
import { SessionStatsCard } from './components/SessionStatsCard';

export default function App() {
  const [userBots, setUserBots] = useState<BotInstance[]>([]);
  const [activeBot, setActiveBot] = useState<BotInstance | null>(null);
  const [totalEverConnected, setTotalEverConnected] = useState<number>(0);
  const [onlineBots, setOnlineBots] = useState<number>(0);
  const [connectedCount, setConnectedCount] = useState<number>(1);
  const [totalMessages, setTotalMessages] = useState<number>(0);

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
            fetchStats();
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
      } else {
        // Si aucun bot restant (ex: après déconnexion complète), créer un nouvel emplacement prêt à associer
        const createRes = await api.createBot('Mon Assistant JARVIS');
        if (createRes.success && createRes.bot) {
          setUserBots([createRes.bot]);
          setActiveBot(createRes.bot);
        }
      }
      fetchStats();
    } catch (e) {}
  };

  // Initialisation instantanée de l'instance sans création de compte
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

      // Session instantanée libre sans aucun formulaire ni compte
      const guestRes = await api.initGuestSession();
      if (guestRes && guestRes.bot) {
        setUserBots([guestRes.bot]);
        setActiveBot(guestRes.bot);
      }
    } catch (err) {
      console.error('Erreur initialisation session:', err);
      // Fallback gracieux pour garantir que l'interface reste toujours active
      setUserBots((prev) => {
        if (prev.length > 0) return prev;
        const fallback: BotInstance = {
          id: 'bot_guest_' + Date.now().toString(36),
          userId: 'usr_guest',
          name: 'Mon Assistant JARVIS',
          status: 'OFFLINE',
          config: {
            botName: 'JARVIS',
            prefix: '.',
            autoRead: false,
            reactToStatus: false,
            antiDelete: false,
            antiSpam: true,
            welcomeMessage: 'Bonjour ! Je suis JARVIS, votre assistant personnel WhatsApp.',
            enabledCommands: ['help', 'ping', 'calc', 'ai'],
          },
          stats: {
            messagesHandled: 0,
            commandsExecuted: 0,
            reconnectAttempts: 0,
          },
        };
        setActiveBot(fallback);
        return [fallback];
      });

      // Tentative de rattrapage en arrière-plan après 2 secondes
      setTimeout(() => {
        loadUserBots();
      }, 2000);
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

  // Suivi en direct du nombre réel de bots et visiteurs
  const fetchStats = async () => {
    try {
      const res = await api.getConnectedStats();
      if (res.success) {
        setTotalEverConnected(res.totalBotsEverConnected ?? res.totalSessions ?? 0);
        setOnlineBots(res.onlineBots ?? res.activeSessions ?? 0);
        setConnectedCount(res.connectedCount ?? 1);
        if (typeof res.totalMessages === 'number') {
          setTotalMessages(res.totalMessages);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    initSession();
    fetchStats();

    // Actualisation du compteur en direct toutes les 5 secondes
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#080B12] text-slate-100 flex flex-col font-sans selection:bg-blue-600/30 selection:text-blue-200 relative overflow-hidden">
      {/* Nuance d'ambiance bleue subtile en haut de page */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-80 bg-gradient-to-b from-blue-600/[0.08] via-indigo-600/[0.03] to-transparent pointer-events-none blur-3xl -z-10" />

      {/* Navigation épurée avec nuances bleues saphir et compteurs synchronisés */}
      <Navbar
        status={activeBot?.status}
        phoneNumber={activeBot?.phoneNumberMasked || activeBot?.phoneNumber}
        connectedCount={connectedCount}
        onlineBots={onlineBots}
        totalEverConnected={totalEverConnected}
        prefix={activeBot?.config?.prefix || '.'}
      />

      {/* Contenu Principal */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col justify-center space-y-4">
        {/* Carte statistique Total & Active sessions identique à la maquette */}
        <SessionStatsCard
          totalSessions={totalEverConnected}
          activeSessions={onlineBots}
          serversReporting="5/5 servers reporting"
        />

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
            onBotRemoved={() => loadUserBots()}
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
