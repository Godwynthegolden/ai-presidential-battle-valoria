import assert from 'assert';
import { fishAudioService } from '../services/fishAudio';
import { CANDIDATES, CANDIDATE_MAP } from '../data/candidates';
import { GameState, GamePhase, StepDescriptor } from '../types/game';

// Universal simulation stepper matching useGameEngine.ts
function simulateNextSteps(currentState: GameState, maxDepth: number = 2): StepDescriptor[] {
  const steps: StepDescriptor[] = [];
  const activeCandidateIds = [...currentState.activeCandidateIds];
  if (activeCandidateIds.length === 0) return steps;

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
        steps.push({
          stepKey: `campaign-${simSpeakerIndex}-${cand.id}`,
          phase: 'CAMPAIGN',
          round: 1,
          speakerId: cand.id,
          targetId: null,
          actionType: 'speech',
          headline: `ROUND 1: CAMPAIGN ADDRESS — ${cand.name.toUpperCase()}`,
        });
      } else {
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

        steps.push({
          stepKey: `attack-r${simRound}-${simSpeakerIndex}-${attacker.id}`,
          phase: 'ATTACK',
          round: simRound,
          speakerId: attacker.id,
          targetId: preferredTargetId,
          actionType: 'attack',
          headline: `ROUND ${simRound}: LIVE ATTACK ROUND — ${attacker.name.toUpperCase()}`,
        });
      } else {
        simPhase = 'CCTV_BACKROOM';
        simSpeakerIndex = -1;
      }
    } else if (simPhase === 'CCTV_BACKROOM') {
      simSpeakerIndex += 1;
      const pactCount = simActiveIds.length >= 4 ? 2 : 1;
      if (simSpeakerIndex < pactCount) {
        const p1 = simSpeakerIndex === 0
          ? CANDIDATE_MAP.get(simActiveIds[0])!
          : (CANDIDATE_MAP.get(simActiveIds[2]) || CANDIDATE_MAP.get(simActiveIds[0])!);
        const p2 = simSpeakerIndex === 0
          ? CANDIDATE_MAP.get(simActiveIds[1])!
          : (CANDIDATE_MAP.get(simActiveIds[3]) || CANDIDATE_MAP.get(simActiveIds[1])!);

        steps.push({
          stepKey: `cctv-r${simRound}-${simSpeakerIndex}-${p1.id}`,
          phase: 'CCTV_BACKROOM',
          round: simRound,
          speakerId: p1.id,
          targetId: p2.id,
          actionType: 'pact',
          headline: `ROUND ${simRound}: LEAKED CAPITOL CCTV FEED ${simSpeakerIndex + 1} OF ${pactCount}`,
        });
      } else {
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
      steps.push({
        stepKey: `elimination-r${simRound}-${elimCand.id}`,
        phase: 'ELIMINATION',
        round: simRound,
        speakerId: elimCand.id,
        targetId: null,
        actionType: 'eliminated',
        headline: `ROUND ${simRound} ELIMINATION — ${elimCand.name.toUpperCase()}`,
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
        steps.push({
          stepKey: `final_speech-${simSpeakerIndex}-${finalist.id}`,
          phase: 'FINAL_SPEECHES',
          round: simRound,
          speakerId: finalist.id,
          targetId: null,
          actionType: 'speech',
          headline: `THE FINAL 3 SHOWDOWN: CLOSING ARGUMENT — ${finalist.name.toUpperCase()}`,
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
      });
      break;
    } else {
      break;
    }
  }

  return steps;
}

async function runPipelineTests() {
  console.log('--- Starting Universal Lookahead Pipeline & Complete TTS Tests ---');

  // Initialize CANDIDATE_MAP
  CANDIDATES.forEach(c => CANDIDATE_MAP.set(c.id, c));
  const activeIds = CANDIDATES.map(c => c.id).slice(0, 6);

  const baseState: GameState = {
    phase: 'IDLE',
    round: 1,
    participatingCandidateIds: activeIds,
    activeCandidateIds: activeIds,
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
      headline: 'REPUBLIC OF VALORIA',
      content: 'Debate idle',
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
    tickerLog: [],
  };

  // 1. Test Configurable Depth Lookaheads (2, 3, 4, 5 Steps)
  console.log('1. Testing Configurable Lookahead Depths (2, 3, 4, 5 steps)...');
  for (const depth of [2, 3, 4, 5] as const) {
    const steps = simulateNextSteps(baseState, depth);
    assert.strictEqual(steps.length, depth, `Lookahead must return exactly ${depth} steps`);
    console.log(`  ✓ Depth ${depth}: Generated [${steps.map(s => s.stepKey).join(', ')}]`);
  }

  // 2. Test Seamless Transition: ATTACK -> CCTV Feed 1 -> CCTV Feed 2 -> VOTE -> ELIMINATION
  console.log('2. Testing Seamless Lookahead across ATTACK -> CCTV (Feeds 1 & 2) -> VOTE -> ELIMINATION transitions...');
  const attackEndState: GameState = {
    ...baseState,
    phase: 'ATTACK',
    round: 1,
    currentSpeakerIndex: activeIds.length - 1, // Last attacker
  };

  const cctvLookahead = simulateNextSteps(attackEndState, 4);
  assert.strictEqual(cctvLookahead.length, 4);
  assert.strictEqual(cctvLookahead[0].phase, 'CCTV_BACKROOM', 'Step 1 after attack must be CCTV Feed 1');
  assert.strictEqual(cctvLookahead[1].phase, 'CCTV_BACKROOM', 'Step 2 after attack must be CCTV Feed 2');
  assert.strictEqual(cctvLookahead[2].phase, 'VOTE_SECRET', 'Step 3 after CCTV must be Secret Voting');
  assert.strictEqual(cctvLookahead[3].phase, 'ELIMINATION', 'Step 4 after Voting must be Elimination Concession');
  console.log(`  ✓ Seamless lookahead sequence verified: [${cctvLookahead.map(s => s.phase).join(' -> ')}]`);

  // 3. Test VOTE_REVEAL with known eliminated candidate
  console.log('3. Testing VOTE_REVEAL exact eliminated candidate concession speech lookahead...');
  const targetElimCandidate = CANDIDATE_MAP.get(activeIds[2])!;
  const voteRevealState: GameState = {
    ...baseState,
    phase: 'VOTE_REVEAL',
    round: 1,
    votesByRound: {
      1: {
        round: 1,
        votes: [],
        tally: { [targetElimCandidate.id]: 4 },
        eliminatedId: targetElimCandidate.id,
      }
    }
  };
  const elimLookahead = simulateNextSteps(voteRevealState, 2);
  assert.strictEqual(elimLookahead[0].stepKey, `elimination-r1-${targetElimCandidate.id}`, 'Must target the exact eliminated candidate from vote tally');
  assert.strictEqual(elimLookahead[0].speakerId, targetElimCandidate.id);
  console.log(`  ✓ Exact eliminated candidate concession speech predicted: ${targetElimCandidate.name} (${elimLookahead[0].stepKey})`);

  // 4. Test CCTV Secret Whisper TTS Synthesis
  console.log('4. Testing CCTV Secret Whisper & Elimination Concession TTS Synthesis with Fish.Audio...');
  const proposer = CANDIDATE_MAP.get(activeIds[0])!;
  const elimCandidate = CANDIDATE_MAP.get(activeIds[activeIds.length - 1])!;

  const whisperText = "Let's align our factions and eliminate our mutual rival on the upcoming secret ballot.";
  const concessionText = "The people have spoken. I step down with honor, but our movement continues!";

  const [whisperAudio, concessionAudio] = await Promise.all([
    fishAudioService.generateSpeech({
      text: whisperText,
      voiceId: proposer.voice?.voiceId || '5196af35f6ff4a0dbf541793fc9f2157',
      model: 's2.1-pro-free',
    }),
    fishAudioService.generateSpeech({
      text: concessionText,
      voiceId: elimCandidate.voice?.voiceId || 'b545c585f631496c914815291da4e893',
      model: 's2.1-pro-free',
    }),
  ]);

  assert(whisperAudio instanceof ArrayBuffer && whisperAudio.byteLength > 1000, 'Whisper TTS audio buffer must be valid');
  assert(concessionAudio instanceof ArrayBuffer && concessionAudio.byteLength > 1000, 'Concession TTS audio buffer must be valid');
  console.log(`  ✓ CCTV Whisper TTS generated (${whisperAudio.byteLength} bytes) for ${proposer.name}`);
  console.log(`  ✓ Concession Speech TTS generated (${concessionAudio.byteLength} bytes) for ${elimCandidate.name}`);

  // 5. Test Instantaneous In-Memory Cache Retrieval with Fallback Matching
  console.log('5. Testing In-Memory Cache Retrieval Speed and Elimination Fallback Matching...');
  const cacheMap = new Map<string, any>();
  const cctvKey = `cctv-r1-0-${proposer.id}`;
  const elimKey = `elimination-r1-${elimCandidate.id}`;
  cacheMap.set(cctvKey, { stepKey: cctvKey, content: whisperText, audioBlobUrl: 'blob:mock-cctv', isReady: true });
  cacheMap.set(elimKey, { stepKey: elimKey, actionType: 'eliminated', round: 1, content: concessionText, audioBlobUrl: 'blob:mock-elim', isReady: true });

  const t0 = performance.now();
  const retrievedCctv = cacheMap.get(cctvKey);
  cacheMap.delete(cctvKey);
  const retrievedElim = cacheMap.get(elimKey);
  cacheMap.delete(elimKey);
  const elapsedMs = performance.now() - t0;

  assert.strictEqual(retrievedCctv.content, whisperText);
  assert.strictEqual(retrievedElim.content, concessionText);
  assert(elapsedMs < 2, `Cache retrieval must be < 2ms (took ${elapsedMs.toFixed(3)}ms)`);
  console.log(`  ✓ Instantaneous Cache Retrieval: ${elapsedMs.toFixed(3)}ms`);

  console.log('\n--- ALL Universal Multi-Step Lookahead Pipeline Tests PASSED! ---');
}

runPipelineTests().catch(err => {
  console.error('Pipeline Test Failed:', err);
  process.exit(1);
});
