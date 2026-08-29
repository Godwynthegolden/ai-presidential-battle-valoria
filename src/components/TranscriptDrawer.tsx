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

  const { campaignSpeeches, finalSpeeches, attacksByRound, pactsByRound, votesByRound, eliminatedCandidates, victorySpeech, winnerId } = gameState;

  // Compile full event stream
  const allEvents: Array<{
    type: 'speech' | 'attack' | 'pact' | 'vote' | 'elimination' | 'winner';
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

  // 3. Backroom Pacts by round
  Object.entries(pactsByRound).forEach(([rStr, pacts]) => {
    const r = parseInt(rStr, 10);
    pacts.forEach(p => {
      allEvents.push({
        type: 'pact',
        title: `Round ${r} Leaked CCTV Backroom Deal`,
        speakerId: p.proposerId,
        targetId: p.receiverId,
        text: `[Targeting: ${CANDIDATE_MAP.get(p.agreedTargetId)?.name}] "${p.whisperText}" (${p.location})`,
        round: r,
      });
    });
  });

  // 4. Eliminations
  eliminatedCandidates.forEach(e => {
    allEvents.push({
      type: 'elimination',
      title: `Round ${e.eliminatedInRound} Elimination Exit Words`,
      speakerId: e.candidateId,
      text: e.exitWords,
      round: e.eliminatedInRound,
    });
  });

  // 5. Final Speeches
  Object.entries(finalSpeeches).forEach(([candId, text]) => {
    allEvents.push({
      type: 'speech',
      title: 'Final Presidential Appeal',
      speakerId: candId,
      text,
      round: 98,
    });
  });

  // 6. Winner Speech
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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-xl h-full bg-[#0b0f19] border-l border-slate-750 p-6 flex flex-col gap-4 shadow-2xl overflow-hidden">
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base sm:text-lg font-display font-black text-white uppercase tracking-wide">
              Official Debate Record ({allEvents.length} Events)
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadTranscript}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono font-bold transition border border-slate-750 cursor-pointer"
              title="Download TXT Transcript"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-xs font-mono text-slate-400 uppercase flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
          </span>
          {['all', 'speech', 'attack', 'pact', 'elimination', 'winner'].map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1 rounded-xl uppercase font-mono text-xs font-bold transition cursor-pointer ${
                filterType === t
                  ? 'bg-cyan-500 text-black font-black shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Transcript Feed */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 custom-scrollbar">
          {filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 text-xs font-mono">
              No debate events recorded yet.
            </div>
          ) : (
            filteredEvents.map((event, idx) => {
              const speaker = event.speakerId ? CANDIDATE_MAP.get(event.speakerId) : null;
              const target = event.targetId ? CANDIDATE_MAP.get(event.targetId) : null;

              return (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2.5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {speaker && (
                        <CandidateAvatar
                          candidate={speaker}
                          size="sm"
                          showBadge={false}
                        />
                      )}
                      <div>
                        <span className="text-sm font-display font-black text-white">
                          {speaker?.name}
                        </span>
                        {target && (
                          <span className="text-xs font-mono text-red-400 ml-2 font-bold">
                            &rarr; {target.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-slate-750">
                      {event.title}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm font-sans font-medium text-slate-200 leading-relaxed italic bg-slate-900/70 p-3.5 rounded-xl border border-slate-800">
                    &ldquo;{event.text}&rdquo;
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
