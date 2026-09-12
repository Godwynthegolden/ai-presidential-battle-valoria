'use client';

import React from 'react';
import { Candidate } from '@/types/candidate';
import { CandidateAvatar } from './CandidateAvatar';
import { KineticDialogueBox } from './KineticDialogueBox';
import { 
  Lock, 
  Target, 
  Shield, 
  Flame, 
  Crosshair, 
  DollarSign, 
  Skull, 
  Sparkles,
  Eye,
  Radio,
  Swords,
  Crown
} from 'lucide-react';

interface StrategicConfessionalModalProps {
  voter: Candidate;
  target?: Candidate | null;
  strategyMonologue: string;
  privateReason?: string;
  voterIndex: number;
  totalVoters: number;
  round: number;
  isSpeakingAudio?: boolean;
  voterBudget?: number;
  targetBudget?: number;
  isBetrayal?: boolean;
  isHonoredPact?: boolean;
  pactAllyName?: string;
  isFinalVote?: boolean;
  kineticSubtitlesEnabled?: boolean;
  kineticSubtitleStyle?: 'mrbeast' | 'cinematic' | 'neon';
  kineticHighlightCriticalWords?: boolean;
  kineticDynamicBoxResize?: boolean;
  kineticFontSize?: 'standard' | 'large' | 'cinematic';
  lineupCandidateIds?: string[];
}

