import React, { useState } from 'react';
import { ArrowUpRight, MessageSquare, Users, Send } from 'lucide-react';

interface CommunityItem {
  id: string;
  platform: 'WhatsApp' | 'Telegram';
  type: 'Channel' | 'Group';
  title: string;
  subtitle: string;
  url: string;
}

const communityLinks: CommunityItem[] = [
  {
    id: 'wa-channel',
    platform: 'WhatsApp',
    type: 'Channel',
    title: 'Chaîne WhatsApp',
    subtitle: 'Annonces, mises à jour & nouveautés JARVIS',
    url: 'https://whatsapp.com/channel/0029VbCRcEJLdQeYxw5g3m2o',
  },
  {
    id: 'wa-group',
    platform: 'WhatsApp',
    type: 'Group',
    title: 'Groupe WhatsApp',
    subtitle: 'Support communautaire & entraide utilisateurs',
    url: 'https://chat.whatsapp.com/DDrdpX4q9XeCJRRTKY8iIC?s=cl&p=a&mlu=4&ilr=4',
  },
  {
    id: 'tg-channel',
    platform: 'Telegram',
    type: 'Channel',
    title: 'Chaîne Télégram (Nexus Forger)',
    subtitle: 'Actualités techniques & tutoriels bots',
    url: 'https://t.me/nexusforger',
  },
  {
    id: 'tg-group',
    platform: 'Telegram',
    type: 'Group',
    title: 'Groupe Télégram',
    subtitle: 'Discussions & échanges en direct',
    url: 'https://t.me/+kcLFkzePlwwyZjE8',
  },
];

export const CommunitySection: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'whatsapp' | 'telegram'>('all');

  const filteredLinks = communityLinks.filter((item) => {
    if (filter === 'whatsapp') return item.platform === 'WhatsApp';
    if (filter === 'telegram') return item.platform === 'Telegram';
    return true;
  });

  return (
    <div className="mt-8 space-y-3">
      {/* Section Header exactly like screenshot */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold tracking-widest uppercase font-mono text-slate-500">
          COMMUNITY
        </span>

        {/* Quiet platform filter pills */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-colors ${
              filter === 'all'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Tous
          </button>
          <button
            type="button"
            onClick={() => setFilter('whatsapp')}
            className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-colors ${
              filter === 'whatsapp'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            WhatsApp
          </button>
          <button
            type="button"
            onClick={() => setFilter('telegram')}
            className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-colors ${
              filter === 'telegram'
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Télégram
          </button>
        </div>
      </div>

      {/* Cards list matching the exact screenshot design */}
      <div className="space-y-3">
        {filteredLinks.map((item) => {
          const isChannel = item.type === 'Channel';
          const isTelegram = item.platform === 'Telegram';

          return (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block p-4 bg-[#0F131C] hover:bg-[#121724] border border-slate-800/80 hover:border-slate-700 rounded-2xl transition-all shadow-md"
            >
              <div className="flex items-center justify-between gap-4">
                {/* Left side: Icon + Title & Subtitle */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 ${
                      isTelegram
                        ? 'bg-blue-950/40 border-blue-800/40 text-blue-400'
                        : isChannel
                        ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400'
                        : 'bg-teal-950/40 border-teal-800/40 text-teal-400'
                    }`}
                  >
                    {isTelegram ? (
                      <Send className="w-5 h-5 ml-0.5" />
                    ) : isChannel ? (
                      <MessageSquare className="w-5 h-5" />
                    ) : (
                      <Users className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors truncate font-sans">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-400 truncate mt-0.5 font-sans">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                {/* Right action button matching screenshot */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-sm ${
                    isChannel
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 border border-slate-700/80 text-slate-300'
                  }`}
                >
                  <ArrowUpRight className="w-5 h-5" />
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
};
