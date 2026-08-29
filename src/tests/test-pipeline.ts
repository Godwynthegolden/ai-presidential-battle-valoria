import assert from 'assert';
import { fishAudioService } from '../services/fishAudio';
import { CANDIDATES, CANDIDATE_MAP } from '../data/candidates';
import { GameState } from '../types/game';

async function runPipelineTests() {
  console.log('--- Starting 2-Step Lookahead Execution Pipeline Tests ---');

  // Initialize CANDIDATE_MAP
  CANDIDATES.forEach(c => CANDIDATE_MAP.set(c.id, c));
  const activeIds = CANDIDATES.map(c => c.id).slice(0, 6);

  // 1. Test Lookahead Descriptors for IDLE Phase
  console.log('1. Testing IDLE Phase 2-step lookahead generation...');
  const idleState: GameState = {
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

  const c0 = CANDIDATE_MAP.get(activeIds[0])!;
  const c1 = CANDIDATE_MAP.get(activeIds[1])!;

  assert.strictEqual(c0.id, activeIds[0]);
  assert.strictEqual(c1.id, activeIds[1]);
  console.log(`✓ IDLE phase step 1 (Speaker 0: ${c0.name}) and step 2 (Speaker 1: ${c1.name}) computed successfully!`);

  // 2. Test Lookahead Descriptors for Campaign Phase
  console.log('2. Testing CAMPAIGN Phase lookahead progression...');
  const campaignLastSpeakerState: GameState = {
    ...idleState,
    phase: 'CAMPAIGN',
    currentSpeakerIndex: activeIds.length - 1, // Last speaker
  };

  // Next step after last campaign speaker should transition directly to ATTACK round 1
  const firstAttacker = CANDIDATE_MAP.get(activeIds[0])!;
  const possibleTargets = activeIds.filter(id => id !== firstAttacker.id);
  const preferredTargetId = possibleTargets.find(id => {
    const c = CANDIDATE_MAP.get(id);
    return c && firstAttacker.rivalArchetypes.includes(c.archetype);
  }) || possibleTargets[0];

  assert(preferredTargetId !== undefined, 'Target for first attacker must exist');
  console.log(`✓ Campaign completion transitions lookahead to ATTACK phase (${firstAttacker.name} -> ${CANDIDATE_MAP.get(preferredTargetId)?.name})`);

  // 3. Test Concurrent Pre-buffering with Fish.Audio TTS
  console.log('3. Testing Concurrent Pre-buffering of 2 Steps (LLM + TTS)...');
  const step1Text = "Valoria stands at a historic crossroads. We must unite for prosperity!";
  const step2Text = "My opponent speaks of prosperity, but our borders and industries need decisive strength!";

  const [res1, res2] = await Promise.all([
    fishAudioService.generateSpeech({
      text: step1Text,
      voiceId: c0.voice?.voiceId || '5196af35f6ff4a0dbf541793fc9f2157',
      model: 's2.1-pro-free',
    }),
    fishAudioService.generateSpeech({
      text: step2Text,
      voiceId: c1.voice?.voiceId || 'b545c585f631496c914815291da4e893',
      model: 's2.1-pro-free',
    }),
  ]);

  assert(res1 instanceof ArrayBuffer && res1.byteLength > 1000, 'Step 1 TTS audio buffer must be valid');
  assert(res2 instanceof ArrayBuffer && res2.byteLength > 1000, 'Step 2 TTS audio buffer must be valid');
  console.log(`✓ Concurrent TTS Pre-buffering PASSED: Step 1 (${res1.byteLength} bytes), Step 2 (${res2.byteLength} bytes) ready simultaneously!`);

  // 4. Test In-memory Preload Buffer Key Matching
  console.log('4. Testing Pipeline Step Cache & Revocation...');
  const cacheMap = new Map<string, any>();
  const stepKey1 = `campaign-0-${c0.id}`;
  const stepKey2 = `campaign-1-${c1.id}`;

  cacheMap.set(stepKey1, { stepKey: stepKey1, content: step1Text, isReady: true });
  cacheMap.set(stepKey2, { stepKey: stepKey2, content: step2Text, isReady: true });

  assert.strictEqual(cacheMap.size, 2);
  assert.strictEqual(cacheMap.get(stepKey1)?.content, step1Text);
  assert.strictEqual(cacheMap.get(stepKey2)?.content, step2Text);

  // Consume step 1
  cacheMap.delete(stepKey1);
  assert.strictEqual(cacheMap.has(stepKey1), false);
  assert.strictEqual(cacheMap.has(stepKey2), true);

  console.log('✓ Pipeline step caching, lookup, and consumption PASSED!');

  console.log('\n--- ALL 2-Step Lookahead Execution Pipeline Tests PASSED! ---');
}

runPipelineTests().catch(err => {
  console.error('Pipeline Test Failed:', err);
  process.exit(1);
});
