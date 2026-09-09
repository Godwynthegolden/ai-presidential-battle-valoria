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
  // 1. Authoritative & Leaders
  {
    id: '5196af35f6ff4a0dbf541793fc9f2157',
    name: 'Bold Leader (Tycoon Baritone)',
    gender: 'male',
    category: 'Authoritative',
    description: 'Confident, powerful, and booming industrialist debate presence with unscripted rally energy.',
    tags: ['male', 'authoritative', 'energetic', 'leader', 'tycoon'],
    sampleText: 'Valoria will prosper when we unleash true capital, bold investments, and decisive strength!',
  },
  {
    id: '4c6a6762e4ac4bdebdb4fa8525d054a2',
    name: 'Atomic (Dramatic Jurist)',
    gender: 'male',
    category: 'Authoritative',
    description: 'Theatrical, commanding orator delivering constitutional judgements with thunderous clarity.',
    tags: ['male', 'deep', 'authoritative', 'dramatic', 'announcer'],
    sampleText: 'The sacred foundations of our Republic stand immutable against the winds of radical chaos!',
  },
  {
    id: '93cccbd0ef674d5a933e2d55e95b5373',
    name: 'Gospel Preacher (Civic Orator)',
    gender: 'male',
    category: 'Authoritative',
    description: 'Booming, soaring pastoral cadence inspiring moral renewal and civic duty.',
    tags: ['male', 'authoritative', 'preacher', 'faith', 'inspirational'],
    sampleText: 'Today we gather with thankful hearts, guided by truth, justice, and honest labor!',
  },
  {
    id: '8ce550397df046dbb80ceee5e341d8c8',
    name: 'Garrick Stone (Cartel Prosecutor)',
    gender: 'male',
    category: 'Authoritative',
    description: 'Relentless, piercing courtroom prosecutor cross-examining oligarchic corruption.',
    tags: ['male', 'prosecutor', 'law', 'uncompromising', 'justice'],
    sampleText: 'No billionaire is above the law. The subpoena has been issued and justice will be served.',
  },
  {
    id: 'cf18908d563c4983aed24db6e22853ba',
    name: 'Industrial Mogul (Capital Tycoon)',
    gender: 'male',
    category: 'Authoritative',
    description: 'Suave, commanding corporate builder financing high-speed rail and energy infrastructure.',
    tags: ['male', 'authoritative', 'mogul', 'infrastructure', 'capitalist'],
    sampleText: 'We build the factories, we lay the steel, and we fund the future of this sovereign nation!',
  },

  // 2. Professional & Diplomatic
  {
    id: 'b545c585f631496c914815291da4e893',
    name: 'Elena Rostova (Diplomatic Executive)',
    gender: 'female',
    category: 'Professional',
    description: 'Sharp, articulate, and highly professional delivery suited for central banking and fiscal policy.',
    tags: ['female', 'professional', 'clear', 'diplomatic', 'confident'],
    sampleText: 'Economic discipline, monetary stability, and structural reform are mathematical necessities.',
  },
  {
    id: '65c0b8155c464a648161af8877404f11',
    name: 'Brian (High Commissioner)',
    gender: 'male',
    category: 'Professional',
    description: 'Refined, articulate British cadence suited for international trade and geopolitical statecraft.',
    tags: ['male', 'professional', 'british', 'diplomat', 'refined'],
    sampleText: 'Multilateral treaties and international financial credibility are the pillars of lasting sovereignty.',
  },
  {
    id: 'b8d23dd873cc40a48b75906f56b8b67c',
    name: 'Kendra Vane (Wall Street Predator)',
    gender: 'female',
    category: 'Professional',
    description: 'Razor-sharp, fast-talking sovereign debt predator demanding aggressive fiscal liquidation.',
    tags: ['female', 'professional', 'finance', 'hedge-fund', 'sharp'],
    sampleText: 'Liquidate the deadweight bureaucracy and run Valoria at an undeniable sovereign profit.',
  },
  {
    id: 'e596ab2ebd4841ba9fba0dabeb341d69',
    name: 'Jonathan Richter (Biotech Titan)',
    gender: 'male',
    category: 'Professional',
    description: 'Polished, aristocratic executive defending pharmaceutical patents and private enterprise.',
    tags: ['male', 'professional', 'executive', 'biotech', 'corporate'],
    sampleText: 'Innovation requires massive capital. We cure diseases through the power of market incentives.',
  },
  {
    id: 'd9da4a948da0468b8b7730de9be4f748',
    name: 'Diana Albright (Budget Auditor)',
    gender: 'female',
    category: 'Professional',
    description: 'Stern, numerical, and uncompromising fiscal auditor slashing wasteful public expenditure.',
    tags: ['female', 'professional', 'auditor', 'budget', 'technocrat'],
    sampleText: 'Balance the ledger! We will not allow fraudulent politicians to bankrupt future generations.',
  },

  // 3. Deep & Serious Baritones
  {
    id: 'bf322df2096a46f18c579d0baa36f41d',
    name: 'Adrian Vance (Military Commander)',
    gender: 'male',
    category: 'Deep & Serious',
    description: 'Deep, steady, and commanding baritone with resolute military gravitas.',
    tags: ['male', 'deep', 'serious', 'military', 'commanding'],
    sampleText: 'National defense requires unwavering vigilance, absolute discipline, and unquestioned resolve.',
  },
  {
    id: 'ddc981f5c23046f8a7144393ad261029',
    name: 'Roland Price (Special Ops Commander)',
    gender: 'male',
    category: 'Deep & Serious',
    description: 'Cold, intimidating, and lethal tactical commander with zero tolerance for weakness.',
    tags: ['male', 'deep & serious', 'special-ops', 'military', 'command'],
    sampleText: 'Zero compromise. Total deterrence. We eliminate threats before they reach our sovereign soil.',
  },
  {
    id: 'ef5698d8d21243928659639c8fd30515',
    name: 'Cassian Drake (Aerospace General)',
    gender: 'male',
    category: 'Deep & Serious',
    description: 'Visionary aerospace admiral securing asteroid mineral wealth and orbital defense.',
    tags: ['male', 'deep & serious', 'space', 'admiral', 'visionary'],
    sampleText: 'The high frontier of space holds infinite resources. Orbital sovereignty is Valoria\'s destiny.',
  },
  {
    id: '29b9977695cd4d95ad692135ed5bcf65',
    name: 'Ray Callahan (Frontier Lawman)',
    gender: 'male',
    category: 'Deep & Serious',
    description: 'Weathered, unyielding border commissioner defending sovereignty and law enforcement.',
    tags: ['male', 'deep & serious', 'frontier', 'border', 'hawk'],
    sampleText: 'A nation without hardened borders is not a nation. We stand on the line of defense.',
  },
  {
    id: '1936333080804be19655c6749b2ae7b2',
    name: 'Silas Thorne (Senior Statesman)',
    gender: 'male',
    category: 'Deep & Serious',
    description: 'Smooth, mature, and experienced voice of traditional legislative statesmanship.',
    tags: ['male', 'deep & serious', 'mature', 'statesman', 'senate'],
    sampleText: 'Decorum, precedent, and institutional order have preserved our democracy for two centuries.',
  },
  {
    id: '565502b9434d467993ba89e4eb5fa7a4',
    name: 'Henrik Falken (Energy Dynast)',
    gender: 'male',
    category: 'Deep & Serious',
    description: 'Stately, classical aristocratic landowner preserving generational conservation.',
    tags: ['male', 'deep & serious', 'aristocrat', 'heritage', 'dignified'],
    sampleText: 'Two centuries of sacred land stewardship have taught us that honor must rise above profit.',
  },
  {
    id: '179b5cc736974d96913c7849d0bb68c5',
    name: 'Malcolm Winters (Epic Chronicler)',
    gender: 'male',
    category: 'Deep & Serious',
    description: 'Deep, resonant, and cinematic narrator voice delivering historical perspectives.',
    tags: ['male', 'deep & serious', 'narrator', 'cinematic', 'epic'],
    sampleText: 'History will judge this assembly not by its promises, but by the courage of its convictions.',
  },

  // 4. Energetic & Populist
  {
    id: 'd8a1340984ee4b63ad1ffae27a6a4339',
    name: 'Jackson Alvarez (Gritty Populist)',
    gender: 'male',
    category: 'Energetic',
    description: 'Energetic, direct, and grounded grassroots tone representing industrial shift workers.',
    tags: ['male', 'energetic', 'confident', 'gritty', 'populist'],
    sampleText: 'The working hands of Iron Valley built this republic, and we will no longer be ignored by the elites!',
  },
  {
    id: '92d1b18ddc0e484bafb58133770eee11',
    name: 'Martin (Grassroots Tribune)',
    gender: 'male',
    category: 'Energetic',
    description: 'Dynamic, urgent, and rhythmic rally speaker mobilizing voter turnouts across neighborhoods.',
    tags: ['male', 'energetic', 'populist', 'mobilizer', 'urgent'],
    sampleText: 'Look at the faces in this crowd! We are taking power back from the backroom lobbyists today!',
  },
  {
    id: '3135fbb0431d48e098669090bc5e6dd9',
    name: 'Colt Briggs (Heartland Sheriff)',
    gender: 'male',
    category: 'Energetic',
    description: 'Grounded, drawling country lawman defending rancher liberty and rural common sense.',
    tags: ['male', 'energetic', 'southern', 'rural', 'heartland'],
    sampleText: 'Keep the bureaucrats off our ranches. Real freedom lives in the heartland of this republic.',
  },
  {
    id: 'df508294a64043afa31e656dbf015623',
    name: 'Rex (Outback Pioneer)',
    gender: 'male',
    category: 'Energetic',
    description: 'Brisk, confident Australian cadence championing frontier expansion and mineral sovereignty.',
    tags: ['male', 'energetic', 'australian', 'pioneer', 'frontier'],
    sampleText: 'Roll up your sleeves! We have a continent to build and endless resources to develop.',
  },
  {
    id: 'aca9d9ba6be040e69ff2bea641767919',
    name: 'Callum (Highland Reformer)',
    gender: 'male',
    category: 'Energetic',
    description: 'Fiery, proud Scottish cadence fighting fiercely for decentralization and local sovereignty.',
    tags: ['male', 'energetic', 'scottish', 'reformer', 'feisty'],
    sampleText: 'We will never bow to distant central bureaucrats dictating terms to our proud communities!',
  },

  // 5. Passionate Reformers & Litigators
  {
    id: '59e9dc1cb20c452584788a2690c80970',
    name: 'Camilla Laurent (Passionate Litigator)',
    gender: 'female',
    category: 'Passionate',
    description: 'Bright, energetic, and passionate orator fighting for justice and human rights.',
    tags: ['female', 'energetic', 'bright', 'passionate', 'reform'],
    sampleText: 'The Constitution exists to protect the people, not the corrupt backroom cartels who exploit them!',
  },
  {
    id: '0edf03c4ff7f43df8ae59d9ec0f5d4eb',
    name: 'Victoria Sterling (Youth Tribune)',
    gender: 'female',
    category: 'Passionate',
    description: 'Passionate, magnetic orator mobilizing progressive youth against dynastic wealth.',
    tags: ['female', 'passionate', 'activist', 'youth', 'reform'],
    sampleText: 'Break the family dynasties! We are taking private equity fortunes and funding the people!',
  },
  {
    id: '6d91c091920f4bf4ac88613a7e08a8d3',
    name: 'Gia Moretti (Investigative Whistleblower)',
    gender: 'female',
    category: 'Passionate',
    description: 'Fearless, fast-talking investigative reporter breaking backroom donor slush-fund scandals.',
    tags: ['female', 'passionate', 'whistleblower', 'investigative', 'podcast'],
    sampleText: 'The receipts are live on screen! We are exposing every single bribe in this presidential race.',
  },
  {
    id: '29509e20f1a14a8698ffb42134fc944d',
    name: 'Sean (Celtic Firebrand)',
    gender: 'male',
    category: 'Passionate',
    description: 'Fiery, lyrical Irish cadence carrying centuries of anti-oligarchical conviction.',
    tags: ['male', 'passionate', 'irish', 'firebrand', 'orator'],
    sampleText: 'From the docks to the mills, our voice will rise like a roaring tide against their golden towers!',
  },

  // 6. Calm & Intellectual Policy Thinkers
  {
    id: '4ce7e917cedd4bc2bb2e6ff3a46acaa1',
    name: 'Marcus Vance (Constitutional Scholar)',
    gender: 'male',
    category: 'Calm & Intellectual',
    description: 'Smooth, measured, and dignified cadence delivering deeply structured policy vision.',
    tags: ['male', 'calm & intellectual', 'scholar', 'eloquent', 'statesman'],
    sampleText: 'We stand before the voters of Valoria to deliver real results and unwavering democratic leadership.',
  },
  {
    id: '536d3a5e000945adb7038665781a4aca',
    name: 'Ethan Cross (Scientific Technocrat)',
    gender: 'male',
    category: 'Calm & Intellectual',
    description: 'Calm, measured, and analytical delivery for automated macro-economic infrastructure.',
    tags: ['male', 'calm & intellectual', 'clear', 'technocrat', 'analytical'],
    sampleText: 'Evidence-based algorithms and automated infrastructure will eliminate human error from governance.',
  },
  {
    id: 'e6fa085797cf4259befce5b61a923eb8',
    name: 'Claire (Continental Philosopher)',
    gender: 'female',
    category: 'Calm & Intellectual',
    description: 'Sophisticated European cadence emphasizing ethics, civic philosophy, and institutional integrity.',
    tags: ['female', 'calm & intellectual', 'european', 'philosophy', 'ethics'],
    sampleText: 'A republic is not defined by its wealth alone, but by the dignity it accords to its humblest citizens.',
  },

  // 7. Tech & Modern Cyber Pioneers
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
    id: '946250d41fcb4181bf6f094d39ba66e3',
    name: 'Vivienne Zhao (Synthetic Policy Lead)',
    gender: 'female',
    category: 'Tech & Modern',
    description: 'Ice-cool, brilliant, and clinical pioneer in synthetic intelligence and cognitive progress.',
    tags: ['female', 'tech & modern', 'neurotech', 'ai', 'clinical'],
    sampleText: 'We must upgrade human potential and lead the synthetic century with uncompromising intellect.',
  },
  {
    id: 'e1ea4679a5fe47a68adb3bfff3859395',
    name: 'Sora Kim (Neural Architect)',
    gender: 'male',
    category: 'Tech & Modern',
    description: 'Snappy, hyper-literate whitehat hacker patching obsolete political architecture.',
    tags: ['male', 'tech & modern', 'hacker', 'cyber', 'open-source'],
    sampleText: 'Your legacy political bureaucracy is full of unpatched zero-days. We are open-sourcing the state!',
  },

  // 8. Calm & Gentle Reformers
  {
    id: 'ca3007f96ae7499ab87d27ea3599956a',
    name: 'Amara Chen (Calm Reformer)',
    gender: 'female',
    category: 'Calm & Gentle',
    description: 'Gentle, sincere, and earnest voice emphasizing environmental restoration and clean water.',
    tags: ['female', 'calm & gentle', 'sincere', 'green', 'peace'],
    sampleText: 'Our land and clean waters are Valoria\'s true legacy. We must protect our planet for future generations.',
  },
  {
    id: 'c91bca6c57fd449e8fc0edde2a7e90bf',
    name: 'Maya Lin (Peace Negotiator)',
    gender: 'female',
    category: 'Calm & Gentle',
    description: 'Tranquil, psychological, and calculating diplomat master of high-stakes crisis de-escalation.',
    tags: ['female', 'calm & gentle', 'diplomat', 'strategic', 'negotiator'],
    sampleText: 'Calibrated leverage and precision de-escalation are the only path to enduring sovereign peace.',
  },
  {
    id: '839e7bdb6e1c428a8bba1fb784b7b1e2',
    name: 'Rowan (Eco-Steward)',
    gender: 'female',
    category: 'Calm & Gentle',
    description: 'Warm, soothing, and maternal environmental protector guiding agricultural conservation.',
    tags: ['female', 'calm & gentle', 'conservation', 'steward', 'earth'],
    sampleText: 'When we heal the soil, we feed our families and secure the health of the entire nation.',
  },
  {
    id: '31a18e2d02c340bf896c39ed27f7e8c5',
    name: 'Leila Kassam (Public Health Director)',
    gender: 'female',
    category: 'Calm & Gentle',
    description: 'Compassionate, authoritative epidemiologist fighting for universal healthcare and human life.',
    tags: ['female', 'calm & gentle', 'doctor', 'medic', 'public-health'],
    sampleText: 'Every single life is sacred. We will rebuild our community clinics and guarantee care for all.',
  },
  {
    id: 'd296ba634f164155abd7018f51454518',
    name: 'Courtney (Heritage Storyteller)',
    gender: 'female',
    category: 'Calm & Gentle',
    description: 'Warm, rich, and lyrical British storytelling cadence celebrating civic heritage.',
    tags: ['female', 'calm & gentle', 'storyteller', 'british', 'warm'],
    sampleText: 'From generation to generation, the courage of our founders shines as a guiding beacon.',
  },

  // 9. Deep & Raspy Veterans
  {
    id: 'f8dfe9c83081432386f143e2fe9767ef',
    name: 'Dmitri Voronin (Deep Union Veteran)',
    gender: 'male',
    category: 'Deep & Raspy',
    description: 'Mature, deeply resonant, and gravelly voice forged in union solidarity and labor struggle.',
    tags: ['male', 'deep & raspy', 'mature', 'labor', 'raw'],
    sampleText: 'Workers of Valoria, unite! We will not trade our dignity for corporate profits.',
  },
  {
    id: '0fe7ce6bb97e474b9dd4032487ea076e',
    name: 'Declan Hayes (Deep Coal Miner)',
    gender: 'male',
    category: 'Deep & Raspy',
    description: 'Grizzled, booming heartland miner fighting for forgotten energy workers and pensions.',
    tags: ['male', 'deep & raspy', 'miner', 'energy', 'heartland'],
    sampleText: 'We dug the coal that powered your cities! We will never surrender our pensions or our dignity.',
  },
  {
    id: '82b71d5ec4f442498c9f11ee1bf2f8f9',
    name: 'Osamu (Smokestack Populist)',
    gender: 'male',
    category: 'Deep & Raspy',
    description: 'Weathered, husky voice of the manufacturing docks challenging corporate outsourcing.',
    tags: ['male', 'deep & raspy', 'smokestack', 'industrial', 'gritty'],
    sampleText: 'Stop shipping our jobs overseas! Bring the supply chains back to Valoria where they belong.',
  },
  {
    id: 'cf3bd50df5234f8bbcfaaf83e92361c8',
    name: 'Douglas Wade (Midnight Broadcaster)',
    gender: 'male',
    category: 'Deep & Raspy',
    description: 'Velvet, atmospheric airline captain and late-night host guiding citizens through turbulence.',
    tags: ['male', 'deep & raspy', 'broadcaster', 'pilot', 'steady'],
    sampleText: 'Hold the flight deck steady in crosswinds. We are putting working families in the pilot seat.',
  },

  // 10. Wildcards & Provocateurs
  {
    id: 'e9e9d36027424e55ac3faa620f78a72b',
    name: 'Julian Mercer (Dynamic Wildcard)',
    gender: 'male',
    category: 'Wildcard',
    description: 'High energy, dynamic, and unpredictable provocateur shaking up the political theater.',
    tags: ['male', 'wildcard', 'young', 'energetic', 'provocateur'],
    sampleText: 'Why so serious, politicians? Let us burn down the old rulebook and see who actually survives!',
  },
  {
    id: 'f4c1231b39214e7a8ff063f5b71980ec',
    name: 'Zane (Viral Media Disruptor)',
    gender: 'male',
    category: 'Wildcard',
    description: 'Fast-paced, cynical live-streamer exposing backroom deals in real time.',
    tags: ['male', 'wildcard', 'streamer', 'viral', 'podcast'],
    sampleText: 'The chat is exploding! We just leaked the candidate secret budget ledgers live on air!',
  },
  {
    id: '71122101e2704d2ea7b2c2d3016f9ccc',
    name: 'Kira (Cyber Prodigy)',
    gender: 'female',
    category: 'Wildcard',
    description: 'Snappy, futuristic young voice bridging decentralized grassroots networks and digital democracy.',
    tags: ['female', 'wildcard', 'young', 'anime', 'futurist'],
    sampleText: 'Decentralize the vote! The old party machines have had their day—now it is our turn.',
  },

  // 11. Expanded Female Acoustic Personas (Diverse Timbres & Dialects)
  {
    id: '41db41746b9c4bd18053c2bfc213b476',
    name: 'Emma (Sophisticated British Diplomat)',
    gender: 'female',
    category: 'Professional',
    description: 'Polished, sophisticated British RP cadence delivering high-stakes international accords and diplomatic strategy.',
    tags: ['female', 'professional', 'british', 'diplomat', 'sophisticated'],
    sampleText: 'Multilateral treaties and refined statecraft are the true guarantors of enduring peace across Valoria.',
  },
  {
    id: '8ac193f2ae964c02ad0ef4f93d09e5d6',
    name: 'Morgana (Smoky Shadow Broker)',
    gender: 'female',
    category: 'Deep & Raspy',
    description: 'Deep, husky, breathy alto radiating late-night backroom influence, high-stakes secrets, and unyielding leverage.',
    tags: ['female', 'deep & raspy', 'husky', 'smoky', 'mysterious', 'alto'],
    sampleText: 'Every politician on this stage has a price tag. Some pay in campaign cash, others pay in treason.',
  },
  {
    id: '42e70f5bc7b34a9e84abbbd6ec5572d0',
    name: 'Natasha (Sassy & Razor-Witted)',
    gender: 'female',
    category: 'Energetic',
    description: 'Punchy, razor-sharp, sassy debate presence that tears down bloated establishment egos with effortless wit.',
    tags: ['female', 'energetic', 'sassy', 'witty', 'sharp', 'confident'],
    sampleText: 'Please spare us the focus-group tears! You could not balance a municipal ledger if your career depended on it.',
  },
  {
    id: 'b089032e45db460fb1934ece75a8c51d',
    name: 'Valkyrie (Deep Matron Jurist)',
    gender: 'female',
    category: 'Authoritative',
    description: 'Deep, slow, imposing baritone-range matron commanding total judicial obedience and constitutional rigor.',
    tags: ['female', 'authoritative', 'deep', 'matron', 'jurist', 'solemn'],
    sampleText: 'The High Court will not bend to executive decrees or mob hysteria. The law remains absolute and immutable.',
  },
  {
    id: 'f06431add405433ba777a323911f0dfd',
    name: 'Aria (Calm & Intimate ASMR)',
    gender: 'female',
    category: 'Calm & Gentle',
    description: 'Whisper-soft, soothing, hypnotic cadence bringing profound serenity and psychological disarmament.',
    tags: ['female', 'calm & gentle', 'whisper', 'asmr', 'soft', 'intimate'],
    sampleText: 'Lower your voice, take a breath, and look at what our shared humanity and living land truly require.',
  },
  {
    id: '32e344f53f114cfcbb7ed086f10f2403',
    name: 'Helena (Corporate Board Chair)',
    gender: 'female',
    category: 'Professional',
    description: 'Crisp, authoritative British executive dissecting multi-billion sovereign balance sheets with surgical precision.',
    tags: ['female', 'professional', 'british', 'corporate', 'executive', 'crisp'],
    sampleText: 'Capital allocation is not a sentimental exercise. We reward audited performance and liquidate sovereign insolvency.',
  },
  {
    id: 'e6695c3b73734b3d97a2bc26a723ec94',
    name: 'Seraphina (Velvet Noir Investigator)',
    gender: 'female',
    category: 'Passionate',
    description: 'Velvety, mysterious, late-night noir investigator exposing classified contractor slush funds.',
    tags: ['female', 'passionate', 'noir', 'velvet', 'investigative', 'mysterious'],
    sampleText: 'Turn the spotlight on the secret defense earmarks. The truth is never clean, but it is always illuminating.',
  },
  {
    id: '82a3ef4504a6441e9a07acdaaf5349c1',
    name: 'Bridget (Highland Reformer)',
    gender: 'female',
    category: 'Passionate',
    description: 'Expressive, rhythmic Scottish/Highland cadence rallying grassroots working families against oligarchic landlords.',
    tags: ['female', 'passionate', 'scottish', 'highland', 'reformer', 'grassroots'],
    sampleText: 'The land belongs to the folk who till the soil and build the homes, not the offshore tax avoiders!',
  },
  {
    id: '3b480f554a5b4ab9a6bc62d6ebd7c98a',
    name: 'Zoe (High-Pitch Youth Rebel)',
    gender: 'female',
    category: 'Wildcard',
    description: 'High-tempo, energetic, youthful disruptor mocking careerist traditions and demanding direct digital democracy.',
    tags: ['female', 'wildcard', 'youth', 'high-pitch', 'rebel', 'playful'],
    sampleText: 'Why are we letting eighty-year-olds vote on artificial intelligence? Time to reboot the whole government stack!',
  },
  {
    id: 'd8615a2e870b4e50841d21b3cbb3f8e4',
    name: 'Commander Steele (Special Tribunal Chief)',
    gender: 'female',
    category: 'Authoritative',
    description: 'Stern, unbending, iron-willed tribunal chief conducting relentless anti-cartel interdictions.',
    tags: ['female', 'authoritative', 'military', 'tribunal', 'strict', 'law'],
    sampleText: 'We do not negotiate with cartel syndicates. We seize their assets, strip their immunity, and dismantle their networks.',
  },
  {
    id: '2a9605eeafe84974b5b20628d42c0060',
    name: 'Grace (Empathetic Community Leader)',
    gender: 'female',
    category: 'Calm & Gentle',
    description: 'Warm, grounded, conversational community organizer focusing on public health, housing, and family welfare.',
    tags: ['female', 'calm & gentle', 'empathetic', 'community', 'warm', 'friendly'],
    sampleText: 'When our neighborhoods thrive, the entire Republic stands on unshakeable, compassionate foundations.',
  },
  {
    id: 'da3e7f40f72041eab8d986603b94d63b',
    name: 'Chloe (Independent Citizen Journalist)',
    gender: 'female',
    category: 'Wildcard',
    description: 'Relaxed, modern, conversational podcaster breaking down complex political bills into plain truths.',
    tags: ['female', 'wildcard', 'podcast', 'conversational', 'modern', 'independent'],
    sampleText: 'Let us be real for a second—nobody reading page four hundred of that bill believes it was written for normal people.',
  },
  {
    id: 'c9668514a19a4a049ae499167d17ff89',
    name: 'Clarissa (National Broadcaster)',
    gender: 'female',
    category: 'Professional',
    description: 'Impeccably clear, measured broadcast anchor delivering breaking sovereign updates with supreme poise.',
    tags: ['female', 'professional', 'broadcast', 'anchor', 'british', 'news'],
    sampleText: 'Good evening. Tonight, Valoria faces a decisive vote that will reshape the next half-century of our Republic.',
  },
  {
    id: '096be7345bac471f95bb296ccae35170',
    name: 'Isla (Frontline Crisis Medic)',
    gender: 'female',
    category: 'Calm & Gentle',
    description: 'Gentle, compassionate, battle-tested field medic fighting for universal hospital surge capacity.',
    tags: ['female', 'calm & gentle', 'medic', 'healthcare', 'compassionate', 'warm'],
    sampleText: 'In the emergency room, we do not ask for party affiliations. We treat human lives with equal, sacred care.',
  },
  {
    id: 'fceba2366d864bd1809a580aefdda1b1',
    name: 'Nova (Cyber Broadcast Anchor)',
    gender: 'female',
    category: 'Tech & Modern',
    description: 'Crisp, electric, modern media voice reporting live on digital sovereignty and decentralized networks.',
    tags: ['female', 'tech & modern', 'cyber', 'broadcast', 'crisp', 'electric'],
    sampleText: 'The verified telemetry is in. Cryptographic transparency is our only defense against institutional deceit.',
  },
  {
    id: '1b1286fcf2f44d8ba1405e0b71abca22',
    name: 'Freya (Energetic Grassroots Agitator)',
    gender: 'female',
    category: 'Energetic',
    description: 'Dynamic, high-spirited, passionate rally speaker building nationwide volunteer coalitions.',
    tags: ['female', 'energetic', 'rally', 'grassroots', 'inspiring', 'dynamic'],
    sampleText: 'We are taking this campaign to every town hall, every campus, and every working-class kitchen table across the nation!',
  },
  {
    id: '75c3002bb8ad48e5808223b65d0f5b58',
    name: 'Tessa (Viral Campaign Host)',
    gender: 'female',
    category: 'Energetic',
    description: 'Fast-talking, vibrant, pop-culture-savvy campaign host connecting youth culture with civic power.',
    tags: ['female', 'energetic', 'viral', 'pop-culture', 'youth', 'vibrant'],
    sampleText: 'Turn the volume up! When our generation stands together, the old corrupt machines crumble in hours.',
  },
  {
    id: '2324c907b9a94c64ab4afb941e5b3408',
    name: 'Evelyn (Senior Policy Analyst)',
    gender: 'female',
    category: 'Calm & Intellectual',
    description: 'Methodical, crisp, intellectual policy analyst dismantling speculative economic promises with hard data.',
    tags: ['female', 'calm & intellectual', 'analyst', 'policy', 'methodical', 'academic'],
    sampleText: 'Let us examine the actuarial projections and sovereign bond covenants before committing reserves to untested plans.',
  },
  {
    id: 'f4af99581a5947c49a5921212e9c4432',
    name: 'Jeannie (Civic Radio Broadcaster)',
    gender: 'female',
    category: 'Energetic',
    description: 'Bright, friendly, enthusiastic public radio host promoting civic engagement and democratic debate.',
    tags: ['female', 'energetic', 'radio', 'civic', 'friendly', 'bright'],
    sampleText: 'Welcome to the Valoria Civic Forum. Every citizen has a voice, and every vote shapes our future!',
  },
  {
    id: '66502a6575d74d5d824d35e4b8c95289',
    name: 'Rowena (Dark Shadow Litigator)',
    gender: 'female',
    category: 'Authoritative',
    description: 'Deep, dramatic, raspy, cinematic prosecutor who leaves corrupt targets with nowhere to hide.',
    tags: ['female', 'authoritative', 'deep & raspy', 'dramatic', 'cinematic', 'prosecutor'],
    sampleText: 'Your offshore accounts have been unsealed. Step down now, or face the full fury of a federal grand jury.',
  },
];

