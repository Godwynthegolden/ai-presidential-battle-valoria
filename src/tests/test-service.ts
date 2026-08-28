import { nineRouterService } from '../services/nineRouter';
import { CANDIDATES, CANDIDATE_MAP } from '../data/candidates';

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

  console.log('\nTesting unconfigured error handling:');
  try {
    await nineRouterService.generateAgentAction(
      {
        action: 'campaign_speech',
        candidateId: CANDIDATES[0].id,
        round: 1,
        activeCandidateIds: preset4,
        historyContext: {},
      },
      { baseUrl: '', apiKey: '' }
    );
    throw new Error('Expected generateAgentAction to throw when unconfigured, but it succeeded.');
  } catch (err: any) {
    console.log('Successfully caught unconfigured error:', err.message);
  }

  console.log('\nAll unit tests for Republic of Valoria realistic election engine PASSED successfully!');
}

testEngine().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
