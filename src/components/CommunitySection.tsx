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
    subtitle: 'Annonces & mises à jour JARVIS',
    url: 'https://whatsapp.com/channel/0029VbCRcEJLdQeYxw5g3m2o',
  },
  {
    id: 'wa-group',
    platform: 'WhatsApp',
    type: 'Group',
    title: 'Groupe WhatsApp',
    subtitle: 'Communauté & entraide utilisateurs',
    url: 'https://chat.whatsapp.com/DDrdpX4q9XeCJRRTKY8iIC?s=cl&p=a&mlu=4&ilr=4',
  },
  {
    id: 'tg-channel',
    platform: 'Telegram',
    type: 'Channel',
    title: 'Chaîne Télégram',
    subtitle: 'Actualités techniques & tutoriels bots',
    url: 'https://t.me/nexusforger',
  },
  {
    id: 'tg-group',
    platform: 'Telegram',
    type: 'Group',
    title: 'Groupe Télégram',
    subtitle: 'Discussions & échanges communautaires',
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
    <div className="pt-2 space-y-3">
      {/* En-tête sobre avec nuance bleue */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-slate-400">
          Communauté
        </span>

        {/* Filtres discrets */}
        <div className="flex items-center gap-1 bg-[#090D18] p-0.5 rounded-lg border border-blue-950/70">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tous
          </button>
          <button
            type="button"
            onClick={() => setFilter('whatsapp')}
            className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
              filter === 'whatsapp'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            WhatsApp
          </button>
          <button
            type="button"
            onClick={() => setFilter('telegram')}
            className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
              filter === 'telegram'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Télégram
          </button>
        </div>
      </div>

      {/* Cartes communautaires avec nuances saphir */}
      <div className="space-y-2">
        {filteredLinks.map((item) => {
          const isChannel = item.type === 'Channel';
          const isTelegram = item.platform === 'Telegram';

          return (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block p-3.5 bg-[#0D1220] hover:bg-[#10172B] border border-blue-900/30 hover:border-blue-700/50 rounded-xl transition-all shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
                    isTelegram
                      ? 'bg-blue-600/15 border-blue-500/30 text-blue-400'
                      : isChannel
                      ? 'bg-emerald-600/15 border-emerald-500/30 text-emerald-400'
                      : 'bg-teal-600/15 border-teal-500/30 text-teal-400'
                  }`}>
                    {isTelegram ? (
                      <Send className="w-4 h-4 ml-0.5" />
                    ) : isChannel ? (
                      <MessageSquare className="w-4 h-4" />
                    ) : (
                      <Users className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-slate-200 group-hover:text-blue-200 transition-colors truncate">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-slate-400 group-hover:text-blue-300 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
};
