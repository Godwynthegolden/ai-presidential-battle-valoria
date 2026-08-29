import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import gsap from 'gsap';
import { RoundVoteTally, VoteRecord, BailoutTransaction } from '@/types/game';
import { CANDIDATE_MAP } from '@/data/candidates';
import { CandidateAvatar } from './CandidateAvatar';
import { sounds } from '@/utils/audio';
import { 
  Vote, 
  Skull, 
  Crown, 
  Swords, 
  ShieldCheck, 
  DollarSign, 
  Banknote,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  ArrowRight
} from 'lucide-react';

interface VoteRevealBoardProps {
  tally: RoundVoteTally;
  isFinalVote: boolean;
  eliminatedId: string | null;
  winnerId?: string | null;
  candidateBudgets?: Record<string, number>;
  activeCandidateIds?: string[];
  onComplete?: () => void;
}

type RevealPhase = 
  | 'CLEAN_INTRO'
  | 'BALLOTS'
  | 'VOTES_TALLIED'
  | 'BAILOUTS'
  | 'ELIMINATION_LOCKED'
  | 'COMPLETE';

interface CandidateDisplayState {
  candidateId: string;
  votes: number;
  budget: number;
  initialRawVotes: number;
  bailoutTransactions: BailoutTransaction[];
  hasBailedOutThisTick?: boolean;
}

