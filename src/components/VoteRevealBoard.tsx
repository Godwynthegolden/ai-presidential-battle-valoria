'use client';

import React from 'react';
import { RoundVoteTally } from '@/types/game';
import { CANDIDATE_MAP } from '@/data/candidates';
import { CandidateAvatar } from './CandidateAvatar';
import { 
  Vote, 
  Skull, 
  Crown, 
  Award, 
  CheckCircle2, 
  Swords, 
  ShieldCheck, 
  AlertTriangle,
  Flame
} from 'lucide-react';

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
  const betrayals = tally.votes.filter(v => v.isBetrayal);

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
                ? 'All participating candidates cast secret ballots for the President of Valoria.'
                : 'Highest vote recipient is eliminated from the presidential race.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {betrayals.length > 0 && !isFinalVote && (
            <span className="flex items-center gap-1 text-[10px] font-mono font-black uppercase px-2.5 py-1 rounded-full bg-red-950 text-red-300 border border-red-700 animate-pulse shadow-md">
              <Swords className="w-3.5 h-3.5 text-red-400" /> {betrayals.length} {betrayals.length === 1 ? 'Betrayal' : 'Betrayals'} Uncovered!
            </span>
          )}

          {tally.tieBreakerOccurred && (
            <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
              Tie-Breaker Applied
            </span>
          )}
        </div>
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
                      ({candidate.titleRole})
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

      {/* Secret Ballots List with Alliance & Betrayal Flags */}
      <div className="flex flex-col gap-2.5 pt-3 border-t border-slate-800/80">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
            Individual Ballots & Backroom Deal Verifications:
          </span>
          <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
            (Pacts vs Votes Verified)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {tally.votes.map((v, i) => {
            const voter = CANDIDATE_MAP.get(v.voterId);
            const target = CANDIDATE_MAP.get(v.targetId);
            const ally = v.betrayedAllyId || v.pactWithId ? CANDIDATE_MAP.get(v.betrayedAllyId || v.pactWithId!) : null;

            return (
              <div 
                key={i} 
                className={`flex flex-col gap-1 p-2 rounded-xl border text-xs transition-all ${
                  v.isBetrayal 
                    ? 'bg-red-950/70 border-red-600/80 shadow-md shadow-red-950/40' 
                    : v.isHonoredPact 
                    ? 'bg-emerald-950/40 border-emerald-700/60' 
                    : 'bg-slate-950/80 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="text-white">{voter?.name.split(' ')[0]}</span>
                    <span className="text-slate-500">&rarr;</span>
                    <span className="text-cyan-400">{target?.name.split(' ')[0]}</span>
                  </div>

                  {v.isBetrayal ? (
                    <span className="flex items-center gap-1 text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded bg-red-600 text-white animate-pulse">
                      <Swords className="w-2.5 h-2.5" /> BETRAYAL!
                    </span>
                  ) : v.isHonoredPact ? (
                    <span className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-900/80 text-emerald-300 border border-emerald-700/50">
                      <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" /> PACT KEPT
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono text-slate-500">
                      Independent
                    </span>
                  )}
                </div>

                {/* Betrayal or Pact Subtitle Note */}
                {v.isBetrayal && ally && (
                  <p className="text-[10px] font-mono text-red-300 leading-tight">
                    &bull; Broke secret pact with <strong className="text-white">{ally.name.split(' ')[0]}</strong> to eliminate {target?.name.split(' ')[0]}!
                  </p>
                )}

                {v.isHonoredPact && ally && (
                  <p className="text-[10px] font-mono text-emerald-400/90 leading-tight">
                    &bull; Voted alongside <strong className="text-white">{ally.name.split(' ')[0]}</strong> as secretly agreed in the Capitol backroom.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
