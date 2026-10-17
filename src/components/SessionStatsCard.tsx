import React from 'react';
import { Server, Activity, ShieldAlert, Cpu } from 'lucide-react';

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
    <div className="bg-[#0B0F1C] border border-blue-900/30 rounded-2xl p-4 sm:p-5 shadow-lg shadow-blue-950/20">
      <div className="grid grid-cols-2 gap-4 divide-x divide-blue-950/60">
        {/* Total Sessions */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Server className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-medium text-[11px] uppercase tracking-wider text-slate-400">Total Sessions</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight">
            {totalSessions.toLocaleString()}
          </div>
          <p className="text-[10px] text-slate-500">
            Comptes WhatsApp associés à vie
          </p>
        </div>

        {/* Active Sessions */}
        <div className="pl-4 space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium text-[11px] uppercase tracking-wider text-emerald-400">Active Sessions</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400 tracking-tight">
            {activeSessions.toLocaleString()}
          </div>
          <p className="text-[10px] text-slate-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
            <span>{serversReporting}</span>
          </p>
        </div>
      </div>
    </div>
  );
};
