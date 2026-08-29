'use client';

import React from 'react';
import { GameState } from '@/types/game';
import { NineRouterConfigState } from './NineRouterSettingsModal';
import { Candidate } from '@/types/candidate';
import { CANDIDATE_MAP } from '@/data/candidates';
import { CandidateAvatar } from './CandidateAvatar';
import { 
  X, 
  Flame, 
  Cpu, 
  Zap, 
  Users, 
  Skull, 
  ShieldCheck, 
  Radio, 
  Swords, 
  Eye, 
  Vote, 
  Crown,
  Sparkles,
  Settings
} from 'lucide-react';

interface ElectionIntelModalProps {
  isOpen: boolean;
  gameState: GameState;
  nineRouterConfig: NineRouterConfigState;
  onClose: () => void;
  onOpenSettings: () => void;
  onSelectCandidate: (candidate: Candidate) => void;
}

export const ElectionIntelModal: React.FC<ElectionIntelModalProps> = ({
  isOpen,
  gameState,
  nineRouterConfig,
  onClose,
  onOpenSettings,
  onSelectCandidate,
}) => {
  if (!isOpen) return null;

  const isConfigured = Boolean(nineRouterConfig.baseUrl && nineRouterConfig.apiKey);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0b0f19] border-2 border-slate-750 p-6 md:p-8 shadow-2xl custom-scrollbar flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-400 shadow-md shadow-amber-500/10">
              <Flame className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-display font-black text-white uppercase tracking-wide flex items-center gap-2">
                Republic of Valoria <span className="text-cyan-400">Election Intel</span>
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Official Battle Protocol, AI Engine Status &amp; Candidate History
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 9router Status Card */}
          <div 
            onClick={() => {
              onClose();
              onOpenSettings();
            }}
            className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition flex flex-col gap-2 shadow-sm group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-300 uppercase font-bold flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-cyan-400 group-hover:rotate-45 transition-transform" /> 9router Engine Status
              </span>
              <span 
                className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full ${
                  isConfigured 
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/80 shadow-xs' 
                    : 'bg-amber-950 text-amber-300 border border-amber-600/80 animate-pulse'
                }`}
              >
                {isConfigured ? 'Active & Ready' : 'Setup Required'}
              </span>
            </div>
            <div className="text-sm font-mono text-cyan-300 truncate font-black mt-1">
              {nineRouterConfig.model || 'No model chosen'}
            </div>
            <div className="text-xs font-mono text-slate-400 truncate">
              {nineRouterConfig.baseUrl}
            </div>
            <div className="text-[11px] font-sans text-slate-400 mt-1 flex items-center gap-1 group-hover:text-cyan-300 transition">
              <Settings className="w-3 h-3" /> Click to change model or API endpoint
            </div>
          </div>

          {/* Active Contenders Breakdown */}
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-sm flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-200 uppercase font-bold flex items-center gap-1.5">
                <Users className="w-4 h-4 text-cyan-400" /> Active Contenders ({gameState.activeCandidateIds.length})
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Round {gameState.round}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1 max-h-32 overflow-y-auto custom-scrollbar">
              {gameState.activeCandidateIds.map(id => {
                const c = CANDIDATE_MAP.get(id);
                if (!c) return null;
                return (
                  <button
                    key={id}
                    onClick={() => {
                      onClose();
                      onSelectCandidate(c);
                    }}
                    className="px-2.5 py-1 rounded-xl text-xs font-sans font-semibold border bg-slate-900 hover:scale-105 transition cursor-pointer flex items-center gap-1.5"
                    style={{ borderColor: `${c.color.primary}70`, color: c.color.primary }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color.primary }} />
                    {c.name.split(' ')[0]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Elimination History */}
        <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-sm flex flex-col gap-2">
          <span className="text-xs font-mono text-slate-200 uppercase font-bold flex items-center gap-1.5">
            <Skull className="w-4 h-4 text-red-400" /> Elimination History ({gameState.eliminatedCandidates.length})
          </span>
          {gameState.eliminatedCandidates.length === 0 ? (
            <p className="text-xs text-slate-400 font-mono italic py-2">
              No candidates have been eliminated yet. All contenders are active!
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              {gameState.eliminatedCandidates.map((e, idx) => {
                const c = CANDIDATE_MAP.get(e.candidateId);
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (c) {
                        onClose();
                        onSelectCandidate(c);
                      }
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs cursor-pointer hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-2">
                      {c && <CandidateAvatar candidate={c} size="xs" isEliminated={true} showBadge={false} />}
                      <span className="text-stone-300 font-medium line-through">
                        {c?.name}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-red-400">
                      R{e.eliminatedInRound} ({e.voteCount} votes)
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Valoria Election Protocol 6-Step Guide */}
        <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-sm flex flex-col gap-3">
          <span className="text-xs font-mono text-slate-200 uppercase font-bold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" /> Valoria Presidential Battle Protocol
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300 font-sans">
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 shrink-0 shadow-xs shadow-cyan-400" />
              <div>
                <strong className="text-white font-bold block">1. Campaign Speeches</strong>
                <span className="text-slate-400">Candidates deliver high-energy broadcast speeches (40 words max).</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="w-2 h-2 rounded-full bg-red-400 mt-1.5 shrink-0 shadow-xs shadow-red-400" />
              <div>
                <strong className="text-white font-bold block">2. 1v1 Public Attacks</strong>
                <span className="text-slate-400">Heated rival confrontations &amp; public policy denunciations (30 words max).</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0 shadow-xs shadow-emerald-400" />
              <div>
                <strong className="text-white font-bold block">3. Leaked Backroom Pacts</strong>
                <span className="text-slate-400">CCTV surveillance intercepts secret deals &amp; target plots in Capitol corridors.</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 shrink-0 shadow-xs shadow-purple-400" />
              <div>
                <strong className="text-white font-bold block">4. Secret Ballots &amp; Betrayals</strong>
                <span className="text-slate-400">Dramatic reveal of individual ballots; broken pacts are uncovered!</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0 shadow-xs shadow-amber-400" />
              <div>
                <strong className="text-white font-bold block">5. Elimination Cycle</strong>
                <span className="text-slate-400">Highest vote recipient leaves the stage until the Top 3 finalists remain.</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="w-2 h-2 rounded-full bg-yellow-400 mt-1.5 shrink-0 shadow-xs shadow-yellow-400" />
              <div>
                <strong className="text-white font-bold block">6. Grand Presidential Inauguration</strong>
                <span className="text-slate-400">Grand jury elects the ultimate President with confetti &amp; inaugural address.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
