import { GoogleGenAI } from '@google/genai';

// In-process rate limiter queue to avoid Gemini 429 (quota) errors
type QueueTask<T> = () => Promise<T>;

let isProcessingQueue = false;
let nextAvailableAt = 0;
const taskQueue: Array<{ run: QueueTask<any>; resolve: (v: any) => void; reject: (e: any) => void }> = [];

// Default gap between requests; tuned for free-tier limits (~10 rpm). Adjust via Retry-After hints when returned
let minIntervalMs = 3000; // Reduced from 7000ms to 3000ms for faster processing

async function processQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;
  try {
    while (taskQueue.length > 0) {
      const now = Date.now();
      const waitMs = Math.max(0, nextAvailableAt - now);
      if (waitMs > 0) {
        await new Promise(r => setTimeout(r, waitMs));
      }

      const { run, resolve, reject } = taskQueue.shift()!;
      try {
        const result = await run();
        resolve(result);
        nextAvailableAt = Date.now() + minIntervalMs;
      } catch (err: any) {
        const retryDelayMs = extractRetryDelayMs(err) ?? minIntervalMs;
        nextAvailableAt = Date.now() + retryDelayMs;
        reject(err);
      }
    }
  } finally {
    isProcessingQueue = false;
  }
}

function extractRetryDelayMs(err: any): number | null {
  const details = err?.details;
  if (Array.isArray(details)) {
    for (const d of details) {
      if (typeof d?.retryDelay === 'string') {
        const m = d.retryDelay.match(/^(\d+)(?:\.(\d+))?s$/);
        if (m) {
          const seconds = Number(m[1]);
          const frac = m[2] ? Number(`0.${m[2]}`) : 0;
          return Math.max(Math.floor((seconds + frac) * 1000), 1000);
        }
      }
    }
  }
  const msg: string | undefined = err?.message;
  if (msg) {
    const m = msg.match(/retry in\s+([0-9]+(?:\.[0-9]+)?)s/i);
    if (m) return Math.max(Math.floor(parseFloat(m[1]) * 1000), 1000);
  }
  if (err?.status === 429) return 8000;
  return null;
}

function runWithRateLimit<T>(task: QueueTask<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    taskQueue.push({ run: task, resolve, reject });
    processQueue();
  });
}

