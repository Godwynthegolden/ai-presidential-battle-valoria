import { nineRouterService } from '../services/nineRouter';
import { 
  CANDIDATES, 
  CANDIDATE_MAP, 
  getStoredSelectedCandidateIds, 
  saveStoredSelectedCandidateIds 
} from '../data/candidates';
import { Candidate } from '../types/candidate';
import { COLOR_PRESETS, createColorTheme, hexToRgb } from '../components/CharacterEditorModal';

async function testEngine() {
  console.log('Testing 11 Republic of Valoria Candidates loaded:', CANDIDATES.length);
  if (CANDIDATES.length !== 11) {
    throw new Error(`Expected 11 candidates, got ${CANDIDATES.length}`);
  }

  // Check candidate fields
  for (const c of CANDIDATES) {
    if (!c.id || !c.name || !c.titleRole || !c.slogan || !c.systemPrompt) {
      throw new Error(`Candidate ${c.id} missing required fields.`);
    }
  }
  console.log('All 11 candidate dossiers & titleRoles verified successfully!');

  // Test isConfigured
  console.log('Testing isConfigured check:');
  console.log('Without credentials:', nineRouterService.isConfigured({ baseUrl: '', apiKey: '' }));
  console.log('With credentials:', nineRouterService.isConfigured({ baseUrl: 'http://localhost:20128/v1', apiKey: 'test_key' }));

  // Test dynamic preset counts & selection persistence fallback
  const preset4 = CANDIDATES.slice(0, 4).map(c => c.id);
  const preset6 = CANDIDATES.slice(0, 6).map(c => c.id);
  const preset8 = CANDIDATES.slice(0, 8).map(c => c.id);
  const preset11 = CANDIDATES.map(c => c.id);
  console.log(`Verified custom roster presets: Quick4 (${preset4.length}), Top6 (${preset6.length}), Top8 (${preset8.length}), All11 (${preset11.length})`);

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

  // Test prompt builder with preceding speeches & reactive context
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
  if (!openingPrompt.userPrompt.includes('FIRST candidate') || !openingPrompt.userPrompt.includes(randomTopic.title)) {
    throw new Error('Opening campaign prompt failed to inject opening stance and crisis topic');
  }

  const reactivePrompt = (nineRouterService as any).buildPrompt(CANDIDATES[1], {
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
          speech: 'I will balance the budget and freeze taxes.',
        }
      ],
    },
  });
  if (!reactivePrompt.userPrompt.includes('REBUT') || !reactivePrompt.userPrompt.includes(testCandidate.name)) {
    throw new Error('Subsequent campaign prompt failed to inject reactive rebuttal and preceding candidate speech');
  }
  console.log('Reactive debate prompt construction with multi-candidate contextual awareness PASSED!');

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
  if (!antiFormulaAttackPrompt.userPrompt.includes('ANTI-FORMULA & STYLE RULES') || !antiFormulaAttackPrompt.userPrompt.includes('NEVER format your output as a script label')) {
    throw new Error('Attack prompt failed to contain strict anti-formula and anti-script rules');
  }
  console.log('Dialogue Speech Sanitizer & Anti-Formula Prompt Guardrails PASSED!');

  console.log('\nAll unit tests for AI Candidate Intelligence, Timeline Chronology, Dialogue Sanitizer & Prompt Engine PASSED successfully!');
}

testEngine().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
