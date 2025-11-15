import { aiProvider } from './ai-provider.service'
import { logger } from '../utils/logger.util'
import { getRedisClient } from '../lib/redis.lib'
import { createHash } from 'crypto'

export type QueryClass = 'recall' | 'search' | 'plan' | 'profile' | 'metric'

export interface QueryClassification {
  class: QueryClass
  confidence: number
  reasoning?: string
  suggestedPolicy?: string
}

const CLASSIFICATION_CACHE_PREFIX = 'query_classification:'
const CLASSIFICATION_CACHE_TTL = 24 * 60 * 60 // 24 hours

function getCacheKey(query: string): string {
  const normalized = query.toLowerCase().trim()
  const hash = createHash('sha256').update(normalized).digest('hex').substring(0, 16)
  return `${CLASSIFICATION_CACHE_PREFIX}${hash}`
}

export class QueryClassificationService {
  /**
   * Classify a query into one of: recall, search, plan, profile, metric
   */
  async classifyQuery(query: string, userId: string): Promise<QueryClassification> {
    const normalized = query.toLowerCase().trim()

    // Check cache first
    try {
      const cacheKey = getCacheKey(normalized)
      const client = getRedisClient()
      const cached = await client.get(cacheKey)
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          logger.log('[query-classification] cache_hit', { query: query.substring(0, 50) })
          return parsed
        } catch {
          // Invalid cache, continue
        }
      }
    } catch (error) {
      logger.warn('[query-classification] cache_read_error', {
        error: error instanceof Error ? error.message : String(error),
      })
    }

    // Simple rule-based classification first (fast path)
    const ruleBased = this.ruleBasedClassification(normalized)
    if (ruleBased.confidence > 0.8) {
      await this.cacheClassification(normalized, ruleBased)
      return ruleBased
    }

    // Use AI for ambiguous queries
    try {
      const aiClassification = await this.aiBasedClassification(query, userId)
      await this.cacheClassification(normalized, aiClassification)
      return aiClassification
    } catch (error) {
      logger.warn('[query-classification] ai_classification_failed', {
        error: error instanceof Error ? error.message : String(error),
        query: query.substring(0, 50),
      })
      // Fallback to rule-based
      return ruleBased
    }
  }

  private ruleBasedClassification(normalized: string): QueryClassification {
    // Recall queries: asking for specific information they remember
    const recallPatterns = [
      /\b(what|when|where|who|which)\s+(did|do|was|is|are|were)\s+(i|you|we|they)\s+/i,
      /\b(remember|recall|remind|what\s+was|tell\s+me\s+about)\b/i,
      /\b(show\s+me|find\s+me|get\s+me)\s+(the|that|my|our)\b/i,
      /\b(i\s+remember|i\s+think|i\s+know|i\s+saw)\b/i,
    ]
    if (recallPatterns.some(p => p.test(normalized))) {
      return {
        class: 'recall',
        confidence: 0.85,
        reasoning: 'Pattern matches recall query',
        suggestedPolicy: 'chat',
      }
    }

    // Search queries: exploring or finding new information
    const searchPatterns = [
      /\b(search|find|look\s+for|explore|discover|browse)\b/i,
      /\b(what\s+is|what\s+are|how\s+to|how\s+does)\b/i,
      /\b(related\s+to|similar\s+to|about|regarding)\b/i,
      /\b(anything|everything|all|list|show\s+all)\b/i,
    ]
    if (searchPatterns.some(p => p.test(normalized))) {
      return {
        class: 'search',
        confidence: 0.85,
        reasoning: 'Pattern matches search query',
        suggestedPolicy: 'search',
      }
    }

    // Plan queries: asking for planning or next steps
    const planPatterns = [
      /\b(plan|planning|next\s+steps|what\s+should|how\s+should|strategy|roadmap)\b/i,
      /\b(prepare|organize|schedule|timeline|milestone)\b/i,
      /\b(what\s+to\s+do|what\s+needs|prioritize|focus)\b/i,
    ]
    if (planPatterns.some(p => p.test(normalized))) {
      return {
        class: 'plan',
        confidence: 0.85,
        reasoning: 'Pattern matches plan query',
        suggestedPolicy: 'planning',
      }
    }

    // Profile queries: asking about user characteristics or preferences
    const profilePatterns = [
      /\b(my\s+profile|my\s+preferences|my\s+interests|about\s+me|who\s+am\s+i)\b/i,
      /\b(what\s+do\s+i\s+like|what\s+am\s+i\s+interested|my\s+goals|my\s+skills)\b/i,
      /\b(summarize\s+me|describe\s+me|my\s+characteristics)\b/i,
    ]
    if (profilePatterns.some(p => p.test(normalized))) {
      return {
        class: 'profile',
        confidence: 0.85,
        reasoning: 'Pattern matches profile query',
        suggestedPolicy: 'profile',
      }
    }

    // Metric queries: asking for statistics or metrics
    const metricPatterns = [
      /\b(how\s+many|count|statistics|stats|metrics|analytics|dashboard)\b/i,
      /\b(total|average|percentage|rate|frequency|trend)\b/i,
      /\b(most|least|top|bottom|highest|lowest)\b/i,
    ]
    if (metricPatterns.some(p => p.test(normalized))) {
      return {
        class: 'metric',
        confidence: 0.85,
        reasoning: 'Pattern matches metric query',
        suggestedPolicy: 'chat',
      }
    }

    // Default to search for ambiguous queries
    return {
      class: 'search',
      confidence: 0.5,
      reasoning: 'No clear pattern match, defaulting to search',
      suggestedPolicy: 'search',
    }
  }

  private async aiBasedClassification(query: string, userId: string): Promise<QueryClassification> {
    const prompt = `Classify the following user query into one of these categories:
- recall: User is asking to recall/remember specific information they know exists
- search: User is exploring or searching for information
- plan: User is asking for planning, next steps, or strategy
- profile: User is asking about their own characteristics, preferences, or profile
- metric: User is asking for statistics, counts, or metrics

Query: "${query}"

Respond with ONLY a JSON object in this exact format:
{
  "class": "recall|search|plan|profile|metric",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation",
  "suggestedPolicy": "chat|search|planning|profile"
}`

    try {
      const response = await aiProvider.generateContent(prompt, false, userId)
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          class: parsed.class || 'search',
          confidence: parsed.confidence || 0.7,
          reasoning: parsed.reasoning,
          suggestedPolicy: parsed.suggestedPolicy || 'search',
        }
      }
    } catch (error) {
      logger.warn('[query-classification] ai_parse_error', {
        error: error instanceof Error ? error.message : String(error),
      })
    }

    // Fallback
    return {
      class: 'search',
      confidence: 0.5,
      reasoning: 'AI classification failed, using fallback',
      suggestedPolicy: 'search',
    }
  }

  private async cacheClassification(
    query: string,
    classification: QueryClassification
  ): Promise<void> {
    try {
      const cacheKey = getCacheKey(query)
      const client = getRedisClient()
      await client.setex(cacheKey, CLASSIFICATION_CACHE_TTL, JSON.stringify(classification))
    } catch {
      // Non-critical, ignore
    }
  }
}

export const queryClassificationService = new QueryClassificationService()
