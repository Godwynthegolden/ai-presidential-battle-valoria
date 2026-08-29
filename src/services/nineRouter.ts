import { Candidate } from '@/types/candidate';
import { LLMRequestPayload, LLMResponsePayload } from '@/types/game';
import { CANDIDATES, CANDIDATE_MAP, DEFAULT_CANDIDATES } from '@/data/candidates';

export interface NineRouterConfig {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}

export class NineRouterService {
  private defaultBaseUrl: string;
  private defaultApiKey: string;
  private defaultModel: string;

  constructor() {
    this.defaultBaseUrl = process.env.LLM_BASE_URL || 'http://localhost:20128/v1';
    this.defaultApiKey = process.env.LLM_API_KEY || '';
    this.defaultModel = process.env.LLM_MODEL || 'gpt-4o-mini';
  }

  public isConfigured(config?: NineRouterConfig): boolean {
    const baseUrl = config?.baseUrl || this.defaultBaseUrl;
    const apiKey = config?.apiKey || this.defaultApiKey;
    return Boolean(baseUrl && apiKey);
  }

  public getModelName(config?: NineRouterConfig): string {
    return config?.model || this.defaultModel || 'gpt-4o-mini';
  }

  public getBaseUrl(config?: NineRouterConfig): string {
    return config?.baseUrl || this.defaultBaseUrl || 'http://localhost:20128/v1';
  }

  /**
   * Query 9router's OpenAI-compatible GET /v1/models endpoint to list available models
   */
  public async fetchAvailableModels(config?: NineRouterConfig): Promise<string[]> {
    const baseUrl = (config?.baseUrl || this.defaultBaseUrl || 'http://localhost:20128/v1').trim();
    const apiKey = config?.apiKey || this.defaultApiKey || '';

    // Normalize endpoint to /models
    let endpoint = baseUrl;
    if (endpoint.endsWith('/chat/completions')) {
      endpoint = endpoint.replace(/\/chat\/completions$/, '/models');
    } else if (endpoint.endsWith('/v1')) {
      endpoint = `${endpoint}/models`;
    } else if (endpoint.endsWith('/')) {
      endpoint = `${endpoint}models`;
    } else {
      endpoint = `${endpoint}/models`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`9router GET /models failed with HTTP ${response.status}: ${errorText}`);
      }

