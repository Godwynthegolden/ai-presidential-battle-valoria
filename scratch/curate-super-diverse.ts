import { fishAudioService } from '../src/services/fishAudio';
import fs from 'fs';

interface VoiceCandidate {
  id: string;
  name: string;
  category: string;
  gender: 'male' | 'female';
  description: string;
  tags: string[];
  sampleText: string;
}

async function curateSuperDiverseVoices() {
  const apiKey = 'sk-fish-5Zz7hVlOft5sr46Nz1jPf4LhAPdSBJ0Ar08dxdBdCq0';
  
  // Handcrafted diverse query targets to cover the entire spectrum
  const queryArchetypes = [
    // 1. Populist & Energetic Orators
    { query: 'trump', titlePrefix: 'Populist Rally Leader', category: 'Energetic', gender: 'male' as const, desc: 'Fiery, booming populist orator with unscripted rally energy and high charisma.' },
    { query: 'alvarez', titlePrefix: 'Iron Valley Tribune', category: 'Energetic', gender: 'male' as const, desc: 'Grounded, punchy working-class cadence fighting for industrial labor.' },
    { query: 'southern', titlePrefix: 'Heartland Governor', category: 'Energetic', gender: 'male' as const, desc: 'Warm, drawling southern orator with folksy humor and direct punch.' },
    { query: 'preacher', titlePrefix: 'Gospel Civic Orator', category: 'Authoritative', gender: 'male' as const, desc: 'Booming, soaring pastoral cadence inspiring moral urgency and civic duty.' },

    // 2. Technocrats & Intellectual Policy Masters
    { query: 'obama', titlePrefix: 'Constitutional Scholar', category: 'Calm & Intellectual', gender: 'male' as const, desc: 'Smooth, measured, and dignified cadence with professorial eloquence.' },
    { query: 'technocrat', titlePrefix: 'Macro Strategist', category: 'Calm & Intellectual', gender: 'male' as const, desc: 'Analytical, calm chessmaster delivering data-driven policy arguments.' },
    { query: 'cyber', titlePrefix: 'Neural Architect', category: 'Tech & Modern', gender: 'male' as const, desc: 'Fast, sharp, and modern digital pioneer rebooting outdated bureaucracy.' },
    { query: 'ai female', titlePrefix: 'Synthetic Policy Lead', category: 'Tech & Modern', gender: 'female' as const, desc: 'Ice-cool, brilliant, and clinical pioneer in algorithmic governance.' },

    // 3. Hawks & Military Commanders
    { query: 'commander', titlePrefix: 'Special Ops Commander', category: 'Deep & Serious', gender: 'male' as const, desc: 'Cold, intimidating, and lethal baritone with zero tolerance for weakness.' },
    { query: 'general', titlePrefix: 'Aerospace General', category: 'Deep & Serious', gender: 'male' as const, desc: 'Commanding, resolute military gravitas defending sovereign airspace.' },
    { query: 'admiral', titlePrefix: 'Strategic Fleet Admiral', category: 'Deep & Serious', gender: 'male' as const, desc: 'Deep, steady, and unyielding naval commander focused on national defense.' },
    { query: 'border', titlePrefix: 'Frontier Lawman', category: 'Deep & Serious', gender: 'male' as const, desc: 'Grizzled, weathered frontier authority protecting border communities.' },

    // 4. Passionate Reformers & Litigators
    { query: 'prosecutor', titlePrefix: 'Anti-Corruption Prosecutor', category: 'Authoritative', gender: 'male' as const, desc: 'Relentless, piercing courtroom prosecutor cross-examining oligarchic graft.' },
    { query: 'activist female', titlePrefix: 'Grassroots Reformer', category: 'Passionate', gender: 'female' as const, desc: 'Passionate, energetic orator mobilizing working families against corporate cartels.' },
    { query: 'lawyer female', titlePrefix: 'Constitutional Litigator', category: 'Passionate', gender: 'female' as const, desc: 'Fierce, articulate legal defender fighting for civil liberties.' },
    { query: 'investigative', titlePrefix: 'Investigative Tribune', category: 'Passionate', gender: 'female' as const, desc: 'Fearless, rapid-fire whistleblower exposing backroom corruption.' },

    // 5. Diplomats & Statesmen
    { query: 'biden', titlePrefix: 'Senior Statesman', category: 'Deep & Serious', gender: 'male' as const, desc: 'Mature, experienced legislative veteran relying on institutional decorum.' },
    { query: 'british', titlePrefix: 'High Commissioner', category: 'Professional', gender: 'male' as const, desc: 'Refined, articulate British cadence suited for international statecraft.' },
    { query: 'uk female', titlePrefix: 'Diplomatic Envoy', category: 'Professional', gender: 'female' as const, desc: 'Sophisticated, unflappable diplomatic negotiator master of high-stakes mediation.' },
    { query: 'diplomat', titlePrefix: 'Peace Negotiator', category: 'Calm & Gentle', gender: 'female' as const, desc: 'Tranquil, psychological, and calculating peacemaker in geopolitical crises.' },

    // 6. Corporate Tycoons & Market Predators
    { query: 'finance female', titlePrefix: 'Wall Street Sovereign', category: 'Authoritative', gender: 'female' as const, desc: 'Razor-sharp, fast-talking sovereign debt predator demanding fiscal liquidation.' },
    { query: 'tycoon', titlePrefix: 'Industrial Mogul', category: 'Authoritative', gender: 'male' as const, desc: 'Suave, dominant capital tycoon funding infrastructure and energy mega-projects.' },
    { query: 'executive', titlePrefix: 'Biotech Titan', category: 'Professional', gender: 'male' as const, desc: 'Polished, authoritative enterprise leader defending market competition.' },
    { query: 'auditor', titlePrefix: 'Sovereign Debt Auditor', category: 'Professional', gender: 'female' as const, desc: 'Stern, numerical fiscal auditor slashing wasteful public expenditure.' },

    // 7. Grassroots, Labor & Raspy Voices
    { query: 'miner', titlePrefix: 'Deep Union Veteran', category: 'Deep & Raspy', gender: 'male' as const, desc: 'Gravelly, resonant baritone forged in industrial union strikes and labor struggle.' },
    { query: 'raspy', titlePrefix: 'Smokestack Populist', category: 'Deep & Raspy', gender: 'male' as const, desc: 'Weathered, husky voice of the manufacturing heartland.' },
    { query: 'radio', titlePrefix: 'Midnight Broadcaster', category: 'Deep & Raspy', gender: 'male' as const, desc: 'Velvet, atmospheric late-night voice dissecting political conspiracies.' },

    // 8. Wildcards & Dynamic Voices
    { query: 'wildcard', titlePrefix: 'Rebel Provocateur', category: 'Wildcard', gender: 'male' as const, desc: 'High energy, cynical, and unpredictable provocateur mocking political orthodoxies.' },
    { query: 'podcast', titlePrefix: 'Viral Media Disruptor', category: 'Wildcard', gender: 'female' as const, desc: 'Fast-paced, magnetic live-streamer breaking donor scandals in real time.' },
    { query: 'anime female', titlePrefix: 'Cyber Prodigy', category: 'Wildcard', gender: 'female' as const, desc: 'Snappy, futuristic voice bridging youth movements and new media.' },
    { query: 'calm female', titlePrefix: 'Eco-Steward', category: 'Calm & Gentle', gender: 'female' as const, desc: 'Sincere, gentle, and earnest protector of clean water and agricultural heritage.' },
    { query: 'doctor', titlePrefix: 'Public Health Director', category: 'Calm & Gentle', gender: 'female' as const, desc: 'Compassionate, authoritative epidemiologist championing universal healthcare.' },
  ];

  const uniqueSelected: VoiceCandidate[] = [];
  const seenIds = new Set<string>();

  for (const item of queryArchetypes) {
    try {
      const url = new URL('https://api.fish.audio/model');
      url.searchParams.set('page_size', '10');
      url.searchParams.set('title', item.query);
      const res = await fetch(url.toString(), {
        headers: { 'Authorization': 'Bearer ' + apiKey }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          for (const m of data.items) {
            if (m._id && !seenIds.has(m._id)) {
              // Test this candidate with actual TTS synthesis
              try {
                const buf = await fishAudioService.generateSpeech({
                  text: 'Valoria sovereignty.',
                  voiceId: m._id,
                  apiKey,
                  model: 's2.1-pro-free',
                });
                if (buf && buf.byteLength > 800) {
                  seenIds.add(m._id);
                  const voiceObj: VoiceCandidate = {
                    id: m._id,
                    name: `${item.titlePrefix} (${m.title ? m.title.replace(/[\(\[\{].*?[\)\]\}]/g, '').trim().slice(0, 18) : 'Voice'})`,
                    category: item.category,
                    gender: item.gender,
                    description: item.desc,
                    tags: [item.gender, item.category.toLowerCase(), ...((m.tags || []).slice(0, 3))],
                    sampleText: m.default_text || 'We stand before the voters of Valoria to deliver real results and unwavering leadership.',
                  };
                  uniqueSelected.push(voiceObj);
                  console.log(`[${uniqueSelected.length}] Added: ${voiceObj.name} [${voiceObj.id}] (${voiceObj.category})`);
                  break; // Move to next archetype
                }
              } catch (ttsErr: any) {
                console.warn(`Skipping invalid model ${m._id}: ${ttsErr.message}`);
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed query', item.query);
    }
  }

  console.log(`\nCurated ${uniqueSelected.length} completely unique, verified Fish Audio models.`);
  fs.writeFileSync('scratch/verified-voices.json', JSON.stringify(uniqueSelected, null, 2));
}

curateSuperDiverseVoices().catch(console.error);
