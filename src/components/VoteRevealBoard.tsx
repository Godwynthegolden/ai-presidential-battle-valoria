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
    <div className="w-full max-w-3xl flex flex-col gap-6 rounded-3xl bg-gradient-to-b from-[#0e1424] via-[#090d17] to-[#06080d] border border-slate-700/80 p-6 md:p-8 shadow-2xl backdrop-blur-2xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-purple-500/15 border border-purple-500/40 text-purple-400 shadow-md shadow-purple-500/10">
            <Vote className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-display font-black text-white uppercase tracking-wide">
              {isFinalVote ? 'Grand Jury Presidential Ballot Totals' : `Round ${tally.round} Elimination Vote Results`}
            </h2>
            <p className="text-xs text-slate-300 font-sans mt-0.5">
              {isFinalVote 
                ? 'All participating contenders cast secret ballots for the ultimate President of Valoria.'
                : 'Highest vote recipient is eliminated from the presidential race.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {betrayals.length > 0 && !isFinalVote && (
            <span className="flex items-center gap-1.5 text-xs font-display font-black uppercase px-3 py-1 rounded-full bg-red-950 text-red-300 border border-red-600 animate-pulse shadow-lg shadow-red-950/50">
              <Swords className="w-3.5 h-3.5 text-red-400" /> {betrayals.length} {betrayals.length === 1 ? 'Betrayal' : 'Betrayals'}!
            </span>
          )}

          {tally.tieBreakerOccurred && (
            <span className="text-xs font-mono font-bold uppercase px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50">
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
              className={`relative flex flex-col gap-2 p-4 rounded-2xl border transition-all duration-500 ${
                isWinner
                  ? 'bg-gradient-to-r from-amber-950/80 to-[#0e1424] border-amber-400 shadow-xl shadow-amber-500/30 scale-[1.02]'
                  : isEliminated
                  ? 'bg-red-950/60 border-2 border-red-500 shadow-xl shadow-red-950/50 animate-pulse'
                  : 'bg-[#0b0f19]/90 border-slate-750'
              }`}
            >
              {/* Top Row: Candidate info and vote count */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-black text-slate-400 w-5">
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
                    <span className="text-sm sm:text-base font-display font-black text-white">
                      {candidate.name}
                    </span>
                    <span className="text-xs text-slate-300 ml-2 font-medium">
                      ({candidate.titleRole})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  {isWinner && (
                    <span className="flex items-center gap-1 text-[11px] font-display font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-400 text-black shadow-md">
                      <Crown className="w-3 h-3 text-black" /> Elected President
                    </span>
                  )}
                  {isEliminated && (
                    <span className="flex items-center gap-1 text-[11px] font-display font-black uppercase px-2.5 py-0.5 rounded-full bg-red-600 text-white shadow-md">
                      <Skull className="w-3 h-3 text-white" /> Eliminated
                    </span>
                  )}
                  <span className="text-base sm:text-lg font-black font-mono text-white px-3 py-0.5 rounded-lg bg-slate-900 border border-slate-700 shadow-inner">
                    {count} {count === 1 ? 'Vote' : 'Votes'}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isWinner
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-300 shadow-sm shadow-amber-400'
                      : isEliminated
                      ? 'bg-gradient-to-r from-red-600 to-rose-500 shadow-sm shadow-red-500'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-500 shadow-sm shadow-cyan-500'
                  }`}
                  style={{ width: `${Math.max(percentage, 6)}%` }}
                />
              </div>

              {/* Voter Icons Tray */}
              {(() => {
                const votesForCandidate = tally.votes.filter(v => v.targetId === candId);
                if (votesForCandidate.length === 0) return null;

                return (
                  <div className="flex items-center flex-wrap gap-2 pt-2 mt-1 border-t border-slate-800/80">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 shrink-0">
                      {isFinalVote ? 'Mandate Cast By:' : 'Ballots Cast By:'}
                    </span>
                    <div className="flex items-center flex-wrap gap-1.5">
                      {votesForCandidate.map((v, vIdx) => {
                        const voter = CANDIDATE_MAP.get(v.voterId);
                        if (!voter) return null;
                        return (
                          <div
                            key={vIdx}
                            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-sans font-bold shadow-xs transition-transform hover:scale-105 ${
                              v.isBetrayal
                                ? 'bg-red-950 border-red-600 text-red-200 animate-pulse'
                                : v.isHonoredPact
                                ? 'bg-emerald-950 border-emerald-600 text-emerald-200'
                                : 'bg-slate-900 border-slate-750 text-slate-200'
                            }`}
                            title={
                              v.isBetrayal
                                ? `${voter.name} (BETRAYED PACT!)`
                                : v.isHonoredPact
                                ? `${voter.name} (Kept secret alliance)`
                                : `${voter.name} cast ballot`
                            }
                          >
                            <CandidateAvatar candidate={voter} size="xs" showBadge={false} />
                            <span>{voter.name.split(' ')[0]}</span>
                            {v.isBetrayal && (
                              <span className="flex items-center text-[10px] font-mono font-black text-red-300 uppercase bg-red-900 px-1.5 py-0.2 rounded-md">
                                <Swords className="w-2.5 h-2.5 mr-0.5 text-red-300" /> Betrayed
                              </span>
                            )}
                            {v.isHonoredPact && (
                              <span className="flex items-center text-[10px] font-mono font-bold text-emerald-300 uppercase bg-emerald-900 px-1.5 py-0.2 rounded-md">
                                <ShieldCheck className="w-2.5 h-2.5 mr-0.5 text-emerald-300" /> Pact
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {/* Secret Ballots List with Alliance & Betrayal Flags */}
      <div className="flex flex-col gap-3 pt-4 border-t border-slate-800/80">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
            Individual Ballots &amp; Backroom Deal Verifications:
          </span>
          <span className="text-xs font-mono text-slate-400 hidden sm:inline">
            (Pacts vs Votes Verified)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {tally.votes.map((v, i) => {
            const voter = CANDIDATE_MAP.get(v.voterId);
            const target = CANDIDATE_MAP.get(v.targetId);
            const ally = v.betrayedAllyId || v.pactWithId ? CANDIDATE_MAP.get(v.betrayedAllyId || v.pactWithId!) : null;

            return (
              <div 
                key={i} 
                className={`flex flex-col gap-1.5 p-3 rounded-2xl border text-xs transition-all ${
                  v.isBetrayal 
                    ? 'bg-red-950/80 border-red-600 shadow-md shadow-red-950/50' 
                    : v.isHonoredPact 
                    ? 'bg-emerald-950/50 border-emerald-600/80' 
                    : 'bg-[#0b0f19]/90 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-display font-black text-sm">
                    <span className="text-white">{voter?.name.split(' ')[0]}</span>
                    <span className="text-slate-500">&rarr;</span>
                    <span className="text-cyan-300">{target?.name.split(' ')[0]}</span>
                  </div>

                  {v.isBetrayal ? (
                    <span className="flex items-center gap-1 text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-red-600 text-white animate-pulse shadow-sm">
                      <Swords className="w-3 h-3" /> BETRAYAL!
                    </span>
                  ) : v.isHonoredPact ? (
                    <span className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-600 shadow-sm">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" /> PACT KEPT
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-400">
                      Independent
                    </span>
                  )}
                </div>

                {/* Betrayal or Pact Subtitle Note */}
                {v.isBetrayal && ally && (
                  <p className="text-xs font-mono text-red-200 leading-tight">
                    &bull; Broke secret pact with <strong className="text-white underline">{ally.name.split(' ')[0]}</strong> to eliminate {target?.name.split(' ')[0]}!
                  </p>
                )}

                {v.isHonoredPact && ally && (
                  <p className="text-xs font-mono text-emerald-300/90 leading-tight">
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
