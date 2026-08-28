'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, GamePhase, LLMRequestPayload, RoundVoteTally, VoteRecord, AttackEvent } from '@/types/game';
import { CANDIDATES, CANDIDATE_MAP } from '@/data/candidates';
import { sounds } from '@/utils/audio';
import { NineRouterConfigState } from '@/components/NineRouterSettingsModal';

const ALL_CANDIDATE_IDS = CANDIDATES.map(c => c.id);

const CREATE_INITIAL_STATE = (selectedIds: string[] = ALL_CANDIDATE_IDS): GameState => ({
  phase: 'IDLE',
  round: 1,
  participatingCandidateIds: [...selectedIds],
  activeCandidateIds: [...selectedIds],
  eliminatedCandidates: [],
  currentSpeakerIndex: 0,
  campaignSpeeches: {},
  finalSpeeches: {},
  attacksByRound: {},
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
      message: `National Election Commission: ${selectedIds.length} candidates registered for the Republic of Valoria presidential election.`,
      timestamp: Date.now(),
    }
  ],
});

export function useGameEngine(
  nineRouterConfig?: NineRouterConfigState,
  onRequireConfig?: () => void,
  initialCandidateIds: string[] = ALL_CANDIDATE_IDS
) {
  const [state, setState] = useState<GameState>(() => CREATE_INITIAL_STATE(initialCandidateIds));
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

  // Call the server API for LLM generation with active 9router config
  const callLLM = async (payload: LLMRequestPayload) => {
    const activeConfig = configRef.current;
    const requestPayload: LLMRequestPayload = {
      ...payload,
      config: activeConfig ? {
        baseUrl: activeConfig.baseUrl,
        apiKey: activeConfig.apiKey,
        model: activeConfig.model,
      } : undefined,
    };

    const res = await fetch('/api/llm/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({ error: 'Unknown server error' }));
      throw new Error(errJson.error || `HTTP ${res.status}`);
    }

    return res.json();
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
    let selected: string[] = [];

    switch (preset) {
      case 'quick4':
        selected = ALL_CANDIDATE_IDS.slice(0, 4);
        break;
      case 'top6':
        selected = ALL_CANDIDATE_IDS.slice(0, 6);
        break;
      case 'top8':
        selected = ALL_CANDIDATE_IDS.slice(0, 8);
        break;
      case 'all':
      default:
        selected = [...ALL_CANDIDATE_IDS];
        break;
    }

    setSelectedCandidateIds(selected);
  };

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

        const result = await callLLM({
          action: 'campaign_speech',
          candidateId: firstCandidate.id,
          round: 1,
          activeCandidateIds,
          historyContext: {},
        });

        sounds.playSpeechBeep();

        setState(prev => ({
          ...prev,
          campaignSpeeches: { ...prev.campaignSpeeches, [firstCandidate.id]: result.text },
          stage: {
            ...prev.stage,
            content: result.text,
            isLoading: false,
          },
          tickerLog: [
            {
              id: `tick-${Date.now()}`,
              type: 'speech',
              message: `${firstCandidate.name}: "${result.text.slice(0, 90)}..."`,
              timestamp: Date.now(),
            },
            ...prev.tickerLog,
          ]
        }));

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

          const result = await callLLM({
            action: 'campaign_speech',
            candidateId: speaker.id,
            round: 1,
            activeCandidateIds,
            historyContext: {},
          });

          sounds.playSpeechBeep();

          setState(prev => ({
            ...prev,
            campaignSpeeches: { ...prev.campaignSpeeches, [speaker.id]: result.text },
            stage: {
              ...prev.stage,
              content: result.text,
              isLoading: false,
            },
            tickerLog: [
              {
                id: `tick-${Date.now()}`,
                type: 'speech',
                message: `${speaker.name}: "${result.text.slice(0, 90)}..."`,
                timestamp: Date.now(),
              },
              ...prev.tickerLog,
            ]
          }));
        } else {
          // All active candidates have given campaign speeches! Transition to Round 1 ATTACK phase
          sounds.playGavel();
          const firstAttacker = CANDIDATE_MAP.get(activeCandidateIds[0])!;
          
          const possibleTargets = activeCandidateIds.filter(id => id !== firstAttacker.id);
          const preferredTargetId = possibleTargets.find(id => {
            const c = CANDIDATE_MAP.get(id);
            return c && firstAttacker.rivalArchetypes.includes(c.archetype);
          }) || possibleTargets[0];

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

          const result = await callLLM({
            action: 'attack',
            candidateId: firstAttacker.id,
            targetId: preferredTargetId,
            round,
            activeCandidateIds,
            historyContext: {
              campaignSpeeches: state.campaignSpeeches,
              recentAttacks: [],
            },
          });

          sounds.playAttackSting();

          const attackEvent: AttackEvent = {
            id: `atk-${Date.now()}`,
            round,
            attackerId: firstAttacker.id,
            targetId: preferredTargetId,
            text: result.text,
            timestamp: Date.now(),
          };

          setState(prev => ({
            ...prev,
            attacksByRound: {
              ...prev.attacksByRound,
              [round]: [...(prev.attacksByRound[round] || []), attackEvent],
            },
            stage: {
              ...prev.stage,
              content: result.text,
              isLoading: false,
            },
            tickerLog: [
              {
                id: `tick-${Date.now()}`,
                type: 'attack',
                message: `💥 ${firstAttacker.name} challenged ${CANDIDATE_MAP.get(preferredTargetId)?.name}: "${result.text.slice(0, 80)}..."`,
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
      // 3. ATTACK PHASE
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

          const result = await callLLM({
            action: 'attack',
            candidateId: attacker.id,
            targetId: preferredTargetId,
            round,
            activeCandidateIds,
            historyContext: {
              campaignSpeeches: state.campaignSpeeches,
              recentAttacks: recentAttackContext,
            },
          });

          sounds.playAttackSting();

          const attackEvent: AttackEvent = {
            id: `atk-${Date.now()}`,
            round,
            attackerId: attacker.id,
            targetId: preferredTargetId,
            text: result.text,
            timestamp: Date.now(),
          };

          setState(prev => ({
            ...prev,
            attacksByRound: {
              ...prev.attacksByRound,
              [round]: [...(prev.attacksByRound[round] || []), attackEvent],
            },
            stage: {
              ...prev.stage,
              content: result.text,
              isLoading: false,
            },
            tickerLog: [
              {
                id: `tick-${Date.now()}`,
                type: 'attack',
                message: `💥 ${attacker.name} challenged ${CANDIDATE_MAP.get(preferredTargetId)?.name}: "${result.text.slice(0, 80)}..."`,
                timestamp: Date.now(),
              },
              ...prev.tickerLog,
            ]
          }));
        } else {
          // All active candidates attacked! Transition to Secret Elimination Voting
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
            const voteRes = await callLLM({
              action: 'elimination_vote',
              candidateId: voterId,
              round,
              activeCandidateIds,
              historyContext: {
                recentAttacks: recentAttacksContext,
              },
            });

            return {
              voterId,
              targetId: voteRes.voteTargetId || activeCandidateIds.filter(id => id !== voterId)[0],
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

          const roundTally: RoundVoteTally = {
            round,
            votes,
            tally,
            eliminatedId: candidateToEliminate,
            tieBreakerOccurred: isTie,
          };

          sounds.playVoteRevealDing();

          setState(prev => ({
            ...prev,
            phase: 'VOTE_REVEAL',
            votesByRound: { ...prev.votesByRound, [round]: roundTally },
            stage: {
              speakerId: null,
              targetId: candidateToEliminate,
              actionType: 'vote',
              headline: `ROUND ${prev.round}: ELIMINATION VOTE TOTALS`,
              content: `Vote tallies recorded. ${CANDIDATE_MAP.get(candidateToEliminate)?.name} received the highest elimination votes (${highestVotes} votes).`,
              isLoading: false,
              isRevealingVotes: true,
              revealedVoteIndex: votes.length,
              error: null,
            },
            tickerLog: [
              {
                id: `tick-${Date.now()}`,
                type: 'vote',
                message: `📊 Round ${round} Vote Results: ${CANDIDATE_MAP.get(candidateToEliminate)?.name} received ${highestVotes} elimination votes.`,
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
      // 4. VOTE REVEAL -> ELIMINATION ANNOUNCEMENT & EXIT WORDS
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

        const result = await callLLM({
          action: 'exit_words',
          candidateId: eliminatedId,
          round,
          activeCandidateIds,
          historyContext: {},
        });

        const newActiveIds = activeCandidateIds.filter(id => id !== eliminatedId);
        const eliminatedInfo = {
          candidateId: eliminatedId,
          eliminatedInRound: round,
          voteCount: roundTally?.tally[eliminatedId] || 0,
          exitWords: result.text,
        };

        setState(prev => ({
          ...prev,
          activeCandidateIds: newActiveIds,
          eliminatedCandidates: [...prev.eliminatedCandidates, eliminatedInfo],
          stage: {
            ...prev.stage,
            content: `"${result.text}"`,
            isLoading: false,
          },
          tickerLog: [
            {
              id: `tick-${Date.now()}`,
              type: 'speech',
              message: `${eliminatedCandidate.name} Concession: "${result.text}"`,
              timestamp: Date.now(),
            },
            ...prev.tickerLog,
          ]
        }));

        isExecutingStep.current = false;
        return;
      }

      // -------------------------------------------------------------
      // 5. POST-ELIMINATION: Next Attack Round or Final 3 Speeches
      // -------------------------------------------------------------
      if (phase === 'ELIMINATION') {
        if (activeCandidateIds.length > 3) {
          sounds.playGavel();
          const nextRound = round + 1;
          const firstAttacker = CANDIDATE_MAP.get(activeCandidateIds[0])!;
          const possibleTargets = activeCandidateIds.filter(id => id !== firstAttacker.id);
          const preferredTargetId = possibleTargets[0];

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

          const result = await callLLM({
            action: 'attack',
            candidateId: firstAttacker.id,
            targetId: preferredTargetId,
            round: nextRound,
            activeCandidateIds,
            historyContext: {
              campaignSpeeches: state.campaignSpeeches,
              recentAttacks: [],
            },
          });

          sounds.playAttackSting();

          const attackEvent: AttackEvent = {
            id: `atk-${Date.now()}`,
            round: nextRound,
            attackerId: firstAttacker.id,
            targetId: preferredTargetId,
            text: result.text,
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
              content: result.text,
              isLoading: false,
            },
            tickerLog: [
              {
                id: `tick-${Date.now()}`,
                type: 'attack',
                message: `💥 ${firstAttacker.name} challenged ${CANDIDATE_MAP.get(preferredTargetId)?.name}: "${result.text.slice(0, 80)}..."`,
                timestamp: Date.now(),
              },
              ...prev.tickerLog,
            ]
          }));
        } else {
          // Exactly 3 candidates remain -> FINAL PRESIDENTIAL SPEECHES!
          sounds.playGavel();
          const firstFinalist = CANDIDATE_MAP.get(activeCandidateIds[0])!;

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

          const result = await callLLM({
            action: 'final_speech',
            candidateId: firstFinalist.id,
            round,
            activeCandidateIds,
            finalistIds: activeCandidateIds,
            historyContext: {},
          });

          sounds.playSpeechBeep();

          setState(prev => ({
            ...prev,
            finalSpeeches: { ...prev.finalSpeeches, [firstFinalist.id]: result.text },
            stage: {
              ...prev.stage,
              content: result.text,
              isLoading: false,
            },
            tickerLog: [
              {
                id: `tick-${Date.now()}`,
                type: 'speech',
                message: `👑 ${firstFinalist.name} Final Appeal: "${result.text.slice(0, 80)}..."`,
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
      // 6. FINAL SPEECHES (3 Finalists)
      // -------------------------------------------------------------
      if (phase === 'FINAL_SPEECHES') {
        const nextIndex = currentSpeakerIndex + 1;

        if (nextIndex < activeCandidateIds.length) {
          const finalist = CANDIDATE_MAP.get(activeCandidateIds[nextIndex])!;

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

          const result = await callLLM({
            action: 'final_speech',
            candidateId: finalist.id,
            round,
            activeCandidateIds,
            finalistIds: activeCandidateIds,
            historyContext: {},
          });

          sounds.playSpeechBeep();

          setState(prev => ({
            ...prev,
            finalSpeeches: { ...prev.finalSpeeches, [finalist.id]: result.text },
            stage: {
              ...prev.stage,
              content: result.text,
              isLoading: false,
            },
            tickerLog: [
              {
                id: `tick-${Date.now()}`,
                type: 'speech',
                message: `👑 ${finalist.name} Final Appeal: "${result.text.slice(0, 80)}..."`,
                timestamp: Date.now(),
              },
              ...prev.tickerLog,
            ]
          }));
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

          // Gather final votes from all participating candidates
          const votePromises = participatingCandidateIds.map(async (voterId) => {
            const voteRes = await callLLM({
              action: 'final_vote',
              candidateId: voterId,
              round: 99,
              activeCandidateIds,
              finalistIds: activeCandidateIds,
              historyContext: {},
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
      // 7. FINAL REVEAL -> WINNER CORONATION & INAUGURAL SPEECH
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

        const result = await callLLM({
          action: 'victory_speech',
          candidateId: winner.id,
          round: 100,
          activeCandidateIds: [winner.id],
          historyContext: {},
        });

        setState(prev => ({
          ...prev,
          victorySpeech: result.text,
          stage: {
            ...prev.stage,
            content: result.text,
            isLoading: false,
          },
          tickerLog: [
            {
              id: `tick-${Date.now()}`,
              type: 'speech',
              message: `🏛️ PRESIDENT ${winner.name}: "${result.text}"`,
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

  const startGame = () => {
    executeNextStep();
  };

  const nextStep = () => {
    executeNextStep();
  };

  const toggleAutoPlay = () => {
    setState(prev => ({
      ...prev,
      playback: {
        ...prev.playback,
        autoPlay: !prev.playback.autoPlay,
        isPaused: false,
      }
    }));
  };

  const setSpeed = (speed: 'slow' | 'normal' | 'fast') => {
    setState(prev => ({
      ...prev,
      playback: { ...prev.playback, speed }
    }));
  };

  const toggleSound = () => {
    setState(prev => ({
      ...prev,
      playback: { ...prev.playback, soundEnabled: !prev.playback.soundEnabled }
    }));
  };

  const restartGame = () => {
    if (autoPlayTimer.current) clearTimeout(autoPlayTimer.current);
    isExecutingStep.current = false;
    setState(CREATE_INITIAL_STATE(state.participatingCandidateIds));
  };

  const retryCurrentStep = () => {
    executeNextStep();
  };

  return {
    state,
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
  };
}
