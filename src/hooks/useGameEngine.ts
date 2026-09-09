'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  GameState, 
  GamePhase, 
  LLMRequestPayload, 
  RoundVoteTally, 
  VoteRecord, 
  AttackEvent, 
  CandidateDebateHeat,
  BackroomPact, 
  BailoutTransaction,
  EscrowContract,
  StageActionType, 
  StepDescriptor,
  EliminatedCandidateInfo
} from '@/types/game';
import { Candidate } from '@/types/candidate';
import { 
  CANDIDATES, 
  CANDIDATE_MAP, 
  DEFAULT_CANDIDATES, 
  VALORIA_DEBATE_TOPICS,
  getRandomDebateTopic,
  getStoredCandidates, 
  saveStoredCandidates, 
  resetStoredCandidates,
  getStoredSelectedCandidateIds,
  saveStoredSelectedCandidateIds 
} from '@/data/candidates';
import { sounds } from '@/utils/audio';
import { audioSync } from '@/utils/audioSync';
import { NineRouterConfigState } from '@/components/NineRouterSettingsModal';

const LOCATIONS = [
  'Capitol Cloakroom Cam 04',
  'Sub-Basement Boiler Room',
  'Executive VIP Skybox',
  'Service Elevator B',
  'Underground Parking Cam 09',
  'West Wing Corridor 3',
];

export interface PreparedStep {
  stepKey: string;
  phase: GamePhase;
  round: number;
  speakerId: string | null;
  targetId: string | null;
  actionType: StageActionType;
  headline: string;
  content: string;
  audioBlobUrl: string | null;
  receiverAudioBlobUrl?: string | null;
  audioBlob: Blob | null;
  isReady: boolean;
  error?: string | null;
  payload?: any;
}

export function resolveAttackTarget(
  attackerId: string,
  activeCandidateIds: string[],
  history: {
    attacksByRound: Record<number, AttackEvent[]>;
    pactsByRound: Record<number, BackroomPact[]>;
    votesByRound: Record<number, RoundVoteTally>;
    round: number;
    candidateBudgets?: Record<string, number>;
  }
): string {
  const possibleTargets = activeCandidateIds.filter(id => id !== attackerId);
  if (possibleTargets.length === 0) return '';
  if (possibleTargets.length === 1) return possibleTargets[0];

  const attacker = CANDIDATE_MAP.get(attackerId);

  // 1. Prioritize surviving bribe betrayers:
  // If another candidate took a bribe from attackerId and wasBetrayedByReceiver, target them first!
  for (let r = 1; r <= history.round; r++) {
    const pacts = history.pactsByRound[r] || [];
    for (const p of pacts) {
      if (p.proposerId === attackerId && p.wasBetrayedByReceiver && possibleTargets.includes(p.receiverId)) {
        return p.receiverId;
      }
      if (p.receiverId === attackerId && p.wasBetrayedByProposer && possibleTargets.includes(p.proposerId)) {
        return p.proposerId;
      }
    }
  }

  // 2. Retaliation: Whoever attacked this candidate in this round (immediate counter-rebuttal)
  const recentAttacksThisRound = history.attacksByRound[history.round] || [];
  const retaliationTarget = recentAttacksThisRound.find(a => a.targetId === attackerId)?.attackerId;
  if (retaliationTarget && possibleTargets.includes(retaliationTarget)) {
    return retaliationTarget;
  }

  // 3. Ideological Rival Archetypes (High-Stakes Political Drama!)
  if (attacker) {
    const rivalTarget = possibleTargets.find(id => {
      const c = CANDIDATE_MAP.get(id);
      return c && attacker.rivalArchetypes.includes(c.archetype);
    });
    if (rivalTarget) return rivalTarget;
  }

  // 4. Default to first possible target
  return possibleTargets[0];
}

export function resolveBailoutAuction(
  initialTally: Record<string, number>,
  initialBudgets: Record<string, number>,
  activeCandidateIds: string[],
  round: number
): {
  finalTally: Record<string, number>;
  finalBudgets: Record<string, number>;
  transactions: BailoutTransaction[];
  eliminatedId: string;
  tieBreakerOccurred: boolean;
} {
  const currentTally = { ...initialTally };
  const currentBudgets = { ...initialBudgets };
  const transactions: BailoutTransaction[] = [];
  let tieBreakerOccurred = false;

  // Maximum iteration safety guard (avoids infinite loops)
  let safetyLoop = 0;
  while (safetyLoop < 100) {
    safetyLoop++;

    const activeEntries = Object.entries(currentTally).filter(([id]) => activeCandidateIds.includes(id));
    if (activeEntries.length === 0) break;

    const maxVotes = Math.max(...activeEntries.map(([, count]) => count));

    // If all active candidates are down to 0 votes: zero-vote standstill!
    if (maxVotes === 0) {
      // Standstill tiebreaker: eliminate candidate with lowest remaining budget
      const sortedByBudget = [...activeEntries].sort((a, b) => (currentBudgets[a[0]] ?? 0) - (currentBudgets[b[0]] ?? 0));
      const lowestBudgetCandId = sortedByBudget[0][0];
      tieBreakerOccurred = true;
      return {
        finalTally: currentTally,
        finalBudgets: currentBudgets,
        transactions,
        eliminatedId: lowestBudgetCandId,
        tieBreakerOccurred,
      };
    }

    // Identify contenders tied for maxVotes
    const topCandidates = activeEntries.filter(([, count]) => count === maxVotes);

    // Pick top candidate with highest budget to evaluate buyout first
    const [topCandId, topCount] = topCandidates.sort((a, b) => (currentBudgets[b[0]] ?? 0) - (currentBudgets[a[0]] ?? 0))[0];
    const topBudget = currentBudgets[topCandId] ?? 0;

    if (topBudget >= 40 && topCount > 0) {
      // Candidate pays $40 to remove 1 vote
      currentBudgets[topCandId] -= 40;
      currentTally[topCandId] -= 1;

      transactions.push({
        id: `bailout-r${round}-${transactions.length + 1}-${topCandId}`,
        candidateId: topCandId,
        round,
        cost: 40,
        votesRemoved: 1,
        initialVotes: topCount,
        remainingVotes: currentTally[topCandId],
        remainingBudget: currentBudgets[topCandId],
        timestamp: Date.now(),
      });
      // Re-evaluate in next loop iteration
      continue;
    } else {
      // Top candidate has < $40 and still has the highest votes -> eliminated!
      if (topCandidates.length > 1) {
        tieBreakerOccurred = true;
        const elimCandidate = topCandidates.sort((a, b) => (currentBudgets[a[0]] ?? 0) - (currentBudgets[b[0]] ?? 0))[0][0];
        return {
          finalTally: currentTally,
          finalBudgets: currentBudgets,
          transactions,
          eliminatedId: elimCandidate,
          tieBreakerOccurred,
        };
      }

      return {
        finalTally: currentTally,
        finalBudgets: currentBudgets,
        transactions,
        eliminatedId: topCandId,
        tieBreakerOccurred,
      };
    }
  }

  // Fallback if loop ends
  return {
    finalTally: currentTally,
    finalBudgets: currentBudgets,
    transactions,
    eliminatedId: activeCandidateIds[0],
    tieBreakerOccurred: true,
  };
}

const DEFAULT_TOPIC = `${VALORIA_DEBATE_TOPICS[0].title}: ${VALORIA_DEBATE_TOPICS[0].crisisSummary}`;

const CREATE_INITIAL_STATE = (selectedIds: string[] = [], topic: string = DEFAULT_TOPIC): GameState => {
  const candidateBudgets: Record<string, number> = {};
  selectedIds.forEach(id => {
    const c = CANDIDATE_MAP.get(id);
    candidateBudgets[id] = typeof c?.initialBudget === 'number' ? c.initialBudget : 100;
  });

  return {
    phase: 'IDLE',
    round: 1,
    electionTopic: topic,
    participatingCandidateIds: [...selectedIds],
    activeCandidateIds: [...selectedIds],
    eliminatedCandidates: [],
    candidateBudgets,
    currentSpeakerIndex: 0,
    campaignSpeeches: {},
    finalSpeeches: {},
    attacksByRound: {},
    pactsByRound: {},
    votesByRound: {},
    finalVoteTally: null,
    victorySpeech: null,
    winnerId: null,
    stage: {
      speakerId: null,
      targetId: null,
      actionType: 'idle',
      headline: 'REPUBLIC OF VALORIA PRESIDENTIAL ELECTION',
      content: `${selectedIds.length} political candidates are registered for the presidential debate. Select your candidate lineup and press Start Election to begin the Campaign Phase.`,
      isLoading: false,
      isRevealingVotes: false,
      revealedVoteIndex: 0,
      error: null,
    },
    playback: {
      autoPlay: false,
      speed: 'normal',
      soundEnabled: true,
      isPaused: false,
    },
    tickerLog: [
      {
        id: 'init-1',
        type: 'system',
        message: `National Election Commission: ${selectedIds.length} candidates registered with campaign funds. National Crisis: "${topic.slice(0, 100)}..."`,
        timestamp: Date.now(),
      }
    ],
  };
};

