'use client';

import React from 'react';
import { GameState } from '@/types/game';
import { Radio, Flame, Swords, Vote, Skull, Crown, Info, Eye, AlertTriangle } from 'lucide-react';

interface EventTickerProps {
  gameState: GameState;
  onOpenTranscript: () => void;
}

export const EventTicker: React.FC<EventTickerProps> = ({
  gameState,
  onOpenTranscript,
}) => {
  const latestLog = gameState.tickerLog[0];

  const renderIcon = (type: string) => {
    switch (type) {
      case 'betrayal':
        return <AlertTriangle className="w-3.5 h-3.5 text-red-400" />;
      case 'pact':
        return <Eye className="w-3.5 h-3.5 text-emerald-400" />;
      case 'attack':
        return <Swords className="w-3.5 h-3.5 text-red-400" />;
      case 'speech':
        return <Flame className="w-3.5 h-3.5 text-cyan-400" />;
      case 'vote':
        return <Vote className="w-3.5 h-3.5 text-purple-400" />;
      case 'elimination':
        return <Skull className="w-3.5 h-3.5 text-red-400" />;
      case 'winner':
        return <Crown className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Radio className="w-3.5 h-3.5 text-cyan-400" />;
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-[#080c15] border border-slate-750 rounded-2xl backdrop-blur-xl shadow-inner text-xs">
      {/* Live News Flash Tag */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-red-950 text-red-300 border border-red-600 text-[10px] font-display font-black uppercase tracking-wider animate-pulse shadow-sm">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          Live Wire
        </span>
      </div>

      {/* Latest Event Message */}
      <div className="flex items-center gap-2 overflow-hidden flex-1">
        {latestLog && (
          <div className="flex items-center gap-2 truncate font-mono text-slate-100 text-xs font-medium">
            {renderIcon(latestLog.type)}
            <span className="truncate">{latestLog.message}</span>
          </div>
        )}
      </div>

      {/* View Full Archive Button */}
      <button
        onClick={onOpenTranscript}
        className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition font-mono text-xs uppercase font-bold border border-slate-750 cursor-pointer"
      >
        <Info className="w-3.5 h-3.5 text-cyan-400" /> Log ({gameState.tickerLog.length})
      </button>
    </div>
  );
};
