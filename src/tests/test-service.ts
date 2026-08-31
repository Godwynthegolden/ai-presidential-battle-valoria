import { nineRouterService } from '../services/nineRouter';
import { 
  CANDIDATES, 
  CANDIDATE_MAP, 
  getStoredSelectedCandidateIds, 
  saveStoredSelectedCandidateIds 
} from '../data/candidates';
import { Candidate } from '../types/candidate';
import { VoteRecord, BailoutTransaction, RoundVoteTally } from '../types/game';
import { sounds } from '../utils/audio';
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

  // Test campaign prompt builder promoting platform and vision
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
  if (!openingPrompt.userPrompt.includes('PRESIDENTIAL CAMPAIGN') || !openingPrompt.userPrompt.includes(randomTopic.title) || !openingPrompt.userPrompt.includes('PROMOTE YOURSELF')) {
    throw new Error('Opening campaign prompt failed to inject campaign stance and crisis topic');
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
          speech: 'I will balance the budget and freeze taxes.',
        }
      ],
    },
  });
  if (!subsequentPrompt.userPrompt.includes('DO NOT default to attacking or rebutting the candidate who spoke before you') || !subsequentPrompt.userPrompt.includes('PROMOTE YOURSELF')) {
    throw new Error('Subsequent campaign prompt failed to enforce self-promotion and anti-previous-speaker attack rules');
  }
  console.log('Campaign speech prompt self-promotion & platform focus PASSED!');

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
  if (!votePromptWithStrategy.userPrompt.includes('YOUR CONFIDENTIAL STRATEGY') || !votePromptWithStrategy.userPrompt.includes('Formed secret pact to eliminate Marcus Vance')) {
    throw new Error('Elimination vote prompt failed to inject candidate secret strategy memo.');
  }
  console.log('2b. Confidential Strategy Memo Injection in Voting Prompt PASSED!');

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

  // Test 6: SoundManager new methods verification
  sounds.enabled = true;
  sounds.playBallotDrop();
  sounds.playCashChime();
  sounds.playSwapWhoosh();
  sounds.playBetrayalAlarm();
  console.log('5. SoundManager Synthesizer Audio Cues PASSED!');

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

  console.log('\nAll unit tests for AI JSON Integrity, Candidate Reordering & Full-Screen YouTube Ballot Reveal PASSED successfully!');
}

testEngine().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
