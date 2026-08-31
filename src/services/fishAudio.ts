import { CandidateVoiceConfig } from '@/types/candidate';

export interface FishAudioTTSOptions {
  text: string;
  voiceId?: string;
  model?: string;
  apiKey?: string;
  format?: 'mp3' | 'wav' | 'pcm' | 'opus';
  speed?: number;
}

export interface FishVoiceModel {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  category: string;
  description: string;
  tags: string[];
  sampleText?: string;
  coverImage?: string;
}

/**
 * Curated high-fidelity English & expressive voice models for Valoria political contenders
 */
export const CURATED_VOICES: FishVoiceModel[] = [
  {
    id: '5196af35f6ff4a0dbf541793fc9f2157',
    name: 'Bold Leader (Tycoon)',
    gender: 'male',
    category: 'Authoritative',
    description: 'Confident, powerful, and authoritative with a strong, energetic debate presence.',
    tags: ['male', 'authoritative', 'energetic', 'leader', 'bold'],
    sampleText: 'Valoria will prosper when we unleash true capital, bold investments, and decisive strength!',
  },
  {
    id: 'b545c585f631496c914815291da4e893',
    name: 'Elena (Diplomatic Executive)',
    gender: 'female',
    category: 'Professional',
    description: 'Sharp, articulate, and highly professional delivery suited for economic governance.',
    tags: ['female', 'professional', 'clear', 'diplomatic', 'confident'],
    sampleText: 'Economic discipline, monetary stability, and structural reform are not options—they are mathematical necessities.',
  },
  {
    id: 'bf322df2096a46f18c579d0baa36f41d',
    name: 'Adrian (Military Commander)',
    gender: 'male',
    category: 'Deep & Serious',
    description: 'Deep, steady, and commanding baritone with resolute military gravitas.',
    tags: ['male', 'deep', 'serious', 'military', 'commanding'],
    sampleText: 'National defense requires unwavering vigilance, absolute discipline, and unquestioned resolve.',
  },
  {
    id: '59e9dc1cb20c452584788a2690c80970',
    name: 'Camilla (Passionate Litigator)',
    gender: 'female',
    category: 'Passionate',
    description: 'Bright, energetic, and passionate orator fighting for justice and human rights.',
    tags: ['female', 'energetic', 'bright', 'passionate', 'reform'],
    sampleText: 'The Constitution exists to protect the people, not the corrupt backroom cartels who exploit them!',
  },
  {
    id: 'd8a1340984ee4b63ad1ffae27a6a4339',
    name: 'Alvarez (Gritty Populist)',
    gender: 'male',
    category: 'Energetic',
    description: 'Energetic, direct, and grounded grassroots tone representing working citizens.',
    tags: ['male', 'energetic', 'confident', 'gritty', 'populist'],
    sampleText: 'The working hands of Iron Valley built this republic, and we will no longer be ignored by the elites!',
  },
  {
    id: 'f8dfe9c83081432386f143e2fe9767ef',
    name: 'Dmitri (Deep Union Veteran)',
    gender: 'male',
    category: 'Deep & Raspy',
    description: 'Mature, deeply resonant, and gravelly voice forged in union solidarity and labor struggle.',
    tags: ['male', 'deep', 'raspy', 'mature', 'labor'],
    sampleText: 'Workers of Valoria, unite! We will not trade our dignity for corporate profits.',
  },
  {
    id: '98655a12fa944e26b274c535e5e03842',
    name: 'Chloe (Digital Disruptor)',
    gender: 'female',
    category: 'Tech & Modern',
    description: 'Modern, fast-paced, and sharp tech entrepreneur voice disrupting legacy systems.',
    tags: ['female', 'young', 'tech', 'fast', 'disruptor'],
    sampleText: 'Legacy bureaucracy is outdated code. We are rebooting Valoria for high-speed algorithmic prosperity!',
  },
  {
    id: '536d3a5e000945adb7038665781a4aca',
    name: 'Ethan (Scientific Technocrat)',
    gender: 'male',
    category: 'Calm & Intellectual',
    description: 'Calm, measured, and highly analytical delivery for scientific and policy vision.',
    tags: ['male', 'calm', 'intellectual', 'clear', 'technocrat'],
    sampleText: 'Evidence-based algorithms and automated infrastructure will eliminate human error from governance.',
  },
  {
    id: '4c6a6762e4ac4bdebdb4fa8525d054a2',
    name: 'Atomic (Dramatic Jurist)',
    gender: 'male',
    category: 'Authoritative',
    description: 'Booming, theatrical, and commanding voice delivering constitutional judgements.',
    tags: ['male', 'deep', 'authoritative', 'dramatic', 'announcer'],
    sampleText: 'The sacred foundations of our Republic stand immutable against the winds of radical chaos!',
  },
  {
    id: 'e9e9d36027424e55ac3faa620f78a72b',
    name: 'Zephyr (Dynamic Wildcard)',
    gender: 'male',
    category: 'Wildcard',
    description: 'High energy, dynamic, and unpredictable provocateur shaking up the political theater.',
    tags: ['male', 'young', 'energetic', 'playful', 'wildcard'],
    sampleText: 'Why so serious, politicians? Let us burn down the old rulebook and see who actually survives!',
  },
  {
    id: 'ca3007f96ae7499ab87d27ea3599956a',
    name: 'Sarah (Calm Reformer)',
    gender: 'female',
    category: 'Calm & Gentle',
    description: 'Gentle, sincere, and earnest voice emphasizing environmental restoration and peace.',
    tags: ['female', 'gentle', 'calm', 'sincere', 'green'],
    sampleText: 'Our land and clean waters are Valoria\'s true legacy. We must protect our planet for generations to come.',
  },
  {
    id: '1936333080804be19655c6749b2ae7b2',
    name: 'Senator Vance (Senior Statesman)',
    gender: 'male',
    category: 'Deep & Serious',
    description: 'Smooth, mature, and experienced voice of traditional legislative statesmanship.',
    tags: ['male', 'mature', 'measured', 'statesman', 'serious'],
    sampleText: 'Decorum, precedent, and institutional order have preserved our democracy for two centuries.',
  },
  {
    id: 'd8a1340984ee4b63ad1ffae27a6a4339',
    name: 'Callahan (Frontier Commander)',
    gender: 'male',
    category: 'Deep & Serious',
    description: 'Weathered, unyielding, and gritty frontier authority defending national borders.',
    tags: ['male', 'frontier', 'border', 'hawk', 'commanding'],
    sampleText: 'A nation without hardened borders is not a nation. We stand on the line of defense.',
  },
  {
    id: 'b545c585f631496c914815291da4e893',
    name: 'Vivienne (Neural Technocrat)',
    gender: 'female',
    category: 'Tech & Modern',
    description: 'Ice-cool, brilliant, and clinical pioneer in synthetic intelligence and cognitive progress.',
    tags: ['female', 'neurotech', 'ai', 'technocrat', 'clinical'],
    sampleText: 'We must upgrade human potential and lead the synthetic century with uncompromising intellect.',
  },
  {
    id: '4c6a6762e4ac4bdebdb4fa8525d054a2',
    name: 'Stone (Cartel Prosecutor)',
    gender: 'male',
    category: 'Authoritative',
    description: 'Relentless, piercing courtroom prosecutor cross-examining oligarchic corruption.',
    tags: ['male', 'prosecutor', 'law', 'uncompromising', 'justice'],
    sampleText: 'No billionaire is above the law. The subpoena has been issued and justice will be served.',
  },
  {
    id: '1936333080804be19655c6749b2ae7b2',
    name: 'Pastor Haddon (Gospel Orator)',
    gender: 'male',
    category: 'Authoritative',
    description: 'Booming, warm, and soaring pastoral cadence inspiring moral renewal and civic duty.',
    tags: ['male', 'pastor', 'faith', 'inspirational', 'traditional'],
    sampleText: 'Heal the soul of Valoria! Return to the sacred bonds of faith, family, and honest labor.',
  },
  {
    id: '59e9dc1cb20c452584788a2690c80970',
    name: 'Kendra (Wall Street Shark)',
    gender: 'female',
    category: 'Authoritative',
    description: 'Razor-sharp, fast-talking sovereign debt predator demanding fiscal liquidation.',
    tags: ['female', 'finance', 'hedge-fund', 'capitalist', 'sharp'],
    sampleText: 'Liquidate the deadweight bureaucracy and run Valoria at an undeniable sovereign profit.',
  },
  {
    id: 'd8a1340984ee4b63ad1ffae27a6a4339',
    name: 'Colt (Rural Lawman)',
    gender: 'male',
    category: 'Energetic',
    description: 'Grounded, drawling country lawman defending rancher liberty and common sense.',
    tags: ['male', 'sheriff', 'rural', 'heartland', 'liberty'],
    sampleText: 'Keep the bureaucrats off our ranches. Real freedom lives in the heartland of this republic.',
  },
  {
    id: 'ca3007f96ae7499ab87d27ea3599956a',
    name: 'Maya (Diplomatic Negotiator)',
    gender: 'female',
    category: 'Calm & Gentle',
    description: 'Tranquil, psychological, and calculating diplomat master of crisis negotiation.',
    tags: ['female', 'diplomat', 'calm', 'strategic', 'negotiator'],
    sampleText: 'Calibrated leverage and precision de-escalation are the only path to enduring sovereign peace.',
  },
  {
    id: 'f8dfe9c83081432386f143e2fe9767ef',
    name: 'Hayes (Deep Coal Miner)',
    gender: 'male',
    category: 'Deep & Raspy',
    description: 'Grizzled, booming heartland miner fighting for forgotten energy workers.',
    tags: ['male', 'miner', 'labor', 'raw', 'heartland'],
    sampleText: 'We dug the coal that powered your cities! We will never surrender our pensions or our dignity.',
  },
  {
    id: '5196af35f6ff4a0dbf541793fc9f2157',
    name: 'Richter (Biotech Executive)',
    gender: 'male',
    category: 'Professional',
    description: 'Suave, aristocratic biotech tycoon defending pharmaceutical patent innovation.',
    tags: ['male', 'biotech', 'pharma', 'executive', 'capitalist'],
    sampleText: 'Innovation requires massive capital. We cure diseases through the power of market incentives.',
  },
  {
    id: '536d3a5e000945adb7038665781a4aca',
    name: 'Tariq (Sovereign Wealth CIO)',
    gender: 'male',
    category: 'Calm & Intellectual',
    description: 'Quiet, aristocratic global macro chessmaster managing sovereign billions.',
    tags: ['male', 'macro', 'wealth', 'sovereign', 'intellectual'],
    sampleText: 'A three-hundred billion dollar sovereign endowment guarantees our republic eternal financial immortality.',
  },
  {
    id: '59e9dc1cb20c452584788a2690c80970',
    name: 'Gia (Viral Streamer)',
    gender: 'female',
    category: 'Passionate',
    description: 'Rapid-fire, cynical, and fearless live-streamer exposing backroom secrets.',
    tags: ['female', 'podcast', 'viral', 'streamer', 'leaks'],
    sampleText: 'The receipts are on screen! We are exposing every single donor slush fund live on the stream.',
  },
  {
    id: 'bf322df2096a46f18c579d0baa36f41d',
    name: 'Price (Special Ops Commander)',
    gender: 'male',
    category: 'Deep & Serious',
    description: 'Cold, intimidating, and lethal military commander with zero tolerance for weakness.',
    tags: ['male', 'special-ops', 'military', 'command', 'stealth'],
    sampleText: 'Zero compromise. Total deterrence. We eliminate threats before they reach our soil.',
  },
  {
    id: 'b545c585f631496c914815291da4e893',
    name: 'Albright (Budget Auditor)',
    gender: 'female',
    category: 'Professional',
    description: 'Stern, numerical, and razor-sharp fiscal auditor slashing public deficit waste.',
    tags: ['female', 'auditor', 'budget', 'technocrat', 'finance'],
    sampleText: 'Balance the ledger! We will not allow fraudulent politicians to bankrupt future generations.',
  },
  {
    id: '1936333080804be19655c6749b2ae7b2',
    name: 'Falken (Energy Dynast)',
    gender: 'male',
    category: 'Deep & Serious',
    description: 'Stately, classical aristocratic landowner preserving generational conservation.',
    tags: ['male', 'aristocrat', 'heritage', 'traditional', 'dignified'],
    sampleText: 'Two centuries of sacred land stewardship have taught us that honor must always rise above profit.',
  },
  {
    id: 'e9e9d36027424e55ac3faa620f78a72b',
    name: 'Sora (Cyber Prodigy)',
    gender: 'male',
    category: 'Wildcard',
    description: 'Snappy, hyper-literate whitehat hacker patching obsolete political architecture.',
    tags: ['male', 'hacker', 'cyber', 'open-source', 'prodigy'],
    sampleText: 'Your legacy political bureaucracy is full of unpatched zero-days. We are open-sourcing the state!',
  },
  {
    id: 'f8dfe9c83081432386f143e2fe9767ef',
    name: 'Wade (Airline Captain)',
    gender: 'male',
    category: 'Deep & Serious',
    description: 'Calm, deep, and steady airline captain guiding working families through turbulence.',
    tags: ['male', 'captain', 'pilot', 'labor', 'steady'],
    sampleText: 'Hold the flight deck steady in crosswinds. We are putting working families in the pilot seat.',
  },
  {
    id: 'ca3007f96ae7499ab87d27ea3599956a',
    name: 'Leila (Crisis Medic)',
    gender: 'female',
    category: 'Calm & Gentle',
    description: 'Passionate frontline epidemiologist fighting for universal healthcare and human life.',
    tags: ['female', 'doctor', 'medic', 'public-health', 'compassion'],
    sampleText: 'Every single life is sacred. We will rebuild our hospitals and protect the public health.',
  },
  {
    id: '4c6a6762e4ac4bdebdb4fa8525d054a2',
    name: 'Winters (Constitutional Jurist)',
    gender: 'male',
    category: 'Authoritative',
    description: 'Crushing constitutional authority delivering definitive verdicts on the rule of law.',
    tags: ['male', 'judge', 'constitution', 'authoritative', 'charter'],
    sampleText: 'The founding charter is inviolable. We will defend the sacred separation of powers.',
  },
  {
    id: '59e9dc1cb20c452584788a2690c80970',
    name: 'Victoria (Populist Heiress)',
    gender: 'female',
    category: 'Passionate',
    description: 'Magnetic, glamorous, and rebellious heiress funding the progressive youth revolution.',
    tags: ['female', 'heiress', 'venture', 'wildcard', 'charismatic'],
    sampleText: 'Break the family dynasty! We are taking private equity fortunes and funding the people.',
  },
  {
    id: 'bf322df2096a46f18c579d0baa36f41d',
    name: 'Drake (Space Admiral)',
    gender: 'male',
    category: 'Deep & Serious',
    description: 'Visionary aerospace admiral securing asteroid mineral wealth and orbital defense.',
    tags: ['male', 'space', 'admiral', 'orbital', 'visionary'],
    sampleText: 'The high frontier of space holds infinite resources. Orbital sovereignty is Valoria\'s destiny.',
  },
];