export const VoteRevealBoard: React.FC<VoteRevealBoardProps> = ({
  tally,
  isFinalVote,
  eliminatedId,
  winnerId,
  candidateBudgets = {},
  activeCandidateIds = [],
  onComplete,
}) => {
  const [speed, setSpeed] = useState<0.5 | 1.0 | 2.0>(1.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [phase, setPhase] = useState<RevealPhase>('CLEAN_INTRO');
  
  const [currentBallotIndex, setCurrentBallotIndex] = useState<number>(-1);
  const [currentBailoutIndex, setCurrentBailoutIndex] = useState<number>(-1);
  
  const boardRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const activeBailoutBadgeRef = useRef<HTMLDivElement | null>(null);

  const participatingIds = useMemo(() => {
    if (activeCandidateIds && activeCandidateIds.length > 0) return activeCandidateIds;
    return Object.keys(tally.tally);
  }, [activeCandidateIds, tally.tally]);

  const initialBudgets = useMemo(() => {
    const map: Record<string, number> = {};
    participatingIds.forEach(id => {
      map[id] = candidateBudgets[id] ?? 100;
    });
    return map;
  }, [participatingIds, candidateBudgets]);

  const liveCandidateStates = useMemo<Record<string, CandidateDisplayState>>(() => {
    const states: Record<string, CandidateDisplayState> = {};
    
    participatingIds.forEach(id => {
      states[id] = {
        candidateId: id,
        votes: 0,
        budget: initialBudgets[id] ?? 100,
        initialRawVotes: 0,
        bailoutTransactions: [],
      };
    });

    if (currentBallotIndex >= 0) {
      const revealedVotes = tally.votes.slice(0, currentBallotIndex + 1);
      revealedVotes.forEach(v => {
        if (states[v.targetId]) {
          states[v.targetId].votes += 1;
          states[v.targetId].initialRawVotes += 1;
        }
      });
    }

    if (currentBailoutIndex >= 0 && tally.bailoutTransactions) {
      const appliedBailouts = tally.bailoutTransactions.slice(0, currentBailoutIndex + 1);
      appliedBailouts.forEach((tx, idx) => {
        if (states[tx.candidateId]) {
          states[tx.candidateId].votes = Math.max(0, states[tx.candidateId].votes - tx.votesRemoved);
          states[tx.candidateId].budget = tx.remainingBudget;
          states[tx.candidateId].bailoutTransactions.push(tx);
          if (idx === currentBailoutIndex) {
            states[tx.candidateId].hasBailedOutThisTick = true;
          }
        }
      });
    }

    return states;
  }, [participatingIds, initialBudgets, currentBallotIndex, currentBailoutIndex, tally.votes, tally.bailoutTransactions]);

  const sortedCandidateList = useMemo(() => {
    return Object.values(liveCandidateStates).sort((a, b) => {
      if (b.votes !== a.votes) return b.votes - a.votes;
      if (a.budget !== b.budget) return a.budget - b.budget;
      return b.initialRawVotes - a.initialRawVotes;
    });
  }, [liveCandidateStates]);

  const maxLiveVotes = useMemo(() => {
    return Math.max(...Object.values(liveCandidateStates).map(s => s.votes), 1);
  }, [liveCandidateStates]);

  const totalBallots = tally.votes.length;
  const totalBailouts = tally.bailoutTransactions?.length ?? 0;

  const getStepDuration = useCallback((baseMs: number) => {
    return Math.round(baseMs / speed);
  }, [speed]);

  useEffect(() => {
    if (activeBailoutBadgeRef.current) {
      gsap.fromTo(
        activeBailoutBadgeRef.current,
        { scale: 0.4, y: 15, opacity: 0, rotation: -8 },
        { scale: 1, y: 0, opacity: 1, rotation: 0, duration: 0.45, ease: 'back.out(1.8)' }
      );
    }
  }, [currentBailoutIndex]);

  const stepForward = useCallback(() => {
    if (phase === 'CLEAN_INTRO') {
      setPhase('BALLOTS');
      setCurrentBallotIndex(0);
      const firstVote = tally.votes[0];
      if (firstVote?.isBetrayal) sounds.playBetrayalAlarm(); else sounds.playBallotDrop();
      return;
    }

    if (phase === 'BALLOTS') {
      if (currentBallotIndex + 1 < totalBallots) {
        const nextIdx = currentBallotIndex + 1;
        setCurrentBallotIndex(nextIdx);
        const nextVote = tally.votes[nextIdx];
        if (nextVote?.isBetrayal) sounds.playBetrayalAlarm(); else sounds.playBallotDrop();
      } else {
        setPhase('VOTES_TALLIED');
        sounds.playVoteRevealDing();
      }
      return;
    }

    if (phase === 'VOTES_TALLIED') {
      if (totalBailouts > 0) {
        setPhase('BAILOUTS');
        setCurrentBailoutIndex(0);
        sounds.playCashChime();
      } else {
        setPhase('ELIMINATION_LOCKED');
        sounds.playEliminationBuzzer();
      }
      return;
    }

    if (phase === 'BAILOUTS') {
      if (currentBailoutIndex + 1 < totalBailouts) {
        const nextBailoutIdx = currentBailoutIndex + 1;
        setCurrentBailoutIndex(nextBailoutIdx);
        sounds.playCashChime();
        sounds.playSwapWhoosh();
      } else {
        setPhase('ELIMINATION_LOCKED');
        sounds.playEliminationBuzzer();
      }
      return;
    }

    if (phase === 'ELIMINATION_LOCKED') {
      setPhase('COMPLETE');
      onComplete?.();
      return;
    }
  }, [phase, currentBallotIndex, currentBailoutIndex, totalBallots, totalBailouts, tally.votes, onComplete]);

  const skipToEnd = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCurrentBallotIndex(totalBallots - 1);
    setCurrentBailoutIndex(totalBailouts - 1);
    setPhase('COMPLETE');
    sounds.playVoteRevealDing();
    onComplete?.();
  }, [totalBallots, totalBailouts, onComplete]);

  const replayReveal = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCurrentBallotIndex(-1);
    setCurrentBailoutIndex(-1);
    setPhase('CLEAN_INTRO');
    setIsPlaying(true);
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    let delayMs = getStepDuration(1400);
    if (phase === 'CLEAN_INTRO') delayMs = getStepDuration(2000);
    else if (phase === 'BALLOTS') delayMs = getStepDuration(1300);
    else if (phase === 'VOTES_TALLIED') delayMs = getStepDuration(2200);
    else if (phase === 'BAILOUTS') delayMs = getStepDuration(2000);
    else if (phase === 'ELIMINATION_LOCKED') delayMs = getStepDuration(2500);
    else if (phase === 'COMPLETE') return;

    timerRef.current = setTimeout(() => { stepForward(); }, delayMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isPlaying, phase, currentBallotIndex, currentBailoutIndex, stepForward, getStepDuration]);

  const topCandidateState = sortedCandidateList[0];
  const topCandidate = topCandidateState ? CANDIDATE_MAP.get(topCandidateState.candidateId) : null;
  const recentBetrayals = tally.votes.slice(0, currentBallotIndex + 1).filter(v => v.isBetrayal);

  return (
    <div ref={boardRef} className="w-full max-w-3xl flex flex-col gap-5 rounded-3xl bg-gradient-to-b from-[#0e1424] via-[#090d17] to-[#06080d] border border-slate-700/80 p-5 sm:p-6 md:p-8 shadow-2xl backdrop-blur-2xl animate-fade-in relative overflow-hidden">
      <div className="absolute -top-32 -right-32 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col gap-3.5 border-b border-slate-800/80 pb-4 relative z-10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-purple-500/15 border border-purple-500/40 text-purple-400 shadow-md shadow-purple-500/10">
              <Vote className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-display font-black text-white uppercase tracking-wide">
                {isFinalVote ? 'Grand Jury Presidential Ballot Totals' : `Round ${tally.round} Elimination Vote Results`}
              </h2>
              <p className="text-xs text-slate-300 font-sans mt-0.5">
                {isFinalVote ? 'All participating contenders cast secret ballots for the ultimate President of Valoria.' : 'Highest vote recipient is eliminated — unless bailed out by $40 Capitol buyouts.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950/90 p-1.5 rounded-2xl border border-slate-800 shadow-lg">
            <button type="button" onClick={() => setIsPlaying(prev => !prev)} className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/60 text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer">
              {isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
              <span className="hidden sm:inline">{isPlaying ? 'Pause' : 'Play'}</span>
            </button>
            <button type="button" onClick={() => { setIsPlaying(false); stepForward(); }} disabled={phase === 'COMPLETE'} className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/80 text-xs font-mono font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-40">
              <ArrowRight className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Next</span>
            </button>
            <div className="flex items-center bg-slate-900 rounded-xl border border-slate-800 p-0.5 text-[11px] font-mono font-bold">
              {[0.5, 1.0, 2.0].map(s => (
                <button key={s} type="button" onClick={() => setSpeed(s as any)} className={`px-1.5 py-0.5 rounded-lg transition ${speed === s ? 'bg-cyan-500 text-black font-black' : 'text-slate-400 hover:text-white'}`}>
                  {s}x
                </button>
              ))}
            </div>
            <button type="button" onClick={skipToEnd} disabled={phase === 'COMPLETE'} className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-mono transition">
              <SkipForward className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={replayReveal} className="p-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-800 text-xs font-mono transition">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-inner flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-slate-400 font-bold uppercase">LIVE FEED:</span>
            {phase === 'CLEAN_INTRO' && <span>Opening ballot box...</span>}
            {phase === 'BALLOTS' && <span>Counting {currentBallotIndex + 1}/{totalBallots}...</span>}
            {phase === 'VOTES_TALLIED' && <span>Initial ballots counted!</span>}
            {phase === 'BAILOUTS' && <span>Bailout Step {currentBailoutIndex + 1}/{totalBailouts}...</span>}
            {phase === 'ELIMINATION_LOCKED' && <span>Final results locked.</span>}
            {phase === 'COMPLETE' && <span>Results ratified.</span>}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 relative z-10">
        {sortedCandidateList.map((state, rank) => {
          const candidate = CANDIDATE_MAP.get(state.candidateId);
          if (!candidate) return null;
          const isEliminated = (phase === 'ELIMINATION_LOCKED' || phase === 'COMPLETE') && state.candidateId === eliminatedId;
          const isWinner = (phase === 'ELIMINATION_LOCKED' || phase === 'COMPLETE') && isFinalVote && state.candidateId === winnerId;
          const isTopChoppingBlock = (phase === 'VOTES_TALLIED' || phase === 'BAILOUTS') && rank === 0;
          const percentage = Math.round((state.votes / maxLiveVotes) * 100);
          
          const totalVotesRemoved = state.bailoutTransactions.reduce((sum, tx) => sum + tx.votesRemoved, 0);
          const totalSpent = state.bailoutTransactions.reduce((sum, tx) => sum + tx.cost, 0);

          return (
            <div 
              key={state.candidateId} 
              className={`relative flex flex-col gap-2.5 p-4 rounded-2xl border transition-all duration-700 ${
                isWinner 
                  ? 'bg-gradient-to-r from-amber-950/80 to-[#0e1424] border-amber-400 shadow-xl shadow-amber-500/30 scale-[1.02]' 
                  : isEliminated 
                  ? 'bg-red-950/70 border-2 border-red-500 shadow-2xl shadow-red-950/70 animate-pulse' 
                  : isTopChoppingBlock 
                  ? 'bg-red-950/30 border-red-500/70 shadow-lg shadow-red-950/40' 
                  : 'bg-[#0b0f19]/90 border-slate-750'
              }`}
            >
              {/* Top Row: Rank, Avatar, Name, Treasury Balance & Vote Counter */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-mono font-black w-6 text-center rounded-md py-0.5 ${rank === 0 ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-slate-900 text-slate-400'}`}>
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
                    <div className="flex items-center gap-2">
                      <span className="text-sm sm:text-base font-display font-black text-white">
                        {candidate.name}
                      </span>
                      {/* War Chest Treasury Balance Badge */}
                      <span className="text-[11px] font-mono font-bold px-2 py-0.2 rounded-md bg-emerald-950/90 text-emerald-300 border border-emerald-600/70 shadow-sm flex items-center gap-0.5">
                        <DollarSign className="w-3 h-3 text-emerald-400" />
                        ${state.budget}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">
                      {candidate.titleRole}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {/* Floating Animated -$40 Bailout Badge */}
                  {state.hasBailedOutThisTick && (
                    <div 
                      ref={activeBailoutBadgeRef}
                      className="flex items-center gap-1 text-xs font-mono font-black uppercase px-2.5 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/40 animate-bounce"
                    >
                      <Banknote className="w-3.5 h-3.5" /> -$40 [VOTE REMOVED!]
                    </div>
                  )}

                  {/* Cumulative Bailout Tag */}
                  {totalVotesRemoved > 0 && !state.hasBailedOutThisTick && (
                    <span className="flex items-center gap-1 text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500 shadow-sm">
                      <DollarSign className="w-3 h-3 text-emerald-400" /> -${totalSpent} ({totalVotesRemoved} {totalVotesRemoved === 1 ? 'Vote' : 'Votes'} Removed)
                    </span>
                  )}

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

                  {/* Live Vote Counter Box */}
                  <span className="text-base sm:text-lg font-black font-mono text-white px-3 py-0.5 rounded-lg bg-slate-900 border border-slate-700 shadow-inner">
                    {state.votes} {state.votes === 1 ? 'Vote' : 'Votes'}
                  </span>
                </div>
              </div>

              {/* Animated Progress Bar */}
              <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${
                    isWinner
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-300 shadow-sm shadow-amber-400'
                      : isEliminated
                      ? 'bg-gradient-to-r from-red-600 to-rose-500 shadow-sm shadow-red-500'
                      : isTopChoppingBlock
                      ? 'bg-gradient-to-r from-red-500 to-amber-500'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-500 shadow-sm shadow-cyan-500'
                  }`}
                  style={{ width: `${Math.max(percentage, state.votes > 0 ? 8 : 0)}%` }}
                />
              </div>

              {/* Revealed Ballots Tray for this Candidate */}
              {(() => {
                const votesForCandidate = tally.votes
                  .slice(0, currentBallotIndex + 1)
                  .filter(v => v.targetId === state.candidateId);

                if (votesForCandidate.length === 0) return null;

                return (
                  <div className="flex items-center flex-wrap gap-2 pt-2 mt-0.5 border-t border-slate-800/80 animate-fade-in">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 shrink-0">
                      {isFinalVote ? 'Mandates Cast By:' : 'Ballots Cast By:'}
                    </span>
                    <div className="flex items-center flex-wrap gap-1.5">
                      {votesForCandidate.map((v, vIdx) => {
                        const voter = CANDIDATE_MAP.get(v.voterId);
                        if (!voter) return null;
                        return (
                          <div
                            key={vIdx}
                            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-sans font-bold shadow-xs transition-transform hover:scale-105 animate-step-transition ${
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

      {/* 💰 Live Capitol Vote Bailout Auction Summary Ledger */}
      {tally.bailoutTransactions && tally.bailoutTransactions.length > 0 && currentBailoutIndex >= 0 && (
        <div className="flex flex-col gap-3 p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 relative z-10 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-mono font-black text-emerald-200 uppercase tracking-wider">
                Capitol Vote Bailout Auction ($40 / Vote Removed)
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">
              {currentBailoutIndex + 1} of {totalBailouts} Buyout{totalBailouts > 1 ? 's' : ''} Completed
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {tally.bailoutTransactions.slice(0, currentBailoutIndex + 1).map((tx, idx) => {
              const cand = CANDIDATE_MAP.get(tx.candidateId);
              const isCurrentTx = idx === currentBailoutIndex && phase === 'BAILOUTS';

              return (
                <div 
                  key={idx} 
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-mono shadow-xs transition-all duration-300 ${
                    isCurrentTx 
                      ? 'bg-emerald-900/60 border-emerald-400 shadow-md shadow-emerald-500/20 scale-[1.02]' 
                      : 'bg-slate-950/80 border-emerald-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">#{idx + 1}</span>
                    <span className="text-white font-bold">{cand?.name.split(' ')[0]}</span>
                    <span className="text-[10px] text-slate-400">({tx.initialVotes} &rarr; {tx.remainingVotes} votes)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                      -${tx.cost}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      (${tx.remainingBudget} left)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Secret Ballots List with Alliance & Betrayal Flags */}
      {currentBallotIndex >= 0 && (
        <div className="flex flex-col gap-3 pt-4 border-t border-slate-800/80 relative z-10 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
              Revealed Ballots &amp; Backroom Deal Verifications:
            </span>
            <span className="text-xs font-mono text-slate-400 hidden sm:inline">
              ({currentBallotIndex + 1} of {totalBallots} Ballots Unsealed)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {tally.votes.slice(0, currentBallotIndex + 1).map((vote, idx) => {
              const voter = CANDIDATE_MAP.get(vote.voterId);
              const target = CANDIDATE_MAP.get(vote.targetId);
              const ally = vote.betrayedAllyId ? CANDIDATE_MAP.get(vote.betrayedAllyId) : null;
              if (!voter || !target) return null;

              return (
                <div
                  key={idx}
                  className={`flex flex-col gap-1.5 p-3 rounded-xl border text-xs font-mono transition-all animate-step-transition ${
                    vote.isBetrayal
                      ? 'bg-red-950/40 border-red-600/80 shadow-md shadow-red-950/40'
                      : vote.isHonoredPact
                      ? 'bg-emerald-950/30 border-emerald-600/60 shadow-xs'
                      : 'bg-slate-950/60 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CandidateAvatar candidate={voter} size="xs" showBadge={false} />
                      <span className="font-bold text-white">{voter.name.split(' ')[0]}</span>
                      <span className="text-slate-500">&rarr;</span>
                      <CandidateAvatar candidate={target} size="xs" showBadge={false} />
                      <span className="font-bold" style={{ color: target.color.primary }}>
                        {target.name.split(' ')[0]}
                      </span>
                    </div>

                    {vote.isBetrayal && (
                      <span className="flex items-center text-[10px] font-mono font-black text-red-300 uppercase bg-red-900/90 px-2 py-0.5 rounded-md border border-red-700">
                        🗡️ Betrayed!
                      </span>
                    )}

                    {vote.isHonoredPact && (
                      <span className="flex items-center text-[10px] font-mono font-bold text-emerald-300 uppercase bg-emerald-900/80 px-2 py-0.5 rounded-md border border-emerald-700">
                        🛡️ Pact Kept
                      </span>
                    )}
                  </div>

                  {vote.isBetrayal && ally && (
                    <div className="text-[10px] text-red-300 italic bg-red-950/80 px-2 py-1 rounded border border-red-800/60">
                      Broke secret corridor alliance with <strong>{ally.name}</strong>!
                    </div>
                  )}

                  {vote.reason && (
                    <div className="text-[11px] text-slate-400 italic">
                      &ldquo;{vote.reason}&rdquo;
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
