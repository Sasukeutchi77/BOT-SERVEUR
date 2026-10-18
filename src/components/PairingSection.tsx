import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { BotInstance } from '../types';
import {
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface PairingSectionProps {
  bot: BotInstance;
  onStatusUpdate: () => void;
  onBotRemoved?: () => void;
}

// Détection intelligente du pays en temps réel lors de la frappe
function detectCountry(phone: string): { name: string; flag: string } | null {
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+')) return null;

  const prefixes: [string, string, string][] = [
    ['+226', 'Burkina Faso', '🇧🇫'],
    ['+225', 'Côte d\'Ivoire', '🇨🇮'],
    ['+221', 'Sénégal', '🇸🇳'],
    ['+223', 'Mali', '🇲🇱'],
    ['+227', 'Niger', '🇳🇪'],
    ['+228', 'Togo', '🇹🇬'],
    ['+229', 'Bénin', '🇧🇯'],
    ['+224', 'Guinée', '🇬🇳'],
    ['+237', 'Cameroun', '🇨🇲'],
    ['+241', 'Gabon', '🇬🇦'],
    ['+242', 'Congo', '🇨🇬'],
    ['+243', 'RDC', '🇨🇩'],
    ['+235', 'Tchad', '🇹🇩'],
    ['+212', 'Maroc', '🇲🇦'],
    ['+213', 'Algérie', '🇩🇿'],
    ['+216', 'Tunisie', '🇹🇳'],
    ['+33', 'France', '🇫🇷'],
    ['+32', 'Belgique', '🇧🇪'],
    ['+41', 'Suisse', '🇨🇭'],
    ['+1', 'USA / Canada', '🇺🇸'],
    ['+44', 'Royaume-Uni', '🇬🇧'],
    ['+49', 'Allemagne', '🇩🇪'],
    ['+34', 'Espagne', '🇪🇸'],
    ['+39', 'Italie', '🇮🇹'],
    ['+234', 'Nigeria', '🇳🇬'],
    ['+233', 'Ghana', '🇬🇭'],
    ['+254', 'Kenya', '🇰🇪'],
    ['+27', 'Afrique du Sud', '🇿🇦'],
    ['+55', 'Brésil', '🇧🇷'],
    ['+91', 'Inde', '🇮🇳'],
  ];

  for (const [p, name, flag] of prefixes) {
    if (cleaned.startsWith(p)) return { name, flag };
  }
  return null;
}

export const PairingSection: React.FC<PairingSectionProps> = ({ bot, onStatusUpdate, onBotRemoved }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState<number>(60);
  const [showFaq, setShowFaq] = useState(false);
  const [selectedPrefix, setSelectedPrefix] = useState(bot.config?.prefix || '.');
  const [customPrefixInput, setCustomPrefixInput] = useState('');
  const [isSavingPrefix, setIsSavingPrefix] = useState(false);
  const [prefixSavedMessage, setPrefixSavedMessage] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  useEffect(() => {
    if (bot.config?.prefix) {
      setSelectedPrefix(bot.config.prefix);
    }
  }, [bot.config?.prefix]);

  const handleSelectPrefix = async (newPrefix: string) => {
    const trimmed = newPrefix.trim();
    if (!trimmed || trimmed.length > 5) return;
    setSelectedPrefix(trimmed);
    setIsSavingPrefix(true);
    try {
      await api.setBotPrefix(bot.id, trimmed);
      setPrefixSavedMessage(true);
      setTimeout(() => setPrefixSavedMessage(false), 2500);
      onStatusUpdate();
    } catch (e) {
      console.error('Erreur mise à jour préfixe:', e);
    } finally {
      setIsSavingPrefix(false);
    }
  };

  const detected = detectCountry(phoneNumber);
  const cleanDigits = phoneNumber.replace(/\D/g, '');
  const isValidLength = cleanDigits.length >= 8;

  useEffect(() => {
    if (!pairingCode && bot.status !== 'PAIRING' && bot.status !== 'CONNECTING') return;

    const interval = setInterval(async () => {
      try {
        const res = await api.getBotStatus(bot.id);
        if (res.status === 'ONLINE') {
          setPairingCode(null);
          setError(null);
          onStatusUpdate();
        } else if (res.status === 'OFFLINE' || res.status === 'ERROR' || res.status === 'STOPPED') {
          setPairingCode(null);
          setError(res.lastError || 'La connexion WhatsApp s’est fermée avant la fin du jumelage. Demandez un nouveau code.');
          onStatusUpdate();
        }
      } catch (e) {}
    }, 2500);

    return () => clearInterval(interval);
  }, [bot.status, bot.id, onStatusUpdate, pairingCode]);

  useEffect(() => {
    if (!pairingCode) return;
    setCountdown(60);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setPairingCode(null);
          setError('Le code a expiré. Veuillez relancer la demande.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [pairingCode]);

  const handleRequestPairingCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPairingCode(null);

    const trimmed = phoneNumber.trim();
    if (!trimmed) {
      setError('Veuillez saisir votre numéro de téléphone.');
      return;
    }

    if (!trimmed.startsWith('+')) {
      setError('N\'oubliez pas le préfixe pays avec le signe "+" (ex: +226...).');
      return;
    }

    if (!isValidLength) {
      setError('Le numéro semble trop court. Vérifiez l\'indicatif et les chiffres.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.requestPairingCode(bot.id, trimmed, selectedPrefix);
      if (res.success && res.pairingCode) {
        setPairingCode(res.pairingCode);
        onStatusUpdate();
      } else {
        setError('Impossible de générer le code. Réessayez.');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la demande de code.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!pairingCode) return;
    navigator.clipboard.writeText(pairingCode.replace(/\s+/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      await api.stopBot(bot.id);
      setPairingCode(null);
      setError(null);
      onStatusUpdate();
    } catch (err) {}
    setLoading(false);
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.disconnectBot(bot.id);
      setConfirmDisconnect(false);
      if (onBotRemoved) {
        onBotRemoved();
      } else {
        onStatusUpdate();
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la déconnexion.');
    } finally {
      setLoading(false);
    }
  };

  const isOnline = bot.status === 'ONLINE';

  const formattedCode = pairingCode
    ? pairingCode.length === 8
      ? `${pairingCode.slice(0, 4)} - ${pairingCode.slice(4)}`
      : pairingCode
    : '';

  return (
    <div className="w-full">
      <div className="bg-[#0D1220] border border-blue-900/35 rounded-2xl p-6 sm:p-8 space-y-6 text-slate-100 shadow-xl shadow-blue-950/20">
        {/* En-tête sobre avec nuance bleue */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-blue-950/60">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Liaison WhatsApp
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Associez votre compte WhatsApp en toute autonomie via code officiel.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className={`w-2 h-2 rounded-full ${
              isOnline ? 'bg-emerald-400' : bot.status === 'PAIRING' ? 'bg-blue-400 animate-pulse' : 'bg-slate-600'
            }`} />
            <span className="font-mono text-xs text-slate-300">
              {isOnline ? 'Connecté' : bot.status === 'PAIRING' ? 'En attente' : 'Non associé'}
            </span>
          </div>
        </div>

        {/* Corps principal */}
        <div>
          {isOnline ? (
            /* ÉTAT CONNECTÉ */
            <div className="p-5 bg-[#0E1629] border border-blue-900/40 rounded-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-950/50 border border-blue-800/40 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Bot actif sur WhatsApp
                    </h3>
                    <p className="text-xs text-blue-300 font-mono mt-0.5">
                      {bot.phoneNumberMasked || bot.phoneNumber}
                    </p>
                  </div>
                </div>

                {/* Bouton de déconnexion avec confirmation in-app */}
                {confirmDisconnect ? (
                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <span className="text-xs text-slate-400 mr-1">Déconnecter ?</span>
                    <button
                      onClick={handleDisconnect}
                      disabled={loading}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded-lg transition-all"
                    >
                      Oui
                    </button>
                    <button
                      onClick={() => setConfirmDisconnect(false)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg"
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDisconnect(true)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-red-400 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors self-start sm:self-auto"
                  >
                    Déconnecter ce compte
                  </button>
                )}
              </div>

              {/* Sélecteur de préfixe sobre */}
              <div className="pt-4 border-t border-blue-950/60 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Préfixe de commande :</span>
                  {prefixSavedMessage && (
                    <span className="text-blue-400 text-[11px] font-medium">Mis à jour</span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {['.', '!', '#', '/', '$', '?'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleSelectPrefix(p)}
                      disabled={isSavingPrefix}
                      className={`w-8 h-8 rounded-lg font-mono text-xs font-semibold transition-all ${
                        selectedPrefix === p
                          ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30 border border-blue-400/50'
                          : 'bg-[#090E1A] text-slate-300 border border-blue-950/60 hover:border-blue-800/60 hover:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  ))}

                  <div className="flex items-center gap-1 ml-2">
                    <input
                      type="text"
                      maxLength={3}
                      value={customPrefixInput}
                      onChange={(e) => setCustomPrefixInput(e.target.value)}
                      placeholder="Autre..."
                      className="w-16 px-2 py-1 bg-[#080D18] border border-blue-950/80 rounded-lg text-center text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customPrefixInput.trim()) {
                          handleSelectPrefix(customPrefixInput.trim());
                          setCustomPrefixInput('');
                        }
                      }}
                      disabled={!customPrefixInput.trim() || isSavingPrefix}
                      className="px-2 py-1 text-xs bg-blue-950/80 hover:bg-blue-900 border border-blue-800/40 text-blue-300 rounded-lg"
                    >
                      OK
                    </button>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2">
                  <span>Exemples :</span>
                  <span className="text-blue-300">{selectedPrefix}menu</span>
                  <span>·</span>
                  <span className="text-blue-300">{selectedPrefix}ping</span>
                </div>
              </div>
            </div>
          ) : !pairingCode ? (
            /* FORMULAIRE DE LIAISON */
            <form onSubmit={handleRequestPairingCode} className="space-y-5">
              {/* Choix du préfixe sobre */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="text-slate-300 font-medium">
                    1. Préfixe de commande
                  </label>
                  {prefixSavedMessage && (
                    <span className="text-blue-400 text-[11px] font-medium">Enregistré</span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {['.', '!', '#', '/', '$', '?'].map((p) => {
                    const isSelected = selectedPrefix === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleSelectPrefix(p)}
                        disabled={isSavingPrefix}
                        className={`w-9 h-9 rounded-lg font-mono text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30 border border-blue-400/50'
                            : 'bg-[#090E1A] text-slate-300 border border-blue-950/60 hover:border-blue-800/60 hover:text-white'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}

                  <div className="flex items-center gap-1 ml-2">
                    <input
                      type="text"
                      maxLength={3}
                      value={customPrefixInput}
                      onChange={(e) => setCustomPrefixInput(e.target.value)}
                      placeholder="Autre..."
                      className="w-16 px-2 py-1.5 bg-[#080D18] border border-blue-950/80 rounded-lg text-center text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customPrefixInput.trim()) {
                          handleSelectPrefix(customPrefixInput.trim());
                          setCustomPrefixInput('');
                        }
                      }}
                      disabled={!customPrefixInput.trim() || isSavingPrefix}
                      className="px-2.5 py-1.5 text-xs bg-blue-950/80 hover:bg-blue-900 border border-blue-800/40 text-blue-200 rounded-lg"
                    >
                      OK
                    </button>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-slate-400">
                  Commandes : <span className="text-blue-300">{selectedPrefix}menu</span>, <span className="text-blue-300">{selectedPrefix}ping</span>, <span className="text-blue-300">{selectedPrefix}ai</span>
                </div>
              </div>

              {/* Saisie du numéro */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="text-slate-300 font-medium">
                    2. Numéro de téléphone WhatsApp
                  </label>
                  {detected && (
                    <span className="text-blue-300 text-xs flex items-center gap-1">
                      <span>{detected.flag}</span>
                      <span>{detected.name}</span>
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Ex: +226 70 00 00 00 ou +33 6 12 34 56 78"
                    className="w-full px-3.5 py-3 bg-[#080D18] border border-blue-950/80 rounded-xl text-base text-white placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
                  />
                </div>

                <p className="text-[11px] text-slate-400">
                  Avec le signe <strong>+</strong> et l'indicatif pays (ex: <strong>+226</strong>, <strong>+225</strong>, <strong>+221</strong>, <strong>+33</strong>).
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-xs text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Bouton d'action principal en bleu moderne */}
              <button
                type="submit"
                disabled={loading || !phoneNumber.trim()}
                className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 active:scale-98"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Génération du code...</span>
                  </>
                ) : (
                  <span>Obtenir le code de jumelage</span>
                )}
              </button>
            </form>
          ) : (
            /* AFFICHAGE DU CODE */
            <div className="space-y-5 animate-in fade-in">
              <div className="bg-[#0A0F1E] border border-blue-900/40 rounded-xl p-6 text-center space-y-3">
                <span className="text-[11px] uppercase tracking-wider font-mono text-blue-400">
                  Code de Jumelage
                </span>

                <div className="py-2">
                  <div className="inline-flex items-center gap-3 bg-[#070A14] px-6 py-3 rounded-xl border border-blue-800/40 shadow-inner">
                    <span className="text-2xl sm:text-4xl font-mono font-bold tracking-widest text-blue-400">
                      {formattedCode}
                    </span>
                    <button
                      onClick={handleCopy}
                      className="p-2 text-blue-300 hover:text-white bg-blue-950/50 hover:bg-blue-900/60 border border-blue-800/40 rounded-lg transition-colors"
                      title="Copier le code"
                    >
                      {copied ? (
                        <Check className="w-5 h-5 text-blue-300" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {copied && (
                  <p className="text-xs text-blue-400 font-medium">
                    Code copié dans le presse-papiers
                  </p>
                )}

                <p className="text-[11px] text-slate-400 font-mono">
                  Expire dans environ <strong className="text-blue-300">{countdown}s</strong>
                </p>
              </div>

              {/* Instructions sobres */}
              <div className="bg-[#0A0F1E]/60 p-4 rounded-xl border border-blue-950/60 space-y-2.5 text-xs text-slate-300">
                <span className="font-semibold text-slate-200 block text-xs">
                  Étapes à suivre sur WhatsApp :
                </span>
                <ol className="space-y-1.5 text-slate-400 list-decimal list-inside text-xs leading-relaxed">
                  <li>Ouvrez WhatsApp &gt; <strong>Menu ⋮</strong> &gt; <strong>Appareils connectés</strong></li>
                  <li>Touchez <strong>Connecter un appareil</strong></li>
                  <li>Sélectionnez <strong>"Associer avec le numéro de téléphone"</strong></li>
                  <li>Saisissez le code : <strong className="text-blue-300 font-mono">{pairingCode}</strong></li>
                </ol>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  <span>En attente de liaison...</span>
                </div>

                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="text-slate-400 hover:text-red-400 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>

        {/* FAQ discrète */}
        <div className="pt-4 border-t border-blue-950/60">
          <button
            type="button"
            onClick={() => setShowFaq(!showFaq)}
            className="flex items-center justify-between w-full text-xs text-slate-400 hover:text-slate-200 transition-colors py-1"
          >
            <span>Questions fréquentes</span>
            {showFaq ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showFaq && (
            <div className="mt-3 space-y-2 text-xs text-slate-400 leading-relaxed bg-[#0A0F1E]/50 p-3.5 rounded-lg border border-blue-950/60 animate-in fade-in">
              <p>
                <strong>• Mes messages sont-ils stockés ?</strong> Non. La connexion est chiffrée de bout en bout par WhatsApp via Baileys.
              </p>
              <p>
                <strong>• Mon téléphone doit-il rester connecté ?</strong> Non. Grâce au mode multi-appareils, le bot continue de tourner de manière autonome.
              </p>
              <p>
                <strong>• Comment révoquer l'accès ?</strong> Depuis ce site via "Déconnecter", ou directement dans WhatsApp &gt; Appareils connectés.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
