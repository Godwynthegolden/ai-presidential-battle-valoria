/**
 * Kinetic Subtitle Engine & Semantic Word Classifier
 * 
 * High-impact MrBeast / Shorts style kinetic word-by-word subtitle processing
 * for Republic of Valoria debate broadcasts.
 * 
 * Features:
 * - Option 2 Web Audio Acoustic Peak & Voice Activity Gated reveals
 * - 5 Semantic Critical Word Category Classifiers (Money, Corruption, Danger, Constitution, Power)
 * - Calibrated speaking rate and pause duration weights
 */

import { Candidate } from '../types/candidate';
import { CANDIDATES, CANDIDATE_MAP } from '../data/candidates';

export type CriticalWordCategory = 
  | 'money'        // Radiant Gold: $40M, $20, BRIBE, TREASURY, BAILOUT, SLUSH, WARCHEST, etc.
  | 'espionage'    // Matrix Emerald: CCTV, WIRETAP, DOSSIER, SURVEILLANCE, TAPES, CLASSIFIED, LEAK, etc.
  | 'deception'    // Neon Fuchsia / Pink: LIES, LIAR, SHAM, HYPOCRITE, PROPAGANDA, PUPPET, PHONY, etc.
  | 'corruption'   // Blood Crimson / Red: CORRUPT, TREASON, TRAITOR, CABAL, EXTORTION, CARTEL, FELON, etc.
  | 'danger'       // Molten Lava / Orange: ELIMINATE, TERMINATE, DESTROY, CHOPPING BLOCK, FATAL, DOOMED, etc.
  | 'constitution' // Electric Cyan: CONSTITUTION, REPUBLIC, VALORIA, SOVEREIGN, VOTE, BALLOT, JUSTICE, etc.
  | 'power'        // Royal Amethyst / Purple: CHECKMATE, MASTERMIND, COMMAND, DICTATOR, RUTHLESS, VICTORY, etc.
  | 'none';

export interface CharacterTheme {
  candidateId: string;
  candidateName: string;
  matchedName: string;   // e.g. "ARTHUR" or "STERLING"
  colorHex: string;      // candidate.color.primary (e.g. "#ef4444")
  badgeBg: string;       // rgba(...)
  badgeBorder: string;   // rgba(...)
  textColor: string;     // color string
  ambientShadow: string; // rgba box-shadow
  glowShadow: string;    // rgba box-shadow
}

export interface KineticWordToken {
  index: number;
  original: string;       // Exact string with punctuation (e.g. "BRIBE,")
  cleanWord: string;      // Uppercase alphanumeric (e.g. "BRIBE")
  leadingSpace: boolean;
  category: CriticalWordCategory;
  isCritical: boolean;
  characterTheme?: CharacterTheme; // Set when token matches an in-the-lineup character's first or last name
  weight: number;         // Speaking duration weight
  startRatio: number;     // 0.0 to 1.0 start progress
  endRatio: number;       // 0.0 to 1.0 end progress
  startTime?: number;     // Expected start timestamp in seconds (when duration is available)
  endTime?: number;       // Expected end timestamp in seconds (when duration is available)
}

/**
 * Converts a hex color code to rgba() string with custom opacity
 */
export function hexToRgba(hex: string, alpha: number): string {
  if (!hex) return `rgba(255, 255, 255, ${alpha})`;
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  return `rgba(255, 255, 255, ${alpha})`;
}

/**
 * Creates a CharacterTheme object from candidate profile and matched name token
 */
export function createCharacterTheme(candidate: Candidate, matchedName: string): CharacterTheme {
  const hex = candidate.color?.primary || '#38bdf8';
  return {
    candidateId: candidate.id,
    candidateName: candidate.name,
    matchedName,
    colorHex: hex,
    badgeBg: hexToRgba(hex, 0.22),
    badgeBorder: hexToRgba(hex, 0.65),
    textColor: hex,
    ambientShadow: `0 0 10px ${hexToRgba(hex, 0.35)}`,
    glowShadow: `0 0 22px ${hexToRgba(hex, 0.85)}`,
  };
}

/**
 * Strips outer punctuation and apostrophe possessives ('s, ’s, ') to extract pure candidate name key
 */
