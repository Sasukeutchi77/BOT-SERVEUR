import React from 'react';
import { Send, MessageCircle, ExternalLink, HelpCircle, Shield, BookOpen } from 'lucide-react';

export const CommunitySection: React.FC = () => {
  return (
    <div className="bg-[#090D1A] border border-blue-950/70 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Communauté & Support Officiel
        </h3>
        <span className="text-[10px] text-blue-400 font-mono">112+ Commandes</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <a
          href="https://whatsapp.com/channel/0029VbCRcEJLdQeYxw5g3m2o"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-3 rounded-xl bg-[#0D1322] hover:bg-[#111A30] border border-blue-950/80 hover:border-blue-800/60 transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-medium text-white group-hover:text-blue-300 transition-colors">
                Chaîne WhatsApp
              </div>
              <div className="text-[10px] text-slate-500">Mises à jour directes</div>
            </div>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 transition-colors" />
        </a>

        <a
          href="https://t.me/nexusforger"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-3 rounded-xl bg-[#0D1322] hover:bg-[#111A30] border border-blue-950/80 hover:border-blue-800/60 transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-950/60 border border-blue-800/40 flex items-center justify-center text-blue-400">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-medium text-white group-hover:text-blue-300 transition-colors">
                Canal Telegram
              </div>
              <div className="text-[10px] text-slate-500">@nexusforger</div>
            </div>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 transition-colors" />
        </a>

        <a
          href="https://t.me/+kcLFkzePlwwyZjE8"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-3 rounded-xl bg-[#0D1322] hover:bg-[#111A30] border border-blue-950/80 hover:border-blue-800/60 transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-center text-indigo-400">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-medium text-white group-hover:text-blue-300 transition-colors">
                Groupe d'Entraide
              </div>
              <div className="text-[10px] text-slate-500">Assistance 24/7</div>
            </div>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 transition-colors" />
        </a>
      </div>
    </div>
  );
};
