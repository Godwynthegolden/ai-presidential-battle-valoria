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

    const maxTokens = payload.action === 'generate_character' ? 3000 : 2048;

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
        const validCandidates = payload.activeCandidateIds.filter(id => id !== candidate.id);
        const validTargets = payload.activeCandidateIds.filter(id => id !== candidate.id && id !== payload.targetId);
        
        let rawWhisper = parsed?.whisper 
          ? parsed.whisper.replace(/^["']|["']$/g, '').trim()
          : (rawText.replace(/\{[\s\S]*\}|^["']|["']$/g, '').trim() || '');

        // Detect if whisper starts with or explicitly addresses a candidate by name (e.g. "Chloe, take..." or "Dmitri: let's...")
        let detectedAddresseeId: string | null = null;
        const vocativeMatch = rawWhisper.match(/^["']?([A-Za-z]+(?:\s+[A-Za-z]+)?)[,:\-—]/);
        if (vocativeMatch && vocativeMatch[1]) {
          const matchName = vocativeMatch[1].trim();
          const matchedId = this.resolveCandidateIdFromNameOrAlias(matchName, validCandidates);
          if (matchedId && validCandidates.includes(matchedId)) {
            detectedAddresseeId = matchedId;
          }
        }

        // Resolve target candidate (person negotiated with)
        const rawTargetCandidate = parsed?.targetCandidateId || parsed?.targetId || payload.targetId;
        let healedTargetCandId = rawTargetCandidate ? this.resolveCandidateIdFromNameOrAlias(rawTargetCandidate, validCandidates) : null;
        if (detectedAddresseeId && validCandidates.includes(detectedAddresseeId)) {
          healedTargetCandId = detectedAddresseeId;
        }
        const targetCandidateId = healedTargetCandId || payload.targetId || validCandidates[0] || validTargets[0];

        // Resolve elimination target candidate (must not be proposer and must not be targetCandidateId)
        const validElimTargets = validCandidates.filter(id => id !== targetCandidateId);
        const rawElimTarget = parsed?.agreedEliminationTargetId || parsed?.agreedTargetId;
        let healedElimTarget = rawElimTarget ? this.resolveCandidateIdFromNameOrAlias(rawElimTarget, validCandidates) : null;
        if (healedElimTarget === targetCandidateId || healedElimTarget === candidate.id) {
          healedElimTarget = null;
        }
        const agreedTargetId = healedElimTarget || validElimTargets[0] || validTargets[0] || validCandidates[0];

        // Private strategy extraction
        const privateStrategy = parsed?.privateStrategy 
          ? parsed.privateStrategy.replace(/^["']|["']$/g, '').trim()
          : `Align tactically to eliminate ${CANDIDATE_MAP.get(agreedTargetId)?.name || agreedTargetId} while preserving treasury.`;

        // Action Type Resolution ('bribe' | 'offer' | 'pass')
        let actionType: 'bribe' | 'offer' | 'pass' = 'pass';
        if (parsed?.actionType === 'bribe' || parsed?.actionType === 'offer' || parsed?.actionType === 'pass') {
          actionType = parsed.actionType;
        } else if (parsed?.offerBribe === true || parsed?.bribeOffered === true) {
          actionType = 'bribe';
        } else if (parsed?.offerPrice || parsed?.offeredPrice) {
          actionType = 'offer';
        } else {
          actionType = (ctx.proposerBudget ?? 100) >= 30 ? 'bribe' : 'pass';
        }

        const proposerBudget = ctx.proposerBudget ?? 100;
        let bribeAmount = 0;
        let upfrontPaid = 0;
        let escrowPending = 0;
        let offerPrice = typeof parsed?.offerPrice === 'number' ? Math.max(20, Math.min(40, parsed.offerPrice)) : 30;

        // Enforce strict $30 treasury limit for bribes
        if (actionType === 'bribe') {
          if (proposerBudget < 30) {
            actionType = 'offer';
          }
        }

        if (actionType === 'bribe') {
          bribeAmount = 30;
          upfrontPaid = 15;
          escrowPending = 15;
        } else if (actionType === 'offer') {
          bribeAmount = offerPrice;
          upfrontPaid = Math.floor(offerPrice / 2);
          escrowPending = offerPrice - upfrontPaid;
        }

        // Receiver Decision Resolution
        let receiverDecision: 'accept' | 'decline' | 'accept_and_betray' = 'accept';
        if (['accept', 'decline', 'accept_and_betray'].includes(parsed?.receiverDecision)) {
          receiverDecision = parsed.receiverDecision;
        } else {
          const receiver = CANDIDATE_MAP.get(targetCandidateId);
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

        const dealAccepted = (actionType === 'bribe' || actionType === 'offer') && (receiverDecision === 'accept' || receiverDecision === 'accept_and_betray');

        const recipient = CANDIDATE_MAP.get(targetCandidateId);
        const recipientFirstName = recipient?.name.split(' ')[0] || '';
        const targetCand = CANDIDATE_MAP.get(agreedTargetId);
        const targetFirstName = targetCand?.name.split(' ')[0] || '';

        if (!rawWhisper) {
          rawWhisper = actionType === 'bribe' 
            ? `${recipientFirstName}, take this $30 bribe. $15 now, $15 after we vote out ${targetFirstName || 'our rival'}.`
            : actionType === 'offer'
            ? `${recipientFirstName}, pay me $${offerPrice} and I'll deliver my vote against ${targetFirstName || 'our rival'}.`
            : `I'm keeping my powder dry. ${targetFirstName || 'Our rival'} won't see this coming.`;
        }

        let whisper = rawWhisper.replace(/^[^:]+:\s*/, '').replace(/^["']|["']$/g, '').trim();

        // Ensure whisper dialogue matches targetCandidateId
        if (vocativeMatch && vocativeMatch[1] && recipientFirstName) {
          const addressedName = vocativeMatch[1].trim();
          const addressedCand = this.resolveCandidateIdFromNameOrAlias(addressedName, validCandidates);
          if (addressedCand && addressedCand !== targetCandidateId) {
            whisper = whisper.replace(new RegExp(`^["']?${addressedName}[,:\-—]\\s*`, 'i'), `${recipientFirstName}, `);
          }
        } else if (recipientFirstName && !whisper.toLowerCase().startsWith(recipientFirstName.toLowerCase())) {
          whisper = `${recipientFirstName}, ${whisper.charAt(0).toLowerCase() + whisper.slice(1)}`;
        }

        return {
          text: whisper,
          targetCandidateId,
          agreedTargetId,
          whisperText: whisper,
          privateStrategy,
          actionType,
          bribeOffered: actionType === 'bribe',
          bribeAmount,
          upfrontPaid,
          escrowPending,
          offerPrice,
          receiverDecision,
          bribeAccepted: dealAccepted,
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
   * Strips <think>...</think> tags emitted by reasoning models (DeepSeek R1, etc.)
   */
  public stripThinkingTags(text: string): string {
    if (!text) return '';
    return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  }

  /**
   * Resilient fallback parser that extracts intended content if an LLM (e.g. DeepSeek reasoning model)
   * exhausts tokens inside reasoning_content or places its draft in reasoning_content.
   */
  public extractOutputFromReasoning(reasoning: string, isJsonExpected: boolean): string {
    if (!reasoning || typeof reasoning !== 'string') return '';
    const clean = reasoning.trim();

    if (isJsonExpected) {
      // 1. Try to find a JSON object in the reasoning text
      const firstBrace = clean.indexOf('{');
      const lastBrace = clean.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        return clean.substring(firstBrace, lastBrace + 1);
      }
    }

    // 2. Search for explicit draft / final quote patterns, e.g. Draft: "...", Final: "...", etc.
    const quoteMatches = Array.from(clean.matchAll(/["“]([^"”]{10,350})["”]/g));
    if (quoteMatches.length > 0) {
      // Pick the last substantial quote (usually the final drafted speech)
      const candidateQuote = quoteMatches[quoteMatches.length - 1][1].trim();
      if (candidateQuote.length >= 10) {
        return candidateQuote;
      }
    }

    // 3. Fallback: extract the last non-empty line / sentence that looks like dialogue
    const lines = clean.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const nonMetaLines = lines.filter(l => 
      !l.startsWith('1.') && 
      !l.startsWith('2.') && 
      !l.startsWith('3.') && 
      !l.toLowerCase().startsWith('let\'s') && 
      !l.toLowerCase().startsWith('need to') && 
      !l.toLowerCase().startsWith('count:') &&
      !l.toLowerCase().startsWith('the user asks')
    );

    if (nonMetaLines.length > 0) {
      return nonMetaLines[nonMetaLines.length - 1].replace(/^["']|["']$/g, '');
    }

    return clean.slice(-200).replace(/^["']|["']$/g, '');
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
    model: string = this.defaultModel,
    maxTokens: number = 2048
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
      max_completion_tokens: maxTokens,
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
        let content = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || '';
        const reasoningContent = data?.choices?.[0]?.message?.reasoning_content 
                              || data?.choices?.[0]?.message?.reasoning
                              || data?.choices?.[0]?.message?.thought
                              || data?.choices?.[0]?.message?.thoughts;

        if (typeof content === 'string') {
          content = this.stripThinkingTags(content);
        }

        // If content is empty but reasoning_content exists (e.g. DeepSeek reasoning token exhaustion), recover output from reasoning
        if ((!content || !content.trim()) && reasoningContent && typeof reasoningContent === 'string') {
          console.warn('[9router]: Content was empty, recovering output from reasoning_content...');
          content = this.extractOutputFromReasoning(reasoningContent, isJsonExpected);
        }

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
        let accumulatedReasoning = '';

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
              const reasoningDelta = chunk?.choices?.[0]?.delta?.reasoning_content
                                  || chunk?.choices?.[0]?.message?.reasoning_content;
              if (delta) {
                accumulatedContent += delta;
              }
              if (reasoningDelta) {
                accumulatedReasoning += reasoningDelta;
              }
            } catch {
              // Ignore single malformed chunk
            }
          }
        }

        accumulatedContent = this.stripThinkingTags(accumulatedContent);

        if (!accumulatedContent.trim() && accumulatedReasoning.trim()) {
          console.warn('[9router]: Stream content was empty, recovering output from accumulated reasoning_content...');
          accumulatedContent = this.extractOutputFromReasoning(accumulatedReasoning, isJsonExpected);
        }

        if (accumulatedContent.trim()) {
          return accumulatedContent.trim();
        }
      }

      // 3. Fallback: Check if the raw text is plain text
      if (rawResponseText.trim() && !rawResponseText.startsWith('<')) {
        return this.stripThinkingTags(rawResponseText.trim());
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
      
      // Match individual name parts (e.g. "Alvarez", "Rostova", "Vance", "Voronin", "Sterling", "Jackson")
      const nameParts = candName.replace(/["']/g, '').split(/\s+/).filter(p => p.length >= 3);
      if (nameParts.some(part => clean.includes(part.toLowerCase()) || part.toLowerCase().includes(clean))) return id;

      // Match ID parts (e.g. "jax", "alvarez", "art", "sterling", "dmitri", "voronin")
      const idParts = id.toLowerCase().split(/[-_]/).filter(p => p.length >= 3);
      if (idParts.some(part => clean.includes(part) || part.includes(clean))) return id;

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
- CRITICAL FORMAT & DIRECT OUTPUT RULES:
  * Output ONLY your final spoken speech directly.
  * Do NOT output internal reasoning, thinking steps, drafting notes, or preamble.
  * NEVER prefix your output with your name, a character tag, or a colon (e.g. NEVER write "${candidate.name.split(' ')[0]}:").
- Stay strictly in character as ${candidate.name} (${candidate.archetypeTitle} - ${candidate.titleRole}).
- Return clean speech text only, strictly under 40 words.`;
        break;
      }

      case 'attack': {
        const targetCandidate = payload.targetId ? (CANDIDATE_MAP.get(payload.targetId) || DEFAULT_CANDIDATES.find(c => c.id === payload.targetId)) : null;
        const targetName = targetCandidate ? targetCandidate.name : 'your opponent';
        const targetFirstName = targetCandidate ? targetCandidate.name.split(' ')[0] : 'Rival';
        const targetLastName = targetCandidate ? (targetCandidate.name.split(' ')[1] || '') : '';
        const targetRole = targetCandidate ? `${targetCandidate.archetypeTitle} (${targetCandidate.titleRole})` : 'an opponent';
        const targetSlogan = targetCandidate ? targetCandidate.slogan : '';
        const targetIdeology = targetCandidate ? targetCandidate.ideology : '';
        const targetQuote = ctx.targetSpeechQuote || '';
        const targetWeaknesses = ctx.targetWeaknesses || targetCandidate?.weaknesses || [];
        const targetHeat = ctx.targetHeatScore ?? 0;

        let betrayalSnippet = '';
        if (ctx.bribeBetrayals && ctx.bribeBetrayals.length > 0) {
          const betrayalOnTarget = ctx.bribeBetrayals.find(b => b.betrayerId === payload.targetId);
          if (betrayalOnTarget) {
            betrayalSnippet = `\n⚠️ CORRIDOR BETRAYAL EVIDENCE: ${targetName} pocketed a $${betrayalOnTarget.bribeAmount} bribe from ${betrayalOnTarget.victimName} and stabbed them in the back!\n`;
          }
        }

        let rebuttalSnippet = '';
        if (ctx.activeAccusationOnSpeaker) {
          const accuserName = ctx.activeAccusationOnSpeaker.attackerName;
          const accuserFirstName = accuserName.split(' ')[0];
          rebuttalSnippet = `
⚠️ ACTIVE ACCUSATION AGAINST YOU:
${accuserName} attacked you earlier on stage, saying: "${ctx.activeAccusationOnSpeaker.text}"
REBUTTAL RULE: You MUST open your speech with a brief, sharp defense deflecting ${accuserFirstName}'s accusation before turning the room's fire onto ${targetName}!
`;
        }

        let contextSnippet = '';
        if (ctx.recentAttacks && ctx.recentAttacks.length > 0) {
          contextSnippet = `\nDebate Clashes this Round:\n` + ctx.recentAttacks
            .slice(-4)
            .map(a => `- ${a.attackerName} challenged ${a.targetName}: "${a.text}"`)
            .join('\n');
        }

        userPrompt = `Round ${payload.round}: LIVE EMERGENCY MEETING // DEBATE ATTACK ROUND.
NATIONAL CRISIS TOPIC: "${electionTopic}"

TARGET TO ATTACK: "${targetName}" (${targetRole})
Target Slogan: "${targetSlogan}"
${targetIdeology ? `Target Ideology: ${targetIdeology}\n` : ''}${targetHeat > 0 ? `Target Debate Heat: ${targetHeat} prior accusation(s) this round.\n` : ''}${rebuttalSnippet}${betrayalSnippet}${targetQuote ? `TARGET'S SPOKEN QUOTE: "${targetQuote}"\n` : ''}${targetWeaknesses.length > 0 ? `TARGET VULNERABILITIES: ${targetWeaknesses.join('; ')}\n` : ''}${contextSnippet}

MANDATORY TARGET NAMING & CONVERSATIONAL RULES:
- You are attacking ONLY "${targetName}".
- You MUST refer to your target as "${targetName}", "${targetFirstName}", or "${targetLastName}".
- NEVER call your target by an incorrect name, nickname, raw ID, or alias.
- DO NOT obsess over dollar amounts, treasury balances, or bank accounts unless directly attacking corporate greed. Focus primarily on their political hypocrisy, dangerous policies, broken track record, incompetence, or corrupt character!

STRATEGIC 3-PART "EMERGENCY MEETING" SPEECH FORMULA:
1. [REBUTTAL DEFENSE]: (If accused above) Dismiss the accusation against you in 1 punchy sentence.
2. [EVIDENCE / IDEOLOGICAL ATTACK]: Attack ${targetName}'s specific policy failures, hypocrisy, dangerous platform for Valoria, or untrustworthy track record.
3. [CALL TO ACTION / VOTE CALL]: Explicitly rally the room and the voters to ELIMINATE ${targetName} on this round's ballot (e.g. "We must unite and vote out ${targetFirstName}!", "Join me in eliminating ${targetFirstName} tonight!").

ANTI-FORMULA & DIRECT OUTPUT RULES (CRITICAL):
- Output ONLY the final spoken words directly. Do NOT output internal reasoning, drafting notes, or explanations.
- NEVER format your output as a script label, character tag, or definition list (e.g. NEVER write "${candidate.name.split(' ')[0]}:").
- NEVER start your sentence with a name followed by a colon or dash.
- Speak with fierce conviction, calculating game-theory intelligence, and authentic live debate fire.
- Stay strictly in character as ${candidate.name} (${candidate.archetypeTitle}).
- MAXIMUM 35 WORDS.`;
        break;
      }

      case 'backroom_pact': {
        isJsonExpected = true;
        const receiver = payload.targetId ? CANDIDATE_MAP.get(payload.targetId) : null;
        const receiverName = receiver ? `${receiver.name} (${receiver.archetypeTitle})` : 'your potential ally';
        
        // Active candidates with balances and roles
        const candidateTreasuries = ctx.candidateTreasuries || {};
        const activeCandidatesList = payload.activeCandidateIds
          .map(id => {
            const c = CANDIDATE_MAP.get(id);
            const bal = candidateTreasuries[id] ?? 100;
            return `"${id}" (${c?.name} - ${c?.archetypeTitle}, Balance: $${bal})`;
          })
          .join('\n  - ');

        const allowedTargets = payload.activeCandidateIds
          .filter(id => id !== candidate.id)
          .map(id => {
            const c = CANDIDATE_MAP.get(id);
            return `"${id}" (${c?.name})`;
          })
          .join(', ');

        const proposerBudget = ctx.proposerBudget ?? candidateTreasuries[candidate.id] ?? 100;
        const affordableBribes = Math.floor(proposerBudget / 30);

        let debateConsensusSnippet = '';
        if (ctx.debateConsensusLeader && ctx.debateConsensusLeader.heatScore > 0) {
          debateConsensusSnippet = `
🔥 ON-STAGE DEBATE CONSENSUS:
${ctx.debateConsensusLeader.candidateName} is under heavy fire on stage with ${ctx.debateConsensusLeader.heatScore} accusations from (${ctx.debateConsensusLeader.accusers.join(', ')}).
Strategic Angle: You can coordinate with your partner to seal ${ctx.debateConsensusLeader.candidateName.split(' ')[0]}'s elimination, or orchestrate a secret counter-blindside!
`;
        }

        let contextSnippet = '';
        if (ctx.recentAttacks && ctx.recentAttacks.length > 0) {
          contextSnippet = `\nRecent Debate Clashes:\n` + ctx.recentAttacks
            .slice(-4)
            .map(a => `- ${a.attackerName} targeted ${a.targetName}: "${a.text}"`)
            .join('\n');
        }

        userPrompt = `Round ${payload.round}: SECRET BACKROOM NEGOTIATION / LEAKED CAPITOL CCTV FEED.
You are ${candidate.name} (${candidate.archetypeTitle}, Balance: $${proposerBudget}).
Surveillance is recording unmonitored Capitol hallways. All active candidates are maneuvering before the secret ballot:
Active Candidates & Treasuries:
  - ${activeCandidatesList}
${debateConsensusSnippet}${contextSnippet}

YOUR STRATEGIC CHOICES:
1. "bribe" (Costs $30 total: $15 upfront to receiver + $15 held in escrow until they vote for your target).
   - Requires balance >= $30. You currently have $${proposerBudget} (can afford ${affordableBribes} bribe${affordableBribes === 1 ? '' : 's'}).
   - If balance < $30, you CANNOT bribe others!
2. "offer" (Sell your vote to another candidate for $20 to $40).
   - You offer to vote out whoever they want in exchange for $20-$40 (50% upfront + 50% upon verified vote).
3. "pass" (Plot solo / observe).
   - Save your money for $40 vote bailouts during the ballot reveal or plan a solo ambush.

CRITICAL CONSISTENCY & ADDRESSING RULES:
- "targetCandidateId": Pick the EXACT ID of the candidate you are privately approaching in the hallway from: [${allowedTargets}].
- "agreedEliminationTargetId": Pick the EXACT ID of the rival candidate you want to eliminate together from: [${allowedTargets}] (must NOT be yourself or targetCandidateId).
- "whisper": In MAXIMUM 25 WORDS, deliver your whispered pitch directly to your chosen partner. ALWAYS start by addressing targetCandidateId by their first name (e.g. "Elena, ...", "Arthur, ...", "Jackson, ...") and explicitly mention the rival you are targeting. NEVER address a different person!
- Formulate your secret inner strategy ("privateStrategy") to calculate your optimal survival path.
- Choose your action ("actionType": "bribe" | "offer" | "pass").
- If negotiating, model their likely reaction ("receiverDecision": "accept" | "decline" | "accept_and_betray").
- Return ONLY the raw JSON object below. Do NOT output markdown fences or explanatory text.

You MUST return a JSON object with this exact schema:
{
  "privateStrategy": "sharp, confidential tactical calculation (max 30 words)",
  "actionType": "bribe",
  "targetCandidateId": "candidate_id_to_negotiate_with",
  "agreedEliminationTargetId": "candidate_id_to_eliminate",
  "offerPrice": 30,
  "whisper": "1-2 sentence whispered proposal addressing targetCandidateId by first name (max 25 words)",
  "receiverDecision": "accept"
} `;
        break;
      }

      case 'elimination_vote': {
        isJsonExpected = true;
        const allowedTargets = payload.activeCandidateIds.filter(id => id !== candidate.id);
        const candidatesToVote = allowedTargets
          .map(id => {
            const c = CANDIDATE_MAP.get(id);
            const bal = ctx.candidateTreasuries?.[id] ?? 100;
            return `"${id}" (${c?.name} - ${c?.archetypeTitle}, $${bal})`;
          })
          .join(', ');

        let debateConsensusSnippet = '';
        if (ctx.debateConsensusLeader && ctx.debateConsensusLeader.heatScore > 0) {
          debateConsensusSnippet = `
🔥 ON-STAGE DEBATE CONSENSUS & BANDWAGON:
Primary Debate Target: "${ctx.debateConsensusLeader.candidateId}" (${ctx.debateConsensusLeader.candidateName}) with ${ctx.debateConsensusLeader.heatScore} accusations on stage.
Contenders who called for their elimination: ${ctx.debateConsensusLeader.accusers.join(', ')}.
`;
        }

        let contextSnippet = '';
        if (ctx.recentAttacks && ctx.recentAttacks.length > 0) {
          contextSnippet = `\nDebate clashes so far:\n` + ctx.recentAttacks
            .slice(-4)
            .map(a => `- ${a.attackerName} attacked ${a.targetName}: "${a.text}"`)
            .join('\n');
        }

        let strategyContext = '';
        if (ctx.candidateSecretStrategy) {
          strategyContext = `
YOUR CONFIDENTIAL STRATEGY RECORDED IN THE CAPITOL CORRIDORS:
"${ctx.candidateSecretStrategy}"
`;
        }

        let pactContext = '';
        if (ctx.activePactsForVoter && ctx.activePactsForVoter.length > 0) {
          const pactDetails = ctx.activePactsForVoter.map(p => {
            const isProposer = p.proposerId === candidate.id;
            const partner = CANDIDATE_MAP.get(isProposer ? p.receiverId : p.proposerId);
            const target = CANDIDATE_MAP.get(p.agreedTargetId);
            if (p.actionType === 'bribe') {
              return isProposer
                ? `- You paid $30 to bribe ${partner?.name} to eliminate "${target?.id}" (${target?.name}) [$15 pending escrow].`
                : `- You received $15 upfront from ${partner?.name} to eliminate "${target?.id}" (${target?.name}) [+$15 pending escrow if you vote for ${target?.name}; forfeited on betrayal].`;
            } else if (p.actionType === 'offer') {
              return isProposer
                ? `- You offered your vote to ${partner?.name} against "${target?.id}" for $${p.bribeAmount} [+$${p.escrowPending} pending escrow if kept].`
                : `- You bought ${partner?.name}'s vote against "${target?.id}" for $${p.bribeAmount} [$${p.escrowPending} escrow held].`;
            }
            return `- Pact with ${partner?.name} against "${target?.id}".`;
          }).join('\n');

          pactContext = `
ACTIVE BACKROOM CONTRACTS & ESCROW STAKES THIS ROUND:
${pactDetails}
(Betrayal Rule: If you took upfront money and vote for someone else, you forfeit the remaining escrow payout!)
`;
        } else if (ctx.activePact) {
          const ally = CANDIDATE_MAP.get(ctx.activePact.allyId);
          const agreedTarget = CANDIDATE_MAP.get(ctx.activePact.agreedTargetId);
          pactContext = `
SECRET BACKROOM PACT:
You shook hands with ${ally?.name} (${ally?.titleRole}) to coordinate votes against "${agreedTarget?.id}" (${agreedTarget?.name}).
`;
        }

        userPrompt = `Round ${payload.round}: CONFIDENTIAL ELIMINATION BALLOT.
You must secretly vote to ELIMINATE ONE candidate from the presidential race.
Contenders available to vote against:
  [${candidatesToVote}]

${debateConsensusSnippet}${strategyContext}${pactContext}${contextSnippet}

YOUR STRATEGIC VOTING AVENUES:
1. [BANDWAGON]: Join the on-stage debate consensus and vote to eliminate the primary debate target (${ctx.debateConsensusLeader?.candidateName || 'the leading target'}).
2. [HONOR CONTRACT]: Fulfill your secret $30 corridor pact to secure the remaining escrow cash payout.
3. [BLINDSIDE / RETALIATION]: Blindside the richest contender to drain their treasury, or strike back at someone who attacked you in the debate!

DIRECT OUTPUT RULES:
- Return ONLY the raw JSON object below. Do NOT output markdown code blocks, reasoning steps, or notes.
- You CANNOT vote for yourself (${candidate.id}).

You MUST return a JSON object with this exact schema:
{
  "vote": "candidate_id",
  "reason": "sharp, authentic private political calculation (max 20 words)"
}
`;
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

DIRECT OUTPUT RULES:
- In MAXIMUM 30 WORDS: Deliver your dramatic, authentic concession statement or parting words to Valoria's voters.
- Output ONLY the final spoken words directly. Do NOT output internal reasoning, drafting notes, or preamble.
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

DIRECT OUTPUT RULES:
- In MAXIMUM 50 WORDS: Explain why YOU must be inaugurated President of the Republic of Valoria.
- Directly contrast your vision against the other two surviving finalists and explain why their plans are dangerous or bankrupt.
- Demand the Grand Jury's vote with presidential gravitas.
- Output ONLY the final spoken words directly. Do NOT output internal reasoning, drafts, or preamble.
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

        let strategyReminder = '';
        if (ctx.candidateSecretStrategy) {
          strategyReminder = `\nYOUR STRATEGIC CAMPAIGN ETHOS:\n"${ctx.candidateSecretStrategy}"\n`;
        }

        userPrompt = `GRAND JURY PRESIDENTIAL ELECTION VOTE.
${juryStatus}
Candidates on the presidential ballot: [${finalistsDesc}].${strategyReminder}${historyMemories}
Rules:
1. You CANNOT vote for yourself.
2. Cast your vote based on who earned your respect, shared your policy goals, or vote against whoever betrayed/insulted you during the election.

DIRECT OUTPUT RULES:
- Return ONLY the raw JSON object below. Do NOT output markdown blocks, thinking tags, or conversational text.

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

DIRECT OUTPUT RULES:
- In MAXIMUM 50 WORDS: Deliver your triumphant, commanding inaugural presidential victory address to the nation and the Grand Jury.
- Acknowledge the grueling battle, address your defeated opponents, and proclaim your first executive decree.
- Output ONLY the final spoken words directly. Do NOT output internal reasoning, drafts, or preamble.
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
- Do NOT include any internal reasoning, draft commentary, explanations, greetings, or conversational text.
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
