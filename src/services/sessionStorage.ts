import fs from 'fs';
import path from 'path';
import { Candidate } from '@/types/candidate';

export interface SessionManifest {
  sessionName: string;
  originalName: string;
  createdAt: string;
  completedAt?: string;
  status: 'in_progress' | 'completed' | 'aborted';
  topic: string;
  candidatesCount: number;
  candidates: Array<{
    id: string;
    name: string;
    codename: string;
    archetype: string;
    titleRole: string;
    slogan: string;
    initialBudget: number;
  }>;
  winner?: {
    candidateId: string;
    candidateName: string;
    victorySpeech?: string;
  };
  summaryStats: {
    totalRounds: number;
    totalCampaignSpeeches: number;
    totalAttacks: number;
    totalCctvPacts: number;
    totalBribesOffered: number;
    totalBribesAccepted: number;
    totalBribesBetrayed: number;
    totalBailoutTransactions: number;
    totalDollarsSpentOnBailouts: number;
    totalEliminations: number;
  };
}

export interface AudioIndexEntry {
  filename: string;
  phase: string;
  round?: number;
  speakerId?: string;
  speakerName?: string;
  targetId?: string;
  targetName?: string;
  textSnippet?: string;
  sizeBytes: number;
  timestamp: number;
}

export function sanitizeSessionName(name: string): string {
  if (!name || typeof name !== 'string') return 'session';
  // Replace illegal filename characters on Windows/Unix with underscore
  let sanitized = name
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, '-');
  
  // Remove leading/trailing dots or spaces that cause issues on Windows NTFS
  sanitized = sanitized.replace(/^[. ]+|[. ]+$/g, '');
  if (!sanitized) sanitized = 'session';
  return sanitized.slice(0, 80);
}

export class SessionStorageService {
  private baseDir: string;

  constructor() {
    this.baseDir = path.join(process.cwd(), 'saved-games');
  }

  public getSessionDir(sessionName: string): string {
    const safeName = sanitizeSessionName(sessionName);
    return path.join(this.baseDir, safeName);
  }

