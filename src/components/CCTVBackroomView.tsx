'use client';

import React, { useState, useEffect } from 'react';
import { BackroomPact } from '@/types/game';
import { CandidateAvatar } from './CandidateAvatar';
import { CANDIDATE_MAP } from '@/data/candidates';
import { 
  Eye, 
  ShieldAlert, 
  Radio, 
  Lock, 
  AlertTriangle, 
  Sparkles, 
  Swords, 
  Crosshair,
  Volume2,
  FileWarning
} from 'lucide-react';

interface CCTVBackroomViewProps {
  pact: BackroomPact | null;
  allPactsThisRound?: BackroomPact[];
  round: number;
  isLoading?: boolean;
}

export const CCTVBackroomView: React.FC<CCTVBackroomViewProps> = ({
  pact,
  allPactsThisRound = [],
  round,
  isLoading = false,
}) => {
  const [timecode, setTimecode] = useState('00:00:00.00');

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

  if (!pact) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-black/90 rounded-2xl border border-emerald-900/50">
        <Radio className="w-12 h-12 text-emerald-500 animate-pulse mb-3" />
        <h3 className="text-lg font-mono font-bold text-emerald-400 uppercase tracking-wider">
          Intercepting Capitol Surveillance Feeds...
        </h3>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Scanning unmonitored hallways and private cloakrooms for backroom conspiracies...
        </p>
      </div>
    );
  }

  const proposer = CANDIDATE_MAP.get(pact.proposerId);
  const receiver = CANDIDATE_MAP.get(pact.receiverId);
  const target = CANDIDATE_MAP.get(pact.agreedTargetId);

  return (
    <div className="w-full flex-1 flex flex-col rounded-3xl bg-[#050b07] border-2 border-emerald-500/60 shadow-[0_0_40px_rgba(16,185,129,0.2)] overflow-hidden relative backdrop-blur-2xl animate-fade-in">
      {/* CCTV Scanlines & CRT Distortion Filter Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none z-20 opacity-60" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.08),transparent_80%)] pointer-events-none -z-10" />

      {/* Top CCTV Camera OSD (On-Screen Display) */}
      <div className="flex items-center justify-between px-4 md:px-6 py-2.5 bg-emerald-950/70 border-b border-emerald-800/80 text-emerald-400 font-mono text-[11px] z-30">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-950/80 text-red-400 font-bold border border-red-800 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-500" /> REC &bull; LIVE
          </span>
          <span className="font-bold tracking-wider hidden sm:inline">
            CAPITOL_SURVEILLANCE_GRID // CAM-0{round}B
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-emerald-300 font-bold tracking-widest">
            {timecode}
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 font-semibold border border-emerald-700/60 text-[10px]">
            {pact.location}
          </span>
        </div>
      </div>

      {/* Security Classification Watermark Banner */}
      <div className="flex items-center justify-center gap-2 py-1 bg-amber-500/10 border-b border-amber-500/20 text-[10px] font-mono font-black tracking-widest text-amber-400 uppercase z-20">
        <FileWarning className="w-3.5 h-3.5" />
        Leaked Classified Feed &bull; Secret Alliance Negotiations &bull; Round {round}
      </div>

      {/* Main CCTV Feed Body */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 gap-6 z-10">
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
                <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-mono font-black uppercase bg-emerald-950 text-emerald-400 border border-emerald-600 shadow-md">
                  PROPOSER
                </span>
              </div>
              <div className="mt-2">
                <span className="text-sm md:text-base font-black text-white block">
                  {proposer.name}
                </span>
                <span className="text-[10px] font-mono text-emerald-400/90 block">
                  {proposer.titleRole}
                </span>
              </div>
            </div>
          )}

          {/* Wiretap / Secret Pact Icon Center */}
          <div className="flex flex-col items-center justify-center gap-2 px-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border-2 border-emerald-500/80 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse">
              <Eye className="w-6 h-6" />
            </div>
            <span className="text-[9px] font-mono font-black uppercase tracking-widest bg-emerald-950/90 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800">
              SECRET PACT
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
                <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-mono font-black uppercase bg-cyan-950 text-cyan-400 border border-cyan-600 shadow-md">
                  RECEIVER
                </span>
              </div>
              <div className="mt-2">
                <span className="text-sm md:text-base font-black text-white block">
                  {receiver.name}
                </span>
                <span className="text-[10px] font-mono text-cyan-400/90 block">
                  {receiver.titleRole}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Leaked Transcript Terminal Box */}
        <div className="w-full max-w-2xl relative rounded-2xl bg-black/80 border-2 border-emerald-500/50 p-6 md:p-7 shadow-2xl shadow-emerald-950/80 text-left">
          {/* Audio Intercept Tag */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-emerald-900/60">
            <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase text-emerald-400">
              <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              AUDIO INTERCEPT TRANSCRIPT:
            </span>

            {/* Targeted Rival Marker */}
            {target && (
              <span className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-red-950/90 text-red-300 border border-red-700/80">
                <Crosshair className="w-3 h-3 text-red-400" /> Target: {target.name}
              </span>
            )}
          </div>

          {/* Speech / Whisper Content */}
          <p className="text-base md:text-lg font-mono font-medium text-emerald-200 leading-relaxed italic">
            "{pact.whisperText}"
          </p>

          {/* Subtext warning */}
          <div className="mt-4 pt-2.5 border-t border-emerald-950 flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="text-emerald-500/80">
              &bull; Will {proposer?.name.split(' ')[0]} and {receiver?.name.split(' ')[0]} keep this deal, or will someone stab their partner in the back during secret voting?
            </span>
            <span className="text-amber-400 font-bold uppercase">
              CONFIDENTIAL
            </span>
          </div>
        </div>

        {/* Bottom Pacts Carousel / List in This Round */}
        {allPactsThisRound.length > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl w-full">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
              Round {round} Leaks:
            </span>
            {allPactsThisRound.map((p, idx) => {
              const p1 = CANDIDATE_MAP.get(p.proposerId);
              const p2 = CANDIDATE_MAP.get(p.receiverId);
              const t = CANDIDATE_MAP.get(p.agreedTargetId);
              return (
                <div
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-emerald-950/50 border border-emerald-800 text-[10px] font-mono text-slate-300 flex items-center gap-1.5"
                >
                  <span className="text-emerald-400 font-bold">{p1?.name.split(' ')[0]}</span>
                  <span className="text-slate-500">&rarr;</span>
                  <span className="text-cyan-400 font-bold">{p2?.name.split(' ')[0]}</span>
                  <span className="text-red-400 font-bold">(Target: {t?.name.split(' ')[0]})</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
