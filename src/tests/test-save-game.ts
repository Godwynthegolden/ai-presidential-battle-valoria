import fs from 'fs';
import path from 'path';
import { 
  sessionStorageService, 
  sanitizeSessionName, 
  SessionManifest 
} from '../services/sessionStorage';
import { CANDIDATES } from '../data/candidates';

async function runSaveGameTests() {
  console.log('--- Starting Saved Games Archival & Storage Test Suite ---');

  // 1. Test Session Name Sanitization (Windows & NTFS filename safety)
  console.log('1. Testing Session Name Sanitization...');
  const tests = [
    { input: 'Valoria Debate Season 1', expected: 'Valoria-Debate-Season-1' },
    { input: 'Episode 1: The Great Clash / War * ?', expected: 'Episode-1_-The-Great-Clash-_-War-_-_' },
    { input: '   ...test-session...   ', expected: 'test-session' },
    { input: '', expected: 'session' },
    { input: '<illegal>|"chars"?', expected: '_illegal___chars__' },
  ];

  for (const t of tests) {
    const sanitized = sanitizeSessionName(t.input);
    if (!sanitized || sanitized.includes(':') || sanitized.includes('/') || sanitized.includes('\\') || sanitized.includes('*') || sanitized.includes('?')) {
      throw new Error(`Sanitization failed for "${t.input}": got "${sanitized}"`);
    }
  }
  console.log('  ✓ Name sanitization passed all edge cases.');

  // 2. Test Session Initialization & Folder Creation
  console.log('2. Testing Session Initialization & Directory Structure Creation...');
  const testSessionName = 'test_valoria_presidential_save_suite_01';
  const testDir = sessionStorageService.getSessionDir(testSessionName);

  // Clean up if existed from before
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }

  const sampleCandidates = CANDIDATES.slice(0, 4);
  const testTopic = 'The Industrial Stagflation & Grocery Price Surge: How will you halt consumer prices?';

  const initRes = await sessionStorageService.initSession(testSessionName, {
    topic: testTopic,
    candidates: sampleCandidates,
  });

  if (!initRes.success || !fs.existsSync(testDir)) {
    throw new Error('Session directory was not created on disk.');
  }

  const audioDir = path.join(testDir, 'audio');
  const roundsDir = path.join(testDir, 'rounds');
  const manifestPath = path.join(testDir, 'session_manifest.json');
  const eventsPath = path.join(testDir, 'session_events.json');
  const transcriptPath = path.join(testDir, 'transcript.md');

  if (!fs.existsSync(audioDir) || !fs.existsSync(roundsDir) || !fs.existsSync(manifestPath) || !fs.existsSync(eventsPath) || !fs.existsSync(transcriptPath)) {
    throw new Error('Required subdirectories or core session files missing.');
  }

  const manifestRaw = await fs.promises.readFile(manifestPath, 'utf8');
  const manifest: SessionManifest = JSON.parse(manifestRaw);
  if (manifest.sessionName !== testSessionName || manifest.candidatesCount !== 4 || manifest.status !== 'in_progress') {
    throw new Error('session_manifest.json structure invalid.');
  }

  const transcriptMd = await fs.promises.readFile(transcriptPath, 'utf8');
  if (!transcriptMd.includes('Republic of Valoria: Presidential Election Battle') || !transcriptMd.includes(sampleCandidates[0].name)) {
    throw new Error('transcript.md missing expected header and candidate lineup.');
  }
  console.log('  ✓ Session directory, manifest, and transcript initialized successfully.');

  // 3. Test Real-Time Event Logging (Campaign Speeches, Attacks, CCTV Pacts, Votes, Bailouts, Eliminations)
  console.log('3. Testing Real-Time Event Logging Across Phases...');

  // Event 1: Campaign Speech
  await sessionStorageService.saveEvent(testSessionName, {
    type: 'campaign_speech',
    round: 1,
    speakerId: sampleCandidates[0].id,
    speakerName: sampleCandidates[0].name,
    content: 'Valorians are struggling under skyrocketing grocery bills and closed factories! We will restore power to the working class!',
  });

  // Event 2: Attack
  await sessionStorageService.saveEvent(testSessionName, {
    type: 'attack',
    round: 1,
    speakerId: sampleCandidates[0].id,
    speakerName: sampleCandidates[0].name,
    targetId: sampleCandidates[1].id,
    targetName: sampleCandidates[1].name,
    content: 'Your corporate tax exemptions sold out Iron Valley workers to offshore shell companies!',
    details: {
      isRebuttal: false,
      voteCallTargetName: sampleCandidates[1].name,
    }
  });

  // Event 3: CCTV Backroom Pact & $20 Bribe
  await sessionStorageService.saveEvent(testSessionName, {
    type: 'cctv_pact',
    round: 1,
    speakerId: sampleCandidates[0].id,
    speakerName: sampleCandidates[0].name,
    targetId: sampleCandidates[2].id,
    targetName: sampleCandidates[2].name,
    content: 'Listen Marcus, let us pool our delegates and vote out Elena before she cuts the defense budget.',
    details: {
      location: 'Capitol Cloakroom Cam 04',
      agreedTargetName: sampleCandidates[1].name,
      whisperText: 'Listen Marcus, let us pool our delegates and vote out Elena before she cuts the defense budget.',
      privateStrategy: 'Forming temporary alliance with the General while preserving cash for round 2.',
      bribeOffered: true,
      bribeAmount: 30,
      upfrontPaid: 15,
      escrowPending: 15,
      receiverDecision: 'accept',
      bribeAccepted: true,
    }
  });

  // Event 3b: Strategic Internal Confessional (Internal Dialogue)
  await sessionStorageService.saveEvent(testSessionName, {
    type: 'strategy_monologue',
    round: 1,
    speakerId: sampleCandidates[0].id,
    speakerName: sampleCandidates[0].name,
    targetId: sampleCandidates[1].id,
    targetName: sampleCandidates[1].name,
    content: 'Elena must be eliminated tonight. Her corporate fiscal policies threaten our entire coalition.',
    details: {
      privateReason: 'Consolidating working class voting bloc',
      isBetrayal: false,
      isHonoredPact: true,
    }
  });

  // Event 4: Secret Ballots & $40 Bailout Auction
  await sessionStorageService.saveEvent(testSessionName, {
    type: 'vote_tally',
    round: 1,
    details: {
      votes: [
        { voterName: sampleCandidates[0].name, targetName: sampleCandidates[1].name, isHonoredPact: true, reason: 'High inflation record' },
        { voterName: sampleCandidates[2].name, targetName: sampleCandidates[1].name, isHonoredPact: true, reason: 'Military budget cuts' },
        { voterName: sampleCandidates[1].name, targetName: sampleCandidates[0].name, reason: 'Populist rhetoric' },
        { voterName: sampleCandidates[3].name, targetName: sampleCandidates[1].name, reason: 'Corporate ties' },
      ],
      bailoutTransactions: [
        { candidateName: sampleCandidates[1].name, initialVotes: 3, remainingVotes: 2, cost: 40, remainingBudget: 60 },
      ],
      eliminatedId: sampleCandidates[1].id,
      eliminatedName: sampleCandidates[1].name,
      finalVoteCount: 2,
    }
  });

  // Event 5: Elimination Concession Address
  await sessionStorageService.saveEvent(testSessionName, {
    type: 'elimination',
    round: 1,
    speakerId: sampleCandidates[1].id,
    speakerName: sampleCandidates[1].name,
    content: 'The numbers do not lie. I accept the will of this assembly, but mathematical fiscal reality will soon catch up with Valoria.',
    details: { voteCount: 2 }
  });

  // Verify round folder files
  const round1Dir = path.join(roundsDir, 'round_01');
  if (!fs.existsSync(round1Dir)) {
    throw new Error('round_01 folder was not created.');
  }

  const speechesFile = path.join(round1Dir, '01_campaign_speeches.json');
  const attacksFile = path.join(round1Dir, '02_attacks.json');
  const pactsFile = path.join(round1Dir, '03_cctv_pacts.json');
  const dialoguesFile = path.join(round1Dir, '03b_internal_dialogues.json');
  const votesFile = path.join(round1Dir, '04_voting_and_bailouts.json');
  const elimFile = path.join(round1Dir, '05_elimination.json');

  if (!fs.existsSync(speechesFile) || !fs.existsSync(attacksFile) || !fs.existsSync(pactsFile) || !fs.existsSync(dialoguesFile) || !fs.existsSync(votesFile) || !fs.existsSync(elimFile)) {
    throw new Error('Round structured JSON files were not created.');
  }

  const dialoguesRaw = await fs.promises.readFile(dialoguesFile, 'utf8');
  const dialoguesList = JSON.parse(dialoguesRaw);
  if (!Array.isArray(dialoguesList) || dialoguesList.length !== 1 || dialoguesList[0].content !== 'Elena must be eliminated tonight. Her corporate fiscal policies threaten our entire coalition.') {
    throw new Error('03b_internal_dialogues.json did not save internal monologue properly.');
  }

  const updatedManifestRaw = await fs.promises.readFile(manifestPath, 'utf8');
  const updatedManifest: SessionManifest = JSON.parse(updatedManifestRaw);
  if (
    updatedManifest.summaryStats.totalCampaignSpeeches !== 1 ||
    updatedManifest.summaryStats.totalAttacks !== 1 ||
    updatedManifest.summaryStats.totalCctvPacts !== 1 ||
    updatedManifest.summaryStats.totalInternalDialogues !== 1 ||
    updatedManifest.summaryStats.totalBribesOffered !== 1 ||
    updatedManifest.summaryStats.totalBailoutTransactions !== 1 ||
    updatedManifest.summaryStats.totalDollarsSpentOnBailouts !== 40 ||
    updatedManifest.summaryStats.totalEliminations !== 1
  ) {
    throw new Error(`Manifest summary stats incorrect: ${JSON.stringify(updatedManifest.summaryStats)}`);
  }

  const transcriptMdRaw = await fs.promises.readFile(transcriptPath, 'utf8');
  if (!transcriptMdRaw.includes('Round 1 Confidential Strategy Confessional') || !transcriptMdRaw.includes('Elena must be eliminated tonight')) {
    throw new Error('transcript.md missing internal strategy monologue entry.');
  }
  console.log('  ✓ Real-time event logging, round files, internal dialogues, and summary stats updated correctly.');

  // 4. Test Audio File Saving and audio_index.json Integrity
  console.log('4. Testing Audio (.mp3) File Persistence & Indexing...');
  // Dummy MP3 header buffer (ID3v2)
  const dummyMp3Buffer = Buffer.from([
    0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0xFF, 0xFB, 0x90, 0x64, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
  ]);

  const audioRes = await sessionStorageService.saveAudio(
    testSessionName,
    '01_campaign_01_jackson-alvarez',
    dummyMp3Buffer,
    {
      phase: 'CAMPAIGN',
      round: 1,
      speakerId: sampleCandidates[0].id,
      speakerName: sampleCandidates[0].name,
      textSnippet: 'Valorians are struggling under skyrocketing grocery bills...',
    }
  );

  // Save Strategy Confessional Audio (.mp3)
  const strategyAudioRes = await sessionStorageService.saveAudio(
    testSessionName,
    '01_strategy_vote_01_jackson-alvarez',
    dummyMp3Buffer,
    {
      phase: 'VOTE_CONFESSIONAL',
      round: 1,
      speakerId: sampleCandidates[0].id,
      speakerName: sampleCandidates[0].name,
      targetId: sampleCandidates[1].id,
      targetName: sampleCandidates[1].name,
      textSnippet: 'Elena must be eliminated tonight...',
    }
  );

  if (!strategyAudioRes.success || !fs.existsSync(strategyAudioRes.filePath)) {
    throw new Error(`Strategy confessional audio file was not saved at ${strategyAudioRes.filePath}`);
  }

  const audioIndexPath = path.join(audioDir, 'audio_index.json');
  const audioIndexRaw = await fs.promises.readFile(audioIndexPath, 'utf8');
  const audioIndex = JSON.parse(audioIndexRaw);

  if (!Array.isArray(audioIndex) || audioIndex.length !== 2 || audioIndex[1].filename !== '01_strategy_vote_01_jackson-alvarez.mp3') {
    throw new Error('audio_index.json does not match saved audio metadata.');
  }

  // Test reconstruction of audio index from files (verifies VOTE_CONFESSIONAL detection)
  const reconstructedIndex = await sessionStorageService.reconstructAudioIndexFromFiles(testDir);
  const reconstructedStrategyAudio = reconstructedIndex.find(a => a.filename === '01_strategy_vote_01_jackson-alvarez.mp3');
  if (!reconstructedStrategyAudio || reconstructedStrategyAudio.phase !== 'VOTE_CONFESSIONAL' || reconstructedStrategyAudio.speakerId !== 'jackson-alvarez') {
    throw new Error('reconstructAudioIndexFromFiles failed to classify strategy confessional audio properly.');
  }
  console.log('  ✓ Audio MP3 files and strategy confessional audio index reconstruction verified.');

  // 4b. Test Grand Jury Round 99 Presidential Confessional Event
  console.log('4b. Testing Grand Jury Round 99 Presidential Confessional Logging...');
  await sessionStorageService.saveEvent(testSessionName, {
    type: 'strategy_monologue',
    round: 99,
    speakerId: sampleCandidates[2].id,
    speakerName: sampleCandidates[2].name,
    targetId: sampleCandidates[0].id,
    targetName: sampleCandidates[0].name,
    content: 'My vote to elect the 50th President goes to Jackson Alvarez. He commands the steel and spine this republic requires.',
    details: {
      privateReason: 'Grand Jury final endorsement',
      isGrandJury: true,
    }
  });

  const finalRoundDir = path.join(roundsDir, 'final_round');
  const finalDialoguesFile = path.join(finalRoundDir, '01b_internal_dialogues.json');
  if (!fs.existsSync(finalDialoguesFile)) {
    throw new Error('final_round/01b_internal_dialogues.json was not created.');
  }
  const finalDialoguesRaw = await fs.promises.readFile(finalDialoguesFile, 'utf8');
  const finalDialoguesList = JSON.parse(finalDialoguesRaw);
  if (!Array.isArray(finalDialoguesList) || finalDialoguesList.length !== 1 || !finalDialoguesList[0].content.includes('Jackson Alvarez')) {
    throw new Error('final_round 01b_internal_dialogues.json content invalid.');
  }

  const grandJuryTranscriptRaw = await fs.promises.readFile(transcriptPath, 'utf8');
  if (!grandJuryTranscriptRaw.includes('Grand Jury Presidential Confessional') || !grandJuryTranscriptRaw.includes('My vote to elect the 50th President')) {
    throw new Error('transcript.md missing Grand Jury presidential confessional.');
  }
  console.log('  ✓ Grand Jury Round 99 confessional saved and verified.');

  // 5. Test Session Finish & Transcript Markdown Completion
  console.log('5. Testing Session Finalization & Victory Speech...');
  const finishRes = await sessionStorageService.finishSession(testSessionName, {
    winnerId: sampleCandidates[0].id,
    winnerName: sampleCandidates[0].name,
    victorySpeech: 'To every steelworker, teacher, and family across Valoria: this victory belongs to you!',
  });

  if (!finishRes.success) {
    throw new Error('finishSession call failed.');
  }

  const finalManifestRaw = await fs.promises.readFile(manifestPath, 'utf8');
  const finalManifest: SessionManifest = JSON.parse(finalManifestRaw);
  if (finalManifest.status !== 'completed' || finalManifest.winner?.candidateName !== sampleCandidates[0].name) {
    throw new Error('Manifest did not record completed status and winner.');
  }
  if (finalManifest.summaryStats.totalInternalDialogues !== 2) {
    throw new Error(`Expected 2 internal dialogues in manifest stats, got ${finalManifest.summaryStats.totalInternalDialogues}`);
  }

  const finalTranscriptMd = await fs.promises.readFile(transcriptPath, 'utf8');
  if (!finalTranscriptMd.includes('Presidential Victor of Valoria') || !finalTranscriptMd.includes(sampleCandidates[0].name)) {
    throw new Error('transcript.md does not contain final presidential victory address.');
  }
  console.log('  ✓ Session finalization and transcript completion verified.');

  // 6. Clean Up Test Directory
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
    console.log('  ✓ Test directory cleaned up cleanly.');
  }

  console.log('\n--- ALL Saved Games Archival & Storage Tests PASSED! ---');
}

runSaveGameTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
