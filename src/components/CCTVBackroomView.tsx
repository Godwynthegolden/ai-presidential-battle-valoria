'use client';

import React, { useState, useEffect } from 'react';
import { BackroomPact } from '@/types/game';
import { CandidateAvatar } from './CandidateAvatar';
import { CANDIDATE_MAP } from '@/data/candidates';
import { 
  Eye, 
  Radio, 
  Crosshair, 
  Volume2, 
  FileWarning, 
  Video, 
  ChevronLeft,
  ChevronRight, 
  ShieldAlert,
  Lock,
  Unlock,
  Coins,
  Handshake,
  Sparkles
} from 'lucide-react';

interface CCTVBackroomViewProps {
  pact: BackroomPact | null;
  allPactsThisRound?: BackroomPact[];
  activeFeedIndex?: number;
  onSelectFeed?: (index: number) => void;
  onPlaySpeechAudio?: (text: string, voiceId?: string, speakerCandidateId?: string) => void;
  isSpeakingAudio?: boolean;
  round: number;
  isLoading?: boolean;
}

export const CCTVBackroomView: React.FC<CCTVBackroomViewProps> = ({
  pact,
  allPactsThisRound = [],
  activeFeedIndex = 0,
  onSelectFeed,
  onPlaySpeechAudio,
  isSpeakingAudio = false,
  round,
  isLoading = false,
}) => {
  const [timecode, setTimecode] = useState('00:00:00.00');
  const [showSecretStrategy, setShowSecretStrategy] = useState(false);

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
    const interval = setInterval(update, 60);
    return () => clearInterval(interval);
  }, []);

  const displayedPact = pact || allPactsThisRound[activeFeedIndex] || allPactsThisRound[0];

  if (!displayedPact) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-black/90 rounded-3xl border border-emerald-900/50">
        <Radio className="w-12 h-12 text-emerald-400 animate-pulse mb-3" />
        <h3 className="text-xl font-display font-bold text-emerald-300 uppercase tracking-wider">
          Intercepting Capitol Surveillance Feeds...
        </h3>
        <p className="text-sm text-slate-300 font-mono mt-2 max-w-md">
          Scanning unmonitored hallways and private cloakrooms for backroom conspiracies...
        </p>
      </div>
    );
  }

  const proposer = CANDIDATE_MAP.get(displayedPact.proposerId);
  const receiver = CANDIDATE_MAP.get(displayedPact.receiverId);
  const target = CANDIDATE_MAP.get(displayedPact.agreedTargetId);
  const totalFeeds = allPactsThisRound.length;

  return (
    <div className="w-full flex-1 flex flex-col rounded-3xl bg-[#040805] border-2 border-emerald-500/70 shadow-[0_0_50px_rgba(16,185,129,0.25)] overflow-hidden relative backdrop-blur-2xl animate-fade-in">
      {/* CCTV Scanlines & CRT Distortion Filter Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px] pointer-events-none z-20 opacity-70" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.1),transparent_80%)] pointer-events-none -z-10" />

      {/* Top CCTV Camera OSD (On-Screen Display) */}
      <div className="flex flex-wrap items-center justify-between px-4 md:px-6 py-3 bg-emerald-950/90 border-b border-emerald-800/80 text-emerald-300 font-mono text-xs z-30 gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-red-950 text-red-300 font-black border border-red-700 animate-pulse shadow-sm">
            <span className="w-2 h-2 rounded-full bg-red-500" /> REC &bull; LIVE INTERCEPT
          </span>
          <span className="font-bold tracking-wider hidden sm:inline text-emerald-200">
            CAPITOL_SURVEILLANCE_GRID // CAM-{String(activeFeedIndex + 1).padStart(2, '0')}
          </span>
        </div>

        {/* Multi-Feed Camera Switcher Matrix */}
        {totalFeeds > 1 && (
          <div className="flex items-center gap-1.5 bg-black/80 p-1 rounded-xl border border-emerald-700/80 max-w-full overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <span className="text-[10px] text-slate-300 uppercase font-bold px-2 hidden lg:inline">
              CAM GRID:
            </span>
            {allPactsThisRound.map((p, idx) => {
              const p1 = CANDIDATE_MAP.get(p.proposerId);
              const p2 = CANDIDATE_MAP.get(p.receiverId);
              const isActive = idx === activeFeedIndex;
              return (
                <button
                  key={p.id || idx}
                  onClick={() => {
                    setShowSecretStrategy(false);
                    onSelectFeed && onSelectFeed(idx);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-400 text-black font-black shadow-md shadow-emerald-500/40'
                      : 'bg-emerald-950/80 text-emerald-300 hover:bg-emerald-900 border border-emerald-800/80'
                  }`}
                  title={`CAM ${idx + 1}: ${p1?.name.split(' ')[0]} with ${p2?.name.split(' ')[0]}`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>CAM {idx + 1}: {p1?.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-3">
          <span className="text-emerald-200 font-bold tracking-widest bg-black/60 px-2 py-0.5 rounded border border-emerald-800">
            {timecode}
          </span>
          <span className="px-2.5 py-0.5 rounded-md bg-emerald-900/80 text-emerald-200 font-bold border border-emerald-600/80 text-xs">
            {displayedPact.location}
          </span>
        </div>
      </div>

      {/* Security Classification Watermark Banner */}
      <div className="flex items-center justify-between px-5 py-2 bg-amber-500/15 border-b border-amber-500/30 text-xs font-mono font-black tracking-widest text-amber-300 uppercase z-20">
        <div className="flex items-center gap-2">
          <FileWarning className="w-4 h-4 text-amber-400" />
          Leaked Confidential Feed &bull; Round {round} Secret Backroom Maneuvers
        </div>
        <div className="text-xs text-emerald-300 font-bold">
          Feed {activeFeedIndex + 1} of {totalFeeds}
        </div>
      </div>

      {/* Main CCTV Feed Body */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 gap-5 z-10">
        {/* Conspirators Faceoff Layout */}
        <div className="flex items-center justify-around w-full max-w-2xl">
          {/* Proposer / Conspirator 1 */}
          {proposer && (
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="relative">
                <CandidateAvatar
                  candidate={proposer}
                  size="xl"
                  isSpeaking={true}
                  showBadge={false}
                />
                <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase bg-emerald-950 text-emerald-300 border border-emerald-500 shadow-md">
                  PROPOSER
                </span>
              </div>
              <div className="mt-2">
                <span className="text-base sm:text-lg font-display font-black text-white block">
                  {proposer.name}
                </span>
                <span className="text-xs font-mono text-emerald-300/90 block mt-0.5">
                  {proposer.titleRole}
                </span>
              </div>
            </div>
          )}

          {/* Wiretap / Deal Type Center Badge */}
          <div className="flex flex-col items-center justify-center gap-2 px-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-950/90 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.4)] animate-pulse">
              {displayedPact.actionType === 'bribe' ? (
                <Coins className="w-7 h-7 text-amber-400" />
              ) : displayedPact.actionType === 'offer' ? (
                <Handshake className="w-7 h-7 text-cyan-400" />
              ) : (
                <Eye className="w-7 h-7 text-emerald-400" />
              )}
            </div>
            <span className="text-[10px] font-mono font-black uppercase tracking-widest bg-emerald-950 text-emerald-300 px-2.5 py-0.5 rounded-md border border-emerald-700 shadow-xs">
              {displayedPact.actionType === 'bribe' ? '$30 BRIBE' : displayedPact.actionType === 'offer' ? 'VOTE OFFER' : 'SOLO PLOT'}
            </span>
          </div>

          {/* Receiver / Conspirator 2 */}
          {receiver && (
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="relative">
                <CandidateAvatar
                  candidate={receiver}
                  size="xl"
                  showBadge={false}
                />
                <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase bg-cyan-950 text-cyan-300 border border-cyan-500 shadow-md">
                  RECEIVER
                </span>
              </div>
              <div className="mt-2">
                <span className="text-base sm:text-lg font-display font-black text-white block">
                  {receiver.name}
                </span>
                <span className="text-xs font-mono text-cyan-300/90 block mt-0.5">
                  {receiver.titleRole}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Leaked Transcript Terminal Box */}
        <div className="w-full max-w-2xl relative rounded-3xl bg-black/90 border-2 border-emerald-500/60 p-5 md:p-7 shadow-2xl shadow-emerald-950/90 text-left">
          {/* Audio Intercept & Financial Status Bar */}
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4 pb-3 border-b border-emerald-800/80">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-emerald-300">
              <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>AUDIO INTERCEPT (CAM #{activeFeedIndex + 1}):</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* $30 Bribe & Escrow Status Pill */}
              {displayedPact.actionType === 'bribe' && (
                <span className={`flex items-center gap-1.5 text-xs font-mono font-black uppercase px-3 py-0.5 rounded-full shadow-md border ${
                  displayedPact.receiverDecision === 'accept'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-400 shadow-emerald-950/60'
                    : displayedPact.receiverDecision === 'accept_and_betray'
                    ? 'bg-purple-950 text-amber-300 border-purple-500 shadow-purple-950/60'
                    : 'bg-red-950 text-red-300 border-red-500 shadow-red-950/60'
                }`}>
                  <span className="text-amber-400 font-extrabold">$30 Bribe</span>
                  {displayedPact.receiverDecision === 'accept' && '• $15 Paid ($15 Escrow)'}
                  {displayedPact.receiverDecision === 'accept_and_betray' && '• $15 Pocketed (Betrayal Intent)'}
                  {displayedPact.receiverDecision === 'decline' && '• Declined'}
                </span>
              )}

              {/* Vote Offer Status Pill */}
              {displayedPact.actionType === 'offer' && (
                <span className={`flex items-center gap-1.5 text-xs font-mono font-black uppercase px-3 py-0.5 rounded-full shadow-md border ${
                  displayedPact.bribeAccepted
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-400 shadow-cyan-950/60'
                    : 'bg-red-950 text-red-300 border-red-500'
                }`}>
                  <span className="text-cyan-400 font-extrabold">Offer: ${displayedPact.bribeAmount}</span>
                  {displayedPact.bribeAccepted ? `• $${displayedPact.upfrontPaid} Paid ($${displayedPact.escrowPending} Escrow)` : '• Declined'}
                </span>
              )}

              {!isLoading && onPlaySpeechAudio && (
                <button
                  type="button"
                  onClick={() => onPlaySpeechAudio(displayedPact.whisperText, proposer?.voice?.voiceId, proposer?.id)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-mono font-bold shadow-md transition active:scale-95 cursor-pointer"
                  title="Replay candidate's secret whisper audio"
                >
                  <Volume2 className={`w-3.5 h-3.5 text-emerald-400 ${isSpeakingAudio ? 'animate-pulse' : ''}`} />
                  <span>{isSpeakingAudio ? 'Whispering...' : 'Replay Audio'}</span>
                </button>
              )}

              {/* Targeted Rival Marker */}
              {target && (
                <span className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase px-3 py-0.5 rounded-full bg-red-950 text-red-200 border border-red-500 shadow-sm">
                  <Crosshair className="w-3.5 h-3.5 text-red-400" /> Target: {target.name}
                </span>
              )}
            </div>
          </div>

          {/* Speech / Whisper Content */}
          <p className="text-lg sm:text-xl md:text-2xl font-mono font-medium text-emerald-100 leading-relaxed italic">
            &ldquo;{displayedPact.whisperText}&rdquo;
          </p>

          {/* Secret Strategy Memo Dropdown / Vault */}
          {displayedPact.privateStrategy && (
            <div className="mt-4 pt-3 border-t border-emerald-900/60">
              <button
                type="button"
                onClick={() => setShowSecretStrategy(!showSecretStrategy)}
                className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-amber-300 hover:text-amber-200 transition cursor-pointer"
              >
                {showSecretStrategy ? <Unlock className="w-3.5 h-3.5 text-amber-400" /> : <Lock className="w-3.5 h-3.5 text-amber-400" />}
                <span>{showSecretStrategy ? 'Hide Secret Strategy Memo' : '🔒 Reveal Classified Strategy Memo'}</span>
              </button>

              {showSecretStrategy && (
                <div className="mt-2.5 p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs font-mono text-amber-200 leading-relaxed animate-fade-in">
                  <span className="font-bold text-amber-400 uppercase block mb-1">
                    TOP SECRET TACTICAL MEMO (CONFIDENTIAL):
                  </span>
                  &ldquo;{displayedPact.privateStrategy}&rdquo;
                </div>
              )}
            </div>
          )}

          {/* Subtext Escrow Explanation */}
          <div className="mt-4 pt-3 border-t border-emerald-900/80 flex items-center justify-between text-[11px] font-mono text-slate-300">
            <span className="text-emerald-400">
              {displayedPact.actionType === 'bribe'
                ? `• $15 paid upfront. Final $15 escrow released only if ${receiver?.name.split(' ')[0]} votes for ${target?.name.split(' ')[0]} (forfeited on betrayal).`
                : displayedPact.actionType === 'offer'
                ? `• $${displayedPact.upfrontPaid} upfront paid. Final $${displayedPact.escrowPending} escrow released upon verified vote.`
                : `• ${proposer?.name.split(' ')[0]} is holding their campaign treasury for $40 bailout vote buyouts.`}
            </span>
            <span className="text-amber-300 font-bold uppercase shrink-0 ml-2">
              CONFIDENTIAL
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

