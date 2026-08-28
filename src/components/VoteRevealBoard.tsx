'use client';

import React from 'react';
import { RoundVoteTally } from '@/types/game';
import { CANDIDATE_MAP } from '@/data/candidates';
import { CandidateAvatar } from './CandidateAvatar';
import { Vote, Skull, Crown, Award, CheckCircle2 } from 'lucide-react';

interface VoteRevealBoardProps {
  tally: RoundVoteTally;
  isFinalVote: boolean;
  eliminatedId: string | null;
  winnerId?: string | null;
}

export const VoteRevealBoard: React.FC<VoteRevealBoardProps> = ({
  tally,
  isFinalVote,
  eliminatedId,
  winnerId,
}) => {
  const sortedCandidates = Object.entries(tally.tally).sort((a, b) => b[1] - a[1]);
  const maxVotes = Math.max(...Object.values(tally.tally), 1);

  return (
    <div className="w-full max-w-3xl flex flex-col gap-6 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border border-slate-800 p-6 md:p-8 shadow-2xl backdrop-blur-xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Vote className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-wide">
              {isFinalVote ? 'Grand Jury Presidential Vote Totals' : `Round ${tally.round} Elimination Vote Results`}
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {isFinalVote 
                ? 'All 11 candidates cast their secret ballots to determine the President.'
                : 'Highest vote recipient is permanently eliminated from the presidential race.'}
            </p>
          </div>
        </div>

        {tally.tieBreakerOccurred && (
          <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
            Tie-Breaker Applied
          </span>
        )}
      </div>

      {/* Vote Bar Tally Rows */}
      <div className="flex flex-col gap-3">
        {sortedCandidates.map(([candId, count], rank) => {
          const candidate = CANDIDATE_MAP.get(candId);
          if (!candidate) return null;

          const isEliminated = candId === eliminatedId;
          const isWinner = isFinalVote && candId === winnerId;
          const percentage = Math.round((count / maxVotes) * 100);

          return (
            <div
              key={candId}
              className={`relative flex flex-col gap-1.5 p-3.5 rounded-xl border transition-all duration-500 ${
                isWinner
                  ? 'bg-gradient-to-r from-amber-950/70 to-slate-900 border-amber-400 shadow-lg shadow-amber-500/20 scale-[1.02]'
                  : isEliminated
                  ? 'bg-red-950/50 border-red-500 shadow-lg shadow-red-500/20 animate-pulse'
                  : 'bg-slate-900/60 border-slate-800/80'
              }`}
            >
              {/* Top Row: Candidate info and vote count */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-slate-500 w-4">
                    #{rank + 1}
                  </span>
                  <CandidateAvatar
                    candidate={candidate}
                    size="sm"
                    isEliminated={isEliminated}
                    isPresident={isWinner}
                    showBadge={false}
                  />
                  <div>
                    <span className="text-sm font-bold text-white">
                      {candidate.name}
                    </span>
                    <span className="text-[11px] text-slate-400 ml-2">
                      ({candidate.archetypeTitle})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isWinner && (
                    <span className="flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500 text-slate-950 shadow">
                      <Crown className="w-3 h-3" /> Elected President
                    </span>
                  )}
                  {isEliminated && (
                    <span className="flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded bg-red-600 text-white shadow">
                      <Skull className="w-3 h-3" /> Eliminated
                    </span>
                  )}
                  <span className="text-base font-black font-mono text-white px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                    {count} {count === 1 ? 'Vote' : 'Votes'}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isWinner
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-300'
                      : isEliminated
                      ? 'bg-gradient-to-r from-red-600 to-rose-500'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                  }`}
                  style={{ width: `${Math.max(percentage, 5)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Secret Ballots List */}
      <div className="flex flex-col gap-2 pt-3 border-t border-slate-800/80">
        <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
          Individual Ballots Cast:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {tally.votes.map((v, i) => {
            const voter = CANDIDATE_MAP.get(v.voterId);
            const target = CANDIDATE_MAP.get(v.targetId);
            return (
              <div 
                key={i} 
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px]"
              >
                <span className="font-semibold text-slate-300 truncate max-w-[90px]">
                  {voter?.name.split(' ')[0]}
                </span>
                <span className="text-slate-500">&rarr;</span>
                <span className="font-bold text-cyan-400 truncate max-w-[90px]">
                  {target?.name.split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
