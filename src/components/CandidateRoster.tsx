'use client';

import React from 'react';
import { Candidate } from '@/types/candidate';
import { GameState } from '@/types/game';
import { CandidateAvatar } from './CandidateAvatar';
import { 
  Shield, 
  Sparkles, 
  Skull, 
  Info, 
  Crosshair, 
  Crown, 
  Users,
  Settings2,
  Mic2
} from 'lucide-react';

interface CandidateRosterProps {
  gameState: GameState;
  candidates: Candidate[];
  onSelectCandidate: (candidate: Candidate) => void;
  onOpenCharactersManager?: () => void;
}

export const CandidateRoster: React.FC<CandidateRosterProps> = ({
  gameState,
  candidates,
  onSelectCandidate,
  onOpenCharactersManager,
}) => {
  const { activeCandidateIds, eliminatedCandidates, stage, winnerId, phase } = gameState;
  const isPreGame = phase === 'IDLE';

  // Filter candidates to only those participating in the game (or all candidates if pre-game overview)
  const participatingCandidates = candidates.filter(c => 
    isPreGame ? activeCandidateIds.includes(c.id) : (activeCandidateIds.includes(c.id) || eliminatedCandidates.some(e => e.candidateId === c.id))
  );

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Roster Header */}
      <div className="flex flex-col gap-2.5 p-3.5 bg-[#0b0f19] border border-slate-700/80 rounded-2xl shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-display font-black tracking-wider text-slate-100 uppercase">
              {isPreGame ? 'Election Lineup' : 'Active Contenders'}
            </span>
          </div>

          <div className="text-[11px] font-mono text-cyan-300 font-bold px-2.5 py-0.5 rounded-md bg-slate-950 border border-cyan-500/40 shadow-xs">
            {activeCandidateIds.length} {isPreGame ? 'Contenders' : 'Alive'}
          </div>
        </div>

        {/* In Pre-game, offer button to switch to Characters Management tab */}
        {isPreGame && onOpenCharactersManager && (
          <button
            onClick={onOpenCharactersManager}
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-cyan-300 border border-slate-700/80 text-xs font-mono font-bold uppercase transition active:scale-98 shadow-sm"
          >
            <Settings2 className="w-3.5 h-3.5 text-cyan-400" /> Configure Lineup &amp; AI
          </button>
        )}
      </div>

      {/* Candidate List Grid */}
      <div className="grid grid-cols-1 gap-2.5 overflow-y-auto pr-1 max-h-[calc(100vh-280px)] custom-scrollbar">
        {participatingCandidates.map((candidate) => {
          const isAlive = activeCandidateIds.includes(candidate.id);
          const isSpeaking = stage.speakerId === candidate.id;
          const isAttacking = stage.actionType === 'attack' && stage.speakerId === candidate.id;
          const isTarget = stage.targetId === candidate.id;
          const isPresident = winnerId === candidate.id;
          const eliminatedInfo = eliminatedCandidates.find(e => e.candidateId === candidate.id);

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

              {/* Avatar Icon / Custom Image */}
              <CandidateAvatar
                candidate={candidate}
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
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition opacity-0 group-hover:opacity-100 shrink-0"
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