export const DEFAULT_FISH_AUDIO_KEYS: string[] = [
  'sk-fish-5Zz7hVlOft5sr46Nz1jPf4LhAPdSBJ0Ar08dxdBdCq0',
  'sk-fish-FhpR3igZk-M0oslJOI6KBwe6ipOePusmFB4A1sAUMIs',
];

export class FishAudioService {
  private defaultApiKeys: string[];
  private defaultModel: string;
  private apiEndpoint = 'https://api.fish.audio';
  private keyRotationIndex = 0;

  constructor() {
    const envKey = process.env.FISH_AUDIO_API_KEY;
    if (envKey && envKey.trim()) {
      this.defaultApiKeys = this.parseApiKeys(envKey);
    } else {
      this.defaultApiKeys = [...DEFAULT_FISH_AUDIO_KEYS];
    }
    this.defaultModel = process.env.FISH_AUDIO_MODEL || 's2.1-pro-free';
  }

  /**
   * Parse single string with multiple keys (comma, space, or newline separated) into clean array
   */
  public parseApiKeys(apiKeyInput?: string): string[] {
    if (!apiKeyInput || typeof apiKeyInput !== 'string') {
      return [...this.defaultApiKeys];
    }
    const keys = apiKeyInput
      .split(/[\r\n,;\s]+/)
      .map(k => k.trim())
      .filter(k => k.startsWith('sk-fish-') || k.length > 20);

    return keys.length > 0 ? keys : [...this.defaultApiKeys];
  }

