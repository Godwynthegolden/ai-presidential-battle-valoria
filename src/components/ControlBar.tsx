'use client';

import React from 'react';
import { GameState } from '@/types/game';
import { NineRouterConfigState } from './NineRouterSettingsModal';
import { 
  Play, 
  Pause, 
  SkipForward, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Gauge, 
  Zap, 
  RefreshCw,
  Cpu,
  Settings,
  FolderDown,
  Save
} from 'lucide-react';

interface ControlBarProps {
  gameState: GameState;
  nineRouterConfig: NineRouterConfigState;
  lookaheadBufferCount?: number;
  isBufferingLookahead?: boolean;
  isFullRoundPrebuffering?: boolean;
  sessionSaveName?: string;
  onSessionSaveNameChange?: (name: string) => void;
  onOpenSettings: () => void;
  onStartGame: () => void;
  onNextStep: () => void;
  onToggleAutoPlay: () => void;
  onSetSpeed: (speed: 'slow' | 'normal' | 'fast') => void;
  onToggleSound: () => void;
  onRestart: () => void;
  onRetry: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  gameState,
  nineRouterConfig,
  lookaheadBufferCount = 0,
  isBufferingLookahead = false,
  isFullRoundPrebuffering = false,
  sessionSaveName = '',
  onSessionSaveNameChange,
  onOpenSettings,
  onStartGame,
  onNextStep,
  onToggleAutoPlay,
  onSetSpeed,
  onToggleSound,
  onRestart,
  onRetry,
}) => {
  const { phase, stage, playback } = gameState;
  const isIdle = phase === 'IDLE';
  const isWinner = phase === 'WINNER';
  const isLoading = stage.isLoading;
  const isError = Boolean(stage.error);

  const isConfigured = Boolean(nineRouterConfig.baseUrl && nineRouterConfig.apiKey);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3.5 px-5 py-3.5 bg-[#0b0f19] border border-slate-700/80 rounded-2xl backdrop-blur-2xl shadow-xl">
      {/* Left: Playback Controls & Session Save Input */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {isIdle ? (
          <>
            <button
              onClick={onStartGame}
              disabled={isLoading || isFullRoundPrebuffering}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-display font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/30 hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Start Debate (Shortcut: ArrowRight / ArrowDown)"
            >
              {isFullRoundPrebuffering ? (
                <>
                  <RefreshCw className="w-4 h-4 fill-current text-black animate-spin" />
                  <span>Buffering Round 1...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current text-black" /> 
                  <span>Start Debate</span>
                  <span className="ml-1 px-1.5 py-0.2 rounded bg-slate-950/80 border border-slate-700 text-cyan-300 text-[10px] font-mono font-bold">→</span>
                </>
              )}
            </button>

            {/* Session Save Name Text Box */}
            <div className="relative flex items-center">
              <FolderDown className="w-3.5 h-3.5 text-cyan-400/80 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={sessionSaveName}
                onChange={(e) => onSessionSaveNameChange?.(e.target.value)}
                placeholder="Session Name (optional)"
                className="pl-8.5 pr-6 py-2 text-xs font-mono bg-slate-950/90 border border-slate-750 hover:border-cyan-500/50 focus:border-cyan-400 focus:outline-hidden rounded-xl text-slate-200 placeholder-slate-500 w-44 sm:w-56 transition-all shadow-inner"
                title="Optional: Type a name to auto-save all text & voice audio to saved-games/<name>/"
              />
              {sessionSaveName && (
                <button
                  onClick={() => onSessionSaveNameChange?.('')}
                  className="absolute right-2 text-slate-500 hover:text-slate-300 text-xs px-1 cursor-pointer"
                  title="Clear session name"
                >
                  ×
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Auto-play / Auto-Next Toggle */}
            <button
              onClick={onToggleAutoPlay}
              disabled={isWinner || isFullRoundPrebuffering}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-display font-black uppercase tracking-wider transition-all border cursor-pointer ${
                playback.autoPlay
                  ? 'bg-amber-400 text-black border-amber-300 shadow-md shadow-amber-500/30'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
              } disabled:opacity-40`}
              title={
                nineRouterConfig?.autoNextMode
                  ? `Automatic Next Mode: advances ${(nineRouterConfig.autoNextDelay ?? 0.75).toFixed(2)}s after dialogue & subtitles finish`
                  : 'Toggle Auto-Play'
              }
            >
              {playback.autoPlay ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" /> 
                  <span>{nineRouterConfig?.autoNextMode ? `Auto-Next [${(nineRouterConfig.autoNextDelay ?? 0.75).toFixed(2)}s]` : 'Pause'}</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" /> 
                  <span>{nineRouterConfig?.autoNextMode ? 'Resume Auto-Next' : 'Auto-Play'}</span>
                </>
              )}
            </button>

            {/* Step Next Button */}
            <button
              onClick={onNextStep}
              disabled={isLoading || isWinner || isFullRoundPrebuffering}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-display font-black uppercase tracking-wider transition-all disabled:opacity-40 hover:scale-102 cursor-pointer shadow-xs"
              title="Next Step (Shortcut: ArrowRight / ArrowDown)"
            >
              {isFullRoundPrebuffering ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Buffering...</span>
                </>
              ) : (
                <>
                  <SkipForward className="w-3.5 h-3.5" /> 
                  <span>Next Step</span>
                  <span className="ml-1 px-1.5 py-0.2 rounded bg-slate-950 border border-slate-700 text-slate-400 text-[10px] font-mono font-bold">→</span>
                </>
              )}
            </button>

            {/* Live Recording Status Indicator */}
            {sessionSaveName && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs font-mono shadow-inner">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-cyan-300 font-bold hidden sm:inline">REC:</span>
                <span className="text-white truncate max-w-28 font-bold">{sessionSaveName}</span>
              </div>
            )}
          </>
        )}

        {/* Retry Button if error */}
        {isError && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-display font-black uppercase tracking-wider transition-all shadow-md shadow-red-600/40 animate-pulse cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        )}

        {/* Restart Button */}
        {!isIdle && (
          <button
            onClick={onRestart}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 transition cursor-pointer"
            title="Restart Simulation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Center: Live Debate Timer / Round Indicator */}
      {(() => {
        const isEndgame = gameState.round === 99 || 
          phase === 'FINAL_SPEECHES' || 
          phase === 'FINAL_VOTE' || 
          phase === 'FINAL_REVEAL' || 
          phase === 'WINNER' ||
          (phase === 'VOTE_CONFESSIONAL' && Boolean(gameState.finalVoteTally));

        return (
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-mono transition-colors ${
            isEndgame
              ? 'bg-amber-950/50 border-amber-500/50 text-amber-300 shadow-sm shadow-amber-500/20'
              : 'bg-slate-950/90 border-slate-800 text-slate-300'
          }`}>
            <span className="text-slate-400 font-bold uppercase tracking-wider">Status:</span>
            <span className={`font-bold uppercase tracking-wider ${isEndgame ? 'text-amber-200' : 'text-white'}`}>
              {phase === 'FINAL_SPEECHES'
                ? 'Final 3 Debate'
                : (phase === 'FINAL_VOTE' || (phase === 'VOTE_CONFESSIONAL' && isEndgame))
                ? 'Presidential Election'
                : phase === 'FINAL_REVEAL'
                ? 'Presidential Tally'
                : phase === 'WINNER'
                ? 'President Inauguration'
                : phase.replace('_', ' ')}
            </span>
            <span className="text-slate-600">•</span>
            <span className={`font-bold ${isEndgame ? 'text-amber-400' : 'text-cyan-400'}`}>
              {isEndgame ? 'Grand Finale' : `Round ${gameState.round}`}
            </span>
          </div>
        );
      })()}

      {/* Center-Right: Speed & Audio Controls */}
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800">
          {(['slow', 'normal', 'fast'] as const).map(s => (
            <button
              key={s}
              onClick={() => onSetSpeed(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold capitalize transition cursor-pointer ${
                playback.speed === s
                  ? 'bg-cyan-500 text-black shadow-xs font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Audio FX Mute / Unmute Button */}
        <button
          onClick={onToggleSound}
          className={`p-2 rounded-xl border transition cursor-pointer ${
            playback.soundEnabled
              ? 'bg-purple-950/80 text-purple-300 border-purple-500/50 hover:bg-purple-900 shadow-xs'
              : 'bg-slate-950 text-slate-500 border-slate-800'
          }`}
          title={playback.soundEnabled ? 'Mute SFX' : 'Enable SFX'}
        >
          {playback.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* Center-Right: Lookahead Neural Pipeline Monitor */}
      {!isIdle && (
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-purple-500/30 text-xs font-mono shadow-inner">
          <span className={`w-2 h-2 rounded-full ${isBufferingLookahead || isFullRoundPrebuffering ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
          <span className="text-[11px] font-bold text-slate-300">
            {nineRouterConfig.fullRoundBuffering ? 'Full-Round Pipeline:' : `${nineRouterConfig?.lookaheadDepth || 2}-Step Pipeline:`}
          </span>
          {isFullRoundPrebuffering ? (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 flex items-center gap-1">
              <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
              Pre-Buffering Round 1...
            </span>
          ) : (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/40 text-purple-300 flex items-center gap-1">
              <Zap className="w-3 h-3 text-cyan-400" />
              {nineRouterConfig.fullRoundBuffering
                ? `${lookaheadBufferCount} Steps Ready (Auto-Buffered 🎙️)`
                : isBufferingLookahead
                ? 'Buffering LLM+TTS...'
                : `${Math.max(lookaheadBufferCount, nineRouterConfig?.lookaheadDepth || 2)}/${nineRouterConfig?.lookaheadDepth || 2} Ready (LLM ✓ | TTS 🎙️)`
              }
            </span>
          )}
        </div>
      )}

      {/* Right: 9router Model Configuration & Status Button */}
      <button
        onClick={onOpenSettings}
        className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-750 hover:border-cyan-500/50 text-xs transition cursor-pointer group shadow-sm"
        title="Click to Configure 9router Endpoint, API Key & Model"
      >
        <Cpu className="w-4 h-4 text-cyan-400 group-hover:rotate-45 transition-transform" />
        <span className="font-mono text-xs text-slate-400">9router:</span>
        <span 
          className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-md flex items-center gap-1.5 ${
            isConfigured 
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40' 
              : 'bg-amber-500/15 text-amber-300 border border-amber-500/40 animate-pulse'
          }`}
        >
          <Zap className="w-3 h-3 text-cyan-400" />
          {nineRouterConfig.model || 'Configure Model'}
        </span>
        <Settings className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
      </button>
    </div>
  );
};
