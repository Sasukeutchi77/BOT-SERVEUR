import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { BotInstance } from '../types';
import {
  Smartphone,
  Key,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  XCircle,
  CheckCircle2,
  ShieldCheck,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Zap
} from 'lucide-react';

interface PairingSectionProps {
  bot: BotInstance;
  onStatusUpdate: () => void;
}

// Détection intelligente du pays en temps réel lors de la frappe
function detectCountry(phone: string): { name: string; flag: string } | null {
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+')) return null;

  const prefixes: [string, string, string][] = [
    ['+33', 'France', '🇫🇷'],
    ['+221', 'Sénégal', '🇸🇳'],
    ['+225', 'Côte d\'Ivoire', '🇨🇮'],
    ['+212', 'Maroc', '🇲🇦'],
    ['+213', 'Algérie', '🇩🇿'],
    ['+216', 'Tunisie', '🇹🇳'],
    ['+237', 'Cameroun', '🇨🇲'],
    ['+243', 'RD Congo', '🇨🇩'],
    ['+242', 'Congo Brazzaville', '🇨🇬'],
    ['+229', 'Bénin', '🇧🇯'],
    ['+228', 'Togo', '🇹🇬'],
    ['+226', 'Burkina Faso', '🇧🇫'],
    ['+223', 'Mali', '🇲🇱'],
    ['+224', 'Guinée', '🇬🇳'],
    ['+241', 'Gabon', '🇬🇦'],
    ['+261', 'Madagascar', '🇲🇬'],
    ['+32', 'Belgique', '🇧🇪'],
    ['+41', 'Suisse', '🇨🇭'],
    ['+44', 'Royaume-Uni', '🇬🇧'],
    ['+1', 'USA / Canada', '🇺🇸'],
  ];

  for (const [p, name, flag] of prefixes) {
    if (cleaned.startsWith(p)) return { name, flag };
  }
  return null;
}

