import React, { useState, useEffect } from 'react';
import { Server, CheckCircle2, AlertCircle, RefreshCw, X, Globe, Shield, Key } from 'lucide-react';
import { api } from '../api';

interface ServerConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionChanged: () => void;
}

export const ServerConnectionModal: React.FC<ServerConnectionModalProps> = ({
  isOpen,
  onClose,
  onConnectionChanged,
}) => {
  const [serverUrl, setServerUrl] = useState('');
  const [serverEmail, setServerEmail] = useState('');
  const [serverCode, setServerCode] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [mode, setMode] = useState<string>('local');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    loadStatus();
  }, [isOpen]);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await api.getServerConnection();
      if (res) {
        setServerUrl(res.serverUrl || '');
        setServerEmail(res.serverEmail || '');
        setIsConnected(!!res.isConnected);
        setMode(res.mode || (res.serverUrl ? 'remote' : 'local'));
        setTestResult(
          res.testError
            ? { success: false, message: `API distante non validée : ${res.testError}` }
            : res.isConnected
            ? { success: true, message: 'API distante joignable; le jumelage WhatsApp doit être vérifié séparément.' }
            : null,
        );
      }
    } catch (e) {
      console.error('Erreur chargement liaison serveur:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setTestResult(null);

    try {
      const cleanUrl = serverUrl.trim();
      const res = await api.saveServerConnection({
        serverUrl: cleanUrl,
        serverEmail: serverEmail.trim(),
        serverCode: serverCode.trim(),
      });

      if (cleanUrl) {
        if (res.isConnected) {
          setIsConnected(true);
          setMode('remote');
          setTestResult({
            success: true,
            message: 'API distante joignable (santé et route des bots vérifiées). Le jumelage WhatsApp se valide séparément.',
          });
        } else {
          setIsConnected(false);
          setTestResult({
            success: false,
            message: res.testError
              ? `Liaison non modifiée : ${res.testError}`
              : 'Liaison non modifiée : le test de connectivité a échoué. Vérifiez l’URL.',
          });
        }
      } else {
        setIsConnected(false);
        setMode('cloud');
        setTestResult({
          success: true,
          message: 'Liaison réinitialisée. Les bots sont hébergés et exécutés directement sur ce serveur Cloud 24h/24.',
        });
      }
      onConnectionChanged();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Erreur lors de la configuration de la liaison.',
      });
    } finally {
      setTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0B101D] border border-blue-900/60 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl shadow-blue-950/40">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-blue-950/80 bg-[#080B14]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <Server className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Liaison Serveur Déployé (H24)</h3>
              <p className="text-[11px] text-slate-400">Connectez ce site web à votre serveur de bot dédié</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSaveAndConnect} className="p-6 space-y-4">
          {/* Status Badge */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#070A12] border border-blue-950/80">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isConnected
                    ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                    : serverUrl
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-emerald-400'
                }`}
              />
              <span className="text-xs font-medium text-slate-200">
                {isConnected
                  ? 'Relié au serveur bot distant (H24)'
                  : serverUrl
                  ? 'Serveur distant configuré (en attente)'
                  : 'Hébergé directement sur le serveur Cloud (H24)'}
              </span>
            </div>
            <button
              type="button"
              onClick={loadStatus}
              disabled={loading}
              className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-mono transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>

          {/* Result message */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                testResult.success
                  ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                  : 'bg-red-950/30 border-red-800/40 text-red-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              )}
              <p>{testResult.message}</p>
            </div>
          )}

          {/* Input SERVER_URL */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              URL du Serveur Distant (SERVER_URL)
            </label>
            <input
              type="text"
              placeholder="https://mon-bot-jarvis.onrender.com"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#070A12] border border-blue-950 focus:border-blue-500 focus:outline-none text-xs text-white placeholder:text-slate-600 transition-all font-mono"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              L'adresse URL publique de votre bot hébergé (sur Render, Railway, VPS, etc.).
            </p>
          </div>

          {/* Input SERVER_EMAIL */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              Email du Serveur (SERVER_EMAIL) <span className="text-slate-500 font-normal">(Optionnel)</span>
            </label>
            <input
              type="email"
              placeholder="admin@jarviscloud.local"
              value={serverEmail}
              onChange={(e) => setServerEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#070A12] border border-blue-950 focus:border-blue-500 focus:outline-none text-xs text-white placeholder:text-slate-600 transition-all font-mono"
            />
          </div>

          {/* Input SERVER_CODE */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-indigo-400" />
              Code de configuration (SERVER_CODE) <span className="text-slate-500 font-normal">(Requis pour modifier la liaison)</span>
            </label>
            <input
              type="password"
              required
              placeholder="Saisissez le SERVER_CODE déjà défini dans l’environnement"
              value={serverCode}
              onChange={(e) => setServerCode(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#070A12] border border-blue-950 focus:border-blue-500 focus:outline-none text-xs text-white placeholder:text-slate-600 transition-all font-mono"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Pour changer ce code, modifiez la variable SERVER_CODE dans l’hébergement; ne l’envoyez pas dans le chat.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                setServerUrl('');
                setServerEmail('');
                setServerCode('');
              }}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Effacer la liaison
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-colors"
              >
                Fermer
              </button>
              <button
                type="submit"
                disabled={testing}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
              >
                {testing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {testing ? 'Connexion en cours...' : 'Relier le serveur'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
