import { Candidate } from './candidate';

export type GamePhase = 
  | 'IDLE'             // Before starting
  | 'CAMPAIGN'         // Round 1 speeches
  | 'ATTACK'           // Candidate attacks another
  | 'CCTV_BACKROOM'    // Leaked surveillance feed of secret backroom pacts
  | 'VOTE_SECRET'      // Secret voting process
  | 'VOTE_REVEAL'      // Dramatic reveal of votes & betrayal highlights
  | 'ELIMINATION'      // Announcing eliminated candidate + last words
  | 'FINAL_SPEECHES'   // Top 3 candidates final appeal
  | 'FINAL_VOTE'       // Grand Jury vote for the winner
  | 'FINAL_REVEAL'     // Dramatic reveal of final jury votes
  | 'WINNER';          // President declared + victory speech

export interface SpeechEvent {
  id: string;
  candidateId: string;
  phase: 'campaign' | 'final_speech' | 'victory' | 'exit';
  round: number;
  text: string;
  timestamp: number;
}

export interface AttackEvent {
  id: string;
  round: number;
  attackerId: string;
  targetId: string;
  text: string;
  timestamp: number;
}

export interface BackroomPact {
  id: string;
  round: number;
  proposerId: string;
  receiverId: string;
  agreedTargetId: string;
  whisperText: string;
  location: string;
  audioBlobUrl?: string | null;
  wasBetrayedByProposer?: boolean;
  wasBetrayedByReceiver?: boolean;
  timestamp: number;
  // Dollars Currency Bribe Fields
  bribeOffered?: boolean;      // True if proposer offered $20 bribe
  bribeAmount?: number;        // e.g. $20
  receiverDecision?: 'accept' | 'decline' | 'accept_and_betray'; // Receiver's AI choice
  bribeAccepted?: boolean;     // True if $20 transferred
}

export interface VoteRecord {
  voterId: string;
  targetId: string;
  reason?: string;
  // Alliance & Betrayal tracking
  pactWithId?: string;       // Ally they plotted with, if any
  pactTargetId?: string;     // Target agreed in pact
  isBetrayal?: boolean;      // True if broke the pact or voted for ally
  betrayedAllyId?: string;   // Who was betrayed
  isHonoredPact?: boolean;   // True if they kept the pact
}

export interface BailoutTransaction {
  id: string;
  candidateId: string;
  round: number;
  cost: number;             // $40 per vote
  votesRemoved: number;     // 1 vote removed
  initialVotes: number;
  remainingVotes: number;
  remainingBudget: number;
  timestamp: number;
}

export interface RoundVoteTally {
  round: number;
  votes: VoteRecord[];
  initialTally?: Record<string, number>;        // Raw vote count before bailout auction
  tally: Record<string, number>;               // Final vote count after bailout auction
  initialBudgets?: Record<string, number>;      // Candidate treasury balances going into the vote (before bailouts)
  eliminatedId: string | null;
  tieBreakerOccurred?: boolean;
  betrayalsCount?: number;
  bailoutTransactions?: BailoutTransaction[];  // Sequential $40 buyouts in this round
}

export interface EliminatedCandidateInfo {
  candidateId: string;
  eliminatedInRound: number;
  voteCount: number;
  exitWords: string;
}

export interface GameState {
  phase: GamePhase;
  round: number;
  participatingCandidateIds: string[]; // Candidates chosen to participate in this election
  activeCandidateIds: string[];        // Remaining alive candidates in current round
  eliminatedCandidates: EliminatedCandidateInfo[];
  candidateBudgets: Record<string, number>; // Live dollar currency balance: candidateId -> amount
  currentSpeakerIndex: number;
  
  electionTopic?: string;              // Current national debate crisis/question for this election

  // History collections
  campaignSpeeches: Record<string, string>; // candidateId -> text
  finalSpeeches: Record<string, string>;    // candidateId -> text
  attacksByRound: Record<number, AttackEvent[]>;
  pactsByRound: Record<number, BackroomPact[]>;
  votesByRound: Record<number, RoundVoteTally>;
  finalVoteTally: RoundVoteTally | null;
  victorySpeech: string | null;
  winnerId: string | null;
  
