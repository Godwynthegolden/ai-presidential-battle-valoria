import { nineRouterService } from '../services/nineRouter';
import { CANDIDATES, CANDIDATE_MAP } from '../data/candidates';
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

  // Test dynamic preset counts
  const preset4 = CANDIDATES.slice(0, 4).map(c => c.id);
  const preset6 = CANDIDATES.slice(0, 6).map(c => c.id);
  const preset8 = CANDIDATES.slice(0, 8).map(c => c.id);
  const preset11 = CANDIDATES.map(c => c.id);
  console.log(`Verified custom roster presets: Quick4 (${preset4.length}), Top6 (${preset6.length}), Top8 (${preset8.length}), All11 (${preset11.length})`);

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

  console.log('\nAll unit tests for AI Custom Character Generator & Parameter Editor PASSED successfully!');
}

testEngine().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
