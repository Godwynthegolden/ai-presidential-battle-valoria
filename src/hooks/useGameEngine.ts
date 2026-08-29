'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, GamePhase, LLMRequestPayload, RoundVoteTally, VoteRecord, AttackEvent, BackroomPact, StageActionType, StepDescriptor } from '@/types/game';
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
  audioBlob: Blob | null;
  isReady: boolean;
  error?: string | null;
  payload?: any;
}

const DEFAULT_TOPIC = `${VALORIA_DEBATE_TOPICS[0].title}: ${VALORIA_DEBATE_TOPICS[0].crisisSummary}`;

const CREATE_INITIAL_STATE = (selectedIds: string[] = [], topic: string = DEFAULT_TOPIC): GameState => ({
  phase: 'IDLE',
  round: 1,
  electionTopic: topic,
  participatingCandidateIds: [...selectedIds],
  activeCandidateIds: [...selectedIds],
  eliminatedCandidates: [],
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
      message: `National Election Commission: ${selectedIds.length} candidates registered. National Crisis: "${topic.slice(0, 100)}..."`,
      timestamp: Date.now(),
    }
  ],
});

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

  // Keep config in ref so state callbacks always have latest
  const configRef = useRef<NineRouterConfigState | undefined>(nineRouterConfig);
  useEffect(() => {
    configRef.current = nineRouterConfig;
  }, [nineRouterConfig]);

  // Sync sound manager enabled state
  useEffect(() => {
    sounds.enabled = state.playback.soundEnabled;
  }, [state.playback.soundEnabled]);

  // TTS Speech Synthesis Player Controller
  const [isSpeakingAudio, setIsSpeakingAudio] = useState(false);
  const activeTtsAudioRef = useRef<HTMLAudioElement | null>(null);

  // -----------------------------------------------------------------
  // ⚡ 2-Step Lookahead Execution Pipeline Buffer
  // -----------------------------------------------------------------
  const [isBufferingLookahead, setIsBufferingLookahead] = useState(false);
  const [bufferingStatus, setBufferingStatus] = useState('');
  const [lookaheadBufferCount, setLookaheadBufferCount] = useState(0);

  const lookaheadBufferRef = useRef<Map<string, Promise<PreparedStep>>>(new Map());
  const preparedStepsRef = useRef<Map<string, PreparedStep>>(new Map());

  const stopSpeechAudio = useCallback(() => {
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

  const playAudioUrl = useCallback((audioUrl: string | null) => {
    if (!audioUrl || !state.playback.soundEnabled) return;
    stopSpeechAudio();

    try {
      setIsSpeakingAudio(true);
      const audio = new Audio(audioUrl);
      activeTtsAudioRef.current = audio;

      audio.onended = () => {
        setIsSpeakingAudio(false);
        activeTtsAudioRef.current = null;
      };
      audio.onerror = () => {
        setIsSpeakingAudio(false);
        activeTtsAudioRef.current = null;
      };
      audio.play().catch(() => {
        setIsSpeakingAudio(false);
      });
    } catch (e) {
      setIsSpeakingAudio(false);
    }
  }, [state.playback.soundEnabled, stopSpeechAudio]);

  const playSpeechAudio = useCallback(async (text: string, voiceId?: string, speakerCandidateId?: string) => {
    if (!text || !text.trim()) return;

    // Stop any existing playing speech
    stopSpeechAudio();

    const config = configRef.current;
    if (config?.fishAudioEnabled === false || !state.playback.soundEnabled) {
      return;
    }

    const res = await synthesizeSpeechAudio(text, voiceId, speakerCandidateId);
    if (res.audioBlobUrl) {
      playAudioUrl(res.audioBlobUrl);
    }
  }, [state.playback.soundEnabled, stopSpeechAudio, synthesizeSpeechAudio, playAudioUrl]);

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
   * Candidate Management Methods
   */
  const saveCandidate = (candidate: Candidate) => {
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
    const defaults = resetStoredCandidates();
    setCandidates(defaults);
    const defIds = defaults.map(c => c.id);
    saveStoredSelectedCandidateIds(defIds);
    setState(CREATE_INITIAL_STATE(defIds));
  };

  /**
   * Candidate Selection Handlers (Available during IDLE phase)
   */
  const toggleCandidateSelection = (candidateId: string) => {
    if (state.phase !== 'IDLE') return;

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

      return {
        ...prev,
        participatingCandidateIds: nextSelected,
        activeCandidateIds: nextSelected,
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
    saveStoredSelectedCandidateIds(ids);
    setState(prev => ({
      ...prev,
      participatingCandidateIds: [...ids],
      activeCandidateIds: [...ids],
      stage: {
        ...prev.stage,
        content: `${ids.length} candidates selected. Press Start Election to begin.`,
        error: ids.length < 4 ? 'Please select at least 4 candidates to run an election.' : null,
      }
    }));
  };

  const setPresetRoster = (preset: 'all' | 'top8' | 'top6' | 'quick4') => {
    if (state.phase !== 'IDLE') return;
    const currentIds = candidates.map(c => c.id);
    let selected: string[] = [];

    switch (preset) {
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
        if (descriptor.llmPayload) {
          const res = await callLLM(descriptor.llmPayload);
          content = typeof res === 'object' && res.text ? res.text : (typeof res === 'string' ? res : '');
        }

        let audioBlobUrl: string | null = null;
        let audioBlob: Blob | null = null;

        if (content && descriptor.speakerId) {
          const candidate = CANDIDATE_MAP.get(descriptor.speakerId);
          const ttsRes = await synthesizeSpeechAudio(content, candidate?.voice?.voiceId, descriptor.speakerId);
          audioBlobUrl = ttsRes.audioBlobUrl;
          audioBlob = ttsRes.audioBlob;
        }

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
          audioBlob,
          isReady: true,
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
        };
        preparedStepsRef.current.set(stepKey, fallback);
        return fallback;
      }
    })();

    lookaheadBufferRef.current.set(stepKey, promise);
    return promise;
  }, [callLLM, synthesizeSpeechAudio]);

  const fetchOrConsumeStep = useCallback(async (descriptor: StepDescriptor): Promise<{ content: string; audioBlobUrl: string | null }> => {
    const { stepKey, actionType, round } = descriptor;

    // 1. Instant Memory Cache Hit by exact stepKey (0ms)
    if (preparedStepsRef.current.has(stepKey)) {
      const prep = preparedStepsRef.current.get(stepKey)!;
      preparedStepsRef.current.delete(stepKey);
      lookaheadBufferRef.current.delete(stepKey);
      setLookaheadBufferCount(preparedStepsRef.current.size);
      return { content: prep.content, audioBlobUrl: prep.audioBlobUrl };
    }

    // 2. Pending In-Flight Preload Promise by exact stepKey
    if (lookaheadBufferRef.current.has(stepKey)) {
      const prep = await lookaheadBufferRef.current.get(stepKey)!;
      preparedStepsRef.current.delete(stepKey);
      lookaheadBufferRef.current.delete(stepKey);
      setLookaheadBufferCount(preparedStepsRef.current.size);
      return { content: prep.content, audioBlobUrl: prep.audioBlobUrl };
    }

    // 3. Robust Elimination Fallback: if an elimination step was buffered for this round under another candidate ID, consume it
    if (actionType === 'eliminated') {
      for (const [key, prep] of preparedStepsRef.current.entries()) {
        if (prep.actionType === 'eliminated' && prep.round === round && prep.isReady) {
          preparedStepsRef.current.delete(key);
          lookaheadBufferRef.current.delete(key);
          setLookaheadBufferCount(preparedStepsRef.current.size);
          return { content: prep.content, audioBlobUrl: prep.audioBlobUrl };
        }
      }
    }

    // 4. Fallback: Preload right now and await both LLM and TTS concurrently
    const prep = await preloadStep(descriptor);
    preparedStepsRef.current.delete(stepKey);
    lookaheadBufferRef.current.delete(stepKey);
    setLookaheadBufferCount(preparedStepsRef.current.size);
    return { content: prep.content, audioBlobUrl: prep.audioBlobUrl };
  }, [preloadStep]);

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
          const possibleTargets = simActiveIds.filter(id => id !== attacker.id);
          const preferredTargetId = possibleTargets.find(id => {
            const c = CANDIDATE_MAP.get(id);
            return c && attacker.rivalArchetypes.includes(c.archetype);
          }) || possibleTargets[0];
          const targetCand = CANDIDATE_MAP.get(preferredTargetId);

          const recentAttackContext = (currentState.attacksByRound[simRound] || []).map(a => ({
            attackerName: CANDIDATE_MAP.get(a.attackerId)?.name || a.attackerId,
            targetName: CANDIDATE_MAP.get(a.targetId)?.name || a.targetId,
            text: a.text,
          }));

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
              historyContext: { 
                electionTopic,
                campaignSpeeches: currentState.campaignSpeeches,
                targetSpeechQuote: currentState.campaignSpeeches[preferredTargetId] || targetCand?.slogan,
                targetWeaknesses: targetCand?.weaknesses,
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
        const pactCount = simActiveIds.length >= 4 ? 2 : 1;
        if (simSpeakerIndex < pactCount) {
          const p1 = simSpeakerIndex === 0
            ? (CANDIDATE_MAP.get(simActiveIds[0]) || CANDIDATE_MAP.get(simActiveIds[0])!)
            : (CANDIDATE_MAP.get(simActiveIds[2]) || CANDIDATE_MAP.get(simActiveIds[0])!);
          const p2 = simSpeakerIndex === 0
            ? (CANDIDATE_MAP.get(simActiveIds[1]) || CANDIDATE_MAP.get(simActiveIds[1])!)
            : (CANDIDATE_MAP.get(simActiveIds[3]) || CANDIDATE_MAP.get(simActiveIds[1])!);

          const recentAttackContext = (currentState.attacksByRound[simRound] || []).map(a => ({
            attackerName: CANDIDATE_MAP.get(a.attackerId)?.name || a.attackerId,
            targetName: CANDIDATE_MAP.get(a.targetId)?.name || a.targetId,
            text: a.text,
          }));

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
              },
            }
          });
        } else {
          // Transition to Secret Voting calculation
          simPhase = 'VOTE_SECRET';
        }
      } else if (simPhase === 'VOTE_SECRET') {
        steps.push({
          stepKey: `vote_tally-r${simRound}`,
          phase: 'VOTE_SECRET',
          round: simRound,
          speakerId: null,
          targetId: null,
          actionType: 'vote',
          headline: `ROUND ${simRound}: CONFIDENTIAL ELIMINATION BALLOT`,
        });
        simPhase = 'VOTE_REVEAL';
      } else if (simPhase === 'VOTE_REVEAL') {
        const actualElimId = currentState.votesByRound[simRound]?.eliminatedId;
        const elimCandidateId = (actualElimId && simActiveIds.includes(actualElimId))
          ? actualElimId
          : simActiveIds[simActiveIds.length - 1];
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
      } else if (simPhase === 'ELIMINATION') {
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
        }
      } else if (simPhase === 'FINAL_VOTE' || simPhase === 'FINAL_REVEAL') {
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
    if (isExecutingStep.current) return;

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
        
        setState(prev => ({
          ...prev,
          phase: 'CAMPAIGN',
          participatingCandidateIds: [...prev.activeCandidateIds],
          currentSpeakerIndex: 0,
          stage: {
            speakerId: firstCandidate.id,
            targetId: null,
            actionType: 'speech',
            headline: `ROUND 1: OPENING CAMPAIGN ADDRESS — ${firstCandidate.name.toUpperCase()}`,
            content: 'Broadcasting opening campaign speech to Valoria...',
            isLoading: true,
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
            ...prev.tickerLog,
          ]
        }));

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

        const { content, audioBlobUrl } = await fetchOrConsumeStep(stepDescriptor);

        sounds.playSpeechBeep();
        if (audioBlobUrl) {
          playAudioUrl(audioBlobUrl);
        } else {
          playSpeechAudio(content, firstCandidate.voice?.voiceId, firstCandidate.id);
        }

        const updatedSpeeches = { ...state.campaignSpeeches, [firstCandidate.id]: content };
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
              message: `${firstCandidate.name}: "${content.slice(0, 90)}..."`,
              timestamp: Date.now(),
            },
            ...prev.tickerLog,
          ]
        }));

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

          const { content, audioBlobUrl } = await fetchOrConsumeStep(stepDescriptor);

          sounds.playSpeechBeep();
          if (audioBlobUrl) {
            playAudioUrl(audioBlobUrl);
          } else {
            playSpeechAudio(content, speaker.voice?.voiceId, speaker.id);
          }

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
          
          const possibleTargets = activeCandidateIds.filter(id => id !== firstAttacker.id);
          const preferredTargetId = possibleTargets.find(id => {
            const c = CANDIDATE_MAP.get(id);
            return c && firstAttacker.rivalArchetypes.includes(c.archetype);
          }) || possibleTargets[0];
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
              historyContext: {
                electionTopic: state.electionTopic || DEFAULT_TOPIC,
                campaignSpeeches: state.campaignSpeeches,
                targetSpeechQuote: state.campaignSpeeches[preferredTargetId] || targetCand?.slogan,
                targetWeaknesses: targetCand?.weaknesses,
                recentAttacks: [],
              },
            }
          };

          const { content, audioBlobUrl } = await fetchOrConsumeStep(stepDescriptor);

          sounds.playAttackSting();
          if (audioBlobUrl) {
            playAudioUrl(audioBlobUrl);
          } else {
            playSpeechAudio(content, firstAttacker.voice?.voiceId, firstAttacker.id);
          }

          const attackEvent: AttackEvent = {
            id: `atk-${Date.now()}`,
            round: 1,
            attackerId: firstAttacker.id,
            targetId: preferredTargetId,
            text: content,
            timestamp: Date.now(),
          };

          setState(prev => ({
            ...prev,
            attacksByRound: {
              ...prev.attacksByRound,
              [1]: [...(prev.attacksByRound[1] || []), attackEvent],
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
                message: `💥 ${firstAttacker.name} attacked ${CANDIDATE_MAP.get(preferredTargetId)?.name}: "${content.slice(0, 80)}..."`,
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
          const possibleTargets = activeCandidateIds.filter(id => id !== attacker.id);
          
          const recentAttacksThisRound = state.attacksByRound[round] || [];
          const retaliationTarget = recentAttacksThisRound.find(a => a.targetId === attacker.id)?.attackerId;
          
          const preferredTargetId = (retaliationTarget && possibleTargets.includes(retaliationTarget))
            ? retaliationTarget
            : possibleTargets.find(id => {
                const c = CANDIDATE_MAP.get(id);
                return c && attacker.rivalArchetypes.includes(c.archetype);
              }) || possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
          const targetCand = CANDIDATE_MAP.get(preferredTargetId);

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
              historyContext: {
                electionTopic: state.electionTopic || DEFAULT_TOPIC,
                campaignSpeeches: state.campaignSpeeches,
                targetSpeechQuote: state.campaignSpeeches[preferredTargetId] || targetCand?.slogan,
                targetWeaknesses: targetCand?.weaknesses,
                recentAttacks: recentAttackContext,
              },
            }
          };

          const { content, audioBlobUrl } = await fetchOrConsumeStep(stepDescriptor);

          sounds.playAttackSting();
          if (audioBlobUrl) {
            playAudioUrl(audioBlobUrl);
          } else {
            playSpeechAudio(content, attacker.voice?.voiceId, attacker.id);
          }

          const attackEvent: AttackEvent = {
            id: `atk-${Date.now()}`,
            round,
            attackerId: attacker.id,
            targetId: preferredTargetId,
            text: content,
            timestamp: Date.now(),
          };

          const updatedAttacks = [...(state.attacksByRound[round] || []), attackEvent];

          setState(prev => ({
            ...prev,
            attacksByRound: {
              ...prev.attacksByRound,
              [round]: updatedAttacks,
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
                message: `💥 ${attacker.name} challenged ${CANDIDATE_MAP.get(preferredTargetId)?.name}: "${content.slice(0, 80)}..."`,
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
            }
          });
        } else {
          // All active candidates attacked! Transition to CCTV_BACKROOM (Leaked private pacts)
          sounds.playCCTVBeep();

          // Generate 1-2 secret backroom alliances
          const proposer1 = CANDIDATE_MAP.get(activeCandidateIds[0])!;
          const receiver1 = CANDIDATE_MAP.get(activeCandidateIds[1])!;

          setState(prev => ({
            ...prev,
            phase: 'CCTV_BACKROOM',
            currentSpeakerIndex: 0,
            stage: {
              speakerId: proposer1.id,
              targetId: receiver1.id,
              actionType: 'pact',
              headline: `ROUND ${prev.round}: LEAKED CAPITOL SURVEILLANCE GRID`,
              content: 'Intercepting encrypted backroom audio feeds...',
              isLoading: true,
              isRevealingVotes: false,
              revealedVoteIndex: 0,
              error: null,
            },
            tickerLog: [
              {
                id: `tick-${Date.now()}`,
                type: 'pact',
                message: `🎥 BREAKING LEAK: Secret surveillance feed intercepted in Capitol Cloakroom!`,
                timestamp: Date.now(),
              },
              ...prev.tickerLog,
            ]
          }));

          const recentAttackContext = (state.attacksByRound[round] || []).map(a => ({
            attackerName: CANDIDATE_MAP.get(a.attackerId)?.name || a.attackerId,
            targetName: CANDIDATE_MAP.get(a.targetId)?.name || a.targetId,
            text: a.text,
          }));

          const stepDescriptor = {
            stepKey: `cctv-r${round}-0-${proposer1.id}`,
            phase: 'CCTV_BACKROOM' as GamePhase,
            round,
            speakerId: proposer1.id,
            targetId: receiver1.id,
            actionType: 'pact' as const,
            headline: `ROUND ${round}: LEAKED CAPITOL CCTV FEED 1 OF ${activeCandidateIds.length >= 4 ? 2 : 1}`,
            llmPayload: {
              action: 'backroom_pact' as const,
              candidateId: proposer1.id,
              targetId: receiver1.id,
              round,
              activeCandidateIds,
              historyContext: {
                electionTopic: state.electionTopic || DEFAULT_TOPIC,
                recentAttacks: recentAttackContext,
              },
            }
          };

          const { content, audioBlobUrl } = await fetchOrConsumeStep(stepDescriptor);

          const primaryPact: BackroomPact = {
            id: `pact-1-${Date.now()}`,
            round,
            proposerId: proposer1.id,
            receiverId: receiver1.id,
            agreedTargetId: activeCandidateIds.filter(id => id !== proposer1.id && id !== receiver1.id)[0] || activeCandidateIds[2] || activeCandidateIds[0],
            whisperText: content,
            audioBlobUrl: audioBlobUrl,
            location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
            timestamp: Date.now(),
          };

          const roundPacts = [primaryPact];

          // If 4+ candidates alive, generate a second secret pact
          if (activeCandidateIds.length >= 4) {
            const proposer2 = CANDIDATE_MAP.get(activeCandidateIds[2])!;
            const receiver2 = CANDIDATE_MAP.get(activeCandidateIds[3])!;

            try {
              const step2Descriptor = {
                stepKey: `cctv-r${round}-1-${proposer2.id}`,
                phase: 'CCTV_BACKROOM' as GamePhase,
                round,
                speakerId: proposer2.id,
                targetId: receiver2.id,
                actionType: 'pact' as const,
                headline: `ROUND ${round}: LEAKED CAPITOL CCTV FEED 2 OF 2`,
                llmPayload: {
                  action: 'backroom_pact' as const,
                  candidateId: proposer2.id,
                  targetId: receiver2.id,
                  round,
                  activeCandidateIds,
                  historyContext: {
                    electionTopic: state.electionTopic || DEFAULT_TOPIC,
                    recentAttacks: recentAttackContext,
                  },
                }
              };
              const p2Prep = await fetchOrConsumeStep(step2Descriptor);

              roundPacts.push({
                id: `pact-2-${Date.now()}`,
                round,
                proposerId: proposer2.id,
                receiverId: receiver2.id,
                agreedTargetId: activeCandidateIds.filter(id => id !== proposer2.id && id !== receiver2.id)[0] || activeCandidateIds[0],
                whisperText: p2Prep.content,
                audioBlobUrl: p2Prep.audioBlobUrl,
                location: LOCATIONS[(round + 2) % LOCATIONS.length],
                timestamp: Date.now(),
              });
            } catch (err) {
              console.warn('[Second pact generation skipped]:', err);
            }
          }

          sounds.playCCTVBeep();
          if (audioBlobUrl) {
            playAudioUrl(audioBlobUrl);
          } else {
            playSpeechAudio(content, proposer1.voice?.voiceId, proposer1.id);
          }

          setState(prev => ({
            ...prev,
            currentSpeakerIndex: 0,
            pactsByRound: {
              ...prev.pactsByRound,
              [round]: roundPacts,
            },
            stage: {
              ...prev.stage,
              speakerId: primaryPact.proposerId,
              targetId: primaryPact.receiverId,
              headline: `ROUND ${prev.round}: LEAKED CAPITOL CCTV FEED 1 OF ${roundPacts.length}`,
              content: primaryPact.whisperText,
              isLoading: false,
            },
            tickerLog: [
              {
                id: `tick-${Date.now()}`,
                type: 'pact',
                message: `🤫 Leaked Deal (Feed #1): ${proposer1.name} whispered to ${receiver1.name}: "${primaryPact.whisperText}"`,
                timestamp: Date.now(),
              },
              ...prev.tickerLog,
            ]
          }));

          dispatchBackgroundPreload({
            ...state,
            phase: 'CCTV_BACKROOM',
            currentSpeakerIndex: 0,
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
      // 4. CCTV_BACKROOM -> View Next Feed OR VOTE_SECRET (Secret Voting with Betrayal Detection)
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
          if (nextPact.audioBlobUrl) {
            playAudioUrl(nextPact.audioBlobUrl);
          } else {
            playSpeechAudio(nextPact.whisperText, p1?.voice?.voiceId, nextPact.proposerId);
          }

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

        const votePromises = activeCandidateIds.map(async (voterId) => {
          // Check if candidate had an active pact in this round
          const pact = pactsThisRound.find(p => p.proposerId === voterId || p.receiverId === voterId);
          const allyId = pact ? (pact.proposerId === voterId ? pact.receiverId : pact.proposerId) : undefined;
          const agreedTargetId = pact ? pact.agreedTargetId : undefined;

          const voteRes = await callLLM({
            action: 'elimination_vote',
            candidateId: voterId,
            round,
            activeCandidateIds,
            historyContext: {
              electionTopic: state.electionTopic || DEFAULT_TOPIC,
              recentAttacks: recentAttacksContext,
              activePact: (allyId && agreedTargetId) ? { allyId, agreedTargetId } : undefined,
            },
          });

          const actualTargetId = voteRes.voteTargetId || activeCandidateIds.filter(id => id !== voterId)[0];

          // Betrayal Analysis
          let isBetrayal = false;
          let isHonoredPact = false;
          let betrayedAllyId: string | undefined;

          if (pact && allyId && agreedTargetId) {
            if (actualTargetId === agreedTargetId) {
              isHonoredPact = true;
            } else {
              isBetrayal = true;
              betrayedAllyId = allyId;
            }
          }

          return {
            voterId,
            targetId: actualTargetId,
            reason: voteRes.privateReason,
            pactWithId: allyId,
            pactTargetId: agreedTargetId,
            isBetrayal,
            betrayedAllyId,
            isHonoredPact,
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
        let candidateToEliminate = activeCandidateIds[0];
        let isTie = false;

        Object.entries(tally).forEach(([candId, count]) => {
          if (count > highestVotes) {
            highestVotes = count;
            candidateToEliminate = candId;
            isTie = false;
          } else if (count === highestVotes) {
            isTie = true;
          }
        });

        const betrayalsList = votes.filter(v => v.isBetrayal);

        const roundTally: RoundVoteTally = {
          round,
          votes,
          tally,
          eliminatedId: candidateToEliminate,
          tieBreakerOccurred: isTie,
          betrayalsCount: betrayalsList.length,
        };

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

        setState(prev => ({
          ...prev,
          phase: 'VOTE_REVEAL',
          votesByRound: { ...prev.votesByRound, [round]: roundTally },
          stage: {
            speakerId: null,
            targetId: candidateToEliminate,
            actionType: 'vote',
            headline: `ROUND ${prev.round}: ELIMINATION VOTE TOTALS & ALLIANCE REVEALS`,
            content: `Vote tallies recorded. ${CANDIDATE_MAP.get(candidateToEliminate)?.name} received the highest elimination votes (${highestVotes} votes). ${betrayalsList.length > 0 ? `⚠️ ${betrayalsList.length} secret backroom pact(s) were betrayed!` : ''}`,
            isLoading: false,
            isRevealingVotes: true,
            revealedVoteIndex: votes.length,
            error: null,
          },
          tickerLog: [
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

        dispatchBackgroundPreload({
          ...state,
          phase: 'VOTE_REVEAL',
          votesByRound: { ...state.votesByRound, [round]: roundTally },
        });

        isExecutingStep.current = false;
        return;
      }

      // -------------------------------------------------------------
      // 5. VOTE REVEAL -> ELIMINATION ANNOUNCEMENT & EXIT WORDS
      // -------------------------------------------------------------
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

        const { content, audioBlobUrl } = await fetchOrConsumeStep(stepDescriptor);

        sounds.playSpeechBeep();
        if (audioBlobUrl) {
          playAudioUrl(audioBlobUrl);
        } else {
          playSpeechAudio(content, eliminatedCandidate.voice?.voiceId, eliminatedCandidate.id);
        }

        const newActiveIds = activeCandidateIds.filter(id => id !== eliminatedId);
        const eliminatedInfo = {
          candidateId: eliminatedId,
          eliminatedInRound: round,
          voteCount: roundTally?.tally[eliminatedId] || 0,
          exitWords: content,
        };

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
          const possibleTargets = activeCandidateIds.filter(id => id !== firstAttacker.id);
          const preferredTargetId = possibleTargets.find(id => {
            const c = CANDIDATE_MAP.get(id);
            return c && firstAttacker.rivalArchetypes.includes(c.archetype);
          }) || possibleTargets[0];
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
              historyContext: {
                electionTopic: state.electionTopic || DEFAULT_TOPIC,
                campaignSpeeches: state.campaignSpeeches,
                targetSpeechQuote: state.campaignSpeeches[preferredTargetId] || targetCand?.slogan,
                targetWeaknesses: targetCand?.weaknesses,
                recentAttacks: [],
              },
            }
          };

          const { content, audioBlobUrl } = await fetchOrConsumeStep(stepDescriptor);

          sounds.playAttackSting();
          if (audioBlobUrl) {
            playAudioUrl(audioBlobUrl);
          } else {
            playSpeechAudio(content, firstAttacker.voice?.voiceId, firstAttacker.id);
          }

          const attackEvent: AttackEvent = {
            id: `atk-${Date.now()}`,
            round: nextRound,
            attackerId: firstAttacker.id,
            targetId: preferredTargetId,
            text: content,
            timestamp: Date.now(),
          };

          setState(prev => ({
            ...prev,
            attacksByRound: {
              ...prev.attacksByRound,
              [nextRound]: [attackEvent],
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
                message: `💥 ${firstAttacker.name} challenged ${CANDIDATE_MAP.get(preferredTargetId)?.name}: "${content.slice(0, 80)}..."`,
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

          const { content, audioBlobUrl } = await fetchOrConsumeStep(stepDescriptor);

          sounds.playSpeechBeep();
          if (audioBlobUrl) {
            playAudioUrl(audioBlobUrl);
          } else {
            playSpeechAudio(content, firstFinalist.voice?.voiceId, firstFinalist.id);
          }

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

          const { content, audioBlobUrl } = await fetchOrConsumeStep(stepDescriptor);

          sounds.playSpeechBeep();
          if (audioBlobUrl) {
            playAudioUrl(audioBlobUrl);
          } else {
            playSpeechAudio(content, finalist.voice?.voiceId, finalist.id);
          }

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

          // Gather final votes from all participating candidates
          const votePromises = participatingCandidateIds.map(async (voterId) => {
            const voteRes = await callLLM({
              action: 'final_vote',
              candidateId: voterId,
              round: 99,
              activeCandidateIds,
              finalistIds: activeCandidateIds,
              historyContext: {
                electionTopic: state.electionTopic || DEFAULT_TOPIC,
                allClashesSummary,
              },
            });

            return {
              voterId,
              targetId: voteRes.voteTargetId || activeCandidateIds[0],
              reason: voteRes.privateReason,
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
            eliminatedId: null,
          };

          sounds.playVoteRevealDing();

          setState(prev => ({
            ...prev,
            phase: 'FINAL_REVEAL',
            finalVoteTally: finalTally,
            winnerId: electedWinnerId,
            stage: {
              speakerId: electedWinnerId,
              targetId: null,
              actionType: 'vote',
              headline: 'VALORIA PRESIDENTIAL ELECTION RESULTS',
              content: `${CANDIDATE_MAP.get(electedWinnerId)?.name} secured the presidency with ${highestVotes} electoral votes!`,
              isLoading: false,
              isRevealingVotes: true,
              revealedVoteIndex: votes.length,
              error: null,
            },
            tickerLog: [
              {
                id: `tick-${Date.now()}`,
                type: 'vote',
                message: `🏆 ELECTION WINNER: ${CANDIDATE_MAP.get(electedWinnerId)?.name} elected President of the Republic of Valoria!`,
                timestamp: Date.now(),
              },
              ...prev.tickerLog,
            ]
          }));
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

        const { content, audioBlobUrl } = await fetchOrConsumeStep(stepDescriptor);

        if (audioBlobUrl) {
          playAudioUrl(audioBlobUrl);
        } else {
          playSpeechAudio(content, winner.voice?.voiceId, winner.id);
        }

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

  // Auto-play loop
  useEffect(() => {
    if (state.playback.autoPlay && !state.playback.isPaused && !state.stage.isLoading && !state.stage.error && state.phase !== 'WINNER') {
      const speedDelays = {
        slow: 4500,
        normal: 2800,
        fast: 1200,
      };
      const delay = speedDelays[state.playback.speed] || 2800;

      autoPlayTimer.current = setTimeout(() => {
        executeNextStep();
      }, delay);
    }

    return () => {
      if (autoPlayTimer.current) clearTimeout(autoPlayTimer.current);
    };
  }, [state.playback.autoPlay, state.playback.isPaused, state.playback.speed, state.stage.isLoading, state.stage.error, state.phase, executeNextStep]);

  const startGame = async () => {
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

    const selectedTopicObj = getRandomDebateTopic();
    const freshTopic = `${selectedTopicObj.title}: ${selectedTopicObj.crisisSummary}`;

    const startingState: GameState = {
      ...state,
      electionTopic: freshTopic,
    };
    setState(startingState);

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
    isSpeakingAudio,
    playSpeechAudio,
    stopSpeechAudio,
    isBufferingLookahead,
    bufferingStatus,
    lookaheadBufferCount,
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
  };
}
