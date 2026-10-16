import React from 'react';

interface SessionStatsCardProps {
  totalSessions: number;
  activeSessions: number;
  serversReporting?: string;
}

export const SessionStatsCard: React.FC<SessionStatsCardProps> = ({
  totalSessions,
  activeSessions,
  serversReporting = '5/5 servers reporting',
}) => {
  return (
    <div className="w-full my-1 rounded-2xl border border-slate-800/80 bg-[#0B0F19]/90 shadow-md backdrop-blur-sm overflow-hidden">
      <div className="grid grid-cols-2 divide-x divide-slate-800/80">
        {/* Colonne gauche : Total sessions (all servers) */}
        <div className="p-4 sm:p-5 flex flex-col justify-between">
          <span className="text-slate-400 text-xs sm:text-sm font-normal leading-snug">
            Total sessions (all servers)
          </span>

          <div className="text-white text-3xl sm:text-4xl font-bold font-sans tracking-tight my-1.5 sm:my-2">
            {totalSessions}
          </div>

          <span className="text-slate-500 text-xs font-normal">
            {serversReporting}
          </span>
        </div>

        {/* Colonne droite : Active sessions */}
        <div className="p-4 sm:p-5 flex flex-col justify-start">
          <span className="text-slate-400 text-xs sm:text-sm font-normal leading-snug">
            Active sessions
          </span>

          <div className="text-[#2DD4BF] text-3xl sm:text-4xl font-bold font-sans tracking-tight my-1.5 sm:my-2">
            {activeSessions}
          </div>
        </div>
      </div>
    </div>
  );
};