export class GeminiService {
  private ai: GoogleGenAI;
  private availableModels: string[] = [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-2.5-flash-lite'
  ];
  private currentModelIndex: number = 0;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY not set. Gemini service disabled.');
      this.ai = null as any;
      return;
    }
    try {
      this.ai = new GoogleGenAI({ apiKey });
    } catch (error) {
      console.error('Failed to initialize Gemini service:', error);
      this.ai = null as any;
    }
  }

  private ensureInit() {
    if (!this.ai)
      throw new Error('Gemini service not initialized. Set GEMINI_API_KEY.');
  }

  get isInitialized(): boolean {
    return !!this.ai;
  }

  private getCurrentModel(): string {
    return this.availableModels[this.currentModelIndex];
  }

  private switchToNextModel(): boolean {
    if (this.currentModelIndex < this.availableModels.length - 1) {
      this.currentModelIndex++;
      return true;
    }
    return false;
  }

  private resetToFirstModel(): void {
    this.currentModelIndex = 0;
  }

  private isRateLimitError(err: any): boolean {
    return err?.status === 429 || 
           err?.message?.toLowerCase().includes('quota') ||
           err?.message?.toLowerCase().includes('rate limit') ||
           err?.message?.toLowerCase().includes('too many requests');
  }

  async generateContent(prompt: string): Promise<string> {
    this.ensureInit();
    
    const enhancedPrompt = `${prompt}

CRITICAL: Return ONLY plain text content. Do not use any markdown formatting including:
- No asterisks (*) for bold or italic text
- No underscores (_) for emphasis
- No backticks for code blocks
- No hash symbols (#) for headers
- No brackets [] or parentheses () for links
- No special characters for formatting
- No bullet points with dashes or asterisks
- No numbered lists with special formatting

Return clean, readable plain text only.`;

    let lastError: any;
    const originalModelIndex = this.currentModelIndex;

    while (this.currentModelIndex < this.availableModels.length) {
      try {
        const response = await runWithRateLimit(() =>
          this.ai.models.generateContent({
            model: this.getCurrentModel(),
            contents: enhancedPrompt,
          })
        );
        if (!response.text) throw new Error('No content generated from Gemini API');
        
        // Reset to first model on success
        this.resetToFirstModel();
        return response.text;
      } catch (err) {
        lastError = err;
        console.error(`Content generation error with ${this.getCurrentModel()}:`, err);
        
        if (this.isRateLimitError(err)) {
          if (!this.switchToNextModel()) {
            // No more models to try
            break;
          }
        } else {
          // Non-rate-limit error, don't try other models
          break;
        }
      }
    }

    // Reset to original model if all models failed
    this.currentModelIndex = originalModelIndex;
    throw lastError;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    this.ensureInit();
    
    
    let lastError: any;
    const originalModelIndex = this.currentModelIndex;

    while (this.currentModelIndex < this.availableModels.length) {
      try {
        const response = await runWithRateLimit(() =>
          this.ai.models.embedContent({
            model: 'text-embedding-004',
            contents: text,
          })
        );
        const values = response.embeddings?.[0]?.values;
        if (!values) throw new Error('No embedding generated from Gemini API');
        
        // Reset to first model on success
        this.resetToFirstModel();
        return values;
      } catch (err) {
        lastError = err;
        console.error(`Embedding error with ${this.getCurrentModel()}:`, err);
        
        if (this.isRateLimitError(err)) {
          if (!this.switchToNextModel()) {
            // No more models to try
            break;
          }
        } else {
          // Non-rate-limit error, don't try other models
          break;
        }
      }
    }

    // Reset to original model if all models failed
    this.currentModelIndex = originalModelIndex;
    console.error('All embedding generation attempts failed:', lastError);
    throw lastError;
  }

  async summarizeContent(rawText: string, metadata?: any): Promise<string> {
    this.ensureInit();

    const contentType = metadata?.content_type || 'web_page';
    const title = metadata?.title || '';
    const url = metadata?.url || '';
    const contextSummary = metadata?.content_summary || '';
    const keyTopics = metadata?.key_topics || [];

    const baseContext = `
RecallOS Web3 Memory Context:
- This system captures, anchors, and reasons over user knowledge using Avail for verifiable cognition.
- Each summary must preserve conceptual and factual signals that aid downstream embedding and memory linkage.
- Focus on what this content teaches, why it matters, and how it connects to user knowledge evolution.
`;

    const prompts: Record<string, string> = {
      blog_post: `Summarize this blog post for RecallOS memory storage. Extract conceptual essence, useful principles, and any links to blockchain, AI reasoning, or systems thinking. Limit to 200 words.`,
      article: `Summarize this article emphasizing the knowledge kernel — ideas worth recalling in context of verifiable cognition. Capture main argument, supporting evidence, and conceptual contribution. 200 words max.`,
      documentation: `Summarize this documentation for knowledge anchoring. Include system purpose, key methods, conceptual model, and when it's relevant. Preserve implementation-level cues for recall. 200 words.`,
      tutorial: `Summarize this tutorial as a learning trace. Identify goal, key procedures, conceptual lessons, and result. Summaries must support future reasoning and contextual recall. 200 words.`,
      news_article: `Summarize this news article for cognition memory. Focus on what happened, implications, and how it alters knowledge or perception. 200 words.`,
      code_repository: `Summarize this repository for embedding into RecallOS. Include purpose, architecture, dependencies, and conceptual innovation. Avoid trivial descriptions. 200 words.`,
      qa_thread: `Summarize this Q&A for recall. Capture the problem, reasoning behind the best answer, and generalizable lessons. 200 words.`,
      video_content: `Summarize this video for conceptual retention. Capture teaching points, narrative logic, and actionable outcomes. 200 words.`,
      social_media: `Summarize this post as an idea capsule. Focus on expressed insight, argument, and why it may shape user reasoning. 150 words.`,
      default: `Summarize this content for RecallOS memory graph. Capture topic, insights, implications, and long-term relevance. 200 words.`,
    };

    const prompt = `
${baseContext}
Title: ${title}
URL: ${url}
Existing Summary: ${contextSummary}
Topics: ${keyTopics.join(', ')}

${prompts[contentType] || prompts.default}

CRITICAL: Return ONLY plain text content. Do not use any markdown formatting including:
- No asterisks (*) for bold or italic text
- No underscores (_) for emphasis
- No backticks for code blocks
- No hash symbols (#) for headers
- No brackets [] or parentheses () for links
- No special characters for formatting
- No bullet points with dashes or asterisks
- No numbered lists with special formatting

Return clean, readable plain text only.

Raw Content: ${rawText}
`;

    let lastError: any;
    const originalModelIndex = this.currentModelIndex;

    while (this.currentModelIndex < this.availableModels.length) {
      try {
        const res = await runWithRateLimit(() =>
          this.ai.models.generateContent({
            model: this.getCurrentModel(),
            contents: prompt,
          })
        );
        if (!res.text) throw new Error('No summary generated from Gemini API');
        
        // Reset to first model on success
        this.resetToFirstModel();
        return res.text.trim();
      } catch (err) {
        lastError = err;
        console.error(`Summarization error with ${this.getCurrentModel()}:`, err);
        
        if (this.isRateLimitError(err)) {
          if (!this.switchToNextModel()) {
            // No more models to try
            break;
          }
        } else {
          // Non-rate-limit error, don't try other models
          break;
        }
      }
    }

    // Reset to original model if all models failed
    this.currentModelIndex = originalModelIndex;
    throw lastError;
  }

  async extractContentMetadata(
    rawText: string,
    metadata?: any
  ): Promise<{
    topics: string[];
    categories: string[];
    keyPoints: string[];
    sentiment: string;
    importance: number;
    usefulness: number;
    searchableTerms: string[];
    contextRelevance: string[];
  }> {
    this.ensureInit();

    const title = metadata?.title || '';
    const url = metadata?.url || '';
    const contentType = metadata?.content_type || 'web_page';

    const prompt = `
RecallOS Context:
- You are structuring content for verifiable personal cognition.
- Metadata must improve future reasoning, search, and memory linking.

CRITICAL: Return ONLY valid JSON. No explanations, no markdown formatting, no code blocks, no special characters. Just the JSON object.

Return a JSON object with this exact structure:
{
  "topics": ["precise conceptual domains"],
  "categories": ["broader knowledge classes"],
  "keyPoints": ["concise factual or conceptual insights"],
  "sentiment": "educational",
  "importance": 5,
  "usefulness": 5,
  "searchableTerms": ["semantic anchors for retrieval"],
  "contextRelevance": ["contexts where this memory helps reasoning"]
}

Rules:
- All strings must be in double quotes
- No trailing commas
- sentiment must be one of: "educational", "technical", "neutral", "analytical"
- importance and usefulness must be numbers between 1-10
- All arrays can be empty if no relevant items

Title: ${title}
URL: ${url}
Content Type: ${contentType}
Text: ${rawText.substring(0, 4000)}

Return ONLY the JSON object:`;

    let lastError: any;
    const originalModelIndex = this.currentModelIndex;

    while (this.currentModelIndex < this.availableModels.length) {
      try {
        const res = await runWithRateLimit(() =>
          this.ai.models.generateContent({
            model: this.getCurrentModel(),
            contents: prompt,
          })
        );
        if (!res.text) throw new Error('No metadata response from Gemini API');

        // Try multiple patterns to extract JSON
        let jsonMatch = res.text.match(/\{[\s\S]*\}/);
        
        // If no match, try to find JSON between code blocks
        if (!jsonMatch) {
          jsonMatch = res.text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
          if (jsonMatch) {
            jsonMatch[0] = jsonMatch[1]; // Use the captured group
          }
        }
        
        // If still no match, try to find any JSON-like structure
        if (!jsonMatch) {
          jsonMatch = res.text.match(/\{[\s\S]*?\}/);
        }
        
        if (!jsonMatch) {
          console.error('No JSON found in response:', res.text);
          throw new Error('Invalid JSON in Gemini response');
        }
        
        let data;
        try {
          data = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          console.error('Raw response text:', res.text);
          console.error('Extracted JSON:', jsonMatch[0]);
          
          // Try to fix common JSON issues
          let fixedJson = jsonMatch[0];
          
          // Fix trailing commas
          fixedJson = fixedJson.replace(/,(\s*[}\]])/g, '$1');
          
          // Fix missing quotes around keys
          fixedJson = fixedJson.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
          
          // Try parsing again
          try {
            data = JSON.parse(fixedJson);
          } catch (secondError) {
            console.error('Second JSON parse error:', secondError);
            console.error('Fixed JSON:', fixedJson);
            
            // Return default metadata if all parsing fails
            this.resetToFirstModel();
            return {
              topics: [],
              categories: ['web_page'],
              keyPoints: [],
              sentiment: 'neutral',
              importance: 5,
              usefulness: 5,
              searchableTerms: [],
              contextRelevance: []
            };
          }
        }

        // Validate and sanitize the data
        const validSentiments = ['educational', 'technical', 'neutral', 'analytical'];
        const sentiment = validSentiments.includes(data.sentiment) ? data.sentiment : 'neutral';
        
        // Reset to first model on success
        this.resetToFirstModel();
        return {
          topics: Array.isArray(data.topics) ? data.topics.slice(0, 10) : [],
          categories: Array.isArray(data.categories) ? data.categories.slice(0, 5) : ['web_page'],
          keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints.slice(0, 8) : [],
          sentiment: sentiment,
          importance: Math.max(1, Math.min(10, parseInt(data.importance) || 5)),
          usefulness: Math.max(1, Math.min(10, parseInt(data.usefulness) || 5)),
          searchableTerms: Array.isArray(data.searchableTerms) ? data.searchableTerms.slice(0, 15) : [],
          contextRelevance: Array.isArray(data.contextRelevance) ? data.contextRelevance.slice(0, 5) : [],
        };
      } catch (err) {
        lastError = err;
        console.error(`Metadata extraction error with ${this.getCurrentModel()}:`, err);
        
        if (this.isRateLimitError(err)) {
          if (!this.switchToNextModel()) {
            // No more models to try
            break;
          }
        } else {
          // Non-rate-limit error, don't try other models
          break;
        }
      }
    }

    // Reset to original model if all models failed
    this.currentModelIndex = originalModelIndex;
    return {
      topics: metadata?.key_topics?.slice(0, 5) || [],
      categories: [metadata?.content_type || 'web_page'],
      keyPoints: [],
      sentiment: 'neutral',
      importance: 5,
      usefulness: 5,
      searchableTerms: [],
      contextRelevance: [],
    };
  }

  async evaluateMemoryRelationship(
    memoryA: { title?: string; summary?: string; topics?: string[]; categories?: string[] },
    memoryB: { title?: string; summary?: string; topics?: string[]; categories?: string[] }
  ): Promise<{
    isRelevant: boolean;
    relevanceScore: number;
    relationshipType: string;
    reasoning: string;
  }> {
    this.ensureInit();

    const prompt = `
RecallOS Memory Relationship Evaluation
- You are mapping conceptual and temporal relationships within a user's verifiable cognition graph.
- Relationships exist when memories share conceptual, methodological, or contextual synergy useful for reasoning.

Memory A:
Title: ${memoryA.title || 'N/A'}
Summary: ${memoryA.summary || 'N/A'}
Topics: ${memoryA.topics?.join(', ') || 'N/A'}
Categories: ${memoryA.categories?.join(', ') || 'N/A'}

Memory B:
Title: ${memoryB.title || 'N/A'}
Summary: ${memoryB.summary || 'N/A'}
Topics: ${memoryB.topics?.join(', ') || 'N/A'}
Categories: ${memoryB.categories?.join(', ') || 'N/A'}

CRITICAL: Return ONLY valid JSON. No explanations, no markdown formatting, no code blocks, no special characters. Just the JSON object.

Return a JSON object with this exact structure:
{
  "isRelevant": true,
  "relevanceScore": 0.5,
  "relationshipType": "conceptual",
  "reasoning": "short explanation"
}

Rules:
- All strings must be in double quotes
- No trailing commas
- isRelevant must be true or false
- relevanceScore must be a number between 0 and 1
- relationshipType must be one of: "conceptual", "topical", "contextual", "temporal", "causal", "none"
- reasoning must be a string

Return ONLY the JSON object:

Criteria:
- Conceptual: Shared frameworks or ideas (e.g. verifiable compute, cognition models)
- Topical: Same field or recurring subject
- Contextual: Appear in same temporal or thematic window
- Temporal: Sequential evolution of user’s knowledge
- Causal: One leads to insight in another
Be strict. Avoid weak or surface matches.
`;

    let lastError: any;
    const originalModelIndex = this.currentModelIndex;

    while (this.currentModelIndex < this.availableModels.length) {
      try {
        const res = await runWithRateLimit(() =>
          this.ai.models.generateContent({
            model: this.getCurrentModel(),
            contents: prompt,
          })
        );
        if (!res.text) throw new Error('No relationship data from Gemini');

        // Try multiple patterns to extract JSON
        let jsonMatch = res.text.match(/\{[\s\S]*\}/);
        
        // If no match, try to find JSON between code blocks
        if (!jsonMatch) {
          jsonMatch = res.text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
          if (jsonMatch) {
            jsonMatch[0] = jsonMatch[1]; // Use the captured group
          }
        }
        
        // If still no match, try to find any JSON-like structure
        if (!jsonMatch) {
          jsonMatch = res.text.match(/\{[\s\S]*?\}/);
        }
        
        if (!jsonMatch) {
          console.error('No JSON found in relationship response:', res.text);
          throw new Error('Invalid JSON response from Gemini');
        }
        
        let data;
        try {
          data = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          console.error('JSON parse error in relationship eval:', parseError);
          console.error('Raw response text:', res.text);
          console.error('Extracted JSON:', jsonMatch[0]);
          
          // Try to fix common JSON issues
          let fixedJson = jsonMatch[0];
          fixedJson = fixedJson.replace(/,(\s*[}\]])/g, '$1');
          fixedJson = fixedJson.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
          
          try {
            data = JSON.parse(fixedJson);
          } catch (secondError) {
            console.error('Second JSON parse error in relationship eval:', secondError);
            // Return default relationship data
            this.resetToFirstModel();
            return {
              isRelevant: false,
              relevanceScore: 0,
              relationshipType: 'none',
              reasoning: 'JSON parsing failed, defaulting to no relationship'
            };
          }
        }

        // Reset to first model on success
        this.resetToFirstModel();
        return {
          isRelevant: !!data.isRelevant,
          relevanceScore: Math.max(0, Math.min(1, data.relevanceScore || 0)),
          relationshipType: data.relationshipType || 'none',
          reasoning: data.reasoning || 'No reasoning provided',
        };
      } catch (err) {
        lastError = err;
        console.error(`Relationship eval error with ${this.getCurrentModel()}:`, err);
        
        if (this.isRateLimitError(err)) {
          if (!this.switchToNextModel()) {
            // No more models to try
            break;
          }
        } else {
          // Non-rate-limit error, don't try other models
          break;
        }
      }
    }

    // Reset to original model if all models failed
    this.currentModelIndex = originalModelIndex;
    const topicOverlap =
      memoryA.topics?.some(t => memoryB.topics?.includes(t)) || false;
    const categoryOverlap =
      memoryA.categories?.some(c => memoryB.categories?.includes(c)) || false;
    const score = topicOverlap && categoryOverlap ? 0.9 : topicOverlap ? 0.6 : categoryOverlap ? 0.4 : 0;
    return {
      isRelevant: score > 0,
      relevanceScore: score,
      relationshipType: topicOverlap ? 'topical' : categoryOverlap ? 'categorical' : 'none',
      reasoning: score > 0 ? 'Topic/category overlap detected (fallback logic).' : 'No meaningful connection.',
    };
  }
}

export const geminiService = new GeminiService();
