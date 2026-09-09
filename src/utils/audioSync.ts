/**
 * Audio Synchronization Service for Republic of Valoria
 * 
 * Provides real-time synchronization between playing HTMLAudioElement instances
 * and UI components (such as KineticSubtitles) with zero latency, high-precision
 * requestAnimationFrame timestamp tracking, and Web Audio API acoustic peak &
 * voice activity detection (VAD).
 */

import { sounds } from '@/utils/audio';

export interface AudioSyncState {
  isPlaying: boolean;
  isAudioReady: boolean;
  currentTime: number;
  duration: number;
  progress: number; // 0.0 to 1.0
  text: string;
  speakerId: string | null;
  audioInstanceId: number;
  // Option 2: Acoustic Peak & Voice Activity Detection (Web Audio Analyser)
  energy: number;        // 0.0 to 1.0 real-time vocal amplitude
  isVoiceActive: boolean;// true when candidate is vocalizing, false during pause/breath
  isPeak: boolean;       // true on acoustic syllable burst / peak
  peakCount: number;     // running count of syllable bursts
}

export type AudioSyncListener = (state: AudioSyncState) => void;

class AudioSyncService {
  private activeAudio: HTMLAudioElement | null = null;
  private activeText: string = '';
  private speakerId: string | null = null;
  private listeners: Set<AudioSyncListener> = new Set();
  private rafId: number | null = null;
  private instanceCounter: number = 0;
  private currentInstanceId: number = 0;

  // Web Audio DSP Analyser Nodes
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private prevEnergy: number = 0;
  private peakCount: number = 0;
  private lastPeakTime: number = 0;

  // Subtitle & Dialogue Completion Coordination
  private completedSubtitleText: string = '';
  private completedCctvPactId: string = '';
  private completionListeners: Set<() => void> = new Set();

  private currentState: AudioSyncState = {
    isPlaying: false,
    isAudioReady: false,
    currentTime: 0,
    duration: 0,
    progress: 0,
    text: '',
    speakerId: null,
    audioInstanceId: 0,
    energy: 0,
    isVoiceActive: false,
    isPeak: false,
    peakCount: 0,
  };

