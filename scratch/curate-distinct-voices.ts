import { fishAudioService } from '../src/services/fishAudio';

interface VoiceCandidate {
  id: string;
  title: string;
  category: string;
  gender: 'male' | 'female';
  description: string;
  tags: string[];
  sampleText: string;
}

async function curateVoices() {
  const apiKey = 'sk-fish-5Zz7hVlOft5sr46Nz1jPf4LhAPdSBJ0Ar08dxdBdCq0';
  
  const searchCategories: Array<{ query: string; category: string; defaultGender: 'male' | 'female' }> = [
    { query: 'trump', category: 'Authoritative', defaultGender: 'male' },
    { query: 'obama', category: 'Calm & Intellectual', defaultGender: 'male' },
    { query: 'biden', category: 'Deep & Serious', defaultGender: 'male' },
    { query: 'news anchor', category: 'Professional', defaultGender: 'male' },
    { query: 'female news', category: 'Professional', defaultGender: 'female' },
    { query: 'prosecutor', category: 'Authoritative', defaultGender: 'male' },
    { query: 'british', category: 'Calm & Intellectual', defaultGender: 'male' },
    { query: 'uk female', category: 'Professional', defaultGender: 'female' },
    { query: 'southern', category: 'Energetic', defaultGender: 'male' },
    { query: 'radio', category: 'Deep & Serious', defaultGender: 'male' },
    { query: 'narrator deep', category: 'Deep & Raspy', defaultGender: 'male' },
    { query: 'podcast female', category: 'Passionate', defaultGender: 'female' },
    { query: 'activist female', category: 'Passionate', defaultGender: 'female' },
    { query: 'cyber', category: 'Tech & Modern', defaultGender: 'male' },
    { query: 'ai female', category: 'Tech & Modern', defaultGender: 'female' },
    { query: 'general', category: 'Deep & Serious', defaultGender: 'male' },
    { query: 'commander', category: 'Deep & Serious', defaultGender: 'male' },
    { query: 'preacher', category: 'Authoritative', defaultGender: 'male' },
    { query: 'governor', category: 'Authoritative', defaultGender: 'male' },
    { query: 'wildcard', category: 'Wildcard', defaultGender: 'male' },
    { query: 'anime female', category: 'Wildcard', defaultGender: 'female' },
    { query: 'calm female', category: 'Calm & Gentle', defaultGender: 'female' },
    { query: 'gentle', category: 'Calm & Gentle', defaultGender: 'female' },
    { query: 'miner', category: 'Deep & Raspy', defaultGender: 'male' },
    { query: 'gritty', category: 'Deep & Raspy', defaultGender: 'male' },
  ];

  const candidateMap = new Map<string, VoiceCandidate>();

  for (const cat of searchCategories) {
    try {
      const url = new URL('https://api.fish.audio/model');
      url.searchParams.set('page_size', '15');
      url.searchParams.set('title', cat.query);
      const res = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.items) {
          for (const item of data.items) {
            if (!item._id || candidateMap.has(item._id)) continue;
            
            const isFemale = (item.tags || []).includes('female') || cat.defaultGender === 'female' || (item.title || '').toLowerCase().includes('female') || (item.title || '').toLowerCase().includes('woman') || (item.title || '').toLowerCase().includes('lady');
            
            candidateMap.set(item._id, {
              id: item._id,
              title: item.title,
              category: cat.category,
              gender: isFemale ? 'female' : 'male',
              description: item.description || `Distinct ${isFemale ? 'female' : 'male'} ${cat.category.toLowerCase()} voice.`,
              tags: item.tags || [cat.category.toLowerCase()],
              sampleText: item.default_text || (item.samples?.[0]?.text) || 'The future of Valoria is decided on this debate stage with strength and conviction.',
            });
          }
        }
      }
    } catch (e) {
      console.warn('Query error:', cat.query, e);
    }
  }

  console.log(`Found ${candidateMap.size} candidate voice models.`);
  
  // Test synthesize 35 distinct models to make sure they work on API
  const verifiedList: VoiceCandidate[] = [];
  const allCandidates = Array.from(candidateMap.values());

  for (const v of allCandidates) {
    if (verifiedList.length >= 45) break;
    try {
      const testBuffer = await fishAudioService.generateSpeech({
        text: 'Testing model fidelity.',
        voiceId: v.id,
        model: 's2.1-pro-free',
        apiKey,
      });
      if (testBuffer && testBuffer.byteLength > 1000) {
        verifiedList.push(v);
        console.log(`✓ Verified #${verifiedList.length}: [${v.gender}] "${v.title}" (${v.category}) -> ID: ${v.id}`);
      }
    } catch (err: any) {
      console.warn(`✗ Skipped broken/inactive model "${v.title}" (${v.id}): ${err.message}`);
    }
  }

  console.log(`\nSuccessfully verified ${verifiedList.length} distinct working Fish Audio models!`);
  console.log(JSON.stringify(verifiedList, null, 2));
}

curateVoices().catch(console.error);
