'use client';

import React from 'react';
import { GameState } from '@/types/game';
import { CandidateAvatar } from './CandidateAvatar';
import { VoteRevealBoard } from './VoteRevealBoard';
import { WinnerPodium } from './WinnerPodium';
import { CANDIDATE_MAP } from '@/data/candidates';
import { 
  Radio, 
  Flame, 
  Swords, 
  Vote, 
  Skull, 
  Crown, 
  Loader2, 
  AlertCircle,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface DebateArenaProps {
  gameState: GameState;
  onRetry: () => void;
  onRestart: () => void;
}

export const DebateArena: React.FC<DebateArenaProps> = ({
  gameState,
  onRetry,
  onRestart,
}) => {
  const { stage, phase, round, votesByRound, finalVoteTally, winnerId, eliminatedCandidates } = gameState;

  const speaker = stage.speakerId ? CANDIDATE_MAP.get(stage.speakerId) : null;
  const target = stage.targetId ? CANDIDATE_MAP.get(stage.targetId) : null;

  // Render Special Phases (Vote Reveal & Winner)
  if (phase === 'VOTE_REVEAL' && votesByRound[round]) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <VoteRevealBoard 
          tally={votesByRound[round]} 
          isFinalVote={false} 
          eliminatedId={votesByRound[round].eliminatedId}
        />
      </div>
    );
  }

  if (phase === 'FINAL_REVEAL' && finalVoteTally) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <VoteRevealBoard 
          tally={finalVoteTally} 
          isFinalVote={true} 
          eliminatedId={null}
          winnerId={winnerId}
        />
      </div>
    );
  }

  if (phase === 'WINNER' && winnerId) {
    const winningCandidate = CANDIDATE_MAP.get(winnerId)!;
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <WinnerPodium 
          winner={winningCandidate}
          victorySpeech={gameState.victorySpeech || stage.content}
          eliminatedCount={eliminatedCandidates.length}
          totalRounds={round}
          onRestart={onRestart}
        />
      </div>
    );
  }

  // Standard Stage Presentation (Campaign, Attack, Elimination, Final Speeches)
  return (
    <div className="flex-1 flex flex-col relative rounded-2xl bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-slate-950 border border-slate-800/80 shadow-2xl overflow-hidden backdrop-blur-xl">
      {/* Dynamic Background Stage Glow */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-64 blur-3xl opacity-20 pointer-events-none transition-all duration-700 -z-10"
        style={{
          backgroundColor: speaker?.color.primary || (stage.actionType === 'attack' ? '#ef4444' : '#3b82f6'),
        }}
      />

      {/* Stage Header Banner */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800/80 bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping absolute" />
            <span className="w-2 h-2 rounded-full bg-red-500 relative" />
          </div>
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-black tracking-widest text-slate-300 uppercase">
              {stage.headline}
            </span>
          </div>
        </div>

        {/* Phase Type Badge */}
        <div className="flex items-center gap-2">
          {stage.actionType === 'attack' && (
            <span className="flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-red-600/20 text-red-400 border border-red-500/40 animate-pulse">
              <Swords className="w-3 h-3" /> Public Attack
            </span>
          )}
          {stage.actionType === 'speech' && (
            <span className="flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-cyan-600/20 text-cyan-400 border border-cyan-500/40">
              <Flame className="w-3 h-3" /> Address
            </span>
          )}
          {stage.actionType === 'eliminated' && (
            <span className="flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-red-950 text-red-400 border border-red-700 animate-pulse">
              <Skull className="w-3 h-3" /> Terminated
            </span>
          )}
          {stage.actionType === 'vote' && (
            <span className="flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-purple-600/20 text-purple-400 border border-purple-500/40">
              <Vote className="w-3 h-3" /> Secret Ballot
            </span>
          )}
        </div>
      </div>

      {/* Main Arena Visual Area */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-10 relative">
        {/* If Error Occurred */}
        {stage.error ? (
          <div className="flex flex-col items-center justify-center text-center max-w-md p-6 rounded-2xl bg-red-950/40 border border-red-800/80 shadow-xl">
            <AlertCircle className="w-12 h-12 text-red-400 mb-3 animate-bounce" />
            <h3 className="text-base font-bold text-red-200 uppercase tracking-wide">
              9router Request Interrupted
            </h3>
            <p className="text-xs text-red-300/80 mt-1.5 mb-4">
              {stage.error}
            </p>
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs tracking-wider uppercase transition shadow-lg shadow-red-600/30"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry Request
            </button>
          </div>
        ) : stage.actionType === 'attack' && speaker && target ? (
          /* Attack Showdown View: Attacker vs Target */
          <div className="w-full flex flex-col items-center gap-6">
            <div className="flex items-center justify-around w-full max-w-xl">
              {/* Attacker Podium */}
              <div className="flex flex-col items-center gap-2">
                <CandidateAvatar
                  candidate={speaker}
                  size="xl"
                  isSpeaking={true}
                  isAttacking={true}
                />
                <span className="text-sm font-black text-white tracking-wide">
                  {speaker.name}
                </span>
                <span className="text-[10px] font-mono text-red-400 uppercase tracking-wider">
                  Attacker ({speaker.codename})
                </span>
              </div>

              {/* Clash Energy Beam Icon */}
              <div className="flex flex-col items-center justify-center gap-1 text-red-500 animate-pulse">
                <Swords className="w-8 h-8" />
                <span className="text-[10px] font-black uppercase tracking-widest bg-red-950 px-2 py-0.5 rounded border border-red-800">
                  VS
                </span>
              </div>

              {/* Target Podium */}
              <div className="flex flex-col items-center gap-2">
                <CandidateAvatar
                  candidate={target}
                  size="xl"
                  isTarget={true}
                />
                <span className="text-sm font-black text-white tracking-wide">
                  {target.name}
                </span>
                <span className="text-[10px] font-mono text-red-400 uppercase tracking-wider">
                  Target ({target.codename})
                </span>
              </div>
            </div>

            {/* Attack Speech Box */}
            <div className="w-full max-w-2xl relative rounded-2xl bg-slate-900/90 border-2 border-red-500/60 p-6 shadow-2xl shadow-red-950/50 backdrop-blur-md animate-fade-in">
              <div className="absolute -top-3 left-6 px-3 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                Public Denunciation
              </div>

              {stage.isLoading ? (
                <div className="flex items-center justify-center py-6 gap-3 text-red-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-sm font-mono tracking-wider">
                    Formulating attack via 9router...
                  </span>
                </div>
              ) : (
                <p className="text-base md:text-lg font-medium text-slate-100 leading-relaxed italic">
                  "{stage.content}"
                </p>
              )}
            </div>
          </div>
        ) : speaker ? (
          /* Single Speaker Podium View (Campaign, Final Speech, Elimination) */
          <div className="w-full flex flex-col items-center gap-6 max-w-2xl">
            {/* Speaker Podium */}
            <div className="flex flex-col items-center gap-3">
              <CandidateAvatar
                candidate={speaker}
                size="xl"
                isSpeaking={!stage.isLoading}
                isEliminated={stage.actionType === 'eliminated'}
              />
              <div className="text-center">
                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                  {speaker.name}
                </h2>
                <p 
                  className="text-xs font-semibold uppercase tracking-wider mt-0.5"
                  style={{ color: speaker.color.primary }}
                >
                  {speaker.archetypeTitle} &bull; &ldquo;{speaker.slogan}&rdquo;
                </p>
              </div>
            </div>

            {/* Speech Teleprompter Bubble */}
            <div 
              className={`w-full relative rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-md transition-all duration-300 ${
                stage.actionType === 'eliminated'
                  ? 'bg-red-950/40 border-2 border-red-700/80 shadow-red-950/80'
                  : `bg-slate-900/90 border-2 ${speaker.color.border} shadow-slate-950/80`
              }`}
            >
              {stage.isLoading ? (
                <div className="flex items-center justify-center py-8 gap-3 text-cyan-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-sm font-mono tracking-wider">
                    {stage.content}
                  </span>
                </div>
              ) : (
                <div>
                  <p className="text-base md:text-xl font-medium text-slate-100 leading-relaxed">
                    {stage.content}
                  </p>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      Platform: {speaker.ideology.slice(0, 55)}...
                    </span>
                    <span className="uppercase text-slate-500">
                      Speaker {gameState.currentSpeakerIndex + 1}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Idle Start Screen */
          <div className="flex flex-col items-center justify-center text-center max-w-lg p-8">
            <div className="w-20 h-20 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-6 shadow-xl shadow-cyan-500/10">
              <Crown className="w-10 h-10" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase">
              Republic of Valoria Presidential Debate
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed mt-3 mb-6">
              {stage.content}
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">
              <span>Live AI Engine:</span>
              <span className="text-cyan-400 font-bold">9router Custom Endpoint</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
