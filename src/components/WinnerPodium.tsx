'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Candidate } from '@/types/candidate';
import { CandidateAvatar } from './CandidateAvatar';
import { Crown, Sparkles, Award, RotateCcw, ShieldCheck } from 'lucide-react';

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
    <div className="w-full max-w-2xl flex flex-col items-center gap-6 rounded-3xl bg-gradient-to-b from-amber-950/50 via-slate-950 to-slate-950 border-2 border-amber-400/80 p-8 md:p-12 shadow-2xl shadow-amber-500/20 backdrop-blur-xl animate-fade-in text-center relative overflow-hidden">
      {/* Background Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.15),transparent_75%)] pointer-events-none" />

      {/* Top Seal Badge */}
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-black uppercase tracking-widest shadow-lg animate-pulse">
        <Crown className="w-4 h-4 text-amber-400" />
        Official Presidential Proclamation
      </div>

      {/* Winner Spotlight Avatar */}
      <div className="relative mt-2">
        <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-600 blur-xl opacity-50 animate-pulse-glow" />
        <CandidateAvatar
          candidate={winner}
          size="xl"
          isSpeaking={true}
          isPresident={true}
        />
      </div>

      {/* Presidential Title */}
      <div>
        <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight uppercase">
          {winner.name}
        </h1>
        <p className="text-base font-bold text-amber-400 mt-1">
          President of the Republic of Valoria
        </p>
        <p className="text-xs text-slate-400 font-mono mt-0.5">
          {winner.titleRole} &bull; &ldquo;{winner.slogan}&rdquo;
        </p>
      </div>

      {/* Inaugural Address Speech Box */}
      <div className="w-full relative rounded-2xl bg-slate-900/90 border border-amber-400/40 p-6 md:p-8 shadow-xl shadow-slate-950/80 text-left">
        <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider mb-3">
          <Sparkles className="w-4 h-4" /> Inaugural Presidential Address:
        </div>
        <p className="text-base md:text-lg font-medium text-slate-100 leading-relaxed italic">
          "{victorySpeech}"
        </p>
      </div>

      {/* Battle Stats Summary */}
      <div className="grid grid-cols-3 gap-3 w-full">
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Debate Rounds</span>
          <span className="text-lg font-black text-white mt-0.5">{totalRounds}</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Opponents Outlasted</span>
          <span className="text-lg font-black text-red-400 mt-0.5">{eliminatedCount}</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Grand Jury Mandate</span>
          <span className="text-lg font-black text-emerald-400 mt-0.5">Elected</span>
        </div>
      </div>

      {/* Restart Game Button */}
      <button
        onClick={onRestart}
        className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm tracking-wider uppercase transition-all shadow-xl shadow-amber-500/30 hover:scale-105 active:scale-95"
      >
        <RotateCcw className="w-4 h-4" /> Start New Presidential Election
      </button>
    </div>
  );
};