  /**
   * Get the next API key in the round-robin rotation
   */
  public getNextApiKey(customKeyInput?: string): string {
    const pool = this.parseApiKeys(customKeyInput);
    const selected = pool[this.keyRotationIndex % pool.length];
    this.keyRotationIndex = (this.keyRotationIndex + 1) % 1000000;
    return selected;
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
   * Generate Text-to-Speech audio from Fish Audio API with Round-Robin & Auto-Failover
   */
  public async generateSpeech(options: FishAudioTTSOptions): Promise<ArrayBuffer> {
    const keyPool = this.parseApiKeys(options.apiKey);
    const model = options.model || this.defaultModel;
    const voiceId = options.voiceId || CURATED_VOICES[0].id;
    const format = options.format || 'mp3';

    if (!keyPool.length) {
      throw new Error('Fish Audio API Key is missing. Please configure your Fish Audio API Key in Settings.');
    }

    if (!options.text || !options.text.trim()) {
      throw new Error('Text is required for TTS audio generation.');
    }

    // Clean text from extraneous quotes or emojis for clean voice synthesis
    const cleanedText = options.text
      .replace(/^["'“‘]+|["'”’]+$/g, '')
      .trim();

    // Round-robin starting key index
    const startIndex = this.keyRotationIndex % keyPool.length;
    this.keyRotationIndex = (this.keyRotationIndex + 1) % 1000000;

    let lastError: Error | null = null;

    // Try keys sequentially starting from round-robin chosen index (Failover loop)
    for (let attempt = 0; attempt < keyPool.length; attempt++) {
      const currentKey = keyPool[(startIndex + attempt) % keyPool.length];
      const maskedKey = `${currentKey.slice(0, 11)}...${currentKey.slice(-4)}`;

      try {
        const headers: Record<string, string> = {
          'Authorization': `Bearer ${currentKey}`,
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

          // If rate limit (429) or server error (5xx), attempt failover to next key in pool
          if ((res.status === 429 || res.status >= 500) && attempt < keyPool.length - 1) {
            console.warn(`[FishAudio Round-Robin Failover]: Key ${maskedKey} encountered ${errorDetail}. Failing over to next key...`);
            lastError = new Error(`Fish Audio TTS Failed (${res.status}): ${errorDetail}`);
            continue;
          }

          throw new Error(`Fish Audio TTS Failed (${res.status}): ${errorDetail}`);
        }

        return await res.arrayBuffer();
      } catch (err: any) {
        lastError = err;
        if (attempt < keyPool.length - 1) {
          console.warn(`[FishAudio Round-Robin Failover]: Network error on ${maskedKey}: ${err.message}. Retrying next key...`);
          continue;
        }
      }
    }

    throw lastError || new Error('Fish Audio TTS generation failed across all keys in the pool.');
  }

  /**
   * Query Fish Audio voice models cloud library with Round-Robin & Failover
   */
  public async fetchAvailableVoices(params?: {
    apiKey?: string;
    search?: string;
    language?: string;
    pageSize?: number;
  }): Promise<FishVoiceModel[]> {
    const keyPool = this.parseApiKeys(params?.apiKey);
    if (!keyPool.length) return CURATED_VOICES;

    const startIndex = this.keyRotationIndex % keyPool.length;
    this.keyRotationIndex = (this.keyRotationIndex + 1) % 1000000;

    for (let attempt = 0; attempt < keyPool.length; attempt++) {
      const currentKey = keyPool[(startIndex + attempt) % keyPool.length];
      try {
        const url = new URL(`${this.apiEndpoint}/model`);
        url.searchParams.set('page_size', String(params?.pageSize || 20));
        if (params?.language) url.searchParams.set('language', params.language);
        if (params?.search) url.searchParams.set('title', params.search);

        const res = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${currentKey}`,
          },
        });

        if (!res.ok) {
          if (attempt < keyPool.length - 1) continue;
          return CURATED_VOICES;
        }

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
        if (attempt < keyPool.length - 1) continue;
        console.warn('[FishAudioService] Could not fetch models from cloud, using curated list:', e);
        return CURATED_VOICES;
      }
    }

    return CURATED_VOICES;
  }
}

export const fishAudioService = new FishAudioService();
