'use client';

import React, { useState, useEffect } from 'react';
import { BackroomPact } from '@/types/game';
import { CandidateAvatar } from './CandidateAvatar';
import { CANDIDATE_MAP } from '@/data/candidates';
import { KineticDialogueBox } from './KineticDialogueBox';
import { audioSync, AudioSyncState } from '@/utils/audioSync';
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
  onPlayCCTVPactAudio?: (pact: BackroomPact) => void;
  isSpeakingAudio?: boolean;
  round: number;
  isLoading?: boolean;
  kineticSubtitlesEnabled?: boolean;
  kineticSubtitleStyle?: 'mrbeast' | 'cinematic' | 'neon';
  kineticHighlightCriticalWords?: boolean;
  kineticDynamicBoxResize?: boolean;
  kineticFontSize?: 'standard' | 'large' | 'cinematic';
  forcedRevealedCount?: number;
  forcedActiveIndex?: number;
  lineupCandidateIds?: string[];
}

export const CCTVBackroomView: React.FC<CCTVBackroomViewProps> = ({
  pact,
  allPactsThisRound = [],
  activeFeedIndex = 0,
  onSelectFeed,
  onPlaySpeechAudio,
  onPlayCCTVPactAudio,
  isSpeakingAudio = false,
  round,
  isLoading = false,
  kineticSubtitlesEnabled = true,
  kineticSubtitleStyle = 'mrbeast',
  kineticHighlightCriticalWords = true,
  kineticDynamicBoxResize = true,
  kineticFontSize = 'large',
  forcedRevealedCount,
  forcedActiveIndex,
  lineupCandidateIds,
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

  const [activeSpeaker, setActiveSpeaker] = useState<'proposer' | 'receiver' | null>(null);
  const [proposerCompleted, setProposerCompleted] = useState<boolean>(false);
  const [receiverCompleted, setReceiverCompleted] = useState<boolean>(false);
  const [receiverProgress, setReceiverProgress] = useState<number>(0);
  const [isReceiverMidway, setIsReceiverMidway] = useState<boolean>(false);
  const [replayCount, setReplayCount] = useState<number>(0);

  // When active feed or pact changes, reset sequencing state
  useEffect(() => {
    setActiveSpeaker(null);
    setProposerCompleted(false);
    setReceiverCompleted(false);
    setReceiverProgress(0);
    setIsReceiverMidway(false);
  }, [displayedPact?.id, activeFeedIndex]);

  // Track active speaker in the CCTV dialogue sequence via audioSync
  useEffect(() => {
    if (!displayedPact) return;

    const unsubscribe = audioSync.subscribe((syncState: AudioSyncState) => {
      const isProposerAudio = syncState.speakerId === displayedPact.proposerId ||
        (syncState.text && displayedPact.whisperText && (
          syncState.text.includes(displayedPact.whisperText.slice(0, 25)) ||
          displayedPact.whisperText.includes(syncState.text.slice(0, 25))
        ));

      const isReceiverAudio = syncState.speakerId === displayedPact.receiverId ||
        (syncState.text && displayedPact.receiverResponse && (
          syncState.text.includes(displayedPact.receiverResponse.slice(0, 25)) ||
          displayedPact.receiverResponse.includes(syncState.text.slice(0, 25))
        ));

      if (syncState.isPlaying) {
        if (isProposerAudio) {
          setActiveSpeaker('proposer');
        } else if (isReceiverAudio) {
          setActiveSpeaker('receiver');
          setProposerCompleted(true);
          const progress = syncState.progress || 0;
          setReceiverProgress(progress);
          if (progress >= 0.45) {
            setIsReceiverMidway(true);
          }
        }
      } else if (!syncState.isPlaying && syncState.progress >= 0.999) {
        if (isProposerAudio || syncState.speakerId === displayedPact.proposerId) {
          setProposerCompleted(true);
        } else if (isReceiverAudio || syncState.speakerId === displayedPact.receiverId) {
          setReceiverCompleted(true);
          setIsReceiverMidway(true);
          setActiveSpeaker(null);
        }
      }
    });

    return () => unsubscribe();
  }, [displayedPact]);

  // Fallback progression for silent/muted environments (or if TTS audio fails)
  useEffect(() => {
    if (!displayedPact) return;
    if (isSpeakingAudio || (proposerCompleted && receiverCompleted)) return;

    if (!proposerCompleted) {
      const timer = setTimeout(() => {
        setProposerCompleted(true);
        setActiveSpeaker('receiver');
      }, 2800);
      return () => clearTimeout(timer);
    } else if (displayedPact.receiverResponse && !receiverCompleted) {
      const timerMid = setTimeout(() => {
        setIsReceiverMidway(true);
      }, 1400);
      const timerDone = setTimeout(() => {
        setReceiverCompleted(true);
        setActiveSpeaker(null);
      }, 3000);
      return () => {
        clearTimeout(timerMid);
        clearTimeout(timerDone);
      };
    }
  }, [displayedPact, isSpeakingAudio, proposerCompleted, receiverCompleted]);

  // Notify audioSync when the entire CCTV pact conversation (proposer + receiver) has 100% finished
  useEffect(() => {
    if (!displayedPact) return;
    const hasReceiver = Boolean(displayedPact.receiverResponse);
    const isFinished = hasReceiver
      ? (proposerCompleted && receiverCompleted && !isSpeakingAudio)
      : (proposerCompleted && !isSpeakingAudio);

    if (isFinished) {
      audioSync.notifyCctvComplete(displayedPact.id);
    }
  }, [displayedPact, proposerCompleted, receiverCompleted, isSpeakingAudio]);

  // Derived speaker states for dialogue boxes
  const isProposerSpeaking = !proposerCompleted && (
    activeSpeaker === 'proposer' || 
    (isSpeakingAudio && activeSpeaker !== 'receiver')
  );
  const isProposerCompleted = proposerCompleted || activeSpeaker === 'receiver';

  const isReceiverSpeaking = !receiverCompleted && activeSpeaker === 'receiver';
  const isReceiverWaiting = !receiverCompleted && activeSpeaker !== 'receiver';
  const isReceiverCompleted = receiverCompleted;
  const showDecisionBadge = isReceiverMidway || receiverProgress >= 0.45 || receiverCompleted;

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

        <div className="flex items-center gap-2.5">
          <span className="text-emerald-200 font-bold tracking-widest bg-black/60 px-2.5 py-1 rounded border border-emerald-800">
            {timecode}
          </span>
        </div>
      </div>

      {/* Security Classification Watermark Banner */}
      <div className="flex items-center justify-between px-5 py-2 bg-amber-500/15 border-b border-amber-500/30 text-xs font-mono font-black tracking-widest text-amber-300 uppercase z-20">
        <div className="flex items-center gap-2">
          <FileWarning className="w-4 h-4 text-amber-400" />
          <span>Leaked Confidential Feed &bull; Round {round} Secret Backroom Maneuvers</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-300 font-bold">
          {totalFeeds > 1 && onSelectFeed && (
            <button
              type="button"
              onClick={() => {
                setShowSecretStrategy(false);
                onSelectFeed((activeFeedIndex - 1 + totalFeeds) % totalFeeds);
              }}
              disabled={activeFeedIndex === 0}
              className="p-1 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              title="Previous Feed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
          <span>Feed {activeFeedIndex + 1} of {totalFeeds}</span>
          {totalFeeds > 1 && onSelectFeed && (
            <button
              type="button"
              onClick={() => {
                setShowSecretStrategy(false);
                onSelectFeed((activeFeedIndex + 1) % totalFeeds);
              }}
              disabled={activeFeedIndex === totalFeeds - 1}
              className="p-1 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              title="Next Feed"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main CCTV Feed Body */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 lg:p-10 gap-6 sm:gap-8 z-10 w-full">
        {/* Conspirators Faceoff Layout - 100% Mathematically Symmetrical 3-Column Grid */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center w-full max-w-4xl xl:max-w-5xl 2xl:max-w-6xl mx-auto px-2">
          {/* Proposer / Conspirator 1 */}
          <div className="flex flex-col items-center justify-center text-center w-full min-w-0 px-2 sm:px-4">
            {proposer ? (
              <>
                <div className="relative">
                  <CandidateAvatar
                    candidate={proposer}
                    size="xl"
                    isSpeaking={isProposerSpeaking}
                    showBadge={false}
                  />
                  <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase bg-emerald-950 text-emerald-300 border border-emerald-500 shadow-md whitespace-nowrap">
                    PROPOSER
                  </span>
                </div>
                <div className="mt-2 w-full max-w-[200px] sm:max-w-[260px] md:max-w-[300px] mx-auto">
                  <span className="text-base sm:text-lg font-display font-black text-white block truncate">
                    {proposer.name}
                  </span>
                  <span className="text-xs font-mono text-emerald-300/90 block mt-0.5 line-clamp-2 leading-tight" title={proposer.titleRole}>
                    {proposer.titleRole}
                  </span>
                </div>
              </>
            ) : (
              <div className="h-24" />
            )}
          </div>

          {/* Wiretap / Deal Type Center Badge (Anchor Centered) */}
          <div className="flex flex-col items-center justify-center shrink-0 gap-2 px-3 sm:px-6">
            <div className="w-14 h-14 rounded-2xl bg-emerald-950/90 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.4)] animate-pulse">
              {displayedPact.actionType === 'bribe' ? (
                <Coins className="w-7 h-7 text-amber-400" />
              ) : displayedPact.actionType === 'offer' ? (
                <Handshake className="w-7 h-7 text-cyan-400" />
              ) : (
                <Eye className="w-7 h-7 text-emerald-400" />
              )}
            </div>
            <span className="text-[10px] font-mono font-black uppercase tracking-widest bg-emerald-950 text-emerald-300 px-2.5 py-0.5 rounded-md border border-emerald-700 shadow-xs whitespace-nowrap">
              {displayedPact.actionType === 'bribe' ? '$30M BRIBE' : displayedPact.actionType === 'offer' ? 'VOTE OFFER' : 'SOLO PLOT'}
            </span>
          </div>

          {/* Receiver / Conspirator 2 */}
          <div className="flex flex-col items-center justify-center text-center w-full min-w-0 px-2 sm:px-4">
            {receiver ? (
              <>
                <div className="relative">
                  <CandidateAvatar
                    candidate={receiver}
                    size="xl"
                    isSpeaking={isReceiverSpeaking}
                    showBadge={false}
                  />
                  <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase bg-cyan-950 text-cyan-300 border border-cyan-500 shadow-md whitespace-nowrap">
                    RECEIVER
                  </span>
                </div>
                <div className="mt-2 w-full max-w-[200px] sm:max-w-[260px] md:max-w-[300px] mx-auto">
                  <span className="text-base sm:text-lg font-display font-black text-white block truncate">
                    {receiver.name}
                  </span>
                  <span className="text-xs font-mono text-cyan-300/90 block mt-0.5 line-clamp-2 leading-tight" title={receiver.titleRole}>
                    {receiver.titleRole}
                  </span>
                </div>
              </>
            ) : (
              <div className="h-24" />
            )}
          </div>
        </div>

        {/* Leaked Transcript Terminal Box */}
        <div className="w-full max-w-4xl xl:max-w-5xl 2xl:max-w-6xl relative rounded-3xl bg-black/90 border-2 border-emerald-500/60 p-5 md:p-8 shadow-2xl shadow-emerald-950/90 text-left">
          {/* Audio Intercept & Financial Status Bar */}
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4 pb-3 border-b border-emerald-800/80">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-emerald-300">
              <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>AUDIO INTERCEPT (CAM #{activeFeedIndex + 1}):</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* $30M Bribe & Escrow Status Pill */}
              {displayedPact.actionType === 'bribe' && (
                <span className={`flex items-center gap-1.5 text-xs font-mono font-black uppercase px-3 py-0.5 rounded-full shadow-md border ${
                  (displayedPact.receiverDecision === 'accept' || displayedPact.receiverDecision === 'accept_and_betray')
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-400 shadow-emerald-950/60'
                    : 'bg-red-950 text-red-300 border-red-500 shadow-red-950/60'
                }`}>
                  <span className="text-amber-400 font-extrabold">$30M Bribe</span>
                  {(displayedPact.receiverDecision === 'accept' || displayedPact.receiverDecision === 'accept_and_betray')
                    ? '• Accepted ($15M Escrow)'
                    : '• Refused'}
                </span>
              )}

              {/* Vote Offer Status Pill */}
              {displayedPact.actionType === 'offer' && (
                <span className={`flex items-center gap-1.5 text-xs font-mono font-black uppercase px-3 py-0.5 rounded-full shadow-md border ${
                  displayedPact.bribeAccepted
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-400 shadow-cyan-950/60'
                    : 'bg-red-950 text-red-300 border-red-500'
                }`}>
                  <span className="text-cyan-400 font-extrabold">Offer: ${displayedPact.bribeAmount}M</span>
                  {displayedPact.bribeAccepted
                    ? `• Accepted ($${displayedPact.escrowPending}M Escrow)`
                    : '• Refused'}
                </span>
              )}

              {!isLoading && (onPlayCCTVPactAudio || onPlaySpeechAudio) && (
                <button
                  type="button"
                  onClick={() => {
                    setProposerCompleted(false);
                    setReceiverCompleted(false);
                    setReceiverProgress(0);
                    setIsReceiverMidway(false);
                    setActiveSpeaker('proposer');
                    setReplayCount(c => c + 1);
                    if (onPlayCCTVPactAudio) {
                      onPlayCCTVPactAudio(displayedPact);
                    } else if (onPlaySpeechAudio) {
                      onPlaySpeechAudio(displayedPact.whisperText, proposer?.voice?.voiceId, proposer?.id);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-mono font-bold shadow-md transition active:scale-95 cursor-pointer"
                  title="Replay wiretapped backroom dialogue"
                >
                  <Volume2 className={`w-3.5 h-3.5 text-emerald-400 ${isSpeakingAudio ? 'animate-pulse' : ''}`} />
                  <span>{isSpeakingAudio ? 'Wiretap Audio Active...' : 'Replay Wiretap Audio'}</span>
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

          {/* Speech / Dialogue Content */}
          <div className="space-y-4">
            {/* Proposer Pitch */}
            <div className="space-y-1.5">
              {displayedPact.receiverResponse && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    {proposer?.name || 'Proposer'} (Secret Offer / Whisper):
                  </span>
                </div>
              )}
              <KineticDialogueBox
                key={`cctv-proposer-${displayedPact.id || activeFeedIndex}-${round}-${replayCount}`}
                text={displayedPact.whisperText}
                isSpeaking={isProposerSpeaking}
                hasCompleted={isProposerCompleted}
                speakerId={displayedPact.proposerId}
                speakerColor={proposer?.color.primary || '#10b981'}
                fontFamily="mono"
                fontSize={kineticFontSize}
                enabled={kineticSubtitlesEnabled}
                style={kineticSubtitleStyle}
                highlightCritical={kineticHighlightCriticalWords}
                dynamicResize={kineticDynamicBoxResize}
                showQuotes={true}
                forcedRevealedCount={forcedRevealedCount}
                forcedActiveIndex={forcedActiveIndex}
                lineupCandidateIds={lineupCandidateIds}
              />
            </div>

            {/* Receiver Spoken Answer (<= 10 words) */}
            {displayedPact.receiverResponse && receiver && (
              <div className="pt-3 border-t border-emerald-900/60 space-y-1.5 animate-fade-in">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    {receiver.name} (Spoken Reply):
                  </span>
                  <span className={`text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full border transition-all duration-300 shadow-sm ${
                    (displayedPact.receiverDecision === 'accept' || displayedPact.receiverDecision === 'accept_and_betray' || displayedPact.bribeAccepted)
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                      : 'bg-red-950 text-red-300 border-red-500'
                  }`}>
                    {(displayedPact.receiverDecision === 'accept' || displayedPact.receiverDecision === 'accept_and_betray' || displayedPact.bribeAccepted)
                      ? 'ACCEPTED' 
                      : 'REFUSED'}
                  </span>
                </div>
                <KineticDialogueBox
                  key={`cctv-receiver-${displayedPact.id || activeFeedIndex}-${round}-${replayCount}`}
                  text={displayedPact.receiverResponse}
                  isSpeaking={isReceiverSpeaking}
                  isWaiting={isReceiverWaiting}
                  waitingLabel={
                    displayedPact.actionType === 'bribe'
                      ? 'Weighing backroom bribe in silence...'
                      : displayedPact.actionType === 'offer'
                      ? 'Weighing secret vote pact in silence...'
                      : 'Weighing clandestine proposal in silence...'
                  }
                  hasCompleted={isReceiverCompleted}
                  speakerId={displayedPact.receiverId}
                  speakerColor={receiver?.color.primary || '#06b6d4'}
                  fontFamily="mono"
                  fontSize={kineticFontSize === 'cinematic' ? 'large' : 'standard'}
                  enabled={kineticSubtitlesEnabled}
                  style={kineticSubtitleStyle}
                  highlightCritical={kineticHighlightCriticalWords}
                  dynamicResize={kineticDynamicBoxResize}
                  showQuotes={true}
                  lineupCandidateIds={lineupCandidateIds}
                />
              </div>
            )}
          </div>

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
                ? `• $15M paid upfront. Final $15M escrow released upon verified vote for ${target?.name.split(' ')[0] || 'designated target'}.`
                : displayedPact.actionType === 'offer'
                ? `• $${displayedPact.upfrontPaid}M upfront paid. Final $${displayedPact.escrowPending}M escrow released upon verified vote.`
                : `• ${proposer?.name.split(' ')[0]} is holding their campaign treasury for $40M bailout vote buyouts.`}
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

