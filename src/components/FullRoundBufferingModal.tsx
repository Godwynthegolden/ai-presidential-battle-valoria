'use client';

import React from 'react';
import { Zap, Mic, Cpu, Lock, CheckCircle2, RefreshCw } from 'lucide-react';
import { Candidate } from '@/types/candidate';
import { CandidateAvatar } from './CandidateAvatar';
import { NineRouterConfigState } from './NineRouterSettingsModal';

interface FullRoundBufferingModalProps {
  isOpen: boolean;
  progress: {
    current: number;
    total: number;
    stepLabel: string;
    percent: number;
    currentCandidateId?: string;
  };
  activeCandidates: Candidate[];
  completedCandidateIds?: string[];
  nineRouterConfig?: NineRouterConfigState;
}

export const FullRoundBufferingModal: React.FC<FullRoundBufferingModalProps> = ({
  isOpen,
  progress,
  activeCandidates,
  completedCandidateIds = [],
  nineRouterConfig,
}) => {
  if (!isOpen) return null;

  const percent = Math.min(100, Math.max(0, progress.percent || Math.round((progress.current / Math.max(1, progress.total)) * 100)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-xl animate-fade-in select-none">
      {/* Dynamic Background Aura */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-cyan-500/15 via-purple-600/15 to-transparent rounded-full blur-[120px] animate-pulse" />
      </div>

      <div className="relative w-full max-w-3xl rounded-3xl bg-slate-950/95 border-2 border-cyan-500/50 p-6 sm:p-8 shadow-2xl shadow-cyan-950/80 flex flex-col items-center text-center gap-6 overflow-hidden">
        {/* Top Header Badge */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/50 shadow-inner">
          <Lock className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-300">
            Round 1 Pre-Buffering Gate Active
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
        </div>

        {/* Title & Description */}
        <div className="flex flex-col items-center gap-1.5 max-w-xl">
          <h2 className="text-2xl sm:text-3xl font-display font-black text-white uppercase tracking-tight flex items-center gap-2.5">
            <Zap className="w-7 h-7 text-cyan-400 animate-bounce" />
            Full-Round Pre-Buffering
          </h2>
          <p className="text-xs sm:text-sm font-sans text-slate-300 leading-relaxed">
            Synthesizing all Round 1 opening speeches, attacks, leaked CCTV corridor deals, and secret voting confessionals with neural TTS voices for 100% zero-latency broadcast.
          </p>
        </div>

        {/* Big Progress Meter & Percentage */}
        <div className="w-full flex flex-col items-center gap-3">
          <div className="w-full flex items-center justify-between text-xs font-mono px-1">
            <span className="text-slate-400 font-bold flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Model: <strong className="text-cyan-300">{nineRouterConfig?.model || '9router'}</strong></span>
            </span>
            <span className="text-cyan-300 font-black text-sm">
              {percent}% Complete
            </span>
          </div>

          {/* Progress Bar Container */}
          <div className="w-full h-4 bg-slate-900 rounded-full border border-cyan-500/30 overflow-hidden p-0.5 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-emerald-400 rounded-full transition-all duration-500 shadow-md shadow-cyan-500/50 relative"
              style={{ width: `${percent}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
          </div>

          <div className="flex items-center justify-between w-full text-[11px] font-mono text-slate-400 px-1">
            <span className="flex items-center gap-1.5 text-purple-300">
              <Mic className="w-3.5 h-3.5 text-purple-400" />
              <span>Fish.Audio TTS Voice Pool Active</span>
            </span>
            <span className="font-bold text-white bg-slate-900/90 border border-slate-750 px-2.5 py-0.5 rounded-lg">
              {progress.current} / {progress.total} Steps Buffered
            </span>
          </div>
        </div>

        {/* Live Active Operation Telemetry Pill */}
        <div className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-cyan-950/40 border border-purple-500/40 text-xs font-mono text-cyan-200 shadow-lg">
          <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
          <span className="truncate font-medium">
            {progress.stepLabel || 'Initializing high-speed neural synthesis pipeline...'}
          </span>
        </div>

        {/* Candidate Checklist Grid */}
        <div className="w-full flex flex-col gap-2">
          <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider text-left">
            Active Contenders in Round 1:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
            {activeCandidates.map((cand) => {
              const isCompleted = completedCandidateIds.includes(cand.id);
              const isCurrent = progress.currentCandidateId === cand.id;

              return (
                <div
                  key={cand.id}
                  className={`flex items-center gap-2 p-2 rounded-xl border transition ${
                    isCompleted
                      ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                      : isCurrent
                      ? 'bg-cyan-950/50 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/20 animate-pulse'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="shrink-0">
                    <CandidateAvatar candidate={cand} size="sm" showBadge={false} />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1 text-left">
                    <span className="text-xs font-bold truncate text-white">{cand.name}</span>
                    <span className="text-[10px] font-mono truncate text-slate-400">{cand.titleRole}</span>
                  </div>
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : isCurrent ? (
                    <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-slate-700 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Guarantee */}
        <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-slate-400 border-t border-slate-800/80 pt-4 w-full">
          <span className="text-emerald-400 font-bold">✓ Zero Latency Playback Guaranteed</span>
          <span className="text-slate-600">•</span>
          <span>Broadcast unlocks automatically at 100%</span>
        </div>
      </div>
    </div>
  );
};
