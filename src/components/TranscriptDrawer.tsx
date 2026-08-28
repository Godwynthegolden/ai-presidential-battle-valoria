'use client';

import React, { useState } from 'react';
import { GameState } from '@/types/game';
import { CANDIDATE_MAP } from '@/data/candidates';
import { CandidateAvatar } from './CandidateAvatar';
import { 
  X, 
  FileText, 
  Flame, 
  Swords, 
  Vote, 
  Skull, 
  Crown, 
  Download,
  Filter
} from 'lucide-react';

interface TranscriptDrawerProps {
  isOpen: boolean;
  gameState: GameState;
  onClose: () => void;
}

export const TranscriptDrawer: React.FC<TranscriptDrawerProps> = ({
  isOpen,
  gameState,
  onClose,
}) => {
  const [filterType, setFilterType] = useState<string>('all');

  if (!isOpen) return null;

  const { campaignSpeeches, finalSpeeches, attacksByRound, votesByRound, eliminatedCandidates, victorySpeech, winnerId } = gameState;

  // Compile full event stream
  const allEvents: Array<{
    type: 'speech' | 'attack' | 'vote' | 'elimination' | 'winner';
    title: string;
    speakerId?: string;
    targetId?: string;
    text?: string;
    details?: any;
    round: number;
  }> = [];

  // 1. Campaign Speeches
  Object.entries(campaignSpeeches).forEach(([candId, text]) => {
    allEvents.push({
      type: 'speech',
      title: 'Campaign Speech',
      speakerId: candId,
      text,
      round: 1,
    });
  });

  // 2. Attacks by round
  Object.entries(attacksByRound).forEach(([rStr, attacks]) => {
    const r = parseInt(rStr, 10);
    attacks.forEach(a => {
      allEvents.push({
        type: 'attack',
        title: `Round ${r} Attack`,
        speakerId: a.attackerId,
        targetId: a.targetId,
        text: a.text,
        round: r,
      });
    });
  });

  // 3. Eliminations
  eliminatedCandidates.forEach(e => {
    allEvents.push({
      type: 'elimination',
      title: `Round ${e.eliminatedInRound} Elimination Exit Words`,
      speakerId: e.candidateId,
      text: e.exitWords,
      round: e.eliminatedInRound,
    });
  });

  // 4. Final Speeches
  Object.entries(finalSpeeches).forEach(([candId, text]) => {
    allEvents.push({
      type: 'speech',
      title: 'Final Presidential Appeal',
      speakerId: candId,
      text,
      round: 98,
    });
  });

  // 5. Winner Speech
  if (winnerId && victorySpeech) {
    allEvents.push({
      type: 'winner',
      title: 'Inaugural Presidential Address',
      speakerId: winnerId,
      text: victorySpeech,
      round: 100,
    });
  }

  const filteredEvents = filterType === 'all' 
    ? allEvents 
    : allEvents.filter(e => e.type === filterType);

  const downloadTranscript = () => {
    const content = allEvents.map(e => {
      const sp = e.speakerId ? CANDIDATE_MAP.get(e.speakerId)?.name : 'System';
      const tg = e.targetId ? ` (Target: ${CANDIDATE_MAP.get(e.targetId)?.name})` : '';
      return `[${e.title}] ${sp}${tg}:\n"${e.text || ''}"\n\n`;
    }).join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ai-presidential-debate-transcript.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl h-full bg-slate-950 border-l border-slate-800 p-6 flex flex-col gap-4 shadow-2xl overflow-hidden">
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-black text-white uppercase tracking-wide">
              Official Debate Record ({allEvents.length} Events)
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadTranscript}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition"
              title="Download TXT Transcript"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" />
          </span>
          {['all', 'speech', 'attack', 'elimination', 'winner'].map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 rounded-lg uppercase font-mono text-[10px] font-bold transition ${
                filterType === t
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Transcript Feed */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 custom-scrollbar">
          {filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-xs font-mono">
              No debate events recorded yet.
            </div>
          ) : (
            filteredEvents.map((event, idx) => {
              const speaker = event.speakerId ? CANDIDATE_MAP.get(event.speakerId) : null;
              const target = event.targetId ? CANDIDATE_MAP.get(event.targetId) : null;

              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {speaker && (
                        <CandidateAvatar
                          candidate={speaker}
                          size="sm"
                          showBadge={false}
                        />
                      )}
                      <div>
                        <span className="text-xs font-bold text-white">
                          {speaker?.name}
                        </span>
                        {target && (
                          <span className="text-[11px] text-red-400 ml-1.5">
                            &rarr; {target.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                      {event.title}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed italic bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                    "{event.text}"
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
