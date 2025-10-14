import { GoogleGenAI } from '@google/genai';

// In-process rate limiter queue to avoid Gemini 429 (quota) errors
type QueueTask<T> = () => Promise<T>;

let isProcessingQueue = false;
let nextAvailableAt = 0;
const taskQueue: Array<{ run: QueueTask<any>; resolve: (v: any) => void; reject: (e: any) => void }> = [];

// Default gap between requests; tuned for free-tier limits (~10 rpm). Adjust via Retry-After hints when returned
let minIntervalMs = 7000;

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

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY not set. Gemini service disabled.');
      this.ai = null as any;
      return;
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  private ensureInit() {
    if (!this.ai)
      throw new Error('Gemini service not initialized. Set GEMINI_API_KEY.');
  }

  get isInitialized(): boolean {
    return !!this.ai;
  }

  async generateContent(prompt: string): Promise<string> {
    this.ensureInit();
    try {
      const response = await runWithRateLimit(() =>
        this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        })
      );
      if (!response.text) throw new Error('No content generated from Gemini API');
      return response.text;
    } catch (err) {
      console.error('Content generation error:', err);
      throw err;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    this.ensureInit();
    try {
      const response = await runWithRateLimit(() =>
        this.ai.models.embedContent({
          model: 'text-embedding-004',
          contents: text,
        })
      );
      const values = response.embeddings?.[0]?.values;
      if (!values) throw new Error('No embedding generated from Gemini API');
      return values;
    } catch (err) {
      console.error('Embedding error:', err);
      throw err;
    }
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
Raw Content: ${rawText}
`;

    try {
      const res = await runWithRateLimit(() =>
        this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        })
      );
      if (!res.text) throw new Error('No summary generated from Gemini API');
      return res.text.trim();
    } catch (err) {
      console.error('Summarization error:', err);
      throw err;
    }
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

Return a JSON with:
{
  "topics": ["precise conceptual domains"],
  "categories": ["broader knowledge classes"],
  "keyPoints": ["concise factual or conceptual insights"],
  "sentiment": "educational | technical | neutral | analytical",
  "importance": 1-10 (based on cognitive and learning relevance),
  "usefulness": 1-10 (based on applicability in user reasoning),
  "searchableTerms": ["semantic anchors for retrieval"],
  "contextRelevance": ["contexts where this memory helps reasoning"]
}

Title: ${title}
URL: ${url}
Content Type: ${contentType}
Text: ${rawText.substring(0, 4000)}
Return valid JSON only.
`;

    try {
      const res = await runWithRateLimit(() =>
        this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        })
      );
      if (!res.text) throw new Error('No metadata response from Gemini API');

      const jsonMatch = res.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid JSON in Gemini response');
      const data = JSON.parse(jsonMatch[0]);

      return {
        topics: data.topics?.slice(0, 10) || [],
        categories: data.categories?.slice(0, 5) || [],
        keyPoints: data.keyPoints?.slice(0, 8) || [],
        sentiment: data.sentiment || 'neutral',
        importance: Math.max(1, Math.min(10, data.importance || 5)),
        usefulness: Math.max(1, Math.min(10, data.usefulness || 5)),
        searchableTerms: data.searchableTerms?.slice(0, 15) || [],
        contextRelevance: data.contextRelevance?.slice(0, 5) || [],
      };
    } catch (err) {
      console.error('Metadata extraction error:', err);
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

Return valid JSON:
{
  "isRelevant": boolean,
  "relevanceScore": 0–1,
  "relationshipType": "conceptual" | "topical" | "contextual" | "temporal" | "causal" | "none",
  "reasoning": "short explanation"
}

Criteria:
- Conceptual: Shared frameworks or ideas (e.g. verifiable compute, cognition models)
- Topical: Same field or recurring subject
- Contextual: Appear in same temporal or thematic window
- Temporal: Sequential evolution of user’s knowledge
- Causal: One leads to insight in another
Be strict. Avoid weak or surface matches.
`;

    try {
      const res = await runWithRateLimit(() =>
        this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        })
      );
      if (!res.text) throw new Error('No relationship data from Gemini');

      const jsonMatch = res.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid JSON response from Gemini');
      const data = JSON.parse(jsonMatch[0]);

      return {
        isRelevant: !!data.isRelevant,
        relevanceScore: Math.max(0, Math.min(1, data.relevanceScore || 0)),
        relationshipType: data.relationshipType || 'none',
        reasoning: data.reasoning || 'No reasoning provided',
      };
    } catch (err) {
      console.error('Relationship eval error:', err);
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
}

export const geminiService = new GeminiService();
