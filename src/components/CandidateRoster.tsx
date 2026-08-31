'use client';

import React from 'react';
import { Candidate } from '@/types/candidate';
import { GameState } from '@/types/game';
import { CandidateAvatar } from './CandidateAvatar';
import { CANDIDATE_MAP } from '@/data/candidates';
import { 
  Shield, 
  Sparkles, 
  Skull, 
  Info, 
  Crosshair, 
  Crown, 
  Users,
  Settings2,
  Mic2,
  ChevronUp,
  ChevronDown,
  Flame,
  ArrowUpDown
} from 'lucide-react';

interface CandidateRosterProps {
  gameState: GameState;
  candidates: Candidate[];
  onSelectCandidate: (candidate: Candidate) => void;
  onOpenCharactersManager?: () => void;
  onMoveCandidate?: (candidateId: string, direction: 'up' | 'down') => void;
  onSetPresetRoster?: (preset: 'all' | 'top8' | 'top6' | 'quick4' | 'youtube11') => void;
}

export const CandidateRoster: React.FC<CandidateRosterProps> = ({
  gameState,
  candidates,
  onSelectCandidate,
  onOpenCharactersManager,
  onMoveCandidate,
  onSetPresetRoster,
}) => {
  const { activeCandidateIds, eliminatedCandidates, stage, winnerId, phase } = gameState;
  const isPreGame = phase === 'IDLE';

  // Always preserve exact speaking/lineup sequence during both pre-game AND active gameplay!
  const orderedIds = (gameState.participatingCandidateIds && gameState.participatingCandidateIds.length > 0)
    ? gameState.participatingCandidateIds
    : activeCandidateIds;

  const participatingCandidates = orderedIds
    .map(id => CANDIDATE_MAP.get(id) || candidates.find(c => c.id === id))
    .filter((c): c is Candidate => Boolean(c));

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      {/* Roster Header */}
      <div className="flex flex-col gap-2.5 p-3.5 bg-[#0b0f19] border border-slate-700/80 rounded-2xl shadow-lg shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-display font-black tracking-wider text-slate-100 uppercase">
              {isPreGame ? 'Debate Speaking Order' : 'Debate Lineup Order'}
            </span>
          </div>

          <div className="text-[11px] font-mono text-cyan-300 font-bold px-2.5 py-0.5 rounded-md bg-slate-950 border border-cyan-500/40 shadow-xs">
            {activeCandidateIds.length} {isPreGame ? 'Lineup' : 'Alive'}
          </div>
        </div>

        {/* In Pre-game, offer Quick YouTube Preset & Manager Button */}
        {isPreGame && (
          <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-800">
            {onSetPresetRoster && (
              <button
                onClick={() => onSetPresetRoster('youtube11')}
                className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white text-[11px] font-mono font-black uppercase transition active:scale-98 shadow-md shadow-rose-500/20 cursor-pointer"
                title="Apply the 11-candidate lineup engineered for YouTube retention"
              >
                <Flame className="w-3.5 h-3.5 text-yellow-200" /> 🎬 YouTube 11 Viral Order
              </button>
            )}

            {onOpenCharactersManager && (
              <button
                onClick={onOpenCharactersManager}
                className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-cyan-300 border border-slate-700/80 text-xs font-mono font-bold uppercase transition active:scale-98 shadow-sm cursor-pointer"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" /> Reorder &amp; Manage Lineup
              </button>
            )}
          </div>
        )}
      </div>

      {/* Candidate List Grid */}
      <div className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-y-auto pr-1 custom-scrollbar">
        {participatingCandidates.map((candidate, idx) => {
          const isAlive = activeCandidateIds.includes(candidate.id);
          const isSpeaking = stage.speakerId === candidate.id;
          const isAttacking = stage.actionType === 'attack' && stage.speakerId === candidate.id;
          const isTarget = stage.targetId === candidate.id;
          const isPresident = winnerId === candidate.id;
          const eliminatedInfo = eliminatedCandidates.find(e => e.candidateId === candidate.id);
          const isFirst = idx === 0;
          const isLast = idx === participatingCandidates.length - 1;

          return (
            <div
              key={candidate.id}
              onClick={() => onSelectCandidate(candidate)}
              className={`group relative flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300 cursor-pointer select-none ${
                isSpeaking || isTarget || isPresident ? 'z-20' : 'z-0'
              } ${
                isPresident
                  ? 'bg-gradient-to-r from-amber-950/90 to-[#0e1424] border-amber-400 shadow-xl shadow-amber-500/30'
                  : isSpeaking
                  ? 'bg-[#0f182c] border-2 shadow-xl scale-[1.02] translate-x-1'
                  : isTarget
                  ? 'bg-red-950/60 border-2 border-red-500 shadow-xl shadow-red-950/40'
                  : isAlive
                  ? 'bg-[#0b0f19]/90 border-slate-750 hover:bg-[#101726] hover:border-slate-600 shadow-sm'
                  : 'bg-slate-950/40 border-slate-900 opacity-40 grayscale hover:opacity-70'
              }`}
              style={{
                borderColor: isSpeaking
                  ? (candidate.color.primary || '#06b6d4')
                  : undefined,
                boxShadow: isSpeaking
                  ? `0 0 25px ${candidate.color.primary}33`
                  : undefined,
              }}
            >
              {/* Left Accent Bar */}
              <div 
                className="w-1.5 self-stretch rounded-full transition-all duration-300 shrink-0"
                style={{
                  backgroundColor: isAlive ? candidate.color.primary : '#475569',
                  boxShadow: isSpeaking ? `0 0 12px ${candidate.color.primary}` : undefined,
                }}
              />

              {/* Speaking Order Slot Badge */}
              <div 
                className={`flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-mono font-black shrink-0 transition-transform duration-200 ${
                  isSpeaking
                    ? 'bg-cyan-400 text-black shadow-md shadow-cyan-400/50 scale-110 font-black'
                    : isFirst 
                    ? 'bg-amber-500 text-black' 
                    : isLast 
                    ? 'bg-purple-900 text-purple-200 border border-purple-700' 
                    : 'bg-slate-950 text-cyan-300 border border-slate-800'
                }`}
                title={`Slot #${idx + 1} in debate speaking sequence`}
              >
                #{idx + 1}
              </div>

              {/* Avatar Icon / Custom Image */}
              <CandidateAvatar
                candidate={candidate}
                budget={gameState.candidateBudgets?.[candidate.id] ?? candidate.initialBudget ?? 100}
                size="md"
                isSpeaking={isSpeaking}
                isAttacking={false}
                isTarget={isTarget}
                isEliminated={!isPreGame && !isAlive}
                isPresident={isPresident}
                showBadge={false}
              />

              {/* Info Column */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className={`text-sm font-display font-black tracking-tight truncate ${isAlive ? 'text-white' : 'text-stone-400'}`}>
                      {candidate.name}
                    </span>
                    {candidate.isCustom && (
                      <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded-md bg-purple-950 text-purple-200 border border-purple-700">
                        Custom
                      </span>
                    )}
                  </div>
                  
                  {/* Status Badge */}
                  {isPresident ? (
                    <span className="flex items-center gap-1 text-[10px] font-display font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-black shadow-md animate-pulse shrink-0">
                      <Crown className="w-3 h-3 text-black" /> President
                    </span>
                  ) : isSpeaking ? (
                    <span 
                      className="flex items-center gap-1 text-[10px] font-display font-black uppercase px-2 py-0.5 rounded-full text-black shadow-md animate-pulse shrink-0"
                      style={{ backgroundColor: candidate.color.primary || '#22d3ee' }}
                    >
                      <Mic2 className="w-3 h-3 text-black" /> Speaking
                    </span>
                  ) : isTarget ? (
                    <span className="flex items-center gap-1 text-[10px] font-display font-black uppercase px-2 py-0.5 rounded-full bg-red-600 text-white shadow-md animate-pulse shrink-0">
                      <Crosshair className="w-3 h-3" /> Target
                    </span>
                  ) : !isPreGame && !isAlive ? (
                    <span className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-stone-900 text-stone-300 border border-stone-800 shrink-0">
                      <Skull className="w-3 h-3 text-red-400" /> R{eliminatedInfo?.eliminatedInRound || 1} Out
                    </span>
                  ) : isPreGame && onMoveCandidate ? (
                    /* Pre-Game Quick Shift Buttons */
                    <div className="flex items-center gap-0.5 bg-slate-950 rounded-lg p-0.5 border border-slate-800 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveCandidate(candidate.id, 'up');
                        }}
                        disabled={isFirst}
                        className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 disabled:opacity-20 transition cursor-pointer disabled:cursor-not-allowed"
                        title="Move Earlier in Lineup Order"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveCandidate(candidate.id, 'down');
                        }}
                        disabled={isLast}
                        className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 disabled:opacity-20 transition cursor-pointer disabled:cursor-not-allowed"
                        title="Move Later in Lineup Order"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                        ${gameState.candidateBudgets?.[candidate.id] ?? candidate.initialBudget ?? 100}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-900/90 text-cyan-300 border border-cyan-500/30">
                        In Race
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-300 mt-1">
                  <span className="truncate font-medium" style={{ color: isAlive ? candidate.color.primary : undefined }}>
                    {candidate.titleRole}
                  </span>

                  {/* Info Action */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCandidate(candidate);
                    }}
                    title="View Full Dossier"
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition opacity-0 group-hover:opacity-100 shrink-0 cursor-pointer"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