  // Active Stage Presentation
  stage: {
    speakerId: string | null;
    targetId: string | null;
    actionType: 'speech' | 'attack' | 'pact' | 'vote' | 'eliminated' | 'winner' | 'idle';
    headline: string;
    content: string;
    isLoading: boolean;
    isRevealingVotes: boolean;
    revealedVoteIndex: number;
    error: string | null;
  };
  
  // Control settings
  playback: {
    autoPlay: boolean;
    speed: 'slow' | 'normal' | 'fast'; // slow: 4s, normal: 2.5s, fast: 1s
    soundEnabled: boolean;
    isPaused: boolean;
  };
  
  // Live Event Log
  tickerLog: Array<{
    id: string;
    type: 'speech' | 'attack' | 'pact' | 'vote' | 'betrayal' | 'elimination' | 'bribe' | 'bailout' | 'system' | 'winner';
    message: string;
    timestamp: number;
  }>;
}

export type LLMActionType = 
  | 'campaign_speech'
  | 'attack'
  | 'backroom_pact'
  | 'elimination_vote'
  | 'exit_words'
  | 'final_speech'
  | 'final_vote'
  | 'victory_speech'
  | 'generate_character';

export interface PrecedingSpeechContext {
  candidateId: string;
  candidateName: string;
  titleRole: string;
  speech: string;
}

export interface LLMRequestPayload {
  action: LLMActionType;
  candidateId: string;
  candidate?: Candidate; // Full candidate object if custom/dynamic
  allCandidates?: Candidate[]; // All dynamic election candidates
  targetId?: string;
  round: number;
  activeCandidateIds: string[];
  finalistIds?: string[];
  customPrompt?: string; // Optional custom character prompt description
  historyContext: {
    electionTopic?: string;
    campaignSpeeches?: Record<string, string>;
    precedingSpeeches?: PrecedingSpeechContext[];
    targetSpeechQuote?: string;
    targetWeaknesses?: string[];
    targetRole?: string;
    targetSlogan?: string;
    recentAttacks?: Array<{ attackerName: string; targetName: string; text: string }>;
    recentEliminations?: Array<{ candidateName: string; round: number }>;
    eliminatedCandidatesSummary?: Array<{ candidateName: string; candidateId: string; round: number; exitWords?: string }>;
    activePact?: { allyId: string; agreedTargetId: string };
    betrayalContext?: { 
      wasBetrayed: boolean; 
      betrayedByCandidateName?: string; 
      brokenPactTargetName?: string;
      voteCountAgainstSelf?: number;
    };
    finalistRecords?: Array<{ 
      candidateName: string; 
      candidateId: string; 
      titleRole: string; 
      ideology: string; 
      speechSummary?: string; 
    }>;
    allClashesSummary?: string[];
    previousVotesAgainstSelf?: number;
    proposerBudget?: number;
    receiverBudget?: number;
    bribeBetrayals?: Array<{
      betrayerId: string;
      betrayerName: string;
      victimId: string;
      victimName: string;
      bribeAmount: number;
    }>;
  };
  config?: {
    baseUrl?: string;
    apiKey?: string;
    model?: string;
  };
}

export interface LLMResponsePayload {
  text: string;
  voteTargetId?: string;
  agreedTargetId?: string;
  whisperText?: string;
  privateReason?: string;
  candidateProfile?: Partial<Candidate>;
  modelUsed?: string;
  // Bribe Fields
  bribeOffered?: boolean;
  bribeAmount?: number;
  receiverDecision?: 'accept' | 'decline' | 'accept_and_betray';
  bribeAccepted?: boolean;
}

export type StageActionType = 'speech' | 'attack' | 'pact' | 'vote' | 'eliminated' | 'winner' | 'idle';

export interface StepDescriptor {
  stepKey: string;
  phase: GamePhase;
  round: number;
  speakerId: string | null;
  targetId: string | null;
  actionType: StageActionType;
  headline: string;
  llmPayload?: LLMRequestPayload;
}