export const PairingSection: React.FC<PairingSectionProps> = ({ bot, onStatusUpdate }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState<number>(120);
  const [showFaq, setShowFaq] = useState(false);

  const detected = detectCountry(phoneNumber);
  const cleanDigits = phoneNumber.replace(/\D/g, '');
  const isValidLength = cleanDigits.length >= 8;

  // Polling du statut de connexion lorsque le jumelage est en cours
  useEffect(() => {
    if (bot.status !== 'PAIRING' && bot.status !== 'CONNECTING') return;

    const interval = setInterval(async () => {
      try {
        const res = await api.getBotStatus(bot.id);
        if (res.status === 'ONLINE') {
          setPairingCode(null);
          onStatusUpdate();
        } else if (res.status === 'ERROR') {
          setError(res.lastError || 'Erreur lors de la tentative de connexion.');
          onStatusUpdate();
        } else if (res.pairingCode && !pairingCode) {
          setPairingCode(res.pairingCode);
        }
      } catch (err) {}
    }, 2500);

    return () => clearInterval(interval);
  }, [bot.id, bot.status, onStatusUpdate, pairingCode]);

  // Décompte de validité du code de jumelage
  useEffect(() => {
    if (!pairingCode) return;
    setCountdown(120);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
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

    let raw = phoneNumber.trim();
    if (!raw.startsWith('+')) {
      raw = `+${raw}`;
    }

    const digitsOnly = raw.replace(/\D/g, '');
    if (digitsOnly.length < 8) {
      setError('Veuillez entrer un numéro de téléphone valide avec son indicatif international.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.requestPairingCode(bot.id, raw);
      setPairingCode(res.pairingCode);
      onStatusUpdate();
    } catch (err: any) {
      setError(err.message || 'Impossible de générer le code de jumelage.');
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

  const isOnline = bot.status === 'ONLINE';

  // Formatage aéré du code à 8 caractères (ex: ABCD - 1234)
  const formattedCode = pairingCode
    ? pairingCode.length === 8
      ? `${pairingCode.slice(0, 4)} - ${pairingCode.slice(4)}`
      : pairingCode
    : '';

  return (
    <div className="relative">
      {/* Halo de lueur ambiant subtil */}
      <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 rounded-3xl blur-xl opacity-60 pointer-events-none" />

      <div className="relative bg-[#0D111A] border border-slate-800/80 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-10 space-y-8">
        {/* En-tête de la carte */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Smartphone className="w-4 h-4" />
              </div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                Liaison WhatsApp Multi-Device
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Associez votre compte WhatsApp en toute autonomie grâce au code officiel à 8 caractères.
            </p>
          </div>

          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold self-start sm:self-auto ${
              isOnline
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60 shadow-sm shadow-emerald-500/20'
                : bot.status === 'PAIRING'
                ? 'bg-amber-950/60 text-amber-400 border-amber-800/60 animate-pulse'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline
                  ? 'bg-emerald-400 animate-pulse'
                  : bot.status === 'PAIRING'
                  ? 'bg-amber-400'
                  : 'bg-slate-500'
              }`}
            />
            <span>
              {isOnline
                ? 'BOT CONNECTÉ'
                : bot.status === 'PAIRING'
                ? 'EN ATTENTE DE SAISIE'
                : 'NON ASSOCIÉ'}
            </span>
          </div>
        </div>

        {/* Corps principal */}
        <div>
          {isOnline ? (
            /* ÉTAT EN LIGNE CONNECTÉ */
            <div className="p-6 sm:p-8 bg-emerald-950/20 border border-emerald-800/40 rounded-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Votre bot JARVIS est actif et prêt
                    </h3>
                    <p className="text-xs text-emerald-400/90 font-mono mt-0.5">
                      Numéro WhatsApp : <strong>{bot.phoneNumberMasked || bot.phoneNumber}</strong>
                    </p>
                    <span className="text-[11px] text-slate-400 block mt-1">
                      Instance isolée · Réponses aux messages et commandes actives
                    </span>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    if (confirm('Voulez-vous déconnecter ce compte WhatsApp ?')) {
                      await api.disconnectBot(bot.id);
                      onStatusUpdate();
                    }
                  }}
                  className="px-4 py-2.5 text-xs font-semibold text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-950/70 border border-red-900/50 rounded-xl transition-all self-start sm:self-auto"
                >
                  Déconnecter ce compte
                </button>
              </div>

              {/* Rassurance de sécurité */}
              <div className="pt-4 border-t border-emerald-900/30 flex items-center gap-2 text-[11px] text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Connexion persistante sécurisée chiffrée de bout en bout par WhatsApp.</span>
              </div>
            </div>
          ) : !pairingCode ? (
            /* FORMULAIRE DE SAISIE DU NUMÉRO */
            <form onSubmit={handleRequestPairingCode} className="space-y-6 max-w-xl">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200">
                    Numéro de téléphone WhatsApp avec indicatif pays
                  </label>
                  {detected && (
                    <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5 animate-in fade-in">
                      <span>{detected.flag}</span>
                      <span>{detected.name}</span>
                    </span>
                  )}
                </div>

                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Ex: +33612345678 ou +221778901234"
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl text-base text-white placeholder-slate-500 font-mono tracking-wide focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-all shadow-inner"
                  />
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Tapez votre numéro complet avec le signe <strong>+</strong> et votre indicatif international (ex : <strong>+33</strong> France, <strong>+221</strong> Sénégal, <strong>+225</strong> Côte d'Ivoire, <strong>+212</strong> Maroc, <strong>+237</strong> Cameroun, <strong>+243</strong> RDC, <strong>+1</strong> USA, etc.).
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-950/40 border border-red-800/50 rounded-2xl text-xs text-red-300 flex items-start gap-3 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !phoneNumber.trim()}
                className="w-full sm:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-extrabold text-sm rounded-2xl transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2.5"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Génération du code officiel Baileys...</span>
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    <span>Obtenir mon Code de Jumelage (8 chiffres)</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* AFFICHAGE DU CODE DE JUMELAGE OBTENU */
            <div className="space-y-6 max-w-2xl animate-in fade-in duration-300">
              <div className="bg-[#121622] border border-emerald-500/30 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-xl">
                <span className="text-[11px] uppercase tracking-wider font-mono text-emerald-400 font-bold">
                  Code de Jumelage WhatsApp Actif
                </span>

                <div className="py-2">
                  <div className="inline-flex items-center gap-4 bg-black/70 px-6 sm:px-10 py-4 rounded-2xl border border-emerald-500/40 shadow-inner">
                    <span className="text-3xl sm:text-5xl font-mono font-black tracking-widest text-emerald-400 selection:bg-emerald-400 selection:text-black">
                      {formattedCode}
                    </span>
                    <button
                      onClick={handleCopy}
                      className="p-2.5 bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 rounded-xl transition-all border border-emerald-500/30 active:scale-95"
                      title="Copier le code"
                    >
                      {copied ? (
                        <Check className="w-6 h-6 text-emerald-300" />
                      ) : (
                        <Copy className="w-6 h-6" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Toast de confirmation de copie */}
                {copied && (
                  <p className="text-xs text-emerald-400 font-semibold animate-in fade-in">
                    ✓ Code copié dans votre presse-papiers !
                  </p>
                )}

                {/* Barre de décompte visuelle */}
                <div className="space-y-1.5 max-w-xs mx-auto">
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-400 h-full rounded-full transition-all duration-1000 ease-linear"
                      style={{ width: `${Math.max(0, (countdown / 120) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Expire dans <strong className="text-emerald-400 font-mono">{countdown} secondes</strong>
                  </p>
                </div>
              </div>

              {/* Instructions étape par étape avec repères visuels */}
              <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-4">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  À faire sur votre smartphone WhatsApp :
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
                  <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 font-bold font-mono flex items-center justify-center shrink-0 border border-emerald-500/20">
                      1
                    </span>
                    <p className="leading-relaxed">
                      Ouvrez <strong>WhatsApp</strong> &gt; <strong>Menu ⋮</strong> (ou Paramètres) &gt; <strong>Appareils connectés</strong>.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 font-bold font-mono flex items-center justify-center shrink-0 border border-emerald-500/20">
                      2
                    </span>
                    <p className="leading-relaxed">
                      Touchez <strong>Connecter un appareil</strong>.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 font-bold font-mono flex items-center justify-center shrink-0 border border-emerald-500/20">
                      3
                    </span>
                    <p className="leading-relaxed">
                      En bas, choisissez <strong>"Associer avec le numéro de téléphone"</strong>.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 font-bold font-mono flex items-center justify-center shrink-0 border border-emerald-500/20">
                      4
                    </span>
                    <p className="leading-relaxed">
                      Saisissez le code : <strong className="text-emerald-400 font-mono">{pairingCode}</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Barre d'état en temps réel et bouton d'annulation */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2.5 text-xs text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  <span>En attente de votre confirmation sur WhatsApp...</span>
                </div>

                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1.5 transition-colors py-1"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Annuler et changer de numéro</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* FAQ Accordéon dépliable pour rassurer */}
        <div className="pt-4 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setShowFaq(!showFaq)}
            className="flex items-center justify-between w-full text-xs text-slate-400 hover:text-slate-200 transition-colors py-1"
          >
            <span className="flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              <span>Questions fréquentes sur la connexion WhatsApp</span>
            </span>
            {showFaq ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showFaq && (
            <div className="mt-4 space-y-3 text-xs text-slate-400 leading-relaxed bg-slate-900/40 p-4 rounded-xl border border-slate-800/60 animate-in fade-in">
              <p>
                <strong>• Mes conversations privées sont-elles conservées ?</strong> Non, aucune conversation ni mot de passe n'est stocké. La connexion s'effectue via le protocole officiel WhatsApp Multi-Device.
              </p>
              <p>
                <strong>• Mon téléphone doit-il rester allumé ?</strong> Une fois associé, WhatsApp Multi-Device continue de fonctionner de manière autonome sur le serveur même si votre téléphone est temporairement déconnecté.
              </p>
              <p>
                <strong>• Comment déconnecter le bot ?</strong> Vous pouvez déconnecter le bot à tout moment depuis ce site ou directement dans WhatsApp &gt; Appareils connectés &gt; Déconnecter.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
