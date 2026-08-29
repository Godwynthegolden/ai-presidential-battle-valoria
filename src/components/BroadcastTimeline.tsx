'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GameState } from '@/types/game';
import { CANDIDATE_MAP } from '@/data/candidates';
import { Candidate } from '@/types/candidate';
import { CandidateAvatar } from './CandidateAvatar';
import { 
  Flame, 
  Swords, 
  Eye, 
  Vote, 
  Skull, 
  Crown, 
  Radio, 
  Volume2, 
  Crosshair, 
  Sparkles, 
  Filter,
  ShieldCheck,
  AlertTriangle,
  History,
  TrendingUp,
  MessageSquareQuote
} from 'lucide-react';

interface BroadcastTimelineProps {
  gameState: GameState;
  onSelectCandidate: (candidate: Candidate) => void;
}

interface TimelineItem {
  id: string;
  type: 'speech' | 'attack' | 'pact' | 'vote' | 'elimination' | 'winner';
  round: number;
  title: string;
  speakerId?: string;
  targetId?: string;
  partnerId?: string;
  extraTargetId?: string;
  text?: string;
  isBetrayal?: boolean;
  isHonoredPact?: boolean;
  voteCount?: number;
  location?: string;
}

export const BroadcastTimeline: React.FC<BroadcastTimelineProps> = ({
  gameState,
  onSelectCandidate,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { 
    campaignSpeeches, 
    finalSpeeches, 
    attacksByRound, 
    pactsByRound, 
    votesByRound, 
    eliminatedCandidates, 
    victorySpeech, 
    winnerId 
  } = gameState;

  // Build full chronological list
  const events: TimelineItem[] = [];

  // 1. Campaign Speeches
  Object.entries(campaignSpeeches).forEach(([candId, text]) => {
    events.push({
      id: `speech-r1-${candId}`,
      type: 'speech',
      round: 1,
      title: 'Campaign Speech',
      speakerId: candId,
      text,
    });
  });

  // 2. Attacks by Round
  Object.entries(attacksByRound).forEach(([rStr, attacks]) => {
    const r = parseInt(rStr, 10);
    attacks.forEach(a => {
      events.push({
        id: a.id || `attack-r${r}-${a.attackerId}-${a.targetId}`,
        type: 'attack',
        round: r,
        title: `R${r} Attack`,
        speakerId: a.attackerId,
        targetId: a.targetId,
        text: a.text,
      });
    });
  });

  // 3. CCTV Backroom Pacts
  Object.entries(pactsByRound).forEach(([rStr, pacts]) => {
    const r = parseInt(rStr, 10);
    pacts.forEach(p => {
      events.push({
        id: p.id || `pact-r${r}-${p.proposerId}-${p.receiverId}`,
        type: 'pact',
        round: r,
        title: `R${r} CCTV Backroom Deal`,
        speakerId: p.proposerId,
        partnerId: p.receiverId,
        extraTargetId: p.agreedTargetId,
        text: p.whisperText,
        location: p.location,
      });
    });
  });

  // 4. Eliminations
  eliminatedCandidates.forEach(e => {
    events.push({
      id: `elim-r${e.eliminatedInRound}-${e.candidateId}`,
      type: 'elimination',
      round: e.eliminatedInRound,
      title: `R${e.eliminatedInRound} Eliminated`,
      speakerId: e.candidateId,
      text: e.exitWords,
      voteCount: e.voteCount,
    });
  });

  // 5. Final Speeches
  Object.entries(finalSpeeches).forEach(([candId, text]) => {
    events.push({
      id: `final-speech-${candId}`,
      type: 'speech',
      round: 98,
      title: 'Grand Jury Final Appeal',
      speakerId: candId,
      text,
    });
  });

  // 6. Winner Inauguration
  if (winnerId && victorySpeech) {
    events.push({
      id: `winner-${winnerId}`,
      type: 'winner',
      round: 100,
      title: 'Presidential Inauguration',
      speakerId: winnerId,
      text: victorySpeech,
    });
  }

  // Reverse so newest/latest dramatic events appear at the top
  const sortedEvents = [...events].reverse();

  const filteredEvents = filterType === 'all'
    ? sortedEvents
    : sortedEvents.filter(e => {
        if (filterType === 'attacks') return e.type === 'attack';
        if (filterType === 'pacts') return e.type === 'pact';
        if (filterType === 'speeches') return e.type === 'speech';
        if (filterType === 'eliminations') return e.type === 'elimination' || e.type === 'winner';
        return true;
      });

  return (
    <div className="flex-1 flex flex-col rounded-3xl bg-[#0b0f19] border border-slate-750 p-4 md:p-5 backdrop-blur-2xl shadow-xl h-full overflow-hidden">
      {/* Timeline Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shadow-sm">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-display font-black text-white uppercase tracking-wide flex items-center gap-2">
              Live Battle Timeline
              <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-600 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> LIVE
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 font-sans">
              Instant visual stream of speeches, attacks &amp; secret alliances
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold text-slate-400 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
          {events.length} Events
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 py-2.5 overflow-x-auto custom-scrollbar shrink-0 text-xs">
        {[
          { id: 'all', label: 'All Events' },
          { id: 'attacks', label: '⚔️ Attacks' },
          { id: 'pacts', label: '📹 Backroom CCTV' },
          { id: 'speeches', label: '🎙️ Speeches' },
          { id: 'eliminations', label: '💀 Exits & Winner' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id)}
            className={`px-2.5 py-1 rounded-xl text-xs font-sans font-bold transition shrink-0 cursor-pointer ${
              filterType === tab.id
                ? 'bg-cyan-500 text-black font-black shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Events Feed */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto pr-1 py-1 flex flex-col gap-3 custom-scrollbar"
      >
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center text-slate-400 text-xs font-mono gap-2">
            <Radio className="w-8 h-8 text-slate-600 animate-pulse" />
            <p>Awaiting election broadcast actions...</p>
            <span className="text-[11px] text-slate-500">Events will populate as candidates speak, attack, and plot pacts.</span>
          </div>
        ) : (
          filteredEvents.map((item, idx) => {
            const speaker = item.speakerId ? CANDIDATE_MAP.get(item.speakerId) : null;
            const target = item.targetId ? CANDIDATE_MAP.get(item.targetId) : null;
            const partner = item.partnerId ? CANDIDATE_MAP.get(item.partnerId) : null;
            const extraTarget = item.extraTargetId ? CANDIDATE_MAP.get(item.extraTargetId) : null;

            const isLatest = idx === 0;

            return (
              <div
                key={item.id}
                className={`relative flex flex-col gap-2 p-3.5 rounded-2xl border transition-all duration-300 ${
                  isLatest
                    ? 'bg-[#0f172a]/95 border-cyan-500/80 shadow-lg shadow-cyan-950/40'
                    : item.type === 'attack'
                    ? 'bg-red-950/25 border-red-900/40 hover:border-red-600/70'
                    : item.type === 'pact'
                    ? 'bg-emerald-950/25 border-emerald-900/40 hover:border-emerald-600/70'
                    : item.type === 'elimination'
                    ? 'bg-rose-950/30 border-rose-900/50 hover:border-rose-600'
                    : item.type === 'winner'
                    ? 'bg-amber-950/40 border-amber-500/60 shadow-md shadow-amber-950/30'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Event Header with Visual Character Avatars */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    {/* Primary Speaker / Instigator Avatar */}
                    {speaker && (
                      <div 
                        onClick={() => onSelectCandidate(speaker)}
                        className="cursor-pointer hover:scale-105 transition shrink-0"
                        title={`View ${speaker.name}`}
                      >
                        <CandidateAvatar
                          candidate={speaker}
                          size="xs"
                          showBadge={false}
                        />
                      </div>
                    )}

                    {/* Interaction Arrow & Target / Partner Avatar */}
                    {item.type === 'attack' && target && (
                      <>
                        <span className="text-red-400 font-black text-xs shrink-0">&rarr;</span>
                        <div 
                          onClick={() => onSelectCandidate(target)}
                          className="cursor-pointer hover:scale-105 transition shrink-0"
                          title={`Target: ${target.name}`}
                        >
                          <CandidateAvatar
                            candidate={target}
                            size="xs"
                            showBadge={false}
                          />
                        </div>
                      </>
                    )}

                    {item.type === 'pact' && partner && (
                      <>
                        <span className="text-emerald-400 font-black text-xs shrink-0">&amp;</span>
                        <div 
                          onClick={() => onSelectCandidate(partner)}
                          className="cursor-pointer hover:scale-105 transition shrink-0"
                          title={`Ally: ${partner.name}`}
                        >
                          <CandidateAvatar
                            candidate={partner}
                            size="xs"
                            showBadge={false}
                          />
                        </div>

                        {extraTarget && (
                          <div className="flex items-center gap-1 ml-1 bg-red-950/60 px-1.5 py-0.5 rounded-md border border-red-800/80 text-[10px] text-red-300 font-mono">
                            <Crosshair className="w-2.5 h-2.5 text-red-400" />
                            <span>{extraTarget.name.split(' ')[0]}</span>
                          </div>
                        )}
                      </>
                    )}

                    {/* Character Names in Bold */}
                    <div className="truncate text-xs font-display font-black text-white">
                      {speaker?.name.split(' ')[0]}
                      {target && <span className="text-red-400 font-bold ml-1">vs {target.name.split(' ')[0]}</span>}
                      {partner && <span className="text-emerald-400 font-bold ml-1">+ {partner.name.split(' ')[0]}</span>}
                    </div>
                  </div>

                  {/* Action Badge */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isLatest && (
                      <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-cyan-400 text-black shadow-xs animate-pulse">
                        LATEST
                      </span>
                    )}

                    {item.type === 'attack' ? (
                      <span className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-red-950 text-red-300 border border-red-600/70">
                        <Swords className="w-2.5 h-2.5 text-red-400" /> Attack
                      </span>
                    ) : item.type === 'pact' ? (
                      <span className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-600/70">
                        <Eye className="w-2.5 h-2.5 text-emerald-400" /> CCTV Leak
                      </span>
                    ) : item.type === 'elimination' ? (
                      <span className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-rose-950 text-rose-300 border border-rose-600/70">
                        <Skull className="w-2.5 h-2.5 text-rose-400" /> Eliminated
                      </span>
                    ) : item.type === 'winner' ? (
                      <span className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-amber-400 text-black font-black">
                        <Crown className="w-2.5 h-2.5 text-black" /> Elected
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-slate-900 text-cyan-300 border border-slate-750">
                        <MessageSquareQuote className="w-2.5 h-2.5 text-cyan-400" /> Speech
                      </span>
                    )}
                  </div>
                </div>

                {/* Event Quote / Snippet Box */}
                {item.text && (
                  <p className="text-xs sm:text-[13px] font-sans font-medium text-slate-200 leading-relaxed italic bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                    &ldquo;{item.text}&rdquo;
                  </p>
                )}

                {/* Extra metadata note */}
                {item.location && (
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-850">
                    <span className="text-emerald-400 font-bold">&bull; Backroom Location:</span>
                    <span>{item.location}</span>
                  </div>
                )}

                {item.voteCount !== undefined && (
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-850">
                    <span className="text-rose-400 font-bold">&bull; Elimination Mandate:</span>
                    <span className="text-white font-bold">{item.voteCount} Votes</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
