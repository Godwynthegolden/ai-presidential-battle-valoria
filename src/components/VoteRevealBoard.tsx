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
  AlertTriangle,
  ArrowRight,
  Radio,
  Sparkles,
  Layers,
  CheckCircle2,
  Flame
} from 'lucide-react';

interface VoteRevealBoardProps {
  tally: RoundVoteTally;
  isFinalVote: boolean;
  eliminatedId: string | null;
  winnerId?: string | null;
  candidateBudgets?: Record<string, number>;
  activeCandidateIds?: string[];
  defaultSpeed?: number;
  defaultAutoPlay?: boolean;
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
  defaultSpeed = 1.0,
  defaultAutoPlay = true,
  onComplete,
}) => {
  const speed = defaultSpeed > 0 ? defaultSpeed : 1.0;
  const [phase, setPhase] = useState<RevealPhase>('CLEAN_INTRO');
  const [currentBallotIndex, setCurrentBallotIndex] = useState<number>(-1);
  const [currentBailoutIndex, setCurrentBailoutIndex] = useState<number>(-1);
  const [timecode, setTimecode] = useState('00:00:00.00');

  // GSAP Animation Refs
  const stageContainerRef = useRef<HTMLDivElement>(null);
  const ballotEnvelopeRef = useRef<HTMLDivElement>(null);
  const betrayalBannerRef = useRef<HTMLDivElement>(null);
  const bailoutCashRef = useRef<HTMLDivElement>(null);
  const eliminationStampRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Digital Broadcast Timecode
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const hrs = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      const secs = String(now.getSeconds()).padStart(2, '0');
      const ms = String(Math.floor(now.getMilliseconds() / 10)).padStart(2, '0');
      setTimecode(`${hrs}:${mins}:${secs}.${ms}`);
    };
    update();
    const interval = setInterval(update, 50);
    return () => clearInterval(interval);
  }, []);

  const participatingIds = useMemo(() => {
    if (activeCandidateIds && activeCandidateIds.length > 0) return activeCandidateIds;
    return Object.keys(tally.tally);
  }, [activeCandidateIds, tally.tally]);

  const initialBudgets = useMemo(() => {
    const map: Record<string, number> = {};
    participatingIds.forEach(id => {
      map[id] = tally.initialBudgets?.[id] ?? candidateBudgets[id] ?? CANDIDATE_MAP.get(id)?.initialBudget ?? 100;
    });
    return map;
  }, [participatingIds, tally.initialBudgets, candidateBudgets]);

  // Live Candidate State Calculation
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

  // Entrance Sequence Animation
  useEffect(() => {
    if (stageContainerRef.current) {
      gsap.fromTo(
        stageContainerRef.current,
        { opacity: 0, scale: 0.98 },
        { opacity: 1, scale: 1, duration: 0.6 / speed, ease: 'power3.out' }
      );
    }
  }, [speed]);

  // Active Spotlight Ballot Entrance Tween
  useEffect(() => {
    if (ballotEnvelopeRef.current && phase === 'BALLOTS') {
      gsap.fromTo(
        ballotEnvelopeRef.current,
        { scale: 0.7, y: -25, opacity: 0, rotateZ: -3 },
        { scale: 1, y: 0, opacity: 1, rotateZ: 0, duration: 0.45 / speed, ease: 'back.out(2)' }
      );
    }
  }, [currentBallotIndex, phase, speed]);

  // Betrayal Banner Shockwave Tween
  useEffect(() => {
    const currentVote = tally.votes[currentBallotIndex];
    if (betrayalBannerRef.current && currentVote?.isBetrayal) {
      gsap.fromTo(
        betrayalBannerRef.current,
        { scale: 0.5, y: 15, opacity: 0 },
        { scale: 1, y: 0, opacity: 1, duration: 0.4 / speed, ease: 'elastic.out(1, 0.4)' }
      );
    }
  }, [currentBallotIndex, tally.votes, speed]);

  // Bailout Floating Cash Stacks Tween
  useEffect(() => {
    if (bailoutCashRef.current && phase === 'BAILOUTS') {
      gsap.fromTo(
        bailoutCashRef.current,
        { scale: 0.4, y: 30, opacity: 0, rotation: -12 },
        { scale: 1, y: 0, opacity: 1, rotation: 0, duration: 0.5 / speed, ease: 'back.out(2)' }
      );
    }
  }, [currentBailoutIndex, phase, speed]);

  // Elimination / Winner Stamp Slam Tween
  useEffect(() => {
    if (eliminationStampRef.current && phase === 'ELIMINATION_LOCKED') {
      gsap.fromTo(
        eliminationStampRef.current,
        { scale: 3, opacity: 0, rotation: -20 },
        { scale: 1, opacity: 1, rotation: -6, duration: 0.5 / speed, ease: 'power4.out' }
      );
    }
  }, [phase, speed]);

  // State Machine Step Progression
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
        sounds.playSwapWhoosh();
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

  // Self-Driving Motion Graphic Timer
  useEffect(() => {
    let delayMs = getStepDuration(1400);
    if (phase === 'CLEAN_INTRO') delayMs = getStepDuration(1800);
    else if (phase === 'BALLOTS') delayMs = getStepDuration(1400);
    else if (phase === 'VOTES_TALLIED') delayMs = getStepDuration(2100);
    else if (phase === 'BAILOUTS') delayMs = getStepDuration(2000);
    else if (phase === 'ELIMINATION_LOCKED') delayMs = getStepDuration(2500);
    else if (phase === 'COMPLETE') return;

    timerRef.current = setTimeout(() => { stepForward(); }, delayMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase, currentBallotIndex, currentBailoutIndex, stepForward, getStepDuration]);

  const activeVote = tally.votes[currentBallotIndex] || null;
  const activeVoter = activeVote ? CANDIDATE_MAP.get(activeVote.voterId) : null;
  const activeTarget = activeVote ? CANDIDATE_MAP.get(activeVote.targetId) : null;
  const activeBetrayedAlly = activeVote?.betrayedAllyId ? CANDIDATE_MAP.get(activeVote.betrayedAllyId) : null;

  const activeBailoutTx = (tally.bailoutTransactions && currentBailoutIndex >= 0) 
    ? tally.bailoutTransactions[currentBailoutIndex] 
    : null;
  const activeBailoutCandidate = activeBailoutTx ? CANDIDATE_MAP.get(activeBailoutTx.candidateId) : null;

  const choppingBlockCandidate = sortedCandidateList[0] ? CANDIDATE_MAP.get(sortedCandidateList[0].candidateId) : null;
  const eliminatedCandidate = eliminatedId ? CANDIDATE_MAP.get(eliminatedId) : choppingBlockCandidate;
  const winningCandidate = winnerId ? CANDIDATE_MAP.get(winnerId) : (sortedCandidateList[0] ? CANDIDATE_MAP.get(sortedCandidateList[0].candidateId) : null);

  const isBetrayalEvent = phase === 'BALLOTS' && Boolean(activeVote?.isBetrayal);

  return (
    <div 
      ref={stageContainerRef}
      className={`fixed inset-0 z-50 overflow-hidden bg-[#020509]/98 backdrop-blur-3xl flex flex-col justify-between p-3 sm:p-4 md:p-6 select-none transition-colors duration-700 ${
        isBetrayalEvent ? 'ring-8 ring-red-600/40' : ''
      }`}
    >
      {/* Dynamic Background Atmosphere */}
      <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/15 rounded-full blur-[100px] pointer-events-none" />
      {isBetrayalEvent && (
        <div className="absolute inset-0 bg-red-950/20 pointer-events-none animate-pulse" />
      )}

      {/* ========================================================================= */}
      {/* 1. TOP BROADCAST HEADER & PHASE STEPPER HUD */}
      {/* ========================================================================= */}
      <div className="relative z-20 flex flex-col gap-2 pb-2.5 border-b border-slate-800/80">
        <div className="flex items-center justify-between flex-wrap gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-red-950/90 border border-red-600 text-red-300 font-mono text-xs font-black shadow-lg shadow-red-950/50 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span>REC &bull; LIVE BALLOT UNSEALING</span>
            </div>

            <div>
              <h1 className="text-sm sm:text-lg md:text-xl font-display font-black text-white uppercase tracking-wider flex items-center gap-2">
                {isFinalVote ? (
                  <>
                    <Crown className="w-5 h-5 text-amber-400" />
                    <span>Grand Jury Presidential Mandate Totals</span>
                  </>
                ) : (
                  <>
                    <Vote className="w-5 h-5 text-cyan-400" />
                    <span>Round {tally.round} Elimination Vote Results</span>
                  </>
                )}
              </h1>
            </div>
          </div>

          {/* Timecode and Feed Status */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/90 border border-slate-750 font-mono text-xs font-bold text-cyan-300 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>{phase === 'BALLOTS' ? `Ballot ${currentBallotIndex + 1}/${totalBallots}` : phase.replace('_', ' ')}</span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/60 border border-slate-800 font-mono text-xs text-emerald-400 font-bold">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>{timecode}</span>
            </div>
          </div>
        </div>

        {/* 4-Step Broadcast Phase Stepper Ribbon */}
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          {[
            {
              id: 'BALLOTS',
              step: '1',
              label: 'UNSEAL BALLOTS',
              active: phase === 'CLEAN_INTRO' || phase === 'BALLOTS',
              done: phase === 'VOTES_TALLIED' || phase === 'BAILOUTS' || phase === 'ELIMINATION_LOCKED' || phase === 'COMPLETE',
              detail: phase === 'BALLOTS' ? `${currentBallotIndex + 1}/${totalBallots}` : `${totalBallots} Votes`,
            },
            {
              id: 'VOTES_TALLIED',
              step: '2',
              label: 'INITIAL TALLY',
              active: phase === 'VOTES_TALLIED',
              done: phase === 'BAILOUTS' || phase === 'ELIMINATION_LOCKED' || phase === 'COMPLETE',
              detail: 'Standings Locked',
            },
            {
              id: 'BAILOUTS',
              step: '3',
              label: 'BAILOUT AUCTIONS',
              active: phase === 'BAILOUTS',
              done: phase === 'ELIMINATION_LOCKED' || phase === 'COMPLETE',
              detail: `${totalBailouts} Buyouts ($40/ea)`,
            },
            {
              id: 'ELIMINATION_LOCKED',
              step: '4',
              label: isFinalVote ? 'PRESIDENTIAL WINNER' : 'ELIMINATION LOCK',
              active: phase === 'ELIMINATION_LOCKED' || phase === 'COMPLETE',
              done: phase === 'COMPLETE',
              detail: isFinalVote ? 'President Elected' : 'Concession Next',
            },
          ].map(st => (
            <div
              key={st.step}
              className={`flex items-center justify-between px-2.5 py-1 rounded-xl border text-[10px] sm:text-xs font-mono transition-all duration-300 ${
                st.active
                  ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400/50 font-black'
                  : st.done
                  ? 'bg-slate-900/60 border-emerald-700/60 text-emerald-300 font-bold'
                  : 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-60'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                  st.active ? 'bg-cyan-400 text-black' : st.done ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-400'
                }`}>
                  {st.done ? '✓' : st.step}
                </span>
                <span className="truncate">{st.label}</span>
              </div>
              <span className="hidden md:inline text-[9px] font-bold opacity-80">{st.detail}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN SPLIT STAGE: LEFT (LEADERBOARD) & RIGHT (ACTIVE SPOTLIGHT) */}
      {/* ========================================================================= */}
      <div className="relative z-20 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 md:gap-5 my-2 min-h-0 overflow-hidden">
        
        {/* LEFT COLUMN: LIVE STANDINGS LEADERBOARD & VOTER ATTRIBUTION (5 COLS) */}
        <div className="lg:col-span-5 h-full flex flex-col gap-2 overflow-y-auto pr-1 custom-scrollbar">
          <div className="flex items-center justify-between px-2 text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
            <span>Contender Standings</span>
            <span>Elimination Votes</span>
          </div>

          <div className="flex flex-col gap-2">
            {sortedCandidateList.map((st, rank) => {
              const cand = CANDIDATE_MAP.get(st.candidateId);
              if (!cand) return null;
              
              const isEliminated = (phase === 'ELIMINATION_LOCKED' || phase === 'COMPLETE') && st.candidateId === eliminatedId;
              const isWinner = (phase === 'ELIMINATION_LOCKED' || phase === 'COMPLETE') && isFinalVote && st.candidateId === winnerId;
              const isTopChoppingBlock = (phase === 'VOTES_TALLIED' || phase === 'BAILOUTS' || phase === 'BALLOTS') && rank === 0 && st.votes > 0;
              const isCurrentTarget = activeVote?.targetId === st.candidateId && phase === 'BALLOTS';
              const percentage = Math.round((st.votes / maxLiveVotes) * 100);

              const totalVotesRemoved = st.bailoutTransactions.reduce((sum, tx) => sum + tx.votesRemoved, 0);
              const totalSpent = st.bailoutTransactions.reduce((sum, tx) => sum + tx.cost, 0);

              // Find all votes currently revealed that target this candidate
              const votesForCandidate = tally.votes
                .slice(0, currentBallotIndex + 1)
                .filter(v => v.targetId === st.candidateId);

              // Survival calculations for war chest treasury
              const canAffordBailouts = Math.floor(st.budget / 40);

              return (
                <div
                  key={st.candidateId}
                  className={`relative flex flex-col gap-1.5 p-2.5 sm:p-3 rounded-2xl border transition-all duration-500 ${
                    isWinner
                      ? 'bg-gradient-to-r from-amber-950/90 via-[#0e1424] to-slate-950 border-amber-400 shadow-xl shadow-amber-500/25 scale-[1.01]'
                      : isEliminated
                      ? 'bg-red-950/80 border-2 border-red-500 shadow-2xl shadow-red-950/80 animate-pulse'
                      : isCurrentTarget
                      ? 'bg-slate-900 border-cyan-400 shadow-lg shadow-cyan-500/20 scale-[1.01]'
                      : isTopChoppingBlock
                      ? 'bg-red-950/40 border-red-500 shadow-lg shadow-red-950/40 ring-1 ring-red-500/60'
                      : 'bg-slate-950/80 border-slate-800/80'
                  }`}
                >
                  {/* Danger Zone Banner on Chopping Block Leader */}
                  {isTopChoppingBlock && !isEliminated && !isWinner && (
                    <div className="flex items-center justify-between px-2 py-0.5 rounded-lg bg-red-950 border border-red-700/80 text-red-300 font-mono text-[9px] font-black uppercase tracking-wider mb-0.5">
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-red-400 animate-pulse" />
                        ON THE CHOPPING BLOCK (ELIMINATION RISK)
                      </span>
                      <span>
                        {canAffordBailouts > 0 ? `💰 ${canAffordBailouts} Bailout Available` : `💀 UNPROTECTED ($${st.budget})`}
                      </span>
                    </div>
                  )}

                  {/* Top Row: Rank, Avatar, Name, War Chest Treasury, Live Votes */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-mono font-black w-5 text-center rounded-md py-0.5 ${
                        rank === 0 ? 'bg-red-950 text-red-400 border border-red-700' : 'bg-slate-900 text-slate-400'
                      }`}>
                        #{rank + 1}
                      </span>
                      <CandidateAvatar 
                        candidate={cand} 
                        size="xs" 
                        isEliminated={isEliminated} 
                        isPresident={isWinner} 
                        showBadge={false}
                      />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs sm:text-sm font-display font-black text-white">
                            {cand.name}
                          </span>
                          {/* War Chest Treasury Badge */}
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-700 flex items-center gap-0.5">
                            <DollarSign className="w-2.5 h-2.5 text-emerald-400" />
                            ${st.budget}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 truncate max-w-[130px] sm:max-w-[170px]">
                          {cand.titleRole}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Floating -$40 Bailout Tag */}
                      {st.hasBailedOutThisTick && (
                        <span className="flex items-center gap-1 text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 shadow-md animate-bounce">
                          <Banknote className="w-3 h-3" /> -$40 [SAVED!]
                        </span>
                      )}

                      {totalVotesRemoved > 0 && !st.hasBailedOutThisTick && (
                        <span className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-600">
                          -${totalSpent} ({totalVotesRemoved} bailed)
                        </span>
                      )}

                      {isWinner && (
                        <span className="flex items-center gap-1 text-[10px] font-display font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-black">
                          <Crown className="w-3 h-3" /> Elected
                        </span>
                      )}

                      {isEliminated && (
                        <span className="flex items-center gap-1 text-[10px] font-display font-black uppercase px-2 py-0.5 rounded-full bg-red-600 text-white">
                          <Skull className="w-3 h-3" /> Eliminated
                        </span>
                      )}

                      {/* Monospace Vote Counter */}
                      <span className={`text-xs sm:text-sm font-black font-mono px-2 py-0.5 rounded-lg border transition-transform ${
                        isCurrentTarget ? 'bg-cyan-950 border-cyan-400 text-cyan-300 scale-105' : 'bg-slate-900 border-slate-750 text-white'
                      }`}>
                        {st.votes} {st.votes === 1 ? 'Vote' : 'Votes'}
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Progress Meter */}
                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ease-out ${
                        isWinner
                          ? 'bg-gradient-to-r from-amber-400 to-yellow-300 shadow-sm shadow-amber-400'
                          : isEliminated
                          ? 'bg-gradient-to-r from-red-600 to-rose-500 shadow-sm shadow-red-500'
                          : isTopChoppingBlock
                          ? 'bg-gradient-to-r from-red-500 to-amber-500'
                          : 'bg-gradient-to-r from-cyan-500 to-blue-500 shadow-sm shadow-cyan-500'
                      }`}
                      style={{ width: `${Math.max(percentage, st.votes > 0 ? 8 : 0)}%` }}
                    />
                  </div>

                  {/* ========================================================================= */}
                  {/* ⭐ USER REQUIREMENT: VOTER NAME AND PICTURE UNDER PROGRESS BAR */}
                  {/* ========================================================================= */}
                  {votesForCandidate.length > 0 && (
                    <div className="flex items-center flex-wrap gap-1.5 pt-1 mt-0.5 border-t border-slate-800/60 animate-fade-in">
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1">
                        <Vote className="w-2.5 h-2.5 text-cyan-400" />
                        Voted By:
                      </span>
                      <div className="flex items-center flex-wrap gap-1">
                        {votesForCandidate.map((v, vIdx) => {
                          const voter = CANDIDATE_MAP.get(v.voterId);
                          if (!voter) return null;
                          return (
                            <div
                              key={vIdx}
                              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-mono font-bold shadow-xs transition-all duration-300 animate-step-transition ${
                                v.isBetrayal
                                  ? 'bg-red-950/90 border-red-500 text-red-200 animate-pulse ring-1 ring-red-500'
                                  : v.isHonoredPact
                                  ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
                                  : 'bg-slate-900/90 border-slate-700 text-slate-200'
                              }`}
                              title={
                                v.isBetrayal
                                  ? `${voter.name} (BETRAYED corridor pact!)`
                                  : v.isHonoredPact
                                  ? `${voter.name} (Kept $30 alliance pact)`
                                  : `${voter.name} cast elimination ballot`
                              }
                            >
                              <CandidateAvatar candidate={voter} size="xs" showBadge={false} />
                              <span className="text-white font-sans text-[10px]">{voter.name.split(' ')[0]}</span>
                              {v.isBetrayal && (
                                <span className="text-[8px] font-black uppercase text-red-300 bg-red-900/80 px-1 py-0.2 rounded flex items-center gap-0.5">
                                  <Swords className="w-2.5 h-2.5 text-red-300" /> Betrayal
                                </span>
                              )}
                              {v.isHonoredPact && (
                                <span className="text-[8px] font-black uppercase text-emerald-300 bg-emerald-900/80 px-1 py-0.2 rounded flex items-center gap-0.5">
                                  <ShieldCheck className="w-2.5 h-2.5 text-emerald-300" /> Pact
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE SPOTLIGHT VIEWPORT (7 COLS - YOUTUBE EDIT CENTERPIECE) */}
        <div className="lg:col-span-7 h-full flex flex-col justify-center items-center relative overflow-hidden rounded-3xl bg-slate-950/90 border border-slate-800 p-4 sm:p-6 md:p-8 shadow-2xl">
          
          {/* 1. CLEAN INTRO SCENE */}
          {phase === 'CLEAN_INTRO' && (
            <div className="flex flex-col items-center justify-center text-center gap-4 animate-fade-in">
              <div className="p-4 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 shadow-2xl shadow-cyan-500/20">
                <Vote className="w-12 h-12 animate-pulse" />
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-black text-white uppercase tracking-wider">
                Unsealing Capitol Ballots...
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 font-mono max-w-md">
                All contenders have registered their confidential votes. Surveillance verification and $40 bailout auctions will commence automatically.
              </p>
            </div>
          )}

          {/* 2. BALLOT UNSEALING SCENE */}
          {phase === 'BALLOTS' && activeVote && activeVoter && activeTarget && (
            <div 
              ref={ballotEnvelopeRef}
              className="w-full max-w-lg flex flex-col gap-4 p-5 sm:p-6 rounded-3xl bg-gradient-to-b from-[#0f172a] via-[#090d16] to-[#04060a] border-2 border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.25)] relative overflow-hidden"
            >
              {/* Top Envelope Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-mono font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Vote className="w-4 h-4" /> BALLOT #{currentBallotIndex + 1} OF {totalBallots}
                </span>
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                  UNSEALED
                </span>
              </div>

              {/* Voter ➔ Target Showdown Graphics */}
              <div className="flex items-center justify-between gap-3 my-2">
                {/* Voter Box */}
                <div className="flex flex-col items-center gap-2 flex-1 text-center">
                  <CandidateAvatar candidate={activeVoter} size="md" showBadge={false} />
                  <span className="text-xs sm:text-sm font-display font-black text-white">
                    {activeVoter.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    VOTER
                  </span>
                </div>

                {/* Animated Connector Beam */}
                <div className="flex flex-col items-center justify-center px-2">
                  <span className="text-xs font-mono font-black text-red-400 uppercase tracking-wider mb-1">
                    CAST VOTE
                  </span>
                  <div className="w-12 sm:w-16 h-1 rounded-full bg-gradient-to-r from-cyan-400 to-red-500 animate-pulse shadow-sm shadow-red-500" />
                  <ArrowRight className="w-5 h-5 text-red-400 mt-1" />
                </div>

                {/* Target Box */}
                <div className="flex flex-col items-center gap-2 flex-1 text-center">
                  <CandidateAvatar candidate={activeTarget} size="md" showBadge={false} />
                  <span className="text-xs sm:text-sm font-display font-black text-white">
                    {activeTarget.name}
                  </span>
                  <span className="text-[10px] font-mono text-red-400 font-bold uppercase">
                    TARGET (+1 VOTE)
                  </span>
                </div>
              </div>

              {/* Betrayal or Pact Banner */}
              {activeVote.isBetrayal && (
                <div 
                  ref={betrayalBannerRef}
                  className="flex flex-col gap-1 p-3 rounded-2xl bg-red-950/90 border border-red-500 text-red-200 text-xs font-mono shadow-xl shadow-red-950/60 animate-pulse"
                >
                  <div className="flex items-center gap-1.5 font-black uppercase text-red-300">
                    <Swords className="w-4 h-4 text-red-400" /> PACT BETRAYAL DETECTED!
                  </div>
                  <p className="text-[11px] text-red-300/90">
                    {activeVoter.name} broke secret corridor alliance with <strong>{activeBetrayedAlly?.name || 'Ally'}</strong>! ($15 escrow refunded).
                  </p>
                </div>
              )}

              {activeVote.isHonoredPact && (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs font-mono shadow-md">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Pact Honored:</strong> {activeVoter.name} delivered promised vote against {activeTarget.name}! ($15 escrow released).
                  </span>
                </div>
              )}

              {/* Voter's Secret Reason Quote */}
              {activeVote.reason && (
                <div className="p-3 rounded-xl bg-black/50 border border-slate-800/80 text-xs text-slate-300 italic font-sans">
                  &ldquo;{activeVote.reason}&rdquo;
                </div>
              )}
            </div>
          )}

          {/* 3. INITIAL BALLOTS TALLIED SCENE */}
          {phase === 'VOTES_TALLIED' && choppingBlockCandidate && (
            <div className="flex flex-col items-center justify-center text-center gap-4 animate-fade-in max-w-md">
              <div className="p-4 rounded-3xl bg-amber-500/15 border border-amber-500/40 text-amber-300 shadow-2xl">
                <AlertTriangle className="w-12 h-12 animate-pulse" />
              </div>
              <h2 className="text-xl sm:text-2xl font-display font-black text-white uppercase tracking-wide">
                Initial Ballots Counted!
              </h2>
              <div className="p-4 rounded-2xl bg-red-950/60 border border-red-600/80 flex items-center gap-3">
                <CandidateAvatar candidate={choppingBlockCandidate} size="sm" showBadge={false} />
                <div className="text-left">
                  <span className="text-xs font-mono text-red-400 font-bold uppercase block">
                    ON THE CHOPPING BLOCK:
                  </span>
                  <span className="text-base font-display font-black text-white">
                    {choppingBlockCandidate.name} ({sortedCandidateList[0].votes} Votes)
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                {totalBailouts > 0 
                  ? 'Emergency $40 Capitol Vote Bailouts will now process sequentially...' 
                  : 'No bailouts available. Preparing final elimination lock...'}
              </p>
            </div>
          )}

          {/* 4. BAILOUT AUCTION SCENE */}
          {phase === 'BAILOUTS' && activeBailoutTx && activeBailoutCandidate && (
            <div 
              ref={bailoutCashRef}
              className="w-full max-w-lg flex flex-col gap-4 p-5 sm:p-6 rounded-3xl bg-gradient-to-b from-[#064e3b] via-[#022c22] to-[#01140e] border-2 border-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.3)] relative overflow-hidden animate-fade-in"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-emerald-700/80 pb-3">
                <span className="text-xs font-mono font-black text-emerald-300 uppercase tracking-widest flex items-center gap-1.5">
                  <Banknote className="w-4 h-4" /> CAPITOL BAILOUT AUCTION (#{currentBailoutIndex + 1}/{totalBailouts})
                </span>
                <span className="text-xs font-mono font-black px-2 py-0.5 rounded-md bg-emerald-400 text-black">
                  -$40 VOTE REMOVAL
                </span>
              </div>

              {/* Candidate Vault Aura Spotlight */}
              <div className="flex items-center justify-between gap-4 my-2">
                <div className="flex items-center gap-3">
                  <CandidateAvatar candidate={activeBailoutCandidate} size="md" showBadge={false} />
                  <div className="flex flex-col">
                    <span className="text-base sm:text-lg font-display font-black text-white">
                      {activeBailoutCandidate.name}
                    </span>
                    <span className="text-xs font-mono text-emerald-300 font-bold">
                      Treasury Balance: ${activeBailoutTx.remainingBudget} remaining
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-2xl font-black font-mono text-emerald-300 animate-pulse">
                    {activeBailoutTx.initialVotes} &rarr; {activeBailoutTx.remainingVotes}
                  </span>
                  <span className="text-[10px] font-mono text-slate-300 uppercase">
                    Votes Reduced!
                  </span>
                </div>
              </div>

              {/* Action Banner */}
              <div className="p-3.5 rounded-2xl bg-black/60 border border-emerald-500/60 text-xs font-mono text-emerald-200 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>
                  <strong>{activeBailoutCandidate.name}</strong> paid $40 to successfully eliminate 1 vote against them, altering the chopping block!
                </span>
              </div>
            </div>
          )}

          {/* 5. ELIMINATION OR WINNER LOCK SCENE */}
          {(phase === 'ELIMINATION_LOCKED' || phase === 'COMPLETE') && (
            <div className="flex flex-col items-center justify-center text-center gap-5 animate-fade-in max-w-lg relative">
              {isFinalVote && winningCandidate ? (
                <>
                  <div className="p-5 rounded-full bg-amber-500/20 border-2 border-amber-400 text-amber-300 shadow-2xl shadow-amber-500/40 animate-bounce">
                    <Crown className="w-16 h-16 text-amber-400" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-white uppercase tracking-wider">
                    {winningCandidate.name}
                  </h2>
                  <div className="px-4 py-1.5 rounded-full bg-amber-400 text-black font-display font-black text-sm uppercase tracking-widest shadow-xl">
                    Elected 50th President of Valoria
                  </div>
                </>
              ) : eliminatedCandidate ? (
                <>
                  <div className="relative">
                    <CandidateAvatar candidate={eliminatedCandidate} size="lg" isEliminated={true} showBadge={false} />
                    
                    {/* Metallic ELIMINATED Stamp */}
                    <div 
                      ref={eliminationStampRef}
                      className="absolute -bottom-2 -right-4 px-4 py-1.5 rounded-xl bg-red-600 text-white font-display font-black text-lg uppercase tracking-widest border-2 border-white shadow-2xl shadow-red-950 transform rotate-[-6deg]"
                    >
                      ELIMINATED
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-1 mt-2">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-black text-white uppercase">
                      {eliminatedCandidate.name}
                    </h2>
                    <span className="text-xs font-mono text-red-400 font-bold uppercase">
                      Eliminated with {tally.tally[eliminatedCandidate.id] || 0} Votes &bull; Out of Bailout Funds
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 font-mono">
                    Concession statement recording in progress...
                  </p>
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. BOTTOM FILMSTRIP TAPE: CHRONOLOGICAL UNSEALED BALLOT RIBBON */}
      {/* ========================================================================= */}
      <div className="relative z-20 flex flex-col gap-1.5 pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase font-bold px-1">
          <span>Unsealed Ballot Sequence ({Math.max(0, currentBallotIndex + 1)} of {totalBallots})</span>
          <span>Automatic Progression Active</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1">
          {tally.votes.map((v, idx) => {
            const voter = CANDIDATE_MAP.get(v.voterId);
            const target = CANDIDATE_MAP.get(v.targetId);
            const isRevealed = idx <= currentBallotIndex;
            const isCurrent = idx === currentBallotIndex;

            if (!voter || !target) return null;

            return (
              <div
                key={idx}
                className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-mono transition-all duration-300 ${
                  isCurrent
                    ? 'bg-cyan-950 border-cyan-400 text-white shadow-md shadow-cyan-500/30 scale-105 ring-1 ring-cyan-400'
                    : isRevealed
                    ? v.isBetrayal
                      ? 'bg-red-950/70 border-red-700 text-red-200'
                      : v.isHonoredPact
                      ? 'bg-emerald-950/70 border-emerald-700 text-emerald-200'
                      : 'bg-slate-900 border-slate-750 text-slate-300'
                    : 'bg-slate-950/40 border-slate-850 text-slate-600 opacity-40'
                }`}
              >
                <span className="text-[10px] font-bold text-slate-400">#{idx + 1}</span>
                <CandidateAvatar candidate={voter} size="xs" showBadge={false} />
                <span className="font-bold">{voter.name.split(' ')[0]}</span>
                <span className="text-slate-500">&rarr;</span>
                <span className="font-bold" style={{ color: isRevealed ? target.color.primary : '#64748b' }}>
                  {target.name.split(' ')[0]}
                </span>
                {isRevealed && v.isBetrayal && (
                  <Swords className="w-3 h-3 text-red-400 ml-0.5" />
                )}
                {isRevealed && v.isHonoredPact && (
                  <ShieldCheck className="w-3 h-3 text-emerald-400 ml-0.5" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