      const rawText = await response.text();
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`9router GET /models returned non-JSON response: "${rawText.slice(0, 120)}"`);
      }
      
      // Standard OpenAI format: { data: [{ id: "model-name" }] }
      if (Array.isArray(data?.data)) {
        const modelIds = data.data.map((m: any) => m.id || m.name).filter(Boolean);
        if (modelIds.length > 0) {
          return modelIds;
        }
      }

      // Alternative list format: { models: [...] } or direct array
      if (Array.isArray(data?.models)) {
        return data.models.map((m: any) => typeof m === 'string' ? m : m.id || m.name).filter(Boolean);
      }

      if (Array.isArray(data)) {
        return data.map((m: any) => typeof m === 'string' ? m : m.id || m.name).filter(Boolean);
      }

      throw new Error('9router returned models in an unexpected response format');
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`Connection to 9router at ${endpoint} timed out after 12s. Is 9router running?`);
      }
      throw err;
    }
  }

  /**
   * Main dispatch method for all agent generations through 9router
   */
  public async generateAgentAction(
    payload: LLMRequestPayload,
    config?: NineRouterConfig
  ): Promise<LLMResponsePayload> {
    let candidate = CANDIDATE_MAP.get(payload.candidateId);
    if (!candidate) {
      if (payload.action === 'generate_character') {
        candidate = DEFAULT_CANDIDATES[0];
      } else {
        throw new Error(`Candidate with id ${payload.candidateId} not found.`);
      }
    }

    const baseUrl = config?.baseUrl || this.defaultBaseUrl;
    const apiKey = config?.apiKey || this.defaultApiKey;
    const model = config?.model || this.defaultModel;

    if (!baseUrl) {
      throw new Error('9router Base URL is not configured. Please enter your 9router Endpoint in Settings.');
    }

    if (!apiKey) {
      throw new Error('9router API Key is missing. Please enter your 9router API Key in Settings.');
    }

    const { systemPrompt, userPrompt, isJsonExpected } = this.buildPrompt(candidate, payload);

    try {
      const rawText = await this.callChatCompletions(
        systemPrompt, 
        userPrompt, 
        isJsonExpected, 
        baseUrl, 
        apiKey, 
        model
      );

      if (payload.action === 'elimination_vote' || payload.action === 'final_vote') {
        const parsed = await this.parseAndValidateVote(
          rawText, 
          candidate, 
          payload, 
          systemPrompt, 
          userPrompt,
          baseUrl,
          apiKey,
          model
        );
        return {
          text: `Voted for ${CANDIDATE_MAP.get(parsed.vote)?.name || parsed.vote}`,
          voteTargetId: parsed.vote,
          privateReason: parsed.reason,
          modelUsed: model,
        };
      }

      if (payload.action === 'backroom_pact') {
        const parsed = this.extractJson(rawText);
        const validTargets = payload.activeCandidateIds.filter(id => id !== candidate.id && id !== payload.targetId);
        const agreedTarget = (parsed?.targetId && validTargets.includes(parsed.targetId)) 
          ? parsed.targetId 
          : (validTargets[0] || payload.activeCandidateIds.filter(id => id !== candidate.id)[0]);
        
        const whisper = parsed?.whisper 
          ? parsed.whisper.replace(/^["']|["']$/g, '').trim()
          : (rawText.replace(/\{[\s\S]*\}|^["']|["']$/g, '').trim() || `Let's coordinate our votes and eliminate ${CANDIDATE_MAP.get(agreedTarget)?.name || agreedTarget}.`);

        return {
          text: whisper,
          agreedTargetId: agreedTarget,
          whisperText: whisper,
          modelUsed: model,
        };
      }

      if (payload.action === 'generate_character') {
        const parsed = this.extractJson(rawText);
        if (!parsed || !parsed.name) {
          throw new Error('AI failed to return a valid candidate profile JSON.');
        }
        const id = (parsed.codename || parsed.name || 'custom').toLowerCase().replace(/[^a-z0-9_]/g, '_') + `_${Date.now().toString().slice(-4)}`;
        const profile: Partial<Candidate> = {
          id,
          name: parsed.name || 'Custom Contender',
          codename: id,
          archetype: parsed.archetype || 'populist',
          archetypeTitle: parsed.archetypeTitle || 'Independent Contender',
          titleRole: parsed.titleRole || 'Presidential Candidate',
          slogan: parsed.slogan || 'A Bold New Direction for Valoria',
          ideology: parsed.ideology || 'Progressive modernization and strong governance.',
          personality: parsed.personality || 'Strategic, charismatic, and resolute.',
          speakingStyle: parsed.speakingStyle || 'Direct, persuasive, and sharp.',
          motivations: parsed.motivations || 'To lead the Republic of Valoria into a new era.',
          strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ['Charismatic oratory', 'Strategic focus', 'Grassroots appeal'],
          weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : ['Uncompromising temperament', 'High-risk bets'],
          behavioralTendencies: Array.isArray(parsed.behavioralTendencies) ? parsed.behavioralTendencies : ['Strikes rivals decisively', 'Forms tactical alliances'],
          rivalArchetypes: Array.isArray(parsed.rivalArchetypes) ? parsed.rivalArchetypes : ['careerist', 'capitalist'],
          color: parsed.color || {
            primary: '#3b82f6',
            bg: 'rgba(59, 130, 246, 0.12)',
            border: 'rgba(59, 130, 246, 0.5)',
            text: '#60a5fa',
            glow: 'rgba(59, 130, 246, 0.3)',
            gradient: 'from-blue-600/20 to-slate-900',
          },
          avatar: {
            icon: parsed.avatar?.icon || 'User',
            svgType: parsed.avatar?.svgType || 'landmark',
          },
          systemPrompt: parsed.systemPrompt || `You are ${parsed.name}, ${parsed.titleRole || 'Presidential Candidate'} running for President of the Republic of Valoria. Slogan: "${parsed.slogan || 'For Valoria'}". Speak with authenticity, intelligence, and conviction.`,
          isCustom: true,
        };

        return {
          text: `Generated candidate: ${profile.name} (${profile.titleRole})`,
          candidateProfile: profile,
          modelUsed: model,
        };
      }

      // Clean plain text response
      const cleaned = rawText.replace(/^["']|["']$/g, '').trim();
      return {
        text: cleaned,
        modelUsed: model,
      };
    } catch (err: any) {
      console.error(`[9router API Error for ${candidate.name}]:`, err.message);
      throw new Error(`9router request failed: ${err.message}`);
    }
  }

  /**
   * OpenAI-compatible POST to /chat/completions endpoint on 9router
   */
  private async callChatCompletions(
    systemPrompt: string, 
    userPrompt: string, 
    isJsonExpected: boolean = false,
    baseUrl: string = this.defaultBaseUrl,
    apiKey: string = this.defaultApiKey,
    model: string = this.defaultModel
  ): Promise<string> {
    let endpoint = baseUrl.trim();
    if (!endpoint.endsWith('/chat/completions')) {
      if (endpoint.endsWith('/')) {
        endpoint = `${endpoint}chat/completions`;
      } else {
        endpoint = `${endpoint}/chat/completions`;
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Authorization': `Bearer ${apiKey}`,
    };

    const body: any = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.75,
      max_tokens: 350,
      stream: false,
    };

    if (isJsonExpected) {
      body.response_format = { type: 'json_object' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s timeout

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status} from 9router: ${errorText}`);
      }

      const rawResponseText = await response.text();

      // 1. Try parsing as direct OpenAI JSON response
      try {
        const data = JSON.parse(rawResponseText);
        const content = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text;
        if (typeof content === 'string' && content.trim()) {
          return content.trim();
        }
      } catch {
        // Not a direct JSON response, proceed to SSE stream parser
      }

      // 2. Handle Server-Sent Events (SSE) format: "data: { ... }\n\ndata: [DONE]"
      if (rawResponseText.includes('data:')) {
        const lines = rawResponseText.split('\n');
        let accumulatedContent = '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]' || trimmed === '[DONE]') continue;
          if (trimmed.startsWith('data:')) {
            const jsonStr = trimmed.replace(/^data:\s*/, '');
            try {
              const chunk = JSON.parse(jsonStr);
              const delta = chunk?.choices?.[0]?.delta?.content 
                         || chunk?.choices?.[0]?.message?.content 
                         || chunk?.choices?.[0]?.text;
              if (delta) {
                accumulatedContent += delta;
              }
            } catch {
              // Ignore single malformed chunk
            }
          }
        }

        if (accumulatedContent.trim()) {
          return accumulatedContent.trim();
        }
      }

      // 3. Fallback: Check if the raw text is plain text
      if (rawResponseText.trim() && !rawResponseText.startsWith('<')) {
        return rawResponseText.trim();
      }

      throw new Error(`Malformed response from 9router API: "${rawResponseText.slice(0, 150)}"`);
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`9router request timed out after 35 seconds at ${endpoint}`);
      }
      throw error;
    }
  }

  /**
   * Parse & validate voting JSON with automatic corrective retry against 9router
   */
  private async parseAndValidateVote(
    rawText: string,
    candidate: Candidate,
    payload: LLMRequestPayload,
    systemPrompt: string,
    userPrompt: string,
    baseUrl: string,
    apiKey: string,
    model: string
  ): Promise<{ vote: string; reason?: string }> {
    const validTargets = payload.action === 'final_vote'
      ? (payload.finalistIds || []).filter(id => id !== candidate.id)
      : payload.activeCandidateIds.filter(id => id !== candidate.id);

    // Try parsing initial response
    let parsed = this.extractJson(rawText);

    // Validate vote candidate ID
    if (parsed && parsed.vote && validTargets.includes(parsed.vote)) {
      return {
        vote: parsed.vote,
        reason: parsed.reason || 'Strategic determination',
      };
    }

    // Auto-retry with corrective prompt
    console.warn(`[9router Vote Validation]: Invalid vote output from ${candidate.name} ("${rawText}"). Retrying with corrective prompt...`);

    const correctivePrompt = `${userPrompt}\n\nATTENTION: Your previous response was invalid. You MUST return ONLY valid JSON formatted as: {"vote": "candidate_id", "reason": "brief reasoning"}. You MUST choose from ONLY these exact candidate IDs: ${JSON.stringify(validTargets)}. Do NOT vote for yourself (${candidate.id}).`;

    try {
      const retryText = await this.callChatCompletions(
        systemPrompt, 
        correctivePrompt, 
        true,
        baseUrl,
        apiKey,
        model
      );
      const retryParsed = this.extractJson(retryText);

      if (retryParsed && retryParsed.vote && validTargets.includes(retryParsed.vote)) {
        return {
          vote: retryParsed.vote,
          reason: retryParsed.reason || 'Strategic recalculation',
        };
      }
    } catch (retryErr) {
      console.error('[9router Vote Corrective Retry Failed]:', retryErr);
    }

    // If model still failed validation, pick the first valid allowed target
    const fallbackTarget = validTargets[0] || payload.activeCandidateIds[0];
    return {
      vote: fallbackTarget,
      reason: 'Strategic elimination vote',
    };
  }

  private extractJson(text: string): any {
    try {
      return JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  /**
   * Construct tailored system & user prompts maintaining character & memory
   */
  private buildPrompt(
    candidate: Candidate, 
    payload: LLMRequestPayload
  ): { systemPrompt: string; userPrompt: string; isJsonExpected: boolean } {
    let systemPrompt = candidate.systemPrompt;
    let userPrompt = '';
    let isJsonExpected = false;

    switch (payload.action) {
      case 'campaign_speech': {
        userPrompt = `You are on the national debate stage for Round 1 Presidential Campaign Speeches in the Republic of Valoria.
The electorate and your fellow candidates are listening.
In MAXIMUM 40 WORDS:
1. Introduce your background and core platform.
2. Explain why you must be elected President of the Republic of Valoria.
3. Persuade the audience to vote for your vision.

Stay strictly in character as ${candidate.name} (${candidate.archetypeTitle} - ${candidate.titleRole}). Return clean speech text only, strictly under 40 words.`;
        break;
      }

      case 'attack': {
        const targetCandidate = payload.targetId ? CANDIDATE_MAP.get(payload.targetId) : null;
        const targetDesc = targetCandidate 
          ? `${targetCandidate.name} (${targetCandidate.archetypeTitle} - ${targetCandidate.titleRole}, Slogan: "${targetCandidate.slogan}")`
          : 'an opponent';

        let contextSnippet = '';
        if (payload.historyContext.recentAttacks && payload.historyContext.recentAttacks.length > 0) {
          contextSnippet = `\nRecent Attacks in the debate:\n` + payload.historyContext.recentAttacks
            .slice(-4)
            .map(a => `- ${a.attackerName} attacked ${a.targetName}: "${a.text}"`)
            .join('\n');
        }

        userPrompt = `Round ${payload.round}: LIVE ATTACK ROUND.
You must publicly ATTACK your opponent: ${targetDesc}.
${contextSnippet}

In MAXIMUM 30 WORDS, ruthlessly attack their economic policies, scandals, donor ties, voting record, or fitness to lead the Republic of Valoria.
Stay completely in character as ${candidate.name}. Return clean attack speech text only, strictly under 30 words.`;
        break;
      }

      case 'backroom_pact': {
        isJsonExpected = true;
        const receiver = payload.targetId ? CANDIDATE_MAP.get(payload.targetId) : null;
        const receiverName = receiver ? `${receiver.name} (${receiver.archetypeTitle})` : 'your ally';
        const allowedTargets = payload.activeCandidateIds
          .filter(id => id !== candidate.id && id !== payload.targetId)
          .map(id => {
            const c = CANDIDATE_MAP.get(id);
            return `"${id}" (${c?.name} - ${c?.archetypeTitle})`;
          })
          .join(', ');

        let contextSnippet = '';
        if (payload.historyContext.recentAttacks && payload.historyContext.recentAttacks.length > 0) {
          contextSnippet = `\nRecent Clashes:\n` + payload.historyContext.recentAttacks
            .slice(-3)
            .map(a => `- ${a.attackerName} attacked ${a.targetName}`)
            .join('\n');
        }

        userPrompt = `Round ${payload.round}: SECRET BACKROOM DEAL / LEAKED CCTV CONSPIRACY.
You are privately whispering to ${receiverName} behind closed doors in a shadowy Capitol hallway.
You want to propose a secret tactical alliance, vote pact, or bribe to coordinate your votes to eliminate ONE target: [${allowedTargets}].
${contextSnippet}

In MAXIMUM 25 WORDS, deliver your whispered proposal or bribe in character.

You MUST return a JSON object with this exact schema:
{
  "targetId": "candidate_id",
  "whisper": "1-2 sentence whispered deal or bribe (max 25 words)"
}`;
        break;
      }

      case 'elimination_vote': {
        isJsonExpected = true;
        const allowedTargets = payload.activeCandidateIds.filter(id => id !== candidate.id);
        const candidatesToVote = allowedTargets
          .map(id => {
            const c = CANDIDATE_MAP.get(id);
            return `"${id}" (${c?.name} - ${c?.archetypeTitle})`;
          })
          .join(', ');

        let contextSnippet = '';
        if (payload.historyContext.recentAttacks && payload.historyContext.recentAttacks.length > 0) {
          contextSnippet = `\nDebate context so far:\n` + payload.historyContext.recentAttacks
            .slice(-4)
            .map(a => `- ${a.attackerName} attacked ${a.targetName}`)
            .join('\n');
        }

        let pactContext = '';
        if (payload.historyContext.activePact) {
          const ally = CANDIDATE_MAP.get(payload.historyContext.activePact.allyId);
          const agreedTarget = CANDIDATE_MAP.get(payload.historyContext.activePact.agreedTargetId);
          pactContext = `
SECRET BACKROOM DEAL & STRATEGIC BETRAYAL DILEMMA:
In the shadowy Capitol cloakroom, you shook hands with ${ally?.name} (${ally?.titleRole}) to coordinate your votes against "${agreedTarget?.id}" (${agreedTarget?.name}).
However, Valorian politics is ruthless and cutthroat:
- OPTION A (HONOR PACT): Vote for "${agreedTarget?.id}" as promised.
- OPTION B (TACTICAL BETRAYAL): If ${ally?.name} is a dangerous rival, if you distrust them, if eliminating ${ally?.name} or another heavyweight improves your own presidential survival, or if your character is calculating/opportunistic, you CAN STAB ${ally?.name} IN THE BACK and vote for "${ally?.id}" or another candidate.
Weigh your candidate's loyalty vs ruthless ambition!
`;
        }

        userPrompt = `Round ${payload.round}: SECRET ELIMINATION BALLOT.
You must secretly vote to ELIMINATE ONE candidate from the presidential race.
Rules:
1. You CANNOT vote for yourself (${candidate.id}).
2. You MUST pick exactly ONE ID from this list: [${candidatesToVote}].
3. Vote based on political survival, rival threats, backroom pacts, or tactical betrayals.
${pactContext}${contextSnippet}

You MUST return a JSON object with this exact schema:
{
  "vote": "candidate_id",
  "reason": "brief private political calculation (max 20 words)"
}`;
        break;
      }

      case 'exit_words': {
        userPrompt = `You have just been ELIMINATED from the Presidential Race in Round ${payload.round}!
In MAXIMUM 30 WORDS, deliver your dramatic concession statement or parting words to Valoria's voters.
Stay in character as ${candidate.name}. Return clean text only, strictly under 30 words.`;
        break;
      }

      case 'final_speech': {
        const finalistsList = (payload.finalistIds || [])
          .filter(id => id !== candidate.id)
          .map(id => {
            const c = CANDIDATE_MAP.get(id);
            return `${c?.name} (${c?.archetypeTitle})`;
          })
          .join(' and ');

        userPrompt = `THE FINAL PRESIDENTIAL SHOWDOWN (Top 3 Finalists).
You are delivering your FINAL APPEAL to the Grand Jury of all participating candidates and the nation.
Your opponents are: ${finalistsList}.

In MAXIMUM 50 WORDS, answer:
"Why should YOU become President of the Republic of Valoria, and why are the other two candidates dangerous or unfit choices?"

Deliver a compelling, presidential closing argument. Return clean speech text only, strictly under 50 words.`;
        break;
      }

      case 'final_vote': {
        isJsonExpected = true;
        const validFinalists = (payload.finalistIds || []).filter(id => id !== candidate.id);
        const finalistsDesc = validFinalists
          .map(id => {
            const c = CANDIDATE_MAP.get(id);
            return `"${id}" (${c?.name} - ${c?.archetypeTitle})`;
          })
          .join(', ');

        const isEliminated = !payload.activeCandidateIds.includes(candidate.id);
        const juryStatus = isEliminated 
          ? 'You were eliminated earlier and are now voting as a Grand Juror.'
          : 'You are one of the finalists voting for your peer.';

        userPrompt = `GRAND JURY PRESIDENTIAL ELECTION VOTE.
${juryStatus}
You must cast your FINAL VOTE to elect the President of the Republic of Valoria from: [${finalistsDesc}].
Rules:
1. You CANNOT vote for yourself.
2. Vote for the candidate whose leadership, policies, or character you support most.

Return a JSON object:
{
  "vote": "finalist_id",
  "reason": "brief private jury reasoning"
}`;
        break;
      }

      case 'victory_speech': {
        userPrompt = `CONGRATULATIONS! You have won the election and are officially inaugurated as PRESIDENT OF THE REPUBLIC OF VALORIA!
Deliver your triumphant inaugural presidential victory address to the nation in MAXIMUM 50 WORDS.
Stay completely in character as ${candidate.name}. Return clean speech text only, strictly under 50 words.`;
        break;
      }

      case 'generate_character': {
        isJsonExpected = true;
        const userIdea = payload.customPrompt || 'A compelling, realistic presidential candidate running for President of the Republic of Valoria';
        systemPrompt = `You are a master political worldbuilder and game writer for the Republic of Valoria, a high-stakes fictional modern republic with deep political factions, economic struggles, labor movements, tech oligarchs, military hawks, and populist movements. Return valid JSON only.`;
        userPrompt = `Create a realistic, grounded, and dramatic political contender running for President of the Republic of Valoria based on this concept:
"${userIdea}"

You MUST return a JSON object with this exact schema:
{
  "name": "Full Name (e.g. Victor Stone, Maya Lin)",
  "codename": "Short lowercase ID (e.g. victor_stone)",
  "archetype": "populist" | "technocrat" | "hawk" | "reformer" | "capitalist" | "socialist" | "environmentalist" | "conspiracy" | "careerist" | "traditionalist" | "wildcard",
  "archetypeTitle": "Catchy Archetype Title (e.g. Digital Sovereignty Pioneer, Rust-Belt Champion)",
  "titleRole": "Current or Former Government/Professional Title (e.g. Former Intelligence Chief, Biotech Founder)",
  "slogan": "Powerful campaign slogan (max 10 words)",
  "ideology": "1-sentence political philosophy",
  "personality": "3-4 personality traits (e.g. Charismatic, ruthless, data-driven)",
  "speakingStyle": "Speaking tone and rhetorical habits",
  "motivations": "Core political ambitions and driving goal",
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "weaknesses": ["Weakness 1", "Weakness 2", "Weakness 3"],
  "behavioralTendencies": ["Tendency 1", "Tendency 2"],
  "rivalArchetypes": ["capitalist", "careerist"],
  "color": {
    "primary": "#3b82f6",
    "bg": "rgba(59, 130, 246, 0.12)",
    "border": "rgba(59, 130, 246, 0.5)",
    "text": "#60a5fa",
    "glow": "rgba(59, 130, 246, 0.3)",
    "gradient": "from-blue-600/20 to-slate-900"
  },
  "avatar": {
    "icon": "User",
    "svgType": "flame" | "cpu" | "shield" | "heart" | "dollar" | "leaf" | "eye" | "scale" | "landmark" | "building" | "users" | "award" | "zap" | "crown" | "globe" | "swords" | "hammer"
  },
  "systemPrompt": "You are [Full Name], [Title Role] running for President of the Republic of Valoria. [2-3 sentences of first-person political ideology, temperament, debate style, and psychological motivations. Speak with conviction and authority.]"
}`;
        break;
      }
    }

    return { systemPrompt, userPrompt, isJsonExpected };
  }
}

export const nineRouterService = new NineRouterService();
