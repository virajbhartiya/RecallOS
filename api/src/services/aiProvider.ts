import fetch from 'node-fetch'
import { geminiService } from './gemini'

type Provider = 'gemini' | 'ollama' | 'hybrid'

const provider: Provider = (process.env.AI_PROVIDER as Provider) || 'hybrid'

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'mxbai-embed-large:latest'
const OLLAMA_GEN_MODEL = process.env.OLLAMA_GEN_MODEL || 'llama3.1:8b'

export const aiProvider = {
  get isInitialized(): boolean {
    if (provider === 'gemini') return geminiService.isInitialized
    return true
  },

  async generateEmbedding(text: string): Promise<number[]> {
    if (provider === 'gemini') {
      return geminiService.generateEmbedding(text)
    }
    
    if (provider === 'hybrid') {
      return this.generateHybridEmbedding(text)
    }
    
    try {
      const res = await fetch(`${OLLAMA_BASE}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: OLLAMA_EMBED_MODEL, input: text })
      })
      
      if (!res.ok) {
        console.error(`Ollama embeddings API error: ${res.status} ${res.statusText}`)
        throw new Error(`Ollama embeddings failed: ${res.status}`)
      }
      
      const data: any = await res.json()
      console.log('Ollama embedding response:', { 
        hasEmbedding: !!data?.embedding, 
        embeddingLength: data?.embedding?.length || 0,
        hasEmbeddings: !!data?.embeddings,
        embeddingsLength: data?.embeddings?.length || 0
      })
      
      const vec: number[] = data?.embedding || data?.embeddings || []
      
      if (!Array.isArray(vec) || vec.length === 0) {
        console.error('Ollama returned empty embedding array:', data)
        // Generate a simple hash-based embedding as fallback
        return this.generateFallbackEmbedding(text)
      }
      
      return vec.map((v: any) => Number(v) || 0)
    } catch (error) {
      console.error('Error generating Ollama embedding:', error)
      // Generate a simple hash-based embedding as fallback
      return this.generateFallbackEmbedding(text)
    }
  },

  async generateHybridEmbedding(text: string): Promise<number[]> {
    // Try multiple embedding methods in order of preference
    const methods = [
      () => this.tryOllamaEmbedding(text, 'mxbai-embed-large:latest'),
      () => this.tryOllamaEmbedding(text, 'nomic-embed-text:latest'),
      () => this.tryOllamaEmbedding(text, 'all-minilm:l6-v2'),
      () => this.generateFallbackEmbedding(text)
    ]
    
    for (const method of methods) {
      try {
        const embedding = await method()
        if (embedding && embedding.length > 0) {
          return embedding
        }
      } catch (error) {
        console.error('Embedding method failed:', error)
        continue
      }
    }
    
    // Final fallback
    return this.generateFallbackEmbedding(text)
  },

  async tryOllamaEmbedding(text: string, model: string): Promise<number[]> {
    const res = await fetch(`${OLLAMA_BASE}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input: text })
    })
    
    if (!res.ok) {
      throw new Error(`Ollama embeddings failed: ${res.status}`)
    }
    
    const data: any = await res.json()
    const vec: number[] = data?.embedding || data?.embeddings || []
    
    if (!Array.isArray(vec) || vec.length === 0) {
      throw new Error('Empty embedding array')
    }
    
    console.log(`Successfully generated embedding using ${model}`)
    return vec.map((v: any) => Number(v) || 0)
  },

  generateFallbackEmbedding(text: string): number[] {
    // Generate a more sophisticated 768-dimensional embedding based on text analysis
    // This is a fallback when Ollama embeddings fail
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2)
    const embedding = new Array(768).fill(0)
    
    // Create word-based features with semantic clustering
    const wordHashes = words.map(word => this.simpleHash(word))
    const textHash = this.simpleHash(text)
    const length = text.length
    
    // Define semantic clusters for better similarity
    const semanticClusters = this.getSemanticClusters(text)
    
    // Create word frequency map for better similarity
    const wordFreq = new Map<string, number>()
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
    })
    
    // Generate embedding based on multiple text features
    for (let i = 0; i < 768; i++) {
      let value = 0
      
      // Word-based features (first 256 dimensions) - improved
      if (i < 256 && wordHashes.length > 0) {
        const wordIndex = i % wordHashes.length
        const word = words[wordIndex]
        const freq = wordFreq.get(word) || 1
        value += Math.sin(wordHashes[wordIndex] + i) * 0.1 * Math.log(freq + 1)
      }
      
      // Semantic cluster features (next 256 dimensions) - enhanced
      if (i >= 256 && i < 512) {
        const clusterIndex = (i - 256) % semanticClusters.length
        value += Math.sin(semanticClusters[clusterIndex] + i) * 0.2
      }
      
      // Character-based features (last 256 dimensions) - improved
      if (i >= 512) {
        const charCode = text.charCodeAt(i % text.length) || 0
        value += Math.sin(charCode + i) * 0.08
      }
      
      // Add some randomness based on text hash
      value += Math.sin(textHash + i * 7) * 0.03
      
      embedding[i] = value
    }
    
    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
    if (magnitude > 0) {
      for (let i = 0; i < 768; i++) {
        embedding[i] = embedding[i] / magnitude
      }
    }
    
    console.log('Generated improved fallback embedding for text:', text.substring(0, 50) + '...')
    return embedding
  },

  getSemanticClusters(text: string): number[] {
    // Create semantic clusters based on common concepts
    const clusters = []
    const lowerText = text.toLowerCase()
    
    // Technology clusters
    if (lowerText.includes('mac') || lowerText.includes('apple') || lowerText.includes('computer') || lowerText.includes('laptop')) {
      clusters.push(this.simpleHash('technology_computer'))
    }
    if (lowerText.includes('iphone') || lowerText.includes('mobile') || lowerText.includes('phone')) {
      clusters.push(this.simpleHash('technology_mobile'))
    }
    if (lowerText.includes('software') || lowerText.includes('app') || lowerText.includes('program')) {
      clusters.push(this.simpleHash('technology_software'))
    }
    
    // Action clusters
    if (lowerText.includes('buy') || lowerText.includes('purchase') || lowerText.includes('shop')) {
      clusters.push(this.simpleHash('action_purchase'))
    }
    if (lowerText.includes('learn') || lowerText.includes('study') || lowerText.includes('research')) {
      clusters.push(this.simpleHash('action_learn'))
    }
    if (lowerText.includes('work') || lowerText.includes('job') || lowerText.includes('career') || lowerText.includes('employment') || lowerText.includes('hiring') || lowerText.includes('positions')) {
      clusters.push(this.simpleHash('action_work'))
    }
    if (lowerText.includes('apply') || lowerText.includes('application') || lowerText.includes('candidate')) {
      clusters.push(this.simpleHash('action_apply'))
    }
    
    // Topic clusters
    if (lowerText.includes('health') || lowerText.includes('medical') || lowerText.includes('doctor')) {
      clusters.push(this.simpleHash('topic_health'))
    }
    if (lowerText.includes('travel') || lowerText.includes('trip') || lowerText.includes('vacation')) {
      clusters.push(this.simpleHash('topic_travel'))
    }
    if (lowerText.includes('food') || lowerText.includes('restaurant') || lowerText.includes('cooking')) {
      clusters.push(this.simpleHash('topic_food'))
    }
    
    // Company-specific clusters for better matching
    if (lowerText.includes('cloudflare')) {
      clusters.push(this.simpleHash('company_cloudflare'))
    }
    if (lowerText.includes('apple') || lowerText.includes('mac')) {
      clusters.push(this.simpleHash('company_apple'))
    }
    if (lowerText.includes('google')) {
      clusters.push(this.simpleHash('company_google'))
    }
    if (lowerText.includes('microsoft')) {
      clusters.push(this.simpleHash('company_microsoft'))
    }
    
    // Default cluster if no matches
    if (clusters.length === 0) {
      clusters.push(this.simpleHash('general'))
    }
    
    return clusters
  },

  simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  },

  async generateContent(prompt: string): Promise<string> {
    if (provider === 'gemini') {
      return geminiService.generateContent(prompt)
    }
    const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_GEN_MODEL, prompt, stream: false, options: { num_predict: 128, temperature: 0.3 } })
    })
    if (!res.ok) throw new Error(`Ollama generate failed: ${res.status}`)
    const data: any = await res.json()
    const out: string = data?.response || data?.text || ''
    if (!out) throw new Error('No content from Ollama')
    return String(out)
  },

  async summarizeContent(rawText: string, metadata?: any): Promise<string> {
    if (provider === 'gemini') return geminiService.summarizeContent(rawText, metadata)
    const contentType = metadata?.content_type || 'web_page'
    const title = metadata?.title || ''
    const url = metadata?.url || ''
    const contextSummary = metadata?.content_summary || ''
    const prompt = `Summarize the following ${contentType} for storage in a personal memory graph. Be concise (<=200 words), capture key ideas, why it matters, and any actionable takeaways. Title: ${title}\nURL: ${url}\nExisting Summary: ${contextSummary}\n\nText:\n${rawText}`
    return this.generateContent(prompt)
  },

  async extractContentMetadata(rawText: string, metadata?: any): Promise<{
    topics: string[];
    categories: string[];
    keyPoints: string[];
    sentiment: string;
    importance: number;
    usefulness: number;
    searchableTerms: string[];
    contextRelevance: string[];
  }> {
    if (provider === 'gemini') return geminiService.extractContentMetadata(rawText, metadata)
    const title = metadata?.title || ''
    const contentType = metadata?.content_type || 'web_page'
    const jsonPrompt = `Extract metadata from this content. Respond with ONLY a valid JSON object, no explanations or text before/after:

Title: ${title}
Content: ${rawText.substring(0, 2000)}

Required JSON format:
{"topics": ["keyword1", "keyword2"], "categories": ["${contentType}"], "keyPoints": ["point1", "point2"], "sentiment": "neutral", "importance": 5, "usefulness": 5, "searchableTerms": ["term1", "term2"], "contextRelevance": ["type"]}

Rules:
- sentiment: educational, technical, neutral, analytical, positive, negative
- importance/usefulness: numbers 1-10
- topics: 2-4 relevant keywords from content
- keyPoints: 2-3 main points (max 80 chars each)
- searchableTerms: 5-8 important words
- contextRelevance: educational, news, tutorial, general

JSON ONLY:`
    const out = await this.generateContent(jsonPrompt)
    try {
      // Clean up the response to extract JSON
      let jsonStr = out.trim()
      
      // Remove common prefixes that AI models add
      jsonStr = jsonStr.replace(/^(Here is|Here's|The JSON|JSON response|Response:|Answer:)/i, '')
      jsonStr = jsonStr.replace(/^(Here is the|Here's the|The extracted|Extracted)/i, '')
      
      // Remove any markdown code blocks
      jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '')
      
      // Remove any text before the first {
      const firstBrace = jsonStr.indexOf('{')
      if (firstBrace > 0) {
        jsonStr = jsonStr.substring(firstBrace)
      }
      
      // Find the last } to extract complete JSON
      const lastBrace = jsonStr.lastIndexOf('}')
      if (lastBrace !== -1) {
        jsonStr = jsonStr.substring(0, lastBrace + 1)
      }
      
      // Remove any trailing text after the last }
      jsonStr = jsonStr.trim()
      
      const obj = JSON.parse(jsonStr)
      return {
        topics: Array.isArray(obj.topics) ? obj.topics : [],
        categories: Array.isArray(obj.categories) ? obj.categories : [contentType],
        keyPoints: Array.isArray(obj.keyPoints) ? obj.keyPoints : [],
        sentiment: typeof obj.sentiment === 'string' ? obj.sentiment : 'neutral',
        importance: Number(obj.importance) || 5,
        usefulness: Number(obj.usefulness) || 5,
        searchableTerms: Array.isArray(obj.searchableTerms) ? obj.searchableTerms : [],
        contextRelevance: Array.isArray(obj.contextRelevance) ? obj.contextRelevance : [],
      }
    } catch (error) {
      console.error('Error extracting metadata with AI, using fallback:', error)
      return this.generateFallbackMetadata(rawText, metadata)
    }
  },

  generateFallbackMetadata(rawText: string, metadata?: any): {
    topics: string[];
    categories: string[];
    keyPoints: string[];
    sentiment: string;
    importance: number;
    usefulness: number;
    searchableTerms: string[];
    contextRelevance: string[];
  } {
    const title = metadata?.title || ''
    const contentType = metadata?.content_type || 'web_page'
    const text = (title + ' ' + rawText).toLowerCase()
    
    // Extract topics based on common keywords
    const topics: string[] = []
    if (text.includes('mac') || text.includes('apple') || text.includes('computer') || text.includes('laptop') || text.includes('desktop')) {
      topics.push('technology', 'computers')
    }
    if (text.includes('iphone') || text.includes('mobile') || text.includes('phone') || text.includes('smartphone')) {
      topics.push('technology', 'mobile')
    }
    if (text.includes('job') || text.includes('career') || text.includes('work') || text.includes('employment') || text.includes('hiring')) {
      topics.push('career', 'employment')
    }
    if (text.includes('health') || text.includes('medical') || text.includes('doctor') || text.includes('medicine')) {
      topics.push('health', 'medical')
    }
    if (text.includes('travel') || text.includes('trip') || text.includes('vacation') || text.includes('tourism')) {
      topics.push('travel', 'tourism')
    }
    if (text.includes('food') || text.includes('restaurant') || text.includes('cooking') || text.includes('recipe')) {
      topics.push('food', 'dining')
    }
    if (text.includes('education') || text.includes('learning') || text.includes('school') || text.includes('university')) {
      topics.push('education', 'learning')
    }
    if (text.includes('business') || text.includes('finance') || text.includes('money') || text.includes('investment')) {
      topics.push('business', 'finance')
    }
    if (text.includes('entertainment') || text.includes('movie') || text.includes('music') || text.includes('game')) {
      topics.push('entertainment', 'media')
    }
    
    // Extract key points from text
    const keyPoints: string[] = []
    const sentences = rawText.split(/[.!?]+/).filter(s => s.trim().length > 20)
    keyPoints.push(...sentences.slice(0, 3).map(s => s.trim().substring(0, 100)))
    
    // Determine sentiment
    let sentiment = 'neutral'
    const positiveWords = ['great', 'excellent', 'amazing', 'love', 'best', 'fantastic', 'wonderful', 'awesome', 'perfect', 'outstanding', 'superb', 'brilliant']
    const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'worst', 'horrible', 'disgusting', 'disappointing', 'frustrating', 'annoying', 'useless', 'broken']
    
    const positiveCount = positiveWords.filter(word => text.includes(word)).length
    const negativeCount = negativeWords.filter(word => text.includes(word)).length
    
    if (positiveCount > negativeCount && positiveCount > 0) {
      sentiment = 'positive'
    } else if (negativeCount > positiveCount && negativeCount > 0) {
      sentiment = 'negative'
    } else if (text.includes('tutorial') || text.includes('guide') || text.includes('how to') || text.includes('learn')) {
      sentiment = 'educational'
    } else if (text.includes('review') || text.includes('analysis') || text.includes('comparison') || text.includes('evaluation')) {
      sentiment = 'analytical'
    } else if (text.includes('technical') || text.includes('specification') || text.includes('documentation') || text.includes('api')) {
      sentiment = 'technical'
    }
    
    // Determine importance and usefulness based on content type and length
    let importance = 5
    let usefulness = 5
    
    if (contentType === 'web_page' && rawText.length > 1000) {
      importance = 7
      usefulness = 6
    } else if (contentType === 'social_media') {
      importance = 3
      usefulness = 4
    }
    
    // Extract searchable terms
    const searchableTerms: string[] = []
    const words = text.split(/\s+/).filter(w => w.length > 3)
    const wordCounts = new Map<string, number>()
    words.forEach(word => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
    })
    const sortedWords = Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word)
    searchableTerms.push(...sortedWords)
    
    // Context relevance
    const contextRelevance: string[] = []
    if (text.includes('tutorial') || text.includes('guide') || text.includes('how to')) {
      contextRelevance.push('educational')
    }
    if (text.includes('news') || text.includes('update') || text.includes('latest')) {
      contextRelevance.push('current_events')
    }
    if (text.includes('review') || text.includes('opinion') || text.includes('analysis')) {
      contextRelevance.push('analysis')
    }
    
    return {
      topics: topics.length > 0 ? topics : ['general'],
      categories: [contentType],
      keyPoints: keyPoints.filter(kp => kp.length > 0),
      sentiment,
      importance,
      usefulness,
      searchableTerms: searchableTerms.slice(0, 10),
      contextRelevance: contextRelevance.length > 0 ? contextRelevance : ['general'],
    }
  }
}


