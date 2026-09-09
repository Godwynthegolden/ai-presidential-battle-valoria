'use client';

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { flushSync } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { Candidate } from '@/types/candidate';
import { 
  GameState, 
  GamePhase, 
  BackroomPact, 
  AttackEvent, 
  CandidateDebateHeat, 
  EliminatedCandidateInfo,
  RoundVoteTally
} from '@/types/game';
import { CANDIDATES, CANDIDATE_MAP } from '@/data/candidates';
import { CandidateRoster } from '@/components/CandidateRoster';
import { DebateArena } from '@/components/DebateArena';
import { BroadcastTimeline } from '@/components/BroadcastTimeline';
import { EventTicker } from '@/components/EventTicker';
import { tokenizeSpeech } from '@/utils/kineticSubtitles';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX, 
  Landmark, 
  ShieldAlert,
  Film
} from 'lucide-react';

export interface TimelineBlock {
  index: number;
  startSec: number;
  endSec: number;
  duration: number;
  pauseAfter?: number;
  speakerId?: string;
  audioFile?: string;
}

interface RenderEvent {
  id: string;
  type: 'campaign_speech' | 'attack' | 'cctv_pact' | 'vote_tally' | 'elimination' | 'final_speech' | 'final_vote' | 'winner' | 'system';
  round?: number;
  speakerId?: string;
  speakerName?: string;
  targetId?: string;
  targetName?: string;
  headline?: string;
  content?: string;
  details?: any;
  timestamp?: number;
}

interface AudioEntry {
  filename: string;
  phase: string;
  round?: number;
  speakerId?: string;
  speakerName?: string;
  targetId?: string;
  textSnippet?: string;
  timestamp?: number;
}

