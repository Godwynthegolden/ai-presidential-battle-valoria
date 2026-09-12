'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Candidate } from '@/types/candidate';
import { CandidateAvatar } from './CandidateAvatar';
import { KineticDialogueBox } from './KineticDialogueBox';
import { NineRouterConfigState } from './NineRouterSettingsModal';
import { sounds } from '@/utils/audio';
import { audioSync } from '@/utils/audioSync';
import { getDefaultIntroductionDialogue } from '@/data/candidates';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  RotateCcw, 
  X, 
  Volume2, 
  VolumeX, 
  Film, 
  Sparkles, 
  Crown, 
  CheckCircle2, 
  Flame,
  Tv,
  EyeOff,
  Clock,
  Sliders
} from 'lucide-react';

interface IntroductionMotionGraphicModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: Candidate[];
  activeCandidateIds?: string[];
  nineRouterConfig?: NineRouterConfigState;
  onStartElection?: () => void;
}

export const IntroductionMotionGraphicModal: React.FC<IntroductionMotionGraphicModalProps> = ({
  isOpen,
  onClose,
  candidates,
  activeCandidateIds,
  nineRouterConfig,
  onStartElection,
}) => {
  // Ordered list of candidates in the active lineup
  const lineupCandidates = useMemo(() => {
    if (activeCandidateIds && activeCandidateIds.length > 0) {
      return activeCandidateIds
        .map(id => candidates.find(c => c.id === id))
        .filter((c): c is Candidate => Boolean(c));
    }
    return candidates.slice(0, 8);
  }, [candidates, activeCandidateIds]);

  // Current candidate index (-1 = Grand Opening Title Screen, length = Finale Screen)
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [autoAdvance, setAutoAdvance] = useState<boolean>(true);
  const [isCleanView, setIsCleanView] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [stepPacing, setStepPacing] = useState<'cinematic' | 'standard'>('cinematic');

  // Customizable Showcase Delay (Seconds to hold art & credentials before voice/subtitles start)
  const defaultShowcaseDelay = nineRouterConfig?.introShowcaseDelay ?? 3.0;
  const [showcaseDelay, setShowcaseDelay] = useState<number>(defaultShowcaseDelay);
  const [showcaseCountdownSec, setShowcaseCountdownSec] = useState<number>(defaultShowcaseDelay);

  // Sync with nineRouterConfig if changed externally
  useEffect(() => {
    if (typeof nineRouterConfig?.introShowcaseDelay === 'number') {
      setShowcaseDelay(nineRouterConfig.introShowcaseDelay);
    }
  }, [nineRouterConfig?.introShowcaseDelay]);

  // Animation phase for the current candidate:
  // 'entering' -> 'name_revealed' -> 'speaking' -> 'completed'
  const [animStage, setAnimStage] = useState<'entering' | 'name_revealed' | 'speaking' | 'completed'>('entering');
  const [isSpeakingSpeech, setIsSpeakingSpeech] = useState<boolean>(false);
  const [audioWaveProgress, setAudioWaveProgress] = useState<number>(0);
  const [transitionKey, setTransitionKey] = useState<number>(0);

  // Auto-advance live ref to prevent stale closures in async callbacks
  const autoAdvanceRef = useRef<boolean>(autoAdvance);
  useEffect(() => {
    autoAdvanceRef.current = autoAdvance;
    // When autoAdvance is turned OFF, immediately clear any pending post-speech advance timer
    if (!autoAdvance && postSpeechAdvanceTimerRef.current) {
      clearTimeout(postSpeechAdvanceTimerRef.current);
      postSpeechAdvanceTimerRef.current = null;
    }
  }, [autoAdvance]);

  // Audio elements & timers
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeAudioUrlRef = useRef<string | null>(null);
  // Persist raw Blobs in memory so generating fresh Object URLs works on replay and subsequent runs
  const preloadedAudioBlobCacheRef = useRef<Map<string, Blob>>(new Map());
  
  const speechFallbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const postSpeechAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animTimelineTimer1Ref = useRef<NodeJS.Timeout | null>(null);
  const animTimelineTimer2Ref = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const waveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentCandidate = currentIndex >= 0 && currentIndex < lineupCandidates.length 
    ? lineupCandidates[currentIndex] 
    : null;

  // Cleanup all timers and active audio
  const stopCurrentAudioAndTimers = useCallback(() => {
    // Detach from global audio sync
    try {
      audioSync.detach();
    } catch {}

    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.src = '';
      } catch {}
      activeAudioRef.current = null;
    }
    if (activeAudioUrlRef.current) {
      try { URL.revokeObjectURL(activeAudioUrlRef.current); } catch {}
      activeAudioUrlRef.current = null;
    }
    if (speechFallbackTimerRef.current) {
      clearTimeout(speechFallbackTimerRef.current);
      speechFallbackTimerRef.current = null;
    }
    if (postSpeechAdvanceTimerRef.current) {
      clearTimeout(postSpeechAdvanceTimerRef.current);
      postSpeechAdvanceTimerRef.current = null;
    }
    if (animTimelineTimer1Ref.current) {
      clearTimeout(animTimelineTimer1Ref.current);
      animTimelineTimer1Ref.current = null;
    }
    if (animTimelineTimer2Ref.current) {
      clearTimeout(animTimelineTimer2Ref.current);
      animTimelineTimer2Ref.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (waveIntervalRef.current) {
      clearInterval(waveIntervalRef.current);
      waveIntervalRef.current = null;
    }
    setIsSpeakingSpeech(false);
    setAudioWaveProgress(0);
  }, []);

  // Pre-buffer TTS audio for candidate (stores durable Blob in memory)
  const preloadCandidateAudio = useCallback(async (candidate: Candidate) => {
    if (!nineRouterConfig?.fishAudioEnabled || !nineRouterConfig?.fishAudioApiKey) return;
    if (preloadedAudioBlobCacheRef.current.has(candidate.id)) return;

    try {
      const dialogue = candidate.introductionDialogue || getDefaultIntroductionDialogue(candidate);
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: dialogue,
          voiceId: candidate.voice?.voiceId,
          apiKey: nineRouterConfig.fishAudioApiKey,
          model: nineRouterConfig.fishAudioModel || 's2.1-pro-free',
          speed: candidate.voice?.speed || 1.0,
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        preloadedAudioBlobCacheRef.current.set(candidate.id, blob);
      }
    } catch (err) {
      console.warn(`[Failed to preload TTS audio for ${candidate.name}]:`, err);
    }
  }, [nineRouterConfig]);

  // Pre-load audio for the first few candidates when opened
  useEffect(() => {
    if (!isOpen) return;
    const initialCandidates = lineupCandidates.slice(0, 3);
    initialCandidates.forEach(c => preloadCandidateAudio(c));
  }, [isOpen, lineupCandidates, preloadCandidateAudio]);

  // Reset state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(-1); // Start at grand opening title bumper
      setIsPlaying(true);
      setAnimStage('entering');
    } else {
      stopCurrentAudioAndTimers();
    }
  }, [isOpen, stopCurrentAudioAndTimers]);

  // Grand Opening Title Screen auto-advance (2.4 seconds)
  useEffect(() => {
    if (!isOpen || currentIndex !== -1 || !isPlaying) return;

    sounds.playIntroSting();
    const timer = setTimeout(() => {
      setCurrentIndex(0);
    }, 2400);

    return () => clearTimeout(timer);
  }, [isOpen, currentIndex, isPlaying]);

  // Orchestrate candidate introduction timeline with customizable showcase delay
  useEffect(() => {
    if (!isOpen || currentIndex < 0 || currentIndex >= lineupCandidates.length) {
      return;
    }

    const candidate = lineupCandidates[currentIndex];
    stopCurrentAudioAndTimers();
    setTransitionKey(prev => prev + 1);

    // 1. Stage 1: Full-Body PNG enters from right with aerodynamic whoosh
    setAnimStage('entering');
    sounds.playIntroWhoosh();
    setShowcaseCountdownSec(showcaseDelay);

    // Preload next 2 candidates in background
    if (currentIndex + 1 < lineupCandidates.length) {
      preloadCandidateAudio(lineupCandidates[currentIndex + 1]);
    }
    if (currentIndex + 2 < lineupCandidates.length) {
      preloadCandidateAudio(lineupCandidates[currentIndex + 2]);
    }

    // 2. Stage 2: Name & identity reveal on upper left (~350ms)
    animTimelineTimer1Ref.current = setTimeout(() => {
      setAnimStage('name_revealed');
      sounds.playIntroSting();

      // Start the countdown during the showcase hold window
      const startTime = Date.now();
      const totalDurationMs = showcaseDelay * 1000;

      countdownIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, (totalDurationMs - elapsed) / 1000);
        setShowcaseCountdownSec(remaining);
        if (remaining <= 0) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
        }
      }, 50);
    }, 350);

    // 3. Stage 3: Strict Showcase Delay hold -> Dialogue & Animated Subtitles begin
    const totalDelayMs = 350 + (showcaseDelay * 1000);
    animTimelineTimer2Ref.current = setTimeout(() => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setShowcaseCountdownSec(0);
      setAnimStage('speaking');
      playCandidateDialogue(candidate);
    }, totalDelayMs);

    return () => {
      stopCurrentAudioAndTimers();
    };
  }, [currentIndex, isOpen, lineupCandidates, showcaseDelay]);

  // Play candidate spoken dialogue with audioSync or fallback ticker
  const playCandidateDialogue = async (candidate: Candidate) => {
    const dialogue = candidate.introductionDialogue || getDefaultIntroductionDialogue(candidate);
    const wordsCount = dialogue.trim().split(/\s+/).length;
    const fallbackDurationSec = Math.max(3.5, wordsCount * 0.38);

    setIsSpeakingSpeech(true);

    // Start wave visualizer simulation
    waveIntervalRef.current = setInterval(() => {
      setAudioWaveProgress(prev => (prev + 1) % 100);
    }, 80);

    // Attempt to play Fish.Audio TTS audio if available & unmuted
    if (!isMuted && nineRouterConfig?.fishAudioEnabled) {
      try {
        let blob = preloadedAudioBlobCacheRef.current.get(candidate.id);
        if (!blob) {
          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: dialogue,
              voiceId: candidate.voice?.voiceId,
              apiKey: nineRouterConfig.fishAudioApiKey,
              model: nineRouterConfig.fishAudioModel || 's2.1-pro-free',
              speed: candidate.voice?.speed || 1.0,
            }),
          });
          if (res.ok) {
            blob = await res.blob();
            preloadedAudioBlobCacheRef.current.set(candidate.id, blob);
          }
        }

        if (blob) {
          // Generate a fresh, valid object URL for this playback instance
          const audioUrl = URL.createObjectURL(blob);
          activeAudioUrlRef.current = audioUrl;
          const audio = new Audio(audioUrl);
          activeAudioRef.current = audio;

          // Connect audio to audioSync for acoustic peak and syllable kinetic tracking
          audioSync.attachAudio(audio, dialogue, candidate.id);

          audio.onended = () => {
            audioSync.markCompleted();
            onCandidateFinishedSpeaking();
          };
          audio.onerror = () => {
            scheduleFallbackFinish(fallbackDurationSec);
          };

          await audio.play().catch(() => {
            scheduleFallbackFinish(fallbackDurationSec);
          });
          return;
        }
      } catch (err) {
        console.warn('[TTS audio playback fallback]:', err);
      }
    }

    // Fallback timer if TTS is disabled, muted, or failed
    scheduleFallbackFinish(fallbackDurationSec);
  };

  const scheduleFallbackFinish = (durationSec: number) => {
    const ms = durationSec * 1000;
    speechFallbackTimerRef.current = setTimeout(() => {
      audioSync.markCompleted();
      onCandidateFinishedSpeaking();
    }, ms);
  };

  const onCandidateFinishedSpeaking = () => {
    setIsSpeakingSpeech(false);
    setAnimStage('completed');
    if (waveIntervalRef.current) {
      clearInterval(waveIntervalRef.current);
      waveIntervalRef.current = null;
    }

    // Auto-advance to next candidate ONLY if autoAdvance is ON
    if (autoAdvanceRef.current) {
      const pauseBeat = stepPacing === 'cinematic' ? 1500 : 800;
      postSpeechAdvanceTimerRef.current = setTimeout(() => {
        if (autoAdvanceRef.current) {
          handleNextCandidate();
        }
      }, pauseBeat);
    }
  };

  const handleNextCandidate = () => {
    stopCurrentAudioAndTimers();
    if (currentIndex < lineupCandidates.length - 1) {
      sounds.playIntroTransition();
      setCurrentIndex(prev => prev + 1);
    } else {
      // Reached the finale screen (never auto-start election)
      sounds.playGavel();
      setCurrentIndex(lineupCandidates.length);
    }
  };

  const handlePrevCandidate = () => {
    stopCurrentAudioAndTimers();
    if (currentIndex > 0) {
      sounds.playIntroTransition();
      setCurrentIndex(prev => prev - 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handleReplayCurrent = () => {
    stopCurrentAudioAndTimers();
    if (currentIndex >= 0 && currentIndex < lineupCandidates.length) {
      // Force re-trigger by toggling index
      const idx = currentIndex;
      setCurrentIndex(-2);
      setTimeout(() => setCurrentIndex(idx), 50);
    } else if (currentIndex === lineupCandidates.length) {
      setCurrentIndex(0);
    }
  };

  const handleJumpToCandidate = (index: number) => {
    stopCurrentAudioAndTimers();
    sounds.playIntroTransition();
    setCurrentIndex(index);
  };

  // Keyboard shortcut listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextCandidate();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevCandidate();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleReplayCurrent();
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setIsCleanView(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNextCandidate, handlePrevCandidate, handleReplayCurrent, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex flex-col bg-[#04060b] select-none overflow-hidden font-sans"
      role="dialog"
      aria-modal="true"
    >
      {/* 1. Master Atmospheric Background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Deep Radial Void */}
        <div 
          className="absolute inset-0 transition-all duration-1000"
          style={{
            background: currentCandidate 
              ? `radial-gradient(circle at 65% 50%, ${currentCandidate.color.primary}12 0%, #060912 60%, #030408 100%)`
              : 'radial-gradient(circle at 50% 50%, #0b1329 0%, #050811 70%, #020306 100%)'
          }}
        />

        {/* Cyber Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255, 255, 255, 0.035) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.035) 1px, transparent 1px)
            `,
            backgroundSize: '54px 54px',
          }}
        />

        {/* Ambient Top Light Beam */}
        <div className="absolute top-0 left-1/4 right-1/4 h-36 bg-gradient-to-b from-cyan-500/12 to-transparent blur-3xl" />
      </div>

      {/* Crisp Zero-Blur Broadcast Laser Wipe on Candidate Transition */}
      {transitionKey > 0 && (
        <div 
          key={transitionKey}
          className="absolute inset-0 pointer-events-none z-50 overflow-hidden"
        >
          {/* Razor-Sharp Vertical Laser Blade */}
          <div 
            className="absolute inset-y-0 w-2.5 animate-laser-sweep"
            style={{
              background: '#ffffff',
              boxShadow: currentCandidate 
                ? `0 0 20px 4px ${currentCandidate.color.primary}, 0 0 50px 15px ${currentCandidate.color.primary}99, -40px 0 60px 10px ${currentCandidate.color.primary}44`
                : '0 0 25px 6px #06b6d4, 0 0 60px 20px rgba(6, 182, 212, 0.6)',
            }}
          />
        </div>
      )}

      {/* 2. Top Broadcast Telemetry Header (Auto-hidden in Clean View) */}
      {!isCleanView && (
        <header className="relative z-30 flex items-center justify-between px-6 md:px-10 py-3.5 bg-slate-950/75 border-b border-slate-800/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-950/80 border border-red-600/70 text-red-400 text-xs font-mono font-black tracking-wider">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span>LIVE BROADCAST</span>
            </div>
            <div className="h-4 w-px bg-slate-800 hidden sm:block" />
            <div className="text-xs font-mono text-slate-300 hidden sm:flex items-center gap-2">
              <Film className="w-4 h-4 text-cyan-400" />
              <span className="font-bold tracking-wider uppercase text-white">
                Republic of Valoria // Official Candidate Showcase
              </span>
            </div>
          </div>

          {/* Center Lineup Progress Dots */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            {lineupCandidates.map((cand, idx) => {
              const isCurrent = idx === currentIndex;
              const isPast = idx < currentIndex;
              return (
                <button
                  key={cand.id}
                  onClick={() => handleJumpToCandidate(idx)}
                  className={`relative flex items-center justify-center transition-all duration-300 cursor-pointer ${
                    isCurrent 
                      ? 'w-7 h-7 rounded-lg ring-2 ring-cyan-400 scale-110 z-10' 
                      : isPast 
                      ? 'w-5 h-5 rounded-md opacity-80 hover:opacity-100' 
                      : 'w-4 h-4 rounded-md opacity-35 hover:opacity-75'
                  }`}
                  style={{ backgroundColor: cand.color.primary }}
                  title={`${idx + 1}. ${cand.name}`}
                >
                  <span className="text-[9px] font-mono font-black text-black">
                    {idx + 1}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCleanView(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 text-xs font-mono transition cursor-pointer"
              title="Clean YouTube Capture Mode (Press H to toggle)"
            >
              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden lg:inline">Clean View (H)</span>
            </button>

            <button
              onClick={() => setIsMuted(prev => !prev)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 transition cursor-pointer"
              title={isMuted ? 'Unmute Speech Audio' : 'Mute Speech Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 hover:bg-red-950/80 text-slate-400 hover:text-red-300 border border-slate-800 hover:border-red-800 transition cursor-pointer"
              title="Exit Showcase (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>
      )}

      {/* 3. MAIN CINEMATIC STAGE */}
      <main className="relative flex-1 w-full h-full min-h-0 flex items-center justify-center p-6 md:p-12 lg:p-16 overflow-hidden">
        
        {/* CASE A: Grand Opening Title Screen (Index = -1) */}
        {currentIndex === -1 && (
          <div className="relative z-20 flex flex-col items-center justify-center text-center gap-6 max-w-3xl mx-auto animate-fade-in">
            <div className="p-4 rounded-3xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 backdrop-blur-xl shadow-2xl shadow-cyan-500/20">
              <Crown className="w-12 h-12 text-cyan-400 animate-pulse" />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs md:text-sm font-mono font-black uppercase tracking-[0.35em] text-cyan-400 drop-shadow">
                REPUBLIC OF VALORIA // PRESIDENTIAL ELECTION
              </span>
              <h1 className="text-4xl sm:text-6xl md:text-7xl font-black font-display tracking-tight text-white uppercase drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)]">
                MEET THE CONTENDERS
              </h1>
              <p className="text-sm sm:text-base font-mono text-slate-400 max-w-xl mx-auto mt-2">
                {lineupCandidates.length} Candidates. High-Stakes Diplomacy. Total Strategic War.
              </p>
            </div>

            <button
              onClick={() => setCurrentIndex(0)}
              className="mt-4 flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm font-mono uppercase tracking-widest transition shadow-xl shadow-cyan-500/30 cursor-pointer hover:scale-105"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Begin Introduction</span>
            </button>
          </div>
        )}

        {/* CASE B: Individual Candidate Showcase Screen (0 <= Index < Length) */}
        {currentCandidate && (
          <div className="relative z-20 w-full h-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 items-center gap-6 lg:gap-12">
            
            {/* Colossal Watermark Stencil Typography across the background */}
            <div 
              key={`watermark-${currentCandidate.id}`}
              className="absolute inset-0 flex items-center justify-end pr-2 lg:pr-8 pointer-events-none select-none overflow-hidden -z-10"
            >
              <span 
                className="text-[18vw] font-black uppercase tracking-tighter text-white/[0.035] leading-none transition-all duration-1000 transform translate-x-8 translate-y-6"
                style={{
                  WebkitTextStroke: `1px ${currentCandidate.color.primary}20`,
                }}
              >
                {currentCandidate.name.split(' ').slice(-1)[0]}
              </span>
            </div>

            {/* LEFT HALF (Cols 1-7): Upper-Left Identity & Lower-Left Kinetic Dialogue */}
            <div className="lg:col-span-7 h-full flex flex-col justify-between py-2 sm:py-6 z-20 order-2 lg:order-1">
              
              {/* UPPER LEFT: Name, Archetype & Presidential Title */}
              <div 
                className={`flex flex-col gap-3 transition-all duration-700 ${
                  animStage === 'entering' 
                    ? 'opacity-0 -translate-x-8' 
                    : 'opacity-100 translate-x-0'
                }`}
              >
                {/* Header Pills: Candidate Index & Codename */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div 
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-black uppercase tracking-wider border shadow-md"
                    style={{
                      backgroundColor: `${currentCandidate.color.primary}18`,
                      borderColor: `${currentCandidate.color.primary}77`,
                      color: currentCandidate.color.primary
                    }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentCandidate.color.primary }} />
                    <span>CANDIDATE {String(currentIndex + 1).padStart(2, '0')} // {String(lineupCandidates.length).padStart(2, '0')}</span>
                  </div>

                  <span className="px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-slate-300 text-xs font-mono font-bold uppercase tracking-wider shadow-sm">
                    {currentCandidate.codename}
                  </span>

                  <span 
                    className="text-xs font-mono font-black uppercase px-2.5 py-0.5 rounded-lg border hidden sm:inline-block"
                    style={{
                      backgroundColor: `${currentCandidate.color.primary}12`,
                      color: currentCandidate.color.primary,
                      borderColor: `${currentCandidate.color.primary}44`
                    }}
                  >
                    ${currentCandidate.initialBudget ?? 100}M WAR CHEST
                  </span>
                </div>

                {/* Candidate Giant Headline Name with Profile Tag & Dynamic Laser Spark */}
                <div className="relative mt-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span 
                      className="text-[10px] font-mono font-black uppercase tracking-[0.25em] px-2 py-0.5 rounded bg-slate-900/90 border"
                      style={{ 
                        color: currentCandidate.color.primary, 
                        borderColor: `${currentCandidate.color.primary}44` 
                      }}
                    >
                      VALORIA CANDIDATE PROFILE
                    </span>
                    <span className="h-px flex-1 max-w-[80px] bg-slate-800" />
                  </div>

                  <h2 
                    className="text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-black font-display tracking-tight text-white uppercase leading-[1.05] drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]"
                  >
                    {currentCandidate.name}
                  </h2>

                  {/* Dynamic Laser Spark Underline */}
                  <div className="relative h-1.5 w-48 sm:w-64 mt-2.5 rounded-full overflow-hidden bg-slate-900 border border-slate-800">
                    <div 
                      className="h-full w-full rounded-full transition-all duration-700"
                      style={{
                        background: `linear-gradient(to right, ${currentCandidate.color.primary}, ${currentCandidate.color.secondary || currentCandidate.color.primary}88)`
                      }}
                    />
                    {/* High-speed glowing laser spark travelling across */}
                    <div 
                      className="absolute inset-y-0 w-8 animate-laser-spark"
                      style={{
                        background: 'linear-gradient(to right, transparent, #ffffff, transparent)',
                        boxShadow: '0 0 10px #ffffff'
                      }}
                    />
                  </div>
                </div>

                {/* Candidate Role & Campaign Slogan */}
                <div className="flex flex-col gap-1 mt-1">
                  <span className="text-base sm:text-lg font-mono font-bold text-slate-200">
                    {currentCandidate.titleRole}
                  </span>
                  <span className="text-xs sm:text-sm font-serif italic text-slate-400">
                    "{currentCandidate.slogan}"
                  </span>
                </div>

                {/* High-Tech 10-Segment Cyber Countdown Meter during Showcase Hold Window */}
                {animStage === 'name_revealed' && showcaseCountdownSec > 0 && (
                  <div className="flex flex-col gap-2 mt-3.5 max-w-md p-3.5 rounded-2xl bg-slate-950/85 border border-slate-800/80 backdrop-blur-md animate-fade-in shadow-xl">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-cyan-400 font-bold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                        TRANSMISSION SYNCHRONIZING
                      </span>
                      <span className="text-slate-300 font-black tracking-wider">
                        {showcaseCountdownSec.toFixed(1)}s
                      </span>
                    </div>

                    {/* 10-Segment LED Meter */}
                    <div className="grid grid-cols-10 gap-1.5 h-2">
                      {Array.from({ length: 10 }).map((_, idx) => {
                        const progress = Math.min(100, Math.max(0, ((showcaseDelay - showcaseCountdownSec) / showcaseDelay) * 100));
                        const segmentThreshold = (idx + 1) * 10;
                        const isFilled = progress >= segmentThreshold;
                        return (
                          <div 
                            key={idx}
                            className={`h-full rounded-sm transition-all duration-150 ${
                              isFilled 
                                ? 'shadow-[0_0_8px_rgba(6,182,212,0.8)]' 
                                : 'bg-slate-900 border border-slate-800/60'
                            }`}
                            style={{
                              backgroundColor: isFilled ? (currentCandidate.color.primary || '#06b6d4') : undefined
                            }}
                          />
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                      <span>Neural Link Active</span>
                      <span>Signal 100% Locked</span>
                    </div>
                  </div>
                )}
              </div>

              {/* LOWER LEFT: Animated Kinetic Subtitles & Presidential Dialogue Chassis */}
              <div 
                className={`flex flex-col gap-3 mt-auto pt-6 transition-all duration-700 ease-out ${
                  animStage === 'entering' || animStage === 'name_revealed'
                    ? 'opacity-0 translate-y-8 pointer-events-none'
                    : 'opacity-100 translate-y-0'
                }`}
              >
                {/* Audio Delivery Status Ribbon */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono shadow-sm">
                    <Volume2 
                      className={`w-3.5 h-3.5 transition-colors ${
                        isSpeakingSpeech ? 'text-cyan-400 animate-pulse' : 'text-slate-500'
                      }`} 
                    />
                    <span className="text-slate-400 text-[11px]">Voice:</span>
                    <span className="text-white font-bold">{currentCandidate.voice?.voiceName || 'Custom Vocal Model'}</span>
                  </div>

                  {/* Equalizer Waveform Bars */}
                  {isSpeakingSpeech && (
                    <div className="flex items-end gap-1 h-5 px-2 py-0.5 rounded-lg bg-slate-900/80 border border-cyan-500/30">
                      {[40, 85, 60, 100, 75, 45, 90, 65, 30].map((h, i) => {
                        const dynamicH = Math.min(100, Math.max(20, (h * ((audioWaveProgress + i * 15) % 100)) / 100));
                        return (
                          <div 
                            key={i} 
                            className="w-1 rounded-full transition-all duration-75"
                            style={{ 
                              height: `${dynamicH}%`,
                              backgroundColor: currentCandidate.color.primary 
                            }} 
                          />
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Subtitle Dialogue Speech Box with Cyber Corner Accents */}
                <div 
                  className="relative p-5 sm:p-6 rounded-2xl backdrop-blur-2xl border shadow-2xl transition-all duration-500 max-w-2xl overflow-hidden group"
                  style={{
                    backgroundColor: 'rgba(5, 8, 16, 0.92)',
                    borderColor: `${currentCandidate.color.primary}66`,
                    boxShadow: `0 16px 45px -12px ${currentCandidate.color.primary}33, inset 0 1px 0 rgba(255,255,255,0.08)`
                  }}
                >
                  {/* Cyber Corner Accents */}
                  <div 
                    className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2" 
                    style={{ borderColor: currentCandidate.color.primary }} 
                  />
                  <div 
                    className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2" 
                    style={{ borderColor: currentCandidate.color.primary }} 
                  />
                  <div 
                    className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2" 
                    style={{ borderColor: currentCandidate.color.primary }} 
                  />
                  <div 
                    className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2" 
                    style={{ borderColor: currentCandidate.color.primary }} 
                  />

                  {/* Header Ribbon inside Dialogue Chassis */}
                  <div className="flex items-center justify-between gap-2 pb-2.5 mb-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-2 h-2 rounded-full animate-pulse" 
                        style={{ backgroundColor: currentCandidate.color.primary }} 
                      />
                      <span className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-300">
                        OFFICIAL CAMPAIGN ADDRESS // {currentCandidate.codename}
                      </span>
                    </div>

                    {isSpeakingSpeech && (
                      <span className="text-[9px] font-mono font-bold uppercase text-cyan-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                        LIVE BROADCAST FEED
                      </span>
                    )}
                  </div>

                  <KineticDialogueBox
                    text={currentCandidate.introductionDialogue || getDefaultIntroductionDialogue(currentCandidate)}
                    isSpeaking={animStage === 'speaking'}
                    isWaiting={animStage !== 'speaking' && animStage !== 'completed'}
                    hasCompleted={animStage === 'completed'}
                    speakerColor={currentCandidate.color.primary}
                    fontSize="cinematic"
                    style="cinematic"
                    highlightCritical={true}
                    dynamicResize={true}
                    speakerId={currentCandidate.id}
                  />
                </div>
              </div>
            </div>

            {/* RIGHT HALF (Cols 8-12): Full-Body Transparent PNG Portrait on Holographic Dais */}
            <div className="lg:col-span-5 h-full flex items-center justify-center relative order-1 lg:order-2">
              
              {/* Dynamic Volumetric Dual-Ring Aura Spot behind character */}
              <div 
                className="absolute w-72 sm:w-96 h-72 sm:h-96 rounded-full blur-[115px] opacity-45 pointer-events-none transition-all duration-1000"
                style={{ backgroundColor: currentCandidate.color.primary }}
              />
              <div 
                className="absolute w-44 sm:w-60 h-44 sm:h-60 rounded-full blur-[60px] opacity-60 pointer-events-none transition-all duration-700"
                style={{ backgroundColor: `${currentCandidate.color.primary}bb` }}
              />

              {/* Ambient Top Spotlight Cone */}
              <div 
                className="absolute -top-12 w-64 sm:w-80 h-96 opacity-20 pointer-events-none blur-3xl"
                style={{
                  background: `radial-gradient(ellipse at top, ${currentCandidate.color.primary}, transparent 70%)`
                }}
              />

              {/* 3D Perspective Holographic Dais / Presidential Pedestal */}
              <div 
                className="absolute bottom-2 sm:bottom-4 md:bottom-6 w-72 sm:w-88 md:w-96 h-28 pointer-events-none flex items-center justify-center z-10"
                style={{ perspective: '700px' }}
              >
                <div 
                  className="relative w-full h-full flex items-center justify-center"
                  style={{ transform: 'rotateX(72deg)' }}
                >
                  {/* Outer Rotating Dashed Neon Ring */}
                  <div 
                    className="absolute inset-0 rounded-full border-2 border-dashed animate-dais-spin opacity-60"
                    style={{ borderColor: currentCandidate.color.primary }}
                  />
                  {/* Middle Counter-Rotating Pulse Ring */}
                  <div 
                    className="absolute inset-4 rounded-full border border-dotted opacity-40 animate-pulse"
                    style={{ borderColor: currentCandidate.color.primary }}
                  />
                  {/* Glowing Energy Core Center */}
                  <div 
                    className="absolute inset-10 rounded-full blur-md opacity-45"
                    style={{ backgroundColor: `${currentCandidate.color.primary}` }}
                  />
                  {/* Realistic Ground Floor Contact Shadow under shoes */}
                  <div className="absolute inset-x-8 inset-y-4 bg-black/90 rounded-full blur-md" />
                </div>
              </div>

              {/* Character Full-Body Image with Kinetic Broadcast Slam & Ambient Breathing Float */}
              <div 
                className={`relative w-full h-[440px] sm:h-[540px] md:h-[640px] xl:h-[720px] flex items-center justify-center transition-all duration-700 ease-out z-20 ${
                  animStage === 'entering' 
                    ? 'opacity-0 translate-x-12' 
                    : 'opacity-100 translate-x-0'
                }`}
              >
                {currentCandidate.fullBodyImageUrl ? (
                  <div className="relative h-full flex items-center justify-center animate-candidate-float">
                    {/* Holographic Scanline Sweep passing vertically */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30 z-10">
                      <div className="w-full h-10 bg-gradient-to-b from-transparent via-cyan-300/30 to-transparent animate-scanline-sweep" />
                    </div>

                    <img
                      src={currentCandidate.fullBodyImageUrl}
                      alt={currentCandidate.name}
                      className="h-full w-auto max-w-full object-contain filter select-none transition-all duration-500 hover:scale-[1.02] animate-broadcast-slam"
                      style={{
                        filter: `drop-shadow(0 0 35px ${currentCandidate.color.primary}45) drop-shadow(0 20px 30px rgba(0,0,0,0.95))`
                      }}
                    />
                  </div>
                ) : (
                  /* Holographic Candidate Avatar & Insignia Fallback */
                  <div className="flex flex-col items-center justify-center gap-6 p-8 rounded-3xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-md max-w-sm text-center shadow-2xl animate-candidate-float">
                    <div 
                      className="relative p-6 rounded-full border-2 shadow-2xl animate-pulse"
                      style={{
                        borderColor: currentCandidate.color.primary,
                        boxShadow: `0 0 45px ${currentCandidate.color.primary}55`
                      }}
                    >
                      <CandidateAvatar candidate={currentCandidate} size="xl" isSpeaking={isSpeakingSpeech} />
                    </div>
                    <div>
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 block">
                        Full-Body PNG Cutout
                      </span>
                      <span className="text-sm font-mono text-cyan-300 block mt-1">
                        Upload in Character Studio
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CASE C: Finale Showcase Screen (Index = Length) */}
        {currentIndex === lineupCandidates.length && (
          <div className="relative z-20 flex flex-col items-center justify-center text-center gap-6 max-w-3xl mx-auto animate-fade-in">
            <div className="p-4 rounded-3xl bg-emerald-950/40 border border-emerald-500/50 backdrop-blur-xl shadow-2xl shadow-emerald-500/20">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs md:text-sm font-mono font-black uppercase tracking-[0.35em] text-emerald-400 drop-shadow">
                THE LINEUP IS ASSEMBLED
              </span>
              <h1 className="text-4xl sm:text-6xl font-black font-display tracking-tight text-white uppercase drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)]">
                LET THE BATTLE BEGIN
              </h1>
              <p className="text-sm sm:text-base font-mono text-slate-400 max-w-xl mx-auto mt-1">
                All {lineupCandidates.length} presidential contenders have delivered their opening address to the Republic.
              </p>
            </div>

            <div className="flex items-center gap-3 mt-4 flex-wrap justify-center">
              <button
                onClick={handleReplayCurrent}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-700 font-mono text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Replay Showcase</span>
              </button>

              <button
                onClick={onClose}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-700 font-mono text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Close Showcase</span>
              </button>

              {onStartElection && (
                <button
                  onClick={() => {
                    onClose();
                    onStartElection();
                  }}
                  className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs font-mono uppercase tracking-widest transition shadow-lg shadow-emerald-500/25 cursor-pointer hover:scale-105"
                >
                  <Flame className="w-4 h-4 fill-current" />
                  <span>Start Live Election</span>
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 4. BOTTOM CREATOR BROADCAST TOOLBAR (Hidden in Clean View) */}
      {!isCleanView && (
        <footer className="relative z-30 flex flex-col gap-3 px-6 md:px-10 py-3.5 bg-slate-950/85 border-t border-slate-800/80 backdrop-blur-md shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-4">
            
            {/* Left Playback Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevCandidate}
                disabled={currentIndex <= 0}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 text-xs font-mono font-bold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Previous Candidate (Left Arrow)"
              >
                <SkipBack className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Prev</span>
              </button>

              <button
                onClick={() => setIsPlaying(prev => !prev)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-black transition cursor-pointer shadow-md shadow-cyan-500/20"
                title="Play / Pause Showcase (Space)"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>

              <button
                onClick={handleNextCandidate}
                disabled={currentIndex >= lineupCandidates.length}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 text-xs font-mono font-bold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Next Candidate (Right Arrow)"
              >
                <span className="hidden sm:inline">Next</span>
                <SkipForward className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleReplayCurrent}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800 transition cursor-pointer"
                title="Replay Current Candidate (R)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Middle Pacing & Auto-Advance & Showcase Delay Toggles */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Auto Advance Toggle */}
              <button
                onClick={() => setAutoAdvance(prev => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition border cursor-pointer ${
                  autoAdvance 
                    ? 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300 font-bold' 
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
                title="When ON, advances to next candidate after speech finishes"
              >
                <span>Auto-Advance:</span>
                <span className="font-bold">{autoAdvance ? 'ON' : 'MANUAL'}</span>
              </button>

              {/* Showcase Delay Quick Cycle Selector */}
              <div 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono cursor-pointer hover:border-cyan-500/50 transition"
                onClick={() => {
                  const presets = [1.5, 2.0, 3.0, 4.0, 5.0];
                  const currentIdx = presets.indexOf(showcaseDelay);
                  const nextVal = currentIdx >= 0 && currentIdx < presets.length - 1 ? presets[currentIdx + 1] : presets[0];
                  setShowcaseDelay(nextVal);
                }}
                title="Click to cycle Showcase Delay duration before speech starts"
              >
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-400">Showcase Hold:</span>
                <span className="text-cyan-300 font-bold">{showcaseDelay.toFixed(1)}s</span>
              </div>

              {/* Pacing Toggle */}
              <div className="hidden md:flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-mono">
                <button
                  onClick={() => setStepPacing('cinematic')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    stepPacing === 'cinematic' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Cinematic (1.5s)
                </button>
                <button
                  onClick={() => setStepPacing('standard')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    stepPacing === 'standard' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Fast (0.8s)
                </button>
              </div>
            </div>

            {/* Right Roster Thumbnail Scrubber */}
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="hidden xl:inline">Candidate</span>
              <span className="font-bold text-white">
                {currentIndex >= 0 && currentIndex < lineupCandidates.length ? currentIndex + 1 : '-'} / {lineupCandidates.length}
              </span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};
