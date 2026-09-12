import { fishAudioService } from '../src/services/fishAudio';
import fs from 'fs';

async function findMoreUniqueVoices() {
  const apiKey = 'sk-fish-5Zz7hVlOft5sr46Nz1jPf4LhAPdSBJ0Ar08dxdBdCq0';
  const existing = JSON.parse(fs.readFileSync('scratch/verified-voices.json', 'utf8'));
  const seenIds = new Set<string>(existing.map((e: any) => e.id));

  // Add existing working base models we already know and like
  const knownWorking = [
    { id: 'b545c585f631496c914815291da4e893', name: 'Elena (Diplomatic Executive)', category: 'Professional', gender: 'female' as const, description: 'Sharp, articulate, and highly professional delivery suited for economic governance.', tags: ['female', 'professional', 'clear', 'diplomatic'], sampleText: 'Economic discipline, monetary stability, and structural reform are mathematical necessities.' },
    { id: 'bf322df2096a46f18c579d0baa36f41d', name: 'Adrian (Military Commander)', category: 'Deep & Serious', gender: 'male' as const, description: 'Deep, steady, and commanding baritone with resolute military gravitas.', tags: ['male', 'deep', 'serious', 'military'], sampleText: 'National defense requires unwavering vigilance, absolute discipline, and unquestioned resolve.' },
    { id: '59e9dc1cb20c452584788a2690c80970', name: 'Camilla (Passionate Litigator)', category: 'Passionate', gender: 'female' as const, description: 'Bright, energetic, and passionate orator fighting for justice and human rights.', tags: ['female', 'energetic', 'bright', 'passionate'], sampleText: 'The Constitution exists to protect the people, not corrupt backroom cartels!' },
    { id: 'd8a1340984ee4b63ad1ffae27a6a4339', name: 'Alvarez (Gritty Populist)', category: 'Energetic', gender: 'male' as const, description: 'Energetic, direct, and grounded grassroots tone representing working citizens.', tags: ['male', 'energetic', 'confident', 'gritty'], sampleText: 'The working hands of Iron Valley built this republic, and we will no longer be ignored!' },
    { id: 'f8dfe9c83081432386f143e2fe9767ef', name: 'Dmitri (Deep Union Veteran)', category: 'Deep & Raspy', gender: 'male' as const, description: 'Mature, deeply resonant, and gravelly voice forged in union solidarity and labor struggle.', tags: ['male', 'deep', 'raspy', 'mature', 'labor'], sampleText: 'Workers of Valoria, unite! We will not trade our dignity for corporate profits.' },
    { id: '98655a12fa944e26b274c535e5e03842', name: 'Chloe (Digital Disruptor)', category: 'Tech & Modern', gender: 'female' as const, description: 'Modern, fast-paced, and sharp tech entrepreneur voice disrupting legacy systems.', tags: ['female', 'young', 'tech', 'fast'], sampleText: 'Legacy bureaucracy is outdated code. We are rebooting Valoria for algorithmic prosperity!' },
    { id: '536d3a5e000945adb7038665781a4aca', name: 'Ethan (Scientific Technocrat)', category: 'Calm & Intellectual', gender: 'male' as const, description: 'Calm, measured, and highly analytical delivery for scientific and policy vision.', tags: ['male', 'calm', 'intellectual', 'clear'], sampleText: 'Evidence-based algorithms and automated infrastructure will eliminate human error.' },
    { id: '4c6a6762e4ac4bdebdb4fa8525d054a2', name: 'Atomic (Dramatic Jurist)', category: 'Authoritative', gender: 'male' as const, description: 'Booming, theatrical, and commanding voice delivering constitutional judgements.', tags: ['male', 'deep', 'authoritative', 'dramatic'], sampleText: 'The sacred foundations of our Republic stand immutable against radical chaos!' },
    { id: 'e9e9d36027424e55ac3faa620f78a72b', name: 'Zephyr (Dynamic Wildcard)', category: 'Wildcard', gender: 'male' as const, description: 'High energy, dynamic, and unpredictable provocateur shaking up the political theater.', tags: ['male', 'young', 'energetic', 'playful'], sampleText: 'Why so serious, politicians? Let us burn down the old rulebook!' },
    { id: 'ca3007f96ae7499ab87d27ea3599956a', name: 'Sarah (Calm Reformer)', category: 'Calm & Gentle', gender: 'female' as const, description: 'Gentle, sincere, and earnest voice emphasizing environmental restoration and peace.', tags: ['female', 'gentle', 'calm', 'sincere'], sampleText: 'Our land and clean waters are Valoria true legacy for generations to come.' },
    { id: '1936333080804be19655c6749b2ae7b2', name: 'Senator Vance (Senior Statesman)', category: 'Deep & Serious', gender: 'male' as const, description: 'Smooth, mature, and experienced voice of traditional legislative statesmanship.', tags: ['male', 'mature', 'measured', 'statesman'], sampleText: 'Decorum, precedent, and institutional order have preserved our democracy.' }
  ];

  for (const k of knownWorking) {
    if (!seenIds.has(k.id)) {
      seenIds.add(k.id);
      existing.push(k);
    }
  }

  // More searches to reach 45+ unique models
  const extraQueries = [
    { q: 'narrator', cat: 'Deep & Serious', gender: 'male' as const, prefix: 'Epic Chronicler' },
    { q: 'storyteller female', cat: 'Calm & Gentle', gender: 'female' as const, prefix: 'Heritage Storyteller' },
    { q: 'australian', cat: 'Energetic', gender: 'male' as const, prefix: 'Outback Pioneer' },
    { q: 'irish', cat: 'Passionate', gender: 'male' as const, prefix: 'Celtic Firebrand' },
    { q: 'scottish', cat: 'Energetic', gender: 'male' as const, prefix: 'Highland Reformer' },
    { q: 'french', cat: 'Calm & Intellectual', gender: 'female' as const, prefix: 'Continental Philosopher' },
    { q: 'spanish news', cat: 'Professional', gender: 'female' as const, prefix: 'Global Anchor' },
    { q: 'judge', cat: 'Authoritative', gender: 'male' as const, prefix: 'Supreme Justice' },
    { q: 'senator', cat: 'Authoritative', gender: 'male' as const, prefix: 'Majority Leader' },
    { q: 'warrior', cat: 'Deep & Serious', gender: 'male' as const, prefix: 'Frontline Veteran' },
    { q: 'female boss', cat: 'Authoritative', gender: 'female' as const, prefix: 'Venture Sovereign' },
    { q: 'young woman', cat: 'Wildcard', gender: 'female' as const, prefix: 'Youth Delegate' },
  ];

  for (const item of extraQueries) {
    if (existing.length >= 45) break;
    try {
      const url = new URL('https://api.fish.audio/model');
      url.searchParams.set('page_size', '10');
      url.searchParams.set('title', item.q);
      const res = await fetch(url.toString(), {
        headers: { 'Authorization': 'Bearer ' + apiKey }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.items) {
          for (const m of data.items) {
            if (m._id && !seenIds.has(m._id)) {
              try {
                const buf = await fishAudioService.generateSpeech({
                  text: 'Testing acoustic fidelity.',
                  voiceId: m._id,
                  apiKey,
                  model: 's2.1-pro-free',
                });
                if (buf && buf.byteLength > 800) {
                  seenIds.add(m._id);
                  const voiceObj = {
                    id: m._id,
                    name: `${item.prefix} (${m.title ? m.title.replace(/[\(\[\{].*?[\)\]\}]/g, '').trim().slice(0, 16) : 'Voice'})`,
                    category: item.cat,
                    gender: item.gender,
                    description: `Distinctive ${item.gender} ${item.cat.toLowerCase()} voice model.`,
                    tags: [item.gender, item.cat.toLowerCase(), ...((m.tags || []).slice(0, 3))],
                    sampleText: m.default_text || 'Valoria demands courageous leadership and bold solutions.',
                  };
                  existing.push(voiceObj);
                  console.log(`+ Added #${existing.length}: ${voiceObj.name} [${voiceObj.id}]`);
                  break;
                }
              } catch {}
            }
          }
        }
      }
    } catch {}
  }

  console.log(`\nFinal unique verified catalog size: ${existing.length}`);
  fs.writeFileSync('scratch/verified-voices.json', JSON.stringify(existing, null, 2));
}

findMoreUniqueVoices().catch(console.error);
