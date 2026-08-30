'use client';

import React from 'react';
import { GameState } from '@/types/game';
import { CandidateAvatar } from './CandidateAvatar';
import { VoteRevealBoard } from './VoteRevealBoard';
import { WinnerPodium } from './WinnerPodium';
import { CCTVBackroomView } from './CCTVBackroomView';
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
  Sparkles,
  Quote,
  Mic2,
  ShieldCheck,
  Target,
  Volume2,
  Mic,
  RotateCcw,
  Zap
} from 'lucide-react';

interface DebateArenaProps {
  gameState: GameState;
  onRetry: () => void;
  onRestart: () => void;
  onNextStep?: () => void;
  onSelectCCTVFeed?: (feedIndex: number) => void;
  onPlaySpeechAudio?: (text: string, voiceId?: string, speakerCandidateId?: string) => void;
  isSpeakingAudio?: boolean;
  isBufferingLookahead?: boolean;
  bufferingStatus?: string;
  lookaheadBufferCount?: number;
  ballotSpeed?: number;
  ballotAutoPlay?: boolean;
}

export const DebateArena: React.FC<DebateArenaProps> = ({
  gameState,
  onRetry,
  onRestart,
  onNextStep,
  onSelectCCTVFeed,
  onPlaySpeechAudio,
  isSpeakingAudio = false,
  isBufferingLookahead = false,
  bufferingStatus = '',
  lookaheadBufferCount = 0,
  ballotSpeed = 1.0,
  ballotAutoPlay = true,
}) => {
  const { stage, phase, round, votesByRound, pactsByRound, finalVoteTally, winnerId, eliminatedCandidates } = gameState;

  const speaker = stage.speakerId ? CANDIDATE_MAP.get(stage.speakerId) : null;
  const target = stage.targetId ? CANDIDATE_MAP.get(stage.targetId) : null;

  // Render CCTV Leaked Backroom Feed
  if (phase === 'CCTV_BACKROOM') {
    const pactsThisRound = pactsByRound[round] || [];
    const activeFeedIndex = gameState.currentSpeakerIndex || 0;
    const activePact = pactsThisRound[activeFeedIndex] || pactsThisRound[0] || null;

    return (
      <div className="flex-1 flex flex-col items-center justify-start p-2 md:p-4 h-full min-h-0 overflow-y-auto custom-scrollbar">
        <div className="w-full max-w-4xl my-auto">
          <CCTVBackroomView
            pact={activePact}
            allPactsThisRound={pactsThisRound}
            activeFeedIndex={activeFeedIndex}
            onSelectFeed={onSelectCCTVFeed}
            onPlaySpeechAudio={onPlaySpeechAudio}
            isSpeakingAudio={isSpeakingAudio}
            round={round}
            isLoading={stage.isLoading}
          />
        </div>
      </div>
    );
  }

  // Render Special Phases (Vote Reveal & Winner)
  if (phase === 'VOTE_REVEAL' && votesByRound[round]) {
    return (
      <VoteRevealBoard 
        tally={votesByRound[round]} 
        isFinalVote={false} 
        eliminatedId={votesByRound[round].eliminatedId}
        candidateBudgets={gameState.candidateBudgets}
        activeCandidateIds={gameState.activeCandidateIds}
        defaultSpeed={ballotSpeed}
        defaultAutoPlay={ballotAutoPlay}
        onComplete={onNextStep}
      />
    );
  }

  if (phase === 'FINAL_REVEAL' && finalVoteTally) {
    return (
      <VoteRevealBoard 
        tally={finalVoteTally} 
        isFinalVote={true} 
        eliminatedId={null}
        winnerId={winnerId}
        candidateBudgets={gameState.candidateBudgets}
        activeCandidateIds={gameState.participatingCandidateIds || gameState.activeCandidateIds}
        defaultSpeed={ballotSpeed}
        defaultAutoPlay={ballotAutoPlay}
        onComplete={onNextStep}
      />
    );
  }

  if (phase === 'WINNER' && winnerId) {
    const winningCandidate = CANDIDATE_MAP.get(winnerId)!;
    return (
      <div className="flex-1 flex flex-col items-center justify-start p-4 md:p-6 h-full min-h-0 overflow-y-auto custom-scrollbar">
        <div className="w-full max-w-3xl my-auto">
          <WinnerPodium 
            winner={winningCandidate}
            victorySpeech={gameState.victorySpeech || stage.content}
            eliminatedCount={eliminatedCandidates.length}
            totalRounds={round}
            onRestart={onRestart}
          />
        </div>
      </div>
    );
  }

  // Standard Stage Presentation (Campaign, Attack, Elimination, Final Speeches)
  return (
    <div className="flex-1 flex flex-col relative rounded-3xl bg-gradient-to-b from-[#0e1424] via-[#090d17] to-[#06080d] border border-slate-700/60 shadow-2xl overflow-hidden backdrop-blur-2xl h-full min-h-0">
      {/* Dynamic Background Stage Ambient Spotlight */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-80 blur-[100px] opacity-20 pointer-events-none transition-all duration-700 -z-10"
        style={{
          backgroundColor: speaker?.color.primary || '#06b6d4',
        }}
      />

      {/* Stage Header Banner */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-ping absolute opacity-75" />
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 relative shadow-sm shadow-red-500" />
          </div>
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-xs font-display font-black tracking-widest text-slate-100 uppercase">
              {stage.headline}
            </span>
          </div>
        </div>

        {/* Phase Type Badge */}
        <div className="flex items-center gap-2">
          {stage.actionType === 'attack' && (
            <span className="flex items-center gap-1.5 text-xs font-display font-black uppercase px-3 py-1 rounded-full bg-red-950/90 text-red-300 border border-red-500/60 shadow-sm shadow-red-500/20">
              <Swords className="w-3.5 h-3.5 text-red-400" /> Public Attack
            </span>
          )}
          {stage.actionType === 'speech' && (
            <span className="flex items-center gap-1.5 text-xs font-display font-black uppercase px-3 py-1 rounded-full bg-cyan-950/90 text-cyan-300 border border-cyan-500/60 shadow-sm shadow-cyan-500/20">
              <Mic2 className="w-3.5 h-3.5 text-cyan-400" /> Live Address
            </span>
          )}
          {stage.actionType === 'eliminated' && (
            <span className="flex items-center gap-1.5 text-xs font-display font-black uppercase px-3 py-1 rounded-full bg-red-950 text-red-300 border border-red-600 shadow-sm">
              <Skull className="w-3.5 h-3.5 text-red-400" /> Terminated
            </span>
          )}
          {stage.actionType === 'vote' && (
            <span className="flex items-center gap-1.5 text-xs font-display font-black uppercase px-3 py-1 rounded-full bg-purple-950/90 text-purple-300 border border-purple-500/60 shadow-sm">
              <Vote className="w-3.5 h-3.5 text-purple-400" /> Secret Ballot
            </span>
          )}
        </div>
      </div>

      {/* Main Arena Visual Area */}
      <div className="flex-1 flex flex-col justify-start items-center p-4 sm:p-6 md:p-8 relative min-h-0 overflow-y-auto custom-scrollbar">
        {/* 2-Step Lookahead Neural Pre-buffering Overlay */}
        {isBufferingLookahead && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center animate-step-transition">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/15 border-2 border-purple-500/50 flex items-center justify-center text-purple-400 mb-4 shadow-xl shadow-purple-500/20">
              <Zap className="w-8 h-8 text-cyan-400 animate-pulse" />
            </div>
            <h3 className="text-xl sm:text-2xl font-display font-black text-white uppercase tracking-tight">
              2-Step Neural Pipeline
            </h3>
            <p className="text-xs font-mono text-cyan-300 mt-2 mb-5 max-w-md leading-relaxed">
              {bufferingStatus || 'Pre-buffering Step 1 & Step 2 (AI Dialogue & Neural Voices)...'}
            </p>
            <div className="flex items-center gap-3 text-xs font-mono bg-slate-900/90 border border-purple-500/30 px-5 py-2.5 rounded-2xl text-slate-300 shadow-xl">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span>LLM Synthesis:</span>
              <span className="text-emerald-400 font-bold">Concurrent</span>
              <span className="text-slate-600">|</span>
              <span>Fish.Audio TTS:</span>
              <span className="text-purple-400 font-bold">Buffering Audio Streams</span>
            </div>
          </div>
        )}

        <div className="w-full flex flex-col items-center max-w-3xl my-auto lg:-translate-x-6 transition-transform duration-300">
        {/* If Error Occurred */}
        {stage.error ? (
          <div className="flex flex-col items-center justify-center text-center max-w-md p-8 rounded-3xl bg-red-950/50 border-2 border-red-600/80 shadow-2xl shadow-red-950/80 backdrop-blur-xl">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center mb-4 text-red-400">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-display font-bold text-red-100 uppercase tracking-wide">
              9router Request Interrupted
            </h3>
            <p className="text-sm text-red-200/90 mt-2 mb-6 leading-relaxed">
              {stage.error}
            </p>
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-display font-bold text-xs tracking-wider uppercase transition shadow-lg shadow-red-600/40 active:scale-95"
            >
              <RefreshCw className="w-4 h-4" /> Retry AI Generation
            </button>
          </div>
        ) : stage.actionType === 'attack' && speaker && target ? (
          /* Attack Showdown View: Attacker vs Target */
          <div 
            key={`attack-${speaker.id}-${target.id}-${gameState.currentSpeakerIndex}-${gameState.round}`}
            className="w-full flex flex-col items-center gap-6 max-w-3xl animate-step-transition"
          >
            <div className="flex items-center justify-between w-full max-w-xl px-4 pt-3">
              {/* Attacker Podium */}
              <div className="flex flex-col items-center gap-2.5">
                <CandidateAvatar
                  candidate={speaker}
                  size="xl"
                  isSpeaking={true}
                  isAttacking={true}
                />
                <div className="text-center">
                  <span className="text-base font-display font-black text-white tracking-wide block">
                    {speaker.name}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-red-400 uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-950/80 border border-red-800/60 inline-block mt-1">
                    Attacker ({speaker.codename})
                  </span>
                </div>
              </div>

              {/* Clash Energy Beam Icon */}
              <div className="flex flex-col items-center justify-center gap-1.5 px-4 text-red-500">
                <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/40 flex items-center justify-center shadow-lg shadow-red-500/20 animate-pulse">
                  <Swords className="w-6 h-6 text-red-400" />
                </div>
                <span className="text-[11px] font-display font-black uppercase tracking-widest bg-red-950 px-2.5 py-0.5 rounded-md border border-red-700 text-red-200">
                  VS
                </span>
              </div>

              {/* Target Podium */}
              <div className="flex flex-col items-center gap-2.5">
                <CandidateAvatar
                  candidate={target}
                  size="xl"
                  isTarget={true}
                />
                <div className="text-center">
                  <span className="text-base font-display font-black text-white tracking-wide block">
                    {target.name}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-800/60 inline-block mt-1">
                    Target ({target.codename})
                  </span>
                </div>
              </div>
            </div>

            {/* Attack Speech Box */}
            <div className="w-full relative rounded-3xl bg-slate-950/95 border-2 border-red-500/80 p-6 md:p-8 shadow-2xl shadow-red-950/70 backdrop-blur-xl">
              <div className="flex items-center justify-between absolute -top-3.5 left-6 right-6">
                <div className="px-3.5 py-1 rounded-md bg-red-600 text-white text-xs font-display font-black uppercase tracking-wider shadow-lg flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5" /> Public Denunciation
                </div>

                {!stage.isLoading && onPlaySpeechAudio && (
                  <button
                    type="button"
                    onClick={() => onPlaySpeechAudio(stage.content, speaker?.voice?.voiceId, speaker?.id)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-900/90 hover:bg-slate-800 text-purple-300 hover:text-white border border-purple-500/40 text-xs font-mono font-bold shadow-md transition active:scale-95 cursor-pointer"
                    title="Replay candidate's attack voice"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                    <span>{isSpeakingAudio ? 'Speaking...' : 'Replay Voice'}</span>
                  </button>
                )}
              </div>

              {stage.isLoading ? (
                <div className="flex items-center justify-center py-8 gap-3 text-red-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-sm font-mono tracking-wider">
                    Formulating attack via 9router AI...
                  </span>
                </div>
              ) : (
                <div className="relative">
                  <p className="text-lg sm:text-xl md:text-2xl font-sans font-semibold text-white leading-relaxed italic">
                    &ldquo;{stage.content}&rdquo;
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : speaker ? (
          /* Single Speaker Podium View (Campaign, Final Speech, Elimination) */
          <div 
            key={`speaker-${speaker.id}-${gameState.currentSpeakerIndex}-${gameState.phase}`}
            className="w-full flex flex-col items-center gap-6 max-w-3xl animate-step-transition"
          >
            {/* Speaker Podium Header Card */}
            <div className="flex flex-col items-center gap-3">
              <CandidateAvatar
                candidate={speaker}
                size="xl"
                isSpeaking={!stage.isLoading || isSpeakingAudio}
                isEliminated={stage.actionType === 'eliminated'}
              />
              <div className="text-center">
                <h2 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight flex items-center justify-center gap-2">
                  <span>{speaker.name}</span>
                </h2>
                <div className="flex items-center justify-center flex-wrap gap-2 mt-1.5">
                  <span 
                    className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border"
                    style={{ 
                      backgroundColor: `${speaker.color.primary}18`, 
                      color: speaker.color.primary,
                      borderColor: `${speaker.color.primary}44` 
                    }}
                  >
                    {speaker.archetypeTitle}
                  </span>
                  <span className="text-xs font-sans text-slate-300 font-medium">
                    &ldquo;{speaker.slogan}&rdquo;
                  </span>
                </div>
              </div>
            </div>

            {/* Speech Teleprompter Bubble (Major Overhaul) */}
            <div 
              className={`w-full relative rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl backdrop-blur-2xl transition-all duration-300 teleprompter-glow ${
                stage.actionType === 'eliminated'
                  ? 'bg-[#150a0e]/95 border-2 border-red-700/80 shadow-red-950/80'
                  : 'bg-[#0e1424]/95 border-2 shadow-black/80'
              }`}
              style={{
                borderColor: stage.actionType !== 'eliminated'
                  ? (speaker.color.primary || '#06b6d4')
                  : undefined,
              }}
            >
              {/* Top Speaker Identity Tag & Live Visualizer */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span 
                    className="w-2.5 h-2.5 rounded-full animate-pulse"
                    style={{ backgroundColor: speaker.color.primary }}
                  />
                  <span className="text-xs font-display font-black uppercase tracking-wider text-slate-200">
                    {speaker.titleRole}
                  </span>
                </div>

                {/* Animated Audio Equalizer Visualizer & Replay Audio Button */}
                {!stage.isLoading && (
                  <div className="flex items-center gap-3">
                    {onPlaySpeechAudio && (
                      <button
                        type="button"
                        onClick={() => onPlaySpeechAudio(stage.content, speaker.voice?.voiceId, speaker.id)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-purple-300 hover:text-white border border-purple-500/40 text-xs font-mono font-bold shadow-sm transition active:scale-95 cursor-pointer"
                        title="Replay candidate's speech with Fish Audio TTS"
                      >
                        <Volume2 className={`w-3.5 h-3.5 text-purple-400 ${isSpeakingAudio ? 'animate-pulse' : ''}`} />
                        <span>{isSpeakingAudio ? 'Speaking...' : 'Replay Voice'}</span>
                      </button>
                    )}

                    <div className="flex items-end gap-1 h-4">
                      <span className={`w-1 rounded-full ${isSpeakingAudio ? 'bg-purple-400 animate-equalizer eq-bar-1' : 'bg-slate-600 h-1'}`} />
                      <span className={`w-1 rounded-full ${isSpeakingAudio ? 'bg-purple-400 animate-equalizer eq-bar-2' : 'bg-slate-600 h-2'}`} />
                      <span className={`w-1 rounded-full ${isSpeakingAudio ? 'bg-purple-400 animate-equalizer eq-bar-3' : 'bg-slate-600 h-1.5'}`} />
                      <span className={`w-1 rounded-full ${isSpeakingAudio ? 'bg-purple-400 animate-equalizer eq-bar-4' : 'bg-slate-600 h-2.5'}`} />
                    </div>
                  </div>
                )}
              </div>

              {stage.isLoading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-cyan-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="text-sm font-mono tracking-wider font-semibold">
                    {stage.content}
                  </span>
                </div>
              ) : (
                <div className="relative">
                  <Quote className="absolute -top-3 -left-3 w-10 h-10 text-white/5 -z-0 pointer-events-none" />
                  <p className="text-xl sm:text-2xl md:text-3xl font-sans font-semibold text-white leading-relaxed md:leading-snug tracking-normal relative z-10">
                    &ldquo;{stage.content}&rdquo;
                  </p>

                  {/* Context Shelf Footer */}
                  <div className="flex items-center justify-between flex-wrap gap-2 mt-6 pt-4 border-t border-slate-800/80 text-xs text-slate-300 font-sans">
                    <span className="flex items-center gap-2 text-slate-200">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      <strong className="font-semibold text-white">Platform:</strong> {speaker.ideology}
                    </span>
                    <span className="font-mono font-bold text-slate-400 uppercase text-[11px] px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800">
                      Speaker {gameState.currentSpeakerIndex + 1} of {gameState.activeCandidateIds.length}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Idle Start Screen */
          <div className="flex flex-col items-center justify-center text-center max-w-xl p-8 animate-fade-in">
            <div className="w-24 h-24 rounded-3xl bg-cyan-500/10 border-2 border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-6 shadow-2xl shadow-cyan-500/20">
              <Crown className="w-12 h-12 drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-black text-white tracking-tight uppercase">
              Republic of Valoria
            </h2>
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest mt-1 mb-4 block">
              AI Presidential Reality Debate Arena
            </span>
            <p className="text-base text-slate-200 leading-relaxed max-w-md mb-8 font-medium">
              {stage.content || 'Autonomous political agents debate, attack, form secret backroom alliances, and face elimination until one emerges victorious.'}
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-200 font-mono bg-slate-950/80 px-5 py-2.5 rounded-2xl border border-slate-800 shadow-lg">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live AI Engine:</span>
              <span className="text-cyan-300 font-bold">9router Configured</span>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