function RenderStageContent() {
  const searchParams = useSearchParams();
  const sessionName = searchParams.get('session') || 'voiceT1';
  const resolution = searchParams.get('res') || '1080p';
  const isHeadlessMode = searchParams.get('headless') === 'true';
  const autoPlayQuery = searchParams.get('autoPlay') === 'true' || isHeadlessMode;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manifest, setManifest] = useState<any>(null);
  const [events, setEvents] = useState<RenderEvent[]>([]);
  const [audioIndex, setAudioIndex] = useState<AudioEntry[]>([]);

  // Playback state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(() => autoPlayQuery);
  const [isSpeakingAudio, setIsSpeakingAudio] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);

  // Stepped deterministic render mode states
  const [timeline, setTimeline] = useState<TimelineBlock[]>([]);
  const [forcedWordCount, setForcedWordCount] = useState<number | undefined>(undefined);
  const [forcedActiveIndex, setForcedActiveIndex] = useState<number | undefined>(undefined);
  const isSteppedModeRef = useRef<boolean>(false);
  const timelineRef = useRef<TimelineBlock[]>([]);
  timelineRef.current = timeline;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Pre-tokenize speech for all events for fast frame-by-frame scrubbing
  const eventTokens = useMemo(() => {
    return events.map(e => e.content ? tokenizeSpeech(e.content) : []);
  }, [events]);

  // Match candidate helper
  const getCandidate = (id?: string): Candidate | undefined => {
    if (!id) return undefined;
    if (CANDIDATE_MAP.has(id)) return CANDIDATE_MAP.get(id);
    if (manifest?.candidates) {
      const match = manifest.candidates.find((c: any) => c.id === id);
      if (match) {
        return {
          id: match.id,
          name: match.name,
          codename: match.codename || match.name,
          archetype: match.archetype || 'populist',
          archetypeTitle: match.titleRole || 'Candidate',
          titleRole: match.titleRole || 'Political Candidate',
          slogan: match.slogan || 'For Valoria!',
          initialBudget: match.initialBudget || 100,
          ideology: 'Centrist',
          personality: 'Diplomatic',
          speakingStyle: 'Formal',
          motivations: 'National leadership',
          strengths: [],
          weaknesses: [],
          behavioralTendencies: [],
          rivalArchetypes: [],
          color: {
            primary: '#06b6d4',
            bg: 'bg-cyan-950/40',
            border: 'border-cyan-500/40',
            text: 'text-cyan-300',
            glow: 'rgba(6, 182, 212, 0.4)',
            gradient: 'from-cyan-900/60 to-slate-900',
          },
          avatar: {
            icon: 'Landmark',
            svgType: 'landmark',
          },
          systemPrompt: '',
        };
      }
    }
    return undefined;
  };

  // Full Candidate Roster
  const candidatesList = useMemo<Candidate[]>(() => {
    if (manifest?.candidates && manifest.candidates.length > 0) {
      return manifest.candidates.map((mc: any) => getCandidate(mc.id) || {
        id: mc.id,
        name: mc.name,
        codename: mc.codename || mc.name,
        archetype: mc.archetype || 'populist',
        archetypeTitle: mc.titleRole || 'Candidate',
        titleRole: mc.titleRole || 'Political Candidate',
        slogan: mc.slogan || 'For Valoria!',
        initialBudget: mc.initialBudget || 100,
        ideology: 'Centrist',
        personality: 'Diplomatic',
        speakingStyle: 'Formal',
        motivations: 'National leadership',
        strengths: [],
        weaknesses: [],
        behavioralTendencies: [],
        rivalArchetypes: [],
        color: {
          primary: '#06b6d4',
          bg: 'bg-cyan-950/40',
          border: 'border-cyan-500/40',
          text: 'text-cyan-300',
          glow: 'rgba(6, 182, 212, 0.4)',
          gradient: 'from-cyan-900/60 to-slate-900',
        },
        avatar: {
          icon: 'Landmark',
          svgType: 'landmark',
        },
        systemPrompt: '',
      });
    }
    return CANDIDATES;
  }, [manifest]);

  // Load Session Data
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/save-game?sessionName=${encodeURIComponent(sessionName)}`);
        if (!res.ok) {
          throw new Error(`Session "${sessionName}" not found or failed to load.`);
        }
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to parse session.');
        }

        setManifest(data.manifest);
        setEvents(data.events || []);
        setAudioIndex(data.audioIndex || []);
        setCurrentIndex(0);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Error loading session data');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [sessionName]);

  const currentEvent = events[currentIndex];

  // Match Audio Entry for Current Event with phase-aware precision
  const currentAudioEntry = useMemo(() => {
    if (!currentEvent) return undefined;

    // 1. Direct filename matching if available in audioIndex
    if (currentEvent.type === 'campaign_speech') {
      const match = audioIndex.find(a => 
        a.filename.startsWith('01_campaign_') && 
        (a.speakerId === currentEvent.speakerId || a.filename.includes(currentEvent.speakerId || ''))
      );
      if (match) return match;
    } else if (currentEvent.type === 'attack') {
      const match = audioIndex.find(a => 
        a.filename.includes('_attack_') && 
        a.round === (currentEvent.round || 1) &&
        (a.speakerId === currentEvent.speakerId || a.filename.includes(currentEvent.speakerId || '')) &&
        (!currentEvent.targetId || a.targetId === currentEvent.targetId || a.filename.includes(currentEvent.targetId))
      );
      if (match) return match;
    } else if (currentEvent.type === 'cctv_pact') {
      const match = audioIndex.find(a => 
        a.filename.includes('_cctv_') && 
        a.round === (currentEvent.round || 1) &&
        (a.speakerId === currentEvent.speakerId || a.filename.includes(currentEvent.speakerId || ''))
      );
      if (match) return match;
    } else if (currentEvent.type === 'elimination') {
      const match = audioIndex.find(a => 
        a.filename.includes('_elimination_') && 
        (a.speakerId === currentEvent.speakerId || a.filename.includes(currentEvent.speakerId || ''))
      );
      if (match) return match;
    } else if (currentEvent.type === 'final_speech') {
      const match = audioIndex.find(a => 
        a.filename.includes('_final_speech_') && 
        (a.speakerId === currentEvent.speakerId || a.filename.includes(currentEvent.speakerId || ''))
      );
      if (match) return match;
    } else if (currentEvent.type === 'winner') {
      const match = audioIndex.find(a => 
        (a.filename.includes('inauguration') || a.filename.includes('winner')) && 
        (a.speakerId === currentEvent.speakerId || a.filename.includes(currentEvent.speakerId || ''))
      );
      if (match) return match;
    }

    // Fallback: match by speakerId and round
    return audioIndex.find(a => 
      a.speakerId === currentEvent.speakerId && 
      (a.round === currentEvent.round || !a.round)
    );
  }, [currentEvent, audioIndex]);

  // Play audio file in interactive mode
  useEffect(() => {
    if (isSteppedModeRef.current) return;
    if (!currentAudioEntry || !audioRef.current) return;

    const audioUrl = `/api/save-game?sessionName=${encodeURIComponent(sessionName)}&audioFile=${encodeURIComponent(currentAudioEntry.filename)}`;
    audioRef.current.src = audioUrl;

    if (isPlaying) {
      audioRef.current.play().then(() => {
        setIsSpeakingAudio(true);
      }).catch(() => {
        setIsSpeakingAudio(false);
      });
    }
  }, [currentAudioEntry, sessionName, isPlaying]);

  const handleAudioEnded = () => {
    setIsSpeakingAudio(false);
    setAudioProgress(100);

    if (isPlaying) {
      if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
      nextTimerRef.current = setTimeout(() => {
        handleNext();
      }, 1500);
    }
  };

  const handleAudioTimeUpdate = () => {
    if (!audioRef.current) return;
    const { currentTime: cur, duration: dur } = audioRef.current;
    if (dur && dur > 0) {
      setAudioProgress((cur / dur) * 100);
    }
  };

  const handleNext = () => {
    if (currentIndex < events.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsPlaying(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Build authentic GameState up to currentIndex
  const currentGameState = useMemo<GameState>(() => {
    const participatingCandidateIds = candidatesList.map(c => c.id);
    let activeCandidateIds = [...participatingCandidateIds];
    const candidateBudgets: Record<string, number> = {};
    candidatesList.forEach(c => {
      candidateBudgets[c.id] = typeof c.initialBudget === 'number' ? c.initialBudget : 100;
    });

    const campaignSpeeches: Record<string, string> = {};
    const finalSpeeches: Record<string, string> = {};
    const attacksByRound: Record<number, AttackEvent[]> = {};
    const debateHeatByRound: Record<number, Record<string, CandidateDebateHeat>> = {};
    const pactsByRound: Record<number, BackroomPact[]> = {};
    const votesByRound: Record<number, RoundVoteTally> = {};
    const eliminatedCandidates: EliminatedCandidateInfo[] = [];
    let winnerId: string | null = null;
    let victorySpeech: string | null = null;

    const tickerLog: Array<{
      id: string;
      type: 'speech' | 'attack' | 'pact' | 'vote' | 'betrayal' | 'elimination' | 'bribe' | 'bailout' | 'system' | 'winner';
      message: string;
      timestamp: number;
    }> = [];

    // Replay history up to currentIndex
    for (let i = 0; i <= currentIndex && i < events.length; i++) {
      const evt = events[i];
      const r = evt.round || 1;

      if (evt.type === 'campaign_speech' && evt.speakerId) {
        campaignSpeeches[evt.speakerId] = evt.content || '';
        tickerLog.unshift({
          id: evt.id,
          type: 'speech',
          message: `${evt.speakerName || evt.speakerId}: "${(evt.content || '').slice(0, 70)}..."`,
          timestamp: evt.timestamp || Date.now() - (events.length - i) * 1000,
        });
      } else if (evt.type === 'attack' && evt.speakerId && evt.targetId) {
        if (!attacksByRound[r]) attacksByRound[r] = [];
        const attackItem: AttackEvent = {
          id: evt.id,
          round: r,
          attackerId: evt.speakerId,
          targetId: evt.targetId,
          text: evt.content || '',
          isRebuttal: evt.details?.isRebuttal,
          rebuttalAgainstId: evt.details?.rebuttalAgainstId,
          voteCallTargetId: evt.details?.voteCallTargetId,
          timestamp: evt.timestamp || Date.now(),
        };
        attacksByRound[r].push(attackItem);

        if (!debateHeatByRound[r]) debateHeatByRound[r] = {};
        if (!debateHeatByRound[r][evt.targetId]) {
          debateHeatByRound[r][evt.targetId] = {
            candidateId: evt.targetId,
            heatScore: 0,
            accusers: [],
            rebuttalCount: 0,
            voteCallsAgainst: [],
            accusationQuotes: [],
          };
        }
        debateHeatByRound[r][evt.targetId].heatScore += 1;
        debateHeatByRound[r][evt.targetId].accusers.push(evt.speakerId);

        tickerLog.unshift({
          id: evt.id,
          type: 'attack',
          message: `${evt.speakerName || evt.speakerId} clashed with ${evt.targetName || evt.targetId}`,
          timestamp: evt.timestamp || Date.now() - (events.length - i) * 1000,
        });
      } else if (evt.type === 'cctv_pact') {
        if (!pactsByRound[r]) pactsByRound[r] = [];
        const pactItem: BackroomPact = {
          id: evt.id,
          round: r,
          proposerId: evt.speakerId || '',
          receiverId: evt.targetId || '',
          actionType: evt.details?.actionType || 'bribe',
          agreedTargetId: evt.details?.agreedTargetId || evt.details?.agreedTargetName || '',
          whisperText: evt.content || evt.details?.whisperText || '',
          receiverResponse: evt.details?.receiverResponse || '',
          privateStrategy: evt.details?.privateStrategy || '',
          location: evt.details?.location || 'Capitol Corridor',
          bribeOffered: evt.details?.bribeOffered,
          bribeAmount: evt.details?.bribeAmount || 30,
          upfrontPaid: evt.details?.upfrontPaid || 15,
          escrowPending: evt.details?.escrowPending || 15,
          receiverDecision: evt.details?.receiverDecision || 'accept',
          bribeAccepted: evt.details?.bribeAccepted || true,
          timestamp: evt.timestamp || Date.now(),
        };
        pactsByRound[r].push(pactItem);

        if (evt.details?.bribeOffered && (evt.details?.receiverDecision === 'accept' || evt.details?.receiverDecision === 'accept_and_betray')) {
          const upfront = evt.details?.upfrontPaid || 15;
          if (evt.speakerId) candidateBudgets[evt.speakerId] = Math.max(0, (candidateBudgets[evt.speakerId] ?? 100) - upfront);
          if (evt.targetId) candidateBudgets[evt.targetId] = (candidateBudgets[evt.targetId] ?? 100) + upfront;
          tickerLog.unshift({
            id: evt.id,
            type: 'bribe',
            message: `${evt.speakerName} transferred $${upfront} upfront bribe to ${evt.targetName}`,
            timestamp: evt.timestamp || Date.now() - (events.length - i) * 1000,
          });
        }
      } else if (evt.type === 'vote_tally') {
        if (evt.details) {
          votesByRound[r] = evt.details;
          if (Array.isArray(evt.details.bailoutTransactions)) {
            evt.details.bailoutTransactions.forEach((b: any) => {
              if (b.candidateId && typeof b.remainingBudget === 'number') {
                candidateBudgets[b.candidateId] = b.remainingBudget;
              }
            });
          }
          if (evt.details.eliminatedId) {
            activeCandidateIds = activeCandidateIds.filter(id => id !== evt.details.eliminatedId);
            eliminatedCandidates.push({
              candidateId: evt.details.eliminatedId,
              eliminatedInRound: r,
              voteCount: evt.details.finalVoteCount || 0,
              exitWords: '',
            });
            tickerLog.unshift({
              id: evt.id,
              type: 'elimination',
              message: `${evt.details.eliminatedName || evt.details.eliminatedId} eliminated with ${evt.details.finalVoteCount || 0} votes`,
              timestamp: evt.timestamp || Date.now() - (events.length - i) * 1000,
            });
          }
        }
      } else if (evt.type === 'elimination' && evt.speakerId) {
        const existing = eliminatedCandidates.find(e => e.candidateId === evt.speakerId);
        if (existing) {
          existing.exitWords = evt.content || '';
        } else {
          activeCandidateIds = activeCandidateIds.filter(id => id !== evt.speakerId);
          eliminatedCandidates.push({
            candidateId: evt.speakerId,
            eliminatedInRound: r,
            voteCount: evt.details?.voteCount || 0,
            exitWords: evt.content || '',
          });
        }
        tickerLog.unshift({
          id: evt.id,
          type: 'elimination',
          message: `${evt.speakerName || evt.speakerId} concession: "${(evt.content || '').slice(0, 60)}..."`,
          timestamp: evt.timestamp || Date.now() - (events.length - i) * 1000,
        });
      } else if (evt.type === 'final_speech' && evt.speakerId) {
        finalSpeeches[evt.speakerId] = evt.content || '';
      } else if (evt.type === 'winner' && evt.speakerId) {
        winnerId = evt.speakerId;
        victorySpeech = evt.content || null;
        tickerLog.unshift({
          id: evt.id,
          type: 'winner',
          message: `President ${evt.speakerName || evt.speakerId} officially elected!`,
          timestamp: evt.timestamp || Date.now() - (events.length - i) * 1000,
        });
      }
    }

    // Determine current phase and stage
    let currentPhase: GamePhase = 'CAMPAIGN';
    const evt = currentEvent || events[0];
    if (evt) {
      if (evt.type === 'campaign_speech') currentPhase = 'CAMPAIGN';
      else if (evt.type === 'attack') currentPhase = 'ATTACK';
      else if (evt.type === 'cctv_pact') currentPhase = 'CCTV_BACKROOM';
      else if (evt.type === 'vote_tally') currentPhase = 'VOTE_REVEAL';
      else if (evt.type === 'elimination') currentPhase = 'ELIMINATION';
      else if (evt.type === 'final_speech') currentPhase = 'FINAL_SPEECHES';
      else if (evt.type === 'final_vote') currentPhase = 'FINAL_REVEAL';
      else if (evt.type === 'winner') currentPhase = 'WINNER';
    }

    const currentRound = evt?.round || 1;
    let speakerIndex = 0;
    if (currentPhase === 'CCTV_BACKROOM') {
      const pacts = pactsByRound[currentRound] || [];
      speakerIndex = Math.max(0, pacts.length - 1);
    }

    return {
      phase: currentPhase,
      round: currentRound,
      participatingCandidateIds,
      activeCandidateIds,
      eliminatedCandidates,
      candidateBudgets,
      currentSpeakerIndex: speakerIndex,
      electionTopic: manifest?.topic || 'National Presidential Election Debate',
      campaignSpeeches,
      finalSpeeches,
      attacksByRound,
      debateHeatByRound,
      pactsByRound,
      votesByRound,
      finalVoteTally: null,
      victorySpeech,
      winnerId,
      stage: {
        speakerId: evt?.speakerId || null,
        targetId: evt?.targetId || null,
        actionType: evt?.type === 'campaign_speech' ? 'speech' :
                    evt?.type === 'attack' ? 'attack' :
                    evt?.type === 'cctv_pact' ? 'pact' :
                    evt?.type === 'vote_tally' ? 'vote' :
                    evt?.type === 'elimination' ? 'eliminated' :
                    evt?.type === 'winner' ? 'winner' : 'speech',
        headline: evt?.headline || (
          evt?.type === 'campaign_speech' ? `Round ${currentRound}: Campaign Address` :
          evt?.type === 'attack' ? `Round ${currentRound} Clash: ${evt.speakerName || 'Contender'} vs ${evt.targetName || 'Rival'}` :
          evt?.type === 'cctv_pact' ? `Round ${currentRound} CCTV Surveillance Feed` :
          evt?.type === 'vote_tally' ? `Round ${currentRound} Secret Ballots & Bailouts` :
          evt?.type === 'elimination' ? `Round ${currentRound} Concession Address` :
          evt?.type === 'winner' ? `Presidential Inauguration Address` : 'Republic of Valoria Live Feed'
        ),
        content: evt?.content || evt?.details?.whisperText || '',
        isLoading: false,
        isRevealingVotes: evt?.type === 'vote_tally',
        revealedVoteIndex: evt?.type === 'vote_tally' ? (evt.details?.votes?.length || 0) : 0,
        error: null,
      },
      playback: {
        autoPlay: isPlaying,
        speed: 'normal',
        soundEnabled: !isMuted,
        isPaused: !isPlaying,
      },
      tickerLog,
    };
  }, [events, currentIndex, candidatesList, manifest, currentEvent, isPlaying, isMuted]);

  // Deterministic Stepper Interface for Headless Chromium / FFmpeg Engine
  useEffect(() => {
    const controller = {
      setTimeline: (blocks: TimelineBlock[]) => {
        isSteppedModeRef.current = true;
        setTimeline(blocks);
      },
      seekTime: async (targetSeconds: number) => {
        isSteppedModeRef.current = true;
        const currentBlocks = timelineRef.current;
        if (!currentBlocks || currentBlocks.length === 0) return;

        let activeIdx = 0;
        let inPauseAfter = false;
        let beforeStart = false;

        const firstBlock = currentBlocks[0];
        if (targetSeconds < firstBlock.startSec) {
          beforeStart = true;
          activeIdx = 0;
        } else {
          for (let i = 0; i < currentBlocks.length; i++) {
            const block = currentBlocks[i];
            const speechEnd = block.startSec + block.duration;
            const blockEnd = block.endSec;

            if (targetSeconds >= block.startSec && targetSeconds <= blockEnd) {
              activeIdx = block.index;
              if (targetSeconds > speechEnd) {
                inPauseAfter = true;
              }
              break;
            }
            if (i === currentBlocks.length - 1 && targetSeconds > blockEnd) {
              activeIdx = block.index;
              inPauseAfter = true;
            }
          }
        }

        const block = currentBlocks.find(b => b.index === activeIdx) || firstBlock;

        flushSync(() => {
          setCurrentIndex(activeIdx);

          if (beforeStart) {
            setIsSpeakingAudio(false);
            setAudioProgress(0);
            setForcedWordCount(0);
            setForcedActiveIndex(-1);
          } else if (inPauseAfter) {
            setIsSpeakingAudio(false);
            setAudioProgress(100);
            const tokens = eventTokens[activeIdx] || [];
            setForcedWordCount(tokens.length);
            setForcedActiveIndex(-1);
          } else {
            const elapsed = targetSeconds - block.startSec;
            const progress = Math.min(1, Math.max(0, elapsed / block.duration));
            const isSpeaking = progress < 0.98;
            setIsSpeakingAudio(isSpeaking);
            setAudioProgress(progress * 100);
            const tokens = eventTokens[activeIdx] || [];
            if (tokens.length > 0) {
              const count = Math.min(tokens.length, Math.floor(tokens.length * progress));
              setForcedWordCount(count);
              setForcedActiveIndex(isSpeaking && count > 0 ? count - 1 : -1);
            } else {
              setForcedWordCount(undefined);
              setForcedActiveIndex(undefined);
            }
          }
        });

        // Double RAF ensures browser compositor has flushed layout & paint
        await new Promise<void>(resolve => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              resolve();
            });
          });
        });
      },
      play: () => {
        setIsPlaying(true);
        if (audioRef.current) audioRef.current.play().catch(() => {});
      },
      pause: () => {
        setIsPlaying(false);
        if (audioRef.current) audioRef.current.pause();
      },
      seekEvent: (index: number) => {
        if (index >= 0 && index < events.length) {
          setCurrentIndex(index);
        }
      },
      next: handleNext,
      prev: handlePrev,
    };

    (window as any).__MASTER_SEEK__ = controller;
    (window as any).__RENDER_CONTROLLER__ = controller;
    (window as any).__RENDER_READY__ = !loading && events.length > 0;
  }, [loading, events, currentIndex, isPlaying, isSpeakingAudio, currentAudioEntry, eventTokens]);

  if (loading) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#050811] text-cyan-400 font-mono gap-4">
        <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
        <p className="text-sm tracking-widest uppercase">Initializing Master Render Engine: {sessionName}...</p>
      </div>
    );
  }

  if (error || !currentEvent) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#050811] text-red-400 font-mono p-6 text-center">
        <ShieldAlert className="w-12 h-12 text-red-500 mb-3" />
        <h2 className="text-xl font-bold">Failed to Load Session Data</h2>
        <p className="text-slate-400 text-sm mt-2">{error || 'No debate events found.'}</p>
      </div>
    );
  }

  // Aspect ratio container constraints
  const containerClass = resolution === 'shorts'
    ? 'w-[540px] h-[960px] max-w-full'
    : 'w-[1920px] h-[1080px] max-w-full max-h-full';

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#03060f] flex items-center justify-center select-none">
      {/* Hidden Audio Player for Internal Audio Mixing */}
      <audio 
        ref={audioRef}
        muted={isMuted}
        onEnded={handleAudioEnded}
        onTimeUpdate={handleAudioTimeUpdate}
        onError={() => setIsSpeakingAudio(false)}
      />

      {/* Production Stage Frame - 100% Matching Authentic Application Layout */}
      <div className={`relative ${containerClass} flex flex-col bg-[#07090e] cyber-grid border border-cyan-950/40 shadow-2xl overflow-hidden font-sans`}>
        {/* Dynamic Ambient Background Glow */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Top Studio Broadcast Bar */}
        <header className="px-4 md:px-6 py-2.5 bg-[#06080d]/95 border-b border-slate-750 backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center p-2 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-700 shadow-lg shadow-cyan-500/25">
              <Landmark className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-display font-black tracking-wider text-white uppercase flex items-center gap-2">
                  Republic of Valoria <span className="text-cyan-400 font-normal">Presidential Battle</span>
                </h1>
                <span className="text-[10px] font-mono font-bold px-2 py-0.2 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
                  9router Live AI
                </span>
                <span className="px-2 py-0.2 rounded text-[10px] font-bold font-mono uppercase bg-red-600/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  Master Feed
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono truncate max-w-2xl">
                {manifest?.topic || 'National Presidential Election Debate'}
              </p>
            </div>
          </div>

          {/* Phase, Round, and Event Badges */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0b0f19] border border-slate-750">
              <span className="text-slate-400">PHASE:</span>
              <span className="font-bold text-cyan-300 uppercase">{currentGameState.phase.replace('_', ' ')}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0b0f19] border border-slate-750">
              <span className="text-slate-400">ROUND:</span>
              <span className="font-black text-amber-300">{currentGameState.round}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0b0f19] border border-slate-750">
              <span className="text-slate-400">EVENT:</span>
              <span className="font-bold text-white">{currentIndex + 1}</span>
              <span className="text-slate-500">/</span>
              <span className="text-slate-400">{events.length}</span>
            </div>
          </div>
        </header>

        {/* Main Broadcast Studio Workspace */}
        <div className={`flex-1 flex flex-col ${currentGameState.phase === 'CCTV_BACKROOM' ? 'p-1 sm:p-2 max-w-none w-full' : 'p-3 md:p-4 gap-3 max-w-[1840px] w-full mx-auto'} h-full min-h-0 overflow-hidden`}>
          {currentGameState.phase === 'CCTV_BACKROOM' ? (
            /* Fullscreen CCTV Surveillance Feed */
            <div className="flex-1 w-full h-full min-h-0 flex flex-col overflow-hidden animate-fade-in">
              <DebateArena
                gameState={currentGameState}
                onRetry={() => {}}
                onRestart={() => {}}
                onNextStep={handleNext}
                isSpeakingAudio={isSpeakingAudio}
                forcedRevealedCount={forcedWordCount}
                forcedActiveIndex={forcedActiveIndex}
              />
            </div>
          ) : (
            /* Authentic 3-Column Studio Grid */
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 xl:gap-6 2xl:gap-7 h-full min-h-0 overflow-hidden">
              {/* Left Column: Candidate Roster (3 Cols) */}
              <div className="lg:col-span-3 h-full min-h-0 flex flex-col overflow-hidden">
                <CandidateRoster
                  gameState={currentGameState}
                  candidates={candidatesList}
                  onSelectCandidate={() => {}}
                />
              </div>

              {/* Center Column: Live Debate Arena (6 Cols) */}
              <div className="lg:col-span-6 h-full min-h-0 flex flex-col overflow-hidden">
                <DebateArena
                  gameState={currentGameState}
                  onRetry={() => {}}
                  onRestart={() => {}}
                  onNextStep={handleNext}
                  isSpeakingAudio={isSpeakingAudio}
                  forcedRevealedCount={forcedWordCount}
                  forcedActiveIndex={forcedActiveIndex}
                />
              </div>

              {/* Right Column: Live Broadcast Timeline (3 Cols) */}
              <div className="lg:col-span-3 h-full min-h-0 flex flex-col overflow-hidden">
                <BroadcastTimeline
                  gameState={currentGameState}
                  onSelectCandidate={() => {}}
                />
              </div>
            </div>
          )}

          {/* Bottom Live Wire Event Ticker */}
          <div className="shrink-0">
            <EventTicker
              gameState={currentGameState}
              onOpenTranscript={() => {}}
            />
          </div>
        </div>

        {/* Floating Master Control Deck (Visible only in interactive browser preview, auto-hidden in headless recording) */}
        {!isHeadlessMode && (
          <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-50 bg-[#060913]/95 border border-cyan-500/40 px-5 py-2 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-4 transition hover:opacity-100 opacity-40">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-200 hover:text-white disabled:opacity-30 cursor-pointer"
              title="Previous Event"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPlaying(p => !p)}
              className="p-2 rounded-xl bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-bold cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <button
              onClick={handleNext}
              disabled={currentIndex === events.length - 1}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-200 hover:text-white disabled:opacity-30 cursor-pointer"
              title="Next Event"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-slate-700" />

            <button
              onClick={() => setIsMuted(m => !m)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-200 hover:text-white cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>

            <span className="text-xs font-mono text-cyan-300 font-bold">
              {currentIndex + 1} / {events.length}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RenderStagePage() {
  return (
    <Suspense fallback={
      <div className="w-screen h-screen flex items-center justify-center bg-[#050811] text-cyan-400 font-mono">
        Loading Replay Stage...
      </div>
    }>
      <RenderStageContent />
    </Suspense>
  );
}