  /**
   * Initialize a new saved game session directory structure
   */
  public async initSession(
    sessionName: string,
    data: {
      topic?: string;
      candidates: Candidate[];
      timestamp?: number;
    }
  ): Promise<{ success: boolean; sessionDir: string; safeName: string }> {
    const safeName = sanitizeSessionName(sessionName);
    const sessionDir = path.join(this.baseDir, safeName);
    const audioDir = path.join(sessionDir, 'audio');
    const roundsDir = path.join(sessionDir, 'rounds');

    // Create base directories recursively
    await fs.promises.mkdir(sessionDir, { recursive: true });
    await fs.promises.mkdir(audioDir, { recursive: true });
    await fs.promises.mkdir(roundsDir, { recursive: true });

    const topic = data.topic || 'National Presidential Election Debate';
    const createdAt = new Date(data.timestamp || Date.now()).toISOString();

    // Create session_manifest.json
    const manifest: SessionManifest = {
      sessionName: safeName,
      originalName: sessionName,
      createdAt,
      status: 'in_progress',
      topic,
      candidatesCount: data.candidates.length,
      candidates: data.candidates.map(c => ({
        id: c.id,
        name: c.name,
        codename: c.codename,
        archetype: c.archetype,
        titleRole: c.titleRole,
        slogan: c.slogan,
        initialBudget: typeof c.initialBudget === 'number' ? c.initialBudget : 100,
      })),
      summaryStats: {
        totalRounds: 1,
        totalCampaignSpeeches: 0,
        totalAttacks: 0,
        totalCctvPacts: 0,
        totalBribesOffered: 0,
        totalBribesAccepted: 0,
        totalBribesBetrayed: 0,
        totalBailoutTransactions: 0,
        totalDollarsSpentOnBailouts: 0,
        totalEliminations: 0,
      },
    };

    await fs.promises.writeFile(
      path.join(sessionDir, 'session_manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf8'
    );

    // Initialize session_events.json
    await fs.promises.writeFile(
      path.join(sessionDir, 'session_events.json'),
      JSON.stringify([], null, 2),
      'utf8'
    );

    // Initialize audio/audio_index.json
    await fs.promises.writeFile(
      path.join(audioDir, 'audio_index.json'),
      JSON.stringify([], null, 2),
      'utf8'
    );

    // Initialize readable transcript.md
    const markdownLines = [
      `# 🏛️ Republic of Valoria: Presidential Election Battle`,
      ``,
      `- **Session Name:** \`${sessionName}\``,
      `- **Recorded Date:** ${new Date().toLocaleString()}`,
      `- **National Crisis Topic:** *${topic}*`,
      `- **Registered Candidates:** ${data.candidates.length}`,
      ``,
      `---`,
      ``,
      `## 👥 Registered Candidate Roster`,
      ``,
      ...data.candidates.map((c, i) => 
        `${i + 1}. **${c.name}** (*${c.titleRole}*) — \`$${typeof c.initialBudget === 'number' ? c.initialBudget : 100}\` Treasury\n   - Slogan: *"${c.slogan}"*\n   - Ideology: ${c.ideology}`
      ),
      ``,
      `---`,
      ``,
      `## 🎙️ Live Broadcast Transcript & Timeline`,
      ``,
    ];

    await fs.promises.writeFile(
      path.join(sessionDir, 'transcript.md'),
      markdownLines.join('\n'),
      'utf8'
    );

    return { success: true, sessionDir, safeName };
  }

  /**
   * Record a debate event in real time (campaign speech, attack, CCTV pact, vote reveal, bailout, elimination, etc.)
   */
  public async saveEvent(
    sessionName: string,
    eventData: {
      type: 'campaign_speech' | 'attack' | 'cctv_pact' | 'vote_tally' | 'elimination' | 'final_speech' | 'final_vote' | 'winner' | 'system';
      round?: number;
      speakerId?: string;
      speakerName?: string;
      targetId?: string;
      targetName?: string;
      headline?: string;
      content?: string;
      details?: any;
      timestamp?: number;
    }
  ): Promise<{ success: boolean }> {
    const safeName = sanitizeSessionName(sessionName);
    const sessionDir = path.join(this.baseDir, safeName);

    if (!fs.existsSync(sessionDir)) {
      return { success: false };
    }

    const timestamp = eventData.timestamp || Date.now();
    const round = eventData.round || 1;
    const roundFolder = round === 99 || eventData.type === 'final_speech' || eventData.type === 'final_vote' || eventData.type === 'winner'
      ? 'final_round'
      : `round_${String(round).padStart(2, '0')}`;
    
    const roundDirPath = path.join(sessionDir, 'rounds', roundFolder);
    if (!fs.existsSync(roundDirPath)) {
      await fs.promises.mkdir(roundDirPath, { recursive: true });
    }

    // 1. Append to session_events.json
    const eventsPath = path.join(sessionDir, 'session_events.json');
    let events: any[] = [];
    try {
      if (fs.existsSync(eventsPath)) {
        const raw = await fs.promises.readFile(eventsPath, 'utf8');
        events = JSON.parse(raw);
      }
    } catch {}
    
    events.push({
      id: `evt-${events.length + 1}`,
      ...eventData,
      timestamp,
    });

    await fs.promises.writeFile(eventsPath, JSON.stringify(events, null, 2), 'utf8');

    // 2. Append to round-specific structured JSON file
    try {
      let roundFileName = '01_events.json';
      if (eventData.type === 'campaign_speech') roundFileName = '01_campaign_speeches.json';
      else if (eventData.type === 'attack') roundFileName = '02_attacks.json';
      else if (eventData.type === 'cctv_pact') roundFileName = '03_cctv_pacts.json';
      else if (eventData.type === 'vote_tally') roundFileName = '04_voting_and_bailouts.json';
      else if (eventData.type === 'elimination') roundFileName = '05_elimination.json';
      else if (eventData.type === 'final_speech') roundFileName = '01_final_speeches.json';
      else if (eventData.type === 'final_vote') roundFileName = '02_grand_jury_votes.json';
      else if (eventData.type === 'winner') roundFileName = '03_presidential_inauguration.json';

      const roundFilePath = path.join(roundDirPath, roundFileName);
      let roundEvents: any[] = [];
      if (fs.existsSync(roundFilePath)) {
        try {
          const raw = await fs.promises.readFile(roundFilePath, 'utf8');
          roundEvents = JSON.parse(raw);
        } catch {}
      }
      roundEvents.push(eventData);
      await fs.promises.writeFile(roundFilePath, JSON.stringify(roundEvents, null, 2), 'utf8');
    } catch (err) {
      console.warn('[SessionStorage saveEvent round file warning]:', err);
    }

    // 3. Update summary stats in session_manifest.json
    try {
      const manifestPath = path.join(sessionDir, 'session_manifest.json');
      if (fs.existsSync(manifestPath)) {
        const raw = await fs.promises.readFile(manifestPath, 'utf8');
        const manifest: SessionManifest = JSON.parse(raw);
        manifest.summaryStats.totalRounds = Math.max(manifest.summaryStats.totalRounds, round);

        if (eventData.type === 'campaign_speech') manifest.summaryStats.totalCampaignSpeeches++;
        if (eventData.type === 'attack') manifest.summaryStats.totalAttacks++;
        if (eventData.type === 'cctv_pact') {
          manifest.summaryStats.totalCctvPacts++;
          if (eventData.details?.bribeOffered) manifest.summaryStats.totalBribesOffered++;
          if (eventData.details?.receiverDecision === 'accept') manifest.summaryStats.totalBribesAccepted++;
          if (eventData.details?.receiverDecision === 'accept_and_betray') manifest.summaryStats.totalBribesBetrayed++;
        }
        if (eventData.type === 'vote_tally' && Array.isArray(eventData.details?.bailoutTransactions)) {
          manifest.summaryStats.totalBailoutTransactions += eventData.details.bailoutTransactions.length;
          manifest.summaryStats.totalDollarsSpentOnBailouts += eventData.details.bailoutTransactions.length * 40;
        }
        if (eventData.type === 'elimination') manifest.summaryStats.totalEliminations++;

        await fs.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
      }
    } catch (err) {
      console.warn('[SessionStorage update manifest stats warning]:', err);
    }

    // 4. Append Markdown block to transcript.md
    try {
      const transcriptPath = path.join(sessionDir, 'transcript.md');
      const mdSnippet = this.formatEventAsMarkdown(eventData);
      if (mdSnippet) {
        await fs.promises.appendFile(transcriptPath, `\n${mdSnippet}\n`, 'utf8');
      }
    } catch (err) {
      console.warn('[SessionStorage append transcript markdown warning]:', err);
    }

    return { success: true };
  }

  /**
   * Save a binary MP3 speech audio buffer to the session's audio/ folder
   */
  public async saveAudio(
    sessionName: string,
    filename: string,
    audioBuffer: Buffer,
    metadata?: Partial<AudioIndexEntry>
  ): Promise<{ success: boolean; filePath: string }> {
    const safeName = sanitizeSessionName(sessionName);
    const sessionDir = path.join(this.baseDir, safeName);
    const audioDir = path.join(sessionDir, 'audio');

    if (!fs.existsSync(audioDir)) {
      await fs.promises.mkdir(audioDir, { recursive: true });
    }

    let safeFilename = filename.endsWith('.mp3') ? filename : `${filename}.mp3`;
    safeFilename = safeFilename.replace(/[<>:"/\\|?*]/g, '_');
    const filePath = path.join(audioDir, safeFilename);

    await fs.promises.writeFile(filePath, audioBuffer);

    // Update audio/audio_index.json
    try {
      const indexPath = path.join(audioDir, 'audio_index.json');
      let index: AudioIndexEntry[] = [];
      if (fs.existsSync(indexPath)) {
        try {
          const raw = await fs.promises.readFile(indexPath, 'utf8');
          index = JSON.parse(raw);
        } catch {}
      }

      index.push({
        filename: safeFilename,
        phase: metadata?.phase || 'unknown',
        round: metadata?.round,
        speakerId: metadata?.speakerId,
        speakerName: metadata?.speakerName,
        targetId: metadata?.targetId,
        targetName: metadata?.targetName,
        textSnippet: metadata?.textSnippet,
        sizeBytes: audioBuffer.length,
        timestamp: Date.now(),
      });

      await fs.promises.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf8');
    } catch (err) {
      console.warn('[SessionStorage update audio index warning]:', err);
    }

    return { success: true, filePath };
  }

  /**
   * Complete the session and record the presidential victor
   */
  public async finishSession(
    sessionName: string,
    data: {
      winnerId: string;
      winnerName: string;
      victorySpeech?: string;
    }
  ): Promise<{ success: boolean }> {
    const safeName = sanitizeSessionName(sessionName);
    const sessionDir = path.join(this.baseDir, safeName);
    const manifestPath = path.join(sessionDir, 'session_manifest.json');
    const transcriptPath = path.join(sessionDir, 'transcript.md');

    if (!fs.existsSync(sessionDir)) {
      return { success: false };
    }

    try {
      if (fs.existsSync(manifestPath)) {
        const raw = await fs.promises.readFile(manifestPath, 'utf8');
        const manifest: SessionManifest = JSON.parse(raw);
        manifest.status = 'completed';
        manifest.completedAt = new Date().toISOString();
        manifest.winner = {
          candidateId: data.winnerId,
          candidateName: data.winnerName,
          victorySpeech: data.victorySpeech,
        };
        await fs.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
      }

      const finishMarkdown = [
        ``,
        `---`,
        ``,
        `# 👑 Presidential Victor of Valoria`,
        ``,
        `**Congratulations to President ${data.winnerName}!**`,
        ``,
        data.victorySpeech ? `> "${data.victorySpeech}"` : '',
        ``,
        `*Session completed successfully on ${new Date().toLocaleString()}.*`,
        ``,
      ].join('\n');

      await fs.promises.appendFile(transcriptPath, finishMarkdown, 'utf8');
      return { success: true };
    } catch (err) {
      console.error('[SessionStorage finishSession error]:', err);
      return { success: false };
    }
  }

  /**
   * Convert debate event to clean Markdown format
   */
  private formatEventAsMarkdown(eventData: any): string {
    const { type, round, speakerName, targetName, content, details } = eventData;

    switch (type) {
      case 'campaign_speech':
        return `### 🎤 Round 1: Campaign Address — **${speakerName || 'Candidate'}**\n\n> "${content}"\n`;

      case 'attack':
        const rebuttalTag = details?.isRebuttal ? ' *(Rebuttal)*' : '';
        const voteCallTag = details?.voteCallTargetName ? `\n\n🎯 **Called on room to vote out:** *${details.voteCallTargetName}*` : '';
        return `### ⚔️ Round ${round} Clash: **${speakerName}** vs **${targetName}**${rebuttalTag}\n\n**${speakerName}:** "${content}"${voteCallTag}\n`;

      case 'cctv_pact':
        const decisionText = details?.receiverDecision === 'accept'
          ? '🤝 **ACCEPTED** ($20 transferred)'
          : details?.receiverDecision === 'accept_and_betray'
          ? '⚠️ **ACCEPTED & PLANNED BETRAYAL** (Pocketed $20)'
          : '❌ **DECLINED**';
        
        return [
          `### 📹 Round ${round} CCTV Surveillance Feed: *${details?.location || 'Backroom'}*`,
          `- **Proposer:** ${speakerName}`,
          `- **Receiver:** ${targetName}`,
          `- **Agreed Mutual Target:** ${details?.agreedTargetName || 'Undecided'}`,
          `- **Pact Decision:** ${decisionText}`,
          details?.whisperText ? `- **Whisper Dialogue:** *"${details.whisperText}"*` : '',
          details?.privateStrategy ? `- **Private Tactical Memo:** *"${details.privateStrategy}"*` : '',
        ].filter(Boolean).join('\n') + '\n';

      case 'vote_tally':
        const votesList = Array.isArray(details?.votes)
          ? details.votes.map((v: any) => {
              const pactTag = v.isBetrayal ? ' ⚠️ *(Pact Betrayed!)*' : v.isHonoredPact ? ' 🤝 *(Pact Honored)*' : '';
              return `  - **${v.voterName}** voted for **${v.targetName}**${pactTag}${v.reason ? ` — *"${v.reason}"*` : ''}`;
            }).join('\n')
          : '';

        const bailoutsList = Array.isArray(details?.bailoutTransactions) && details.bailoutTransactions.length > 0
          ? `\n\n**💰 $40 Treasury Vote Bailout Transactions:**\n` + details.bailoutTransactions.map((b: any, i: number) => 
              `  ${i + 1}. **${b.candidateName}** paid **$40** to remove 1 vote (Votes: ${b.initialVotes} → ${b.remainingVotes}, Treasury: $${b.remainingBudget})`
            ).join('\n')
          : '';

        const elimText = details?.eliminatedName
          ? `\n\n💀 **Eliminated Contender:** **${details.eliminatedName}** (${details.finalVoteCount || 0} votes)`
          : '';

        return `### 🗳️ Round ${round} Secret Ballots & Bailout Auction\n\n**Votes Cast:**\n${votesList}${bailoutsList}${elimText}\n`;

      case 'elimination':
        return `### 💀 Round ${round} Concession Address — **${speakerName}**\n\n> "${content}"\n`;

      case 'final_speech':
        return `### 🏆 Top 3 Presidential Appeal — **${speakerName}**\n\n> "${content}"\n`;

      case 'final_vote':
        const juryList = Array.isArray(details?.votes)
          ? details.votes.map((v: any) => `  - **${v.voterName}** voted for **${v.targetName}**`).join('\n')
          : '';
        return `### ⚖️ Grand Jury Presidential Ballot\n\n${juryList}\n`;

      case 'winner':
        return `### 👑 Presidential Inauguration Address — **President ${speakerName}**\n\n> "${content}"\n`;

      default:
        return '';
    }
  }

  /**
   * List all saved debate sessions available on disk
   */
  public async listSessions(): Promise<Array<{
    sessionName: string;
    createdAt: string;
    completedAt?: string;
    status: string;
    topic: string;
    candidatesCount: number;
    eventsCount: number;
    audioCount: number;
  }>> {
    try {
      if (!fs.existsSync(this.baseDir)) {
        return [];
      }

      const entries = await fs.promises.readdir(this.baseDir, { withFileTypes: true });
      const sessionDirs = entries.filter(e => e.isDirectory()).map(e => e.name);
      const results: any[] = [];

      for (const dirName of sessionDirs) {
        const sessionDir = path.join(this.baseDir, dirName);
        const manifestPath = path.join(sessionDir, 'session_manifest.json');
        
        if (fs.existsSync(manifestPath)) {
          try {
            const raw = await fs.promises.readFile(manifestPath, 'utf8');
            const manifest: SessionManifest = JSON.parse(raw);
            
            // Count events
            let eventsCount = 0;
            const eventsPath = path.join(sessionDir, 'session_events.json');
            if (fs.existsSync(eventsPath)) {
              try {
                const eventsRaw = await fs.promises.readFile(eventsPath, 'utf8');
                eventsCount = JSON.parse(eventsRaw).length;
              } catch {}
            }

            // Count audio files
            let audioCount = 0;
            const audioIndexPath = path.join(sessionDir, 'audio', 'audio_index.json');
            if (fs.existsSync(audioIndexPath)) {
              try {
                const audioRaw = await fs.promises.readFile(audioIndexPath, 'utf8');
                audioCount = JSON.parse(audioRaw).length;
              } catch {}
            }

            results.push({
              sessionName: manifest.sessionName || dirName,
              createdAt: manifest.createdAt,
              completedAt: manifest.completedAt,
              status: manifest.status,
              topic: manifest.topic,
              candidatesCount: manifest.candidatesCount || manifest.candidates?.length || 0,
              eventsCount,
              audioCount,
            });
          } catch {}
        }
      }

      // Sort newest first
      return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      console.error('[SessionStorage listSessions error]:', err);
      return [];
    }
  }

  /**
   * Load complete structured session details for replay or video rendering
   */
  public async loadSession(sessionName: string): Promise<{
    success: boolean;
    manifest?: SessionManifest;
    events?: any[];
    audioIndex?: AudioIndexEntry[];
    error?: string;
  }> {
    const safeName = sanitizeSessionName(sessionName);
    const sessionDir = path.join(this.baseDir, safeName);

    if (!fs.existsSync(sessionDir)) {
      return { success: false, error: `Session "${sessionName}" not found.` };
    }

    try {
      const manifestPath = path.join(sessionDir, 'session_manifest.json');
      const eventsPath = path.join(sessionDir, 'session_events.json');
      const audioIndexPath = path.join(sessionDir, 'audio', 'audio_index.json');

      let manifest: SessionManifest | undefined;
      let events: any[] = [];
      let audioIndex: AudioIndexEntry[] = [];

      if (fs.existsSync(manifestPath)) {
        const raw = await fs.promises.readFile(manifestPath, 'utf8');
        manifest = JSON.parse(raw);
      }

      if (fs.existsSync(eventsPath)) {
        const raw = await fs.promises.readFile(eventsPath, 'utf8');
        events = JSON.parse(raw);
      }

      if (fs.existsSync(audioIndexPath)) {
        const raw = await fs.promises.readFile(audioIndexPath, 'utf8');
        audioIndex = JSON.parse(raw);
      }

      // Check if rounds/ directory exists and can reconstruct full canonical event timeline
      const roundsDir = path.join(sessionDir, 'rounds');
      if (fs.existsSync(roundsDir)) {
        const reconstructed = await this.reconstructEventsFromRounds(sessionDir);
        if (reconstructed.length > 0 && reconstructed.length >= events.length) {
          events = reconstructed;
          // Persist the repaired canonical events list to disk
          try {
            await fs.promises.writeFile(eventsPath, JSON.stringify(events, null, 2), 'utf8');
          } catch {}
        }
      }

      // Check if audio index is incomplete compared to mp3 files on disk
      const audioDir = path.join(sessionDir, 'audio');
      if (fs.existsSync(audioDir)) {
        try {
          const mp3s = (await fs.promises.readdir(audioDir)).filter(f => f.endsWith('.mp3'));
          if (mp3s.length > audioIndex.length) {
            const reconstructedAudio = await this.reconstructAudioIndexFromFiles(sessionDir);
            if (reconstructedAudio.length > 0) {
              audioIndex = reconstructedAudio;
            }
          }
        } catch {}
      }

      return {
        success: true,
        manifest,
        events,
        audioIndex,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to load session data.' };
    }
  }

  /**
   * Reconstruct complete canonical events timeline from round folders in numerical order
   */
  public async reconstructEventsFromRounds(sessionDir: string): Promise<any[]> {
    const roundsDir = path.join(sessionDir, 'rounds');
    if (!fs.existsSync(roundsDir)) {
      return [];
    }

    try {
      const entries = await fs.promises.readdir(roundsDir, { withFileTypes: true });
      const dirNames = entries.filter(e => e.isDirectory()).map(e => e.name);

      // Sort round directories: round_01, round_02, ... final_round
      dirNames.sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ''), 10) || (a.includes('final') ? 999 : 0);
        const numB = parseInt(b.replace(/\D/g, ''), 10) || (b.includes('final') ? 999 : 0);
        return numA - numB;
      });

      const allEvents: any[] = [];
      let globalIndex = 1;

      for (const roundDirName of dirNames) {
        const roundDirPath = path.join(roundsDir, roundDirName);
        const roundNum = parseInt(roundDirName.replace(/\D/g, ''), 10) || (roundDirName.includes('final') ? 99 : 1);
        const files = await fs.promises.readdir(roundDirPath);
        
        // Sort files by prefix (e.g. 01_campaign_speeches, 02_attacks, 03_cctv_pacts, 04_voting_and_bailouts, 05_elimination)
        files.sort();

        for (const file of files) {
          if (!file.endsWith('.json')) continue;
          const filePath = path.join(roundDirPath, file);
          try {
            const raw = await fs.promises.readFile(filePath, 'utf8');
            const items = JSON.parse(raw);
            if (Array.isArray(items)) {
              for (const item of items) {
                const evt = {
                  id: item.id || `evt-${roundNum}-${item.type || 'event'}-${globalIndex++}`,
                  type: item.type,
                  round: item.round || roundNum,
                  speakerId: item.speakerId,
                  speakerName: item.speakerName,
                  targetId: item.targetId,
                  targetName: item.targetName,
                  headline: item.headline,
                  content: item.content || item.details?.whisperText || '',
                  details: item.details,
                  timestamp: item.timestamp || Date.now(),
                };
                allEvents.push(evt);
              }
            }
          } catch (err) {
            console.warn(`[reconstructEventsFromRounds] Error reading ${filePath}:`, err);
          }
        }
      }

      return allEvents;
    } catch (err) {
      console.error('[reconstructEventsFromRounds] Error:', err);
      return [];
    }
  }

