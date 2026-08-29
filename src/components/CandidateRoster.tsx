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
  Settings2
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
    <div className="flex flex-col gap-2.5 h-full">
      {/* Roster Header */}
      <div className="flex flex-col gap-2 p-3 bg-slate-900/90 border border-slate-800 rounded-xl backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold tracking-wider text-slate-200 uppercase">
              {isPreGame ? 'Election Lineup' : 'Active Contenders'}
            </span>
          </div>

          <div className="text-[11px] font-mono text-cyan-400 font-bold px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
            {activeCandidateIds.length} {isPreGame ? 'Contenders' : 'Alive'}
          </div>
        </div>

        {/* In Pre-game, offer button to switch to Characters Management tab */}
        {isPreGame && onOpenCharactersManager && (
          <button
            onClick={onOpenCharactersManager}
            className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-cyan-300 border border-slate-800 text-[10px] font-mono font-bold uppercase transition"
          >
            <Settings2 className="w-3 h-3 text-cyan-400" /> Configure Lineup &amp; Characters
          </button>
        )}
      </div>

      {/* Candidate List Grid */}
      <div className="grid grid-cols-1 gap-2 overflow-y-auto pr-1 max-h-[calc(100vh-280px)] custom-scrollbar">
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
              className={`group relative flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-300 cursor-pointer select-none ${
                isPresident
                  ? 'bg-gradient-to-r from-amber-950/80 to-slate-900 border-amber-400/80 shadow-lg shadow-amber-500/20'
                  : isSpeaking
                  ? 'bg-slate-900 border-cyan-400/80 shadow-md shadow-cyan-500/20 translate-x-1'
                  : isTarget
                  ? 'bg-red-950/40 border-red-500/70 shadow-md shadow-red-500/20'
                  : isAlive
                  ? 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                  : 'bg-slate-950/40 border-slate-900 opacity-40 grayscale hover:opacity-60'
              }`}
            >
              {/* Left Accent Bar */}
              <div 
                className="w-1 self-stretch rounded-full transition-all duration-300"
                style={{
                  backgroundColor: isAlive ? candidate.color.primary : '#44403c',
                  boxShadow: isSpeaking ? `0 0 10px ${candidate.color.primary}` : undefined,
                }}
              />

              {/* Avatar Icon / Custom Image */}
              <CandidateAvatar
                candidate={candidate}
                size="md"
                isSpeaking={isSpeaking}
                isAttacking={isAttacking}
                isTarget={isTarget}
                isEliminated={!isPreGame && !isAlive}
                isPresident={isPresident}
                showBadge={false}
              />

              {/* Info Column */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className={`text-xs font-bold truncate ${isAlive ? 'text-white' : 'text-stone-400'}`}>
                      {candidate.name}
                    </span>
                    {candidate.isCustom && (
                      <span className="text-[8px] font-mono font-bold uppercase px-1 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
                        Custom
                      </span>
                    )}
                  </div>
                  
                  {/* Status Badge */}
                  {isPresident ? (
                    <span className="flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 shadow-sm animate-pulse">
                      <Crown className="w-2.5 h-2.5" /> President
                    </span>
                  ) : isSpeaking ? (
                    <span className="flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-cyan-500 text-slate-950 shadow-sm animate-pulse">
                      <Sparkles className="w-2.5 h-2.5" /> Speaking
                    </span>
                  ) : isTarget ? (
                    <span className="flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-red-600 text-white shadow-sm animate-pulse">
                      <Crosshair className="w-2.5 h-2.5" /> Target
                    </span>
                  ) : !isPreGame && !isAlive ? (
                    <span className="flex items-center gap-1 text-[9px] font-medium uppercase px-1.5 py-0.5 rounded bg-stone-900 text-stone-400 border border-stone-800">
                      <Skull className="w-2.5 h-2.5 text-red-400" /> R{eliminatedInfo?.eliminatedInRound || 1} Out
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-800/80 text-cyan-300 border border-cyan-500/30">
                      In Race
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                  <span className="truncate" style={{ color: isAlive ? candidate.color.primary : undefined }}>
                    {candidate.titleRole}
                  </span>

                  {/* Info Action */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCandidate(candidate);
                    }}
                    title="View Full Dossier"
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition opacity-0 group-hover:opacity-100"
                  >
                    <Info className="w-3.5 h-3.5" />
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