export class FishAudioService {
  private defaultApiKey: string;
  private defaultModel: string;
  private apiEndpoint = 'https://api.fish.audio';

  constructor() {
    this.defaultApiKey = process.env.FISH_AUDIO_API_KEY || 'sk-fish-5Zz7hVlOft5sr46Nz1jPf4LhAPdSBJ0Ar08dxdBdCq0';
    this.defaultModel = process.env.FISH_AUDIO_MODEL || 's2.1-pro-free';
  }

  /**
   * Get all curated voice models
   */
  public getCuratedVoices(): FishVoiceModel[] {
    return CURATED_VOICES;
  }

  /**
   * Find curated voice by ID or name
   */
  public findVoice(voiceIdOrName: string): FishVoiceModel | undefined {
    return CURATED_VOICES.find(
      v => v.id.toLowerCase() === voiceIdOrName.toLowerCase() || 
           v.name.toLowerCase().includes(voiceIdOrName.toLowerCase())
    );
  }

  /**
   * Generate Text-to-Speech audio from Fish Audio API
   */
  public async generateSpeech(options: FishAudioTTSOptions): Promise<ArrayBuffer> {
    const apiKey = options.apiKey || this.defaultApiKey;
    const model = options.model || this.defaultModel;
    const voiceId = options.voiceId || CURATED_VOICES[0].id;
    const format = options.format || 'mp3';

    if (!apiKey) {
      throw new Error('Fish Audio API Key is missing. Please configure your Fish Audio API Key in Settings.');
    }

    if (!options.text || !options.text.trim()) {
      throw new Error('Text is required for TTS audio generation.');
    }

    // Clean text from extraneous quotes or emojis for clean voice synthesis
    const cleanedText = options.text
      .replace(/^["'“‘]+|["'”’]+$/g, '')
      .trim();

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'model': model,
    };

    const payload = {
      text: cleanedText,
      reference_id: voiceId,
      format: format,
    };

    const res = await fetch(`${this.apiEndpoint}/v1/tts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let errorDetail = `HTTP ${res.status}`;
      try {
        const errorJson = await res.json();
        errorDetail = errorJson.message || errorJson.error || JSON.stringify(errorJson);
      } catch {
        errorDetail = await res.text();
      }
      throw new Error(`Fish Audio TTS Failed (${res.status}): ${errorDetail}`);
    }

    return await res.arrayBuffer();
  }

  /**
   * Query Fish Audio voice models cloud library
   */
  public async fetchAvailableVoices(params?: {
    apiKey?: string;
    search?: string;
    language?: string;
    pageSize?: number;
  }): Promise<FishVoiceModel[]> {
    const apiKey = params?.apiKey || this.defaultApiKey;
    if (!apiKey) return CURATED_VOICES;

    try {
      const url = new URL(`${this.apiEndpoint}/model`);
      url.searchParams.set('page_size', String(params?.pageSize || 20));
      if (params?.language) url.searchParams.set('language', params.language);
      if (params?.search) url.searchParams.set('title', params.search);

      const res = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!res.ok) return CURATED_VOICES;

      const data = await res.json();
      if (!data || !Array.isArray(data.items)) return CURATED_VOICES;

      const fetchedVoices: FishVoiceModel[] = data.items.map((m: any) => ({
        id: m._id || m.id,
        name: m.title || 'Custom Voice',
        gender: (m.tags || []).includes('female') ? 'female' : 'male',
        category: (m.tags || []).slice(0, 2).join(', ') || 'Custom',
        description: m.description || '',
        tags: m.tags || [],
        sampleText: m.default_text || (m.samples?.[0]?.text) || undefined,
        coverImage: m.cover_image,
      }));

      // Merge curated voices at the top, avoiding duplicates
      const curatedIds = new Set(CURATED_VOICES.map(c => c.id));
      const filteredFetched = fetchedVoices.filter(f => !curatedIds.has(f.id));

      return [...CURATED_VOICES, ...filteredFetched];
    } catch (e) {
      console.warn('[FishAudioService] Could not fetch models from cloud, using curated list:', e);
      return CURATED_VOICES;
    }
  }
}

export const fishAudioService = new FishAudioService();