  /**
   * Attaches a newly playing audio element to the synchronization tracker.
   * Connects to Web Audio API Analyser for real-time acoustic peak & VAD detection.
   */
  public attachAudio(audio: HTMLAudioElement, text: string, speakerId?: string): void {
    // Stop and detach any existing tracking loop
    this.detach();

    this.activeAudio = audio;
    this.activeText = text || '';
    this.speakerId = speakerId || null;
    this.instanceCounter += 1;
    this.currentInstanceId = this.instanceCounter;
    this.prevEnergy = 0;
    this.peakCount = 0;
    this.lastPeakTime = 0;

    const instanceId = this.currentInstanceId;

    // Initialize Web Audio DSP Analyser Node
    if (typeof window !== 'undefined') {
      try {
        let contextInit = sounds.getContext();
        if (!contextInit) {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            const fallbackCtx = new AudioCtx();
            contextInit = { ctx: fallbackCtx, masterOut: fallbackCtx.destination as any };
          }
        }

        if (contextInit) {
          const { ctx, masterOut } = contextInit;
          if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }

          // Reuse existing MediaElementAudioSourceNode on the element to avoid browser InvalidStateError
          let source: MediaElementAudioSourceNode;
          if ((audio as any).__audioSyncSourceNode) {
            source = (audio as any).__audioSyncSourceNode;
          } else if ((audio as any).__wiretapSourceNode) {
            source = (audio as any).__wiretapSourceNode;
          } else {
            source = ctx.createMediaElementSource(audio);
            (audio as any).__audioSyncSourceNode = source;
            (audio as any).__wiretapSourceNode = source;
          }

          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256; // 128 frequency bins, ultra-fast 2.5ms response
          analyser.smoothingTimeConstant = 0.25; // responsive vocal envelope tracking
          source.connect(analyser);

          // Route to master output so audio plays with studio mastering warmth
          try {
            analyser.connect(masterOut);
          } catch {
            // Destination already connected or handled
          }

          this.analyser = analyser;
          this.dataArray = new Uint8Array(analyser.frequencyBinCount);
        }
      } catch (err) {
        console.warn('[AudioSyncService] Web Audio Analyser setup note:', err);
      }
    }

    const tick = () => {
      if (!this.activeAudio || this.currentInstanceId !== instanceId) {
        return;
      }

      const audioEl = this.activeAudio;
      const currentTime = audioEl.currentTime || 0;
      const duration = audioEl.duration && !isNaN(audioEl.duration) && audioEl.duration > 0
        ? audioEl.duration
        : 0;

      const progress = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
      const isPlaying = !audioEl.paused && !audioEl.ended && currentTime < (duration || 999999);

      // DSP Acoustic Analysis
      let energy = 0;
      let isVoiceActive = false;
      let isPeak = false;

      if (this.analyser && this.dataArray && isPlaying) {
        this.analyser.getByteFrequencyData(this.dataArray as any);
        // Formant range for human vocal frequencies (bins 2-45 ~ 250Hz - 3800Hz)
        const speechBins = this.dataArray.slice(2, 45);
        let sum = 0;
        for (let i = 0; i < speechBins.length; i++) {
          sum += speechBins[i];
        }
        const avg = speechBins.length > 0 ? sum / speechBins.length : 0;
        energy = Math.min(1, Math.max(0, avg / 128));

        // Adaptive voice activity threshold (silence / breathing typically < 0.035)
        isVoiceActive = energy > 0.035;

        // Acoustic syllable burst / rising edge peak detection
        const nowTime = performance.now();
        const timeSinceLastPeak = nowTime - this.lastPeakTime;
        if (energy > 0.06 && energy > this.prevEnergy * 1.25 && timeSinceLastPeak > 120) {
          isPeak = true;
          this.peakCount += 1;
          this.lastPeakTime = nowTime;
        }
        this.prevEnergy = energy;
      } else if (isPlaying) {
        // Fallback if WebAudio Analyser unavailable
        isVoiceActive = true;
        energy = 0.4;
      }

      // Pre-Audio Readiness Gate: audio has actually started emitting sound waves
      const isAudioReady = isPlaying && (currentTime > 0.04 && (energy > 0.02 || currentTime > 0.2));

      this.updateState({
        isPlaying,
        isAudioReady,
        currentTime,
        duration,
        progress,
        text: this.activeText,
        speakerId: this.speakerId,
        audioInstanceId: instanceId,
        energy,
        isVoiceActive,
        isPeak,
        peakCount: this.peakCount,
      });

      if (isPlaying) {
        this.rafId = requestAnimationFrame(tick);
      }
    };

    const handlePlay = () => {
      if (this.currentInstanceId === instanceId) {
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.rafId = requestAnimationFrame(tick);
      }
    };

    const handleEnded = () => {
      if (this.currentInstanceId === instanceId) {
        const duration = audio.duration || 0;
        this.updateState({
          isPlaying: false,
          isAudioReady: true,
          currentTime: duration,
          duration,
          progress: 1.0,
          text: this.activeText,
          speakerId: this.speakerId,
          audioInstanceId: instanceId,
          energy: 0,
          isVoiceActive: false,
          isPeak: false,
          peakCount: this.peakCount,
        });
        if (this.rafId) {
          cancelAnimationFrame(this.rafId);
          this.rafId = null;
        }
      }
    };

    const handleError = () => {
      if (this.currentInstanceId === instanceId) {
        this.updateState({
          isPlaying: false,
          isAudioReady: false,
          currentTime: 0,
          duration: 0,
          progress: 1.0,
          text: this.activeText,
          speakerId: this.speakerId,
          audioInstanceId: instanceId,
          energy: 0,
          isVoiceActive: false,
          isPeak: false,
          peakCount: this.peakCount,
        });
        if (this.rafId) {
          cancelAnimationFrame(this.rafId);
          this.rafId = null;
        }
      }
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('timeupdate', tick);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // Initial tick to publish starting frame (audio not ready yet)
    this.updateState({
      isPlaying: !audio.paused && !audio.ended,
      isAudioReady: false,
      currentTime: audio.currentTime || 0,
      duration: audio.duration && !isNaN(audio.duration) ? audio.duration : 0,
      progress: 0,
      text: this.activeText,
      speakerId: this.speakerId,
      audioInstanceId: instanceId,
      energy: 0,
      isVoiceActive: false,
      isPeak: false,
      peakCount: 0,
    });

    this.rafId = requestAnimationFrame(tick);
  }

  /**
   * Signals that active speech has completed (progress = 1.0, isPlaying = false)
   * and notifies listeners immediately with the speakerId and activeText before detachment.
   */
  public markCompleted(): void {
    if (this.currentInstanceId > 0 && (this.speakerId || this.activeText)) {
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      this.updateState({
        isPlaying: false,
        isAudioReady: true,
        currentTime: this.currentState.duration || 0,
        duration: this.currentState.duration || 0,
        progress: 1.0,
        text: this.activeText,
        speakerId: this.speakerId,
        audioInstanceId: this.currentInstanceId,
        energy: 0,
        isVoiceActive: false,
        isPeak: false,
        peakCount: this.peakCount,
      });
    }
  }

  /**
   * Detaches active audio tracking and resets state
   */
  public detach(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch {
        // Disconnect handled
      }
      this.analyser = null;
    }
    this.dataArray = null;
    this.activeAudio = null;
    this.activeText = '';
    this.speakerId = null;
    this.currentInstanceId = 0;
    this.prevEnergy = 0;
    this.peakCount = 0;
    this.lastPeakTime = 0;

    this.updateState({
      isPlaying: false,
      isAudioReady: false,
      currentTime: 0,
      duration: 0,
      progress: 0,
      text: '',
      speakerId: null,
      audioInstanceId: 0,
      energy: 0,
      isVoiceActive: false,
      isPeak: false,
      peakCount: 0,
    });
  }

  /**
   * Returns current synchronous state snapshot
   */
  public getState(): AudioSyncState {
    return this.currentState;
  }

  /**
   * Subscribe a listener callback to state updates
   */
  public subscribe(listener: AudioSyncListener): () => void {
    this.listeners.add(listener);
    // Immediately emit current state
    listener(this.currentState);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private updateState(nextState: AudioSyncState): void {
    const wasPlaying = this.currentState.isPlaying;
    this.currentState = nextState;
    this.listeners.forEach(listener => {
      try {
        listener(nextState);
      } catch (err) {
        console.warn('[AudioSyncService listener error]:', err);
      }
    });

    if (wasPlaying && !nextState.isPlaying) {
      this.notifyCompletionListeners();
    }
  }

  /**
   * Notifies that the kinetic subtitle animation for the given dialogue text is 100% finished.
   */
  public notifySubtitlesComplete(text: string): void {
    if (!text) return;
    if (this.completedSubtitleText !== text) {
      this.completedSubtitleText = text;
      this.notifyCompletionListeners();
    }
  }

  /**
   * Notifies that a new subtitle animation has started for the given dialogue text.
   */
  public notifySubtitlesStarted(text: string): void {
    if (this.completedSubtitleText === text) {
      this.completedSubtitleText = '';
      this.notifyCompletionListeners();
    }
  }

  /**
   * Checks whether the subtitle animation for the given text has completed 100%.
   */
  public isSubtitlesComplete(text: string): boolean {
    if (!text) return true;
    return this.completedSubtitleText === text;
  }

  /**
   * Notifies that a CCTV pact's complete conversation (proposer whisper + receiver response) is finished.
   */
  public notifyCctvComplete(pactId: string): void {
    if (this.completedCctvPactId !== pactId) {
      this.completedCctvPactId = pactId;
      this.notifyCompletionListeners();
    }
  }

  /**
   * Checks whether the CCTV pact's complete conversation is finished.
   */
  public isCctvComplete(pactId: string): boolean {
    if (!pactId) return true;
    return this.completedCctvPactId === pactId;
  }

  /**
   * Subscribes a listener to completion events (subtitles finish, CCTV finish, audio finish).
   */
  public subscribeCompletion(listener: () => void): () => void {
    this.completionListeners.add(listener);
    return () => {
      this.completionListeners.delete(listener);
    };
  }

  private notifyCompletionListeners(): void {
    this.completionListeners.forEach(listener => {
      try {
        listener();
      } catch (err) {
        console.warn('[AudioSyncService completion listener error]:', err);
      }
    });
  }
}

export const audioSync = new AudioSyncService();
