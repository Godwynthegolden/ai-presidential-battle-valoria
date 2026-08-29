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
    <div className="flex flex-wrap items-center justify-between gap-3.5 px-5 py-3.5 bg-[#0b0f19] border border-slate-700/80 rounded-2xl backdrop-blur-2xl shadow-xl">
      {/* Left: Playback Controls */}
      <div className="flex items-center gap-2.5">
        {isIdle ? (
          <button
            onClick={onStartGame}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-display font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/30 hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" /> Start Debate
          </button>
        ) : (
          <>
            {/* Auto-play Toggle */}
            <button
              onClick={onToggleAutoPlay}
              disabled={isWinner}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-display font-black uppercase tracking-wider transition-all border cursor-pointer ${
                playback.autoPlay
                  ? 'bg-amber-400 text-black border-amber-300 shadow-md shadow-amber-500/30'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
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
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-display font-black uppercase tracking-wider transition-all disabled:opacity-40 hover:scale-102 cursor-pointer shadow-xs"
            >
              <SkipForward className="w-3.5 h-3.5" /> Next Step
            </button>
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

      {/* Middle: Speed & Sound Settings */}
      <div className="flex items-center gap-2.5">
        {/* Speed Selector */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 px-1.5 flex items-center gap-1">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
          </span>
          {(['slow', 'normal', 'fast'] as const).map((spd) => (
            <button
              key={spd}
              onClick={() => onSetSpeed(spd)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold uppercase transition cursor-pointer ${
                playback.speed === spd
                  ? 'bg-cyan-400 text-black shadow-xs font-black'
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
          className={`p-2.5 rounded-xl border transition cursor-pointer ${
            playback.soundEnabled
              ? 'bg-slate-900 text-cyan-300 border-slate-700 shadow-xs'
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
