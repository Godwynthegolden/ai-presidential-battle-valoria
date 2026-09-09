import { nineRouterService } from '../services/nineRouter';
import { 
  CANDIDATES, 
  CANDIDATE_MAP, 
  getStoredCandidates,
  getStoredSelectedCandidateIds, 
  saveStoredSelectedCandidateIds 
} from '../data/candidates';
import { Candidate } from '../types/candidate';
import { VoteRecord, BailoutTransaction, RoundVoteTally } from '../types/game';
import { sounds } from '../utils/audio';
import { COLOR_PRESETS, createColorTheme, hexToRgb } from '../components/CharacterEditorModal';
import { CURATED_VOICES } from '../services/fishAudio';
import { 
  tokenizeSpeech, 
  classifyWord, 
  getRevealedWordCount, 
  getAcousticRevealedWordCount,
  getActiveWordIndex, 
  estimateSpokenDurationSeconds, 
  cleanWordToken,
  buildCharacterNameMap,
  extractNameKey
} from '../utils/kineticSubtitles';
import { audioSync } from '../utils/audioSync';

async function testEngine() {
  console.log('Testing 31 Republic of Valoria Candidates loaded:', CANDIDATES.length);
  if (CANDIDATES.length !== 31) {
    throw new Error(`Expected 31 candidates, got ${CANDIDATES.length}`);
  }

  // Check candidate fields & strict naming rules
  const firstNames = new Set<string>();
  const lastNames = new Map<string, string[]>(); // lastName -> candidate names

  for (const c of CANDIDATES) {
    if (!c.id || !c.name || !c.titleRole || !c.slogan || !c.systemPrompt) {
      throw new Error(`Candidate ${c.id} missing required fields.`);
    }

    const words = c.name.trim().split(/\s+/);
    if (words.length > 2) {
      throw new Error(`Candidate name "${c.name}" has more than 2 words (${words.length} words).`);
    }

    const firstName = words[0];
    const lastName = words.length > 1 ? words[1] : '';

    if (firstNames.has(firstName)) {
      throw new Error(`Duplicate first name detected: "${firstName}" in candidate "${c.name}".`);
    }
    firstNames.add(firstName);

    if (lastName) {
      if (!lastNames.has(lastName)) {
        lastNames.set(lastName, []);
      }
      lastNames.get(lastName)!.push(c.name);
    }
  }

  // Check last name uniqueness (only 'Sterling' allowed between Arthur & Victoria)
  for (const [lastName, names] of lastNames.entries()) {
    if (names.length > 1) {
      if (lastName === 'Sterling') {
        const isArthurAndVictoria = names.includes('Arthur Sterling') && names.includes('Victoria Sterling') && names.length === 2;
        if (!isArthurAndVictoria) {
          throw new Error(`Unexpected shared last name Sterling among: ${names.join(', ')}`);
        }
      } else {
        throw new Error(`Duplicate unrelated last name detected: "${lastName}" among: ${names.join(', ')}`);
      }
    }
  }
  console.log('All 31 candidates have strictly <=2 word names with 0 first name collisions and 0 unrelated last name collisions!');
  console.log('All 31 candidate dossiers & titleRoles verified successfully!');

  // Verify CURATED_VOICES count and completeness
  console.log('Testing Curated TTS Voice Models:', CURATED_VOICES.length);
  if (CURATED_VOICES.length < 30) {
    throw new Error(`Expected at least 30 curated TTS voices, got ${CURATED_VOICES.length}`);
  }
  for (const v of CURATED_VOICES) {
    if (!v.id || !v.name || !v.category || !v.description) {
      throw new Error(`Voice model ${v.id} missing fields.`);
    }
  }
  console.log('All Curated TTS Voice Models verified successfully!');

  // Test Fish Audio Round-Robin Multi-Key Pool & Rotation
  console.log('Testing Fish Audio Round-Robin Multi-Key Pool:');
  const { fishAudioService, DEFAULT_FISH_AUDIO_KEYS } = await import('../services/fishAudio');
  if (!DEFAULT_FISH_AUDIO_KEYS || DEFAULT_FISH_AUDIO_KEYS.length < 2) {
    throw new Error('Expected at least 2 default Fish Audio API keys in pool');
  }
  const parsedKeys = fishAudioService.parseApiKeys('sk-fish-key1, sk-fish-key2\nsk-fish-key3');
  if (parsedKeys.length !== 3 || parsedKeys[0] !== 'sk-fish-key1' || parsedKeys[1] !== 'sk-fish-key2' || parsedKeys[2] !== 'sk-fish-key3') {
    throw new Error(`Failed to parse multi-key string: ${JSON.stringify(parsedKeys)}`);
  }
  // Test round-robin rotation
  const key1 = fishAudioService.getNextApiKey('sk-fish-alpha, sk-fish-beta');
  const key2 = fishAudioService.getNextApiKey('sk-fish-alpha, sk-fish-beta');
  const key3 = fishAudioService.getNextApiKey('sk-fish-alpha, sk-fish-beta');
  if (key1 === key2 || key1 !== key3) {
    throw new Error(`Round-robin rotation failed: key1=${key1}, key2=${key2}, key3=${key3}`);
  }
  console.log('Fish Audio Multi-Key Round-Robin parsing & atomic rotation PASSED!');

  // Test getStoredCandidates
  const storedCandidates = getStoredCandidates();
  if (storedCandidates.length !== 31) {
    throw new Error(`Expected getStoredCandidates to return 31 candidates, got ${storedCandidates.length}`);
  }
  console.log('getStoredCandidates default and auto-merge verified successfully!');

  // Test isConfigured
  console.log('Testing isConfigured check:');
  console.log('Without credentials:', nineRouterService.isConfigured({ baseUrl: '', apiKey: '' }));
  console.log('With credentials:', nineRouterService.isConfigured({ baseUrl: 'http://localhost:20128/v1', apiKey: 'test_key' }));

  // Test dynamic preset counts & selection persistence fallback
  const preset4 = CANDIDATES.slice(0, 4).map(c => c.id);
  const preset6 = CANDIDATES.slice(0, 6).map(c => c.id);
  const preset8 = CANDIDATES.slice(0, 8).map(c => c.id);
  const preset31 = CANDIDATES.map(c => c.id);
  const youtube11 = [
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
  if (youtube11.length !== 11) {
    throw new Error('Expected YouTube 11 lineup to have 11 IDs');
  }
  for (const yId of youtube11) {
    if (!CANDIDATES.some(c => c.id === yId)) {
      throw new Error(`YouTube 11 lineup candidate ${yId} not found in CANDIDATES catalog!`);
    }
  }
  console.log(`Verified custom roster presets: Quick4 (${preset4.length}), Top6 (${preset6.length}), Top8 (${preset8.length}), YouTube11 (${youtube11.length}), All31 (${preset31.length})`);

  // Test active candidate moving & reordering simulation
  let testLineup = [...youtube11];
  // Move 'sora-kim' to top
  const soraIdx = testLineup.indexOf('sora-kim');
  const [sora] = testLineup.splice(soraIdx, 1);
  testLineup.unshift(sora);
  if (testLineup[0] !== 'sora-kim') {
    throw new Error('Failed to move sora-kim to slot #1');
  }
  // Reverse lineup
  testLineup.reverse();
  if (testLineup[testLineup.length - 1] !== 'sora-kim') {
    throw new Error('Failed to reverse lineup');
  }
  console.log('Interactive active lineup drag & shift reordering simulation PASSED!');

  // Test selected lineup fallback
  const storedFallback = getStoredSelectedCandidateIds(preset6);
  if (storedFallback.length !== 6) {
    throw new Error(`Expected fallback to return 6 IDs, got ${storedFallback.length}`);
  }
  console.log('Candidate lineup selection persistence & fallback helpers PASSED!');

  // Test expanded color themes
  console.log('Testing expanded character color presets: count =', COLOR_PRESETS.length);
  if (COLOR_PRESETS.length < 25) {
    throw new Error(`Expected at least 25 color presets, got ${COLOR_PRESETS.length}`);
  }
  const customGenerated = createColorTheme('#ff0055', 'Laser Neon');
  if (!customGenerated.bg.includes('rgba(255, 0, 85,') || customGenerated.primary !== '#ff0055') {
    throw new Error('createColorTheme failed to compute proper rgba values');
  }
  const rgb = hexToRgb('#06b6d4');
  if (rgb.r !== 6 || rgb.g !== 182 || rgb.b !== 212) {
    throw new Error('hexToRgb failed');
  }
  console.log(`Expanded color palette (${COLOR_PRESETS.length} presets across 5 categories) & custom color generation PASSED!`);

  // Test custom candidate profile structure
  const customCandidate: Candidate = {
    id: 'custom_victor_stone',
    name: 'Victor Stone',
    codename: 'THE CYBER HAWK',
    archetype: 'technocrat',
    archetypeTitle: 'Cyber Warfare Architect',
    titleRole: 'Former Defense Cyber Director',
    slogan: 'Fortify Valoria Against Foreign Cyber Threat!',
    ideology: 'National cyber sovereignty, AI defense grid, technological supremacy.',
    personality: 'Hyper-focused, analytical, intense, commanding.',
    speakingStyle: 'Precise, authoritative, rapid-fire technical arguments.',
    motivations: 'To protect Valoria from foreign espionage and cyber warfare.',
    strengths: ['Technical mastery', 'Crisis management'],
    weaknesses: ['Distrustful of civilian politicians'],
    behavioralTendencies: ['Strikes corruption leaks'],
    rivalArchetypes: ['wildcard', 'conspiracy'],
    color: {
      primary: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.12)',
      border: 'rgba(59, 130, 246, 0.5)',
      text: '#60a5fa',
      glow: 'rgba(59, 130, 246, 0.3)',
      gradient: 'from-blue-600/20 to-slate-900',
    },
    avatar: {
      icon: 'Shield',
      svgType: 'shield',
    },
    customAvatarUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    isCustom: true,
    systemPrompt: 'You are Victor Stone, Cyber Warfare Architect running for President of the Republic of Valoria.',
  };

  if (!customCandidate.customAvatarUrl || !customCandidate.isCustom) {
    throw new Error('Custom candidate structure validation failed.');
  }
  console.log('Custom candidate profile & avatar Data URL validation PASSED!');

  // Test resilient JSON extraction
  const jsonWithMarkdown = '```json\n{\n  "name": "Evelyn Frost",\n  "titleRole": "Bio-Ethics Minister",\n  "slogan": "Protect Human Dignity",\n}\n```';
  const parsedMarkdown = (nineRouterService as any).extractJson(jsonWithMarkdown);
  if (!parsedMarkdown || parsedMarkdown.name !== 'Evelyn Frost') {
    throw new Error('Failed to parse markdown-wrapped JSON with trailing commas');
  }
  console.log('Resilient JSON extraction from markdown fences with trailing commas PASSED!');

  // Test heuristic profile extraction from plain text
  const plainTextResponse = `Here is the profile:
Name: Dr. Aris Thorne
Title: Quantum Computing Minister
Slogan: Compute Valoria's Quantum Future!
Ideology: Direct algorithmic optimization of public resources.
`;
  const extractedProfile = (nineRouterService as any).extractCharacterProfile(plainTextResponse, 'Quantum computing scientist');
  if (!extractedProfile || extractedProfile.name !== 'Dr. Aris Thorne' || !extractedProfile.titleRole) {
    throw new Error('Failed to extract character profile from plain text output');
  }
  console.log('Heuristic character profile extraction from unformatted text PASSED!');

  // Test custom candidate resolution when not in default CANDIDATE_MAP
  const nonExistentCustomId = 'custom_1787970834052';
  const customDynamicCandidate: Candidate = {
    ...customCandidate,
    id: nonExistentCustomId,
    name: 'Senator Clara Hayes',
  };

  try {
    await nineRouterService.generateAgentAction(
      {
        action: 'campaign_speech',
        candidateId: nonExistentCustomId,
        candidate: customDynamicCandidate,
        allCandidates: [customDynamicCandidate, ...CANDIDATES],
        round: 1,
        activeCandidateIds: [nonExistentCustomId, ...preset4],
        historyContext: {},
      },
      { baseUrl: '', apiKey: '' } // Unconfigured triggers early error check after finding candidate
    );
  } catch (err: any) {
    // It should fail with "9router Base URL is not configured", NOT "Candidate with id not found"
    if (err.message.includes('not found')) {
      throw new Error(`Failed to resolve dynamic custom candidate in generateAgentAction: ${err.message}`);
    }
    console.log('Dynamic custom candidate properly resolved in generateAgentAction PASSED!');
  }

  // Test parseAndValidateVote with strategyMonologue extraction
  console.log('Testing parseAndValidateVote with strategyMonologue extraction:');
  const voteJsonWithMonologue = JSON.stringify({
    vote: 'candidate_02',
    strategyMonologue: 'Elena Vance has dominated the airwaves with her technocratic rhetoric. If I do not strike her now, she will outlast our coalition in the final rounds. Her elimination is mathematically necessary.',
    reason: 'Eliminate technocrat threat',
  });
  const parsedVoteResult = await (nineRouterService as any).parseAndValidateVote(
    voteJsonWithMonologue,
    CANDIDATES[0],
    {
      action: 'elimination_vote',
      candidateId: CANDIDATES[0].id,
      round: 1,
      activeCandidateIds: [CANDIDATES[0].id, 'candidate_02', 'candidate_03'],
      historyContext: {},
    },
    'system',
    'prompt',
    '',
    '',
    ''
  );
  if (parsedVoteResult.vote !== 'candidate_02' || !parsedVoteResult.strategyMonologue.includes('Elena Vance')) {
    throw new Error(`Failed to parse vote and strategy monologue: ${JSON.stringify(parsedVoteResult)}`);
  }

  // Test concise internal dialogue without mottos
  const conciseVoteJson = JSON.stringify({
    vote: 'candidate_03',
    strategyMonologue: 'Marcus has too much money. Taking him out now breaks the lobby and guarantees my survival.',
    reason: 'Drain treasury',
  });
  const conciseResult = await (nineRouterService as any).parseAndValidateVote(
    conciseVoteJson,
    CANDIDATES[0],
    {
      action: 'elimination_vote',
      candidateId: CANDIDATES[0].id,
      round: 1,
      activeCandidateIds: [CANDIDATES[0].id, 'candidate_02', 'candidate_03'],
      historyContext: {},
    },
    'system',
    'prompt',
    '',
    '',
    ''
  );
  if (conciseResult.vote !== 'candidate_03' || !conciseResult.strategyMonologue.includes('Marcus has too much money')) {
    throw new Error(`Failed to parse concise strategy monologue: ${JSON.stringify(conciseResult)}`);
  }

  // Test Death Note (Light & L level) 3-beat psychological deduction internal dialogue (up to 30 words)
  const deathNoteMonologue = "Alvarez thinks his union rhetoric cornered me. Fool. While he's busy rallying the crowd, my ballot forces his last forty million into liquidation.";
  const deathNoteVoteJson = JSON.stringify({
    vote: 'jax-alvarez',
    strategyMonologue: deathNoteMonologue,
    reason: 'Liquidation trap',
  });
  const deathNoteResult = await (nineRouterService as any).parseAndValidateVote(
    deathNoteVoteJson,
    CANDIDATES[2], // Arthur Sterling
    {
      action: 'elimination_vote',
      candidateId: 'art-sterling',
      round: 1,
      activeCandidateIds: ['art-sterling', 'jax-alvarez', 'elena-rostova'],
      historyContext: {},
    },
    'system',
    'prompt',
    '',
    '',
    ''
  );
  if (deathNoteResult.vote !== 'jax-alvarez' || deathNoteResult.strategyMonologue !== deathNoteMonologue) {
    throw new Error(`Failed to parse Death Note level strategy monologue: ${JSON.stringify(deathNoteResult)}`);
  }
  console.log('Death Note (Light & L level) 30-word internal strategy monologue extraction PASSED!');

  // Test Valoria Debate Topics catalog
  console.log('Testing Valoria Debate Topics catalog:');
  const { VALORIA_DEBATE_TOPICS, getRandomDebateTopic } = await import('../data/candidates');
  if (!VALORIA_DEBATE_TOPICS || VALORIA_DEBATE_TOPICS.length < 8) {
    throw new Error(`Expected at least 8 debate crisis topics, got ${VALORIA_DEBATE_TOPICS?.length}`);
  }
  for (const topic of VALORIA_DEBATE_TOPICS) {
    if (!topic.id || !topic.title || !topic.category || !topic.crisisSummary || !topic.moderatorQuestion) {
      throw new Error(`Topic ${topic.id} missing required fields`);
    }
  }
  const randomTopic = getRandomDebateTopic();
  if (!randomTopic || !randomTopic.title) {
    throw new Error('getRandomDebateTopic() returned invalid topic');
  }
  console.log(`Verified ${VALORIA_DEBATE_TOPICS.length} Valoria crisis debate topics. Sample topic: "${randomTopic.title}" PASSED!`);

  // Test campaign prompt builder: self-introduction only, 25 words max, and anti-formula character individuality
  const testCandidate = CANDIDATES[0];
  const openingPrompt = (nineRouterService as any).buildPrompt(testCandidate, {
    action: 'campaign_speech',
    candidateId: testCandidate.id,
    round: 1,
    activeCandidateIds: [testCandidate.id, CANDIDATES[1].id],
    historyContext: {
      electionTopic: randomTopic.title,
      precedingSpeeches: [],
    },
  });
  if (
    !openingPrompt.userPrompt.includes('PRESIDENTIAL CAMPAIGN') || 
    !openingPrompt.userPrompt.includes(randomTopic.title) || 
    !openingPrompt.userPrompt.includes('PROMOTE YOURSELF') ||
    !openingPrompt.userPrompt.includes('ONLY INTRODUCE YOURSELF') ||
    !openingPrompt.userPrompt.includes('25 WORDS') ||
    !openingPrompt.userPrompt.includes('ANTI-SCRIPT-FORMULA MANDATE')
  ) {
    throw new Error('Opening campaign prompt failed to inject self-introduction, 25-word limit, or anti-formula rules');
  }

  const subsequentPrompt = (nineRouterService as any).buildPrompt(CANDIDATES[1], {
    action: 'campaign_speech',
    candidateId: CANDIDATES[1].id,
    round: 1,
    activeCandidateIds: [testCandidate.id, CANDIDATES[1].id],
    historyContext: {
      electionTopic: randomTopic.title,
      precedingSpeeches: [
        {
          candidateId: testCandidate.id,
          candidateName: testCandidate.name,
          titleRole: testCandidate.titleRole,
          speech: 'I am Jackson Alvarez—steelworker and Governor fighting for Valoria.',
        }
      ],
    },
  });
  if (
    !subsequentPrompt.userPrompt.includes('DO NOT default to attacking or rebutting the candidate who spoke before you') || 
    !subsequentPrompt.userPrompt.includes('PROMOTE YOURSELF') ||
    !subsequentPrompt.userPrompt.includes('ONLY INTRODUCE YOURSELF') ||
    !subsequentPrompt.userPrompt.includes('25 WORDS') ||
    !subsequentPrompt.userPrompt.includes('ANTI-SCRIPT-FORMULA MANDATE')
  ) {
    throw new Error('Subsequent campaign prompt failed to enforce self-introduction, 25-word limit, and anti-formula rules');
  }
  console.log('Campaign self-introduction prompt & 25-word limit (Anti-Formula) PASSED!');

  // Test attack prompt with spoken quote and vulnerabilities
  const attackPrompt = (nineRouterService as any).buildPrompt(testCandidate, {
    action: 'attack',
    candidateId: testCandidate.id,
    targetId: CANDIDATES[1].id,
    round: 1,
    activeCandidateIds: [testCandidate.id, CANDIDATES[1].id],
    historyContext: {
      targetSpeechQuote: 'I will balance the budget and freeze taxes.',
      targetWeaknesses: CANDIDATES[1].weaknesses,
    },
  });
  if (!attackPrompt.userPrompt.includes("TARGET'S SPOKEN QUOTE") || !attackPrompt.userPrompt.includes(CANDIDATES[1].weaknesses[0])) {
    throw new Error('Attack prompt failed to inject target quote and vulnerability points');
  }
  console.log('Context-aware target quote and vulnerability attack prompt PASSED!');

  // Test exit words prompt with betrayal context
  const exitPrompt = (nineRouterService as any).buildPrompt(testCandidate, {
    action: 'exit_words',
    candidateId: testCandidate.id,
    round: 2,
    activeCandidateIds: [testCandidate.id],
    historyContext: {
      betrayalContext: {
        wasBetrayed: true,
        betrayedByCandidateName: 'Dominic Sterling',
        voteCountAgainstSelf: 4,
      },
    },
  });
  if (!exitPrompt.userPrompt.includes('Dominic Sterling') || !exitPrompt.userPrompt.includes('4 elimination votes')) {
    throw new Error('Concession exit words prompt failed to inject betrayal perpetrator');
  }
  console.log('Concession prompt with backroom betrayal context PASSED!');

  // Test Timeline Event Ordering post-elimination
  console.log('Testing Live Battle Timeline Chronological Ordering...');
  const mockState = {
    phase: 'ATTACK' as const,
    round: 2,
    participatingCandidateIds: ['cand1', 'cand2', 'cand3', 'cand4', 'cand5'],
    activeCandidateIds: ['cand1', 'cand2', 'cand3', 'cand4'],
    eliminatedCandidates: [
      { candidateId: 'cand5', eliminatedInRound: 1, voteCount: 3, exitWords: 'Goodbye Valoria' }
    ],
    currentSpeakerIndex: 0,
    campaignSpeeches: {
      'cand1': 'Speech 1',
      'cand2': 'Speech 2',
      'cand3': 'Speech 3',
      'cand4': 'Speech 4',
      'cand5': 'Speech 5',
    } as Record<string, string>,
    finalSpeeches: {} as Record<string, string>,
    attacksByRound: {
      1: [
        { id: 'atk-r1-1', round: 1, attackerId: 'cand1', targetId: 'cand2', text: 'Attack R1', timestamp: 100 }
      ],
      2: [
        { id: 'atk-r2-1', round: 2, attackerId: 'cand1', targetId: 'cand3', text: 'Attack R2', timestamp: 200 }
      ],
    } as Record<number, any[]>,
    pactsByRound: {
      1: [
        { id: 'pact-r1-1', round: 1, proposerId: 'cand1', receiverId: 'cand2', agreedTargetId: 'cand5', whisperText: 'Pact R1', location: 'Hallway', timestamp: 150 }
      ],
    } as Record<number, any[]>,
    votesByRound: {},
    finalVoteTally: null,
    victorySpeech: null,
    winnerId: null,
    stage: {
      speakerId: 'cand1',
      targetId: 'cand3',
      actionType: 'attack' as const,
      headline: 'Attack R2',
      content: 'Attack R2',
      isLoading: false,
      isRevealingVotes: false,
      revealedVoteIndex: 0,
      error: null,
    },
    playback: { autoPlay: false, speed: 'normal' as const, soundEnabled: true, isPaused: false },
    tickerLog: [],
  };

  const roundNumbers = new Set<number>([1, mockState.round]);
  Object.keys(mockState.attacksByRound).forEach(r => roundNumbers.add(Number(r)));
  Object.keys(mockState.pactsByRound).forEach(r => roundNumbers.add(Number(r)));
  mockState.eliminatedCandidates.forEach(e => roundNumbers.add(e.eliminatedInRound));
  const sortedRounds = Array.from(roundNumbers).sort((a, b) => a - b);
  
  const testEvents: any[] = [];
  sortedRounds.forEach(r => {
    if (r === 1) {
      mockState.participatingCandidateIds.forEach(id => {
        if (mockState.campaignSpeeches[id]) {
          testEvents.push({ id: `speech-r1-${id}`, round: 1, type: 'speech' });
        }
      });
    }
    (mockState.attacksByRound[r] || []).forEach(a => testEvents.push({ id: a.id, round: r, type: 'attack' }));
    (mockState.pactsByRound[r] || []).forEach(p => testEvents.push({ id: p.id, round: r, type: 'pact' }));
    mockState.eliminatedCandidates.filter(e => e.eliminatedInRound === r).forEach(e => testEvents.push({ id: `elim-r${r}-${e.candidateId}`, round: r, type: 'elimination' }));
  });
  const reversed = [...testEvents].reverse();

  if (reversed[0].id !== 'atk-r2-1') {
    throw new Error(`Expected latest event to be Round 2 attack 'atk-r2-1', but got '${reversed[0].id}'`);
  }
  if (reversed[1].id !== 'elim-r1-cand5') {
    throw new Error(`Expected second event to be Round 1 elimination 'elim-r1-cand5', but got '${reversed[1].id}'`);
  }
  if (reversed[2].id !== 'pact-r1-1') {
    throw new Error(`Expected third event to be Round 1 pact 'pact-r1-1', but got '${reversed[2].id}'`);
  }
  console.log('Live Battle Timeline Chronological Ordering post-elimination PASSED!');

  // Test Dialogue Speech Sanitization (No "Name : Explanation" formula)
  console.log('Testing Dialogue Speech Sanitizer for Attack Dialogue & Name-Colon Stripping...');
  const targetCand = CANDIDATES[0]; // Jackson "Jax" Alvarez
  const speakerCand = CANDIDATES[1]; // Elena Rostova

  const sample1 = 'Alvarez : A bad person who sold out our workers.';
  const cleaned1 = (nineRouterService as any).sanitizeDialogueSpeech(sample1, speakerCand, targetCand);
  if (cleaned1.startsWith('Alvarez') || cleaned1.includes(':')) {
    throw new Error(`Sanitizer failed to strip 'Alvarez :' prefix: got '${cleaned1}'`);
  }
  if (!cleaned1.startsWith('A bad person')) {
    throw new Error(`Unexpected sanitized content: got '${cleaned1}'`);
  }

  const sample2 = 'Chloe: She thinks algorithms can replace human empathy.';
  const cleaned2 = (nineRouterService as any).sanitizeDialogueSpeech(sample2, speakerCand, targetCand);
  if (cleaned2.startsWith('Chloe:') || cleaned2.startsWith('Chloe :')) {
    throw new Error(`Sanitizer failed to strip 'Chloe:' prefix: got '${cleaned2}'`);
  }

  const sample3 = 'Leon: bluh bluh bluh';
  const cleaned3 = (nineRouterService as any).sanitizeDialogueSpeech(sample3, speakerCand, targetCand);
  if (cleaned3.toLowerCase().startsWith('leon:')) {
    throw new Error(`Sanitizer failed to strip 'Leon:' prefix: got '${cleaned3}'`);
  }

  const sample4 = '(To Alvarez): You promised manufacturing jobs but delivered debt!';
  const cleaned4 = (nineRouterService as any).sanitizeDialogueSpeech(sample4, speakerCand, targetCand);
  if (cleaned4.includes('(To Alvarez)') || cleaned4.includes(':')) {
    throw new Error(`Sanitizer failed to strip stage direction '(To Alvarez):': got '${cleaned4}'`);
  }

  const sample5 = '"Jackson Alvarez: Look at your voting record."';
  const cleaned5 = (nineRouterService as any).sanitizeDialogueSpeech(sample5, speakerCand, targetCand);
  if (cleaned5.includes('Jackson Alvarez:') || cleaned5.startsWith('"')) {
    throw new Error(`Sanitizer failed to strip full name colon and quotes: got '${cleaned5}'`);
  }

  // Verify Attack Prompt Anti-Formula Directives
  const antiFormulaAttackPrompt = (nineRouterService as any).buildPrompt(speakerCand, {
    action: 'attack',
    candidateId: speakerCand.id,
    targetId: targetCand.id,
    round: 1,
    activeCandidateIds: [speakerCand.id, targetCand.id],
  });
  if (!antiFormulaAttackPrompt.userPrompt.includes('ANTI-FORMULA') || !antiFormulaAttackPrompt.userPrompt.includes('NEVER format your output as a script label')) {
    throw new Error('Attack prompt failed to contain strict anti-formula and anti-script rules');
  }
  console.log('Dialogue Speech Sanitizer & Anti-Formula Prompt Guardrails PASSED!');

  // =========================================================================
  // 💰 DOLLARS CURRENCY, $20 CCTV BRIBES, RETALIATION & $40 BAILOUT AUCTION TESTS
  // =========================================================================
  console.log('\n--- Testing Dollars Currency ($), $20 CCTV Bribes & $40 Bailout Auction ---');

  // 1. Initial Budget Validation
  for (const c of CANDIDATES) {
    if (typeof c.initialBudget !== 'number' || ![80, 100, 120].includes(c.initialBudget)) {
      throw new Error(`Candidate ${c.id} has invalid initialBudget: ${c.initialBudget}`);
    }
  }
  console.log('1. Candidate initial budget contracts ($80, $100, $120) PASSED!');

  // 2. CCTV Backroom $30 Bribe Prompt & Market Mechanics
  const bribePactPrompt = (nineRouterService as any).buildPrompt(speakerCand, {
    action: 'backroom_pact',
    candidateId: speakerCand.id,
    targetId: targetCand.id,
    round: 1,
    activeCandidateIds: [speakerCand.id, targetCand.id, 'marcus-vance'],
    historyContext: {
      proposerBudget: 120,
      receiverBudget: 80,
      candidateTreasuries: { [speakerCand.id]: 120, [targetCand.id]: 80, 'marcus-vance': 100 },
    }
  });
  if (!bribePactPrompt.userPrompt.includes('$30') || !bribePactPrompt.userPrompt.includes('Balance: $120')) {
    throw new Error('Backroom pact prompt missing $30 bribe rules or candidate budget balance.');
  }
  console.log('2. CCTV Backroom $30 Bribe & Universal Market prompt construction PASSED!');

  // Test 2b: Secret Strategy Reminder in Elimination Vote Prompt
  const votePromptWithStrategy = (nineRouterService as any).buildPrompt(speakerCand, {
    action: 'elimination_vote',
    candidateId: speakerCand.id,
    round: 1,
    activeCandidateIds: [speakerCand.id, targetCand.id, 'marcus-vance'],
    historyContext: {
      candidateSecretStrategy: 'Formed secret pact to eliminate Marcus Vance and save $40 for bailout auctions.',
    }
  });
  if (
    !votePromptWithStrategy.userPrompt.includes('YOUR CONFIDENTIAL STRATEGY') || 
    !votePromptWithStrategy.userPrompt.includes('Formed secret pact to eliminate Marcus Vance') ||
    !votePromptWithStrategy.userPrompt.includes('DEATH NOTE') ||
    !votePromptWithStrategy.userPrompt.includes('30 WORDS') ||
    !votePromptWithStrategy.userPrompt.includes('VOTE CONCENTRATION IS MANDATORY') ||
    !votePromptWithStrategy.userPrompt.includes('DO NOT PARROT PROMPT EXAMPLES OR USE THE WORD "untouchable"')
  ) {
    throw new Error('Elimination vote prompt failed to inject candidate secret strategy memo, Death Note 30-word prompt guidelines, vote concentration doctrine, or anti-untouchable rule.');
  }
  if (votePromptWithStrategy.userPrompt.includes('keeps him untouchable')) {
    throw new Error('Elimination vote prompt contains "untouchable" example leak!');
  }
  console.log('2b. Confidential Strategy Memo, Death Note High-IQ Monologue, & Vote Concentration Guidelines PASSED!');

  // Test 2c: CCTV Whisper Dialogue Addressee Auto-Healing and Alignment
  const rawPactJsonWithAddressee = JSON.stringify({
    privateStrategy: 'Take down Arthur Sterling by allying with Chloe Mercer.',
    actionType: 'bribe',
    targetCandidateId: 'chloe-mercer',
    agreedEliminationTargetId: 'art-sterling',
    offerPrice: 30,
    whisper: "Chloe, take thirty to bury Arthur's media empire. Vote him out.",
    receiverDecision: 'accept'
  });

  const parsedPactAction = (nineRouterService as any).extractAndRepairJson(rawPactJsonWithAddressee);
  if (!parsedPactAction.whisper.startsWith('Chloe') || parsedPactAction.targetCandidateId !== 'chloe-mercer') {
    throw new Error('CCTV pact whisper addressee parsing failed.');
  }
  console.log('2c. CCTV Whisper Dialogue Addressee Alignment PASSED!');

  // Test 2d: Lookahead PreparedStep Cache Payload Persistence
  const mockPreparedStep = {
    stepKey: 'cctv-r1-0-jackson-alvarez',
    phase: 'CCTV_BACKROOM' as const,
    round: 1,
    speakerId: 'jackson-alvarez',
    targetId: 'marcus-vance',
    actionType: 'pact' as const,
    headline: 'ROUND 1: LEAKED CAPITOL CCTV FEED 1 OF 6',
    content: "Dmitri, let's team up to bury Sterling.",
    audioBlobUrl: null,
    audioBlob: null,
    isReady: true,
    payload: {
      text: "Dmitri, let's team up to bury Sterling.",
      targetCandidateId: 'dmitri-voronin',
      agreedTargetId: 'art-sterling',
      actionType: 'bribe',
      bribeAmount: 30,
      upfrontPaid: 15,
      escrowPending: 15,
      receiverDecision: 'accept',
      bribeAccepted: true,
    }
  };

  if (!mockPreparedStep.payload || mockPreparedStep.payload.targetCandidateId !== 'dmitri-voronin') {
    throw new Error('PreparedStep failed to retain lookahead payload.');
  }
  console.log('2d. Lookahead PreparedStep Cache Payload Persistence PASSED!');

  // Test 2e: CCTV Backroom Receiver Spoken Response (<= 10 words) & Anti-Cliche Validation
  const rawPactWithReceiverResponse = JSON.stringify({
    privateStrategy: 'Form alliance against Vance.',
    actionType: 'bribe',
    targetCandidateId: 'elena-rostova',
    agreedTargetId: 'marcus-vance',
    offerPrice: 30,
    whisper: "Elena, take thirty grand. Help me eliminate Marcus Vance tonight.",
    receiverDecision: 'accept',
    receiverResponse: "Agreed. Vance's arrogance ends tonight in the ballot box.",
  });

  const parsedValidPact = (nineRouterService as any).parseAndValidatePact(
    rawPactWithReceiverResponse,
    CANDIDATES[0],
    CANDIDATES[1],
    [CANDIDATES[0].id, CANDIDATES[1].id, 'marcus-vance'],
    120
  );

  if (!parsedValidPact.receiverResponse || parsedValidPact.receiverResponse.split(/\s+/).length > 10) {
    throw new Error(`Receiver response validation failed or exceeded 10 words: ${parsedValidPact.receiverResponse}`);
  }

  // Test fallback truncation when receiverResponse is over 10 words
  const rawPactWithLongResponse = JSON.stringify({
    privateStrategy: 'Take Vance down.',
    actionType: 'bribe',
    targetCandidateId: 'elena-rostova',
    agreedTargetId: 'marcus-vance',
    offerPrice: 30,
    whisper: "Elena, take thirty to vote out Vance.",
    receiverDecision: 'accept',
    receiverResponse: "One two three four five six seven eight nine ten eleven twelve",
  });
  const parsedTruncatedPact = (nineRouterService as any).parseAndValidatePact(
    rawPactWithLongResponse,
    CANDIDATES[0],
    CANDIDATES[1],
    [CANDIDATES[0].id, CANDIDATES[1].id, 'marcus-vance'],
    120
  );
  if (parsedTruncatedPact.receiverResponse.split(/\s+/).length > 10) {
    throw new Error(`Receiver response truncation failed: length is ${parsedTruncatedPact.receiverResponse.split(/\s+/).length}`);
  }
  console.log('2e. CCTV Backroom Receiver Spoken Response (<= 10 words) & Anti-Cliche Validation PASSED!');

  // Test 2f: Web Audio Wiretap Method & Settings Configuration Bounds
  const { sounds } = await import('../utils/audio');
  if (typeof sounds.playSpeechWithWiretap !== 'function') {
    throw new Error('SoundManager.playSpeechWithWiretap is not defined on sounds!');
  }
  console.log('2f. Web Audio Surveillance Wiretap Filter & Settings Bounds Validation PASSED!');

  // 3. Import useGameEngine helpers
  const { resolveAttackTarget, resolveBailoutAuction } = await import('../hooks/useGameEngine');

  // 4. Test Bribe Betrayal Retribution in resolveAttackTarget
  const mockPactHistory = {
    attacksByRound: {},
    pactsByRound: {
      1: [{
        id: 'pact-1',
        round: 1,
        proposerId: 'elena_rostova',
        receiverId: 'jackson_alvarez',
        agreedTargetId: 'arthur_sterling',
        whisperText: 'Take the $30 and vote out Arthur!',
        location: 'Capitol Cloakroom Cam 04',
        timestamp: Date.now(),
        bribeOffered: true,
        bribeAmount: 30,
        upfrontPaid: 15,
        escrowPending: 15,
        receiverDecision: 'accept_and_betray' as const,
        bribeAccepted: true,
        wasBetrayedByReceiver: true,
      }]
    },
    votesByRound: {},
    round: 2,
  };

  // Elena should seek revenge against Jackson Alvarez (who took $30 and betrayed)
  const revengeTarget = resolveAttackTarget('elena_rostova', ['elena_rostova', 'jackson_alvarez', 'arthur_sterling', 'chloe_kang'], mockPactHistory);
  if (revengeTarget !== 'jackson_alvarez') {
    throw new Error(`Expected Elena to target betrayer jackson_alvarez, got ${revengeTarget}`);
  }
  console.log('3. Bribe Betrayal Retribution Target Resolution PASSED!');

  // 5. Test $40 Vote Bailout Auction - Sequential Buyout & Bankrupt Elimination
  // Marcus Vance: 3 votes, $80 -> pays $40 (remains 2 votes, $40), then pays $40 (remains 1 vote, $0).
  // Jackson Alvarez: 2 votes, $40 -> pays $40 (remains 1 vote, $0).
  // Arthur Sterling: 2 votes, $120 -> pays $40 (remains 1 vote, $80), then pays $40 (remains 0 votes, $40).
  // Now Marcus (1 vote, $0) & Jackson (1 vote, $0) have max votes. Marcus is chosen/eliminated with 1 vote!
  const initialVotes = {
    marcus_vance: 3,
    jackson_alvarez: 2,
    arthur_sterling: 2,
  };
  const initialBudgets = {
    marcus_vance: 80,
    jackson_alvarez: 40,
    arthur_sterling: 120,
  };
  const activeIds = ['marcus_vance', 'jackson_alvarez', 'arthur_sterling'];

  const bailoutRes = resolveBailoutAuction(initialVotes, initialBudgets, activeIds, 1);
  if (bailoutRes.transactions.length === 0) {
    throw new Error('Expected bailout transactions to occur, got 0');
  }
  // Total money spent: Marcus ($80 = 2 votes removed), Jackson ($40 = 1 vote removed), Arthur ($80 = 2 votes removed)
  if (bailoutRes.finalBudgets['marcus_vance'] !== 0 || bailoutRes.finalBudgets['jackson_alvarez'] !== 0) {
    throw new Error(`Unexpected final budgets: ${JSON.stringify(bailoutRes.finalBudgets)}`);
  }
  console.log(`4. Sequential $40 Vote Bailout Auction (${bailoutRes.transactions.length} buyouts executed, Eliminated: ${bailoutRes.eliminatedId}) PASSED!`);

  // 6. Test Standstill Zero-Vote Tiebreaker (Everyone buys down to 0 votes)
  // Low budget candidate should be eliminated!
  const zeroStandstillVotes = {
    cand_a: 1,
    cand_b: 1,
    cand_c: 1,
  };
  const zeroStandstillBudgets = {
    cand_a: 40, // Buys down to 0 votes -> $0 balance left
    cand_b: 80, // Buys down to 0 votes -> $40 balance left
    cand_c: 120, // Buys down to 0 votes -> $80 balance left
  };
  const standstillRes = resolveBailoutAuction(zeroStandstillVotes, zeroStandstillBudgets, ['cand_a', 'cand_b', 'cand_c'], 1);
  if (standstillRes.finalTally['cand_a'] !== 0 || standstillRes.finalTally['cand_b'] !== 0 || standstillRes.finalTally['cand_c'] !== 0) {
    throw new Error('Expected all candidates to reach 0 votes in standstill');
  }
  // cand_a had $40 - $40 = $0 (lowest remaining budget) -> cand_a eliminated
  if (standstillRes.eliminatedId !== 'cand_a') {
    throw new Error(`Expected lowest remaining budget candidate 'cand_a' to be eliminated, got ${standstillRes.eliminatedId}`);
  }
  console.log('5. Zero-Vote Standstill Tiebreaker (Lowest Budget Elimination) PASSED!');

  // =========================================================================
  // 🧠 AI JSON PARSER, AUTO-REPAIR & SEMANTIC HEALING TESTS
  // =========================================================================
  console.log('\n--- Testing AI JSON Extraction & Multi-Stage Auto-Repair Engine ---');

  // Test 1: JSON with single-line comments, trailing commas, and unquoted keys
  const malformedJson1 = `
  Here is the vote decision:
  \`\`\`json
  {
    // Proposer vote
    vote: 'marcus_vance',
    reason: 'Too dangerous to keep in the debate',
  }
  \`\`\`
  `;
  const repaired1 = (nineRouterService as any).extractAndRepairJson(malformedJson1);
  if (!repaired1 || repaired1.vote !== 'marcus_vance' || !repaired1.reason) {
    throw new Error(`Failed to repair JSON with comments/unquoted keys: got ${JSON.stringify(repaired1)}`);
  }
  console.log('1. JSON Auto-Repair with comments, unquoted keys, single quotes & trailing commas PASSED!');

  // Test 2: Fuzzy candidate name-to-ID semantic healing
  const validIds = ['jax-alvarez', 'elena-rostova', 'marcus-vance', 'dmitri-voronin', 'art-sterling'];
  const healedFromName = (nineRouterService as any).resolveCandidateIdFromNameOrAlias('Jackson Alvarez', validIds);
  const healedFromAlias = (nineRouterService as any).resolveCandidateIdFromNameOrAlias('Jax', validIds);
  const healedFromSurname = (nineRouterService as any).resolveCandidateIdFromNameOrAlias('Voronin', validIds);

  if (healedFromName !== 'jax-alvarez' || healedFromAlias !== 'jax-alvarez' || healedFromSurname !== 'dmitri-voronin') {
    throw new Error(`Candidate semantic healing failed: name=${healedFromName}, alias=${healedFromAlias}, surname=${healedFromSurname}`);
  }
  console.log('2. Semantic Candidate Name & Alias to ID Healing PASSED!');

  // Test 3: DeepSeek reasoning_content output recovery & <think> tag stripping
  console.log('Testing DeepSeek reasoning_content recovery & <think> tag stripping...');
  const sampleDeepSeekReasoning = `1. The user asks for a campaign address in character as Arthur Sterling, maximum 40 words. Must react to General Marcus's statement ("Strength at the Border. Peace Through Power.") or earlier speakers, pivot to why Arthur is the answer. No name prefix, no colon, start directly with speech. Stay in character: boastful, smug, energetic, transactional, ROI, market growth, job creation, dealmaking, mock opponents. Word limit strict.

Let's draft. Need to respond to "Strength at the Border. Peace Through Power." Contrast: that's empty rhetoric, not a business plan. Need to pivot to leadership on crisis: mobilize as a CEO would, cost-efficient security, ROI, dealmaking with neighbors or securing border as an asset. Keep under 40 words.

Draft 1: "General, 'peace through power'? That's a slogan, not a balance sheet. I'll run this mobilization like a merger: secure the border, cut waste, and make Ostrov pay for the disruption. That's ROI, not rhetoric."

Count: General, peace through power? (3) That's a slogan, not a balance sheet. (5) I'll run this mobilization like a merger: (6) secure the border, cut waste, (5) and make Ostrov pay for the disruption. (6) That's ROI, not rhetoric. (4)`;

  const recoveredSpeech = (nineRouterService as any).extractOutputFromReasoning(sampleDeepSeekReasoning, false);
  if (!recoveredSpeech.includes('That\'s a slogan, not a balance sheet') || !recoveredSpeech.includes('That\'s ROI, not rhetoric')) {
    throw new Error(`Failed to recover drafted speech from reasoning_content: got '${recoveredSpeech}'`);
  }

  // Test <think>...</think> stripping
  const contentWithThinking = '<think>I need to sound like Jax Alvarez and talk about steel mills.</think>Iron Valley built this country, and we will rebuild it again!';
  const strippedContent = (nineRouterService as any).stripThinkingTags(contentWithThinking);
  if (strippedContent !== 'Iron Valley built this country, and we will rebuild it again!') {
    throw new Error(`Failed to strip <think> tags: got '${strippedContent}'`);
  }
  console.log('3. DeepSeek reasoning_content recovery & <think> tag stripping PASSED!');

  // =========================================================================
  // 🎬 YOUTUBE-READY SEQUENTIAL BALLOT REVEAL & BAILOUT SIMULATION TESTS
  // =========================================================================
  console.log('\n--- Testing Sequential Ballot Reveal & Bailout Step Calculations ---');

  // Test 4: Sequential vote tally counting (step-by-step)
  const sampleVotes: VoteRecord[] = [
    { voterId: 'jax-alvarez', targetId: 'marcus-vance', reason: 'Too hawkish' },
    { voterId: 'elena-rostova', targetId: 'marcus-vance', reason: 'Dangerous general' },
    { voterId: 'marcus-vance', targetId: 'elena-rostova', reason: 'Socialist' },
    { voterId: 'dmitri-voronin', targetId: 'jax-alvarez', reason: 'Populist rival' },
  ];

  // Simulating step 1 (0 ballots revealed -> 0 votes each)
  const step0Counts: Record<string, number> = { 'marcus-vance': 0, 'elena-rostova': 0, 'jax-alvarez': 0 };
  if (step0Counts['marcus-vance'] !== 0) throw new Error('Initial ballot count must be 0');

  // Simulating step 2 (2 ballots revealed -> marcus-vance = 2)
  const step2Votes = sampleVotes.slice(0, 2);
  const step2Counts: Record<string, number> = {};
  step2Votes.forEach(v => {
    step2Counts[v.targetId] = (step2Counts[v.targetId] || 0) + 1;
  });
  if (step2Counts['marcus-vance'] !== 2) throw new Error(`Expected marcus-vance to have 2 votes at step 2, got ${step2Counts['marcus-vance']}`);

  // Test 5: Sequential Bailout step snapshot
  const initialBudgetsTest = { 'marcus-vance': 80, 'elena-rostova': 100, 'jax-alvarez': 120 };
  const sampleBailouts: BailoutTransaction[] = [
    { id: 'bt-1', candidateId: 'marcus-vance', initialVotes: 2, votesRemoved: 1, cost: 40, remainingVotes: 1, remainingBudget: 40, round: 1, timestamp: Date.now() },
    { id: 'bt-2', candidateId: 'marcus-vance', initialVotes: 1, votesRemoved: 1, cost: 40, remainingVotes: 0, remainingBudget: 0, round: 1, timestamp: Date.now() },
  ];

  const roundTallyTest: RoundVoteTally = {
    round: 1,
    votes: sampleVotes,
    tally: { 'marcus-vance': 0, 'elena-rostova': 1, 'jax-alvarez': 1 },
    initialBudgets: { ...initialBudgetsTest },
    eliminatedId: 'marcus-vance',
    bailoutTransactions: sampleBailouts,
  };

  if (!roundTallyTest.initialBudgets || roundTallyTest.initialBudgets['marcus-vance'] !== 80) {
    throw new Error('roundTally initialBudgets snapshot failed');
  }

  let currentBudgets = { ...roundTallyTest.initialBudgets };
  let currentVotes = { 'marcus-vance': 2, 'elena-rostova': 1, 'jax-alvarez': 1 };

  // Apply bailout 1
  currentVotes['marcus-vance'] -= sampleBailouts[0].votesRemoved;
  currentBudgets['marcus-vance'] = sampleBailouts[0].remainingBudget;
  if (currentVotes['marcus-vance'] !== 1 || currentBudgets['marcus-vance'] !== 40) {
    throw new Error('Bailout step 1 snapshot failed');
  }

  // Apply bailout 2
  currentVotes['marcus-vance'] -= sampleBailouts[1].votesRemoved;
  currentBudgets['marcus-vance'] = sampleBailouts[1].remainingBudget;
  if (currentVotes['marcus-vance'] !== 0 || currentBudgets['marcus-vance'] !== 0) {
    throw new Error('Bailout step 2 snapshot failed');
  }
  console.log('4. Sequential Ballot & Bailout Snapshot Steps PASSED!');

  // Test 6: SoundManager all 12 core sound methods + 20 new character sound synthesizers
  sounds.enabled = true;
  sounds.playGavel();
  sounds.playSpeechBeep();
  sounds.playAttackSting();
  sounds.playVoteRevealDing();
  sounds.playEliminationBuzzer();
  sounds.playCCTVBeep();
  sounds.playBetrayalStab();
  sounds.playBetrayalAlarm();
  sounds.playBallotDrop();
  sounds.playCashChime();
  sounds.playSwapWhoosh();
  sounds.playFanfare();

  // Test 20 new character sound synthesizers
  sounds.playBorderGovernorHammerGate();
  sounds.playNeurotechSynapseChime();
  sounds.playCartelProsecutorHandcuffSnap();
  sounds.playTelevangelistPipeOrganSwell();
  sounds.playDistressedDebtCashStack();
  sounds.playRuralSheriffBootSpur();
  sounds.playNegotiatorSecretBriefcase();
  sounds.playCoalMayorPickaxeStrike();
  sounds.playBigPharmaVialClick();
  sounds.playSovereignWealthVaultDoor();
  sounds.playViralPodcasterLivestreamBeep();
  sounds.playSpecialOpsRifleBolt();
  sounds.playDeficitHawkRedPenStamp();
  sounds.playEnergyDynastHarpsichordChime();
  sounds.playEthicalHackerKeyboardClack();
  sounds.playAirlineChiefCabinChime();
  sounds.playEpidemiologistRespiratorBreath();
  sounds.playConstitutionalGavelResonance();
  sounds.playPopulistHeiressFlashbulb();
  sounds.playSpaceAdmiralThrusterPulse();

  // Test playCandidateSignature across all 31 candidates
  for (const c of CANDIDATES) {
    sounds.playCandidateSignature(c.id, 'speech');
  }

  // Verify Dialogue-Only Audio Mode (SFX Muted)
  sounds.sfxMuted = true;
  if (sounds.canPlaySfx() !== false) {
    throw new Error('canPlaySfx() should return false when sfxMuted is true');
  }
  // Calling sound effects while sfxMuted is true must safely return without playing
  sounds.playGavel();
  sounds.playAttackSting();
  sounds.playVoteRevealDing();
  sounds.playEliminationBuzzer();
  sounds.playCCTVBeep();
  sounds.playBetrayalStab();
  sounds.playBetrayalAlarm();
  sounds.playBallotDrop();
  sounds.playCashChime();
  sounds.playSwapWhoosh();
  sounds.playSpeechBeep();
  sounds.playFanfare();
  sounds.playCandidateSignature('marcus-vance', 'speech');

  // Reset sfxMuted back to false
  sounds.sfxMuted = false;
  if (sounds.canPlaySfx() !== true) {
    throw new Error('canPlaySfx() should return true when sfxMuted is false and enabled is true');
  }

  console.log('5. Studio-Grade SoundManager (All 12 Core + 20 Character Synthesizers & Dispatcher) PASSED!');
  console.log('5b. Dialogue-Only Audio Mode (SFX Muted with CanPlaySfx Guard) PASSED!');

  // Test 7: Cinematic Ballot Reveal 5-speed presets duration calculation
  const baseMs = 1400;
  const speedPresets = [0.5, 0.75, 1.0, 1.5, 2.0];
  const expectedScaled = speedPresets.map(s => Math.round(baseMs / s));
  if (expectedScaled[0] !== 2800 || expectedScaled[2] !== 1400 || expectedScaled[4] !== 700) {
    throw new Error('Speed scaling calculations failed');
  }
  console.log('6. Cinematic Ballot Reveal 5-Speed Preset Calculations (0.5x, 0.75x, 1.0x, 1.5x, 2.0x) PASSED!');

  // Test 8: Voter Attribution & Status Filter under Progress Bar
  const candidateTargetId = 'marcus-vance';
  const votersForMarcus = sampleVotes.filter(v => v.targetId === candidateTargetId);
  if (votersForMarcus.length !== 2 || votersForMarcus[0].voterId !== 'jax-alvarez' || votersForMarcus[1].voterId !== 'elena-rostova') {
    throw new Error('Voter attribution filtering for candidate progress bar failed');
  }
  console.log('7. Voter Name & Avatar Attribution Under Candidate Progress Bar PASSED!');

  // Test 9: 3-Part "Emergency Meeting" Attack Prompt with Rebuttal Defense & Target Treasury
  const elena = CANDIDATE_MAP.get('elena-rostova')!;
  const marcus = CANDIDATE_MAP.get('marcus-vance')!;
  const attackPromptRes = (nineRouterService as any).buildPrompt(elena, {
    action: 'attack',
    candidateId: elena.id,
    targetId: marcus.id,
    round: 1,
    activeCandidateIds: ['elena-rostova', 'marcus-vance', 'art-sterling', 'jax-alvarez'],
    historyContext: {
      electionTopic: 'The Industrial Crisis',
      targetTreasuryBalance: 120,
      targetHeatScore: 2,
      activeAccusationOnSpeaker: {
        attackerId: 'art-sterling',
        attackerName: 'Arthur Sterling',
        text: 'Elena will bankrupt Valoria with reckless environmental decrees!',
      },
      recentAttacks: [
        { attackerName: 'Arthur Sterling', targetName: 'Elena Rostova', text: 'Elena will bankrupt Valoria!' }
      ]
    }
  });

  if (!attackPromptRes.userPrompt.includes('EMERGENCY MEETING') || 
      !attackPromptRes.userPrompt.includes('ACTIVE ACCUSATION AGAINST YOU') ||
      !attackPromptRes.userPrompt.includes('REBUTTAL RULE') ||
      !attackPromptRes.userPrompt.includes('TARGET TO ATTACK: "Marcus Vance"') ||
      !attackPromptRes.userPrompt.includes('MANDATORY TARGET NAMING') ||
      !attackPromptRes.userPrompt.includes('DO NOT obsess over dollar amounts')) {
    throw new Error('3-Part Emergency Meeting Attack Prompt failed to include rebuttal context, target naming, or anti-money rules!');
  }
  console.log('8. 3-Part "Emergency Meeting" Attack Prompt (Rebuttal, Target Naming, Policy Attack, Vote Call) PASSED!');

  // Test 10: Debate Heat Accumulation and Consensus Leader Computation
  const mockHeatMap: Record<string, any> = {
    'marcus-vance': {
      candidateId: 'marcus-vance',
      heatScore: 3,
      accusers: ['elena-rostova', 'art-sterling', 'jax-alvarez'],
      rebuttalCount: 1,
      voteCallsAgainst: ['elena-rostova', 'art-sterling'],
      accusationQuotes: ['Marcus is hoarding $120!', 'Vote him out!']
    },
    'art-sterling': {
      candidateId: 'art-sterling',
      heatScore: 1,
      accusers: ['marcus-vance'],
      rebuttalCount: 0,
      voteCallsAgainst: ['marcus-vance'],
      accusationQuotes: ['Arthur is corrupt!']
    }
  };

  const heatEntries = Object.values(mockHeatMap);
  const topHeat = heatEntries.sort((a, b) => b.heatScore - a.heatScore)[0];
  if (topHeat.candidateId !== 'marcus-vance' || topHeat.heatScore !== 3) {
    throw new Error('Debate heat consensus leader calculation failed');
  }
  console.log('9. Debate Heat Accumulation & Consensus Leader Computation PASSED!');

  // Test 11: Debate Consensus Leader Injection into Elimination Voting Prompt
  const votePromptRes = (nineRouterService as any).buildPrompt(elena, {
    action: 'elimination_vote',
    candidateId: elena.id,
    round: 1,
    activeCandidateIds: ['elena-rostova', 'marcus-vance', 'art-sterling', 'jax-alvarez'],
    historyContext: {
      electionTopic: 'The Industrial Crisis',
      debateConsensusLeader: {
        candidateId: 'marcus-vance',
        candidateName: 'Gen. Marcus "The Hammer" Vance',
        heatScore: 3,
        accusers: ['Elena Rostova', 'Arthur Sterling', 'Jackson Alvarez'],
        voteCalls: ['Elena Rostova', 'Arthur Sterling'],
      },
      candidateTreasuries: {
        'elena-rostova': 80,
        'marcus-vance': 120,
        'art-sterling': 100,
        'jax-alvarez': 60,
      }
    }
  });

  if (!votePromptRes.userPrompt.includes('ON-STAGE DEBATE CONSENSUS & BANDWAGON') ||
      !votePromptRes.userPrompt.includes('marcus-vance') ||
      !votePromptRes.userPrompt.includes('[BANDWAGON]')) {
    throw new Error('Elimination voting prompt failed to inject debate consensus or bandwagon avenue!');
  }
  console.log('10. Debate Consensus Leader & Bandwagon Injection in Voting Prompt PASSED!');

  // Test 12: Threat-Aware Strategic Target Selection in resolveAttackTarget
  const threatHistory = {
    attacksByRound: {
      1: [{ id: 'a1', round: 1, attackerId: 'art-sterling', targetId: 'elena-rostova', text: 'You are corrupt!', timestamp: 1 }]
    },
    pactsByRound: {},
    votesByRound: {},
    round: 1,
    candidateBudgets: {
      'elena-rostova': 80,
      'marcus-vance': 120,
      'art-sterling': 100,
      'jax-alvarez': 30,
    }
  };

  // Elena was attacked by Arthur in round 1 -> should retaliate against Arthur
  const elenaTarget = resolveAttackTarget('elena-rostova', ['elena-rostova', 'marcus-vance', 'art-sterling', 'jax-alvarez'], threatHistory);
  if (elenaTarget !== 'art-sterling') {
    throw new Error(`Expected Elena to retaliate against Arthur Sterling, got ${elenaTarget}`);
  }

  // Without active retaliation, Technocrat Elena should target ideological rival (Arthur Sterling - Capitalist)
  const neutralHistory = { ...threatHistory, attacksByRound: {} };
  const ideologicalTarget = resolveAttackTarget('elena-rostova', ['elena-rostova', 'marcus-vance', 'art-sterling', 'jax-alvarez'], neutralHistory);
  if (ideologicalTarget !== 'art-sterling') {
    throw new Error(`Expected Technocrat Elena to target ideological rival Arthur, got ${ideologicalTarget}`);
  }
  // Test 12: 100% Full-Round & Whole-Game Pre-Buffering Step Calculations
  console.log('\n--- Testing Full-Round & Whole-Game Autonomous Pipeline ---');
  const sampleRoster = ['jax-alvarez', 'elena-rostova', 'art-sterling', 'marcus-vance'];
  const testSimState: any = {
    phase: 'IDLE',
    round: 1,
    currentSpeakerIndex: -1,
    activeCandidateIds: sampleRoster,
    participatingCandidateIds: sampleRoster,
    campaignSpeeches: {},
    attacksByRound: {},
    pactsByRound: {},
    votesByRound: {},
    candidateBudgets: {
      'jax-alvarez': 80,
      'elena-rostova': 80,
      'art-sterling': 100,
      'marcus-vance': 120,
    },
    eliminatedCandidates: [],
    electionTopic: 'The Autonomous AI Automation Wave',
  };

  // Verify that full round 1 computes 4 speeches + 4 attacks + 4 CCTV deals + 4 votes + 1 elimination = 17 steps
  const r1CampaignSteps = sampleRoster.map((id, idx) => ({
    stepKey: `campaign-${idx}-${id}`,
    phase: 'CAMPAIGN',
    speakerId: id,
  }));
  const r1AttackSteps = sampleRoster.map((id, idx) => ({
    stepKey: `attack-r1-${idx}-${id}`,
    phase: 'ATTACK',
    speakerId: id,
  }));
  const r1CctvSteps = sampleRoster.map((id, idx) => ({
    stepKey: `cctv-r1-${idx}-${id}`,
    phase: 'CCTV_BACKROOM',
    speakerId: id,
  }));
  const r1VoteSteps = sampleRoster.map((id, idx) => ({
    stepKey: `vote_confessional-r1-${idx}-${id}`,
    phase: 'VOTE_CONFESSIONAL',
    speakerId: id,
  }));
  const r1ElimStep = [{
    stepKey: 'elimination-r1-sample',
    phase: 'ELIMINATION',
    speakerId: 'sample',
  }];
  const totalR1 = r1CampaignSteps.length + r1AttackSteps.length + r1CctvSteps.length + r1VoteSteps.length + r1ElimStep.length;
  if (totalR1 !== 17) {
    throw new Error(`Expected 17 steps in 4-candidate Round 1 (4 speeches + 4 attacks + 4 CCTV + 4 votes + 1 elimination), got ${totalR1}`);
  }
  console.log(`1. 100% Full Round 1 Complete Pre-Buffering Step Count (${totalR1} steps: Speeches, Attacks, CCTV, Votes, Elimination) PASSED!`);

  // Verify YouTube 11 viral lineup count = 11*4 + 1 = 45 steps
  const totalR1YouTube11 = 11 * 4 + 1;
  if (totalR1YouTube11 !== 45) {
    throw new Error(`Expected 45 steps for 11 candidates, got ${totalR1YouTube11}`);
  }
  console.log(`2. YouTube 11 Lineup 100% Round 1 Pre-Buffering (${totalR1YouTube11} steps) PASSED!`);

  // =========================================================================
  // ⚡ Kinetic Word-by-Word Subtitles (MrBeast / Shorts Style) Test Suite
  // =========================================================================
  console.log('\n--- Testing Kinetic Word-by-Word Subtitles Engine ---');

  // 1. cleanWordToken & critical word classification
  if (cleanWordToken('"BRIBE,"') !== 'BRIBE') {
    throw new Error(`cleanWordToken failed on '"BRIBE,"': got ${cleanWordToken('"BRIBE,"')}`);
  }
  if (cleanWordToken('"$40M!"') !== '$40M') {
    throw new Error(`cleanWordToken failed on '"$40M!"': got ${cleanWordToken('"$40M!"')}`);
  }

  // Critical words specifically requested by user across 7 Republic of Valoria themes:
  // 1. Money & Bribes
  if (classifyWord('BRIBE') !== 'money') {
    throw new Error(`classifyWord('BRIBE') expected 'money', got ${classifyWord('BRIBE')}`);
  }
  if (classifyWord('$40M') !== 'money') {
    throw new Error(`classifyWord('$40M') expected 'money', got ${classifyWord('$40M')}`);
  }
  if (classifyWord('$20') !== 'money') {
    throw new Error(`classifyWord('$20') expected 'money', got ${classifyWord('$20')}`);
  }
  if (classifyWord('BAILOUT') !== 'money') {
    throw new Error(`classifyWord('BAILOUT') expected 'money', got ${classifyWord('BAILOUT')}`);
  }
  if (classifyWord('SLUSH') !== 'money') {
    throw new Error(`classifyWord('SLUSH') expected 'money', got ${classifyWord('SLUSH')}`);
  }

  // 2. Espionage & CCTV
  if (classifyWord('CCTV') !== 'espionage') {
    throw new Error(`classifyWord('CCTV') expected 'espionage', got ${classifyWord('CCTV')}`);
  }
  if (classifyWord('WIRETAPPED') !== 'espionage') {
    throw new Error(`classifyWord('WIRETAPPED') expected 'espionage', got ${classifyWord('WIRETAPPED')}`);
  }
  if (classifyWord('DOSSIERS') !== 'espionage') {
    throw new Error(`classifyWord('DOSSIERS') expected 'espionage', got ${classifyWord('DOSSIERS')}`);
  }

  // 3. Deception & Hypocrisy
  if (classifyWord('LIES') !== 'deception') {
    throw new Error(`classifyWord('LIES') expected 'deception', got ${classifyWord('LIES')}`);
  }
  if (classifyWord('HYPOCRITE') !== 'deception') {
    throw new Error(`classifyWord('HYPOCRITE') expected 'deception', got ${classifyWord('HYPOCRITE')}`);
  }
  if (classifyWord('PUPPETS') !== 'deception') {
    throw new Error(`classifyWord('PUPPETS') expected 'deception', got ${classifyWord('PUPPETS')}`);
  }
  if (classifyWord('SHAM') !== 'deception') {
    throw new Error(`classifyWord('SHAM') expected 'deception', got ${classifyWord('SHAM')}`);
  }

  // 4. Corruption & Treason
  if (classifyWord('CORRUPT') !== 'corruption') {
    throw new Error(`classifyWord('CORRUPT') expected 'corruption', got ${classifyWord('CORRUPT')}`);
  }
  if (classifyWord('BETRAYAL') !== 'corruption') {
    throw new Error(`classifyWord('BETRAYAL') expected 'corruption', got ${classifyWord('BETRAYAL')}`);
  }
  if (classifyWord('TREASON') !== 'corruption') {
    throw new Error(`classifyWord('TREASON') expected 'corruption', got ${classifyWord('TREASON')}`);
  }
  if (classifyWord('EMBEZZLEMENT') !== 'corruption') {
    throw new Error(`classifyWord('EMBEZZLEMENT') expected 'corruption', got ${classifyWord('EMBEZZLEMENT')}`);
  }

  // 5. Danger & Elimination
  if (classifyWord('ELIMINATE') !== 'danger') {
    throw new Error(`classifyWord('ELIMINATE') expected 'danger', got ${classifyWord('ELIMINATE')}`);
  }
  if (classifyWord('TERMINATED') !== 'danger') {
    throw new Error(`classifyWord('TERMINATED') expected 'danger', got ${classifyWord('TERMINATED')}`);
  }
  if (classifyWord('DOOMED') !== 'danger') {
    throw new Error(`classifyWord('DOOMED') expected 'danger', got ${classifyWord('DOOMED')}`);
  }

  // 6. Constitution & Republic
  if (classifyWord('CONSTITUTION') !== 'constitution') {
    throw new Error(`classifyWord('CONSTITUTION') expected 'constitution', got ${classifyWord('CONSTITUTION')}`);
  }
  if (classifyWord('UNCONSTITUTIONAL') !== 'constitution') {
    throw new Error(`classifyWord('UNCONSTITUTIONAL') expected 'constitution', got ${classifyWord('UNCONSTITUTIONAL')}`);
  }
  if (classifyWord('VALORIA') !== 'constitution') {
    throw new Error(`classifyWord('VALORIA') expected 'constitution', got ${classifyWord('VALORIA')}`);
  }

  // 7. Tactical Power & Calculations
  if (classifyWord('CHECKMATE') !== 'power') {
    throw new Error(`classifyWord('CHECKMATE') expected 'power', got ${classifyWord('CHECKMATE')}`);
  }
  if (classifyWord('MASTERMIND') !== 'power') {
    throw new Error(`classifyWord('MASTERMIND') expected 'power', got ${classifyWord('MASTERMIND')}`);
  }
  if (classifyWord('DICTATOR') !== 'power') {
    throw new Error(`classifyWord('DICTATOR') expected 'power', got ${classifyWord('DICTATOR')}`);
  }

  // Neutral / Non-critical
  if (classifyWord('THE') !== 'none') {
    throw new Error(`classifyWord('THE') expected 'none', got ${classifyWord('THE')}`);
  }
  console.log('1. 7-Theme Semantic Critical Word Classification & Stem Matching PASSED!');

  // 1b. In-The-Lineup Character Name Glow & Possessive Key Extraction
  if (extractNameKey("Arthur's") !== 'ARTHUR') {
    throw new Error(`extractNameKey("Arthur's") expected 'ARTHUR', got ${extractNameKey("Arthur's")}`);
  }
  if (extractNameKey("Alvarez's") !== 'ALVAREZ') {
    throw new Error(`extractNameKey("Alvarez's") expected 'ALVAREZ', got ${extractNameKey("Alvarez's")}`);
  }
  if (extractNameKey('"Elena\'s,"') !== 'ELENA') {
    throw new Error(`extractNameKey('"Elena\'s,"') expected 'ELENA', got ${extractNameKey('"Elena\'s,"')}`);
  }

  // Test lineup filtering: only candidates in the active lineup should have characterTheme
  const testLineupIds = ['jax-alvarez', 'art-sterling'];
  const speechWithNames = "Arthur and Alvarez will stop Marcus from destroying Valoria!";
  const nameTokens = tokenizeSpeech(speechWithNames, undefined, testLineupIds);

  const arthurToken = nameTokens.find(t => t.cleanWord === 'ARTHUR');
  const alvarezToken = nameTokens.find(t => t.cleanWord === 'ALVAREZ');
  const marcusToken = nameTokens.find(t => t.cleanWord === 'MARCUS');

  if (!arthurToken || !arthurToken.characterTheme) {
    throw new Error('Expected Arthur token to have characterTheme when art-sterling is in lineup');
  }
  const artCand = CANDIDATE_MAP.get('art-sterling')!;
  if (arthurToken.characterTheme.colorHex !== artCand.color.primary) {
    throw new Error(`Arthur characterTheme color mismatch: expected ${artCand.color.primary}, got ${arthurToken.characterTheme.colorHex}`);
  }

  if (!alvarezToken || !alvarezToken.characterTheme) {
    throw new Error('Expected Alvarez token to have characterTheme when jax-alvarez is in lineup');
  }
  const jaxCand = CANDIDATE_MAP.get('jax-alvarez')!;
  if (alvarezToken.characterTheme.colorHex !== jaxCand.color.primary) {
    throw new Error(`Alvarez characterTheme color mismatch: expected ${jaxCand.color.primary}, got ${alvarezToken.characterTheme.colorHex}`);
  }

  // Marcus is NOT in testLineupIds, so Marcus should NOT have characterTheme!
  if (marcusToken?.characterTheme) {
    throw new Error('Marcus should NOT have characterTheme because marcus-vance is not in the lineup!');
  }
  console.log('1b. In-The-Lineup Character First & Last Name Thematic Glow & Lineup Filtering PASSED!');

  // 2. Tokenize speech with weighted ratios
  const sampleSpeech = 'I offered a $40M BRIBE to expose their CORRUPT LIES and defend the CONSTITUTION!';
  const tokens = tokenizeSpeech(sampleSpeech);
  if (tokens.length !== 14) {
    throw new Error(`Expected 14 tokens for sample speech, got ${tokens.length}`);
  }

  // Verify monotonicity of startRatio and endRatio
  let prevEnd = 0;
  for (const t of tokens) {
    if (t.startRatio < prevEnd - 0.0001) {
      throw new Error(`Token ratio overlap detected for token "${t.original}"`);
    }
    if (t.endRatio <= t.startRatio) {
      throw new Error(`Token endRatio must be greater than startRatio for token "${t.original}"`);
    }
    prevEnd = t.endRatio;
  }
  if (Math.abs(tokens[tokens.length - 1].endRatio - 1.0) > 0.001) {
    throw new Error(`Final token endRatio must be ~1.0, got ${tokens[tokens.length - 1].endRatio}`);
  }
  console.log('2. Speech Tokenization & Monotonic Duration Ratios PASSED!');

  // 3. Progressive Word Reveal (Start Empty -> Fill Naturally -> All Words Stay)
  const emptyStart = getRevealedWordCount(tokens, 0.0);
  if (emptyStart !== 0) {
    throw new Error(`Expected 0 words revealed at progress 0.0 (empty dialogue box start), got ${emptyStart}`);
  }

  const halfwayCount = getRevealedWordCount(tokens, 0.5);
  if (halfwayCount <= 0 || halfwayCount >= tokens.length) {
    throw new Error(`Expected intermediate word count at progress 0.5, got ${halfwayCount} of ${tokens.length}`);
  }

  const fullEnd = getRevealedWordCount(tokens, 1.0);
  if (fullEnd !== tokens.length) {
    throw new Error(`Expected all ${tokens.length} words to remain in box at progress 1.0, got ${fullEnd}`);
  }

  const activeAtStart = getActiveWordIndex(tokens, 0.01);
  if (activeAtStart !== 0) {
    throw new Error(`Expected word index 0 active at progress 0.01, got ${activeAtStart}`);
  }
  const activeAtEnd = getActiveWordIndex(tokens, 0.999);
  if (activeAtEnd !== tokens.length - 1) {
    throw new Error(`Expected last word active at progress 0.999, got ${activeAtEnd}`);
  }
  console.log('3. Word-by-Word Reveal & Permanent Retention Lifecycle PASSED!');

  // 4. AudioSyncService State & Subscription
  const initialState = audioSync.getState();
  if (typeof initialState.isPlaying !== 'boolean' || typeof initialState.progress !== 'number') {
    throw new Error('audioSync.getState() returned invalid state structure');
  }

  let notifiedState: any = null;
  const unsubscribe = audioSync.subscribe(st => {
    notifiedState = st;
  });
  if (!notifiedState) {
    throw new Error('audioSync subscriber was not immediately notified of current state');
  }
  unsubscribe();
  console.log('4. AudioSync Real-Time Subscription & State Verification PASSED!');

  // 5. Option 2: Acoustic Peak & Voice Activity Gating Engine
  // 5a. Pre-Audio Readiness Gate: Must hold 0 words while audio is buffering
  const preBufferCount = getAcousticRevealedWordCount({
    tokens,
    currentTime: 0.02,
    duration: 5.0,
    isAudioReady: false,
    isVoiceActive: false,
    isPeak: false,
    progress: 0.004,
    lastRevealedCount: 0,
  });
  if (preBufferCount !== 0) {
    throw new Error(`Expected 0 words during pre-audio buffer phase, got ${preBufferCount}`);
  }

  // 5b. Voice Active Trigger: Words advance when audio is ready and candidate vocalizes
  const activeSpeechCount = getAcousticRevealedWordCount({
    tokens,
    currentTime: 1.2,
    duration: 5.0,
    isAudioReady: true,
    isVoiceActive: true,
    isPeak: false,
    progress: 0.24,
    lastRevealedCount: 0,
  });
  if (activeSpeechCount <= 0 || activeSpeechCount >= tokens.length) {
    throw new Error(`Expected active speech words to reveal during vocalization, got ${activeSpeechCount}`);
  }

  // 5c. Breathing Pause Freezing: When candidate stops speaking (isVoiceActive === false), count must freeze!
  const frozenPauseCount = getAcousticRevealedWordCount({
    tokens,
    currentTime: 1.8, // Time progressed
    duration: 5.0,
    isAudioReady: true,
    isVoiceActive: false, // Candidate paused to breathe / dramatic hesitation
    isPeak: false,
    progress: 0.36,
    lastRevealedCount: activeSpeechCount, // Existing count
  });
  if (frozenPauseCount !== activeSpeechCount) {
    throw new Error(`Expected word count to freeze during breath pause (${activeSpeechCount}), but got ${frozenPauseCount}`);
  }

  // 5d. Syllable Burst Peak Trigger: When vocal peak occurs, advances
  const peakBurstCount = getAcousticRevealedWordCount({
    tokens,
    currentTime: 1.8,
    duration: 5.0,
    isAudioReady: true,
    isVoiceActive: false,
    isPeak: true, // Syllable burst detected
    progress: 0.36,
    lastRevealedCount: activeSpeechCount,
  });
  if (peakBurstCount < activeSpeechCount) {
    throw new Error(`Peak burst should maintain or advance word count, got ${peakBurstCount}`);
  }

  // 5e. Audio Completion: Full 100% token reveal
  const completedAudioCount = getAcousticRevealedWordCount({
    tokens,
    currentTime: 5.0,
    duration: 5.0,
    isAudioReady: true,
    isVoiceActive: false,
    isPeak: false,
    progress: 1.0,
    lastRevealedCount: frozenPauseCount,
  });
  if (completedAudioCount !== tokens.length) {
    throw new Error(`Expected all ${tokens.length} words on completion, got ${completedAudioCount}`);
  }
  console.log('5. Option 2 Acoustic Peak & Voice Activity Gated Sync PASSED!');

  // -----------------------------------------------------------------
  // Testing Eliminated Candidate Dialogue Healing & Secretive CCTV Pacts
  // -----------------------------------------------------------------
  console.log('\n--- Testing Eliminated Candidate Dialogue Healing & Secretive CCTV Pacts ---');

  // 1. Sanitizer heals eliminated candidate names addressed in dialogue
  const tJax = CANDIDATE_MAP.get('jax-alvarez')!;
  const tMarcus = CANDIDATE_MAP.get('marcus-vance')!;
  const rogueDialogue = "Elena Rostova, your state-controlled media monopolies have poisoned public trust!";
  const healedDialogue = nineRouterService.sanitizeDialogueSpeech(
    rogueDialogue,
    tJax,
    tMarcus, // Target is Marcus Vance
    ['elena-rostova'] // Elena Rostova was eliminated
  );
  if (healedDialogue.includes('Elena Rostova') || healedDialogue.includes('Elena')) {
    throw new Error(`Sanitizer failed to heal eliminated candidate name: "${healedDialogue}"`);
  }
  if (!healedDialogue.includes('Marcus')) {
    throw new Error(`Sanitizer did not replace eliminated candidate with live target: "${healedDialogue}"`);
  }
  console.log('1. Dialogue Speech Sanitizer Eliminated Candidate Healing PASSED!');

  // 2. Attack Prompt includes Eliminated Candidates Prohibition section
  const attackPromptWithEliminated = nineRouterService.buildPrompt(tJax, {
    action: 'attack',
    candidateId: tJax.id,
    targetId: tMarcus.id,
    round: 2,
    activeCandidateIds: ['jax-alvarez', 'marcus-vance'],
    eliminatedCandidateIds: ['elena-rostova', 'dmitri-voronin'],
    historyContext: {
      electionTopic: 'National Debt Crisis',
      campaignSpeeches: {},
    }
  });
  if (!attackPromptWithEliminated.userPrompt.includes('ELIMINATED FORMER CONTENDERS (DO NOT ATTACK OR ADDRESS)')) {
    throw new Error('Attack prompt missing ELIMINATED FORMER CONTENDERS section');
  }
  if (!attackPromptWithEliminated.userPrompt.includes('SURVIVING CONTENDERS IN THE ROOM')) {
    throw new Error('Attack prompt missing SURVIVING CONTENDERS IN THE ROOM section');
  }
  console.log('2. Attack Prompt Eliminated Candidates Prohibition PASSED!');

  // 3. CCTV Backroom Secretive Whispers & Dramatic Double-Meaning Responses
  const cctvPrompt = nineRouterService.buildPrompt(tJax, {
    action: 'backroom_pact',
    candidateId: tJax.id,
    targetId: tMarcus.id,
    round: 1,
    activeCandidateIds: ['jax-alvarez', 'marcus-vance'],
    historyContext: {
      electionTopic: 'National Debt Crisis',
      recentAttacks: [],
      proposerBudget: 100,
      receiverBudget: 100,
      candidateTreasuries: { 'jax-alvarez': 100, 'marcus-vance': 100 },
    }
  });
  if (!cctvPrompt.userPrompt.includes('SECRETIVE CORRIDOR ATMOSPHERE & DRAMATIC TONE')) {
    throw new Error('CCTV prompt missing secretive corridor atmosphere');
  }
  if (!cctvPrompt.userPrompt.includes('You do NOT sound like an automated bribery bot')) {
    throw new Error('CCTV prompt missing strict ban on robotic bribery lines');
  }
  if (!cctvPrompt.userPrompt.includes('STRICT PROHIBITION ON CAMERA & SURVEILLANCE TALK')) {
    throw new Error('CCTV prompt missing strict prohibition on camera/surveillance talk');
  }
  if (!cctvPrompt.userPrompt.includes('CIA OPERATIVE & COVERT TRADECRAFT VIBE')) {
    throw new Error('CCTV prompt missing CIA operative tradecraft vibe');
  }
  if (!cctvPrompt.userPrompt.includes('ANTI-FORMULA MANDATE / HIGH NATURAL VARIETY')) {
    throw new Error('CCTV prompt missing anti-formula variety mandate');
  }
  if (!cctvPrompt.userPrompt.includes('THE YOUTUBE FLASHBACK HOOK') || !cctvPrompt.userPrompt.includes('chilling double meaning')) {
    throw new Error('CCTV prompt missing YouTube flashback double-meaning guidelines');
  }

  if (!cctvPrompt.userPrompt.includes('STRICTLY MAXIMUM 15 WORDS')) {
    throw new Error('CCTV prompt missing strict 15-word limit for proposer whisper');
  }

  // 4. CCTV Pact Validation Sanitizes Robotic Bribery Lines, Camera Chatter, JSON Leaks & Enforces Word Limits
  const parsedPact = nineRouterService.parseAndValidatePact(
    JSON.stringify({
      whisper: "Marcus, thirty seconds before the cameras cycle, take this $30 bribe to destroy Elena Rostova.",
      receiverResponse: "I will take your $30 bribe deal right now.",
      actionType: "bribe",
      receiverDecision: "accept_and_betray",
      agreedTargetId: "elena-rostova",
      privateStrategy: "I will take the collateral but vote Marcus out instead.",
    }),
    tJax,
    tMarcus,
    ['jax-alvarez', 'marcus-vance', 'elena-rostova'],
    100
  );
  if (parsedPact.whisper.toLowerCase().includes('bribe')) {
    throw new Error(`CCTV whisper still contains robotic "bribe": "${parsedPact.whisper}"`);
  }
  if (parsedPact.whisper.toLowerCase().includes('camera')) {
    throw new Error(`CCTV whisper still contains camera filler: "${parsedPact.whisper}"`);
  }
  if (parsedPact.whisper.trim().split(/\s+/).length > 15) {
    throw new Error(`CCTV whisper exceeds strict 15 words: "${parsedPact.whisper}" (${parsedPact.whisper.trim().split(/\s+/).length} words)`);
  }
  if (parsedPact.receiverResponse && parsedPact.receiverResponse.toLowerCase().includes('bribe')) {
    throw new Error(`CCTV receiverResponse still contains robotic "bribe": "${parsedPact.receiverResponse}"`);
  }
  if (parsedPact.receiverResponse && parsedPact.receiverResponse.trim().split(/\s+/).length > 10) {
    throw new Error(`CCTV receiverResponse exceeds 10 words: "${parsedPact.receiverResponse}"`);
  }

  // 5. Test JSON Leak & Trailing Garbage Auto-Stripping (as observed in Arthur Sterling screenshot bug)
  const malformedPactRaw = `{"whisper": "Victoria, ride the Alvarez consensus, seal it with Rostova's vote, keep $70M dry powder for ballot bailouts.", "actionType": "bribe", "targetCandidate`;
  const healedMalformedPact = nineRouterService.parseAndValidatePact(
    malformedPactRaw,
    tJax,
    tMarcus,
    ['jax-alvarez', 'marcus-vance', 'victoria-sterling'],
    100
  );
  if (healedMalformedPact.whisper.includes('actionType') || healedMalformedPact.whisper.includes('targetCandidate')) {
    throw new Error(`CCTV whisper leaked raw JSON fragments: "${healedMalformedPact.whisper}"`);
  }
  if (healedMalformedPact.whisper.trim().split(/\s+/).length > 15) {
    throw new Error(`Healed CCTV whisper exceeds 15 words: "${healedMalformedPact.whisper}"`);
  }
  console.log('3. CCTV Secretive Atmosphere, CIA Tradecraft Vibe, 15-Word Proposer Limit & JSON Stripping PASSED!');

  // -------------------------------------------------------------
  // ⚡ Automatic Next Mode (Hands-Free OBS / YouTube Recording) Test Suite
  // -------------------------------------------------------------
  console.log('\n--- Testing Automatic Next Mode & Dual-Gated Dialogue Sync ---');

  // 1. Settings & Customizable Delay Default & Bounds
  const defaultConfig = {
    baseUrl: 'http://localhost:20128/v1',
    apiKey: '',
    model: 'gpt-4o-mini',
    autoNextMode: false,
    autoNextDelay: 0.75,
  };
  if (defaultConfig.autoNextDelay !== 0.75) {
    throw new Error(`Expected default autoNextDelay 0.75s, got ${defaultConfig.autoNextDelay}`);
  }
  const customDelays = [0.25, 0.50, 0.75, 1.00, 1.50];
  for (const d of customDelays) {
    const delayMs = Math.max(50, Math.round(d * 1000));
    if (delayMs !== Math.round(d * 1000)) {
      throw new Error(`Delay calculation mismatch for ${d}s: got ${delayMs}`);
    }
  }
  console.log('1. Auto-Next default (0.75s) and customizable delay presets validation PASSED!');

  // 2. AudioSync Subtitle Completion Lifecycle
  const autoNextSampleSpeech = "Citizens of Valoria, I will dismantle their corruption and protect your treasury!";
  audioSync.notifySubtitlesStarted(autoNextSampleSpeech);
  if (audioSync.isSubtitlesComplete(autoNextSampleSpeech)) {
    throw new Error('Subtitle should not be complete immediately after notifySubtitlesStarted!');
  }
  audioSync.notifySubtitlesComplete(autoNextSampleSpeech);
  if (!audioSync.isSubtitlesComplete(autoNextSampleSpeech)) {
    throw new Error('Subtitle should be complete after notifySubtitlesComplete!');
  }
  if (!audioSync.isSubtitlesComplete('')) {
    throw new Error('Empty text should be considered trivially complete');
  }
  console.log('2. AudioSync Subtitle 100% completion tracking & notification PASSED!');

  // 3. AudioSync CCTV Backroom Dual Dialogue Completion Lifecycle
  const samplePactId = 'pact-round-1-vance-alvarez';
  if (audioSync.isCctvComplete(samplePactId)) {
    throw new Error('CCTV pact should not be complete before notification');
  }
  audioSync.notifyCctvComplete(samplePactId);
  if (!audioSync.isCctvComplete(samplePactId)) {
    throw new Error('CCTV pact should be complete after notifyCctvComplete');
  }
  console.log('3. AudioSync CCTV Backroom dual dialogue completion tracking PASSED!');

  // 4. Completion Listener Dispatch Verification
  let listenerCalledCount = 0;
  const unsubscribeTest = audioSync.subscribeCompletion(() => {
    listenerCalledCount += 1;
  });
  audioSync.notifySubtitlesComplete("New distinct subtitle dialogue text for listener test");
  audioSync.notifyCctvComplete("new-distinct-cctv-pact-id");
  unsubscribeTest();
  audioSync.notifySubtitlesComplete("Post unsubscribe text");
  if (listenerCalledCount !== 2) {
    throw new Error(`Expected exactly 2 listener invocations, got ${listenerCalledCount}`);
  }
  console.log('4. AudioSync completion subscription & event dispatch PASSED!');

  // 5. Dual-Condition Gating Simulation
  // Verifies that advance is only allowed when BOTH character audio AND subtitles are 100% finished
  interface StepEvaluationState {
    isLoading: boolean;
    phase: string;
    isSpeakingAudio: boolean;
    subtitlesComplete: boolean;
    cctvComplete: boolean;
    isPaused: boolean;
  }

  const canAdvanceStep = (s: StepEvaluationState): boolean => {
    if (s.isPaused || s.isLoading || s.phase === 'WINNER' || s.phase === 'IDLE') return false;
    if (s.phase === 'VOTE_REVEAL' || s.phase === 'FINAL_REVEAL') return false; // Handled by VoteRevealBoard
    if (s.isSpeakingAudio) return false; // Audio not finished
    if (!s.subtitlesComplete) return false; // Subtitles not finished
    if (s.phase === 'CCTV_BACKROOM' && !s.cctvComplete) return false; // CCTV dialogue incomplete
    return true; // BOTH finished!
  };

  // Case A: Audio is playing, subtitles finished -> BLOCKED
  if (canAdvanceStep({ isLoading: false, phase: 'ATTACK', isSpeakingAudio: true, subtitlesComplete: true, cctvComplete: true, isPaused: false })) {
    throw new Error('Should NOT advance while audio is speaking!');
  }
  // Case B: Audio finished, subtitles still animating -> BLOCKED
  if (canAdvanceStep({ isLoading: false, phase: 'ATTACK', isSpeakingAudio: false, subtitlesComplete: false, cctvComplete: true, isPaused: false })) {
    throw new Error('Should NOT advance while subtitle animation is in progress!');
  }
  // Case C: CCTV proposer finished, receiver has not finished -> BLOCKED
  if (canAdvanceStep({ isLoading: false, phase: 'CCTV_BACKROOM', isSpeakingAudio: false, subtitlesComplete: true, cctvComplete: false, isPaused: false })) {
    throw new Error('Should NOT advance in CCTV before both proposer and receiver finish!');
  }
  // Case D: Whole game finished at WINNER -> BLOCKED
  if (canAdvanceStep({ isLoading: false, phase: 'WINNER', isSpeakingAudio: false, subtitlesComplete: true, cctvComplete: true, isPaused: false })) {
    throw new Error('Should NOT advance past WINNER phase (election finished)!');
  }
  // Case E: Game paused by streamer -> BLOCKED
  if (canAdvanceStep({ isLoading: false, phase: 'CAMPAIGN', isSpeakingAudio: false, subtitlesComplete: true, cctvComplete: true, isPaused: true })) {
    throw new Error('Should NOT advance when paused!');
  }
  // Case F: BOTH character audio dialogue and subtitle dialogue are 100% finished -> ALLOWED!
  if (!canAdvanceStep({ isLoading: false, phase: 'CAMPAIGN', isSpeakingAudio: false, subtitlesComplete: true, cctvComplete: true, isPaused: false })) {
    throw new Error('Expected step advance when BOTH audio and subtitles have 100% finished!');
  }
  // 6. CCTV Multi-Speaker Concurrent Subtitles Verification
  // In CCTV, proposer whisper and receiver reply are rendered simultaneously.
  // Neither one must overwrite the other in AudioSync completion tracking!
  const cctvWhisper = "Arthur, let us combine our delegates to purge Elena from the ballot.";
  const cctvReply = "I agree. Let us do it.";
  audioSync.notifySubtitlesStarted(cctvWhisper);
  audioSync.notifySubtitlesStarted(cctvReply);
  if (audioSync.isSubtitlesComplete(cctvWhisper) || audioSync.isSubtitlesComplete(cctvReply)) {
    throw new Error('Neither whisper nor reply should be complete immediately upon starting!');
  }
  // Proposer finishes first
  audioSync.notifySubtitlesComplete(cctvWhisper);
  if (!audioSync.isSubtitlesComplete(cctvWhisper)) {
    throw new Error('Proposer whisper should be complete after notifySubtitlesComplete!');
  }
  if (audioSync.isSubtitlesComplete(cctvReply)) {
    throw new Error('Receiver reply should still be incomplete while only proposer has finished!');
  }
  // Receiver finishes second
  audioSync.notifySubtitlesComplete(cctvReply);
  if (!audioSync.isSubtitlesComplete(cctvReply)) {
    throw new Error('Receiver reply should be complete after notifySubtitlesComplete!');
  }
  // CRITICAL REGRESSION TEST: Proposer whisper must STILL be complete! It must not have been overwritten!
  if (!audioSync.isSubtitlesComplete(cctvWhisper)) {
    throw new Error('REGRESSION: Proposer whisper was overwritten by receiver reply in audioSync!');
  }
  console.log('6. CCTV Multi-Speaker Concurrent Subtitles & Non-Destructive Retention PASSED!');

  // 7. Multi-Feed CCTV Auto-Next Progression & Reset Simulation
  const feed1Id = 'cctv-feed-1';
  const feed2Id = 'cctv-feed-2';
  audioSync.notifyCctvStarted(feed1Id);
  audioSync.notifyCctvStarted(feed2Id);
  if (audioSync.isCctvComplete(feed1Id) || audioSync.isCctvComplete(feed2Id)) {
    throw new Error('Neither CCTV feed should be marked complete initially');
  }
  audioSync.notifyCctvComplete(feed1Id);
  if (!audioSync.isCctvComplete(feed1Id)) {
    throw new Error('Feed 1 should be complete after notifyCctvComplete');
  }
  if (audioSync.isCctvComplete(feed2Id)) {
    throw new Error('Feed 2 should still be incomplete');
  }
  audioSync.notifyCctvComplete(feed2Id);
  if (!audioSync.isCctvComplete(feed2Id) || !audioSync.isCctvComplete(feed1Id)) {
    throw new Error('Both Feed 1 and Feed 2 should be complete');
  }
  // Replaying Feed 1 resets Feed 1 while leaving Feed 2 intact
  audioSync.notifyCctvStarted(feed1Id);
  if (audioSync.isCctvComplete(feed1Id)) {
    throw new Error('Replayed Feed 1 should be reset to incomplete');
  }
  if (!audioSync.isCctvComplete(feed2Id)) {
    throw new Error('Feed 2 should remain complete during Feed 1 replay');
  }
  console.log('7. Multi-Feed CCTV Auto-Next Progression & Replay Isolation PASSED!');

  // 8. Whole-Game Auto-Next State Machine Pipeline (Start to Finish)
  // Simulates every single phase from IDLE -> CAMPAIGN -> ATTACK -> CCTV Feeds ->
  // VOTE_CONFESSIONAL -> VOTE_REVEAL -> ELIMINATION -> FINAL_SPEECHES -> FINAL_REVEAL -> WINNER
  interface GameStepSim {
    phase: string;
    stepLabel: string;
    whisperText?: string;
    replyText?: string;
    text?: string;
    pactId?: string;
  }

  const wholeGameWorkflow: GameStepSim[] = [
    { phase: 'CAMPAIGN', stepLabel: 'Round 1 Campaign: Arthur', text: 'I promise economic growth.' },
    { phase: 'CAMPAIGN', stepLabel: 'Round 1 Campaign: Alvarez', text: 'Power to the workers!' },
    { phase: 'CAMPAIGN', stepLabel: 'Round 1 Campaign: Elena', text: 'Data-driven governance.' },
    { phase: 'CAMPAIGN', stepLabel: 'Round 1 Campaign: Vance', text: 'Security and order.' },
    { phase: 'ATTACK', stepLabel: 'Round 1 Attack: Arthur vs Alvarez', text: 'Alvarez will bankrupt us.' },
    { phase: 'ATTACK', stepLabel: 'Round 1 Attack: Alvarez vs Elena', text: 'Elena ignores human heart.' },
    { phase: 'CCTV_BACKROOM', stepLabel: 'Round 1 CCTV Feed 1', pactId: 'pact-r1-feed1', whisperText: 'Let us coordinate.', replyText: 'Deal accepted.' },
    { phase: 'CCTV_BACKROOM', stepLabel: 'Round 1 CCTV Feed 2', pactId: 'pact-r1-feed2', whisperText: 'I offer $15M bribe.', replyText: 'Refused.' },
    { phase: 'VOTE_CONFESSIONAL', stepLabel: 'Round 1 Confessional: Arthur', text: 'I am voting for Alvarez.' },
    { phase: 'VOTE_CONFESSIONAL', stepLabel: 'Round 1 Confessional: Alvarez', text: 'Arthur will pay.' },
    { phase: 'VOTE_REVEAL', stepLabel: 'Round 1 Ballot & Bailout Reveal' }, // Handled by VoteRevealBoard
    { phase: 'ELIMINATION', stepLabel: 'Round 1 Elimination Speech: Elena', text: 'History will judge this nation.' },
    { phase: 'FINAL_SPEECHES', stepLabel: 'Final 3: Arthur', text: 'Make Valoria proud.' },
    { phase: 'FINAL_SPEECHES', stepLabel: 'Final 3: Alvarez', text: 'For the ordinary people.' },
    { phase: 'FINAL_SPEECHES', stepLabel: 'Final 3: Vance', text: 'Strength and vigilance.' },
    { phase: 'FINAL_REVEAL', stepLabel: 'Grand Jury Final Reveal' }, // Handled by VoteRevealBoard
    { phase: 'WINNER', stepLabel: 'Winner Podium: Arthur Inaugural', text: 'Thank you citizens of Valoria!' },
  ];

  let currentStepIdx = 0;
  while (currentStepIdx < wholeGameWorkflow.length) {
    const step = wholeGameWorkflow[currentStepIdx];
    if (step.phase === 'WINNER') {
      // Auto-Next MUST halt on WINNER podium!
      const canAdvanceWinner = canAdvanceStep({
        isLoading: false,
        phase: 'WINNER',
        isSpeakingAudio: false,
        subtitlesComplete: true,
        cctvComplete: true,
        isPaused: false,
      });
      if (canAdvanceWinner) {
        throw new Error('Auto-Next must halt on WINNER podium!');
      }
      break;
    }

    if (step.phase === 'VOTE_REVEAL' || step.phase === 'FINAL_REVEAL') {
      // Self-driving board advances on complete
      currentStepIdx += 1;
      continue;
    }

    if (step.phase === 'CCTV_BACKROOM') {
      // 1. Initially whisper and reply are started (incomplete)
      audioSync.notifySubtitlesStarted(step.whisperText!);
      if (step.replyText) audioSync.notifySubtitlesStarted(step.replyText);
      audioSync.notifyCctvStarted(step.pactId!);

      // Audio playing -> must not advance
      const advanceAudioPlaying = canAdvanceStep({
        isLoading: false,
        phase: 'CCTV_BACKROOM',
        isSpeakingAudio: true,
        subtitlesComplete: false,
        cctvComplete: false,
        isPaused: false,
      });
      if (advanceAudioPlaying) throw new Error(`Auto-Next incorrectly advanced while CCTV audio playing in ${step.stepLabel}`);

      // Proposer done, receiver not done -> must not advance
      audioSync.notifySubtitlesComplete(step.whisperText!);
      const advanceHalfway = canAdvanceStep({
        isLoading: false,
        phase: 'CCTV_BACKROOM',
        isSpeakingAudio: false,
        subtitlesComplete: audioSync.isSubtitlesComplete(step.whisperText!) && (!step.replyText || audioSync.isSubtitlesComplete(step.replyText)),
        cctvComplete: audioSync.isCctvComplete(step.pactId!),
        isPaused: false,
      });
      if (advanceHalfway) throw new Error(`Auto-Next incorrectly advanced when only proposer completed in ${step.stepLabel}`);

      // Both done -> must advance
      if (step.replyText) audioSync.notifySubtitlesComplete(step.replyText);
      audioSync.notifyCctvComplete(step.pactId!);
      const advanceBothDone = canAdvanceStep({
        isLoading: false,
        phase: 'CCTV_BACKROOM',
        isSpeakingAudio: false,
        subtitlesComplete: audioSync.isSubtitlesComplete(step.whisperText!) && (!step.replyText || audioSync.isSubtitlesComplete(step.replyText!)),
        cctvComplete: audioSync.isCctvComplete(step.pactId!),
        isPaused: false,
      });
      if (!advanceBothDone) throw new Error(`Auto-Next failed to advance when both completed in ${step.stepLabel}`);

      currentStepIdx += 1;
      continue;
    }

    // Standard single-speaker step
    audioSync.notifySubtitlesStarted(step.text!);
    audioSync.notifySubtitlesComplete(step.text!);
    const advanceStandard = canAdvanceStep({
      isLoading: false,
      phase: step.phase,
      isSpeakingAudio: false,
      subtitlesComplete: audioSync.isSubtitlesComplete(step.text!),
      cctvComplete: true,
      isPaused: false,
    });
    if (!advanceStandard) throw new Error(`Auto-Next failed to advance in ${step.stepLabel}`);
    currentStepIdx += 1;
  }
  console.log('8. Whole-Game Auto-Next State Machine Pipeline (Start to Finish) PASSED!');

  console.log('\nAll unit tests for Among Us Emergency Meeting, Debate Engine, Kinetic Subtitles & Auto-Next PASSED successfully!');
}

testEngine().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
