'use client';

import React from 'react';
import { Candidate } from '@/types/candidate';
import { GameState } from '@/types/game';
import { CandidateAvatar } from './CandidateAvatar';
import { CANDIDATE_MAP } from '@/data/candidates';
import { 
  Skull, 
  Info, 
  Crosshair, 
  Crown, 
  Mic2,
  ChevronUp,
  ChevronDown
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
  const isEndgame = gameState.round === 99 || 
    phase === 'FINAL_SPEECHES' || 
    phase === 'FINAL_VOTE' || 
    phase === 'FINAL_REVEAL' || 
    phase === 'WINNER' ||
    (phase === 'VOTE_CONFESSIONAL' && Boolean(gameState.finalVoteTally));

  // Always preserve exact speaking/lineup sequence during both pre-game AND active gameplay!
  const orderedIds = (gameState.participatingCandidateIds && gameState.participatingCandidateIds.length > 0)
    ? gameState.participatingCandidateIds
    : activeCandidateIds;

  const participatingCandidates = orderedIds
    .map(id => CANDIDATE_MAP.get(id) || candidates.find(c => c.id === id))
    .filter((c): c is Candidate => Boolean(c));

  return (
    <div className="flex flex-col h-full min-h-0 py-2 sm:py-2.5">
      {/* Candidate List Grid */}
      <div className={`flex-1 min-h-0 flex flex-col ${participatingCandidates.length >= 8 ? 'justify-between' : 'justify-center'} gap-1.5 sm:gap-2 overflow-y-auto scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}>
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
              className={`group relative flex-1 min-h-[52px] ${participatingCandidates.length < 8 ? 'max-h-24' : ''} flex items-center gap-2.5 pl-3.5 pr-3 py-1 sm:py-1.5 rounded-2xl border transition-all duration-300 cursor-pointer select-none overflow-hidden ${
                isSpeaking || isTarget || isPresident ? 'z-20' : 'z-0'
              } ${
                isPresident
                  ? 'bg-gradient-to-r from-amber-950/90 via-[#0e1424] to-amber-950/90 border-amber-400 shadow-xl shadow-amber-500/30'
                  : isSpeaking
                  ? 'bg-[#0f182c] border-2 shadow-xl scale-[1.01]'
                  : isTarget
                  ? 'bg-red-950/60 border-2 border-red-500 shadow-xl shadow-red-950/40'
                  : isAlive
                  ? 'bg-[#0b0f19]/90 border-slate-750 hover:bg-[#101726] hover:border-slate-600 shadow-sm'
                  : isEndgame
                  ? 'bg-slate-950/70 border-slate-800 hover:bg-slate-900/90 shadow-sm'
                  : 'bg-slate-950/40 border-slate-900 opacity-40 grayscale hover:opacity-70'
              }`}
              style={{
                borderColor: isPresident
                  ? '#f59e0b'
                  : isSpeaking
                  ? (candidate.color.primary || '#06b6d4')
                  : isTarget
                  ? '#ef4444'
                  : isAlive
                  ? `${candidate.color.primary || '#38bdf8'}33`
                  : undefined,
                boxShadow: isSpeaking
                  ? `0 0 25px ${candidate.color.primary}33`
                  : isPresident
                  ? '0 0 25px rgba(245, 158, 11, 0.25)'
                  : isTarget
                  ? '0 0 25px rgba(239, 68, 68, 0.25)'
                  : undefined,
              }}
            >
              {/* Symmetrical Left Accent Edge Bar */}
              <div 
                className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-300 pointer-events-none"
                style={{ 
                  backgroundColor: isPresident
                    ? '#f59e0b'
                    : isSpeaking
                    ? (candidate.color.primary || '#06b6d4')
                    : isTarget
                    ? '#ef4444'
                    : isAlive
                    ? (candidate.color.primary || '#38bdf8')
                    : '#475569',
                  boxShadow: (isSpeaking || isPresident || isTarget)
                    ? `0 0 10px ${isPresident ? '#f59e0b' : isTarget ? '#ef4444' : candidate.color.primary}`
                    : undefined
                }}
              />

              {/* Symmetrical Right Accent Edge Bar */}
              <div 
                className="absolute right-0 top-0 bottom-0 w-1 transition-all duration-300 pointer-events-none"
                style={{ 
                  backgroundColor: isPresident
                    ? '#f59e0b'
                    : isSpeaking
                    ? (candidate.color.primary || '#06b6d4')
                    : isTarget
                    ? '#ef4444'
                    : isAlive
                    ? (candidate.color.primary || '#38bdf8')
                    : '#475569',
                  boxShadow: (isSpeaking || isPresident || isTarget)
                    ? `0 0 10px ${isPresident ? '#f59e0b' : isTarget ? '#ef4444' : candidate.color.primary}`
                    : undefined
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
                    <span className={`text-sm font-display font-black tracking-tight truncate ${isAlive || isEndgame ? 'text-white' : 'text-stone-400'}`}>
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
                  ) : isEndgame && !isAlive ? (
                    <span className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-purple-950/80 text-purple-200 border border-purple-700/60 shrink-0">
                      🏛️ Juror
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
                  ) : isEndgame && isAlive ? (
                    <span className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/50 shrink-0">
                      <Crown className="w-3 h-3 text-amber-400" /> Finalist
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-900/90 text-cyan-300 border border-cyan-500/30 shrink-0">
                      In Race
                    </span>
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
