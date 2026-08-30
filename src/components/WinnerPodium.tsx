'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Candidate } from '@/types/candidate';
import { CandidateAvatar } from './CandidateAvatar';
import { Crown, Sparkles, Award, RotateCcw, ShieldCheck, Quote } from 'lucide-react';

interface WinnerPodiumProps {
  winner: Candidate;
  victorySpeech: string;
  eliminatedCount: number;
  totalRounds: number;
  onRestart: () => void;
}

export const WinnerPodium: React.FC<WinnerPodiumProps> = ({
  winner,
  victorySpeech,
  eliminatedCount,
  totalRounds,
  onRestart,
}) => {
  useEffect(() => {
    // Launch celebratory fireworks/confetti
    const duration = 3.5 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ['#f59e0b', '#fbbf24', '#38bdf8', '#ef4444', '#10b981'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ['#f59e0b', '#fbbf24', '#38bdf8', '#ef4444', '#10b981'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  return (
    <div className="w-full max-w-3xl flex flex-col items-center gap-7 rounded-3xl bg-gradient-to-b from-amber-950/60 via-[#0a0d18] to-[#06080d] border-2 border-amber-400 p-8 md:p-12 shadow-2xl shadow-amber-500/30 backdrop-blur-2xl animate-fade-in text-center relative overflow-hidden">
      {/* Background Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.25),transparent_75%)] pointer-events-none" />

      {/* Top Seal Badge */}
      <div className="flex items-center gap-2 px-5 py-2 rounded-full bg-amber-500/20 border border-amber-400/60 text-amber-300 text-xs font-display font-black uppercase tracking-widest shadow-xl animate-pulse">
        <Crown className="w-4 h-4 text-amber-400" />
        Official Presidential Proclamation &bull; Republic of Valoria
      </div>

      {/* Winner Spotlight Avatar */}
      <div className="relative mt-2">
        <div className="absolute -inset-6 rounded-full bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-600 blur-2xl opacity-60 animate-pulse-glow" />
        <CandidateAvatar
          candidate={winner}
          size="xl"
          isSpeaking={true}
          isPresident={true}
        />
      </div>

      {/* Presidential Title */}
      <div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-black text-white tracking-tight uppercase">
          {winner.name}
        </h1>
        <p className="text-lg sm:text-xl font-display font-bold text-amber-400 mt-1.5 tracking-wide">
          Elected President of the Republic of Valoria
        </p>
        <p className="text-sm text-slate-300 font-sans mt-1">
          {winner.titleRole} &bull; &ldquo;{winner.slogan}&rdquo;
        </p>
      </div>

      {/* Inaugural Address Speech Box */}
      <div className="w-full relative rounded-3xl bg-slate-950/95 border-2 border-amber-400/50 p-6 md:p-9 shadow-2xl shadow-slate-950/90 text-left">
        <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider mb-4 pb-3 border-b border-amber-500/20">
          <Sparkles className="w-4 h-4" /> Inaugural Presidential Address:
        </div>
        <div className="relative">
          <Quote className="absolute -top-3 -left-3 w-10 h-10 text-amber-500/10 -z-0 pointer-events-none" />
          <p className="text-lg sm:text-xl md:text-2xl font-sans font-semibold text-white leading-relaxed relative z-10 italic">
            &ldquo;{victorySpeech}&rdquo;
          </p>
        </div>
      </div>

      {/* Battle Stats Summary */}
      <div className="grid grid-cols-3 gap-3.5 w-full">
        <div className="p-4 rounded-2xl bg-[#0b0f19] border border-slate-800 flex flex-col items-center">
          <span className="text-[11px] font-mono text-slate-400 uppercase font-bold">Debate Rounds</span>
          <span className="text-xl font-display font-black text-white mt-1">{totalRounds}</span>
        </div>
        <div className="p-4 rounded-2xl bg-[#0b0f19] border border-slate-800 flex flex-col items-center">
          <span className="text-[11px] font-mono text-slate-400 uppercase font-bold">Rivals Outlasted</span>
          <span className="text-xl font-display font-black text-red-400 mt-1">{eliminatedCount}</span>
        </div>
        <div className="p-4 rounded-2xl bg-[#0b0f19] border border-slate-800 flex flex-col items-center">
          <span className="text-[11px] font-mono text-slate-400 uppercase font-bold">Mandate Status</span>
          <span className="text-xl font-display font-black text-emerald-400 mt-1">Elected</span>
        </div>
      </div>

      {/* Restart Game Button */}
      <button
        onClick={onRestart}
        className="flex items-center gap-2.5 px-9 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-display font-black text-sm tracking-wider uppercase transition-all shadow-xl shadow-amber-500/30 hover:scale-105 active:scale-95 cursor-pointer"
      >
        <RotateCcw className="w-5 h-5 text-slate-950" /> Start New Presidential Election
      </button>
    </div>
  );
};