export function useGameEngine(
  nineRouterConfig?: NineRouterConfigState,
  onRequireConfig?: () => void
) {
  // Dynamic candidates state with localStorage sync
  const [candidates, setCandidates] = useState<Candidate[]>(() => {
    const stored = getStoredCandidates();
    stored.forEach(c => CANDIDATE_MAP.set(c.id, c));
    return stored;
  });

  const [state, setState] = useState<GameState>(() => {
    const stored = getStoredCandidates();
    const candidateIds = stored.map(c => c.id);
    const selectedIds = getStoredSelectedCandidateIds(candidateIds);
    return CREATE_INITIAL_STATE(selectedIds);
  });

  const isExecutingStep = useRef(false);
  const autoPlayTimer = useRef<NodeJS.Timeout | null>(null);
  const [completionTick, setCompletionTick] = useState<number>(0);

  // Keep config in ref so state callbacks always have latest
  const configRef = useRef<NineRouterConfigState | undefined>(nineRouterConfig);
  useEffect(() => {
    configRef.current = nineRouterConfig;
    if (nineRouterConfig?.autoNextMode && !state.playback.autoPlay && state.phase !== 'WINNER' && state.phase !== 'IDLE') {
      setState(prev => ({
        ...prev,
        playback: { ...prev.playback, autoPlay: true }
      }));
    }
  }, [nineRouterConfig, state.phase]);

  // Listen for audio and subtitle completion events from AudioSyncService
  useEffect(() => {
    const unsubscribe = audioSync.subscribeCompletion(() => {
      setCompletionTick(prev => prev + 1);
    });
    return () => unsubscribe();
  }, []);

  // Sync sound manager enabled state and dialogue-only (SFX muted) state
  useEffect(() => {
    sounds.enabled = state.playback.soundEnabled;
    sounds.sfxMuted = Boolean(nineRouterConfig?.dialogueOnlyAudio);
  }, [state.playback.soundEnabled, nineRouterConfig?.dialogueOnlyAudio]);

  // TTS Speech Synthesis Player Controller
  const [isSpeakingAudio, setIsSpeakingAudio] = useState(false);
  const activeTtsAudioRef = useRef<HTMLAudioElement | null>(null);

  // Saved Games Archival & Live Recording State
  const [activeSessionSaveName, setActiveSessionSaveName] = useState<string>('');
  const sessionSaveNameRef = useRef<string>('');

  const recordSessionEvent = useCallback((eventData: any) => {
    const currentSession = sessionSaveNameRef.current;
    if (!currentSession) return;
    fetch('/api/save-game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_event',
        sessionName: currentSession,
        eventData,
      }),
    }).catch(err => console.warn('[Session Save Event Error]:', err));
  }, []);

  const recordSessionAudio = useCallback((filename: string, audioBlob: Blob | null, metadata?: any) => {
    const currentSession = sessionSaveNameRef.current;
    if (!currentSession || !audioBlob) return;
    const formData = new FormData();
    formData.append('sessionName', currentSession);
    formData.append('filename', filename);
    formData.append('file', audioBlob, filename.endsWith('.mp3') ? filename : `${filename}.mp3`);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }
    fetch('/api/save-game', {
      method: 'POST',
      body: formData,
    }).catch(err => console.warn('[Session Save Audio Error]:', err));
  }, []);

  const recordSessionFinish = useCallback((winnerId: string, winnerName: string, victorySpeech?: string) => {
    const currentSession = sessionSaveNameRef.current;
    if (!currentSession) return;
    fetch('/api/save-game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'finish_session',
        sessionName: currentSession,
        winnerId,
        winnerName,
        victorySpeech,
      }),
    }).catch(err => console.warn('[Session Finish Error]:', err));
  }, []);

  // -----------------------------------------------------------------
  // ⚡ Lookahead Execution Pipeline Buffer & Full-Round Pre-Buffering
  // -----------------------------------------------------------------
  const [isBufferingLookahead, setIsBufferingLookahead] = useState(false);
  const [bufferingStatus, setBufferingStatus] = useState('');
  const [lookaheadBufferCount, setLookaheadBufferCount] = useState(0);

  const [isFullRoundPrebuffering, setIsFullRoundPrebuffering] = useState(false);
  const isFullRoundPrebufferingRef = useRef(false);
  const [isWaitingForRecordTrigger, setIsWaitingForRecordTrigger] = useState(false);
  const isWaitingForRecordTriggerRef = useRef(false);
  const isStartingBroadcastRef = useRef(false);
  const [prebufferProgress, setPrebufferProgress] = useState<{
    current: number;
    total: number;
    stepLabel: string;
    percent: number;
    currentCandidateId?: string;
  }>({
    current: 0,
    total: 0,
    stepLabel: '',
    percent: 0,
    currentCandidateId: undefined,
  });
  const [completedPrebufferCandidates, setCompletedPrebufferCandidates] = useState<string[]>([]);

  const lookaheadBufferRef = useRef<Map<string, Promise<PreparedStep>>>(new Map());
  const preparedStepsRef = useRef<Map<string, PreparedStep>>(new Map());
  const activeTtsCleanupRef = useRef<(() => void) | null>(null);

  const stopSpeechAudio = useCallback(() => {
    audioSync.detach();
    if (activeTtsCleanupRef.current) {
      try { activeTtsCleanupRef.current(); } catch {}
      activeTtsCleanupRef.current = null;
    }
    if (activeTtsAudioRef.current) {
      activeTtsAudioRef.current.pause();
      activeTtsAudioRef.current = null;
    }
    setIsSpeakingAudio(false);
  }, []);

  const synthesizeSpeechAudio = useCallback(async (
    text: string, 
    voiceId?: string, 
    speakerCandidateId?: string
  ): Promise<{ audioBlobUrl: string | null; audioBlob: Blob | null }> => {
    if (!text || !text.trim()) return { audioBlobUrl: null, audioBlob: null };
    const config = configRef.current;
    if (config?.fishAudioEnabled === false) {
      return { audioBlobUrl: null, audioBlob: null };
    }

    let targetVoiceId = voiceId;
    if (!targetVoiceId && speakerCandidateId) {
      const candidate = CANDIDATE_MAP.get(speakerCandidateId);
      targetVoiceId = candidate?.voice?.voiceId;
    }

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceId: targetVoiceId,
          apiKey: config?.fishAudioApiKey,
          model: config?.fishAudioModel,
        }),
      });

      if (!res.ok) return { audioBlobUrl: null, audioBlob: null };
      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      return { audioBlobUrl: audioUrl, audioBlob: blob };
    } catch (e) {
      console.warn('[TTS synthesizeSpeechAudio error]:', e);
      return { audioBlobUrl: null, audioBlob: null };
    }
  }, []);

  const playAudioUrl = useCallback((
    audioUrl: string | null, 
    options?: { isCCTV?: boolean; onEnded?: () => void; text?: string; speakerId?: string }
  ) => {
    if (!audioUrl || !state.playback.soundEnabled) return;
    stopSpeechAudio();

    try {
      setIsSpeakingAudio(true);
      const audio = new Audio(audioUrl);
      activeTtsAudioRef.current = audio;

      const targetText = options?.text ?? state.stage.content;
      const targetSpeakerId = options?.speakerId ?? state.stage.speakerId;
      if (targetText) {
        audioSync.attachAudio(audio, targetText, targetSpeakerId ?? undefined);
      }

      const isCCTV = Boolean(options?.isCCTV);
      const wiretapStrength = configRef.current?.cctvWiretapAudioEffect ?? 80;

      const handleEnd = () => {
        setIsSpeakingAudio(false);
        activeTtsAudioRef.current = null;
        audioSync.markCompleted();
        audioSync.detach();
        if (options?.onEnded) {
          options.onEnded();
        }
      };

      if (isCCTV && wiretapStrength > 0) {
        // Route through Web Audio wiretap filter!
        const cleanupWiretap = sounds.playSpeechWithWiretap(audio, wiretapStrength, handleEnd);
        activeTtsCleanupRef.current = cleanupWiretap;
      } else {
        audio.onended = handleEnd;
        audio.onerror = () => {
          setIsSpeakingAudio(false);
          activeTtsAudioRef.current = null;
          audioSync.detach();
        };
        audio.play().catch(() => {
          setIsSpeakingAudio(false);
          audioSync.detach();
        });
      }
    } catch (e) {
      setIsSpeakingAudio(false);
      audioSync.detach();
    }
  }, [state.playback.soundEnabled, state.phase, state.stage.content, state.stage.speakerId, stopSpeechAudio]);

  const playSpeechAudio = useCallback(async (
    text: string, 
    voiceId?: string, 
    speakerCandidateId?: string,
    options?: { isCCTV?: boolean; onEnded?: () => void; text?: string; speakerId?: string }
  ) => {
    if (!text || !text.trim()) return;

    // Stop any existing playing speech
    stopSpeechAudio();

    const config = configRef.current;
    if (config?.fishAudioEnabled === false || !state.playback.soundEnabled) {
      return;
    }

    const res = await synthesizeSpeechAudio(text, voiceId, speakerCandidateId);
    if (res.audioBlobUrl) {
      playAudioUrl(res.audioBlobUrl, {
        ...options,
        text: options?.text || text,
        speakerId: options?.speakerId || speakerCandidateId,
      });
    }
  }, [state.playback.soundEnabled, stopSpeechAudio, synthesizeSpeechAudio, playAudioUrl]);

  const playCCTVPactAudio = useCallback((pact: BackroomPact) => {
    if (!pact || !state.playback.soundEnabled) return;
    stopSpeechAudio();

    const p1 = candidates.find(c => c.id === pact.proposerId) || CANDIDATE_MAP.get(pact.proposerId);
    const p2 = candidates.find(c => c.id === pact.receiverId) || CANDIDATE_MAP.get(pact.receiverId);

    const playReceiverReply = () => {
      if (pact.receiverAudioBlobUrl) {
        setTimeout(() => {
          playAudioUrl(pact.receiverAudioBlobUrl!, { 
            isCCTV: true,
            text: pact.receiverResponse,
            speakerId: pact.receiverId,
          });
        }, 400);
      } else if (pact.receiverResponse && p2) {
        setTimeout(async () => {
          const rxRes = await synthesizeSpeechAudio(pact.receiverResponse!, p2.voice?.voiceId, p2.id);
          if (rxRes.audioBlobUrl) {
            pact.receiverAudioBlobUrl = rxRes.audioBlobUrl;
            playAudioUrl(rxRes.audioBlobUrl, { 
              isCCTV: true,
              text: pact.receiverResponse,
              speakerId: pact.receiverId,
            });
          }
        }, 400);
      }
    };

    if (pact.audioBlobUrl) {
      playAudioUrl(pact.audioBlobUrl, { 
        isCCTV: true, 
        onEnded: playReceiverReply,
        text: pact.whisperText,
        speakerId: pact.proposerId,
      });
    } else if (p1) {
      playSpeechAudio(pact.whisperText, p1.voice?.voiceId, p1.id, { 
        isCCTV: true, 
        onEnded: playReceiverReply,
        text: pact.whisperText,
        speakerId: pact.proposerId,
      });
    }
  }, [state.playback.soundEnabled, stopSpeechAudio, playAudioUrl, playSpeechAudio, synthesizeSpeechAudio, candidates]);

  // Cleanup speech audio and preloaded Object URLs on unmount
  useEffect(() => {
    return () => {
      if (activeTtsAudioRef.current) {
        activeTtsAudioRef.current.pause();
        activeTtsAudioRef.current = null;
      }
      preparedStepsRef.current.forEach(step => {
        if (step.audioBlobUrl) {
          try { URL.revokeObjectURL(step.audioBlobUrl); } catch {}
        }
      });
    };
  }, []);

  // Call the server API for LLM generation with active 9router config
  const callLLM = async (payload: LLMRequestPayload) => {
    const activeConfig = configRef.current;
    if (!activeConfig?.baseUrl || !activeConfig?.apiKey) {
      if (onRequireConfig) {
        onRequireConfig();
      }
      throw new Error('9router is not configured. Please enter your 9router Endpoint, API Key, and Model in Settings.');
    }

    const currentCandidate = payload.candidate || CANDIDATE_MAP.get(payload.candidateId) || candidates.find(c => c.id === payload.candidateId);

    const requestConfig = {
      baseUrl: activeConfig.baseUrl,
      apiKey: activeConfig.apiKey,
      model: activeConfig.model,
    };

    const requestPayload: LLMRequestPayload = {
      ...payload,
      candidate: currentCandidate,
      allCandidates: candidates,
      config: requestConfig,
    };

    const res = await fetch('/api/llm/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...requestPayload,
        config: requestConfig,
        nineRouterConfig: requestConfig,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}: AI generation failed via 9router`);
    }

    return data.result !== undefined ? data.result : data;
  };

  /**
   * Clears lookahead buffers when candidate roster, lineup, or order changes
   */
  const clearLookaheadBuffers = useCallback(() => {
    preparedStepsRef.current.forEach(step => {
      if (step.audioBlobUrl) {
        try { URL.revokeObjectURL(step.audioBlobUrl); } catch {}
      }
    });
    preparedStepsRef.current.clear();
    lookaheadBufferRef.current.clear();
    setLookaheadBufferCount(0);
    setIsBufferingLookahead(false);
    setBufferingStatus('');
    isFullRoundPrebufferingRef.current = false;
    setIsFullRoundPrebuffering(false);
    setPrebufferProgress({
      current: 0,
      total: 0,
      stepLabel: '',
      percent: 0,
      currentCandidateId: undefined,
    });
    setCompletedPrebufferCandidates([]);
  }, []);

  /**
   * Candidate Management Methods
   */
  const saveCandidate = (candidate: Candidate) => {
    clearLookaheadBuffers();
    const updated = candidates.some(c => c.id === candidate.id)
      ? candidates.map(c => (c.id === candidate.id ? candidate : c))
      : [...candidates, candidate];

    setCandidates(updated);
    saveStoredCandidates(updated);
    CANDIDATE_MAP.set(candidate.id, candidate);

    // If new custom candidate added, auto-include in active lineup if IDLE
    if (state.phase === 'IDLE' && !state.activeCandidateIds.includes(candidate.id)) {
      const nextActive = [...state.activeCandidateIds, candidate.id];
      saveStoredSelectedCandidateIds(nextActive);
      setState(prev => ({
        ...prev,
        participatingCandidateIds: nextActive,
        activeCandidateIds: nextActive,
        stage: {
          ...prev.stage,
          content: `${nextActive.length} candidates registered for the election. Press Start Election to begin.`,
        }
      }));
    }
  };

  const createCandidate = (candidate: Candidate) => {
    saveCandidate(candidate);
  };

  const deleteCandidate = (candidateId: string) => {
    clearLookaheadBuffers();
    const updated = candidates.filter(c => c.id !== candidateId);
    setCandidates(updated);
    saveStoredCandidates(updated);
    CANDIDATE_MAP.delete(candidateId);

    if (state.phase === 'IDLE') {
      const nextActive = state.activeCandidateIds.filter(id => id !== candidateId);
      saveStoredSelectedCandidateIds(nextActive);
      setState(prev => ({
        ...prev,
        participatingCandidateIds: nextActive,
        activeCandidateIds: nextActive,
      }));
    }
  };

  const resetCandidateToDefault = (candidateId: string) => {
    const def = DEFAULT_CANDIDATES.find(c => c.id === candidateId);
    if (!def) return;
    saveCandidate(def);
  };

  const resetAllCandidatesToDefault = () => {
    clearLookaheadBuffers();
    const defaults = resetStoredCandidates();
    setCandidates(defaults);
    const defIds = defaults.map(c => c.id);
    saveStoredSelectedCandidateIds(defIds);
    setState(CREATE_INITIAL_STATE(defIds));
  };

  const reorderCandidates = (newOrder: Candidate[]) => {
    clearLookaheadBuffers();
    setCandidates(newOrder);
    saveStoredCandidates(newOrder);

    // Keep CANDIDATE_MAP in sync
    newOrder.forEach(c => CANDIDATE_MAP.set(c.id, c));

    // If IDLE, reorder active & participating candidates preserving new sequence
    if (state.phase === 'IDLE') {
      const activeSet = new Set(state.activeCandidateIds);
      const reorderedActive = newOrder.map(c => c.id).filter(id => activeSet.has(id));
      saveStoredSelectedCandidateIds(reorderedActive);
      setState(prev => ({
        ...prev,
        participatingCandidateIds: reorderedActive,
        activeCandidateIds: reorderedActive,
      }));
    }
  };

  const moveCandidate = (candidateId: string, direction: 'up' | 'down') => {
    const idx = candidates.findIndex(c => c.id === candidateId);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === candidates.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const nextList = [...candidates];
    const [moved] = nextList.splice(idx, 1);
    nextList.splice(targetIdx, 0, moved);

    reorderCandidates(nextList);
  };

  /**
   * Candidate Selection Handlers (Available during IDLE phase)
   */
  const toggleCandidateSelection = (candidateId: string) => {
    if (state.phase !== 'IDLE') return;
    clearLookaheadBuffers();

    setState(prev => {
      const current = prev.activeCandidateIds;
      const isSelected = current.includes(candidateId);
      let nextSelected: string[];

      if (isSelected) {
        nextSelected = current.filter(id => id !== candidateId);
      } else {
        nextSelected = [...current, candidateId];
      }

      saveStoredSelectedCandidateIds(nextSelected);

      const nextBudgets: Record<string, number> = {};
      nextSelected.forEach(id => {
        const c = CANDIDATE_MAP.get(id) || candidates.find(cand => cand.id === id);
        nextBudgets[id] = prev.candidateBudgets?.[id] ?? (typeof c?.initialBudget === 'number' ? c.initialBudget : 100);
      });

      return {
        ...prev,
        participatingCandidateIds: nextSelected,
        activeCandidateIds: nextSelected,
        candidateBudgets: nextBudgets,
        stage: {
          ...prev.stage,
          content: `${nextSelected.length} candidates selected (${nextSelected.length >= 4 ? 'Ready' : 'Minimum 4 required'}). Press Start Election to begin.`,
          error: nextSelected.length < 4 ? 'Please select at least 4 candidates to run an election.' : null,
        }
      };
    });
  };

  const setSelectedCandidateIds = (ids: string[]) => {
    if (state.phase !== 'IDLE') return;
    clearLookaheadBuffers();
    saveStoredSelectedCandidateIds(ids);

    const nextBudgets: Record<string, number> = {};
    ids.forEach(id => {
      const c = CANDIDATE_MAP.get(id) || candidates.find(cand => cand.id === id);
      nextBudgets[id] = state.candidateBudgets?.[id] ?? (typeof c?.initialBudget === 'number' ? c.initialBudget : 100);
    });

    setState(prev => ({
      ...prev,
      participatingCandidateIds: [...ids],
      activeCandidateIds: [...ids],
      candidateBudgets: nextBudgets,
      stage: {
        ...prev.stage,
        content: `${ids.length} candidates selected. Press Start Election to begin.`,
        error: ids.length < 4 ? 'Please select at least 4 candidates to run an election.' : null,
      }
    }));
  };

  const YOUTUBE_11_ORDER = [
    'jax-alvarez',
    'elena-rostova',
    'art-sterling',
    'victoria-sterling',
    'marcus-vance',
    'maya-lin',
    'elijah-haddon',
    'vivienne-zhao',
    'silas-thorne',
    'garrick-stone',
    'sora-kim'
  ];

  const setPresetRoster = (preset: 'all' | 'top8' | 'top6' | 'quick4' | 'youtube11') => {
    if (state.phase !== 'IDLE') return;
    clearLookaheadBuffers();
    const currentIds = candidates.map(c => c.id);
    let selected: string[] = [];

    switch (preset) {
      case 'youtube11':
        // Filter against existing candidates in case any were removed
        selected = YOUTUBE_11_ORDER.filter(id => currentIds.includes(id));
        if (selected.length < 4) {
          selected = currentIds.slice(0, 11);
        }
        break;
      case 'quick4':
        selected = currentIds.slice(0, 4);
        break;
      case 'top6':
        selected = currentIds.slice(0, 6);
        break;
      case 'top8':
        selected = currentIds.slice(0, 8);
        break;
      case 'all':
      default:
        selected = [...currentIds];
        break;
    }

    setSelectedCandidateIds(selected);
  };

  const reorderActiveCandidates = (newOrderedIds: string[]) => {
    if (state.phase !== 'IDLE') return;
    clearLookaheadBuffers();
    setSelectedCandidateIds(newOrderedIds);
  };

  const moveActiveCandidate = (candidateId: string, direction: 'up' | 'down' | 'top' | 'bottom') => {
    if (state.phase !== 'IDLE') return;
    clearLookaheadBuffers();
    const current = [...(state.participatingCandidateIds || state.activeCandidateIds)];
    const idx = current.indexOf(candidateId);
    if (idx === -1) return;

    if (direction === 'up' && idx > 0) {
      const [item] = current.splice(idx, 1);
      current.splice(idx - 1, 0, item);
    } else if (direction === 'down' && idx < current.length - 1) {
      const [item] = current.splice(idx, 1);
      current.splice(idx + 1, 0, item);
    } else if (direction === 'top' && idx > 0) {
      const [item] = current.splice(idx, 1);
      current.unshift(item);
    } else if (direction === 'bottom' && idx < current.length - 1) {
      const [item] = current.splice(idx, 1);
      current.push(item);
    } else {
      return;
    }

    setSelectedCandidateIds(current);
  };

  const shuffleActiveCandidates = () => {
    if (state.phase !== 'IDLE') return;
    clearLookaheadBuffers();
    const current = [...(state.participatingCandidateIds || state.activeCandidateIds)];
    for (let i = current.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [current[i], current[j]] = [current[j], current[i]];
    }
    setSelectedCandidateIds(current);
  };

  const reverseActiveCandidates = () => {
    if (state.phase !== 'IDLE') return;
    clearLookaheadBuffers();
    const current = [...(state.participatingCandidateIds || state.activeCandidateIds)].reverse();
    setSelectedCandidateIds(current);
  };

  // -----------------------------------------------------------------
  // ⚡ 2-Step Lookahead Execution Pipeline Helpers
  // -----------------------------------------------------------------
  const preloadStep = useCallback(async (descriptor: StepDescriptor): Promise<PreparedStep> => {
    const { stepKey } = descriptor;
    if (lookaheadBufferRef.current.has(stepKey)) {
      return lookaheadBufferRef.current.get(stepKey)!;
    }

    const promise = (async () => {
      try {
        let content = '';
        let stepPayload: any = undefined;
        if (descriptor.llmPayload) {
          const res = await callLLM(descriptor.llmPayload);
          stepPayload = res;
          if (typeof res === 'object' && res) {
            if (res.strategyMonologue) {
              content = res.strategyMonologue;
            } else if (res.text) {
              content = res.text;
            }
          } else if (typeof res === 'string') {
            content = res;
          }
        }

        let audioBlobUrl: string | null = null;
        let audioBlob: Blob | null = null;
        let receiverAudioBlobUrl: string | null = null;

        // Resolve receiver candidate for CCTV Backroom steps
        const actualReceiverId = (descriptor.phase === 'CCTV_BACKROOM' && stepPayload?.receiverResponse)
          ? ((stepPayload.targetCandidateId && stepPayload.targetCandidateId !== descriptor.speakerId)
              ? stepPayload.targetCandidateId
              : descriptor.targetId)
          : null;

        const speakerCand = descriptor.speakerId
          ? (candidates.find(c => c.id === descriptor.speakerId) || CANDIDATE_MAP.get(descriptor.speakerId))
          : null;
        const receiverCand = actualReceiverId
          ? (candidates.find(c => c.id === actualReceiverId) || CANDIDATE_MAP.get(actualReceiverId))
          : null;

        // Run Proposer TTS and CCTV Receiver Reply TTS in parallel
        const [speakerTtsRes, rxTtsRes] = await Promise.all([
          content && descriptor.speakerId
            ? synthesizeSpeechAudio(content, speakerCand?.voice?.voiceId, descriptor.speakerId)
            : Promise.resolve({ audioBlobUrl: null, audioBlob: null }),
          actualReceiverId && stepPayload?.receiverResponse
            ? synthesizeSpeechAudio(stepPayload.receiverResponse, receiverCand?.voice?.voiceId, actualReceiverId)
            : Promise.resolve({ audioBlobUrl: null, audioBlob: null })
        ]);

        audioBlobUrl = speakerTtsRes.audioBlobUrl;
        audioBlob = speakerTtsRes.audioBlob;
        receiverAudioBlobUrl = rxTtsRes.audioBlobUrl;

        const prepared: PreparedStep = {
          stepKey,
          phase: descriptor.phase,
          round: descriptor.round,
          speakerId: descriptor.speakerId,
          targetId: descriptor.targetId,
          actionType: descriptor.actionType,
          headline: descriptor.headline,
          content,
          audioBlobUrl,
          receiverAudioBlobUrl,
          audioBlob,
          isReady: true,
          payload: stepPayload,
        };

        preparedStepsRef.current.set(stepKey, prepared);
        setLookaheadBufferCount(preparedStepsRef.current.size);
        return prepared;
      } catch (err: any) {
        console.warn(`[Preload Warning for ${stepKey}]:`, err);
        const fallback: PreparedStep = {
          stepKey,
          phase: descriptor.phase,
          round: descriptor.round,
          speakerId: descriptor.speakerId,
          targetId: descriptor.targetId,
          actionType: descriptor.actionType,
          headline: descriptor.headline,
          content: 'Delivering address...',
          audioBlobUrl: null,
          audioBlob: null,
          isReady: false,
          error: err.message,
          payload: undefined,
        };
        preparedStepsRef.current.set(stepKey, fallback);
        return fallback;
      }
    })();

    lookaheadBufferRef.current.set(stepKey, promise);
    return promise;
  }, [callLLM, synthesizeSpeechAudio]);

  const fetchOrConsumeStep = useCallback(async (descriptor: StepDescriptor): Promise<{ content: string; audioBlobUrl: string | null; receiverAudioBlobUrl?: string | null; audioBlob: Blob | null; payload?: any }> => {
    const { stepKey, actionType, round, speakerId, targetId } = descriptor;

    // Helper to validate whether a prepared step is valid for this descriptor
    const isStepValid = (prep: PreparedStep): boolean => {
      if (!prep.isReady || prep.error) return false;

      // 1. Check speaker matches if descriptor specified a speaker
      if (speakerId && prep.speakerId && prep.speakerId !== speakerId) {
        console.warn(`[fetchOrConsumeStep]: Rejecting ${prep.stepKey} due to speaker mismatch (${prep.speakerId} vs requested ${speakerId})`);
        return false;
      }

      // 2. Check neither speaker nor target is in eliminatedCandidates
      const eliminatedIds = new Set((state.eliminatedCandidates || []).map(e => e.candidateId));
      if (prep.speakerId && eliminatedIds.has(prep.speakerId) && actionType !== 'eliminated') {
        console.warn(`[fetchOrConsumeStep]: Rejecting ${prep.stepKey} - speaker ${prep.speakerId} is already eliminated`);
        return false;
      }
      if (prep.targetId && eliminatedIds.has(prep.targetId)) {
        console.warn(`[fetchOrConsumeStep]: Rejecting ${prep.stepKey} - target ${prep.targetId} is already eliminated`);
        return false;
      }

      // 3. For attacks, check target matches requested target
      if (actionType === 'attack' && targetId) {
        const prepTarget = prep.targetId || prep.payload?.targetCandidateId || prep.payload?.targetId;
        if (prepTarget && prepTarget !== targetId) {
          console.warn(`[fetchOrConsumeStep]: Rejecting ${prep.stepKey} - target mismatch (${prepTarget} vs requested ${targetId})`);
          return false;
        }
      }

      // 4. For elimination concession speeches, speaker MUST match candidate being eliminated
      if (actionType === 'eliminated' && speakerId) {
        if (prep.speakerId !== speakerId) {
          console.warn(`[fetchOrConsumeStep]: Rejecting ${prep.stepKey} - elimination speaker mismatch (${prep.speakerId} vs requested ${speakerId})`);
          return false;
        }
      }

      return true;
    };

    // Keys to search for: exact key, plus aliases for attacks
    const candidateKeys = [stepKey];
    if (actionType === 'attack' && targetId) {
      if (!stepKey.includes('-vs-')) {
        candidateKeys.push(`${stepKey}-vs-${targetId}`);
      } else {
        const baseKey = stepKey.split('-vs-')[0];
        candidateKeys.push(baseKey);
      }
    }

    // 1. Instant Memory Cache Hit by candidate keys (0ms)
    for (const key of candidateKeys) {
      if (preparedStepsRef.current.has(key)) {
        const prep = preparedStepsRef.current.get(key)!;
        if (!isStepValid(prep)) {
          console.warn(`[fetchOrConsumeStep]: Cached step ${key} failed validation. Evicting to regenerate fresh live step...`);
          preparedStepsRef.current.delete(key);
          lookaheadBufferRef.current.delete(key);
        } else {
          preparedStepsRef.current.delete(key);
          lookaheadBufferRef.current.delete(key);
          setLookaheadBufferCount(preparedStepsRef.current.size);
          return { content: prep.content, audioBlobUrl: prep.audioBlobUrl, receiverAudioBlobUrl: prep.receiverAudioBlobUrl || null, audioBlob: prep.audioBlob || null, payload: prep.payload };
        }
      }
    }

    // 2. Pending In-Flight Preload Promise by candidate keys
    for (const key of candidateKeys) {
      if (lookaheadBufferRef.current.has(key)) {
        const prep = await lookaheadBufferRef.current.get(key)!;
        if (!isStepValid(prep)) {
          console.warn(`[fetchOrConsumeStep]: In-flight step ${key} failed validation. Evicting to regenerate fresh live step...`);
          preparedStepsRef.current.delete(key);
          lookaheadBufferRef.current.delete(key);
        } else {
          preparedStepsRef.current.delete(key);
          lookaheadBufferRef.current.delete(key);
          setLookaheadBufferCount(preparedStepsRef.current.size);
          return { content: prep.content, audioBlobUrl: prep.audioBlobUrl, receiverAudioBlobUrl: prep.receiverAudioBlobUrl || null, audioBlob: prep.audioBlob || null, payload: prep.payload };
        }
      }
    }

    // 3. Robust Elimination Fallback: only consume if speakerId matches the candidate being eliminated
    if (actionType === 'eliminated' && speakerId) {
      for (const [key, prep] of preparedStepsRef.current.entries()) {
        if (prep.actionType === 'eliminated' && prep.round === round && prep.speakerId === speakerId && isStepValid(prep)) {
          preparedStepsRef.current.delete(key);
          lookaheadBufferRef.current.delete(key);
          setLookaheadBufferCount(preparedStepsRef.current.size);
          return { content: prep.content, audioBlobUrl: prep.audioBlobUrl, receiverAudioBlobUrl: prep.receiverAudioBlobUrl || null, audioBlob: prep.audioBlob || null, payload: prep.payload };
        }
      }
    }

    // 4. Fallback: Preload right now and await both LLM and TTS concurrently
    const prep = await preloadStep(descriptor);
    preparedStepsRef.current.delete(stepKey);
    lookaheadBufferRef.current.delete(stepKey);
    setLookaheadBufferCount(preparedStepsRef.current.size);
    return { content: prep.content, audioBlobUrl: prep.audioBlobUrl, receiverAudioBlobUrl: prep.receiverAudioBlobUrl || null, audioBlob: prep.audioBlob || null, payload: prep.payload };
  }, [preloadStep, state.eliminatedCandidates]);

  const computeNextSteps = useCallback((currentState: GameState, maxDepth: number = 2) => {
    const steps: StepDescriptor[] = [];
    const activeCandidateIds = [...currentState.activeCandidateIds];
    if (activeCandidateIds.length === 0) return steps;

    const electionTopic = currentState.electionTopic || DEFAULT_TOPIC;

    // Simulate step progression from currentState
    let simPhase: GamePhase = currentState.phase;
    let simRound: number = currentState.round;
    let simSpeakerIndex: number = currentState.currentSpeakerIndex;
    let simActiveIds = [...activeCandidateIds];
    let simWinnerId = currentState.winnerId;

    while (steps.length < maxDepth) {
      if (simPhase === 'IDLE') {
        const nextIdx = steps.length;
        if (nextIdx < simActiveIds.length) {
          const cand = CANDIDATE_MAP.get(simActiveIds[nextIdx])!;
          const preceding = simActiveIds.slice(0, nextIdx).map(id => {
            const c = CANDIDATE_MAP.get(id);
            return {
              candidateId: id,
              candidateName: c?.name || id,
              titleRole: c?.titleRole || 'Candidate',
              speech: currentState.campaignSpeeches[id] || (c ? `${c.slogan}` : 'My presidential platform'),
            };
          });

          steps.push({
            stepKey: `campaign-${nextIdx}-${cand.id}`,
            phase: 'CAMPAIGN',
            round: 1,
            speakerId: cand.id,
            targetId: null,
            actionType: 'speech',
            headline: nextIdx === 0
              ? `ROUND 1: OPENING CAMPAIGN ADDRESS — ${cand.name.toUpperCase()}`
              : `ROUND 1: CAMPAIGN ADDRESS — ${cand.name.toUpperCase()}`,
            llmPayload: {
              action: 'campaign_speech',
              candidateId: cand.id,
              round: 1,
              activeCandidateIds: simActiveIds,
              historyContext: {
                electionTopic,
                campaignSpeeches: currentState.campaignSpeeches,
                precedingSpeeches: preceding,
              },
            }
          });
        } else {
          simPhase = 'ATTACK';
          simSpeakerIndex = -1;
          simRound = 1;
        }
      } else if (simPhase === 'CAMPAIGN') {
        simSpeakerIndex += 1;
        if (simSpeakerIndex < simActiveIds.length) {
          const cand = CANDIDATE_MAP.get(simActiveIds[simSpeakerIndex])!;
          const preceding = simActiveIds.slice(0, simSpeakerIndex).map(id => {
            const c = CANDIDATE_MAP.get(id);
            return {
              candidateId: id,
              candidateName: c?.name || id,
              titleRole: c?.titleRole || 'Candidate',
              speech: currentState.campaignSpeeches[id] || (c ? `${c.slogan}` : 'My presidential platform'),
            };
          });

          steps.push({
            stepKey: `campaign-${simSpeakerIndex}-${cand.id}`,
            phase: 'CAMPAIGN',
            round: 1,
            speakerId: cand.id,
            targetId: null,
            actionType: 'speech',
            headline: `ROUND 1: CAMPAIGN ADDRESS — ${cand.name.toUpperCase()}`,
            llmPayload: {
              action: 'campaign_speech',
              candidateId: cand.id,
              round: 1,
              activeCandidateIds: simActiveIds,
              historyContext: {
                electionTopic,
                campaignSpeeches: currentState.campaignSpeeches,
                precedingSpeeches: preceding,
              },
            }
          });
        } else {
          // Transition to ATTACK phase
          simPhase = 'ATTACK';
          simSpeakerIndex = -1;
          simRound = 1;
        }
      } else if (simPhase === 'ATTACK') {
        simSpeakerIndex += 1;
        if (simSpeakerIndex < simActiveIds.length) {
          const attacker = CANDIDATE_MAP.get(simActiveIds[simSpeakerIndex])!;
          const preferredTargetId = resolveAttackTarget(attacker.id, simActiveIds, {
            attacksByRound: currentState.attacksByRound,
            pactsByRound: currentState.pactsByRound,
            votesByRound: currentState.votesByRound,
            round: simRound,
            candidateBudgets: currentState.candidateBudgets,
          });
          const targetCand = CANDIDATE_MAP.get(preferredTargetId);

          const roundAttacks = currentState.attacksByRound[simRound] || [];
          const recentAttackContext = roundAttacks.map(a => ({
            attackerName: CANDIDATE_MAP.get(a.attackerId)?.name || a.attackerId,
            targetName: CANDIDATE_MAP.get(a.targetId)?.name || a.targetId,
            text: a.text,
          }));

          const priorAccusation = roundAttacks.find(a => a.targetId === attacker.id);
          const activeAccusationOnSpeaker = priorAccusation ? {
            attackerId: priorAccusation.attackerId,
            attackerName: CANDIDATE_MAP.get(priorAccusation.attackerId)?.name || priorAccusation.attackerId,
            text: priorAccusation.text,
          } : undefined;

          steps.push({
            stepKey: `attack-r${simRound}-${simSpeakerIndex}-${attacker.id}`,
            phase: 'ATTACK',
            round: simRound,
            speakerId: attacker.id,
            targetId: preferredTargetId,
            actionType: 'attack',
            headline: `ROUND ${simRound}: LIVE ATTACK ROUND — ${attacker.name.toUpperCase()}`,
            llmPayload: {
              action: 'attack',
              candidateId: attacker.id,
              targetId: preferredTargetId,
              round: simRound,
              activeCandidateIds: simActiveIds,
              eliminatedCandidateIds: currentState.eliminatedCandidates?.map(e => e.candidateId) || [],
              historyContext: { 
                electionTopic,
                campaignSpeeches: currentState.campaignSpeeches,
                targetSpeechQuote: currentState.campaignSpeeches[preferredTargetId] || targetCand?.slogan,
                targetWeaknesses: targetCand?.weaknesses,
                targetTreasuryBalance: currentState.candidateBudgets[preferredTargetId] ?? 100,
                targetHeatScore: currentState.debateHeatByRound?.[simRound]?.[preferredTargetId]?.heatScore ?? 0,
                activeAccusationOnSpeaker,
                recentAttacks: recentAttackContext,
              },
            }
          });
        } else {
          // Transition to CCTV_BACKROOM
          simPhase = 'CCTV_BACKROOM';
          simSpeakerIndex = -1;
        }
      } else if (simPhase === 'CCTV_BACKROOM') {
        simSpeakerIndex += 1;
        const pactCount = simActiveIds.length;
        if (simSpeakerIndex < pactCount) {
          const p1Id = simActiveIds[simSpeakerIndex];
          const p2Id = simActiveIds[(simSpeakerIndex + 1) % simActiveIds.length];
          const p1 = CANDIDATE_MAP.get(p1Id) || CANDIDATE_MAP.get(simActiveIds[0])!;
          const p2 = CANDIDATE_MAP.get(p2Id) || CANDIDATE_MAP.get(simActiveIds[1])!;

          const recentAttackContext = (currentState.attacksByRound[simRound] || []).map(a => ({
            attackerName: CANDIDATE_MAP.get(a.attackerId)?.name || a.attackerId,
            targetName: CANDIDATE_MAP.get(a.targetId)?.name || a.targetId,
            text: a.text,
          }));

          const roundHeat = currentState.debateHeatByRound?.[simRound] || {};
          const heatEntries = Object.values(roundHeat);
          const topHeat = heatEntries.sort((a, b) => b.heatScore - a.heatScore)[0];
          const debateConsensusLeader = (topHeat && topHeat.heatScore > 0) ? {
            candidateId: topHeat.candidateId,
            candidateName: CANDIDATE_MAP.get(topHeat.candidateId)?.name || topHeat.candidateId,
            heatScore: topHeat.heatScore,
            accusers: topHeat.accusers.map(id => CANDIDATE_MAP.get(id)?.name || id),
            voteCalls: topHeat.voteCallsAgainst.map(id => CANDIDATE_MAP.get(id)?.name || id),
          } : undefined;

          steps.push({
            stepKey: `cctv-r${simRound}-${simSpeakerIndex}-${p1.id}`,
            phase: 'CCTV_BACKROOM',
            round: simRound,
            speakerId: p1.id,
            targetId: p2.id,
            actionType: 'pact',
            headline: `ROUND ${simRound}: LEAKED CAPITOL CCTV FEED ${simSpeakerIndex + 1} OF ${pactCount}`,
            llmPayload: {
              action: 'backroom_pact',
              candidateId: p1.id,
              targetId: p2.id,
              round: simRound,
              activeCandidateIds: simActiveIds,
              historyContext: {
                electionTopic,
                recentAttacks: recentAttackContext,
                debateConsensusLeader,
                proposerBudget: currentState.candidateBudgets[p1.id] ?? 100,
                receiverBudget: currentState.candidateBudgets[p2.id] ?? 100,
                candidateTreasuries: currentState.candidateBudgets,
                candidateSecretStrategy: currentState.candidateStrategies?.[p1.id],
              },
            }
          });
        } else {
          // Transition to Secret Voting Confessionals
          simPhase = 'VOTE_CONFESSIONAL';
          simSpeakerIndex = -1;
        }
      } else if (simPhase === 'VOTE_CONFESSIONAL') {
        simSpeakerIndex += 1;
        if (simSpeakerIndex < simActiveIds.length) {
          const voterId = simActiveIds[simSpeakerIndex];
          const voter = CANDIDATE_MAP.get(voterId)!;

          // Determine realistic Gravity Wells A & B
          const roundHeat = currentState.debateHeatByRound?.[simRound] || {};
          const heatEntries = Object.values(roundHeat);
          const topHeat = heatEntries.sort((a, b) => b.heatScore - a.heatScore)[0];
          const debateConsensusLeader = (topHeat && topHeat.heatScore > 0) ? {
            candidateId: topHeat.candidateId,
            candidateName: CANDIDATE_MAP.get(topHeat.candidateId)?.name || topHeat.candidateId,
            heatScore: topHeat.heatScore,
            accusers: topHeat.accusers.map(id => CANDIDATE_MAP.get(id)?.name || id),
            voteCalls: topHeat.voteCallsAgainst.map(id => CANDIDATE_MAP.get(id)?.name || id),
          } : undefined;

          const simPrimaryTargetId = debateConsensusLeader?.candidateId || simActiveIds[1] || simActiveIds[0];
          const otherActive = simActiveIds.filter(id => id !== simPrimaryTargetId);
          const simCounterTargetId = otherActive.sort((a, b) => (currentState.candidateBudgets[b] ?? 100) - (currentState.candidateBudgets[a] ?? 100))[0] || otherActive[0];

          let simTargetId: string;
          if (voterId === simPrimaryTargetId) {
            simTargetId = simCounterTargetId;
          } else if (debateConsensusLeader?.accusers.includes(voterId)) {
            simTargetId = simPrimaryTargetId;
          } else if (simSpeakerIndex % 2 === 0) {
            simTargetId = simPrimaryTargetId;
          } else {
            simTargetId = simCounterTargetId;
          }
          if (simTargetId === voterId) {
            simTargetId = simActiveIds.filter(id => id !== voterId)[0];
          }

          const allyCand = CANDIDATE_MAP.get(simActiveIds[(simSpeakerIndex + 1) % simActiveIds.length]);

          steps.push({
            stepKey: `vote_confessional-r${simRound}-${simSpeakerIndex}-${voter.id}`,
            phase: 'VOTE_CONFESSIONAL',
            round: simRound,
            speakerId: voter.id,
            targetId: null,
            actionType: 'vote',
            headline: `ROUND ${simRound}: CONFIDENTIAL STRATEGY CONFESSIONAL (${simSpeakerIndex + 1} of ${simActiveIds.length})`,
            llmPayload: {
              action: 'elimination_vote',
              candidateId: voter.id,
              round: simRound,
              activeCandidateIds: simActiveIds,
              historyContext: {
                electionTopic,
                candidateTreasuries: currentState.candidateBudgets,
                candidateSecretStrategy: currentState.candidateStrategies?.[voter.id],
                debateConsensusLeader,
                candidateWithHighestTreasury: simCounterTargetId,
                activePact: allyCand ? { allyId: allyCand.id, agreedTargetId: simTargetId } : undefined,
              },
            }
          });
        } else {
          // All confessionals concluded -> Push Elimination Speech
          let elimCandidateId = currentState.votesByRound[simRound]?.eliminatedId;
          if (!elimCandidateId || !simActiveIds.includes(elimCandidateId)) {
            const simBudgets = { ...currentState.candidateBudgets };
            const simulatedVotes: Record<string, number> = {};
            simActiveIds.forEach(id => { simulatedVotes[id] = 0; });

            const roundHeat = currentState.debateHeatByRound?.[simRound] || {};
            const heatEntries = Object.values(roundHeat);
            const topHeat = heatEntries.sort((a, b) => b.heatScore - a.heatScore)[0];
            const simPrimaryTargetId = (topHeat && topHeat.heatScore > 0) ? topHeat.candidateId : (simActiveIds[1] || simActiveIds[0]);
            const otherActive = simActiveIds.filter(id => id !== simPrimaryTargetId);
            const simCounterTargetId = otherActive.sort((a, b) => (currentState.candidateBudgets[b] ?? 100) - (currentState.candidateBudgets[a] ?? 100))[0] || otherActive[0];

            simActiveIds.forEach((vId, idx) => {
              let target: string;
              if (vId === simPrimaryTargetId) {
                target = simCounterTargetId;
              } else if (idx % 2 === 0) {
                target = simPrimaryTargetId;
              } else {
                target = simCounterTargetId;
              }
              if (target === vId) {
                target = simActiveIds.filter(id => id !== vId)[0];
              }
              simulatedVotes[target] = (simulatedVotes[target] || 0) + 1;
            });
            const bailoutRes = resolveBailoutAuction(simulatedVotes, simBudgets, simActiveIds, simRound);
            elimCandidateId = bailoutRes.eliminatedId;
          }

          const elimCand = CANDIDATE_MAP.get(elimCandidateId)!;
          const wasBetrayed = Boolean(currentState.votesByRound[simRound]?.votes.some(v => v.targetId === elimCandidateId && v.isBetrayal));
          const betrayerId = currentState.votesByRound[simRound]?.votes.find(v => v.targetId === elimCandidateId && v.isBetrayal)?.voterId;

          steps.push({
            stepKey: `elimination-r${simRound}-${elimCand.id}`,
            phase: 'ELIMINATION',
            round: simRound,
            speakerId: elimCand.id,
            targetId: null,
            actionType: 'eliminated',
            headline: `ROUND ${simRound} ELIMINATION — ${elimCand.name.toUpperCase()}`,
            llmPayload: {
              action: 'exit_words',
              candidateId: elimCand.id,
              round: simRound,
              activeCandidateIds: simActiveIds,
              historyContext: {
                electionTopic,
                betrayalContext: {
                  wasBetrayed,
                  betrayedByCandidateName: betrayerId ? CANDIDATE_MAP.get(betrayerId)?.name : undefined,
                  voteCountAgainstSelf: currentState.votesByRound[simRound]?.tally[elimCandidateId] || 0,
                },
              },
            }
          });

          const remainingAfterElim = simActiveIds.filter(id => id !== elimCandidateId);
          if (remainingAfterElim.length > 3) {
            simActiveIds = remainingAfterElim;
            simPhase = 'ATTACK';
            simRound += 1;
            simSpeakerIndex = -1;
          } else {
            simActiveIds = remainingAfterElim;
            simPhase = 'FINAL_SPEECHES';
            simSpeakerIndex = -1;
          }
        }
      } else if (simPhase === 'VOTE_REVEAL' || simPhase === 'ELIMINATION') {
        if (simActiveIds.length > 3) {
          simPhase = 'ATTACK';
          simRound += 1;
          simSpeakerIndex = -1;
        } else {
          simPhase = 'FINAL_SPEECHES';
          simSpeakerIndex = -1;
        }
      } else if (simPhase === 'FINAL_SPEECHES') {
        simSpeakerIndex += 1;
        if (simSpeakerIndex < simActiveIds.length && simSpeakerIndex < 3) {
          const finalist = CANDIDATE_MAP.get(simActiveIds[simSpeakerIndex])!;
          const elimSummary = currentState.eliminatedCandidates.map(e => ({
            candidateName: CANDIDATE_MAP.get(e.candidateId)?.name || e.candidateId,
            candidateId: e.candidateId,
            round: e.eliminatedInRound,
            exitWords: e.exitWords,
          }));

          steps.push({
            stepKey: `final_speech-${simSpeakerIndex}-${finalist.id}`,
            phase: 'FINAL_SPEECHES',
            round: simRound,
            speakerId: finalist.id,
            targetId: null,
            actionType: 'speech',
            headline: `THE FINAL 3 SHOWDOWN: CLOSING ARGUMENT — ${finalist.name.toUpperCase()}`,
            llmPayload: {
              action: 'final_speech',
              candidateId: finalist.id,
              round: simRound,
              activeCandidateIds: simActiveIds,
              finalistIds: simActiveIds,
              historyContext: {
                electionTopic,
                campaignSpeeches: currentState.campaignSpeeches,
                eliminatedCandidatesSummary: elimSummary,
              },
            }
          });
        } else {
          simPhase = 'FINAL_VOTE';
          simSpeakerIndex = -1;
        }
      } else if (simPhase === 'FINAL_VOTE') {
        simSpeakerIndex += 1;
        const totalVoters = currentState.participatingCandidateIds || currentState.activeCandidateIds;
        if (simSpeakerIndex < totalVoters.length) {
          const voterId = totalVoters[simSpeakerIndex];
          const voterCand = CANDIDATE_MAP.get(voterId)!;

          steps.push({
            stepKey: `grand_jury_vote-${simSpeakerIndex}-${voterCand.id}`,
            phase: 'VOTE_CONFESSIONAL',
            round: 99,
            speakerId: voterCand.id,
            targetId: null,
            actionType: 'vote',
            headline: `GRAND JURY STRATEGY CONFESSIONAL (${simSpeakerIndex + 1} of ${totalVoters.length})`,
            llmPayload: {
              action: 'final_vote',
              candidateId: voterCand.id,
              round: 99,
              activeCandidateIds: simActiveIds,
              finalistIds: simActiveIds,
              historyContext: {
                electionTopic,
                allClashesSummary: [],
              },
            }
          });
        } else {
          simPhase = 'FINAL_REVEAL';
        }
      } else if (simPhase === 'FINAL_REVEAL') {
        const winner = CANDIDATE_MAP.get(simWinnerId || simActiveIds[0])!;
        steps.push({
          stepKey: `winner-${winner.id}`,
          phase: 'WINNER',
          round: 100,
          speakerId: winner.id,
          targetId: null,
          actionType: 'winner',
          headline: `PRESIDENT OF THE REPUBLIC OF VALORIA: ${winner.name.toUpperCase()}`,
          llmPayload: {
            action: 'victory_speech',
            candidateId: winner.id,
            round: 100,
            activeCandidateIds: [winner.id],
            historyContext: {
              electionTopic,
            },
          }
        });
        break;
      } else {
        break;
      }
    }

    return steps;
  }, []);

  const computeRound1Steps = useCallback((currentState: GameState): StepDescriptor[] => {
    const steps: StepDescriptor[] = [];
    const activeCandidateIds = [...currentState.activeCandidateIds];
    if (activeCandidateIds.length === 0) return steps;

    const electionTopic = currentState.electionTopic || DEFAULT_TOPIC;

    // 1. All Campaign Speeches for active candidates
    activeCandidateIds.forEach((candId, idx) => {
      const cand = CANDIDATE_MAP.get(candId)!;
      const preceding = activeCandidateIds.slice(0, idx).map(id => {
        const c = CANDIDATE_MAP.get(id);
        return {
          candidateId: id,
          candidateName: c?.name || id,
          titleRole: c?.titleRole || 'Candidate',
          speech: currentState.campaignSpeeches[id] || (c ? `${c.slogan}` : 'My presidential platform'),
        };
      });

      steps.push({
        stepKey: `campaign-${idx}-${cand.id}`,
        phase: 'CAMPAIGN',
        round: 1,
        speakerId: cand.id,
        targetId: null,
        actionType: 'speech',
        headline: idx === 0
          ? `ROUND 1: OPENING CAMPAIGN ADDRESS — ${cand.name.toUpperCase()}`
          : `ROUND 1: CAMPAIGN ADDRESS — ${cand.name.toUpperCase()}`,
        llmPayload: {
          action: 'campaign_speech',
          candidateId: cand.id,
          round: 1,
          activeCandidateIds,
          historyContext: {
            electionTopic,
            campaignSpeeches: currentState.campaignSpeeches,
            precedingSpeeches: preceding,
          },
        }
      });
    });

    // 2. All Attacks for Round 1
    activeCandidateIds.forEach((attackerId, idx) => {
      const attacker = CANDIDATE_MAP.get(attackerId)!;
      const preferredTargetId = resolveAttackTarget(attacker.id, activeCandidateIds, {
        attacksByRound: currentState.attacksByRound,
        pactsByRound: currentState.pactsByRound,
        votesByRound: currentState.votesByRound,
        round: 1,
        candidateBudgets: currentState.candidateBudgets,
      });
      const targetCand = CANDIDATE_MAP.get(preferredTargetId);

      steps.push({
        stepKey: `attack-r1-${idx}-${attacker.id}`,
        phase: 'ATTACK',
        round: 1,
        speakerId: attacker.id,
        targetId: preferredTargetId,
        actionType: 'attack',
        headline: `ROUND 1: LIVE ATTACK ROUND — ${attacker.name.toUpperCase()}`,
        llmPayload: {
          action: 'attack',
          candidateId: attacker.id,
          targetId: preferredTargetId,
          round: 1,
          activeCandidateIds,
          eliminatedCandidateIds: currentState.eliminatedCandidates?.map(e => e.candidateId) || [],
          historyContext: { 
            electionTopic,
            campaignSpeeches: currentState.campaignSpeeches,
            targetSpeechQuote: currentState.campaignSpeeches[preferredTargetId] || targetCand?.slogan,
            targetWeaknesses: targetCand?.weaknesses,
            targetTreasuryBalance: currentState.candidateBudgets[preferredTargetId] ?? 100,
            targetHeatScore: 0,
            recentAttacks: [],
          },
        }
      });
    });

    // 3. All Leaked CCTV Corridor Feeds for Round 1
    activeCandidateIds.forEach((p1Id, idx) => {
      const p2Id = activeCandidateIds[(idx + 1) % activeCandidateIds.length];
      const p1 = CANDIDATE_MAP.get(p1Id)!;
      const p2 = CANDIDATE_MAP.get(p2Id)!;

      steps.push({
        stepKey: `cctv-r1-${idx}-${p1.id}`,
        phase: 'CCTV_BACKROOM',
        round: 1,
        speakerId: p1.id,
        targetId: p2.id,
        actionType: 'pact',
        headline: `ROUND 1: LEAKED CAPITOL CCTV FEED ${idx + 1} OF ${activeCandidateIds.length}`,
        llmPayload: {
          action: 'backroom_pact',
          candidateId: p1.id,
          targetId: p2.id,
          round: 1,
          activeCandidateIds,
          historyContext: {
            electionTopic,
            recentAttacks: [],
            proposerBudget: currentState.candidateBudgets[p1.id] ?? 100,
            receiverBudget: currentState.candidateBudgets[p2.id] ?? 100,
            candidateTreasuries: currentState.candidateBudgets,
            candidateSecretStrategy: currentState.candidateStrategies?.[p1.id],
          },
        }
      });
    });

    // 4. All Secret Elimination Ballots & Confessionals for Round 1
    // Compute simulated debate heat to identify Gravity Well A (Debate Consensus) & B (Counter-Kingpin)
    const attackCounts: Record<string, number> = {};
    activeCandidateIds.forEach(id => { attackCounts[id] = 0; });
    const attackTargetPerAttacker: Record<string, string> = {};

    activeCandidateIds.forEach(attackerId => {
      const attacker = CANDIDATE_MAP.get(attackerId)!;
      const prefTarget = resolveAttackTarget(attacker.id, activeCandidateIds, {
        attacksByRound: currentState.attacksByRound,
        pactsByRound: currentState.pactsByRound,
        votesByRound: currentState.votesByRound,
        round: 1,
        candidateBudgets: currentState.candidateBudgets,
      });
      attackTargetPerAttacker[attackerId] = prefTarget;
      if (prefTarget) {
        attackCounts[prefTarget] = (attackCounts[prefTarget] || 0) + 1;
      }
    });

    const sortedByAttacks = Object.entries(attackCounts).sort((a, b) => b[1] - a[1]);
    const simPrimaryTargetId = sortedByAttacks[0]?.[0] || activeCandidateIds[1] || activeCandidateIds[0];
    const primaryTargetCand = CANDIDATE_MAP.get(simPrimaryTargetId);

    // Identify Counter-Alliance Kingpin Target (Gravity Well B): wealthiest candidate other than primary target
    const counterCandidates = activeCandidateIds.filter(id => id !== simPrimaryTargetId);
    const sortedByTreasury = [...counterCandidates].sort((a, b) => (currentState.candidateBudgets[b] ?? 100) - (currentState.candidateBudgets[a] ?? 100));
    const simCounterTargetId = sortedByTreasury[0] || counterCandidates[0];

    const debateConsensusLeader = (sortedByAttacks[0]?.[1] ?? 0) > 0 ? {
      candidateId: simPrimaryTargetId,
      candidateName: primaryTargetCand?.name || simPrimaryTargetId,
      heatScore: sortedByAttacks[0][1],
      accusers: activeCandidateIds.filter(id => attackTargetPerAttacker[id] === simPrimaryTargetId),
      voteCalls: activeCandidateIds.filter(id => attackTargetPerAttacker[id] === simPrimaryTargetId),
    } : undefined;

    // Build confessional steps with realistic factional targets
    activeCandidateIds.forEach((voterId, idx) => {
      const voter = CANDIDATE_MAP.get(voterId)!;
      let simTargetId: string;
      if (voterId === simPrimaryTargetId) {
        simTargetId = simCounterTargetId;
      } else if (attackTargetPerAttacker[voterId] === simPrimaryTargetId) {
        simTargetId = simPrimaryTargetId;
      } else if (idx % 2 === 0) {
        simTargetId = simPrimaryTargetId;
      } else {
        simTargetId = simCounterTargetId;
      }
      if (simTargetId === voterId) {
        simTargetId = activeCandidateIds.filter(id => id !== voterId)[0];
      }

      const allyCandidate = CANDIDATE_MAP.get(activeCandidateIds[(idx + 1) % activeCandidateIds.length]);

      steps.push({
        stepKey: `vote_confessional-r1-${idx}-${voter.id}`,
        phase: 'VOTE_CONFESSIONAL',
        round: 1,
        speakerId: voter.id,
        targetId: null,
        actionType: 'vote',
        headline: `ROUND 1: CONFIDENTIAL STRATEGY CONFESSIONAL (${idx + 1} of ${activeCandidateIds.length})`,
        llmPayload: {
          action: 'elimination_vote',
          candidateId: voter.id,
          round: 1,
          activeCandidateIds,
          historyContext: {
            electionTopic,
            candidateTreasuries: currentState.candidateBudgets,
            candidateSecretStrategy: currentState.candidateStrategies?.[voter.id],
            debateConsensusLeader,
            candidateWithHighestTreasury: simCounterTargetId,
            activePact: allyCandidate ? { allyId: allyCandidate.id, agreedTargetId: simTargetId } : undefined,
          },
        }
      });
    });

    // 5. Simulated Round 1 Elimination Exit Speech with concentrated votes
    const simBudgets = { ...currentState.candidateBudgets };
    const simulatedVotes: Record<string, number> = {};
    activeCandidateIds.forEach(id => { simulatedVotes[id] = 0; });
    activeCandidateIds.forEach((voterId, idx) => {
      let simTargetId: string;
      if (voterId === simPrimaryTargetId) {
        simTargetId = simCounterTargetId;
      } else if (attackTargetPerAttacker[voterId] === simPrimaryTargetId) {
        simTargetId = simPrimaryTargetId;
      } else if (idx % 2 === 0) {
        simTargetId = simPrimaryTargetId;
      } else {
        simTargetId = simCounterTargetId;
      }
      if (simTargetId === voterId) {
        simTargetId = activeCandidateIds.filter(id => id !== voterId)[0];
      }
      simulatedVotes[simTargetId] = (simulatedVotes[simTargetId] || 0) + 1;
    });
    const bailoutRes = resolveBailoutAuction(simulatedVotes, simBudgets, activeCandidateIds, 1);
    const elimCandidateId = bailoutRes.eliminatedId || activeCandidateIds[0];
    const elimCand = CANDIDATE_MAP.get(elimCandidateId)!;

    steps.push({
      stepKey: `elimination-r1-${elimCand.id}`,
      phase: 'ELIMINATION',
      round: 1,
      speakerId: elimCand.id,
      targetId: null,
      actionType: 'eliminated',
      headline: `ROUND 1 ELIMINATION — ${elimCand.name.toUpperCase()}`,
      llmPayload: {
        action: 'exit_words',
        candidateId: elimCand.id,
        round: 1,
        activeCandidateIds,
        historyContext: {
          electionTopic,
          betrayalContext: {
            wasBetrayed: false,
            voteCountAgainstSelf: bailoutRes.finalTally[elimCandidateId] || 1,
          },
        },
      }
    });

    return steps;
  }, []);

  const dispatchBackgroundPreload = useCallback((currentState: GameState) => {
    const depth = configRef.current?.lookaheadDepth || 2;
    const nextSteps = computeNextSteps(currentState, depth);
    nextSteps.forEach(step => {
      preloadStep(step);
    });
  }, [computeNextSteps, preloadStep]);

  /**
   * Main state machine step executor
   */
  const executeNextStep = useCallback(async () => {
    if (isExecutingStep.current || isFullRoundPrebufferingRef.current || isWaitingForRecordTriggerRef.current) return;

    // Check candidate count
    if (state.activeCandidateIds.length < 4 && state.phase === 'IDLE') {
      setState(prev => ({
        ...prev,
        stage: {
          ...prev.stage,
          error: 'Please select at least 4 candidates before starting the presidential election.',
        },
        playback: { ...prev.playback, autoPlay: false },
      }));
      return;
    }

    // Check if 9router config is present
    const activeConfig = configRef.current;
    if (!activeConfig?.baseUrl || !activeConfig?.apiKey) {
      if (onRequireConfig) {
        onRequireConfig();
      }
      setState(prev => ({
        ...prev,
        stage: {
          ...prev.stage,
          isLoading: false,
          error: '9router is not configured. Please enter your 9router Endpoint, API Key, and select a Model in the settings.',
        },
        playback: { ...prev.playback, autoPlay: false },
      }));
      return;
    }

    isExecutingStep.current = true;

    setState(prev => ({
      ...prev,
      stage: { ...prev.stage, isLoading: true, error: null },
    }));

    try {
      const { phase, round, currentSpeakerIndex, activeCandidateIds, participatingCandidateIds } = state;

      // -------------------------------------------------------------
      // 1. IDLE -> START CAMPAIGN
      // -------------------------------------------------------------
      if (phase === 'IDLE') {
        sounds.playGavel();
        const firstCandidateId = activeCandidateIds[0];
        const firstCandidate = CANDIDATE_MAP.get(firstCandidateId)!;
        const electionTopic = state.electionTopic || DEFAULT_TOPIC;

        const stepDescriptor = {
          stepKey: `campaign-0-${firstCandidate.id}`,
          phase: 'CAMPAIGN' as GamePhase,
          round: 1,
          speakerId: firstCandidate.id,
          targetId: null,
          actionType: 'speech' as const,
          headline: `ROUND 1: OPENING CAMPAIGN ADDRESS — ${firstCandidate.name.toUpperCase()}`,
          llmPayload: {
            action: 'campaign_speech' as const,
            candidateId: firstCandidate.id,
            round: 1,
            activeCandidateIds,
            historyContext: {
              electionTopic,
              campaignSpeeches: {},
              precedingSpeeches: [],
            },
          }
        };

        const { content, audioBlobUrl, audioBlob } = await fetchOrConsumeStep(stepDescriptor);

        const updatedSpeeches = { ...state.campaignSpeeches, [firstCandidate.id]: content };
        setState(prev => ({
          ...prev,
          phase: 'CAMPAIGN',
          participatingCandidateIds: [...prev.activeCandidateIds],
          currentSpeakerIndex: 0,
          campaignSpeeches: updatedSpeeches,
          stage: {
            speakerId: firstCandidate.id,
            targetId: null,
            actionType: 'speech',
            headline: `ROUND 1: OPENING CAMPAIGN ADDRESS — ${firstCandidate.name.toUpperCase()}`,
            content,
            isLoading: false,
            isRevealingVotes: false,
            revealedVoteIndex: 0,
            error: null,
          },
          tickerLog: [
            {
              id: `tick-${Date.now()}`,
              type: 'system',
              message: `⚡ VALORIA ELECTION 2026: Campaign speeches officially underway with ${prev.activeCandidateIds.length} contenders.`,
              timestamp: Date.now(),
            },
            {
              id: `tick-${Date.now() + 1}`,
              type: 'speech',
              message: `${firstCandidate.name}: "${content.slice(0, 90)}..."`,
              timestamp: Date.now() + 1,
            },
            ...prev.tickerLog,
          ]
        }));

        sounds.playCandidateSignature(firstCandidate.id, 'speech');
        if (audioBlobUrl) {
          playAudioUrl(audioBlobUrl, { text: content, speakerId: firstCandidate.id });
        } else {
          playSpeechAudio(content, firstCandidate.voice?.voiceId, firstCandidate.id);
        }

        recordSessionEvent({
          type: 'campaign_speech',
          round: 1,
          speakerId: firstCandidate.id,
          speakerName: firstCandidate.name,
          content,
        });
        recordSessionAudio(
          `01_campaign_01_${firstCandidate.id}.mp3`,
          audioBlob,
          { phase: 'CAMPAIGN', round: 1, speakerId: firstCandidate.id, speakerName: firstCandidate.name, textSnippet: content.slice(0, 100) }
        );

        dispatchBackgroundPreload({
          ...state,
          phase: 'CAMPAIGN',
          currentSpeakerIndex: 0,
          campaignSpeeches: updatedSpeeches,
        });

        isExecutingStep.current = false;
        return;
      }

      // -------------------------------------------------------------
      // 2. CAMPAIGN SPEECHES
      // -------------------------------------------------------------
      if (phase === 'CAMPAIGN') {
        const nextIndex = currentSpeakerIndex + 1;

        if (nextIndex < activeCandidateIds.length) {
          const speakerId = activeCandidateIds[nextIndex];
          const speaker = CANDIDATE_MAP.get(speakerId)!;
          const electionTopic = state.electionTopic || DEFAULT_TOPIC;

          setState(prev => ({
            ...prev,
            currentSpeakerIndex: nextIndex,
            stage: {
              speakerId: speaker.id,
              targetId: null,
              actionType: 'speech',
              headline: `ROUND 1: CAMPAIGN ADDRESS — ${speaker.name.toUpperCase()}`,
              content: 'Delivering campaign address...',
              isLoading: true,
              isRevealingVotes: false,
              revealedVoteIndex: 0,
              error: null,
            },
          }));

          const preceding = activeCandidateIds.slice(0, nextIndex).map(id => {
            const c = CANDIDATE_MAP.get(id);
            return {
              candidateId: id,
              candidateName: c?.name || id,
              titleRole: c?.titleRole || 'Candidate',
              speech: state.campaignSpeeches[id] || (c ? `${c.slogan}` : 'My presidential platform'),
            };
          });

          const stepDescriptor = {
            stepKey: `campaign-${nextIndex}-${speaker.id}`,
            phase: 'CAMPAIGN' as GamePhase,
            round: 1,
            speakerId: speaker.id,
            targetId: null,
            actionType: 'speech' as const,
            headline: `ROUND 1: CAMPAIGN ADDRESS — ${speaker.name.toUpperCase()}`,
            llmPayload: {
              action: 'campaign_speech' as const,
              candidateId: speaker.id,
              round: 1,
              activeCandidateIds,
              historyContext: {
                electionTopic,
                campaignSpeeches: state.campaignSpeeches,
                precedingSpeeches: preceding,
              },
            }
          };

          const { content, audioBlobUrl, audioBlob } = await fetchOrConsumeStep(stepDescriptor);

          sounds.playCandidateSignature(speaker.id, 'speech');
          if (audioBlobUrl) {
            playAudioUrl(audioBlobUrl, { text: content, speakerId: speaker.id });
          } else {
            playSpeechAudio(content, speaker.voice?.voiceId, speaker.id);
          }

          recordSessionEvent({
            type: 'campaign_speech',
            round: 1,
            speakerId: speaker.id,
            speakerName: speaker.name,
            content,
          });
          recordSessionAudio(
            `01_campaign_${String(nextIndex + 1).padStart(2, '0')}_${speaker.id}.mp3`,
            audioBlob,
            { phase: 'CAMPAIGN', round: 1, speakerId: speaker.id, speakerName: speaker.name, textSnippet: content.slice(0, 100) }
          );

          const updatedSpeeches = { ...state.campaignSpeeches, [speaker.id]: content };
          setState(prev => ({
            ...prev,
            campaignSpeeches: updatedSpeeches,
            stage: {
              ...prev.stage,
              content,
              isLoading: false,
            },
            tickerLog: [
              {
                id: `tick-${Date.now()}`,
                type: 'speech',
                message: `${speaker.name}: "${content.slice(0, 90)}..."`,
                timestamp: Date.now(),
              },
              ...prev.tickerLog,
            ]
          }));

          dispatchBackgroundPreload({
            ...state,
            phase: 'CAMPAIGN',
            currentSpeakerIndex: nextIndex,
            campaignSpeeches: updatedSpeeches,
          });
        } else {
          // All active candidates have given campaign speeches! Transition to Round 1 ATTACK phase
          sounds.playGavel();
          const firstAttacker = CANDIDATE_MAP.get(activeCandidateIds[0])!;
          
          const preferredTargetId = resolveAttackTarget(firstAttacker.id, activeCandidateIds, {
            attacksByRound: state.attacksByRound,
            pactsByRound: state.pactsByRound,
            votesByRound: state.votesByRound,
            round: 1,
          });
          const targetCand = CANDIDATE_MAP.get(preferredTargetId);

          setState(prev => ({
            ...prev,
            phase: 'ATTACK',
            currentSpeakerIndex: 0,
            stage: {
              speakerId: firstAttacker.id,
              targetId: preferredTargetId,
              actionType: 'attack',
              headline: `ROUND ${prev.round}: LIVE ATTACK ROUND — ${firstAttacker.name.toUpperCase()}`,
              content: `Launching attack against ${CANDIDATE_MAP.get(preferredTargetId)?.name}...`,
              isLoading: true,
              isRevealingVotes: false,
              revealedVoteIndex: 0,
              error: null,
            },
            tickerLog: [
              {
                id: `tick-${Date.now()}`,
                type: 'system',
                message: `⚔️ ROUND ${prev.round} LIVE DEBATE CLASHES COMMENCED.`,
                timestamp: Date.now(),
              },
              ...prev.tickerLog,
            ]
          }));

          const stepDescriptor = {
            stepKey: `attack-r1-0-${firstAttacker.id}`,
            phase: 'ATTACK' as GamePhase,
            round: 1,
            speakerId: firstAttacker.id,
            targetId: preferredTargetId,
            actionType: 'attack' as const,
            headline: `ROUND 1: LIVE ATTACK ROUND — ${firstAttacker.name.toUpperCase()}`,
            llmPayload: {
              action: 'attack' as const,
              candidateId: firstAttacker.id,
              targetId: preferredTargetId,
              round: 1,
              activeCandidateIds,
              eliminatedCandidateIds: (state.eliminatedCandidates || []).map(e => e.candidateId),
              historyContext: {
                electionTopic: state.electionTopic || DEFAULT_TOPIC,
                campaignSpeeches: state.campaignSpeeches,
                targetSpeechQuote: state.campaignSpeeches[preferredTargetId] || targetCand?.slogan,
                targetWeaknesses: targetCand?.weaknesses,
                targetTreasuryBalance: state.candidateBudgets[preferredTargetId] ?? 100,
                targetHeatScore: 0,
                recentAttacks: [],
              },
            }
          };

          const { content, audioBlobUrl } = await fetchOrConsumeStep(stepDescriptor);

          sounds.playCandidateSignature(firstAttacker.id, 'action');
          if (audioBlobUrl) {
            playAudioUrl(audioBlobUrl, { text: content, speakerId: firstAttacker.id });
          } else {
            playSpeechAudio(content, firstAttacker.voice?.voiceId, firstAttacker.id);
          }

          const attackEvent: AttackEvent = {
            id: `atk-${Date.now()}`,
            round: 1,
            attackerId: firstAttacker.id,
            targetId: preferredTargetId,
            text: content,
            isRebuttal: false,
            voteCallTargetId: preferredTargetId,
            timestamp: Date.now(),
          };

          const round1Heat: Record<string, CandidateDebateHeat> = {
            [preferredTargetId]: {
              candidateId: preferredTargetId,
              heatScore: 1,
              accusers: [firstAttacker.id],
              rebuttalCount: 0,
              voteCallsAgainst: [firstAttacker.id],
              accusationQuotes: [content.slice(0, 80)],
            }
          };

          setState(prev => ({
            ...prev,
            attacksByRound: {
              ...prev.attacksByRound,
              [1]: [...(prev.attacksByRound[1] || []), attackEvent],
            },
            debateHeatByRound: {
              ...(prev.debateHeatByRound || {}),
              [1]: round1Heat,
            },
            stage: {
              ...prev.stage,
              content,
              isLoading: false,
            },
            tickerLog: [
              {
                id: `tick-${Date.now()}`,
                type: 'attack',
                message: `💥 ${firstAttacker.name} attacked ${CANDIDATE_MAP.get(preferredTargetId)?.name} (Heat: 1): "${content.slice(0, 80)}..."`,
                timestamp: Date.now(),
              },
              ...prev.tickerLog,
            ]
          }));

          dispatchBackgroundPreload({
            ...state,
            phase: 'ATTACK',
            currentSpeakerIndex: 0,
            attacksByRound: {
              ...state.attacksByRound,
              [1]: [attackEvent],
            },
            debateHeatByRound: {
              ...(state.debateHeatByRound || {}),
              [1]: round1Heat,
            }
          });
        }

        isExecutingStep.current = false;
        return;
      }

      // -------------------------------------------------------------
      // 3. ATTACK PHASE (Subsequent Attackers)
      // -------------------------------------------------------------
      if (phase === 'ATTACK') {
        const nextIndex = currentSpeakerIndex + 1;

        if (nextIndex < activeCandidateIds.length) {
          const attacker = CANDIDATE_MAP.get(activeCandidateIds[nextIndex])!;
          const recentAttacksThisRound = state.attacksByRound[round] || [];
          const preferredTargetId = resolveAttackTarget(attacker.id, activeCandidateIds, {
            attacksByRound: state.attacksByRound,
            pactsByRound: state.pactsByRound,
            votesByRound: state.votesByRound,
            round,
            candidateBudgets: state.candidateBudgets,
          });
          const targetCand = CANDIDATE_MAP.get(preferredTargetId);

          const priorAccusation = recentAttacksThisRound.find(a => a.targetId === attacker.id);
          const activeAccusationOnSpeaker = priorAccusation ? {
            attackerId: priorAccusation.attackerId,
            attackerName: CANDIDATE_MAP.get(priorAccusation.attackerId)?.name || priorAccusation.attackerId,
            text: priorAccusation.text,
          } : undefined;

          setState(prev => ({
            ...prev,
            currentSpeakerIndex: nextIndex,
            stage: {
              speakerId: attacker.id,
              targetId: preferredTargetId,
              actionType: 'attack',
              headline: `ROUND ${prev.round}: LIVE ATTACK ROUND — ${attacker.name.toUpperCase()}`,
              content: `Launching attack against ${CANDIDATE_MAP.get(preferredTargetId)?.name}...`,
              isLoading: true,
              isRevealingVotes: false,
              revealedVoteIndex: 0,
              error: null,
            },
          }));

          const recentAttackContext = recentAttacksThisRound.map(a => ({
            attackerName: CANDIDATE_MAP.get(a.attackerId)?.name || a.attackerId,
            targetName: CANDIDATE_MAP.get(a.targetId)?.name || a.targetId,
            text: a.text,
          }));

          const stepDescriptor = {
            stepKey: `attack-r${round}-${nextIndex}-${attacker.id}`,
            phase: 'ATTACK' as GamePhase,
            round,
            speakerId: attacker.id,
            targetId: preferredTargetId,
            actionType: 'attack' as const,
            headline: `ROUND ${round}: LIVE ATTACK ROUND — ${attacker.name.toUpperCase()}`,
            llmPayload: {
              action: 'attack' as const,
              candidateId: attacker.id,
              targetId: preferredTargetId,
              round,
              activeCandidateIds,
              eliminatedCandidateIds: (state.eliminatedCandidates || []).map(e => e.candidateId),
              historyContext: {
                electionTopic: state.electionTopic || DEFAULT_TOPIC,
                campaignSpeeches: state.campaignSpeeches,
                targetSpeechQuote: state.campaignSpeeches[preferredTargetId] || targetCand?.slogan,
                targetWeaknesses: targetCand?.weaknesses,
                targetTreasuryBalance: state.candidateBudgets[preferredTargetId] ?? 100,
                targetHeatScore: state.debateHeatByRound?.[round]?.[preferredTargetId]?.heatScore ?? 0,
                activeAccusationOnSpeaker,
                recentAttacks: recentAttackContext,
              },
            }
          };

          const { content, audioBlobUrl, audioBlob } = await fetchOrConsumeStep(stepDescriptor);

          sounds.playCandidateSignature(attacker.id, 'action');
          if (audioBlobUrl) {
            playAudioUrl(audioBlobUrl, { text: content, speakerId: attacker.id });
          } else {
            playSpeechAudio(content, attacker.voice?.voiceId, attacker.id);
          }

          const isRebuttal = !!priorAccusation;

          recordSessionEvent({
            type: 'attack',
            round,
            speakerId: attacker.id,
            speakerName: attacker.name,
            targetId: preferredTargetId,
            targetName: targetCand?.name || preferredTargetId,
            content,
            details: {
              isRebuttal,
              rebuttalAgainstName: priorAccusation ? (CANDIDATE_MAP.get(priorAccusation.attackerId)?.name || priorAccusation.attackerId) : undefined,
              voteCallTargetName: targetCand?.name || preferredTargetId,
            }
          });
          recordSessionAudio(
            `02_round${round}_attack_${String(nextIndex + 1).padStart(2, '0')}_${attacker.id}_vs_${preferredTargetId}.mp3`,
            audioBlob,
            { phase: 'ATTACK', round, speakerId: attacker.id, speakerName: attacker.name, targetId: preferredTargetId, targetName: targetCand?.name, textSnippet: content.slice(0, 100) }
          );

          const attackEvent: AttackEvent = {
            id: `atk-${Date.now()}`,
            round,
            attackerId: attacker.id,
            targetId: preferredTargetId,
            text: content,
            isRebuttal,
            rebuttalAgainstId: priorAccusation?.attackerId,
            voteCallTargetId: preferredTargetId,
            timestamp: Date.now(),
          };

          const updatedAttacks = [...(state.attacksByRound[round] || []), attackEvent];

          // Update debate heat by round
          const currentRoundHeat = { ...(state.debateHeatByRound?.[round] || {}) };
          const prevTargetHeat = currentRoundHeat[preferredTargetId] || {
            candidateId: preferredTargetId,
            heatScore: 0,
            accusers: [],
            rebuttalCount: 0,
            voteCallsAgainst: [],
            accusationQuotes: [],
          };

          const updatedTargetHeat: CandidateDebateHeat = {
            ...prevTargetHeat,
            heatScore: prevTargetHeat.heatScore + 1,
            accusers: Array.from(new Set([...prevTargetHeat.accusers, attacker.id])),
            voteCallsAgainst: Array.from(new Set([...prevTargetHeat.voteCallsAgainst, attacker.id])),
            accusationQuotes: [...prevTargetHeat.accusationQuotes, content.slice(0, 80)],
          };

          if (isRebuttal && currentRoundHeat[attacker.id]) {
            currentRoundHeat[attacker.id] = {
              ...currentRoundHeat[attacker.id],
              rebuttalCount: (currentRoundHeat[attacker.id].rebuttalCount || 0) + 1,
            };
          }
          currentRoundHeat[preferredTargetId] = updatedTargetHeat;
          const updatedDebateHeat = {
            ...(state.debateHeatByRound || {}),
            [round]: currentRoundHeat,
          };

          setState(prev => ({
            ...prev,
            attacksByRound: {
              ...prev.attacksByRound,
              [round]: updatedAttacks,
            },
            debateHeatByRound: updatedDebateHeat,
            stage: {
              ...prev.stage,
              content,
              isLoading: false,
            },
            tickerLog: [
              {
                id: `tick-${Date.now()}`,
                type: 'attack',
                message: isRebuttal
                  ? `💥🛡️ ${attacker.name} countered accusations and rallied room against ${CANDIDATE_MAP.get(preferredTargetId)?.name} (Heat: ${updatedTargetHeat.heatScore}): "${content.slice(0, 80)}..."`
                  : `💥 ${attacker.name} challenged ${CANDIDATE_MAP.get(preferredTargetId)?.name} (Heat: ${updatedTargetHeat.heatScore}): "${content.slice(0, 80)}..."`,
                timestamp: Date.now(),
              },
              ...prev.tickerLog,
            ]
          }));

          dispatchBackgroundPreload({
            ...state,
            phase: 'ATTACK',
            currentSpeakerIndex: nextIndex,
            attacksByRound: {
              ...state.attacksByRound,
              [round]: updatedAttacks,
            },
            debateHeatByRound: updatedDebateHeat,
          });
        } else {
          // All active candidates attacked! Transition to CCTV_BACKROOM (Leaked private pacts)
          sounds.playCCTVBeep();

          const updatedBudgets = { ...state.candidateBudgets };
          const updatedStrategies: Record<string, string> = { ...(state.candidateStrategies || {}) };
          const updatedEscrowContracts: EscrowContract[] = [ ...(state.escrowContracts || []) ];
          const roundPacts: BackroomPact[] = [];

          const recentAttackContext = (state.attacksByRound[round] || []).map(a => ({
            attackerName: CANDIDATE_MAP.get(a.attackerId)?.name || a.attackerId,
            targetName: CANDIDATE_MAP.get(a.targetId)?.name || a.targetId,
            text: a.text,
          }));

          const roundHeat = state.debateHeatByRound?.[round] || {};
          const heatEntries = Object.values(roundHeat);
          const topHeat = heatEntries.sort((a, b) => b.heatScore - a.heatScore)[0];
          const debateConsensusLeader = (topHeat && topHeat.heatScore > 0) ? {
            candidateId: topHeat.candidateId,
            candidateName: CANDIDATE_MAP.get(topHeat.candidateId)?.name || topHeat.candidateId,
            heatScore: topHeat.heatScore,
            accusers: topHeat.accusers.map(id => CANDIDATE_MAP.get(id)?.name || id),
            voteCalls: topHeat.voteCallsAgainst.map(id => CANDIDATE_MAP.get(id)?.name || id),
          } : undefined;

          // Generate CCTV leaked feeds for ALL active candidates
          for (let i = 0; i < activeCandidateIds.length; i++) {
            const proposer = candidates.find(c => c.id === activeCandidateIds[i]) || CANDIDATE_MAP.get(activeCandidateIds[i])!;
            const receiver = candidates.find(c => c.id === activeCandidateIds[(i + 1) % activeCandidateIds.length]) || CANDIDATE_MAP.get(activeCandidateIds[(i + 1) % activeCandidateIds.length])!;

            const stepDescriptor: StepDescriptor = {
              stepKey: `cctv-r${round}-${i}-${proposer.id}`,
              phase: 'CCTV_BACKROOM' as GamePhase,
              round,
              speakerId: proposer.id,
              targetId: receiver.id,
              actionType: 'pact' as const,
              headline: `ROUND ${round}: LEAKED CAPITOL CCTV FEED ${i + 1} OF ${activeCandidateIds.length}`,
              llmPayload: {
                action: 'backroom_pact' as const,
                candidateId: proposer.id,
                targetId: receiver.id,
                round,
                activeCandidateIds,
                historyContext: {
                  electionTopic: state.electionTopic || DEFAULT_TOPIC,
                  recentAttacks: recentAttackContext,
                  debateConsensusLeader,
                  proposerBudget: updatedBudgets[proposer.id] ?? 100,
                  receiverBudget: updatedBudgets[receiver.id] ?? 100,
                  candidateTreasuries: updatedBudgets,
                  candidateSecretStrategy: updatedStrategies[proposer.id],
                },
              }
            };

            try {
              const pPrep = await fetchOrConsumeStep(stepDescriptor);
              const pPayload = pPrep.payload;
              const actionType = pPayload?.actionType || ((updatedBudgets[proposer.id] ?? 100) >= 30 ? 'bribe' : 'pass');
              const privateStrategy = pPayload?.privateStrategy || `Maneuvering in round ${round} to eliminate rivals.`;
              updatedStrategies[proposer.id] = privateStrategy;

              // Dynamically bind to the partner chosen by the AI (targetCandidateId)
              const chosenReceiverId = (pPayload?.targetCandidateId && pPayload.targetCandidateId !== proposer.id && activeCandidateIds.includes(pPayload.targetCandidateId))
                ? pPayload.targetCandidateId
                : receiver.id;

              const actualReceiver = candidates.find(c => c.id === chosenReceiverId) || CANDIDATE_MAP.get(chosenReceiverId) || receiver;

              // Dynamically bind elimination target (must not be proposer and must not be actualReceiver)
              const validElimTargets = activeCandidateIds.filter(id => id !== proposer.id && id !== actualReceiver.id);
              const rawAgreedTargetId = pPayload?.agreedTargetId;
              const agreedTargetId = (rawAgreedTargetId && validElimTargets.includes(rawAgreedTargetId))
                ? rawAgreedTargetId
                : (validElimTargets[0] || activeCandidateIds.filter(id => id !== proposer.id)[0]);

              const receiverDecision = pPayload?.receiverDecision ?? 'accept';
              const offerPrice = pPayload?.offerPrice ?? 30;

              let bribeOffered = actionType === 'bribe';
              let upfrontPaid = 0;
              let escrowPending = 0;
              let bribeAccepted = false;

              if (actionType === 'bribe') {
                if ((updatedBudgets[proposer.id] ?? 100) >= 30) {
                  bribeAccepted = receiverDecision === 'accept' || receiverDecision === 'accept_and_betray';
                  if (bribeAccepted) {
                    updatedBudgets[proposer.id] = Math.max((updatedBudgets[proposer.id] ?? 100) - 30, 0);
                    updatedBudgets[actualReceiver.id] = (updatedBudgets[actualReceiver.id] ?? 100) + 15;
                    upfrontPaid = 15;
                    escrowPending = 15;
                    updatedEscrowContracts.push({
                      pactId: `pact-${round}-${i}-${Date.now()}`,
                      round,
                      proposerId: proposer.id,
                      receiverId: actualReceiver.id,
                      agreedTargetId,
                      actionType: 'bribe',
                      escrowAmount: 15,
                    });
                  }
                } else {
                  bribeOffered = false;
                }
              } else if (actionType === 'offer') {
                const buyerBudget = updatedBudgets[actualReceiver.id] ?? 100;
                if (buyerBudget >= offerPrice) {
                  bribeAccepted = receiverDecision === 'accept' || receiverDecision === 'accept_and_betray';
                  if (bribeAccepted) {
                    upfrontPaid = Math.floor(offerPrice / 2);
                    escrowPending = offerPrice - upfrontPaid;
                    updatedBudgets[actualReceiver.id] = Math.max(buyerBudget - offerPrice, 0);
                    updatedBudgets[proposer.id] = (updatedBudgets[proposer.id] ?? 100) + upfrontPaid;
                    updatedEscrowContracts.push({
                      pactId: `pact-${round}-${i}-${Date.now()}`,
                      round,
                      proposerId: actualReceiver.id,
                      receiverId: proposer.id,
                      agreedTargetId,
                      actionType: 'offer',
                      escrowAmount: escrowPending,
                    });
                  }
                }
              }

              let receiverAudioUrl = pPrep.receiverAudioBlobUrl;
              if (pPrep.payload?.receiverResponse && (chosenReceiverId !== stepDescriptor.targetId || !receiverAudioUrl)) {
                try {
                  const rxRes = await synthesizeSpeechAudio(pPrep.payload.receiverResponse, actualReceiver?.voice?.voiceId, actualReceiver.id);
                  if (rxRes.audioBlobUrl) {
                    receiverAudioUrl = rxRes.audioBlobUrl;
                  }
                } catch (rxErr) {
                  console.warn(`[CCTV receiver voice synthesis fallback failed for ${actualReceiver.id}]:`, rxErr);
                }
              }

              roundPacts.push({
                id: `pact-${round}-${i}-${Date.now()}`,
                round,
                proposerId: proposer.id,
                receiverId: actualReceiver.id,
                actionType,
                agreedTargetId,
                whisperText: pPrep.content,
                receiverResponse: pPrep.payload?.receiverResponse || (pPrep as any).receiverResponse,
                privateStrategy,
                audioBlobUrl: pPrep.audioBlobUrl,
                receiverAudioBlobUrl: receiverAudioUrl,
                audioBlob: pPrep.audioBlob,
                location: LOCATIONS[(round + i) % LOCATIONS.length],
                timestamp: Date.now(),
                bribeOffered,
                bribeAmount: actionType === 'bribe' ? 30 : (actionType === 'offer' ? offerPrice : 0),
                upfrontPaid,
                escrowPending,
                offerPrice: actionType === 'offer' ? offerPrice : undefined,
                receiverDecision: (actionType === 'bribe' || actionType === 'offer') ? receiverDecision : undefined,
                bribeAccepted,
                wasBetrayedByReceiver: receiverDecision === 'accept_and_betray',
              });
            } catch (err) {
              console.warn(`[CCTV feed ${i + 1} generation skipped]:`, err);
            }
          }

          // Record each generated CCTV backroom pact event and audio
          roundPacts.forEach((p, pIdx) => {
            const proposerCand = CANDIDATE_MAP.get(p.proposerId);
            const receiverCand = CANDIDATE_MAP.get(p.receiverId);
            const agreedTargetCand = CANDIDATE_MAP.get(p.agreedTargetId);

            recordSessionEvent({
              type: 'cctv_pact',
              round,
              speakerId: p.proposerId,
              speakerName: proposerCand?.name || p.proposerId,
              targetId: p.receiverId,
              targetName: receiverCand?.name || p.receiverId,
              content: p.whisperText,
              details: {
                location: p.location,
                agreedTargetName: agreedTargetCand?.name || p.agreedTargetId,
                whisperText: p.whisperText,
                receiverResponse: p.receiverResponse,
                privateStrategy: p.privateStrategy,
                bribeOffered: p.bribeOffered,
                bribeAmount: p.bribeAmount,
                upfrontPaid: p.upfrontPaid,
                escrowPending: p.escrowPending,
                receiverDecision: p.receiverDecision,
                bribeAccepted: p.bribeAccepted,
              }
            });

            if (p.audioBlob) {
              recordSessionAudio(
                `03_round${round}_cctv_${String(pIdx + 1).padStart(2, '0')}_${p.proposerId}_and_${p.receiverId}.mp3`,
                p.audioBlob,
                { phase: 'CCTV_BACKROOM', round, speakerId: p.proposerId, speakerName: proposerCand?.name, targetId: p.receiverId, targetName: receiverCand?.name, textSnippet: p.whisperText.slice(0, 100) }
              );
            }
          });

          const primaryPact = roundPacts[0];
          const primaryProposer = primaryPact ? CANDIDATE_MAP.get(primaryPact.proposerId) : null;
          const primaryReceiver = primaryPact ? CANDIDATE_MAP.get(primaryPact.receiverId) : null;

          sounds.playCCTVBeep();
          if (primaryPact) {
            playCCTVPactAudio(primaryPact);
          }

          const marketTickerMessages = roundPacts.map(p => {
            const propName = CANDIDATE_MAP.get(p.proposerId)?.name.split(' ')[0];
            const rxName = CANDIDATE_MAP.get(p.receiverId)?.name.split(' ')[0];
            const targetName = CANDIDATE_MAP.get(p.agreedTargetId)?.name.split(' ')[0];
            if (p.actionType === 'bribe') {
              if (p.receiverDecision === 'accept' || p.receiverDecision === 'accept_and_betray') {
                return `💸 $30M CCTV BRIBE: ${propName} paid $15M upfront to ${rxName} ($15M in escrow) to eliminate ${targetName}!`;
              }
              return `🚫 $30M BRIBE DECLINED: ${rxName} refused cash bribe from ${propName}!`;
            } else if (p.actionType === 'offer') {
              if (p.bribeAccepted) {
                return `🤝 VOTE OFFER ACCEPTED: ${rxName} paid $${p.upfrontPaid}M upfront to buy ${propName}'s vote against ${targetName}!`;
              }
              return `🚫 VOTE OFFER DECLINED: ${rxName} declined ${propName}'s vote offer for $${p.bribeAmount}M.`;
            }
            return `🤫 CAPITOL WIRETAP: ${propName} plotted solo in the corridor shadows.`;
          });

          setState(prev => ({
            ...prev,
            phase: 'CCTV_BACKROOM',
            currentSpeakerIndex: 0,
            candidateBudgets: updatedBudgets,
            candidateStrategies: updatedStrategies,
            escrowContracts: updatedEscrowContracts,
            pactsByRound: {
              ...prev.pactsByRound,
              [round]: roundPacts,
            },
            stage: {
              ...prev.stage,
              speakerId: primaryPact?.proposerId || null,
              targetId: primaryPact?.receiverId || null,
              actionType: 'pact',
              headline: `ROUND ${prev.round}: LEAKED CAPITOL CCTV FEED 1 OF ${roundPacts.length}`,
              content: primaryPact?.whisperText || 'Intercepting surveillance feeds...',
              isLoading: false,
              isRevealingVotes: false,
              revealedVoteIndex: 0,
              error: null,
            },
            tickerLog: [
              ...marketTickerMessages.map(msg => ({
                id: `bribe-${Date.now()}-${Math.random()}`,
                type: 'bribe' as const,
                message: msg,
                timestamp: Date.now(),
              })),
              {
                id: `tick-${Date.now()}`,
                type: 'pact',
                message: `🎥 CCTV LEAK: Surveillance intercepted ${roundPacts.length} backroom feeds in Capitol corridors!`,
                timestamp: Date.now(),
              },
              ...prev.tickerLog,
            ]
          }));

          dispatchBackgroundPreload({
            ...state,
            phase: 'CCTV_BACKROOM',
            currentSpeakerIndex: 0,
            candidateBudgets: updatedBudgets,
            candidateStrategies: updatedStrategies,
            escrowContracts: updatedEscrowContracts,
            pactsByRound: {
              ...state.pactsByRound,
              [round]: roundPacts,
            },
          });
        }

        isExecutingStep.current = false;
        return;
      }

      // -------------------------------------------------------------
      // 4. CCTV_BACKROOM -> View Next Feed OR VOTE_SECRET (Secret Voting with Pre-Bailout Escrow Settlement)
      // -------------------------------------------------------------
      if (phase === 'CCTV_BACKROOM') {
        const pactsThisRound = state.pactsByRound[round] || [];
        const nextPactIndex = currentSpeakerIndex + 1;

        // If there are more CCTV feeds to show in this round, show the next one!
        if (nextPactIndex < pactsThisRound.length) {
          const nextPact = pactsThisRound[nextPactIndex];
          const p1 = CANDIDATE_MAP.get(nextPact.proposerId);
          const p2 = CANDIDATE_MAP.get(nextPact.receiverId);

          sounds.playCCTVBeep();
          playCCTVPactAudio(nextPact);

          setState(prev => ({
            ...prev,
            currentSpeakerIndex: nextPactIndex,
            stage: {
              ...prev.stage,
              speakerId: nextPact.proposerId,
              targetId: nextPact.receiverId,
              headline: `ROUND ${prev.round}: LEAKED CAPITOL CCTV FEED ${nextPactIndex + 1} OF ${pactsThisRound.length}`,
              content: nextPact.whisperText,
              isLoading: false,
            },
            tickerLog: [
              {
                id: `tick-${Date.now()}`,
                type: 'pact',
                message: `🤫 Leaked Deal (Feed #${nextPactIndex + 1}): ${p1?.name} whispered to ${p2?.name}: "${nextPact.whisperText}"`,
                timestamp: Date.now(),
              },
              ...prev.tickerLog,
            ]
          }));

          dispatchBackgroundPreload({
            ...state,
            phase: 'CCTV_BACKROOM',
            currentSpeakerIndex: nextPactIndex,
          });

          isExecutingStep.current = false;
          return;
        }

        // All CCTV feeds watched! Transition to Secret Voting
        sounds.playGavel();

        setState(prev => ({
          ...prev,
          phase: 'VOTE_SECRET',
          stage: {
            speakerId: null,
            targetId: null,
            actionType: 'vote',
            headline: `ROUND ${prev.round}: CONFIDENTIAL ELIMINATION BALLOT`,
            content: 'Candidates are casting secret elimination ballots with the election board...',
            isLoading: true,
            isRevealingVotes: false,
            revealedVoteIndex: 0,
            error: null,
          },
          tickerLog: [
            {
              id: `tick-${Date.now()}`,
              type: 'system',
              message: `🗳️ ROUND ${prev.round} SECRET BALLOTS BEING CAST...`,
              timestamp: Date.now(),
            },
            ...prev.tickerLog,
          ]
        }));

        const recentAttacksContext = (state.attacksByRound[round] || []).map(a => ({
          attackerName: CANDIDATE_MAP.get(a.attackerId)?.name || a.attackerId,
          targetName: CANDIDATE_MAP.get(a.targetId)?.name || a.targetId,
          text: a.text,
        }));

        const roundHeat = state.debateHeatByRound?.[round] || {};
        const heatEntries = Object.values(roundHeat);
        const topHeat = heatEntries.sort((a, b) => b.heatScore - a.heatScore)[0];
        const debateConsensusLeader = (topHeat && topHeat.heatScore > 0) ? {
          candidateId: topHeat.candidateId,
          candidateName: CANDIDATE_MAP.get(topHeat.candidateId)?.name || topHeat.candidateId,
          heatScore: topHeat.heatScore,
          accusers: topHeat.accusers.map(id => CANDIDATE_MAP.get(id)?.name || id),
          voteCalls: topHeat.voteCallsAgainst.map(id => CANDIDATE_MAP.get(id)?.name || id),
        } : undefined;

        const otherActiveForKingpin = activeCandidateIds.filter(id => id !== debateConsensusLeader?.candidateId);
        const candidateWithHighestTreasury = [...otherActiveForKingpin].sort((a, b) => (state.candidateBudgets[b] ?? 100) - (state.candidateBudgets[a] ?? 100))[0];

        const votePromises = activeCandidateIds.map(async (voterId, voterIdx) => {
          // Find all pacts involving this voter
          const voterPacts = pactsThisRound.filter(p => p.proposerId === voterId || p.receiverId === voterId);
          const primaryPact = voterPacts[0];
          const allyId = primaryPact ? (primaryPact.proposerId === voterId ? primaryPact.receiverId : primaryPact.proposerId) : undefined;
          const agreedTargetId = primaryPact ? primaryPact.agreedTargetId : undefined;
          const voterCand = CANDIDATE_MAP.get(voterId);

          const stepDescriptor: StepDescriptor = {
            stepKey: `vote_confessional-r${round}-${voterIdx}-${voterId}`,
            phase: 'VOTE_CONFESSIONAL',
            round,
            speakerId: voterId,
            targetId: null,
            actionType: 'vote',
            headline: `ROUND ${round}: CONFIDENTIAL STRATEGY CONFESSIONAL (${voterIdx + 1} of ${activeCandidateIds.length})`,
            llmPayload: {
              action: 'elimination_vote',
              candidateId: voterId,
              round,
              activeCandidateIds,
              historyContext: {
                electionTopic: state.electionTopic || DEFAULT_TOPIC,
                recentAttacks: recentAttacksContext,
                debateConsensusLeader,
                candidateWithHighestTreasury,
                candidateSecretStrategy: state.candidateStrategies?.[voterId],
                candidateTreasuries: state.candidateBudgets,
                activePactsForVoter: voterPacts,
                activePact: (allyId && agreedTargetId) ? { allyId, agreedTargetId } : undefined,
              },
            },
          };

          const consumed = await fetchOrConsumeStep(stepDescriptor);
          const votePayload = consumed.payload;
          const actualTargetId = votePayload?.voteTargetId || activeCandidateIds.filter(id => id !== voterId)[0];

          // Betrayal Analysis
          let isBetrayal = false;
          let isHonoredPact = false;
          let betrayedAllyId: string | undefined;

          if (primaryPact && allyId && agreedTargetId) {
            if (actualTargetId === agreedTargetId) {
              isHonoredPact = true;
            } else {
              isBetrayal = true;
              betrayedAllyId = allyId;
            }
          }

          const targetCand = CANDIDATE_MAP.get(actualTargetId);
          const monologue = votePayload?.strategyMonologue || consumed.content || `My calculations demand that ${targetCand?.name} falls on this ballot. In this chamber, sentiment is fatal; striking them now protects my treasury and clears my path forward.`;

          // Spoken audio is pre-synthesized by fetchOrConsumeStep
          let audioBlobUrl = consumed.audioBlobUrl;
          let audioBlob = consumed.audioBlob;

          if (!audioBlobUrl) {
            try {
              const synth = await synthesizeSpeechAudio(monologue, voterCand?.voice?.voiceId, voterId);
              audioBlobUrl = synth.audioBlobUrl;
              audioBlob = synth.audioBlob;
            } catch (err) {
              console.warn('[Confessional Audio Synth Fallback Error]:', err);
            }
          }

          // Record session event for text monologue
          recordSessionEvent({
            type: 'strategy_monologue',
            round,
            voterId,
            voterName: voterCand?.name || voterId,
            targetId: actualTargetId,
            targetName: targetCand?.name || actualTargetId,
            content: monologue,
            privateReason: votePayload?.privateReason || 'Strategic elimination deliberation',
            isBetrayal,
            isHonoredPact,
          });

          // Record audio file
          if (audioBlob) {
            recordSessionAudio(
              `0${round}_strategy_vote_${String(voterIdx + 1).padStart(2, '0')}_${voterId}.mp3`,
              audioBlob,
              { phase: 'VOTE_CONFESSIONAL', round, voterId, voterName: voterCand?.name || voterId, textSnippet: monologue.slice(0, 100) }
            );
          }

          return {
            voterId,
            targetId: actualTargetId,
            reason: votePayload?.privateReason || 'Strategic elimination deliberation',
            strategyMonologue: monologue,
            audioBlobUrl,
            audioBlob,
            pactWithId: allyId,
            pactTargetId: agreedTargetId,
            isBetrayal,
            betrayedAllyId,
            isHonoredPact,
          } as VoteRecord;
        });

        const votes = await Promise.all(votePromises);

        // 💰 PRE-BAILOUT ESCROW SETTLEMENT
        const postEscrowBudgets = { ...state.candidateBudgets };
        const escrowMessages: string[] = [];

        const activeContracts = (state.escrowContracts || []).filter(c => c.round === round);
        activeContracts.forEach(contract => {
          // Check actual vote of obliged candidate (receiverId)
          const voterRecord = votes.find(v => v.voterId === contract.receiverId);
          const targetVoted = voterRecord?.targetId;
          const obligedName = CANDIDATE_MAP.get(contract.receiverId)?.name.split(' ')[0] || contract.receiverId;
          const payerName = CANDIDATE_MAP.get(contract.proposerId)?.name.split(' ')[0] || contract.proposerId;
          const targetName = CANDIDATE_MAP.get(contract.agreedTargetId)?.name.split(' ')[0] || contract.agreedTargetId;

          if (targetVoted === contract.agreedTargetId) {
            // HONORED: Release escrow to receiver
            postEscrowBudgets[contract.receiverId] = (postEscrowBudgets[contract.receiverId] ?? 100) + contract.escrowAmount;
            escrowMessages.push(`🤝 PACT HONORED: ${obligedName} voted for ${targetName} and received the final $${contract.escrowAmount}M escrow payout!`);
          } else {
            // BETRAYED: Refund escrow to proposer
            postEscrowBudgets[contract.proposerId] = (postEscrowBudgets[contract.proposerId] ?? 100) + contract.escrowAmount;
            escrowMessages.push(`🗡️ BACKROOM BETRAYAL: ${obligedName} broke the pact! $${contract.escrowAmount}M escrow refunded to ${payerName}.`);
          }
        });

        const rawTally: Record<string, number> = {};
        activeCandidateIds.forEach(id => { rawTally[id] = 0; });
        votes.forEach(v => {
          if (rawTally[v.targetId] !== undefined) {
            rawTally[v.targetId] += 1;
          } else {
            rawTally[v.targetId] = 1;
          }
        });

        // 💰 Run the $40M Vote Bailout Auction Loop with updated post-escrow budgets
        const bailoutResult = resolveBailoutAuction(
          rawTally,
          postEscrowBudgets,
          activeCandidateIds,
          round
        );

        const candidateToEliminate = bailoutResult.eliminatedId;
        const highestVotes = bailoutResult.finalTally[candidateToEliminate] || 0;
        const isTie = bailoutResult.tieBreakerOccurred;
        const betrayalsList = votes.filter(v => v.isBetrayal);

        const roundTally: RoundVoteTally = {
          round,
          votes,
          initialTally: rawTally,
          tally: bailoutResult.finalTally,
          initialBudgets: { ...postEscrowBudgets },
          eliminatedId: candidateToEliminate,
          tieBreakerOccurred: isTie,
          betrayalsCount: betrayalsList.length,
          bailoutTransactions: bailoutResult.transactions,
        };

        recordSessionEvent({
          type: 'vote_tally',
          round,
          details: {
            votes: votes.map(v => ({
              ...v,
              voterName: CANDIDATE_MAP.get(v.voterId)?.name || v.voterId,
              targetName: CANDIDATE_MAP.get(v.targetId)?.name || v.targetId,
            })),
            bailoutTransactions: bailoutResult.transactions.map(t => ({
              ...t,
              candidateName: CANDIDATE_MAP.get(t.candidateId)?.name || t.candidateId,
            })),
            eliminatedId: candidateToEliminate,
            eliminatedName: CANDIDATE_MAP.get(candidateToEliminate)?.name,
            finalVoteCount: highestVotes,
          }
        });

        if (betrayalsList.length > 0) {
          sounds.playBetrayalStab();
        } else {
          sounds.playVoteRevealDing();
        }

        const betrayalMessages = betrayalsList.map(b => {
          const voter = CANDIDATE_MAP.get(b.voterId)?.name.split(' ')[0];
          const ally = CANDIDATE_MAP.get(b.betrayedAllyId!)?.name.split(' ')[0];
          const target = CANDIDATE_MAP.get(b.targetId)?.name.split(' ')[0];
          return `🗡️ BETRAYAL: ${voter} broke secret pact with ${ally} and voted for ${target}!`;
        });

        const bailoutMessages = bailoutResult.transactions.map(tx => {
          const cand = CANDIDATE_MAP.get(tx.candidateId)?.name.split(' ')[0];
          return `💰 BAILOUT: ${cand} paid $40M to cancel 1 elimination vote! ($${tx.remainingBudget}M balance left).`;
        });

        const firstVote = votes[0];
        const firstVoter = CANDIDATE_MAP.get(firstVote?.voterId || '');

        setState(prev => ({
          ...prev,
          phase: 'VOTE_CONFESSIONAL',
          currentSpeakerIndex: 0,
          candidateBudgets: bailoutResult.finalBudgets,
          votesByRound: { ...prev.votesByRound, [round]: roundTally },
          stage: {
            speakerId: firstVote?.voterId || null,
            targetId: firstVote?.targetId || null,
            actionType: 'vote',
            headline: `ROUND ${prev.round}: CONFIDENTIAL STRATEGY CONFESSIONAL (1 of ${votes.length})`,
            content: firstVote?.strategyMonologue || 'Confidential strategic deliberation...',
            isLoading: false,
            isRevealingVotes: false,
            revealedVoteIndex: 0,
            error: null,
          },
          tickerLog: [
            ...escrowMessages.map(msg => ({
              id: `escrow-${Date.now()}-${Math.random()}`,
              type: 'bribe' as const,
              message: msg,
              timestamp: Date.now(),
            })),
            ...bailoutMessages.map(msg => ({
              id: `bailout-${Date.now()}-${Math.random()}`,
              type: 'bailout' as const,
              message: msg,
              timestamp: Date.now(),
            })),
            ...betrayalMessages.map(msg => ({
              id: `betray-${Date.now()}-${Math.random()}`,
              type: 'betrayal' as const,
              message: msg,
              timestamp: Date.now(),
            })),
            {
              id: `tick-${Date.now()}`,
              type: 'vote',
              message: `📊 Round ${round} Results: ${CANDIDATE_MAP.get(candidateToEliminate)?.name} eliminated with ${highestVotes} votes.`,
              timestamp: Date.now(),
            },
            ...prev.tickerLog,
          ]
        }));

        if (firstVote?.audioBlobUrl) {
          playAudioUrl(firstVote.audioBlobUrl, { isCCTV: false, text: firstVote.strategyMonologue, speakerId: firstVote.voterId });
        } else if (firstVote?.strategyMonologue) {
          playSpeechAudio(firstVote.strategyMonologue, firstVoter?.voice?.voiceId, firstVote.voterId, { isCCTV: false });
        }

        dispatchBackgroundPreload({
          ...state,
          phase: 'VOTE_CONFESSIONAL',
          currentSpeakerIndex: 0,
          candidateBudgets: bailoutResult.finalBudgets,
          votesByRound: { ...state.votesByRound, [round]: roundTally },
        });

        isExecutingStep.current = false;
        return;
      }

      // -------------------------------------------------------------
      // 4b. STRATEGIC VOTER CONFESSIONALS (Full-screen internal monologues before ballot reveal)
      if (phase === 'VOTE_CONFESSIONAL') {
        const isFinal = round === 99 || state.phase === 'FINAL_VOTE';
        const tally = isFinal ? state.finalVoteTally : state.votesByRound[round];
        const votesList = tally?.votes || [];
        const nextVoterIdx = currentSpeakerIndex + 1;

        if (nextVoterIdx < votesList.length) {
          const nextVote = votesList[nextVoterIdx];
          const nextVoter = CANDIDATE_MAP.get(nextVote.voterId);

          setState(prev => ({
            ...prev,
            currentSpeakerIndex: nextVoterIdx,
            stage: {
              ...prev.stage,
              speakerId: nextVote.voterId,
              targetId: nextVote.targetId,
              headline: `ROUND ${prev.round}: CONFIDENTIAL STRATEGY CONFESSIONAL (${nextVoterIdx + 1} of ${votesList.length})`,
              content: nextVote.strategyMonologue || 'Confidential strategic deliberation...',
              isLoading: false,
            },
            tickerLog: [
              {
                id: `tick-${Date.now()}`,
                type: 'vote',
                message: `🔒 ${nextVoter?.name} Strategy: "${(nextVote.strategyMonologue || '').slice(0, 80)}..."`,
                timestamp: Date.now(),
              },
              ...prev.tickerLog,
            ]
          }));

          if (nextVote.audioBlobUrl) {
            playAudioUrl(nextVote.audioBlobUrl, { text: nextVote.strategyMonologue, speakerId: nextVote.voterId });
          } else if (nextVote.strategyMonologue) {
            playSpeechAudio(nextVote.strategyMonologue, nextVoter?.voice?.voiceId, nextVote.voterId);
          }

          isExecutingStep.current = false;
          return;
        } else {
          // All confessionals concluded! Transition to ballot reveal
          sounds.playVoteRevealDing();

          if (isFinal) {
            setState(prev => ({
              ...prev,
              phase: 'FINAL_REVEAL',
              stage: {
                ...prev.stage,
                speakerId: prev.winnerId,
                targetId: null,
                actionType: 'vote',
                headline: 'VALORIA PRESIDENTIAL ELECTION RESULTS',
                content: `${CANDIDATE_MAP.get(prev.winnerId || '')?.name} secured the presidency!`,
                isLoading: false,
                isRevealingVotes: true,
                revealedVoteIndex: votesList.length,
                error: null,
              },
            }));
          } else {
            const elimId = tally?.eliminatedId || '';
            const elimName = CANDIDATE_MAP.get(elimId)?.name;
            const highestVotes = tally?.tally?.[elimId] || 0;

            setState(prev => ({
              ...prev,
              phase: 'VOTE_REVEAL',
              stage: {
                ...prev.stage,
                speakerId: null,
                targetId: elimId || null,
                actionType: 'vote',
                headline: `ROUND ${prev.round}: ELIMINATION VOTE TOTALS & BAILOUT AUCTION`,
                content: `Ballots counted & $40 vote buyouts completed. ${elimName} has the highest remaining votes (${highestVotes} votes) and is out of funds.`,
                isLoading: false,
                isRevealingVotes: true,
                revealedVoteIndex: votesList.length,
                error: null,
              },
            }));
          }

          isExecutingStep.current = false;
          return;
        }
      }

      // -------------------------------------------------------------
      // 5. VOTE REVEAL -> ELIMINATION ANNOUNCEMENT & EXIT WORDS
      if (phase === 'VOTE_REVEAL') {
        const roundTally = state.votesByRound[round];
        const eliminatedId = roundTally?.eliminatedId || activeCandidateIds[0];
        const eliminatedCandidate = CANDIDATE_MAP.get(eliminatedId)!;

        sounds.playEliminationBuzzer();

        setState(prev => ({
          ...prev,
          phase: 'ELIMINATION',
          stage: {
            speakerId: eliminatedId,
            targetId: null,
            actionType: 'eliminated',
            headline: `ROUND ${prev.round} ELIMINATION — ${eliminatedCandidate.name.toUpperCase()}`,
            content: 'Recording concession statement...',
            isLoading: true,
            isRevealingVotes: false,
            revealedVoteIndex: 0,
            error: null,
          },
          tickerLog: [
            {
              id: `tick-${Date.now()}`,
              type: 'elimination',
              message: `❌ CONCESSION: ${eliminatedCandidate.name} has been eliminated from the Valoria Presidential Race!`,
              timestamp: Date.now(),
            },
            ...prev.tickerLog,
          ]
        }));

        const wasBetrayed = Boolean(roundTally?.votes.some(v => v.targetId === eliminatedId && v.isBetrayal));
        const betrayingVoter = roundTally?.votes.find(v => v.targetId === eliminatedId && v.isBetrayal)?.voterId;
        const betrayerName = betrayingVoter ? CANDIDATE_MAP.get(betrayingVoter)?.name : undefined;
        const voteCountAgainst = roundTally?.tally[eliminatedId] || 0;

        const stepDescriptor = {
          stepKey: `elimination-r${round}-${eliminatedCandidate.id}`,
          phase: 'ELIMINATION' as GamePhase,
          round,
          speakerId: eliminatedCandidate.id,
          targetId: null,
          actionType: 'eliminated' as const,
          headline: `ROUND ${round} ELIMINATION — ${eliminatedCandidate.name.toUpperCase()}`,
          llmPayload: {
            action: 'exit_words' as const,
            candidateId: eliminatedCandidate.id,
            round,
            activeCandidateIds,
            historyContext: {
              electionTopic: state.electionTopic || DEFAULT_TOPIC,
              betrayalContext: {
                wasBetrayed,
                betrayedByCandidateName: betrayerName,
                voteCountAgainstSelf: voteCountAgainst,
              },
            },
          }
        };

        const { content, audioBlobUrl, audioBlob } = await fetchOrConsumeStep(stepDescriptor);

        sounds.playCandidateSignature(eliminatedCandidate.id, 'speech');
        if (audioBlobUrl) {
          playAudioUrl(audioBlobUrl, { text: content, speakerId: eliminatedCandidate.id });
        } else {
          playSpeechAudio(content, eliminatedCandidate.voice?.voiceId, eliminatedCandidate.id);
        }

        recordSessionEvent({
          type: 'elimination',
          round,
          speakerId: eliminatedCandidate.id,
          speakerName: eliminatedCandidate.name,
          content,
          details: { voteCount: roundTally?.tally[eliminatedId] || 0 }
        });
        recordSessionAudio(
          `04_round${round}_elimination_${eliminatedCandidate.id}.mp3`,
          audioBlob,
          { phase: 'ELIMINATION', round, speakerId: eliminatedCandidate.id, speakerName: eliminatedCandidate.name, textSnippet: content.slice(0, 100) }
        );

        const newActiveIds = activeCandidateIds.filter(id => id !== eliminatedId);
        const eliminatedInfo = {
          candidateId: eliminatedId,
          eliminatedInRound: round,
          voteCount: roundTally?.tally[eliminatedId] || 0,
          exitWords: content,
        };

        // Evict any buffered future steps referencing this eliminated candidate as speaker or target
        for (const [key, prep] of preparedStepsRef.current.entries()) {
          if (
            prep.speakerId === eliminatedId ||
            prep.targetId === eliminatedId ||
            prep.payload?.targetCandidateId === eliminatedId ||
            prep.payload?.candidateId === eliminatedId ||
            key.includes(eliminatedId)
          ) {
            console.log(`[Elimination Cache Purge]: Purging stale cached step "${key}" referencing eliminated candidate ${eliminatedId}`);
            preparedStepsRef.current.delete(key);
            lookaheadBufferRef.current.delete(key);
          }
        }
        setLookaheadBufferCount(preparedStepsRef.current.size);

        setState(prev => ({
          ...prev,
          activeCandidateIds: newActiveIds,
          eliminatedCandidates: [...prev.eliminatedCandidates, eliminatedInfo],
          stage: {
            ...prev.stage,
            content: `"${content}"`,
            isLoading: false,
          },
          tickerLog: [
            {
              id: `tick-${Date.now()}`,
              type: 'speech',
              message: `${eliminatedCandidate.name} Concession: "${content}"`,
              timestamp: Date.now(),
            },
            ...prev.tickerLog,
          ]
        }));

        dispatchBackgroundPreload({
          ...state,
          phase: 'ELIMINATION',
          activeCandidateIds: newActiveIds,
        });

        isExecutingStep.current = false;
        return;
      }

      // -------------------------------------------------------------
      // 6. POST-ELIMINATION: Next Attack Round or Final 3 Speeches
      // -------------------------------------------------------------
      if (phase === 'ELIMINATION') {
        if (activeCandidateIds.length > 3) {
          sounds.playGavel();
          const nextRound = round + 1;
          const firstAttacker = CANDIDATE_MAP.get(activeCandidateIds[0])!;
          const preferredTargetId = resolveAttackTarget(firstAttacker.id, activeCandidateIds, {
            attacksByRound: state.attacksByRound,
            pactsByRound: state.pactsByRound,
            votesByRound: state.votesByRound,
            round: nextRound,
          });
          const targetCand = CANDIDATE_MAP.get(preferredTargetId);

          setState(prev => ({
            ...prev,
            phase: 'ATTACK',
            round: nextRound,
            currentSpeakerIndex: 0,
            stage: {
              speakerId: firstAttacker.id,
              targetId: preferredTargetId,
              actionType: 'attack',
              headline: `ROUND ${nextRound}: LIVE ATTACK ROUND — ${firstAttacker.name.toUpperCase()}`,
              content: `Launching attack against ${CANDIDATE_MAP.get(preferredTargetId)?.name}...`,
              isLoading: true,
              isRevealingVotes: false,
              revealedVoteIndex: 0,
              error: null,
            },
            tickerLog: [
              {
                id: `tick-${Date.now()}`,
                type: 'system',
                message: `⚡ ADVANCING TO ROUND ${nextRound}. ${activeCandidateIds.length} presidential contenders remain.`,
                timestamp: Date.now(),
              },
              ...prev.tickerLog,
            ]
          }));

          const stepDescriptor: StepDescriptor = {
            stepKey: `attack-r${nextRound}-0-${firstAttacker.id}`,
            phase: 'ATTACK' as GamePhase,
            round: nextRound,
            speakerId: firstAttacker.id,
            targetId: preferredTargetId,
            actionType: 'attack' as const,
            headline: `ROUND ${nextRound}: LIVE ATTACK ROUND — ${firstAttacker.name.toUpperCase()}`,
            llmPayload: {
              action: 'attack' as const,
              candidateId: firstAttacker.id,
              targetId: preferredTargetId,
              round: nextRound,
              activeCandidateIds,
              eliminatedCandidateIds: (state.eliminatedCandidates || []).map(e => e.candidateId),
              historyContext: {
                electionTopic: state.electionTopic || DEFAULT_TOPIC,
                campaignSpeeches: state.campaignSpeeches,
                targetSpeechQuote: state.campaignSpeeches[preferredTargetId] || targetCand?.slogan,
                targetWeaknesses: targetCand?.weaknesses,
                targetTreasuryBalance: state.candidateBudgets[preferredTargetId] ?? 100,
                targetHeatScore: 0,
                recentAttacks: [],
              },
            }
          };

          const { content, audioBlobUrl } = await fetchOrConsumeStep(stepDescriptor);

          sounds.playAttackSting();
          if (audioBlobUrl) {
            playAudioUrl(audioBlobUrl, { text: content, speakerId: firstAttacker.id });
          } else {
            playSpeechAudio(content, firstAttacker.voice?.voiceId, firstAttacker.id);
          }

          const attackEvent: AttackEvent = {
            id: `atk-${Date.now()}`,
            round: nextRound,
            attackerId: firstAttacker.id,
            targetId: preferredTargetId,
            text: content,
            isRebuttal: false,
            voteCallTargetId: preferredTargetId,
            timestamp: Date.now(),
          };

          const roundHeat: Record<string, CandidateDebateHeat> = {
            [preferredTargetId]: {
              candidateId: preferredTargetId,
              heatScore: 1,
              accusers: [firstAttacker.id],
              rebuttalCount: 0,
              voteCallsAgainst: [firstAttacker.id],
              accusationQuotes: [content.slice(0, 80)],
            }
          };

          setState(prev => ({
            ...prev,
            attacksByRound: {
              ...prev.attacksByRound,
              [nextRound]: [attackEvent],
            },
            debateHeatByRound: {
              ...(prev.debateHeatByRound || {}),
              [nextRound]: roundHeat,
            },
            stage: {
              ...prev.stage,
              content,
              isLoading: false,
            },
            tickerLog: [
              {
                id: `tick-${Date.now()}`,
                type: 'attack',
                message: `💥 ${firstAttacker.name} challenged ${CANDIDATE_MAP.get(preferredTargetId)?.name} (Heat: 1): "${content.slice(0, 80)}..."`,
                timestamp: Date.now(),
              },
              ...prev.tickerLog,
            ]
          }));

          dispatchBackgroundPreload({
            ...state,
            phase: 'ATTACK',
            round: nextRound,
            currentSpeakerIndex: 0,
            attacksByRound: {
              ...state.attacksByRound,
              [nextRound]: [attackEvent],
            },
            debateHeatByRound: {
              ...(state.debateHeatByRound || {}),
              [nextRound]: roundHeat,
            }
          });
        } else {
          // Exactly 3 candidates remain -> FINAL PRESIDENTIAL SPEECHES!
          sounds.playGavel();
          const firstFinalist = CANDIDATE_MAP.get(activeCandidateIds[0])!;
          const elimSummary = state.eliminatedCandidates.map(e => ({
            candidateName: CANDIDATE_MAP.get(e.candidateId)?.name || e.candidateId,
            candidateId: e.candidateId,
            round: e.eliminatedInRound,
            exitWords: e.exitWords,
          }));

          setState(prev => ({
            ...prev,
            phase: 'FINAL_SPEECHES',
            currentSpeakerIndex: 0,
            stage: {
              speakerId: firstFinalist.id,
              targetId: null,
              actionType: 'speech',
              headline: `THE FINAL 3 SHOWDOWN: CLOSING ARGUMENT — ${firstFinalist.name.toUpperCase()}`,
              content: 'Delivering final appeal to the Grand Jury and the nation...',
              isLoading: true,
              isRevealingVotes: false,
              revealedVoteIndex: 0,
              error: null,
            },
            tickerLog: [
              {
                id: `tick-${Date.now()}`,
                type: 'system',
                message: `👑 TOP 3 FINALISTS REACHED! Final presidential appeals commence now.`,
                timestamp: Date.now(),
              },
              ...prev.tickerLog,
            ]
          }));

          const stepDescriptor = {
            stepKey: `final_speech-0-${firstFinalist.id}`,
            phase: 'FINAL_SPEECHES' as GamePhase,
            round,
            speakerId: firstFinalist.id,
            targetId: null,
            actionType: 'speech' as const,
            headline: `THE FINAL 3 SHOWDOWN: CLOSING ARGUMENT — ${firstFinalist.name.toUpperCase()}`,
            llmPayload: {
              action: 'final_speech' as const,
              candidateId: firstFinalist.id,
              round,
              activeCandidateIds,
              finalistIds: activeCandidateIds,
              historyContext: {
                electionTopic: state.electionTopic || DEFAULT_TOPIC,
                campaignSpeeches: state.campaignSpeeches,
                eliminatedCandidatesSummary: elimSummary,
              },
            }
          };

          const { content, audioBlobUrl, audioBlob } = await fetchOrConsumeStep(stepDescriptor);

          sounds.playCandidateSignature(firstFinalist.id, 'speech');
          if (audioBlobUrl) {
            playAudioUrl(audioBlobUrl, { text: content, speakerId: firstFinalist.id });
          } else {
            playSpeechAudio(content, firstFinalist.voice?.voiceId, firstFinalist.id);
          }

          recordSessionEvent({
            type: 'final_speech',
            round: 99,
            speakerId: firstFinalist.id,
            speakerName: firstFinalist.name,
            content,
          });
          recordSessionAudio(
            `05_final_speech_01_${firstFinalist.id}.mp3`,
            audioBlob,
            { phase: 'FINAL_SPEECHES', round: 99, speakerId: firstFinalist.id, speakerName: firstFinalist.name, textSnippet: content.slice(0, 100) }
          );

          const updatedFinalSpeeches = { ...state.finalSpeeches, [firstFinalist.id]: content };
          setState(prev => ({
            ...prev,
            finalSpeeches: updatedFinalSpeeches,
            stage: {
              ...prev.stage,
              content,
              isLoading: false,
            },
            tickerLog: [
              {
                id: `tick-${Date.now()}`,
                type: 'speech',
                message: `👑 ${firstFinalist.name} Final Appeal: "${content.slice(0, 80)}..."`,
                timestamp: Date.now(),
              },
              ...prev.tickerLog,
            ]
          }));

          dispatchBackgroundPreload({
            ...state,
            phase: 'FINAL_SPEECHES',
            currentSpeakerIndex: 0,
            finalSpeeches: updatedFinalSpeeches,
          });
        }

        isExecutingStep.current = false;
        return;
      }

      // -------------------------------------------------------------
      // 7. FINAL SPEECHES (3 Finalists)
      // -------------------------------------------------------------
      if (phase === 'FINAL_SPEECHES') {
        const nextIndex = currentSpeakerIndex + 1;

        if (nextIndex < activeCandidateIds.length) {
          const finalist = CANDIDATE_MAP.get(activeCandidateIds[nextIndex])!;
          const elimSummary = state.eliminatedCandidates.map(e => ({
            candidateName: CANDIDATE_MAP.get(e.candidateId)?.name || e.candidateId,
            candidateId: e.candidateId,
            round: e.eliminatedInRound,
            exitWords: e.exitWords,
          }));

          setState(prev => ({
            ...prev,
            currentSpeakerIndex: nextIndex,
            stage: {
              speakerId: finalist.id,
              targetId: null,
              actionType: 'speech',
              headline: `THE FINAL 3 SHOWDOWN: CLOSING ARGUMENT — ${finalist.name.toUpperCase()}`,
              content: 'Delivering final appeal to the Grand Jury...',
              isLoading: true,
              isRevealingVotes: false,
              revealedVoteIndex: 0,
              error: null,
            },
          }));

          const stepDescriptor = {
            stepKey: `final_speech-${nextIndex}-${finalist.id}`,
            phase: 'FINAL_SPEECHES' as GamePhase,
            round,
            speakerId: finalist.id,
            targetId: null,
            actionType: 'speech' as const,
            headline: `THE FINAL 3 SHOWDOWN: CLOSING ARGUMENT — ${finalist.name.toUpperCase()}`,
            llmPayload: {
              action: 'final_speech' as const,
              candidateId: finalist.id,
              round,
              activeCandidateIds,
              finalistIds: activeCandidateIds,
              historyContext: {
                electionTopic: state.electionTopic || DEFAULT_TOPIC,
                campaignSpeeches: state.campaignSpeeches,
                eliminatedCandidatesSummary: elimSummary,
              },
            }
          };

          const { content, audioBlobUrl, audioBlob } = await fetchOrConsumeStep(stepDescriptor);

          sounds.playCandidateSignature(finalist.id, 'speech');
          if (audioBlobUrl) {
            playAudioUrl(audioBlobUrl, { text: content, speakerId: finalist.id });
          } else {
            playSpeechAudio(content, finalist.voice?.voiceId, finalist.id);
          }

          recordSessionEvent({
            type: 'final_speech',
            round: 99,
            speakerId: finalist.id,
            speakerName: finalist.name,
            content,
          });
          recordSessionAudio(
            `05_final_speech_${String(nextIndex + 1).padStart(2, '0')}_${finalist.id}.mp3`,
            audioBlob,
            { phase: 'FINAL_SPEECHES', round: 99, speakerId: finalist.id, speakerName: finalist.name, textSnippet: content.slice(0, 100) }
          );

          const updatedFinalSpeeches = { ...state.finalSpeeches, [finalist.id]: content };
          setState(prev => ({
            ...prev,
            finalSpeeches: updatedFinalSpeeches,
            stage: {
              ...prev.stage,
              content,
              isLoading: false,
            },
            tickerLog: [
              {
                id: `tick-${Date.now()}`,
                type: 'speech',
                message: `👑 ${finalist.name} Final Appeal: "${content.slice(0, 80)}..."`,
                timestamp: Date.now(),
              },
              ...prev.tickerLog,
            ]
          }));

          dispatchBackgroundPreload({
            ...state,
            phase: 'FINAL_SPEECHES',
            currentSpeakerIndex: nextIndex,
            finalSpeeches: updatedFinalSpeeches,
          });
        } else {
          // All 3 finalists delivered speeches! Transition to FINAL GRAND JURY VOTE
          sounds.playGavel();

          setState(prev => ({
            ...prev,
            phase: 'FINAL_VOTE',
            stage: {
              speakerId: null,
              targetId: null,
              actionType: 'vote',
              headline: 'GRAND JURY VOTE: ELECTING THE PRESIDENT OF VALORIA',
              content: `All ${participatingCandidateIds.length} election members (finalists & jury) are casting their secret final votes...`,
              isLoading: true,
              isRevealingVotes: false,
              revealedVoteIndex: 0,
              error: null,
            },
            tickerLog: [
              {
                id: `tick-${Date.now()}`,
                type: 'system',
                message: `🏛️ GRAND JURY CONVENED. All ${participatingCandidateIds.length} participating members casting their final ballots!`,
                timestamp: Date.now(),
              },
              ...prev.tickerLog,
            ]
          }));

          const allClashesSummary = Object.entries(state.attacksByRound).flatMap(([r, atks]) => 
            atks.map(a => `${CANDIDATE_MAP.get(a.attackerId)?.name} attacked ${CANDIDATE_MAP.get(a.targetId)?.name}: "${a.text}"`)
          );

          // Gather final votes from all participating candidates with strategic monologues
          const votePromises = participatingCandidateIds.map(async (voterId, voterIdx) => {
            const voterCand = CANDIDATE_MAP.get(voterId);
            const stepDescriptor: StepDescriptor = {
              stepKey: `grand_jury_vote-${voterIdx}-${voterId}`,
              phase: 'VOTE_CONFESSIONAL',
              round: 99,
              speakerId: voterId,
              targetId: null,
              actionType: 'vote',
              headline: `GRAND JURY STRATEGY CONFESSIONAL (${voterIdx + 1} of ${participatingCandidateIds.length})`,
              llmPayload: {
                action: 'final_vote',
                candidateId: voterId,
                round: 99,
                activeCandidateIds,
                finalistIds: activeCandidateIds,
                historyContext: {
                  electionTopic: state.electionTopic || DEFAULT_TOPIC,
                  allClashesSummary,
                },
              },
            };

            const consumed = await fetchOrConsumeStep(stepDescriptor);
            const votePayload = consumed.payload;
            const actualTargetId = votePayload?.voteTargetId || activeCandidateIds[0];
            const targetCand = CANDIDATE_MAP.get(actualTargetId);
            const monologue = votePayload?.strategyMonologue || consumed.content || `My vote for President goes to ${targetCand?.name}. They demonstrated the strength, vision, and steel necessary to lead Valoria forward.`;

            let audioBlobUrl = consumed.audioBlobUrl;
            let audioBlob = consumed.audioBlob;

            if (!audioBlobUrl) {
              try {
                const synth = await synthesizeSpeechAudio(monologue, voterCand?.voice?.voiceId, voterId);
                audioBlobUrl = synth.audioBlobUrl;
                audioBlob = synth.audioBlob;
              } catch (err) {
                console.warn('[Grand Jury Audio Synth Fallback Error]:', err);
              }
            }

            recordSessionEvent({
              type: 'strategy_monologue',
              round: 99,
              voterId,
              voterName: voterCand?.name || voterId,
              targetId: actualTargetId,
              targetName: targetCand?.name || actualTargetId,
              content: monologue,
              privateReason: votePayload?.privateReason || 'Grand Jury final vote',
            });

            if (audioBlob) {
              recordSessionAudio(
                `99_strategy_jury_${String(voterIdx + 1).padStart(2, '0')}_${voterId}.mp3`,
                audioBlob,
                { phase: 'VOTE_CONFESSIONAL', round: 99, voterId, voterName: voterCand?.name || voterId, textSnippet: monologue.slice(0, 100) }
              );
            }

            return {
              voterId,
              targetId: actualTargetId,
              reason: votePayload?.privateReason || 'Grand Jury final vote',
              strategyMonologue: monologue,
              audioBlobUrl,
              audioBlob,
            } as VoteRecord;
          });

          const votes = await Promise.all(votePromises);

          const tally: Record<string, number> = {};
          activeCandidateIds.forEach(id => { tally[id] = 0; });
          votes.forEach(v => {
            if (tally[v.targetId] !== undefined) {
              tally[v.targetId] += 1;
            } else {
              tally[v.targetId] = 1;
            }
          });

          let highestVotes = -1;
          let electedWinnerId = activeCandidateIds[0];

          Object.entries(tally).forEach(([fid, count]) => {
            if (count > highestVotes) {
              highestVotes = count;
              electedWinnerId = fid;
            }
          });

          const finalTally: RoundVoteTally = {
            round: 99,
            votes,
            tally,
            initialBudgets: { ...state.candidateBudgets },
            eliminatedId: null,
          };

          recordSessionEvent({
            type: 'final_vote',
            round: 99,
            details: {
              votes: votes.map(v => ({
                ...v,
                voterName: CANDIDATE_MAP.get(v.voterId)?.name || v.voterId,
                targetName: CANDIDATE_MAP.get(v.targetId)?.name || v.targetId,
              })),
              winnerId: electedWinnerId,
              winnerName: CANDIDATE_MAP.get(electedWinnerId)?.name,
            }
          });

          const firstJuryVote = votes[0];
          const firstJuryVoter = CANDIDATE_MAP.get(firstJuryVote?.voterId || '');

          setState(prev => ({
            ...prev,
            phase: 'VOTE_CONFESSIONAL',
            currentSpeakerIndex: 0,
            finalVoteTally: finalTally,
            winnerId: electedWinnerId,
            stage: {
              speakerId: firstJuryVote?.voterId || null,
              targetId: firstJuryVote?.targetId || null,
              actionType: 'vote',
              headline: `GRAND JURY STRATEGY CONFESSIONAL (1 of ${votes.length})`,
              content: firstJuryVote?.strategyMonologue || 'Grand Jury strategic deliberation...',
              isLoading: false,
              isRevealingVotes: false,
              revealedVoteIndex: 0,
              error: null,
            },
            tickerLog: [
              {
                id: `tick-${Date.now()}`,
                type: 'vote',
                message: `🏛️ GRAND JURY: ${firstJuryVoter?.name} casting final presidential ballot.`,
                timestamp: Date.now(),
              },
              ...prev.tickerLog,
            ]
          }));

          if (firstJuryVote?.audioBlobUrl) {
            playAudioUrl(firstJuryVote.audioBlobUrl, { text: firstJuryVote.strategyMonologue, speakerId: firstJuryVote.voterId });
          } else if (firstJuryVote?.strategyMonologue) {
            playSpeechAudio(firstJuryVote.strategyMonologue, firstJuryVoter?.voice?.voiceId, firstJuryVote.voterId);
          }
        }

        isExecutingStep.current = false;
        return;
      }

      // -------------------------------------------------------------
      // 8. FINAL REVEAL -> WINNER CORONATION & INAUGURAL SPEECH
      // -------------------------------------------------------------
      if (phase === 'FINAL_REVEAL') {
        const winner = CANDIDATE_MAP.get(state.winnerId || activeCandidateIds[0])!;
        sounds.playFanfare();

        setState(prev => ({
          ...prev,
          phase: 'WINNER',
          stage: {
            speakerId: winner.id,
            targetId: null,
            actionType: 'winner',
            headline: `PRESIDENT OF THE REPUBLIC OF VALORIA: ${winner.name.toUpperCase()}`,
            content: 'Delivering inaugural presidential address to the nation...',
            isLoading: true,
            isRevealingVotes: false,
            revealedVoteIndex: 0,
            error: null,
          },
          tickerLog: [
            {
              id: `tick-${Date.now()}`,
              type: 'winner',
              message: `🎉 INAUGURATION: ${winner.name} officially inaugurated as President of the Republic of Valoria!`,
              timestamp: Date.now(),
            },
            ...prev.tickerLog,
          ]
        }));

        const stepDescriptor = {
          stepKey: `winner-${winner.id}`,
          phase: 'WINNER' as GamePhase,
          round: 100,
          speakerId: winner.id,
          targetId: null,
          actionType: 'winner' as const,
          headline: `PRESIDENT OF THE REPUBLIC OF VALORIA: ${winner.name.toUpperCase()}`,
          llmPayload: {
            action: 'victory_speech' as const,
            candidateId: winner.id,
            round: 100,
            activeCandidateIds: [winner.id],
            historyContext: {
              electionTopic: state.electionTopic || DEFAULT_TOPIC,
            },
          }
        };

        const { content, audioBlobUrl, audioBlob } = await fetchOrConsumeStep(stepDescriptor);

        if (audioBlobUrl) {
          playAudioUrl(audioBlobUrl, { text: content, speakerId: winner.id });
        } else {
          playSpeechAudio(content, winner.voice?.voiceId, winner.id);
        }

        recordSessionEvent({
          type: 'winner',
          round: 100,
          speakerId: winner.id,
          speakerName: winner.name,
          content,
        });
        recordSessionAudio(
          `06_presidential_inauguration_${winner.id}.mp3`,
          audioBlob,
          { phase: 'WINNER', round: 100, speakerId: winner.id, speakerName: winner.name, textSnippet: content.slice(0, 100) }
        );
        recordSessionFinish(winner.id, winner.name, content);

        setState(prev => ({
          ...prev,
          victorySpeech: content,
          stage: {
            ...prev.stage,
            content,
            isLoading: false,
          },
          tickerLog: [
            {
              id: `tick-${Date.now()}`,
              type: 'speech',
              message: `🏛️ PRESIDENT ${winner.name}: "${content}"`,
              timestamp: Date.now(),
            },
            ...prev.tickerLog,
          ]
        }));

        isExecutingStep.current = false;
        return;
      }

      isExecutingStep.current = false;
    } catch (err: any) {
      console.error('[Game Engine Error]:', err);
      setState(prev => ({
        ...prev,
        stage: {
          ...prev.stage,
          isLoading: false,
          error: err.message || 'Error occurred during 9router AI generation step',
        },
        playback: {
          ...prev.playback,
          autoPlay: false,
        },
        tickerLog: [
          {
            id: `tick-${Date.now()}`,
            type: 'system',
            message: `⚠️ 9router Error: ${err.message}. Click 'Retry Step' or check your 9router settings.`,
            timestamp: Date.now(),
          },
          ...prev.tickerLog,
        ]
      }));
      isExecutingStep.current = false;
    }
  }, [state, onRequireConfig]);

  /**
   * Full-Round & Autonomous Whole-Game Pre-Buffering Engine
   * Executes phased pre-buffering wave-by-wave so every step has 100% real context:
   * Wave 1: Round 1 Campaign Speeches (captures actual speech texts)
   * Wave 2: Round 1 Attacks (uses real campaign speech quotes and accusation history)
   * Wave 3: Round 1 Leaked CCTV Feeds (uses real debate consensus leader & recent attacks)
   * Wave 4: Round 1 Strategy Confessionals (uses real backroom pact agreements & treasuries)
   * Wave 5: Round 1 Bailout Auction & Elimination Exit Speech (for actual eliminated contender)
   * Broadcast begins immediately with zero latency!
   * Background: Waves for Round 2, Round 3, Final 3 Showdown, Grand Jury Votes, & Winner Victory Speech!
   */
  const startFullRoundPrebuffering = useCallback(async (startingState: GameState) => {
    isFullRoundPrebufferingRef.current = true;
    setIsFullRoundPrebuffering(true);

    const electionTopic = startingState.electionTopic || DEFAULT_TOPIC;
    let simActiveIds = [...startingState.activeCandidateIds];
    const participatingIds = startingState.participatingCandidateIds || startingState.activeCandidateIds;

    // Simulation tracking collections
    const simSpeeches: Record<string, string> = { ...startingState.campaignSpeeches };
    const simBudgets: Record<string, number> = { ...startingState.candidateBudgets };
    const simStrategies: Record<string, string> = { ...(startingState.candidateStrategies || {}) };
    const simAttacks: Record<number, AttackEvent[]> = {};
    const simHeat: Record<number, Record<string, CandidateDebateHeat>> = {};
    const simPacts: Record<number, BackroomPact[]> = {};
    const simEliminated: EliminatedCandidateInfo[] = [...(startingState.eliminatedCandidates || [])];

    // Total Round 1 steps: speeches + attacks + cctv + confessionals + elimination
    const r1Count = simActiveIds.length * 4 + 1;
    let completedCount = 0;
    const completedSet = new Set<string>();

    const updateProgress = (label: string, speakerId?: string) => {
      if (speakerId) completedSet.add(speakerId);
      setCompletedPrebufferCandidates(Array.from(completedSet));
      const pct = Math.min(100, Math.round((completedCount / Math.max(1, r1Count)) * 100));
      setPrebufferProgress({
        current: completedCount,
        total: r1Count,
        stepLabel: label,
        percent: pct,
        currentCandidateId: speakerId,
      });
    };

    updateProgress('Initializing Phased Full-Round Pre-Buffering...', simActiveIds[0]);

    // -----------------------------------------------------------------
    // WAVE 1: Round 1 Campaign Speeches (Concurrent Batches N=4)
    // -----------------------------------------------------------------
    const campaignDescriptors: StepDescriptor[] = simActiveIds.map((candId, idx) => {
      const cand = CANDIDATE_MAP.get(candId)!;
      return {
        stepKey: `campaign-${idx}-${cand.id}`,
        phase: 'CAMPAIGN',
        round: 1,
        speakerId: cand.id,
        targetId: null,
        actionType: 'speech',
        headline: idx === 0
          ? `ROUND 1: OPENING CAMPAIGN ADDRESS — ${cand.name.toUpperCase()}`
          : `ROUND 1: CAMPAIGN ADDRESS — ${cand.name.toUpperCase()}`,
        llmPayload: {
          action: 'campaign_speech',
          candidateId: cand.id,
          round: 1,
          activeCandidateIds: simActiveIds,
          historyContext: {
            electionTopic,
            campaignSpeeches: simSpeeches,
          },
        }
      };
    });

    for (let i = 0; i < campaignDescriptors.length; i += 4) {
      const batch = campaignDescriptors.slice(i, i + 4);
      await Promise.all(batch.map(async (descriptor) => {
        const cand = CANDIDATE_MAP.get(descriptor.speakerId!)!;
        updateProgress(`Synthesizing Campaign Address: ${cand.name}...`, cand.id);
        try {
          const prep = await preloadStep(descriptor);
          if (prep.content) {
            simSpeeches[cand.id] = prep.content;
          }
        } catch (err) {
          console.warn(`[Prebuffer Campaign Error for ${cand.id}]:`, err);
        }
        completedCount++;
        updateProgress(`Buffered (${completedCount}/${r1Count}): Campaign Address — ${cand.name}`, cand.id);
      }));
    }

    // -----------------------------------------------------------------
    // WAVE 2: Round 1 Live Attacks (Sequential Text Generation + Pipelined TTS)
    // -----------------------------------------------------------------
    simAttacks[1] = [];
    simHeat[1] = {};
    const pendingWave2TtsPromises: Promise<void>[] = [];

    for (let idx = 0; idx < simActiveIds.length; idx++) {
      const attackerId = simActiveIds[idx];
      const attacker = CANDIDATE_MAP.get(attackerId)!;
      const preferredTargetId = resolveAttackTarget(attacker.id, simActiveIds, {
        attacksByRound: simAttacks,
        pactsByRound: simPacts,
        votesByRound: {},
        round: 1,
        candidateBudgets: simBudgets,
      });
      const targetCand = CANDIDATE_MAP.get(preferredTargetId);

      const recentAttacksThisRound = simAttacks[1].map(a => ({
        attackerName: CANDIDATE_MAP.get(a.attackerId)?.name || a.attackerId,
        targetName: CANDIDATE_MAP.get(a.targetId)?.name || a.targetId,
        text: a.text,
      }));

      const priorAccusation = simAttacks[1].find(a => a.targetId === attacker.id);
      const activeAccusationOnSpeaker = priorAccusation ? {
        attackerId: priorAccusation.attackerId,
        attackerName: CANDIDATE_MAP.get(priorAccusation.attackerId)?.name || priorAccusation.attackerId,
        text: priorAccusation.text,
      } : undefined;

      const descriptor: StepDescriptor = {
        stepKey: `attack-r1-${idx}-${attacker.id}`,
        phase: 'ATTACK',
        round: 1,
        speakerId: attacker.id,
        targetId: preferredTargetId,
        actionType: 'attack',
        headline: `ROUND 1: LIVE ATTACK ROUND — ${attacker.name.toUpperCase()}`,
        llmPayload: {
          action: 'attack',
          candidateId: attacker.id,
          targetId: preferredTargetId,
          round: 1,
          activeCandidateIds: simActiveIds,
          eliminatedCandidateIds: [],
          historyContext: {
            electionTopic,
            campaignSpeeches: simSpeeches,
            targetSpeechQuote: simSpeeches[preferredTargetId] || targetCand?.slogan,
            targetWeaknesses: targetCand?.weaknesses,
            targetTreasuryBalance: simBudgets[preferredTargetId] ?? 100,
            targetHeatScore: simHeat[1]?.[preferredTargetId]?.heatScore ?? 0,
            activeAccusationOnSpeaker,
            recentAttacks: recentAttacksThisRound,
          },
        }
      };

      updateProgress(`Drafting Attack Strategy: ${attacker.name} vs ${targetCand?.name}...`, attacker.id);
      try {
        const stepKey = descriptor.stepKey;
        // 1. Strictly sequential LLM generation: every candidate receives latest clash context!
        if (!descriptor.llmPayload) continue;
        const res = await callLLM(descriptor.llmPayload);
        let attackContent = '';
        if (typeof res === 'object' && res) {
          attackContent = res.text || res.strategyMonologue || '';
        } else if (typeof res === 'string') {
          attackContent = res;
        }
        if (!attackContent) attackContent = `I challenge ${targetCand?.name}'s record on this crisis!`;

        // 2. Immediately register attack in simAttacks & update simHeat for next attacker
        const attackEvent: AttackEvent = {
          id: `atk-r1-${idx}-${attacker.id}`,
          round: 1,
          attackerId: attacker.id,
          targetId: preferredTargetId,
          text: attackContent,
          isRebuttal: Boolean(priorAccusation),
          rebuttalAgainstId: priorAccusation?.attackerId,
          voteCallTargetId: preferredTargetId,
          timestamp: Date.now(),
        };
        simAttacks[1].push(attackEvent);

        if (!simHeat[1][preferredTargetId]) {
          simHeat[1][preferredTargetId] = {
            candidateId: preferredTargetId,
            heatScore: 0,
            accusers: [],
            rebuttalCount: 0,
            voteCallsAgainst: [],
            accusationQuotes: [],
          };
        }
        simHeat[1][preferredTargetId].heatScore += 1;
        simHeat[1][preferredTargetId].accusers.push(attacker.id);
        simHeat[1][preferredTargetId].voteCallsAgainst.push(attacker.id);
        simHeat[1][preferredTargetId].accusationQuotes.push(attackContent.slice(0, 80));

        // Create base PreparedStep in memory
        const prepared: PreparedStep = {
          stepKey,
          phase: descriptor.phase,
          round: descriptor.round,
          speakerId: descriptor.speakerId,
          targetId: descriptor.targetId,
          actionType: descriptor.actionType,
          headline: descriptor.headline,
          content: attackContent,
          audioBlobUrl: null,
          receiverAudioBlobUrl: null,
          audioBlob: null,
          isReady: false,
          payload: res,
        };
        preparedStepsRef.current.set(stepKey, prepared);

        // 3. Pipelined Fish.Audio TTS in background without blocking next candidate's LLM
        const ttsPromise = (async () => {
          try {
            const ttsRes = await synthesizeSpeechAudio(attackContent, attacker.voice?.voiceId, attacker.id);
            prepared.audioBlobUrl = ttsRes.audioBlobUrl;
            prepared.audioBlob = ttsRes.audioBlob;
            prepared.isReady = true;
            preparedStepsRef.current.set(stepKey, prepared);
            setLookaheadBufferCount(preparedStepsRef.current.size);
          } catch (e) {
            console.warn(`[Wave 2 TTS Error for ${attacker.id}]:`, e);
            prepared.isReady = true;
          }
        })();
        pendingWave2TtsPromises.push(ttsPromise);
      } catch (err) {
        console.warn(`[Prebuffer Attack Error for ${attacker.id}]:`, err);
      }
      completedCount++;
      updateProgress(`Buffered (${completedCount}/${r1Count}): Live Attack — ${attacker.name}`, attacker.id);
    }

    // Await all background TTS synthesis jobs for Wave 2 before advancing to Wave 3
    if (pendingWave2TtsPromises.length > 0) {
      updateProgress(`Finalizing Live Attack Audio Broadcast Layers...`);
      await Promise.all(pendingWave2TtsPromises);
    }

    // -----------------------------------------------------------------
    // WAVE 3: Round 1 CCTV Leaked Feeds (Concurrent Dual-TTS & Batching N=2)
    // -----------------------------------------------------------------
    simPacts[1] = [];
    const roundHeat = simHeat[1] || {};
    const heatEntries = Object.values(roundHeat);
    const topHeat = heatEntries.sort((a, b) => b.heatScore - a.heatScore)[0];
    const debateConsensusLeader = (topHeat && topHeat.heatScore > 0) ? {
      candidateId: topHeat.candidateId,
      candidateName: CANDIDATE_MAP.get(topHeat.candidateId)?.name || topHeat.candidateId,
      heatScore: topHeat.heatScore,
      accusers: topHeat.accusers.map(id => CANDIDATE_MAP.get(id)?.name || id),
      voteCalls: topHeat.voteCallsAgainst.map(id => CANDIDATE_MAP.get(id)?.name || id),
    } : undefined;

    const recentAttackContext = simAttacks[1].map(a => ({
      attackerName: CANDIDATE_MAP.get(a.attackerId)?.name || a.attackerId,
      targetName: CANDIDATE_MAP.get(a.targetId)?.name || a.targetId,
      text: a.text,
    }));

    const cctvDescriptors: StepDescriptor[] = simActiveIds.map((p1Id, idx) => {
      const p2Id = simActiveIds[(idx + 1) % simActiveIds.length];
      const p1 = CANDIDATE_MAP.get(p1Id)!;
      const p2 = CANDIDATE_MAP.get(p2Id)!;

      return {
        stepKey: `cctv-r1-${idx}-${p1.id}`,
        phase: 'CCTV_BACKROOM',
        round: 1,
        speakerId: p1.id,
        targetId: p2.id,
        actionType: 'pact',
        headline: `ROUND 1: LEAKED CAPITOL CCTV FEED ${idx + 1} OF ${simActiveIds.length}`,
        llmPayload: {
          action: 'backroom_pact',
          candidateId: p1.id,
          targetId: p2.id,
          round: 1,
          activeCandidateIds: simActiveIds,
          historyContext: {
            electionTopic,
            recentAttacks: recentAttackContext,
            debateConsensusLeader,
            proposerBudget: simBudgets[p1.id] ?? 100,
            receiverBudget: simBudgets[p2.id] ?? 100,
            candidateTreasuries: simBudgets,
            candidateSecretStrategy: simStrategies[p1.id],
          },
        }
      };
    });

    for (let i = 0; i < cctvDescriptors.length; i += 2) {
      const batch = cctvDescriptors.slice(i, i + 2);
      await Promise.all(batch.map(async (descriptor, bIdx) => {
        const idx = i + bIdx;
        const p1Id = descriptor.speakerId!;
        const p2Id = descriptor.targetId!;
        const p1 = CANDIDATE_MAP.get(p1Id)!;
        const p2 = CANDIDATE_MAP.get(p2Id)!;

        updateProgress(`Synthesizing Leaked CCTV Feed: ${p1.name} & ${p2.name}...`, p1.id);
        try {
          const prep = await preloadStep(descriptor);
          const payload = prep.payload || {};
          const agreedTargetId = payload.agreedTargetId || debateConsensusLeader?.candidateId || simActiveIds[1];
          const actionType = payload.actionType || 'offer';
          const receiverDecision = payload.receiverDecision || 'accept';
          const bribeAmount = payload.bribeAmount || 30;

          const pact: BackroomPact = {
            id: `pact-r1-${idx}`,
            round: 1,
            proposerId: p1.id,
            receiverId: p2.id,
            actionType,
            agreedTargetId,
            whisperText: prep.content,
            receiverResponse: payload.receiverResponse,
            privateStrategy: payload.privateStrategy,
            location: 'Capitol Basement Utility Corridor',
            receiverDecision,
            bribeAmount,
            bribeAccepted: receiverDecision === 'accept' || receiverDecision === 'accept_and_betray',
            upfrontPaid: 15,
            timestamp: Date.now(),
          };
          simPacts[1].push(pact);

          if (pact.bribeAccepted) {
            simBudgets[p1.id] = Math.max(0, (simBudgets[p1.id] ?? 100) - 15);
            simBudgets[p2.id] = (simBudgets[p2.id] ?? 100) + 15;
          }
          if (payload.privateStrategy) {
            simStrategies[p1.id] = payload.privateStrategy;
          }
        } catch (err) {
          console.warn(`[Prebuffer CCTV Error for ${p1.id}]:`, err);
        }
        completedCount++;
        updateProgress(`Buffered (${completedCount}/${r1Count}): Leaked CCTV Feed — ${p1.name} & ${p2.name}`, p1.id);
      }));
    }

    // -----------------------------------------------------------------
    // WAVE 4: Round 1 Strategy Confessionals & Votes (Concurrent Batches N=4)
    // -----------------------------------------------------------------
    const simPrimaryTargetId = debateConsensusLeader?.candidateId || simActiveIds[1] || simActiveIds[0];
    const otherActive = simActiveIds.filter(id => id !== simPrimaryTargetId);
    const simCounterTargetId = otherActive.sort((a, b) => (simBudgets[b] ?? 100) - (simBudgets[a] ?? 100))[0] || otherActive[0];

    const accumulatedVotes: VoteRecord[] = [];

    const voteItems = simActiveIds.map((voterId, idx) => {
      const voter = CANDIDATE_MAP.get(voterId)!;
      const relevantPact = simPacts[1].find(p => p.proposerId === voterId || p.receiverId === voterId);
      const pactAllyId = relevantPact ? (relevantPact.proposerId === voterId ? relevantPact.receiverId : relevantPact.proposerId) : undefined;
      const pactTargetId = relevantPact?.agreedTargetId;

      let expectedTargetId: string;
      if (relevantPact && relevantPact.receiverDecision === 'accept' && pactTargetId && pactTargetId !== voterId) {
        expectedTargetId = pactTargetId;
      } else if (voterId === simPrimaryTargetId) {
        expectedTargetId = simCounterTargetId;
      } else if (debateConsensusLeader?.accusers.includes(voterId)) {
        expectedTargetId = simPrimaryTargetId;
      } else if (idx % 2 === 0) {
        expectedTargetId = simPrimaryTargetId;
      } else {
        expectedTargetId = simCounterTargetId;
      }
      if (expectedTargetId === voterId) {
        expectedTargetId = simActiveIds.filter(id => id !== voterId)[0];
      }

      const descriptor: StepDescriptor = {
        stepKey: `vote_confessional-r1-${idx}-${voter.id}`,
        phase: 'VOTE_CONFESSIONAL',
        round: 1,
        speakerId: voter.id,
        targetId: null,
        actionType: 'vote',
        headline: `ROUND 1: CONFIDENTIAL STRATEGY CONFESSIONAL (${idx + 1} of ${simActiveIds.length})`,
        llmPayload: {
          action: 'elimination_vote',
          candidateId: voter.id,
          round: 1,
          activeCandidateIds: simActiveIds,
          historyContext: {
            electionTopic,
            candidateTreasuries: simBudgets,
            candidateSecretStrategy: simStrategies[voter.id],
            debateConsensusLeader,
            candidateWithHighestTreasury: simCounterTargetId,
            activePact: pactAllyId ? { allyId: pactAllyId, agreedTargetId: pactTargetId || expectedTargetId } : undefined,
          },
        }
      };

      return { voter, relevantPact, pactAllyId, pactTargetId, expectedTargetId, descriptor };
    });

    for (let i = 0; i < voteItems.length; i += 4) {
      const batch = voteItems.slice(i, i + 4);
      await Promise.all(batch.map(async (item) => {
        const { voter, relevantPact, pactAllyId, pactTargetId, expectedTargetId, descriptor } = item;
        updateProgress(`Synthesizing Strategy Confessional: ${voter.name}...`, voter.id);
        try {
          const prep = await preloadStep(descriptor);
          const payload = prep.payload || {};
          const chosenTarget = (payload.targetCandidateId && simActiveIds.includes(payload.targetCandidateId) && payload.targetCandidateId !== voter.id)
            ? payload.targetCandidateId
            : expectedTargetId;

          const isBetrayal = Boolean(relevantPact && (
            relevantPact.receiverDecision === 'accept_and_betray' ||
            chosenTarget === pactAllyId ||
            (pactTargetId && chosenTarget !== pactTargetId)
          ));

          accumulatedVotes.push({
            voterId: voter.id,
            targetId: chosenTarget,
            reason: payload.reason || prep.content?.slice(0, 100),
            strategyMonologue: prep.content,
            pactWithId: pactAllyId,
            pactTargetId,
            isBetrayal,
            betrayedAllyId: isBetrayal ? pactAllyId : undefined,
          });
        } catch (err) {
          console.warn(`[Prebuffer Confessional Error for ${voter.id}]:`, err);
          accumulatedVotes.push({
            voterId: voter.id,
            targetId: expectedTargetId,
            reason: 'Strategic calculation',
          });
        }
        completedCount++;
        updateProgress(`Buffered (${completedCount}/${r1Count}): Strategy Confessional — ${voter.name}`, voter.id);
      }));
    }

    // -----------------------------------------------------------------
    // WAVE 5: Round 1 Bailout Auction & Actual Elimination Concession Speech
    // -----------------------------------------------------------------
    const rawVoteTally: Record<string, number> = {};
    simActiveIds.forEach(id => { rawVoteTally[id] = 0; });
    accumulatedVotes.forEach(v => {
      rawVoteTally[v.targetId] = (rawVoteTally[v.targetId] || 0) + 1;
    });

    const bailoutRes = resolveBailoutAuction(rawVoteTally, simBudgets, simActiveIds, 1);
    const r1EliminatedId = bailoutRes.eliminatedId || simActiveIds[0];
    const elimCand = CANDIDATE_MAP.get(r1EliminatedId)!;

    // Update simulation budgets after bailouts
    Object.assign(simBudgets, bailoutRes.finalBudgets);

    const wasBetrayed = accumulatedVotes.some(v => v.targetId === r1EliminatedId && v.isBetrayal);
    const betrayer = accumulatedVotes.find(v => v.targetId === r1EliminatedId && v.isBetrayal);

    const elimDescriptor: StepDescriptor = {
      stepKey: `elimination-r1-${elimCand.id}`,
      phase: 'ELIMINATION',
      round: 1,
      speakerId: elimCand.id,
      targetId: null,
      actionType: 'eliminated',
      headline: `ROUND 1 ELIMINATION — ${elimCand.name.toUpperCase()}`,
      llmPayload: {
        action: 'exit_words',
        candidateId: elimCand.id,
        round: 1,
        activeCandidateIds: simActiveIds,
        historyContext: {
          electionTopic,
          betrayalContext: {
            wasBetrayed,
            betrayedByCandidateName: betrayer?.voterId ? CANDIDATE_MAP.get(betrayer.voterId)?.name : undefined,
            voteCountAgainstSelf: bailoutRes.finalTally[r1EliminatedId] || 1,
          },
        }
      }
    };

    updateProgress(`Synthesizing Concession Address: ${elimCand.name}...`, elimCand.id);
    try {
      const elimPrep = await preloadStep(elimDescriptor);
      simEliminated.push({
        candidateId: r1EliminatedId,
        eliminatedInRound: 1,
        voteCount: bailoutRes.finalTally[r1EliminatedId] || 1,
        exitWords: elimPrep.content,
      });
    } catch (err) {
      console.warn(`[Prebuffer Elimination Error for ${elimCand.id}]:`, err);
      simEliminated.push({
        candidateId: r1EliminatedId,
        eliminatedInRound: 1,
        voteCount: bailoutRes.finalTally[r1EliminatedId] || 1,
        exitWords: 'Valoria deserves better.',
      });
    }
    completedCount++;
    updateProgress(`Round 1 100% Ready! Beginning broadcast...`);

    // Remove eliminated candidate from active set
    simActiveIds = simActiveIds.filter(id => id !== r1EliminatedId);

    // -----------------------------------------------------------------
    // Round 1 Complete! Wait for user to press Right Arrow or Enter to begin recording
    // -----------------------------------------------------------------
    stopSpeechAudio();
    audioSync.detach();
    if (autoPlayTimer.current) {
      clearTimeout(autoPlayTimer.current);
      autoPlayTimer.current = null;
    }

    isFullRoundPrebufferingRef.current = false;
    setIsFullRoundPrebuffering(false);
    isWaitingForRecordTriggerRef.current = true;
    setIsWaitingForRecordTrigger(true);
    setPrebufferProgress({
      current: r1Count,
      total: r1Count,
      stepLabel: 'Round 1 100% Ready! Press Enter or Right Arrow to begin broadcast...',
      percent: 100,
    });

    // -----------------------------------------------------------------
    // AUTONOMOUS BACKGROUND PHASED PRE-BUFFERING (Rounds 2, 3... Finals, Winner)
    // Runs in the exact same wave-by-wave, context-propagating order!
    // -----------------------------------------------------------------
    (async () => {
      console.log(`[Autonomous Whole-Game Buffer]: Starting background phased pre-buffering for remaining rounds...`);
      let currentSimRound = 2;

      // Continue elimination rounds until 3 candidates remain
      while (simActiveIds.length > 3) {
        const roundNum = currentSimRound;
        const roundEliminatedIds = simEliminated.map(e => e.candidateId);
        console.log(`[Autonomous Whole-Game Buffer]: Pre-buffering Round ${roundNum} with surviving candidates:`, simActiveIds);

        // Wave: Round Attacks (Surviving candidates attacking surviving candidates only!)
        simAttacks[roundNum] = [];
        simHeat[roundNum] = {};

        for (let idx = 0; idx < simActiveIds.length; idx++) {
          const attackerId = simActiveIds[idx];
          const attacker = CANDIDATE_MAP.get(attackerId)!;
          const preferredTargetId = resolveAttackTarget(attacker.id, simActiveIds, {
            attacksByRound: simAttacks,
            pactsByRound: simPacts,
            votesByRound: {},
            round: roundNum,
            candidateBudgets: simBudgets,
          });
          const targetCand = CANDIDATE_MAP.get(preferredTargetId);

          const priorAccusation = simAttacks[roundNum].find(a => a.targetId === attacker.id);
          const activeAccusationOnSpeaker = priorAccusation ? {
            attackerId: priorAccusation.attackerId,
            attackerName: CANDIDATE_MAP.get(priorAccusation.attackerId)?.name || priorAccusation.attackerId,
            text: priorAccusation.text,
          } : undefined;

          const recentAttackContext = simAttacks[roundNum].map(a => ({
            attackerName: CANDIDATE_MAP.get(a.attackerId)?.name || a.attackerId,
            targetName: CANDIDATE_MAP.get(a.targetId)?.name || a.targetId,
            text: a.text,
          }));

          const atkDesc: StepDescriptor = {
            stepKey: `attack-r${roundNum}-${idx}-${attacker.id}`,
            phase: 'ATTACK',
            round: roundNum,
            speakerId: attacker.id,
            targetId: preferredTargetId,
            actionType: 'attack',
            headline: `ROUND ${roundNum}: LIVE ATTACK ROUND — ${attacker.name.toUpperCase()}`,
            llmPayload: {
              action: 'attack',
              candidateId: attacker.id,
              targetId: preferredTargetId,
              round: roundNum,
              activeCandidateIds: simActiveIds,
              eliminatedCandidateIds: roundEliminatedIds,
              historyContext: {
                electionTopic,
                campaignSpeeches: simSpeeches,
                targetSpeechQuote: simSpeeches[preferredTargetId] || targetCand?.slogan,
                targetWeaknesses: targetCand?.weaknesses,
                targetTreasuryBalance: simBudgets[preferredTargetId] ?? 100,
                targetHeatScore: simHeat[roundNum]?.[preferredTargetId]?.heatScore ?? 0,
                activeAccusationOnSpeaker,
                recentAttacks: recentAttackContext,
              },
            }
          };

          try {
            const prep = await preloadStep(atkDesc);
            const attackContent = prep.content || 'I challenge your platform!';
            simAttacks[roundNum].push({
              id: `atk-r${roundNum}-${idx}-${attacker.id}`,
              round: roundNum,
              attackerId: attacker.id,
              targetId: preferredTargetId,
              text: attackContent,
              isRebuttal: Boolean(priorAccusation),
              timestamp: Date.now(),
            });

            if (!simHeat[roundNum][preferredTargetId]) {
              simHeat[roundNum][preferredTargetId] = {
                candidateId: preferredTargetId,
                heatScore: 0,
                accusers: [],
                rebuttalCount: 0,
                voteCallsAgainst: [],
                accusationQuotes: [],
              };
            }
            simHeat[roundNum][preferredTargetId].heatScore += 1;
            simHeat[roundNum][preferredTargetId].accusers.push(attacker.id);
            simHeat[roundNum][preferredTargetId].accusationQuotes.push(attackContent.slice(0, 80));
          } catch (e) {
            console.warn(`[Autonomous Buffer Error for attack ${atkDesc.stepKey}]:`, e);
          }
        }

        // Wave: Round CCTV Leaked Feeds
        simPacts[roundNum] = [];
        const rHeat = simHeat[roundNum] || {};
        const topH = Object.values(rHeat).sort((a, b) => b.heatScore - a.heatScore)[0];
        const roundConsensusLeader = (topH && topH.heatScore > 0) ? {
          candidateId: topH.candidateId,
          candidateName: CANDIDATE_MAP.get(topH.candidateId)?.name || topH.candidateId,
          heatScore: topH.heatScore,
          accusers: topH.accusers.map(id => CANDIDATE_MAP.get(id)?.name || id),
          voteCalls: topH.voteCallsAgainst.map(id => CANDIDATE_MAP.get(id)?.name || id),
        } : undefined;

        for (let idx = 0; idx < simActiveIds.length; idx++) {
          const p1Id = simActiveIds[idx];
          const p2Id = simActiveIds[(idx + 1) % simActiveIds.length];
          const p1 = CANDIDATE_MAP.get(p1Id)!;
          const p2 = CANDIDATE_MAP.get(p2Id)!;

          const cctvDesc: StepDescriptor = {
            stepKey: `cctv-r${roundNum}-${idx}-${p1.id}`,
            phase: 'CCTV_BACKROOM',
            round: roundNum,
            speakerId: p1.id,
            targetId: p2.id,
            actionType: 'pact',
            headline: `ROUND ${roundNum}: LEAKED CAPITOL CCTV FEED ${idx + 1} OF ${simActiveIds.length}`,
            llmPayload: {
              action: 'backroom_pact',
              candidateId: p1.id,
              targetId: p2.id,
              round: roundNum,
              activeCandidateIds: simActiveIds,
              historyContext: {
                electionTopic,
                recentAttacks: simAttacks[roundNum].map(a => ({
                  attackerName: CANDIDATE_MAP.get(a.attackerId)?.name || a.attackerId,
                  targetName: CANDIDATE_MAP.get(a.targetId)?.name || a.targetId,
                  text: a.text,
                })),
                debateConsensusLeader: roundConsensusLeader,
                proposerBudget: simBudgets[p1.id] ?? 100,
                receiverBudget: simBudgets[p2.id] ?? 100,
                candidateTreasuries: simBudgets,
                candidateSecretStrategy: simStrategies[p1.id],
              },
            }
          };

          try {
            const prep = await preloadStep(cctvDesc);
            const payload = prep.payload || {};
            const agreedTargetId = payload.agreedTargetId || roundConsensusLeader?.candidateId || simActiveIds[1];
            const receiverDecision = payload.receiverDecision || 'accept';
            simPacts[roundNum].push({
              id: `pact-r${roundNum}-${idx}`,
              round: roundNum,
              proposerId: p1.id,
              receiverId: p2.id,
              agreedTargetId,
              whisperText: prep.content,
              receiverResponse: payload.receiverResponse,
              privateStrategy: payload.privateStrategy,
              location: 'Subterranean Steam Tunnel',
              receiverDecision,
              bribeAccepted: receiverDecision === 'accept' || receiverDecision === 'accept_and_betray',
              timestamp: Date.now(),
            });
            if (payload.receiverDecision === 'accept' || payload.receiverDecision === 'accept_and_betray') {
              simBudgets[p1.id] = Math.max(0, (simBudgets[p1.id] ?? 100) - 15);
              simBudgets[p2.id] = (simBudgets[p2.id] ?? 100) + 15;
            }
          } catch (e) {
            console.warn(`[Autonomous Buffer Error for CCTV ${cctvDesc.stepKey}]:`, e);
          }
        }

        // Wave: Round Strategy Confessionals
        const roundPrimaryTarget = roundConsensusLeader?.candidateId || simActiveIds[1] || simActiveIds[0];
        const roundOthers = simActiveIds.filter(id => id !== roundPrimaryTarget);
        const roundCounterTarget = roundOthers.sort((a, b) => (simBudgets[b] ?? 100) - (simBudgets[a] ?? 100))[0] || roundOthers[0];
        const roundVotes: VoteRecord[] = [];

        for (let idx = 0; idx < simActiveIds.length; idx++) {
          const voterId = simActiveIds[idx];
          const voter = CANDIDATE_MAP.get(voterId)!;
          const relevantPact = simPacts[roundNum].find(p => p.proposerId === voterId || p.receiverId === voterId);
          const pactAllyId = relevantPact ? (relevantPact.proposerId === voterId ? relevantPact.receiverId : relevantPact.proposerId) : undefined;
          const pactTargetId = relevantPact?.agreedTargetId;

          let target: string;
          if (relevantPact && relevantPact.receiverDecision === 'accept' && pactTargetId && pactTargetId !== voterId) {
            target = pactTargetId;
          } else if (voterId === roundPrimaryTarget) {
            target = roundCounterTarget;
          } else if (idx % 2 === 0) {
            target = roundPrimaryTarget;
          } else {
            target = roundCounterTarget;
          }
          if (target === voterId) {
            target = simActiveIds.filter(id => id !== voterId)[0];
          }

          const confDesc: StepDescriptor = {
            stepKey: `vote_confessional-r${roundNum}-${idx}-${voter.id}`,
            phase: 'VOTE_CONFESSIONAL',
            round: roundNum,
            speakerId: voter.id,
            targetId: null,
            actionType: 'vote',
            headline: `ROUND ${roundNum}: CONFIDENTIAL STRATEGY CONFESSIONAL (${idx + 1} of ${simActiveIds.length})`,
            llmPayload: {
              action: 'elimination_vote',
              candidateId: voter.id,
              round: roundNum,
              activeCandidateIds: simActiveIds,
              historyContext: {
                electionTopic,
                candidateTreasuries: simBudgets,
                candidateSecretStrategy: simStrategies[voter.id],
                debateConsensusLeader: roundConsensusLeader,
                candidateWithHighestTreasury: roundCounterTarget,
                activePact: pactAllyId ? { allyId: pactAllyId, agreedTargetId: pactTargetId || target } : undefined,
              },
            }
          };

          try {
            const prep = await preloadStep(confDesc);
            const payload = prep.payload || {};
            const chosenTarget = (payload.targetCandidateId && simActiveIds.includes(payload.targetCandidateId) && payload.targetCandidateId !== voter.id)
              ? payload.targetCandidateId
              : target;

            roundVotes.push({
              voterId: voter.id,
              targetId: chosenTarget,
              strategyMonologue: prep.content,
            });
          } catch (e) {
            console.warn(`[Autonomous Buffer Error for Confessional ${confDesc.stepKey}]:`, e);
            roundVotes.push({ voterId: voter.id, targetId: target });
          }
        }

        // Wave: Round Bailout Auction & Elimination
        const roundRawVotes: Record<string, number> = {};
        simActiveIds.forEach(id => { roundRawVotes[id] = 0; });
        roundVotes.forEach(v => { roundRawVotes[v.targetId] = (roundRawVotes[v.targetId] || 0) + 1; });

        const rBailout = resolveBailoutAuction(roundRawVotes, simBudgets, simActiveIds, roundNum);
        const elimId = rBailout.eliminatedId || simActiveIds[0];
        const elimCand = CANDIDATE_MAP.get(elimId)!;
        Object.assign(simBudgets, rBailout.finalBudgets);

        const elimStepDesc: StepDescriptor = {
          stepKey: `elimination-r${roundNum}-${elimCand.id}`,
          phase: 'ELIMINATION',
          round: roundNum,
          speakerId: elimCand.id,
          targetId: null,
          actionType: 'eliminated',
          headline: `ROUND ${roundNum} ELIMINATION — ${elimCand.name.toUpperCase()}`,
          llmPayload: {
            action: 'exit_words',
            candidateId: elimCand.id,
            round: roundNum,
            activeCandidateIds: simActiveIds,
            historyContext: {
              electionTopic,
              betrayalContext: {
                wasBetrayed: false,
                voteCountAgainstSelf: rBailout.finalTally[elimId] || 1,
              },
            }
          }
        };

        try {
          const elimPrep = await preloadStep(elimStepDesc);
          simEliminated.push({
            candidateId: elimId,
            eliminatedInRound: roundNum,
            voteCount: rBailout.finalTally[elimId] || 1,
            exitWords: elimPrep.content,
          });
        } catch (e) {
          console.warn(`[Autonomous Buffer Error for Elimination ${elimStepDesc.stepKey}]:`, e);
          simEliminated.push({
            candidateId: elimId,
            eliminatedInRound: roundNum,
            voteCount: rBailout.finalTally[elimId] || 1,
            exitWords: 'My campaign ends here.',
          });
        }

        simActiveIds = simActiveIds.filter(id => id !== elimId);
        currentSimRound += 1;
      }

      // -----------------------------------------------------------------
      // FINALS: Top 3 Final Speeches, Grand Jury Confessionals, & Winner
      // -----------------------------------------------------------------
      console.log(`[Autonomous Whole-Game Buffer]: Pre-buffering Final 3 Showdown with finalists:`, simActiveIds);
      const finalists = simActiveIds.slice(0, 3);
      const elimSummary = simEliminated.map(e => ({
        candidateName: CANDIDATE_MAP.get(e.candidateId)?.name || e.candidateId,
        candidateId: e.candidateId,
        round: e.eliminatedInRound,
        exitWords: e.exitWords,
      }));

      // 1. Final Speeches for 3 Finalists
      for (let fIdx = 0; fIdx < finalists.length; fIdx++) {
        const finalist = CANDIDATE_MAP.get(finalists[fIdx])!;
        const finalSpeechDesc: StepDescriptor = {
          stepKey: `final_speech-${fIdx}-${finalist.id}`,
          phase: 'FINAL_SPEECHES',
          round: currentSimRound,
          speakerId: finalist.id,
          targetId: null,
          actionType: 'speech',
          headline: `THE FINAL 3 SHOWDOWN: CLOSING ARGUMENT — ${finalist.name.toUpperCase()}`,
          llmPayload: {
            action: 'final_speech',
            candidateId: finalist.id,
            round: currentSimRound,
            activeCandidateIds: finalists,
            finalistIds: finalists,
            historyContext: {
              electionTopic,
              campaignSpeeches: simSpeeches,
              eliminatedCandidatesSummary: elimSummary,
            },
          }
        };
        try {
          await preloadStep(finalSpeechDesc);
        } catch (e) {
          console.warn(`[Autonomous Buffer Error for Final Speech ${finalSpeechDesc.stepKey}]:`, e);
        }
      }

      // 2. Grand Jury Confessionals (All participating candidates vote!)
      const grandJuryVotes: Record<string, number> = {};
      finalists.forEach(f => { grandJuryVotes[f] = 0; });

      for (let jIdx = 0; jIdx < participatingIds.length; jIdx++) {
        const voterId = participatingIds[jIdx];
        const voterCand = CANDIDATE_MAP.get(voterId)!;
        const juryDesc: StepDescriptor = {
          stepKey: `grand_jury_vote-${jIdx}-${voterCand.id}`,
          phase: 'VOTE_CONFESSIONAL',
          round: 99,
          speakerId: voterCand.id,
          targetId: null,
          actionType: 'vote',
          headline: `GRAND JURY STRATEGY CONFESSIONAL (${jIdx + 1} of ${participatingIds.length})`,
          llmPayload: {
            action: 'final_vote',
            candidateId: voterCand.id,
            round: 99,
            activeCandidateIds: finalists,
            finalistIds: finalists,
            historyContext: {
              electionTopic,
              allClashesSummary: [],
            },
          }
        };
        try {
          const juryPrep = await preloadStep(juryDesc);
          const payload = juryPrep.payload || {};
          const voteTarget = (payload.targetCandidateId && finalists.includes(payload.targetCandidateId))
            ? payload.targetCandidateId
            : finalists[jIdx % finalists.length];
          grandJuryVotes[voteTarget] = (grandJuryVotes[voteTarget] || 0) + 1;
        } catch (e) {
          console.warn(`[Autonomous Buffer Error for Grand Jury ${juryDesc.stepKey}]:`, e);
          const voteTarget = finalists[jIdx % finalists.length];
          grandJuryVotes[voteTarget] = (grandJuryVotes[voteTarget] || 0) + 1;
        }
      }

      // 3. Winner Victory Speech
      const sortedWinners = Object.entries(grandJuryVotes).sort((a, b) => b[1] - a[1]);
      const winnerId = sortedWinners[0]?.[0] || finalists[0];
      const winnerCand = CANDIDATE_MAP.get(winnerId)!;

      const winnerDesc: StepDescriptor = {
        stepKey: `winner-${winnerCand.id}`,
        phase: 'WINNER',
        round: 100,
        speakerId: winnerCand.id,
        targetId: null,
        actionType: 'winner',
        headline: `PRESIDENT OF THE REPUBLIC OF VALORIA: ${winnerCand.name.toUpperCase()}`,
        llmPayload: {
          action: 'victory_speech',
          candidateId: winnerCand.id,
          round: 100,
          activeCandidateIds: [winnerCand.id],
          historyContext: {
            electionTopic,
          },
        }
      };
      try {
        await preloadStep(winnerDesc);
      } catch (e) {
        console.warn(`[Autonomous Buffer Error for Winner ${winnerDesc.stepKey}]:`, e);
      }

      console.log(`[Autonomous Whole-Game Buffer]: Complete election 100% pre-buffered in memory (All rounds, Finals, Winner) with zero latency!`);
    })();
  }, [preloadStep, sounds, executeNextStep]);

  // Automatic Next Mode & Auto-Play Loop (Dual-Gated Audio & Subtitles)
  useEffect(() => {
    // 1. Check if auto-next or autoPlay is active
    const isAutoNextActive = Boolean(configRef.current?.autoNextMode || state.playback.autoPlay);
    if (!isAutoNextActive) {
      if (autoPlayTimer.current) {
        clearTimeout(autoPlayTimer.current);
        autoPlayTimer.current = null;
      }
      return;
    }

    // 2. Guards: Don't advance if paused, loading, prebuffering, standby screen, or error
    if (
      state.playback.isPaused ||
      state.stage.isLoading ||
      isFullRoundPrebuffering ||
      isWaitingForRecordTrigger ||
      Boolean(state.stage.error)
    ) {
      if (autoPlayTimer.current) {
        clearTimeout(autoPlayTimer.current);
        autoPlayTimer.current = null;
      }
      return;
    }

    // 3. Guards: Don't advance if whole game is finished (WINNER phase) or before game started (IDLE)
    if (state.phase === 'WINNER' || state.phase === 'IDLE') {
      if (autoPlayTimer.current) {
        clearTimeout(autoPlayTimer.current);
        autoPlayTimer.current = null;
      }
      return;
    }

    // 4. Guards: Special animated boards (VOTE_REVEAL, FINAL_REVEAL) self-drive their own reveal sequence
    // and invoke onComplete={onNextStep} when ballots/bailouts finish.
    if (state.phase === 'VOTE_REVEAL' || state.phase === 'FINAL_REVEAL') {
      if (autoPlayTimer.current) {
        clearTimeout(autoPlayTimer.current);
        autoPlayTimer.current = null;
      }
      return;
    }

    // 5. Dual-Condition Gate 1: Check if Character Audio Dialogue is playing
    const isAudioPlaying = isSpeakingAudio || audioSync.getState().isPlaying;
    if (isAudioPlaying) {
      if (autoPlayTimer.current) {
        clearTimeout(autoPlayTimer.current);
        autoPlayTimer.current = null;
      }
      return;
    }

    // 6. Dual-Condition Gate 2: Check if Subtitle Dialogue (100% of kinetic animation) is finished
    const currentText = state.stage.content || '';
    if (currentText && !audioSync.isSubtitlesComplete(currentText)) {
      if (autoPlayTimer.current) {
        clearTimeout(autoPlayTimer.current);
        autoPlayTimer.current = null;
      }
      return;
    }

    // 7. CCTV Backroom Dual Speaker Gate: Check if both proposer and receiver completed
    if (state.phase === 'CCTV_BACKROOM') {
      const pactsThisRound = state.pactsByRound[state.round] || [];
      const currentPact = pactsThisRound[state.currentSpeakerIndex];
      if (currentPact && !audioSync.isCctvComplete(currentPact.id)) {
        if (autoPlayTimer.current) {
          clearTimeout(autoPlayTimer.current);
          autoPlayTimer.current = null;
        }
        return;
      }
    }

    // 8. BOTH character audio dialogue and subtitle dialogue have 100% finished!
    // Trigger next step after customizable autoNextDelay (default 0.75s)
    const delaySec = typeof configRef.current?.autoNextDelay === 'number'
      ? configRef.current.autoNextDelay
      : 0.75;
    const delayMs = Math.max(50, Math.round(delaySec * 1000));

    autoPlayTimer.current = setTimeout(() => {
      executeNextStep();
    }, delayMs);

    return () => {
      if (autoPlayTimer.current) {
        clearTimeout(autoPlayTimer.current);
        autoPlayTimer.current = null;
      }
    };
  }, [
    state.playback.autoPlay,
    state.playback.isPaused,
    state.stage.isLoading,
    state.stage.error,
    state.stage.content,
    state.stage.speakerId,
    state.phase,
    state.round,
    state.currentSpeakerIndex,
    state.pactsByRound,
    isSpeakingAudio,
    isFullRoundPrebuffering,
    isWaitingForRecordTrigger,
    completionTick,
    executeNextStep
  ]);

  /**
   * Begins the broadcast after pre-buffering has completed and the user pressed Enter/Right Arrow.
   * Enforces a 1-second delay for clean video recording lead-in.
   */
  const startRecordingBroadcast = useCallback(async () => {
    if (!isWaitingForRecordTriggerRef.current || isStartingBroadcastRef.current) return;
    isStartingBroadcastRef.current = true;

    // 1-second clean delay for video recording lead-in (screen stays completely black & silent)
    await new Promise(resolve => setTimeout(resolve, 1000));

    isWaitingForRecordTriggerRef.current = false;
    setIsWaitingForRecordTrigger(false);
    isStartingBroadcastRef.current = false;

    if (configRef.current?.autoNextMode) {
      setState(prev => ({
        ...prev,
        playback: { ...prev.playback, autoPlay: true }
      }));
    }

    await executeNextStep();
  }, [executeNextStep]);

  const startGame = async (sessionName?: string) => {
    if (state.activeCandidateIds.length < 4) {
      setState(prev => ({
        ...prev,
        stage: {
          ...prev.stage,
          error: 'Please select at least 4 candidates before starting the presidential election.',
        },
      }));
      return;
    }

    const activeConfig = configRef.current;
    if (!activeConfig?.baseUrl || !activeConfig?.apiKey) {
      if (onRequireConfig) onRequireConfig();
      setState(prev => ({
        ...prev,
        stage: {
          ...prev.stage,
          error: '9router is not configured. Please enter your 9router Endpoint, API Key, and Model in Settings.',
        },
      }));
      return;
    }

    // Clear any prior buffered steps to guarantee exact sequence fidelity
    clearLookaheadBuffers();

    const selectedTopicObj = getRandomDebateTopic();
    const freshTopic = `${selectedTopicObj.title}: ${selectedTopicObj.crisisSummary}`;
    const orderedActiveIds = [...state.activeCandidateIds];

    const rawSaveName = (sessionName || '').trim();
    sessionSaveNameRef.current = rawSaveName;
    setActiveSessionSaveName(rawSaveName);

    if (rawSaveName) {
      try {
        await fetch('/api/save-game', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'init_session',
            sessionName: rawSaveName,
            topic: freshTopic,
            candidates: orderedActiveIds.map(id => CANDIDATE_MAP.get(id)).filter(Boolean),
          }),
        });
      } catch (e) {
        console.warn('Failed to initialize session save:', e);
      }
    }

    const startingState: GameState = {
      ...CREATE_INITIAL_STATE(orderedActiveIds, freshTopic),
      electionTopic: freshTopic,
      participatingCandidateIds: orderedActiveIds,
      activeCandidateIds: orderedActiveIds,
      playback: {
        autoPlay: Boolean(activeConfig?.autoNextMode),
        speed: 'normal' as const,
        soundEnabled: true,
        isPaused: false,
      },
    };
    setState(startingState);

    // Full-Round Pre-Buffering Mode Gate
    if (activeConfig?.fullRoundBuffering) {
      startFullRoundPrebuffering(startingState);
      return;
    }

    const depth = activeConfig?.lookaheadDepth || 2;
    setIsBufferingLookahead(true);
    setBufferingStatus(`⚡ Initializing ${depth}-Step Lookahead Pipeline on Crisis: "${selectedTopicObj.title}"...`);

    const nextSteps = computeNextSteps(startingState, depth);
    if (nextSteps.length > 0) {
      try {
        await Promise.all(nextSteps.slice(0, depth).map(step => preloadStep(step)));
      } catch (e) {
        console.warn('Initial pre-buffer error:', e);
      }
    }

    setIsBufferingLookahead(false);
    setBufferingStatus('');
    executeNextStep();
  };

  const nextStep = () => {
    if (autoPlayTimer.current) {
      clearTimeout(autoPlayTimer.current);
      autoPlayTimer.current = null;
    }
    if (isFullRoundPrebufferingRef.current || isWaitingForRecordTriggerRef.current) return;
    executeNextStep();
  };

  const toggleAutoPlay = () => {
    setState(prev => ({
      ...prev,
      playback: { ...prev.playback, autoPlay: !prev.playback.autoPlay }
    }));
  };

  const setSpeed = (speed: 'slow' | 'normal' | 'fast') => {
    setState(prev => ({
      ...prev,
      playback: { ...prev.playback, speed }
    }));
  };

  const toggleSound = () => {
    setState(prev => {
      const nextSound = !prev.playback.soundEnabled;
      if (!nextSound) {
        stopSpeechAudio();
      }
      return {
        ...prev,
        playback: { ...prev.playback, soundEnabled: nextSound }
      };
    });
  };

  const restartGame = () => {
    if (autoPlayTimer.current) clearTimeout(autoPlayTimer.current);
    stopSpeechAudio();
    sessionSaveNameRef.current = '';
    setActiveSessionSaveName('');
    preparedStepsRef.current.forEach(step => {
      if (step.audioBlobUrl) {
        try { URL.revokeObjectURL(step.audioBlobUrl); } catch {}
      }
    });
    preparedStepsRef.current.clear();
    lookaheadBufferRef.current.clear();
    setLookaheadBufferCount(0);
    setIsBufferingLookahead(false);
    setBufferingStatus('');
    isFullRoundPrebufferingRef.current = false;
    setIsFullRoundPrebuffering(false);
    isWaitingForRecordTriggerRef.current = false;
    setIsWaitingForRecordTrigger(false);
    isStartingBroadcastRef.current = false;
    setPrebufferProgress({
      current: 0,
      total: 0,
      stepLabel: '',
      percent: 0,
      currentCandidateId: undefined,
    });
    setCompletedPrebufferCandidates([]);
    isExecutingStep.current = false;
    setState(CREATE_INITIAL_STATE(state.participatingCandidateIds));
  };

  const retryCurrentStep = () => {
    executeNextStep();
  };

  const selectCCTVFeed = (feedIndex: number) => {
    if (state.phase !== 'CCTV_BACKROOM') return;
    const pactsThisRound = state.pactsByRound[state.round] || [];
    if (!pactsThisRound[feedIndex]) return;

    sounds.playCCTVBeep();
    const pact = pactsThisRound[feedIndex];
    playCCTVPactAudio(pact);
    setState(prev => ({
      ...prev,
      currentSpeakerIndex: feedIndex,
      stage: {
        ...prev.stage,
        speakerId: pact.proposerId,
        targetId: pact.receiverId,
        headline: `ROUND ${prev.round}: LEAKED CAPITOL CCTV FEED ${feedIndex + 1} OF ${pactsThisRound.length}`,
        content: pact.whisperText,
      }
    }));
  };

  return {
    state,
    candidates,
    activeSessionSaveName,
    isSpeakingAudio,
    playSpeechAudio,
    playCCTVPactAudio,
    stopSpeechAudio,
    isBufferingLookahead,
    bufferingStatus,
    lookaheadBufferCount,
    isFullRoundPrebuffering,
    isWaitingForRecordTrigger,
    startRecordingBroadcast,
    prebufferProgress,
    completedPrebufferCandidates,
    startGame,
    nextStep,
    toggleAutoPlay,
    setSpeed,
    toggleSound,
    restartGame,
    retryCurrentStep,
    toggleCandidateSelection,
    setSelectedCandidateIds,
    setPresetRoster,
    selectCCTVFeed,
    saveCandidate,
    createCandidate,
    deleteCandidate,
    resetCandidateToDefault,
    resetAllCandidatesToDefault,
    reorderCandidates,
    moveCandidate,
    reorderActiveCandidates,
    moveActiveCandidate,
    shuffleActiveCandidates,
    reverseActiveCandidates,
  };
}