  /**
   * Reconstruct audio index if missing or incomplete by scanning audio directory
   */
  public async reconstructAudioIndexFromFiles(sessionDir: string): Promise<AudioIndexEntry[]> {
    const audioDir = path.join(sessionDir, 'audio');
    if (!fs.existsSync(audioDir)) {
      return [];
    }

    try {
      const files = await fs.promises.readdir(audioDir);
      const mp3Files = files.filter(f => f.endsWith('.mp3'));
      const entries: AudioIndexEntry[] = [];

      for (const filename of mp3Files) {
        const filePath = path.join(audioDir, filename);
        const stats = await fs.promises.stat(filePath);
        
        let phase = 'unknown';
        let round = 1;
        let speakerId: string | undefined;
        let targetId: string | undefined;

        const roundMatch = filename.match(/round(\d+)/i);
        if (roundMatch) {
          round = parseInt(roundMatch[1], 10);
        }

        if (filename.startsWith('01_campaign_')) {
          phase = 'CAMPAIGN';
          round = 1;
          const parts = filename.replace('.mp3', '').split('_');
          speakerId = parts.slice(3).join('_') || parts[2];
        } else if (filename.includes('_attack_')) {
          phase = 'ATTACK';
          const match = filename.replace('.mp3', '').match(/attack_\d+_(.+)_(?:vs|against)_(.+)/i);
          if (match) {
            speakerId = match[1];
            targetId = match[2];
          }
        } else if (filename.includes('_cctv_')) {
          phase = 'CCTV_BACKROOM';
          const match = filename.replace('.mp3', '').match(/cctv_\d+_(.+)_(?:and|with)_(.+)/i);
          if (match) {
            speakerId = match[1];
            targetId = match[2];
          }
        } else if (filename.includes('_elimination_')) {
          phase = 'ELIMINATION';
          const match = filename.replace('.mp3', '').match(/elimination_(.+)/i);
          if (match) {
            speakerId = match[1];
          }
        } else if (filename.includes('_final_speech_')) {
          phase = 'FINAL_SPEECHES';
          round = 99;
          const match = filename.replace('.mp3', '').match(/final_speech_\d+_(.+)/i);
          if (match) {
            speakerId = match[1];
          }
        } else if (filename.includes('inauguration') || filename.includes('winner')) {
          phase = 'WINNER';
          round = 99;
          const match = filename.replace('.mp3', '').match(/(?:inauguration|winner)_(.+)/i);
          if (match) {
            speakerId = match[1];
          }
        }

        entries.push({
          filename,
          phase,
          round,
          speakerId,
          targetId,
          sizeBytes: stats.size,
          timestamp: stats.mtimeMs,
        });
      }

      entries.sort((a, b) => a.filename.localeCompare(b.filename));

      const indexPath = path.join(audioDir, 'audio_index.json');
      await fs.promises.writeFile(indexPath, JSON.stringify(entries, null, 2), 'utf8');

      return entries;
    } catch (err) {
      console.error('[reconstructAudioIndexFromFiles] Error:', err);
      return [];
    }
  }

  /**
   * Get safe absolute file path for a session audio file
   */
  public getAudioFilePath(sessionName: string, filename: string): string | null {
    const safeName = sanitizeSessionName(sessionName);
    const safeFilename = path.basename(filename);
    const filePath = path.join(this.baseDir, safeName, 'audio', safeFilename);

    if (fs.existsSync(filePath)) {
      return filePath;
    }
    return null;
  }
}

export const sessionStorageService = new SessionStorageService();