export const StrategicConfessionalModal: React.FC<StrategicConfessionalModalProps> = ({
  voter,
  target,
  strategyMonologue,
  privateReason,
  voterIndex,
  totalVoters,
  round,
  isSpeakingAudio = false,
  voterBudget = 100,
  targetBudget = 100,
  isBetrayal = false,
  isHonoredPact = false,
  pactAllyName,
  isFinalVote = false,
  kineticSubtitlesEnabled = true,
  kineticSubtitleStyle = 'mrbeast',
  kineticHighlightCriticalWords = true,
  kineticDynamicBoxResize = true,
  kineticFontSize = 'large',
  lineupCandidateIds,
}) => {
  const voterBailouts = Math.floor(voterBudget / 40);
  const targetBailouts = Math.floor(targetBudget / 40);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-slate-950/95 backdrop-blur-3xl select-none overflow-hidden animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      {/* 1. Dynamic Ambient Aura Backdrop */}
      <div 
        className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full blur-[140px] opacity-25 pointer-events-none transition-all duration-700"
        style={{ backgroundColor: voter.color.primary || '#06b6d4' }}
      />
      <div 
        className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full blur-[140px] opacity-20 pointer-events-none transition-all duration-700"
        style={{ backgroundColor: target?.color.primary || '#ef4444' }}
      />

      {/* Cyber Grid & Surveillance Scanline Texture */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-40" />

      {/* Main Modal Shell (Full-Screen Staged Container, No Buttons) */}
      <div className="relative w-full max-w-4xl flex flex-col items-center gap-5 my-auto z-10">
        
        {/* Top Classified Header Bar */}
        <div className="w-full flex items-center justify-between px-2 sm:px-4 py-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <div className="flex items-center gap-1.5 text-xs font-mono font-black uppercase tracking-widest text-red-400">
              <Lock className="w-3.5 h-3.5 text-red-400" />
              <span>{isFinalVote ? 'GRAND JURY PRESIDENTIAL CONFESSIONAL' : 'CLASSIFIED STRATEGIC CONFESSIONAL'}</span>
            </div>
            <span className="hidden sm:inline text-xs font-mono text-slate-600">•</span>
            <span className="hidden sm:inline text-xs font-mono text-slate-400 uppercase">
              {isFinalVote ? 'Presidential Mandate Endorsement' : `Round ${round} Elimination`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-400 tracking-wider uppercase">
              Voter {voterIndex + 1} / {totalVoters}
            </span>
            <div className="w-24 h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500"
                style={{ width: `${Math.round(((voterIndex + 1) / totalVoters) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Hero Voter Podium (Centered & Dominant) */}
        <div className="flex flex-col items-center text-center gap-2 pt-1">
          <div className="relative flex items-center justify-center">
            {/* Glowing Signature Aura */}
            <div 
              className="absolute -inset-4 rounded-full blur-2xl opacity-40 animate-pulse pointer-events-none"
              style={{ backgroundColor: voter.color.primary || '#06b6d4' }}
            />
            <CandidateAvatar
              candidate={voter}
              size="xl"
              isSpeaking={isSpeakingAudio}
              showBadge={true}
            />
          </div>

          <div className="flex flex-col items-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-white tracking-tight">
              {voter.name}
            </h2>
            
            <div className="flex items-center justify-center flex-wrap gap-2 mt-1.5">
              <span 
                className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-sm"
                style={{ 
                  backgroundColor: `${voter.color.primary}18`, 
                  color: voter.color.primary,
                  borderColor: `${voter.color.primary}44` 
                }}
              >
                {isFinalVote ? `🏛️ Grand Juror • ${voter.archetypeTitle}` : voter.archetypeTitle}
              </span>
              <span className="text-xs font-mono text-slate-400 bg-slate-900/80 px-2.5 py-0.5 rounded-full border border-slate-800">
                💰 War Chest: <strong className="text-emerald-400">${voterBudget}M</strong> {isFinalVote ? '(Preserved)' : `(${voterBailouts} Bailouts)`}
              </span>
            </div>
          </div>
        </div>

        {/* Strategic Monologue Teleprompter Box */}
        <div 
          className="w-full relative rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl backdrop-blur-2xl transition-all duration-300 border-2 bg-[#0a0f1d]/95"
          style={{
            borderColor: voter.color.primary || '#06b6d4',
            boxShadow: `0 0 35px ${voter.color.primary}22`
          }}
        >
          {/* Card Header with Audio Waveform */}
          <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-800/80 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span 
                className="w-2.5 h-2.5 rounded-full animate-pulse"
                style={{ backgroundColor: voter.color.primary }}
              />
              <span className="text-xs font-display font-black uppercase tracking-wider text-slate-200">
                INTERNAL STRATEGIC MONOLOGUE
              </span>
            </div>

            {/* Equalizer Audio Indicator */}
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-mono text-slate-400">
                {isSpeakingAudio ? 'Inner Voice Speaking...' : 'Voice Synthesized'}
              </span>
              <div className="flex items-end gap-1 h-4">
                <span className={`w-1 rounded-full ${isSpeakingAudio ? 'bg-purple-400 animate-equalizer eq-bar-1' : 'bg-slate-600 h-1'}`} />
                <span className={`w-1 rounded-full ${isSpeakingAudio ? 'bg-purple-400 animate-equalizer eq-bar-2' : 'bg-slate-600 h-2'}`} />
                <span className={`w-1 rounded-full ${isSpeakingAudio ? 'bg-purple-400 animate-equalizer eq-bar-3' : 'bg-slate-600 h-1.5'}`} />
                <span className={`w-1 rounded-full ${isSpeakingAudio ? 'bg-purple-400 animate-equalizer eq-bar-4' : 'bg-slate-600 h-2.5'}`} />
              </div>
            </div>
          </div>

          {/* Strategic Monologue Quote Content */}
          <div className="relative">
            <KineticDialogueBox
              key={`confessional-sub-${voter.id}-${round}-${voterIndex}`}
              text={strategyMonologue}
              isSpeaking={isSpeakingAudio}
              speakerColor={voter.color.primary}
              enabled={kineticSubtitlesEnabled}
              style={kineticSubtitleStyle}
              highlightCritical={kineticHighlightCriticalWords}
              dynamicResize={kineticDynamicBoxResize}
              fontSize={kineticFontSize}
              showQuotes={true}
              lineupCandidateIds={lineupCandidateIds}
            />
          </div>
        </div>

        {/* Subordinate Secret Ballot Target HUD */}
        {target && (
          <div className={`w-full max-w-2xl flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border shadow-xl backdrop-blur-md ${
            isFinalVote
              ? 'bg-gradient-to-r from-amber-950/60 via-[#0d0f18]/90 to-amber-950/60 border-amber-500/50 shadow-amber-950/40'
              : 'bg-gradient-to-r from-red-950/50 via-[#0a0d18]/90 to-red-950/50 border-red-500/40 shadow-red-950/40'
          }`}>
            {/* Left: Target Avatar & Label */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <CandidateAvatar
                  candidate={target}
                  size="md"
                  isTarget={!isFinalVote}
                  showBadge={false}
                />
                <div className={`absolute -bottom-1 -right-1 p-0.5 rounded-full border border-black shadow-xs ${
                  isFinalVote ? 'bg-amber-500 text-black' : 'bg-red-600 text-white'
                }`}>
                  {isFinalVote ? <Crown className="w-2.5 h-2.5" /> : <Crosshair className="w-2.5 h-2.5" />}
                </div>
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-mono font-black uppercase tracking-widest flex items-center gap-1 ${
                    isFinalVote ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {isFinalVote ? (
                      <>
                        <Crown className="w-3 h-3 text-amber-400" /> PRESIDENTIAL ENDORSEMENT
                      </>
                    ) : (
                      <>
                        <Target className="w-3 h-3 text-red-400" /> SECRET BALLOT TARGET
                      </>
                    )}
                  </span>
                  <span className="text-[10px] font-mono text-slate-600">•</span>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase truncate">
                    {target.archetypeTitle}
                  </span>
                </div>
                <span className="text-sm sm:text-base font-display font-black text-white tracking-wide truncate">
                  {target.name}
                </span>
              </div>
            </div>

            {/* Right: Tactical Motive Badge */}
            <div className="flex flex-col items-end shrink-0 gap-0.5">
              {isBetrayal ? (
                <span className="text-[10px] font-mono font-black text-red-300 uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-950 border border-red-500 animate-pulse flex items-center gap-1 shadow-sm">
                  <Swords className="w-2.5 h-2.5 text-red-400" /> Pact Betrayal Strike
                </span>
              ) : isHonoredPact ? (
                <span className="text-[10px] font-mono font-black text-emerald-300 uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-950 border border-emerald-500 flex items-center gap-1 shadow-sm">
                  <Shield className="w-2.5 h-2.5 text-emerald-400" /> Pact Contract Fulfilled
                </span>
              ) : isFinalVote ? (
                <span className="text-[10px] font-mono font-black text-amber-300 uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-950/90 border border-amber-500/70 shadow-sm flex items-center gap-1">
                  <Crown className="w-2.5 h-2.5 text-amber-400" /> Presidential Mandate Vote
                </span>
              ) : (
                <span className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-700/60">
                  Strategic Elimination
                </span>
              )}
              <span className="text-[10px] font-mono text-slate-400">
                {isFinalVote ? (
                  <>Finalist Treasury: <strong className="text-emerald-400">${targetBudget}M</strong></>
                ) : (
                  <>Target Treasury: <strong className="text-emerald-400">${targetBudget}M</strong> {targetBailouts > 0 ? `(${targetBailouts} Bailouts)` : <span className="text-red-400 font-bold">(Vulnerable)</span>}</>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Zero-Button Keyboard Hint Footer */}
        <div className="flex items-center justify-center gap-4 text-xs font-mono text-slate-500 pt-1">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-400 font-bold text-[10px]">Space</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-400 font-bold text-[10px]">Enter</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-400 font-bold text-[10px]">→</kbd>
            <span className="ml-1">Next Confessional</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-purple-400 font-bold text-[10px]">R</kbd>
            <span className="ml-1">Replay Voice</span>
          </span>
        </div>

      </div>
    </div>
  );
};
