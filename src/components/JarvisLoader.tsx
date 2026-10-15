import React, { useState, useEffect } from 'react';

interface JarvisLoaderProps {
  onComplete: () => void;
  duration?: number; // en ms
}

export const JarvisLoader: React.FC<JarvisLoaderProps> = ({ onComplete, duration = 3200 }) => {
  const [progress, setProgress] = useState(0);
  const [dots, setDots] = useState('');
  const [fadeOut, setFadeOut] = useState(false);

  // Animation des points "........"
  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 8 ? '' : prev + '.'));
    }, 250);
    return () => clearInterval(dotInterval);
  }, []);

  // Progression de 0% à 100%
  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(Math.round((elapsed / duration) * 100), 100);
      setProgress(pct);

      if (pct >= 100) {
        clearInterval(interval);
        setFadeOut(true);
        setTimeout(() => {
          onComplete();
        }, 500); // 500ms de transition fade-out
      }
    }, 30);

    return () => clearInterval(interval);
  }, [duration, onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#05070B] overflow-hidden transition-opacity duration-500 ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Fond grille holographique futuriste */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0, 229, 255, 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 229, 255, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Lueur d'ambiance centrale cyan/émeraude */}
      <div className="absolute w-[450px] h-[450px] rounded-full bg-cyan-500/15 blur-[120px] pointer-events-none animate-pulse" />

      {/* REATEUR HOLOGRAPHIQUE JARVIS (SVG ANIMÉ) */}
      <div className="relative w-72 h-72 sm:w-88 sm:h-88 flex items-center justify-center">
        {/* Anneau externe 1 : Rotation horaire */}
        <div
          className="absolute inset-0 rounded-full border border-cyan-500/30 border-dashed animate-[spin_18s_linear_infinite]"
          style={{ animationDuration: '20s' }}
        />

        {/* Anneau externe 2 : Segments cyan épais avec lueur */}
        <svg
          viewBox="0 0 300 300"
          className="absolute inset-0 w-full h-full animate-[spin_12s_linear_infinite]"
          style={{ filter: 'drop-shadow(0 0 10px rgba(0, 229, 255, 0.5))' }}
        >
          {/* Arc supérieur */}
          <path
            d="M 50 150 A 100 100 0 0 1 250 150"
            fill="none"
            stroke="#00e5ff"
            strokeWidth="3"
            strokeDasharray="18 12 40 8 10 15"
          />
          {/* Arc inférieur */}
          <path
            d="M 250 150 A 100 100 0 0 1 50 150"
            fill="none"
            stroke="#00e5ff"
            strokeWidth="3"
            strokeDasharray="30 8 12 18 6 12"
          />
          {/* Repères angulaires */}
          <circle cx="150" cy="50" r="3" fill="#00e5ff" />
          <circle cx="150" cy="250" r="3" fill="#00e5ff" />
          <circle cx="50" cy="150" r="3" fill="#00e5ff" />
          <circle cx="250" cy="150" r="3" fill="#00e5ff" />
        </svg>

        {/* Anneau intermédiaire 3 : Rotation anti-horaire avec accent ambre/orange (comme sur l'image) */}
        <svg
          viewBox="0 0 300 300"
          className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)] animate-[spin_9s_linear_infinite_reverse]"
        >
          {/* Arc cyan intérieur */}
          <circle
            cx="150"
            cy="150"
            r="82"
            fill="none"
            stroke="#00b0ff"
            strokeWidth="4"
            strokeDasharray="90 30 40 20 10 15"
            opacity="0.85"
          />
          {/* Segment Ambre/Orange doré typique de JARVIS */}
          <path
            d="M 80 170 A 82 82 0 0 1 72 130"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="6"
            strokeLinecap="round"
            style={{ filter: 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.9))' }}
          />
          {/* Points indicateurs jaunes */}
          <circle cx="110" cy="85" r="2.5" fill="#facc15" />
          <circle cx="130" cy="74" r="2.5" fill="#facc15" />
          <circle cx="150" cy="70" r="2.5" fill="#facc15" />
          <circle cx="170" cy="74" r="2.5" fill="#facc15" />
        </svg>

        {/* Anneau de graduation intérieur : Graduation HUD avec graduations rayonnantes */}
        <svg
          viewBox="0 0 300 300"
          className="absolute inset-4 w-[calc(100%-32px)] h-[calc(100%-32px)] animate-[spin_30s_linear_infinite]"
        >
          <circle
            cx="150"
            cy="150"
            r="64"
            fill="none"
            stroke="#00e5ff"
            strokeWidth="1.5"
            strokeDasharray="4 6"
            opacity="0.6"
          />
        </svg>

        {/* Balayage radar / scanline holographique */}
        <div className="absolute inset-8 rounded-full border border-cyan-400/20 overflow-hidden pointer-events-none">
          <div className="w-full h-1/2 bg-gradient-to-b from-cyan-400/20 to-transparent animate-[pulse_2s_ease-in-out_infinite]" />
        </div>

        {/* CŒUR CENTRAL : LOGO J.A.R.V.I.S. */}
        <div className="relative z-10 flex flex-col items-center justify-center select-none">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-[#070B13]/90 border border-cyan-400/60 shadow-[0_0_30px_rgba(0,229,255,0.4)] flex flex-col items-center justify-center">
            {/* Ligne lumineuse centrale */}
            <span
              className="text-lg sm:text-2xl font-black tracking-widest text-white font-mono"
              style={{
                textShadow: '0 0 12px #00e5ff, 0 0 25px rgba(0, 229, 255, 0.8)',
                letterSpacing: '0.22em',
              }}
            >
              J.A.R.V.I.S.
            </span>

            {/* Petite étiquette HUD */}
            <span className="text-[9px] font-mono tracking-wider text-cyan-400 uppercase mt-1 opacity-80">
              SYS ONLINE
            </span>
          </div>
        </div>
      </div>

      {/* TEXTE DEMANDÉ : "CHARGEMENT DE JARVIS........" */}
      <div className="mt-8 text-center space-y-3 z-10 px-4">
        <div className="font-mono font-black text-sm sm:text-base text-cyan-300 tracking-wider">
          <span>CHARGEMENT DE JARVIS</span>
          <span className="inline-block w-16 text-left text-cyan-400">{dots}</span>
        </div>

        {/* Jauge de progression technologique fine */}
        <div className="w-56 sm:w-72 bg-slate-900/80 border border-cyan-500/30 rounded-full h-2 p-0.5 mx-auto overflow-hidden shadow-[0_0_15px_rgba(0,229,255,0.2)]">
          <div
            className="h-full bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 rounded-full transition-all duration-75 ease-out shadow-[0_0_10px_#00e5ff]"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400/80 w-56 sm:w-72 mx-auto px-1">
          <span>V1.0 MULTI-DEVICE</span>
          <span className="font-bold">{progress}%</span>
        </div>
      </div>
    </div>
  );
};
