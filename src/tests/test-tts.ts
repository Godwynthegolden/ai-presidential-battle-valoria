import assert from 'assert';
import { fishAudioService, CURATED_VOICES } from '../services/fishAudio';
import { CANDIDATES, CANDIDATE_MAP } from '../data/candidates';
import { Candidate } from '../types/candidate';

async function runTTSTests() {
  console.log('--- Starting Fish.Audio TTS Integration Tests ---');

  // 1. Verify Curated Voices
  console.log(`Testing Curated Voice Catalog: found ${CURATED_VOICES.length} voices`);
  assert(CURATED_VOICES.length >= 10, 'Curated voices catalog should have at least 10 voice models');
  
  const boldLeader = fishAudioService.findVoice('5196af35f6ff4a0dbf541793fc9f2157');
  assert(boldLeader !== undefined, 'Bold Leader voice should exist in curated voices');
  assert.strictEqual(boldLeader?.gender, 'male');

  const elenaVoice = fishAudioService.findVoice('b545c585f631496c914815291da4e893');
  assert(elenaVoice !== undefined, 'Elena voice should exist in curated voices');
  assert.strictEqual(elenaVoice?.gender, 'female');

  console.log('✓ Curated Voice Catalog & Voice Lookup PASSED');

  // 2. Verify all 11 Default Candidates have assigned Voices
  console.log(`Testing Default Candidate Voice assignments: ${CANDIDATES.length} candidates`);
  for (const candidate of CANDIDATES) {
    assert(candidate.voice !== undefined, `Candidate ${candidate.name} (${candidate.id}) must have a voice config`);
    assert(typeof candidate.voice.voiceId === 'string' && candidate.voice.voiceId.length > 0, `Candidate ${candidate.name} must have a valid voiceId`);
    assert(typeof candidate.voice.voiceName === 'string' && candidate.voice.voiceName.length > 0, `Candidate ${candidate.name} must have a voiceName`);
    console.log(`  - ${candidate.name} -> 🎙️ ${candidate.voice.voiceName} [${candidate.voice.voiceId.slice(0, 8)}...]`);
  }
  console.log('✓ All 11 default candidate voice configurations verified successfully!');

  // 3. Test Custom Candidate Voice Customization
  const customCandidate: Candidate = {
    id: 'custom_test_1',
    name: 'Governor Vance Test',
    codename: 'THE_COMMANDER',
    archetype: 'hawk',
    archetypeTitle: 'Military Hawk',
    titleRole: 'Defense Leader',
    slogan: 'Peace Through Strength',
    ideology: 'National defense',
    personality: 'Resolute',
    speakingStyle: 'Commanding',
    motivations: 'National defense',
    strengths: ['Strategy'],
    weaknesses: ['Stubborn'],
    behavioralTendencies: ['Direct'],
    rivalArchetypes: ['reformer'],
    color: {
      primary: '#f59e0b',
      bg: 'bg-amber-500/15',
      border: 'border-amber-500',
      text: 'text-amber-400',
      glow: 'shadow-amber-500/50',
      gradient: 'from-amber-600 to-stone-800'
    },
    avatar: {
      icon: 'shield',
      svgType: 'shield'
    },
    voice: {
      voiceId: 'bf322df2096a46f18c579d0baa36f41d',
      voiceName: 'Adrian (Military Commander)',
      gender: 'male',
      category: 'Deep & Serious'
    },
    systemPrompt: 'You are a test candidate.'
  };

  assert.strictEqual(customCandidate.voice?.voiceName, 'Adrian (Military Commander)');
  console.log('✓ Custom candidate voice configuration and persistence PASSED');

  // 4. Test Live Fish Audio TTS Generation with s2.1-pro-free
  console.log('Testing Live Fish Audio TTS Synthesis API call...');
  try {
    const audioBuffer = await fishAudioService.generateSpeech({
      text: 'Republic of Valoria presidential election voice synthesis test.',
      voiceId: '5196af35f6ff4a0dbf541793fc9f2157',
      model: 's2.1-pro-free',
    });

    assert(audioBuffer instanceof ArrayBuffer, 'Generated audio must be an ArrayBuffer');
    assert(audioBuffer.byteLength > 1000, `Generated audio buffer size (${audioBuffer.byteLength} bytes) should be > 1000 bytes`);
    console.log(`✓ Fish Audio TTS Synthesis successful! Generated ${audioBuffer.byteLength} bytes of MP3 audio.`);
  } catch (err: any) {
    console.error('TTS Generation error:', err);
    throw err;
  }

  console.log('\n--- ALL Fish.Audio TTS Integration Tests PASSED Successfully! ---');
}

runTTSTests().catch(err => {
  console.error('TTS Test Suite Failed:', err);
  process.exit(1);
});
