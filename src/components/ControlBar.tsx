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
  Settings
} from 'lucide-react';

interface ControlBarProps {
  gameState: GameState;
  nineRouterConfig: NineRouterConfigState;
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
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-900/90 border border-slate-800 rounded-2xl backdrop-blur-xl shadow-2xl">
      {/* Left: Playback Controls */}
      <div className="flex items-center gap-2">
        {isIdle ? (
          <button
            onClick={onStartGame}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/25 hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" /> Start Election
          </button>
        ) : (
          <>
            {/* Auto-play Toggle */}
            <button
              onClick={onToggleAutoPlay}
              disabled={isWinner}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                playback.autoPlay
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              } disabled:opacity-40`}
            >
              {playback.autoPlay ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" /> Pause
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" /> Auto-Play
                </>
              )}
            </button>

            {/* Step Next Button */}
            <button
              onClick={onNextStep}
              disabled={isLoading || playback.autoPlay || isWinner}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-cyan-400 border border-slate-700 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 hover:scale-102"
            >
              <SkipForward className="w-3.5 h-3.5" /> Next Step
            </button>
          </>
        )}

        {/* Retry Button if error */}
        {isError && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow animate-bounce"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry Request
          </button>
        )}

        {/* Restart Button */}
        {!isIdle && (
          <button
            onClick={onRestart}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 transition"
            title="Restart Simulation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Middle: Speed & Sound Settings */}
      <div className="flex items-center gap-2">
        {/* Speed Selector */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          <span className="text-[10px] font-mono text-slate-500 px-1.5 flex items-center gap-1">
            <Gauge className="w-3 h-3" />
          </span>
          {(['slow', 'normal', 'fast'] as const).map((spd) => (
            <button
              key={spd}
              onClick={() => onSetSpeed(spd)}
              className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition ${
                playback.speed === spd
                  ? 'bg-cyan-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {spd}
            </button>
          ))}
        </div>

        {/* Sound Toggle */}
        <button
          onClick={onToggleSound}
          className={`p-2 rounded-xl border transition ${
            playback.soundEnabled
              ? 'bg-slate-800 text-cyan-400 border-slate-700'
              : 'bg-slate-950 text-slate-500 border-slate-800'
          }`}
          title={playback.soundEnabled ? 'Mute SFX' : 'Enable SFX'}
        >
          {playback.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* Right: 9router Model Configuration & Status Button */}
      <button
        onClick={onOpenSettings}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/90 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/50 text-xs transition cursor-pointer group shadow-sm"
        title="Click to Configure 9router Endpoint, API Key & Model"
      >
        <Cpu className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-45 transition-transform" />
        <span className="font-mono text-[11px] text-slate-400">9router:</span>
        <span 
          className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
            isConfigured 
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40' 
              : 'bg-amber-500/15 text-amber-400 border border-amber-500/40 animate-pulse'
          }`}
        >
          <Zap className="w-2.5 h-2.5" />
          {nineRouterConfig.model || 'Configure Model'}
        </span>
        <Settings className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
      </button>
    </div>
  );
};