export function extractNameKey(clean: string): string {
  return clean
    .replace(/^[^a-zA-Z0-9]+/, '')
    .replace(/[^a-zA-Z0-9]+$/, '')
    .replace(/['’]S$/i, '')
    .replace(/['’]$/, '')
    .replace(/[^a-zA-Z0-9]+$/, '')
    .toUpperCase();
}

export type LineupInput = Candidate[] | Map<string, Candidate> | string[] | null | undefined;

/**
 * Builds an uppercase name lookup map for in-the-lineup candidates (first names, last names, known aliases)
 */
export function buildCharacterNameMap(lineup?: LineupInput): Map<string, Candidate> {
  const nameMap = new Map<string, Candidate>();

  let candidateList: Candidate[] = [];
  if (Array.isArray(lineup)) {
    if (lineup.length > 0) {
      if (typeof lineup[0] === 'string') {
        candidateList = (lineup as string[])
          .map(id => CANDIDATE_MAP.get(id))
          .filter((c): c is Candidate => Boolean(c));
      } else {
        candidateList = lineup as Candidate[];
      }
    }
  } else if (lineup instanceof Map) {
    candidateList = Array.from(lineup.values());
  }

  // If no lineup provided, default to all candidates (e.g. for preview or tests)
  if (candidateList.length === 0 && (lineup === undefined || lineup === null)) {
    candidateList = CANDIDATES;
  }

  for (const c of candidateList) {
    if (!c || !c.name) continue;
    const parts = c.name.trim().split(/\s+/);
    if (parts.length > 0) {
      const first = parts[0].toUpperCase();
      nameMap.set(first, c);
      const last = parts[parts.length - 1].toUpperCase();
      if (!nameMap.has(last) || c.id === 'art-sterling') {
        nameMap.set(last, c);
      }
    }

    // Known aliases
    if (c.id === 'jax-alvarez') {
      nameMap.set('JAX', c);
    }
    if (c.id === 'art-sterling') {
      nameMap.set('ART', c);
    }
  }

  return nameMap;
}

// 1. Money & Bribes ($40M, $20, Bribe, Treasury, Slush Fund, Bailout)
const MONEY_PATTERN = /^\$?\d+([.,]\d+)?[kKmMbB%]?\$?$|^(\$\d+)/;
const MONEY_STEM = /^(BRIB|BAILOUT|BUYOUT|WARCHEST|SLUSH|AUCTION|RANSOM)/;
const MONEY_KEYWORDS = new Set([
  'BRIBE', 'BRIBES', 'BRIBED', 'BRIBING', 'BRIBERY',
  'MONEY', 'DOLLARS', 'DOLLAR', 'CASH', 'TREASURY',
  'BAILOUT', 'BAILOUTS', 'BUYOUT', 'BUYOUTS',
  'MILLION', 'MILLIONS', 'BILLION', 'BILLIONS',
  'ESCROW', 'FUNDING', 'BUDGET', 'FUNDS', 'PRICE',
  'WARCHEST', 'BANK', 'BANKS', 'ACCOUNTS', 'ASSETS', 'OFFSHORE',
  'FINANCE', 'FINANCIAL', 'PAYOFF', 'PAYOFFS', 'COLLATERAL', 'SLUSH',
  'DEFICIT', 'DIVIDENDS', 'OLIGARCH', 'OLIGARCHS', 'WEALTH', 'CURRENCY',
  'AUCTION', 'BID', 'BIDS', 'BOUNTY', 'RANSOM'
]);

// 2. Espionage & CCTV Leaks (CCTV, Wiretaps, Audio Tapes, Classified Dossiers)
const ESPIONAGE_STEM = /^(SURVEILL|WIRETAP|DOSSIER|INTERCEPT|EAVESDROP|BLACKMAIL|BACKROOM|CLOAKROOM)/;
const ESPIONAGE_KEYWORDS = new Set([
  'CCTV', 'CAMERA', 'CAMERAS', 'WIRETAP', 'WIRETAPS', 'WIRETAPPED', 'WIRETAPPING',
  'LEAK', 'LEAKS', 'LEAKED', 'LEAKING', 'DOSSIER', 'DOSSIERS',
  'SURVEILLANCE', 'SURVEIL', 'SURVEILLED', 'SPY', 'SPIES', 'SPYING',
  'AUDIO', 'TAPE', 'TAPES', 'RECORDING', 'RECORDINGS', 'RECORDED',
  'CLASSIFIED', 'BUGGED', 'INTERCEPT', 'INTERCEPTED', 'INTERCEPTING',
  'CLOAKROOM', 'BACKROOM', 'FOOTAGE', 'COVERT', 'BLACKMAIL', 'BLACKMAILED',
  'SECRET', 'SECRETS', 'EXPOSED', 'CAUGHT', 'EAVESDROP', 'EAVESDROPPING'
]);

// 3. Deception & Hypocrisy (Lies, Liar, Sham, Hypocrite, Puppet, Propaganda)
const DECEPTION_STEM = /^(HYPOCRI|DECEIV|DECEPT|PUPPET|FABRICAT|PROPAGAND)/;
const DECEPTION_KEYWORDS = new Set([
  'LIE', 'LIES', 'LIAR', 'LIARS', 'LYING',
  'SHAM', 'PHONY', 'PHONIES',
  'HYPOCRITE', 'HYPOCRITES', 'HYPOCRITICAL', 'HYPOCRISY',
  'PROPAGANDA', 'BLUFF', 'BLUFFING', 'BLUFFS',
  'FACADE', 'PUPPET', 'PUPPETS', 'PUPPETEER',
  'FAKE', 'FRAUD', 'FRAUDS', 'FRAUDULENT',
  'DECEIT', 'DECEIVE', 'DECEIVED', 'DECEIVING', 'DECEPTION',
  'SNAKE', 'SNAKES', 'COWARD', 'COWARDS', 'TWO-FACED',
  'HOAX', 'FABRICATE', 'FABRICATED', 'FABRICATION', 'DISGRACE'
]);

// 4. Corruption, High Treason & Cabals (Treason, Cartel, Extortion, Crime)
const CORRUPTION_STEM = /^(CORRUPT|TREASON|TRAITOR|BETRAY|EXTORT|COLLUD|IMPEACH|EMBEZZL|CONSPIR)/;
const CORRUPTION_KEYWORDS = new Set([
  'CORRUPT', 'CORRUPTION', 'CORRUPTED', 'CORRUPTING',
  'TREASON', 'TREASONOUS', 'TRAITOR', 'TRAITORS',
  'BETRAY', 'BETRAYAL', 'BETRAYED', 'BETRAYING', 'BETRAYER', 'BETRAYERS',
  'CABAL', 'CARTEL', 'CARTELS', 'SYNDICATE',
  'CRIME', 'CRIMINAL', 'CRIMINALS', 'FELON', 'FELONS', 'FELONY',
  'EXTORT', 'EXTORTION', 'EXTORTED', 'EXTORTING',
  'BACKSTAB', 'BACKSTABBING', 'BACKSTABBER',
  'THIEF', 'THIEVES', 'STEAL', 'STEALING', 'STOLEN',
  'COLLUSION', 'COLLUDE', 'COLLUDED', 'COLLUDING',
  'SUBPOENA', 'SUBPOENAS', 'SUBPOENAED',
  'IMPEACH', 'IMPEACHED', 'IMPEACHMENT',
  'EMBEZZLE', 'EMBEZZLED', 'EMBEZZLING', 'EMBEZZLEMENT',
  'CONSPIRACY', 'CONSPIRATOR', 'CONSPIRATORS', 'CONSPIRE',
  'DIRTY', 'GUILTY', 'GREED', 'SELLOUT'
]);

// 5. Danger, Elimination & Destruction (Eliminate, Terminate, Chopping Block)
const DANGER_STEM = /^(ELIMINAT|TERMINAT|DESTRUCT|EXECU|ANNIHILAT|FATAL|DOOMED|COLLAPS)/;
const DANGER_KEYWORDS = new Set([
  'ELIMINATE', 'ELIMINATED', 'ELIMINATES', 'ELIMINATING', 'ELIMINATION', 'ELIMINATIONS',
  'TERMINATE', 'TERMINATED', 'TERMINATES', 'TERMINATING', 'TERMINATION',
  'DESTROY', 'DESTROYED', 'DESTROYING', 'DESTRUCTION',
  'CRUSH', 'CRUSHED', 'CRUSHING',
  'CHOPPING', 'BLOCK', 'GUILLOTINE',
  'EXECUTE', 'EXECUTED', 'EXECUTING', 'EXECUTION', 'EXECUTIONER',
  'DEAD', 'DEATH', 'FATAL', 'FATALITY',
  'FALL', 'FALLEN', 'DOOMED', 'DOWNFALL', 'DISASTER',
  'COLLAPSE', 'COLLAPSED', 'COLLAPSING',
  'THREAT', 'THREATS', 'THREATEN', 'THREATENED',
  'TARGET', 'TARGETED', 'TARGETS',
  'ANNIHILATE', 'ANNIHILATED', 'ANNIHILATION',
  'PERISH', 'CASUALTY', 'CASUALTIES', 'LETHAL', 'GRAVE', 'EMERGENCY'
]);

// 6. Constitutional, Republic & Democracy (Valoria, Constitution, Sovereignty, Ballot)
const CONSTITUTION_STEM = /^(CONSTITUTION|SOVEREIGN|DEMOCRA|PRESIDEN|UNCONSTITUTION)/;
const CONSTITUTION_KEYWORDS = new Set([
  'CONSTITUTION', 'CONSTITUTIONAL', 'UNCONSTITUTIONAL', 'REPUBLIC', 'VALORIA', 'VALORIAN',
  'PRESIDENT', 'PRESIDENCY', 'PRESIDENTIAL',
  'SOVEREIGN', 'SOVEREIGNTY',
  'VOTE', 'VOTES', 'VOTED', 'VOTING', 'VOTER', 'VOTERS',
  'BALLOT', 'BALLOTS',
  'ALLIANCE', 'PACT', 'CONTRACT', 'DEAL', 'ACCORD',
  'MANDATE', 'DEMOCRACY', 'DEMOCRATIC', 'JUSTICE', 'VERDICT',
  'LAW', 'LAWS', 'SENATE', 'SENATOR', 'CHAMBER', 'TREATY',
  'CITIZEN', 'CITIZENS', 'INTEGRITY', 'LIBERTY', 'FREEDOM', 'OATH'
]);

// 7. Tactical Power & Calculations (Checkmate, Mastermind, Command, Dictator)
const POWER_STEM = /^(CHECKMATE|MASTERMIND|DICTAT|DOMINAT|CALCULAT|RUTHLESS|TRIUMPH)/;
const POWER_KEYWORDS = new Set([
  'POWER', 'POWERFUL', 'CHECKMATE',
  'CALCULATION', 'CALCULATIONS', 'CALCULATED', 'STRATEGY', 'STRATEGIC', 'TACTICAL', 'TACTICS',
  'SURVIVAL', 'SURVIVE', 'SURVIVES', 'SURVIVOR',
  'VICTORY', 'VICTORIOUS', 'TRIUMPH', 'TRIUMPHANT',
  'RUTHLESS', 'LEADERSHIP', 'MASTERMIND', 'ARCHITECT',
  'COMMAND', 'COMMANDER', 'COMMANDING', 'SUPREME', 'FORCE', 'STRONG',
  'DICTATOR', 'DICTATORSHIP', 'DOMINANCE', 'DOMINATE', 'DOMINATING', 'REIGN', 'CONQUER', 'OVERTHROW'
]);

/**
 * Clean a word token to test against critical keyword dictionaries
 */
export function cleanWordToken(raw: string): string {
  return raw
    .replace(/^[^a-zA-Z0-9$]+/, '')
    .replace(/[^a-zA-Z0-9$%]+$/, '')
    .toUpperCase();
}

/**
 * Classify a word token into one of the 7 semantic critical categories
 */
export function classifyWord(clean: string): CriticalWordCategory {
  if (!clean) return 'none';

  // 1. Money & Bribes ($40M, Bribe, Treasury, Bailout, Cash)
  if (clean.includes('$') || MONEY_PATTERN.test(clean) || MONEY_KEYWORDS.has(clean) || MONEY_STEM.test(clean)) {
    return 'money';
  }

  // 2. Espionage & CCTV Leaks (CCTV, Wiretaps, Audio Tapes, Dossiers, Backroom)
  if (ESPIONAGE_KEYWORDS.has(clean) || ESPIONAGE_STEM.test(clean)) {
    return 'espionage';
  }

  // 3. Deception & Hypocrisy (Lies, Sham, Hypocrite, Puppet, Phony)
  if (DECEPTION_KEYWORDS.has(clean) || DECEPTION_STEM.test(clean)) {
    return 'deception';
  }

  // 4. Corruption, High Treason & Cabals (Corrupt, Treason, Extortion, Cabal, Betrayal)
  if (CORRUPTION_KEYWORDS.has(clean) || CORRUPTION_STEM.test(clean)) {
    return 'corruption';
  }

  // 5. Danger, Elimination & Destruction (Eliminate, Terminate, Chopping Block)
  if (DANGER_KEYWORDS.has(clean) || DANGER_STEM.test(clean)) {
    return 'danger';
  }

  // 6. Constitutional, Republic & Democracy (Valoria, Constitution, Sovereignty, Ballot)
  if (CONSTITUTION_KEYWORDS.has(clean) || CONSTITUTION_STEM.test(clean)) {
    return 'constitution';
  }

  // 7. Tactical Power & Calculations (Checkmate, Mastermind, Command, Dictator)
  if (POWER_KEYWORDS.has(clean) || POWER_STEM.test(clean)) {
    return 'power';
  }

  return 'none';
}

/**
 * Styling presets for each critical category (Text Color, Background Pill, Border, Glow, Ambient Shadow)
 */
export const CATEGORY_STYLES: Record<CriticalWordCategory, {
  textColor: string;
  activeColor: string;
  badgeBg: string;
  badgeBorder: string;
  ambientShadow: string;
  glowShadow: string;
  accentHex: string;
  label: string;
}> = {
  money: {
    textColor: 'text-amber-300 font-black',
    activeColor: 'text-yellow-100',
    badgeBg: 'bg-amber-500/20',
    badgeBorder: 'border-amber-400/60',
    ambientShadow: 'shadow-[0_0_10px_rgba(251,191,36,0.35)]',
    glowShadow: 'shadow-[0_0_22px_rgba(251,191,36,0.85)]',
    accentHex: '#fbbf24',
    label: 'Finance / Bribe',
  },
  espionage: {
    textColor: 'text-emerald-300 font-black',
    activeColor: 'text-emerald-100',
    badgeBg: 'bg-emerald-500/20',
    badgeBorder: 'border-emerald-400/60',
    ambientShadow: 'shadow-[0_0_10px_rgba(16,185,129,0.35)]',
    glowShadow: 'shadow-[0_0_22px_rgba(16,185,129,0.85)]',
    accentHex: '#10b981',
    label: 'CCTV / Surveillance',
  },
  deception: {
    textColor: 'text-pink-300 font-black',
    activeColor: 'text-pink-100',
    badgeBg: 'bg-pink-500/20',
    badgeBorder: 'border-pink-400/60',
    ambientShadow: 'shadow-[0_0_10px_rgba(236,72,153,0.35)]',
    glowShadow: 'shadow-[0_0_22px_rgba(236,72,153,0.85)]',
    accentHex: '#ec4899',
    label: 'Deception / Hypocrisy',
  },
  corruption: {
    textColor: 'text-red-400 font-black',
    activeColor: 'text-red-100',
    badgeBg: 'bg-red-600/25',
    badgeBorder: 'border-red-500/70',
    ambientShadow: 'shadow-[0_0_10px_rgba(239,68,68,0.35)]',
    glowShadow: 'shadow-[0_0_22px_rgba(239,68,68,0.85)]',
    accentHex: '#ef4444',
    label: 'Corruption / Treason',
  },
  danger: {
    textColor: 'text-orange-300 font-black',
    activeColor: 'text-orange-100',
    badgeBg: 'bg-orange-500/25',
    badgeBorder: 'border-orange-500/60',
    ambientShadow: 'shadow-[0_0_10px_rgba(249,115,22,0.35)]',
    glowShadow: 'shadow-[0_0_22px_rgba(249,115,22,0.85)]',
    accentHex: '#f97316',
    label: 'Elimination / Danger',
  },
  constitution: {
    textColor: 'text-cyan-300 font-black',
    activeColor: 'text-cyan-100',
    badgeBg: 'bg-cyan-500/20',
    badgeBorder: 'border-cyan-400/60',
    ambientShadow: 'shadow-[0_0_10px_rgba(6,182,212,0.35)]',
    glowShadow: 'shadow-[0_0_22px_rgba(6,182,212,0.85)]',
    accentHex: '#06b6d4',
    label: 'Republic / Constitution',
  },
  power: {
    textColor: 'text-purple-300 font-black',
    activeColor: 'text-purple-100',
    badgeBg: 'bg-purple-500/25',
    badgeBorder: 'border-purple-400/60',
    ambientShadow: 'shadow-[0_0_10px_rgba(168,85,247,0.35)]',
    glowShadow: 'shadow-[0_0_22px_rgba(168,85,247,0.85)]',
    accentHex: '#a855f7',
    label: 'Tactical Checkmate',
  },
  none: {
    textColor: 'text-slate-100 font-semibold',
    activeColor: 'text-white font-extrabold',
    badgeBg: 'bg-transparent',
    badgeBorder: 'border-transparent',
    ambientShadow: '',
    glowShadow: 'shadow-[0_0_10px_rgba(255,255,255,0.4)]',
    accentHex: '#ffffff',
    label: 'Normal',
  },
};

/**
 * Tokenize speech text into KineticWordTokens with normalized duration weights
 * and in-the-lineup character name thematic glow detection
 */
export function tokenizeSpeech(
  text: string, 
  knownDuration?: number,
  lineup?: Map<string, Candidate> | LineupInput
): KineticWordToken[] {
  if (!text || !text.trim()) return [];

  // Clean outside decorative outer quotation marks if wrapped completely
  const cleanInput = text
    .replace(/^["'“‘]+/, '')
    .replace(/["'”’]+$/, '')
    .trim();

  // Split on whitespace while preserving word boundaries
  const rawSegments = cleanInput.split(/\s+/).filter(Boolean);
  if (rawSegments.length === 0) return [];

  const charMap = lineup instanceof Map 
    ? lineup 
    : buildCharacterNameMap(lineup);

  // 1. Calculate weights per word
  const unweightedTokens = rawSegments.map((original, index) => {
    const cleanWord = cleanWordToken(original);
    const nameKey = extractNameKey(cleanWord);

    // Check if word matches an in-the-lineup character's first or last name
    let characterTheme: CharacterTheme | undefined;
    if (charMap.has(nameKey)) {
      let matchedCandidate = charMap.get(nameKey)!;
      // Disambiguate shared surname "STERLING" if preceded by "VICTORIA"
      if (nameKey === 'STERLING' && index > 0) {
        const prevClean = cleanWordToken(rawSegments[index - 1]);
        if (extractNameKey(prevClean) === 'VICTORIA') {
          const victoria = Array.from(charMap.values()).find(c => c.name.toUpperCase().includes('VICTORIA'));
          if (victoria) matchedCandidate = victoria;
        }
      }
      characterTheme = createCharacterTheme(matchedCandidate, nameKey);
    }

    const category = characterTheme ? 'none' : classifyWord(cleanWord);
    const isCritical = Boolean(characterTheme) || category !== 'none';

    // Base weight by character length
    let weight = Math.max(1, cleanWord.length);

    // Extra weight / pause for punctuation
    if (/[.!?]$/.test(original)) {
      weight += 4.5; // End of sentence pause
    } else if (/[,;:—–-]$/.test(original)) {
      weight += 2.5; // Clause pause
    }

    // Critical words & character names are spoken with slightly more vocal emphasis
    if (isCritical) {
      weight += 1.5;
    }

    return {
      index,
      original,
      cleanWord,
      leadingSpace: index > 0,
      category,
      isCritical,
      characterTheme,
      weight,
    };
  });

  // 2. Normalize weights to 0.0 -> 1.0 startRatio and endRatio
  const totalWeight = unweightedTokens.reduce((sum, t) => sum + t.weight, 0);
  let accumulated = 0;
  const duration = knownDuration && knownDuration > 0 ? knownDuration : 0;

  return unweightedTokens.map(token => {
    const startRatio = accumulated / totalWeight;
    accumulated += token.weight;
    const endRatio = accumulated / totalWeight;

    return {
      ...token,
      startRatio,
      endRatio,
      startTime: duration > 0 ? startRatio * duration : undefined,
      endTime: duration > 0 ? endRatio * duration : undefined,
    };
  });
}

/**
 * Estimate spoken duration in seconds from token array (standard ~210 words per minute)
 */
export function estimateSpokenDurationSeconds(tokens: KineticWordToken[]): number {
  if (tokens.length === 0) return 0;
  // Average speaking rate: 210 WPM = 3.5 words/sec -> ~0.285s per word
  const baseSeconds = tokens.length * 0.285;
  // Minimum duration of 1.2s for short replies, maximum bound
  return Math.max(1.2, Math.min(30, baseSeconds));
}

/**
 * Find the currently active word index given current playback progress (0.0 to 1.0)
 */
export function getActiveWordIndex(tokens: KineticWordToken[], progress: number): number {
  if (tokens.length === 0) return -1;
  if (progress <= 0) return 0;
  if (progress >= 1) return tokens.length - 1;

  for (let i = 0; i < tokens.length; i++) {
    if (progress >= tokens[i].startRatio && progress <= tokens[i].endRatio) {
      return i;
    }
  }

  return tokens.length - 1;
}

/**
 * Calculate how many words have been revealed so far for progress (0.0 to 1.0)
 * Fallback linear estimator when audio analysis is disabled.
 */
export function getRevealedWordCount(tokens: KineticWordToken[], progress: number): number {
  if (tokens.length === 0) return 0;
  if (progress <= 0) return 0;
  if (progress >= 0.999) return tokens.length;

  for (let i = 0; i < tokens.length; i++) {
    if (progress < tokens[i].endRatio) {
      return i + 1;
    }
  }

  return tokens.length;
}

export interface AcousticGateInput {
  tokens: KineticWordToken[];
  currentTime: number;
  duration: number;
  isAudioReady: boolean;
  isVoiceActive: boolean;
  isPeak: boolean;
  progress: number;
  lastRevealedCount?: number;
}

/**
 * Option 2: Acoustic Peak & Voice Activity Gated Word Reveal Engine
 * 
 * - Pre-Audio Readiness Gate: Returns 0 words while audio is buffering (isAudioReady === false).
 * - Synchronizes with candidate's actual speaking cadence.
 * - Freezes word progression during candidate pauses, breaths, and dramatic silences.
 * - Failsafe catch-up: Releases word if audio passes beyond the token's expected window + 0.15s,
 *   preventing soft unvoiced consonants ('s', 't', 'p') from stalling.
 * - Guaranteed 100% completion when progress >= 0.999 or audio ends.
 */
export function getAcousticRevealedWordCount(input: AcousticGateInput): number {
  const {
    tokens,
    currentTime,
    duration,
    isAudioReady,
    isVoiceActive,
    isPeak,
    progress,
    lastRevealedCount = 0,
  } = input;

  if (tokens.length === 0) return 0;

  // 1. Pre-Audio Readiness Gate: Hold clean/empty box during MP3 buffering
  if (!isAudioReady && currentTime <= 0.05) {
    return 0;
  }

  // 2. Audio finished: Reveal all words completely
  if (progress >= 0.999 || (duration > 0 && currentTime >= duration - 0.05)) {
    return tokens.length;
  }

  let count = lastRevealedCount;

  // Check each subsequent unrevealed word
  for (let i = lastRevealedCount; i < tokens.length; i++) {
    const token = tokens[i];
    const tokenStartSec = duration > 0 ? token.startRatio * duration : (token.startRatio * estimateSpokenDurationSeconds(tokens));
    const tokenEndSec = duration > 0 ? token.endRatio * duration : (token.endRatio * estimateSpokenDurationSeconds(tokens));

    // If playback has not reached this word's start time, stop
    if (currentTime < tokenStartSec) {
      break;
    }

    // Voice Activity & Peak Gating:
    // Word is uttered if:
    // - Candidate is vocalizing (isVoiceActive)
    // - Or an acoustic peak / syllable burst occurred (isPeak)
    // - Or failsafe delay has elapsed (currentTime >= tokenEndSec + 0.15s)
    // - Or it's the very first word and audio is actively playing
    const isFirstWord = i === 0 && (currentTime > 0.04 || isVoiceActive);
    const isFailsafe = currentTime >= (tokenEndSec + 0.8);
    const isAcousticBurst = isVoiceActive || isPeak;

    if (isFirstWord || isAcousticBurst || isFailsafe) {
      count = i + 1;
    } else {
      // Candidate paused to breathe: FREEZE word progression here
      break;
    }
  }

  return Math.max(lastRevealedCount, Math.min(tokens.length, count));
}
