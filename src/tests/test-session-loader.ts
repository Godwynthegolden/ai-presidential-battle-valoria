import { sessionStorageService } from '../services/sessionStorage';

async function main() {
  console.log('--- Testing listSessions & loadSession ---');
  
  const sessions = await sessionStorageService.listSessions();
  console.log('Available sessions count:', sessions.length);
  sessions.forEach(s => {
    console.log(`- ${s.sessionName}: ${s.topic} (${s.candidatesCount} candidates, ${s.eventsCount} events, ${s.audioCount} audio files)`);
  });

  const voiceT1 = await sessionStorageService.loadSession('voiceT1');
  if (!voiceT1.success || !voiceT1.manifest) {
    throw new Error('Failed to load voiceT1 session: ' + voiceT1.error);
  }
  console.log('\nLoaded voiceT1 manifest:');
  console.log('Topic:', voiceT1.manifest.topic);
  console.log('Candidates in manifest:', voiceT1.manifest.candidates.length);
  console.log('Events loaded:', voiceT1.events?.length);
  console.log('Audio files indexed:', voiceT1.audioIndex?.length);

  const audioPath = sessionStorageService.getAudioFilePath('voiceT1', '01_campaign_01_jax-alvarez.mp3');
  console.log('Audio file path resolved:', audioPath);

  console.log('\n✓ Session loader test PASSED!');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
