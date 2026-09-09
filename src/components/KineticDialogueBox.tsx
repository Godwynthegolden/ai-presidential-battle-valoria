'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  tokenizeSpeech, 
  getAcousticRevealedWordCount,
  estimateSpokenDurationSeconds, 
  CATEGORY_STYLES,
  KineticWordToken
} from '@/utils/kineticSubtitles';
import { audioSync, AudioSyncState } from '@/utils/audioSync';
import { Volume2 } from 'lucide-react';

export interface KineticDialogueBoxProps {
  text: string;
  isSpeaking?: boolean;
  speakerColor?: string;
  className?: string;
  fontFamily?: 'sans' | 'mono';
  fontSize?: 'standard' | 'large' | 'cinematic';
  enabled?: boolean;
  style?: 'mrbeast' | 'cinematic' | 'neon';
  highlightCritical?: boolean;
  dynamicResize?: boolean;
  showQuotes?: boolean;
  hasCompleted?: boolean;
  speakerId?: string;
  isWaiting?: boolean;
  waitingLabel?: string;
  forcedRevealedCount?: number;
  forcedActiveIndex?: number;
}

export const KineticDialogueBox: React.FC<KineticDialogueBoxProps> = ({
  text,
  isSpeaking = false,
  speakerColor = '#06b6d4',
  className = '',
  fontFamily = 'sans',
  fontSize = 'large',
  enabled = true,
  style = 'mrbeast',
  highlightCritical = true,
  dynamicResize = true,
  showQuotes = true,
  hasCompleted = false,
  speakerId,
  isWaiting = false,
  waitingLabel,
  forcedRevealedCount,
  forcedActiveIndex,
}) => {
  // Tokenize speech into weighted kinetic tokens
  const tokens = useMemo(() => tokenizeSpeech(text), [text]);

  // Revealed word count (accumulates word-by-word; words never disappear)
  const [revealedCount, setRevealedCount] = useState<number>(() => {
    if (isWaiting) return 0;
    if (isSpeaking && !hasCompleted) return 0;
    return tokens.length;
  });
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [vocalEnergy, setVocalEnergy] = useState<number>(0);

  const revealedCountRef = useRef<number>(revealedCount);
  revealedCountRef.current = revealedCount;

  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackRafRef = useRef<number | null>(null);
  const fallbackStartTimeRef = useRef<number | null>(null);

  // Track previous text to detect transitions
  const prevTextRef = useRef<string>(text);
  const prevSpeakingRef = useRef<boolean>(isSpeaking);

  useEffect(() => {
    const textChanged = prevTextRef.current !== text;
    const speechStarted = !prevSpeakingRef.current && isSpeaking;

    if (textChanged) {
      if (isWaiting || (isSpeaking && !hasCompleted)) {
        setRevealedCount(0);
        revealedCountRef.current = 0;
        setActiveIndex(-1);
        setVocalEnergy(0);
        fallbackStartTimeRef.current = null;
      } else {
        setRevealedCount(tokens.length);
        revealedCountRef.current = tokens.length;
        setActiveIndex(-1);
        setVocalEnergy(0);
      }
    } else if (isWaiting) {
      setRevealedCount(0);
      revealedCountRef.current = 0;
      setActiveIndex(-1);
      setVocalEnergy(0);
    } else if (speechStarted) {
      // Guard: Only start from 0 if speech has not revealed words yet and has not completed!
      if (!hasCompleted && revealedCountRef.current === 0) {
        setRevealedCount(0);
        revealedCountRef.current = 0;
        setActiveIndex(-1);
        setVocalEnergy(0);
        fallbackStartTimeRef.current = null;
      }
    } else if (!isSpeaking && hasCompleted) {
      setRevealedCount(tokens.length);
      revealedCountRef.current = tokens.length;
      setActiveIndex(-1);
      setVocalEnergy(0);
    }

    prevTextRef.current = text;
    prevSpeakingRef.current = isSpeaking;
  }, [text, isSpeaking, tokens.length, hasCompleted, isWaiting]);

  // Synchronize with audioSync service (Acoustic Peak & VAD) or run calibrated fallback ticker
  useEffect(() => {
    if (!enabled || hasCompleted || isWaiting) {
      if (isWaiting) {
        setRevealedCount(0);
        revealedCountRef.current = 0;
      } else {
        setRevealedCount(tokens.length);
        revealedCountRef.current = tokens.length;
      }
      setActiveIndex(-1);
      return;
    }

    let isAudioActive = false;

    const cancelFallback = () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      if (fallbackRafRef.current) {
        cancelAnimationFrame(fallbackRafRef.current);
        fallbackRafRef.current = null;
      }
    };

    const unsubscribe = audioSync.subscribe((syncState: AudioSyncState) => {
      const isTextMatch = syncState.text === text || 
        (syncState.text && text && (
          syncState.text.includes(text.slice(0, 25)) || 
          text.includes(syncState.text.slice(0, 25))
        ));

      const isSpeakerMatch = !speakerId || !syncState.speakerId || syncState.speakerId === speakerId;
      const isMatchingAudio = isTextMatch && isSpeakerMatch;

      if (syncState.isPlaying && isMatchingAudio) {
        isAudioActive = true;
        cancelFallback();

        // 1. Pre-Audio Readiness Gate: Hold at 0 during MP3 buffering
        if (!syncState.isAudioReady) {
          setRevealedCount(0);
          revealedCountRef.current = 0;
          setActiveIndex(-1);
          setVocalEnergy(0);
          return;
        }

        // 2. Option 2: Acoustic Peak & Voice Activity Gated word advancement
        const rawNextCount = getAcousticRevealedWordCount({
          tokens,
          currentTime: syncState.currentTime,
          duration: syncState.duration,
          isAudioReady: syncState.isAudioReady,
          isVoiceActive: syncState.isVoiceActive,
          isPeak: syncState.isPeak,
          progress: syncState.progress,
          lastRevealedCount: revealedCountRef.current,
        });

        const nextCount = Math.max(revealedCountRef.current, rawNextCount);
        revealedCountRef.current = nextCount;
        setRevealedCount(nextCount);
        setVocalEnergy(syncState.energy);
        setActiveIndex(nextCount > 0 && syncState.progress < 0.999 ? nextCount - 1 : -1);

      } else if (!syncState.isPlaying && syncState.progress >= 1.0 && isMatchingAudio) {
        isAudioActive = false;
        cancelFallback();
        setRevealedCount(tokens.length);
        revealedCountRef.current = tokens.length;
        setActiveIndex(-1);
        setVocalEnergy(0);
      }
    });

    // Fallback ticker: Only executes if audio is not detected after a 1.2s grace window
    // (e.g. muted sound, sound effects disabled in settings, or synthesis error)
    if (isSpeaking && !isAudioActive && !hasCompleted) {
      fallbackTimerRef.current = setTimeout(() => {
        const state = audioSync.getState();
        const matches = state.isPlaying && (
          state.text === text || 
          (state.text && text && (state.text.includes(text.slice(0, 25)) || text.includes(state.text.slice(0, 25))))
        );

        if (matches) return; // Audio has attached, do not run procedural ticker

        const durationSeconds = estimateSpokenDurationSeconds(tokens);
        const durationMs = durationSeconds * 1000;

        const tick = (now: number) => {
          if (!fallbackStartTimeRef.current) {
            fallbackStartTimeRef.current = now;
          }

          const elapsed = now - fallbackStartTimeRef.current;
          const currentProgress = Math.min(1, Math.max(0, elapsed / durationMs));
          const currentCount = currentProgress >= 0.999 
            ? tokens.length 
            : Math.max(revealedCountRef.current, Math.min(tokens.length, Math.floor(currentProgress * tokens.length) + 1));

          revealedCountRef.current = currentCount;
          setRevealedCount(currentCount);
          setActiveIndex(currentCount > 0 && currentProgress < 0.999 ? currentCount - 1 : -1);

          if (currentProgress < 1.0 && isSpeaking) {
            fallbackRafRef.current = requestAnimationFrame(tick);
          } else {
            fallbackRafRef.current = null;
            setActiveIndex(-1);
          }
        };

        fallbackRafRef.current = requestAnimationFrame(tick);
      }, 1000);
    } else if (!isSpeaking) {
      cancelFallback();
      setActiveIndex(-1);
      setVocalEnergy(0);
      if (hasCompleted) {
        setRevealedCount(tokens.length);
        revealedCountRef.current = tokens.length;
      }
    }

    return () => {
      unsubscribe();
      cancelFallback();
    };
  }, [enabled, isSpeaking, text, tokens]);

  // 100% Subtitle Animation Completion Tracking (Guarantees all words and CSS animations 100% settled)
  useEffect(() => {
    if (!text) return;
    if (!enabled) {
      audioSync.notifySubtitlesComplete(text);
      return;
    }
    if (isWaiting) {
      audioSync.notifySubtitlesStarted(text);
      return;
    }

    if (tokens.length === 0) {
      audioSync.notifySubtitlesComplete(text);
      return;
    }

    if (revealedCount >= tokens.length && activeIndex === -1) {
      // 180ms delay guarantees the kineticWordPop CSS keyframe animation (0.18s) has 100% finished
      const timer = setTimeout(() => {
        audioSync.notifySubtitlesComplete(text);
      }, 180);
      return () => clearTimeout(timer);
    } else {
      audioSync.notifySubtitlesStarted(text);
    }
  }, [text, enabled, isWaiting, revealedCount, tokens.length, activeIndex]);

  // If kinetic subtitles are disabled in settings, render standard static paragraph
  if (!enabled) {
    return (
      <div className={`relative transition-all duration-300 ${className}`}>
        <p className={`${
          fontSize === 'cinematic'
            ? 'text-2xl sm:text-3xl md:text-4xl'
            : fontSize === 'large'
            ? 'text-xl sm:text-2xl md:text-3xl'
            : 'text-lg sm:text-xl md:text-2xl'
        } ${fontFamily === 'mono' ? 'font-mono' : 'font-sans'} font-semibold text-white leading-relaxed italic`}>
          {showQuotes && <>&ldquo;</>}
          {text}
          {showQuotes && <>&rdquo;</>}
        </p>
      </div>
    );
  }

  // Typography scale classes
  const fontScaleClass = fontSize === 'cinematic'
    ? 'text-2xl sm:text-3xl md:text-4xl leading-relaxed md:leading-snug'
    : fontSize === 'large'
    ? 'text-xl sm:text-2xl md:text-3xl leading-relaxed md:leading-normal'
    : 'text-lg sm:text-xl md:text-2xl leading-relaxed';

  const fontFamClass = fontFamily === 'mono' ? 'font-mono' : 'font-sans';
  const displayCount = forcedRevealedCount !== undefined ? forcedRevealedCount : revealedCount;

  return (
    <div 
      className={`relative w-full ${dynamicResize ? 'transition-[min-height,height] duration-200 ease-out' : ''} ${className}`}
      style={{
        // Smooth natural dynamic height expansion
        minHeight: dynamicResize && isSpeaking && displayCount === 0 ? '3rem' : undefined,
      }}
    >
      {/* Starting Breathing Indicator (Shows momentarily while box is empty during audio buffer) */}
      {isSpeaking && displayCount === 0 && !isWaiting && (
        <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 py-2 animate-pulse">
          <Volume2 className="w-4 h-4 animate-bounce" />
          <span className="tracking-widest uppercase font-bold text-slate-300">
            Speaking...
          </span>
          <span className="flex items-center gap-1 ml-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 opacity-60" />
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 opacity-30" />
          </span>
        </div>
      )}

      {/* Awaiting Turn Indicator (Shows while waiting for partner to finish speaking) */}
      {isWaiting && (
        <div className="flex items-center gap-2 text-xs font-mono text-cyan-400/80 py-2 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="tracking-widest uppercase font-bold text-slate-300">
            {waitingLabel || 'Awaiting spoken reply...'}
          </span>
          <span className="flex items-center gap-1 ml-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 opacity-60" />
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 opacity-30" />
          </span>
        </div>
      )}

      {/* Main Spoken Text Container: Words flow in and STAY in the box! */}
      <p className={`${fontScaleClass} ${fontFamClass} font-semibold text-white tracking-normal select-text relative z-10 flex flex-wrap items-baseline gap-x-1.5 gap-y-1`}>
        {showQuotes && displayCount > 0 && (
          <span className="text-white/40 font-serif font-normal select-none -mr-0.5">
            &ldquo;
          </span>
        )}

        {tokens.slice(0, displayCount).map((token: KineticWordToken) => {
          const currentActiveIndex = forcedActiveIndex !== undefined ? forcedActiveIndex : activeIndex;
          const isActive = token.index === currentActiveIndex && isSpeaking;
          const styles = CATEGORY_STYLES[highlightCritical ? token.category : 'none'];
          const energyScale = 1.10 + Math.min(0.18, vocalEnergy * 0.22);

          return (
            <span
              key={`kinetic-token-${token.index}-${token.cleanWord}`}
              className={`inline-block relative transition-all duration-150 transform-gpu ${
                isActive 
                  ? 'z-20 font-black' 
                  : 'scale-100 z-10'
              } ${
                token.isCritical && highlightCritical
                  ? `px-1.5 py-0.5 rounded-lg border ${styles.badgeBg} ${styles.badgeBorder} ${styles.textColor} ${
                      isActive 
                        ? `${styles.glowShadow} ${styles.activeColor} ring-2 ring-white/70` 
                        : styles.ambientShadow
                    } uppercase tracking-tight`
                  : isActive
                  ? `text-white font-extrabold ${styles.glowShadow} underline decoration-cyan-400 decoration-2 underline-offset-4`
                  : 'text-slate-100 font-medium'
              }`}
              style={{
                // Voice-reactive kinetic scale: active word pops and pulses with actual candidate audio amplitude!
                transform: isActive ? `scale(${energyScale.toFixed(2)})` : undefined,
                animation: isActive 
                  ? 'kineticWordPop 0.18s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' 
                  : undefined,
                textShadow: isActive
                  ? token.isCritical && highlightCritical
                    ? `0 0 ${(14 + vocalEnergy * 12).toFixed(0)}px ${styles.accentHex}, 0 0 28px ${styles.accentHex}99, 0 2px 4px rgba(0,0,0,0.9)`
                    : `0 0 ${(8 + vocalEnergy * 8).toFixed(0)}px rgba(255,255,255,0.8), 0 2px 4px rgba(0,0,0,0.8)`
                  : token.isCritical && highlightCritical
                  ? `0 0 8px ${styles.accentHex}55, 0 1px 2px rgba(0,0,0,0.7)`
                  : undefined,
              }}
            >
              {token.original}
            </span>
          );
        })}

        {showQuotes && revealedCount >= tokens.length && tokens.length > 0 && (
          <span className="text-white/40 font-serif font-normal select-none -ml-0.5">
            &rdquo;
          </span>
        )}
      </p>
    </div>
  );
};
