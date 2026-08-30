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
    // Register dynamic candidates passed from client into map
    if (payload.allCandidates && Array.isArray(payload.allCandidates)) {
      for (const c of payload.allCandidates) {
        if (c && c.id) {
          CANDIDATE_MAP.set(c.id, c);
        }
      }
    }
    if (payload.candidate && payload.candidate.id) {
      CANDIDATE_MAP.set(payload.candidate.id, payload.candidate);
    }

    let candidate = payload.candidate || CANDIDATE_MAP.get(payload.candidateId);
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

    const maxTokens = payload.action === 'generate_character' ? 2000 : 500;

    try {
      const rawText = await this.callChatCompletions(
        systemPrompt, 
        userPrompt, 
        isJsonExpected, 
        baseUrl, 
        apiKey, 
        model,
        maxTokens
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
        const ctx = payload.historyContext || {};
        const parsed = this.extractAndRepairJson(rawText);
        const validTargets = payload.activeCandidateIds.filter(id => id !== candidate.id && id !== payload.targetId);
        const healedTarget = parsed?.targetId ? this.resolveCandidateIdFromNameOrAlias(parsed.targetId, validTargets) : null;
        const agreedTarget = healedTarget || validTargets[0] || payload.activeCandidateIds.filter(id => id !== candidate.id)[0];
        
        let whisper = parsed?.whisper 
          ? parsed.whisper.replace(/^["']|["']$/g, '').trim()
          : (rawText.replace(/\{[\s\S]*\}|^["']|["']$/g, '').trim() || `Let's coordinate our votes and eliminate ${CANDIDATE_MAP.get(agreedTarget)?.name || agreedTarget}.`);

        // Sanitize any accidental speaker prefix
        whisper = whisper.replace(/^[^:]+:\s*/, '').replace(/^["']|["']$/g, '').trim();

        const proposerBudget = ctx.proposerBudget ?? 100;
        const receiver = payload.targetId ? CANDIDATE_MAP.get(payload.targetId) : null;
        
        // Determine whether bribe is offered (proposer needs >= $20)
        let bribeOffered = false;
        if (proposerBudget >= 20) {
          if (typeof parsed?.offerBribe === 'boolean') {
            bribeOffered = parsed.offerBribe;
          } else {
            // Default to offering bribe if proposer has funds
            bribeOffered = true;
          }
        }

        // Determine receiver's decision (accept, decline, accept_and_betray)
        let receiverDecision: 'accept' | 'decline' | 'accept_and_betray' = 'accept';
        if (bribeOffered) {
          if (['accept', 'decline', 'accept_and_betray'].includes(parsed?.receiverDecision)) {
            receiverDecision = parsed.receiverDecision;
          } else {
            const rxArch = receiver?.archetype;
            if (rxArch === 'reformer' || rxArch === 'traditionalist') {
              const r = Math.random();
              receiverDecision = r < 0.4 ? 'decline' : (r < 0.75 ? 'accept' : 'accept_and_betray');
            } else if (rxArch === 'capitalist' || rxArch === 'careerist' || rxArch === 'wildcard') {
              const r = Math.random();
              receiverDecision = r < 0.45 ? 'accept_and_betray' : (r < 0.9 ? 'accept' : 'decline');
            } else {
              const r = Math.random();
              receiverDecision = r < 0.6 ? 'accept' : (r < 0.85 ? 'accept_and_betray' : 'decline');
            }
          }
        }

        const bribeAccepted = bribeOffered && (receiverDecision === 'accept' || receiverDecision === 'accept_and_betray');

        return {
          text: whisper,
          agreedTargetId: agreedTarget,
          whisperText: whisper,
          bribeOffered,
          bribeAmount: bribeOffered ? 20 : 0,
          receiverDecision: bribeOffered ? receiverDecision : undefined,
          bribeAccepted,
          modelUsed: model,
        };
      }

      if (payload.action === 'generate_character') {
        const profile = this.extractCharacterProfile(rawText, payload.customPrompt || '');

        return {
          text: `Generated candidate: ${profile.name} (${profile.titleRole})`,
          candidateProfile: profile,
          modelUsed: model,
        };
      }

      // Clean and sanitize plain text spoken dialogue responses (attack, campaign_speech, final_speech, exit_words, victory_speech)
      const targetCandidate = payload.targetId ? CANDIDATE_MAP.get(payload.targetId) : null;
      const cleaned = this.sanitizeDialogueSpeech(rawText, candidate, targetCandidate);
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
   * Sanitizes spoken dialogue output from LLMs:
   * 1. Strips outer quotes and markdown ticks
   * 2. Strips stage directions like (points finger), (to Alvarez), [scoffs]
   * 3. Strips script label prefixes like "Alvarez:", "Chloe:", "Leon :", "Target:", "Attack on Alvarez:", etc.
   * 4. Capitalizes the first letter of natural dialogue.
   */
  public sanitizeDialogueSpeech(
    text: string, 
    speaker?: Candidate | null, 
    target?: Candidate | null
  ): string {
    if (!text) return '';
    let cleaned = text.trim();

    // 1. Strip surrounding quotation marks or markdown backticks/asterisks
    cleaned = cleaned.replace(/^["'“”‘’`*]+|["'“”‘’`*]+$/g, '').trim();

    // 2. Strip leading parenthetical or bracketed stage directions, e.g. "(To Alvarez)", "(points finger)", "[scoffs]"
    cleaned = cleaned.replace(/^\([^\)]+\)\s*[-:–—]?\s*/g, '').trim();
    cleaned = cleaned.replace(/^\[[^\]]+\]\s*[-:–—]?\s*/g, '').trim();
    cleaned = cleaned.replace(/^[-:–—\s]+/g, '').trim();

    // 3. Strip target/speaker name prefixes with colons, dashes, or script tags
    const namesToStrip: string[] = [];
    if (target) {
      namesToStrip.push(target.name, target.id, target.codename);
      const parts = target.name.split(/[\s"'\-]+/).filter(p => p.length >= 2);
      namesToStrip.push(...parts);
    }
    if (speaker) {
      namesToStrip.push(speaker.name, speaker.id, speaker.codename);
      const parts = speaker.name.split(/[\s"'\-]+/).filter(p => p.length >= 2);
      namesToStrip.push(...parts);
    }
    namesToStrip.push(
      'Target', 'Opponent', 'Rival', 'Speaker', 'Candidate', 'Attack', 'Rebuttal', 
      'Speech', 'Statement', 'Response', 'Dialogue', 'Answer', 'Question'
    );

    // Iteratively strip any matching name prefixes
    let changed = true;
    while (changed) {
      changed = false;
      for (const n of namesToStrip) {
        if (!n) continue;
        const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regexes = [
          new RegExp(`^(\\[?\\s*${escaped}\\s*\\]?\\s*[-:–—]+\\s*)+`, 'i'),
          new RegExp(`^((Attack|Rebuttal|Speech|Challenge)\\s+(on|to|against)?\\s+${escaped}\\s*[-:–—]+\\s*)+`, 'i'),
        ];
        for (const rgx of regexes) {
          if (rgx.test(cleaned)) {
            cleaned = cleaned.replace(rgx, '').trim();
            changed = true;
          }
        }
      }
    }

    // 4. Catch generic capitalized script colon prefix (1-3 titlecase words followed by colon or em-dash)
    // Example: "Jackson Alvarez: Look at the record", "Senator Thorne: You are..."
    cleaned = cleaned.replace(/^[A-Z][a-zA-Z0-9\s"'.]{1,30}\s*[:–—]\s*/, '').trim();

    // 5. Clean up any leftover outer quotation marks or brackets
    cleaned = cleaned.replace(/^["'“”‘’`*]+|["'“”‘’`*]+$/g, '').trim();

    // 6. Ensure first letter is capitalized
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }

    return cleaned;
  }

  /**
   * OpenAI-compatible POST to /chat/completions endpoint on 9router
   */
  /**
   * OpenAI-compatible POST to /chat/completions endpoint on 9router
   */
  private async callChatCompletions(
    systemPrompt: string, 
    userPrompt: string, 
    isJsonExpected: boolean = false,
    baseUrl: string = this.defaultBaseUrl,
    apiKey: string = this.defaultApiKey,
    model: string = this.defaultModel,
    maxTokens: number = 500
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
      max_tokens: maxTokens,
      stream: false,
    };

    if (isJsonExpected) {
      body.response_format = { type: 'json_object' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

    try {
      let response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      // If response_format caused 400 on unsupported open-source model, auto-retry without response_format
      if (!response.ok && response.status === 400 && isJsonExpected) {
        const errorProbe = await response.clone().text().catch(() => '');
        if (errorProbe.toLowerCase().includes('response_format') || errorProbe.toLowerCase().includes('json_object') || errorProbe.toLowerCase().includes('schema')) {
          console.warn('[9router]: response_format not supported by model. Retrying without response_format flag...');
          const fallbackBody = { ...body };
          delete fallbackBody.response_format;
          response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(fallbackBody),
            signal: controller.signal,
          });
        }
      }

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
        throw new Error(`9router request timed out after 45 seconds at ${endpoint}`);
      }
      throw error;
    }
  }

  /**
   * Fuzzy matches and heals candidate identifiers (handles names, codenames, aliases, full titles, hyphen/underscore normalization)
   */
  public resolveCandidateIdFromNameOrAlias(input: string, validCandidateIds: string[]): string | null {
    if (!input || typeof input !== 'string') return null;
    const clean = input.trim().toLowerCase().replace(/['"]/g, '');
    const normalizedClean = clean.replace(/_/g, '-');
    
    // 1. Direct ID match or normalized ID match
    if (validCandidateIds.includes(clean)) return clean;
    const exactId = validCandidateIds.find(id => id.toLowerCase() === clean || id.toLowerCase().replace(/_/g, '-') === normalizedClean);
    if (exactId) return exactId;

    // 2. Match by Candidate Name, Codename, or Title
    for (const id of validCandidateIds) {
      const cand = CANDIDATE_MAP.get(id) || CANDIDATES.find(c => c.id === id || c.id.replace(/_/g, '-') === id.replace(/_/g, '-'));
      if (!cand) continue;

      const candName = cand.name.toLowerCase();
      const candCodename = cand.codename.toLowerCase();
      
      if (clean === candName || clean === candCodename) return id;
      if (candName.includes(clean) || clean.includes(candName)) return id;
      
      // Match individual name parts (e.g. "Alvarez", "Rostova", "Vance", "Voronin", "Sterling", "Jax")
      const nameParts = candName.replace(/["']/g, '').split(/\s+/).filter(p => p.length >= 3);
      if (nameParts.some(part => clean.includes(part.toLowerCase()) || part.toLowerCase().includes(clean))) return id;

      // Check codename parts
      const codeParts = candCodename.split(/\s+/).filter(p => p.length >= 3);
      if (codeParts.some(part => clean.includes(part.toLowerCase()))) return id;
    }

    return null;
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

    // Try parsing initial response with multi-stage repair
    let parsed = this.extractAndRepairJson(rawText);

    // Validate and heal vote candidate ID
    let resolvedVote = parsed?.vote ? this.resolveCandidateIdFromNameOrAlias(parsed.vote, validTargets) : null;

    if (resolvedVote) {
      return {
        vote: resolvedVote,
        reason: parsed.reason ? String(parsed.reason).replace(/^["']|["']$/g, '').trim() : 'Strategic determination',
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
        model,
        500
      );
      const retryParsed = this.extractAndRepairJson(retryText);
      const retryVote = retryParsed?.vote ? this.resolveCandidateIdFromNameOrAlias(retryParsed.vote, validTargets) : null;

      if (retryVote) {
        return {
          vote: retryVote,
          reason: retryParsed.reason ? String(retryParsed.reason).replace(/^["']|["']$/g, '').trim() : 'Strategic recalculation',
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

  /**
   * Universal Industrial-Strength JSON Extractor & Syntax Auto-Repair Engine
   */
  public extractAndRepairJson<T = any>(text: string): T | null {
    if (!text || typeof text !== 'string') return null;

    // 1. Direct parse attempt
    try {
      return JSON.parse(text.trim());
    } catch {}

    // 2. Strip markdown code fences (```json ... ```, ```javascript ... ```, ``` ... ```)
    let cleaned = text.replace(/```(?:json|javascript|js)?\s*([\s\S]*?)\s*```/gi, '$1').trim();
    try {
      return JSON.parse(cleaned);
    } catch {}

    // 3. Extract substring between outermost '{' and '}' or '[' and ']'
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');

    let jsonCandidate: string | null = null;
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonCandidate = cleaned.substring(firstBrace, lastBrace + 1);
    } else if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      jsonCandidate = cleaned.substring(firstBracket, lastBracket + 1);
    }

    if (jsonCandidate) {
      try {
        return JSON.parse(jsonCandidate);
      } catch {}

      // 4. Multi-pass Syntax Auto-Repair
      let repaired = jsonCandidate
        // Remove single-line JS comments (// ...)
        .replace(/(^|[^\\])\/\/.*$/gm, '$1')
        // Remove multi-line comments (/* ... */)
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // Sanitize trailing commas before closing braces/brackets
        .replace(/,\s*([}\]])/g, '$1')
        // Fix single-quoted property keys: {'key': -> {"key":
        .replace(/'([a-zA-Z0-9_$-]+)'\s*:/g, '"$1":')
        // Fix unquoted property keys: { key: -> { "key":
        .replace(/([{,]\s*)([a-zA-Z0-9_$-]+)\s*:/g, '$1"$2":')
        // Fix single-quoted values: : 'value' -> : "value"
        .replace(/:\s*'([^']*)'/g, ': "$1"')
        // Strip unprintable control characters and zero-width spaces
        .replace(/[\u0000-\u001F\u007F-\u009F\uFEFF\u200B-\u200D]/g, ' ')
        // Remove raw non-escaped newlines inside strings
        .replace(/\r?\n/g, ' ');

      try {
        return JSON.parse(repaired);
      } catch {}

      // Secondary repair: attempt aggressive trailing comma removal
      try {
        const secondary = repaired.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(secondary);
      } catch {}
    }

    return null;
  }

  private extractJson(text: string): any {
    return this.extractAndRepairJson(text);
  }

  /**
   * Resilient character profile extractor with fallback heuristic parser
   */
  private extractCharacterProfile(rawText: string, userConcept: string): Partial<Candidate> {
    const parsed = this.extractJson(rawText);
    
    // Heuristic regex helper
    const extractRegex = (pattern: RegExp): string | null => {
      const match = rawText.match(pattern);
      return match ? match[1].replace(/["']/g, '').trim() : null;
    };

    const name = parsed?.name || 
                 extractRegex(/"name"\s*:\s*"([^"]+)"/) || 
                 extractRegex(/Name:\s*([^\n\r,]+)/i) || 
                 'Valoria Contender';

    const codename = (parsed?.codename || 
                     extractRegex(/"codename"\s*:\s*"([^"]+)"/) || 
                     name).toLowerCase().replace(/[^a-z0-9_]/g, '_') + `_${Date.now().toString().slice(-4)}`;

    const archetype = (parsed?.archetype || 
                      extractRegex(/"archetype"\s*:\s*"([^"]+)"/) || 
                      'populist') as any;

    const archetypeTitle = parsed?.archetypeTitle || 
                          extractRegex(/"archetypeTitle"\s*:\s*"([^"]+)"/) || 
                          'Independent Contender';

    const titleRole = parsed?.titleRole || 
                      extractRegex(/"titleRole"\s*:\s*"([^"]+)"/) || 
                      'Presidential Candidate';

    const slogan = parsed?.slogan || 
                   extractRegex(/"slogan"\s*:\s*"([^"]+)"/) || 
                   'A Bold New Direction for Valoria';

    const ideology = parsed?.ideology || 
                     extractRegex(/"ideology"\s*:\s*"([^"]+)"/) || 
                     (userConcept ? `Championing ${userConcept.slice(0, 80)}.` : 'Progressive governance and economic modernization.');

    const personality = parsed?.personality || 
                        extractRegex(/"personality"\s*:\s*"([^"]+)"/) || 
                        'Strategic, charismatic, and resolute.';

    const speakingStyle = parsed?.speakingStyle || 
                          extractRegex(/"speakingStyle"\s*:\s*"([^"]+)"/) || 
                          'Direct, persuasive, and sharp.';

    const motivations = parsed?.motivations || 
                        extractRegex(/"motivations"\s*:\s*"([^"]+)"/) || 
                        'To lead the Republic of Valoria into a new era.';

    const systemPrompt = parsed?.systemPrompt || 
                         extractRegex(/"systemPrompt"\s*:\s*"([^"]+)"/) || 
                         `You are ${name}, ${titleRole} running for President of the Republic of Valoria. Slogan: "${slogan}". Background: Candidate for the presidency. Speak with authenticity, intelligence, and conviction.`;

    const strengths = Array.isArray(parsed?.strengths) && parsed.strengths.length > 0
      ? parsed.strengths
      : ['Charismatic oratory', 'Strategic focus', 'Grassroots appeal'];

    const weaknesses = Array.isArray(parsed?.weaknesses) && parsed.weaknesses.length > 0
      ? parsed.weaknesses
      : ['Uncompromising temperament', 'High-risk bets'];

    const behavioralTendencies = Array.isArray(parsed?.behavioralTendencies) && parsed.behavioralTendencies.length > 0
      ? parsed.behavioralTendencies
      : ['Strikes rivals decisively', 'Forms tactical alliances'];

    const rivalArchetypes = Array.isArray(parsed?.rivalArchetypes) && parsed.rivalArchetypes.length > 0
      ? parsed.rivalArchetypes
      : ['careerist', 'capitalist'];

    const color = parsed?.color || {
      primary: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.12)',
      border: 'rgba(59, 130, 246, 0.5)',
      text: '#60a5fa',
      glow: 'rgba(59, 130, 246, 0.3)',
      gradient: 'from-blue-600/20 to-slate-900',
    };

    const avatar = parsed?.avatar || {
      icon: 'User',
      svgType: 'landmark',
    };

    return {
      id: codename,
      name,
      codename,
      archetype,
      archetypeTitle,
      titleRole,
      slogan,
      ideology,
      personality,
      speakingStyle,
      motivations,
      strengths,
      weaknesses,
      behavioralTendencies,
      rivalArchetypes,
      color,
      avatar,
      systemPrompt,
      isCustom: true,
    };
  }

  /**
   * Construct tailored system & user prompts maintaining character & deep debate memory
   */
  private buildPrompt(
    candidate: Candidate, 
    payload: LLMRequestPayload
  ): { systemPrompt: string; userPrompt: string; isJsonExpected: boolean } {
    let systemPrompt = candidate.systemPrompt;
    let userPrompt = '';
    let isJsonExpected = false;

    const ctx = payload.historyContext || {};
    const electionTopic = ctx.electionTopic || 'The Industrial Stagnation & Cost of Living Crisis in the Republic of Valoria';

    switch (payload.action) {
      case 'campaign_speech': {
        const sloganSnippet = candidate.slogan ? `Campaign Slogan: "${candidate.slogan}"\n` : '';
        const ideologySnippet = candidate.ideology ? `Core Ideology: ${candidate.ideology}\n` : '';
        const rivalSnippet = candidate.rivalArchetypes && candidate.rivalArchetypes.length > 0 
          ? `Ideological Opposites/Rivals: ${candidate.rivalArchetypes.join(', ')}\n` 
          : '';

        userPrompt = `ROUND 1: PRESIDENTIAL CAMPAIGN ADDRESS & STUMP SPEECH.
NATIONAL CRISIS FOCUS: "${electionTopic}"
${sloganSnippet}${ideologySnippet}${rivalSnippet}
You are taking the stage on live national television to deliver your official presidential campaign address to the voters of Valoria.

PRIMARY GOAL: PROMOTE YOURSELF, YOUR PLATFORM, AND YOUR VISION.
In MAXIMUM 40 WORDS:
- Boldly pitch why YOU must be elected President of the Republic of Valoria.
- Present your signature solution to "${electionTopic}".
- Inspire the electorate with your core philosophy, energy, and leadership strengths.
- DO NOT default to attacking or rebutting the candidate who spoke before you. This round is for promoting YOUR platform and inspiring voters to support you.
- (Optional): If you take a brief swipe, only aim it at your ideological opposites (${candidate.rivalArchetypes?.join(', ') || 'corrupt elites'}), but ensure the majority of your speech champions YOUR vision.
- Do NOT use generic opening greetings ("Hello fellow citizens", "I stand before you"). Jump straight into your message with fierce conviction.
- CRITICAL FORMAT RULE: NEVER prefix your output with your name, a character tag, or a colon (e.g. NEVER write "${candidate.name.split(' ')[0]}:"). Start directly with your spoken speech.
- Stay strictly in character as ${candidate.name} (${candidate.archetypeTitle} - ${candidate.titleRole}).
- Return clean speech text only, strictly under 40 words.`;
        break;
      }

      case 'attack': {
        const targetCandidate = payload.targetId ? CANDIDATE_MAP.get(payload.targetId) : null;
        const targetName = targetCandidate ? targetCandidate.name : 'your opponent';
        const targetFirstName = targetCandidate ? targetCandidate.name.split(' ')[0] : 'Rival';
        const targetRole = targetCandidate ? `${targetCandidate.archetypeTitle} (${targetCandidate.titleRole})` : 'an opponent';
        const targetSlogan = targetCandidate ? targetCandidate.slogan : '';
        const targetQuote = ctx.targetSpeechQuote || '';
        const targetWeaknesses = ctx.targetWeaknesses || targetCandidate?.weaknesses || [];

        let betrayalSnippet = '';
        if (ctx.bribeBetrayals && ctx.bribeBetrayals.length > 0) {
          const betrayalOnTarget = ctx.bribeBetrayals.find(b => b.betrayerId === payload.targetId);
          if (betrayalOnTarget) {
            betrayalSnippet = `\n⚠️ SCANDALOUS BETRAYAL: ${targetName} took a $${betrayalOnTarget.bribeAmount} bribe from ${betrayalOnTarget.victimName} in the Capitol backroom and stabbed them in the back!\n`;
          }
        }

        let contextSnippet = '';
        if (ctx.recentAttacks && ctx.recentAttacks.length > 0) {
          contextSnippet = `\nRecent Clashes in this round:\n` + ctx.recentAttacks
            .slice(-4)
            .map(a => `- ${a.attackerName} challenged ${a.targetName}: "${a.text}"`)
            .join('\n');
        }

        userPrompt = `Round ${payload.round}: LIVE ATTACK ROUND.
You are live on stage at the national televised presidential debate, publicly attacking your rival: ${targetName} (${targetRole}).
Slogan: "${targetSlogan}"
${betrayalSnippet}${targetQuote ? `TARGET'S SPOKEN QUOTE: "${targetQuote}"\n` : ''}${targetWeaknesses.length > 0 ? `TARGET VULNERABILITIES: ${targetWeaknesses.join('; ')}\n` : ''}${contextSnippet}

ANTI-FORMULA & STYLE RULES (CRITICAL):
- NEVER format your output as a script label, character tag, or definition list (e.g. NEVER write "${targetFirstName}: [Explanation]", "${targetName}: ...", or "[Name]: [Adjective] person who...").
- NEVER start your sentence with a name followed by a colon or dash.
- Speak in authentic, fiery live debate rhetoric with dynamic sentence structure:
  * Either confront them directly ("You stood on this stage and claimed...", "Don't let them deceive you...", "Your voting record is a betrayal to our families...")
  * Or call them out to the voters ("Look at what they did to Iron Valley...", "Their economic fantasy will bankrupt every household in Valoria...", "Behind closed doors, they took millions from...").
- Ruthlessly attack ${targetName}'s exact words, economic hypocrisy, donor ties, or fitness to lead Valoria.
- Stay completely in character as ${candidate.name} (${candidate.archetypeTitle}).
- Return clean, spoken attack speech text only. MAXIMUM 30 WORDS.`;
        break;
      }

      case 'backroom_pact': {
        isJsonExpected = true;
        const receiver = payload.targetId ? CANDIDATE_MAP.get(payload.targetId) : null;
        const receiverName = receiver ? `${receiver.name} (${receiver.archetypeTitle})` : 'your potential ally';
        const allowedTargets = payload.activeCandidateIds
          .filter(id => id !== candidate.id && id !== payload.targetId)
          .map(id => {
            const c = CANDIDATE_MAP.get(id);
            return `"${id}" (${c?.name} - ${c?.archetypeTitle})`;
          })
          .join(', ');

        const proposerBudget = ctx.proposerBudget ?? 100;
        const receiverBudget = ctx.receiverBudget ?? 100;

        let contextSnippet = '';
        if (ctx.recentAttacks && ctx.recentAttacks.length > 0) {
          contextSnippet = `\nRecent Debate Clashes:\n` + ctx.recentAttacks
            .slice(-3)
            .map(a => `- ${a.attackerName} targeted ${a.targetName}`)
            .join('\n');
        }

        userPrompt = `Round ${payload.round}: SECRET BACKROOM DEAL / LEAKED CAPITOL CCTV FEED.
You (${candidate.name}, Balance: $${proposerBudget}) are privately whispering to ${receiverName} (Balance: $${receiverBudget}) in a shadowy Capitol corridor.
You want to coordinate your elimination votes against ONE target: [${allowedTargets}].
You can offer a $20 BRIBE from your campaign treasury to secure their vote!
${contextSnippet}

In MAXIMUM 25 WORDS:
- Deliver a tense, high-stakes whispered proposal offering mutual benefit or offering a $20 cash bribe to take down the mutual rival.
- Stay completely in character as ${candidate.name}.
- Do NOT prefix with script labels or colons.

You MUST return a JSON object with this exact schema:
{
  "targetId": "candidate_id",
  "offerBribe": true,
  "whisper": "1-2 sentence whispered deal or bribe (max 25 words)",
  "receiverDecision": "accept"
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
        if (ctx.recentAttacks && ctx.recentAttacks.length > 0) {
          contextSnippet = `\nDebate clashes so far:\n` + ctx.recentAttacks
            .slice(-4)
            .map(a => `- ${a.attackerName} attacked ${a.targetName}: "${a.text}"`)
            .join('\n');
        }

        let pactContext = '';
        if (ctx.activePact) {
          const ally = CANDIDATE_MAP.get(ctx.activePact.allyId);
          const agreedTarget = CANDIDATE_MAP.get(ctx.activePact.agreedTargetId);
          pactContext = `
SECRET BACKROOM PACT & TACTICAL BETRAYAL DILEMMA:
In the Capitol cloakroom, you shook hands with ${ally?.name} (${ally?.titleRole}) to coordinate votes against "${agreedTarget?.id}" (${agreedTarget?.name}).
However, Valorian politics is ruthless:
- OPTION A (HONOR PACT): Vote for "${agreedTarget?.id}" as promised to build trust.
- OPTION B (TACTICAL BETRAYAL): If ${ally?.name} is a dangerous long-term threat, or if you suspect they might betray you, you CAN STAB ${ally?.name} IN THE BACK and vote for "${ally?.id}" or another heavyweight.
Weigh loyalty vs cutthroat ambition!
`;
        }

        userPrompt = `Round ${payload.round}: CONFIDENTIAL ELIMINATION BALLOT.
You must secretly vote to ELIMINATE ONE candidate from the presidential race.
Rules:
1. You CANNOT vote for yourself (${candidate.id}).
2. You MUST pick exactly ONE ID from: [${candidatesToVote}].
3. Vote based on political survival, rival threats, backroom pacts, or tactical betrayals.
${pactContext}${contextSnippet}

You MUST return a JSON object with this exact schema:
{
  "vote": "candidate_id",
  "reason": "sharp, authentic private political calculation (max 20 words)"
}`;
        break;
      }

      case 'exit_words': {
        const betrayal = ctx.betrayalContext;
        let betrayalSnippet = '';
        if (betrayal && betrayal.wasBetrayed) {
          betrayalSnippet = `\n⚠️ BACKROOM BETRAYAL: Your supposed ally ${betrayal.betrayedByCandidateName || 'an ally'} stabbed you in the back and cast the deciding vote against you!`;
        }
        const voteCountText = betrayal?.voteCountAgainstSelf ? `with ${betrayal.voteCountAgainstSelf} elimination votes` : '';

        userPrompt = `You have just been ELIMINATED from the Presidential Race in Round ${payload.round} ${voteCountText}!
${betrayalSnippet}

In MAXIMUM 30 WORDS:
- Deliver your dramatic, authentic concession statement or parting words to Valoria's voters.
- Reflect your archetype: bitter defiance, righteous warning of the Republic's doom, rallying your supporters, or graceful statesmanship.
- CRITICAL: NEVER prefix with your name, script labels, or colons.
- Stay in character as ${candidate.name}. Return clean text only, strictly under 30 words.`;
        break;
      }

      case 'final_speech': {
        const finalistsList = (payload.finalistIds || [])
          .filter(id => id !== candidate.id)
          .map(id => {
            const c = CANDIDATE_MAP.get(id);
            return `${c?.name} (${c?.archetypeTitle} - ${c?.titleRole})`;
          })
          .join(' and ');

        let eliminatedSummary = '';
        if (ctx.eliminatedCandidatesSummary && ctx.eliminatedCandidatesSummary.length > 0) {
          eliminatedSummary = `\nEliminated along the way: ` + ctx.eliminatedCandidatesSummary
            .map(e => e.candidateName)
            .join(', ');
        }

        userPrompt = `THE FINAL PRESIDENTIAL SHOWDOWN (Top 3 Finalists).
You are delivering your CLOSING ARGUMENT to the Grand Jury of all participating candidates and the nation.
Your surviving rivals on stage: ${finalistsList}.${eliminatedSummary}
NATIONAL CRISIS MANDATE: "${electionTopic}"

In MAXIMUM 50 WORDS:
- Explain why YOU must be inaugurated President of the Republic of Valoria.
- Directly contrast your vision against the other two surviving finalists and explain why their plans are dangerous or bankrupt.
- Demand the Grand Jury's vote with presidential gravitas.
- CRITICAL: NEVER prefix with character names, speaker labels, or colons.
- Stay in character as ${candidate.name}. Return clean speech text only, strictly under 50 words.`;
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
          ? 'You were eliminated earlier in the debates and are now casting your vote as a Grand Juror.'
          : 'You are one of the 3 finalists voting for your peer.';

        let historyMemories = '';
        if (ctx.allClashesSummary && ctx.allClashesSummary.length > 0) {
          historyMemories = `\nKey Debate Memory:\n` + ctx.allClashesSummary.slice(-5).join('\n');
        }

        userPrompt = `GRAND JURY PRESIDENTIAL ELECTION VOTE.
${juryStatus}
Candidates on the presidential ballot: [${finalistsDesc}].${historyMemories}
Rules:
1. You CANNOT vote for yourself.
2. Cast your vote based on who earned your respect, shared your policy goals, or vote against whoever betrayed/insulted you during the election.

Return a JSON object:
{
  "vote": "finalist_id",
  "reason": "sharp private jury reasoning (max 20 words)"
}`;
        break;
      }

      case 'victory_speech': {
        userPrompt = `CONGRATULATIONS! You have won the election and are officially inaugurated as PRESIDENT OF THE REPUBLIC OF VALORIA!
NATIONAL CRISIS MANDATE: "${electionTopic}"

In MAXIMUM 50 WORDS:
- Deliver your triumphant, commanding inaugural presidential victory address to the nation and the Grand Jury.
- Acknowledge the grueling battle, address your defeated opponents, and proclaim your first executive decree.
- CRITICAL: NEVER prefix with your name, speaker labels, or colons.
- Stay completely in character as ${candidate.name}. Return clean speech text only, strictly under 50 words.`;
        break;
      }

      case 'generate_character': {
        isJsonExpected = true;
        const userIdea = payload.customPrompt || 'A compelling, realistic presidential candidate running for President of the Republic of Valoria';
        systemPrompt = `You are a master political writer for the Republic of Valoria (a fictional high-stakes modern presidential reality election).
You MUST respond with a single, strictly valid JSON object.
CRITICAL FORMATTING INSTRUCTIONS:
- Return ONLY the raw JSON object starting with '{' and ending with '}'.
- Do NOT wrap in markdown code fences (no \`\`\`json or \`\`\`).
- Do NOT include any explanations, greetings, or conversational text.
- Strictly escape all quotation marks inside strings.
- Do NOT leave trailing commas before closing brackets or braces.`;

        userPrompt = `Generate a realistic, grounded, and dramatic political contender running for President of the Republic of Valoria based on this concept:
"${userIdea}"

Format your response strictly following this JSON template:
{
  "name": "Marcus Vance",
  "codename": "THE CLEAN REVOLUTIONARY",
  "archetype": "environmentalist",
  "archetypeTitle": "Green Grid Pioneer",
  "titleRole": "Former Clean Energy Secretary",
  "slogan": "Power Valoria with 100% Clean Energy Sovereignty!",
  "ideology": "Rapid energy transition, public-private fusion investment, and green industrial jobs.",
  "personality": "Visionary, analytical, persuasive, and fiercely committed to modernization.",
  "speakingStyle": "Data-rich, inspiring, articulate, and sharp on economic accountability.",
  "motivations": "To modernize Valoria into the global leader in sustainable energy and clean tech.",
  "strengths": ["Deep energy expertise", "Inspiring rally speaker", "Strong business credibility"],
  "weaknesses": ["Impatient with traditional lobbies", "High upfront capital costs"],
  "behavioralTendencies": ["Attacks corporate polluters and old-money lobbyists", "Forms bold green alliances"],
  "rivalArchetypes": ["capitalist", "careerist"],
  "color": {
    "primary": "#10b981",
    "bg": "rgba(16, 185, 129, 0.12)",
    "border": "rgba(16, 185, 129, 0.5)",
    "text": "#34d399",
    "glow": "rgba(16, 185, 129, 0.3)",
    "gradient": "from-emerald-600/20 to-slate-900"
  },
  "avatar": {
    "icon": "leaf",
    "svgType": "leaf"
  },
  "systemPrompt": "You are Marcus Vance, Green Grid Pioneer and Former Clean Energy Secretary running for President of the Republic of Valoria. Slogan: 'Power Valoria with 100% Clean Energy Sovereignty!'. CORE IDENTITY: Elite clean energy pioneer who entered politics to dismantle fossil-fuel subsidies and rebuild industrial towns with modern green factories. RHETORICAL VOICE: Passionate energy, sharp technical data, unyielding conviction. ANTI-CLICHÉ: Avoid generic filler. Keep speeches strictly under the specified word limit."
}

Rules for fields:
1. "archetype" must be one of: "populist", "technocrat", "hawk", "reformer", "capitalist", "socialist", "environmentalist", "conspiracy", "careerist", "traditionalist", "wildcard".
2. "svgType" must be one of: "landmark", "scale", "shield", "dollar", "cpu", "hammer", "leaf", "eye", "flame", "zap", "crown", "globe", "swords", "radio", "award", "activity", "star", "building", "users", "briefcase".`;
        break;
      }
    }

    return { systemPrompt, userPrompt, isJsonExpected };
  }
}

export const nineRouterService = new NineRouterService();
