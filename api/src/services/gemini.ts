import { GoogleGenAI } from '@google/genai';

export class GeminiService {
  private ai: GoogleGenAI;
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn(
        'GEMINI_API_KEY environment variable is not set. Gemini service will be disabled.'
      );
      this.ai = null as any;

      return;
    }

    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.ai) {
      throw new Error(
        'Gemini service is not initialized. Please set GEMINI_API_KEY environment variable.'
      );
    }

    try {
      const response = await this.ai.models.embedContent({
        model: 'text-embedding-004',
        contents: text,
      });

      if (!response.embeddings?.[0]?.values) {
        throw new Error('No embedding generated from Gemini API');
      }

      return response.embeddings[0].values;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  async summarizeContent(rawText: string, metadata?: any): Promise<string> {
    if (!this.ai) {
      throw new Error(
        'Gemini service is not initialized. Please set GEMINI_API_KEY environment variable.'
      );
    }

    try {
      const contentType = metadata?.content_type || 'web_page';

      const contentSummary = metadata?.content_summary || '';

      const keyTopics = metadata?.key_topics || [];

      const url = metadata?.url || '';

      const title = metadata?.title || '';

      let prompt = '';

      switch (contentType) {
        case 'blog_post':
        case 'article':
          prompt = `Summarize this blog post/article concisely for a personal memory system. Focus on:\n\n- Main topic and key insights\n- Practical takeaways or actionable advice\n- Important facts or examples\n- Why this matters for future reference\n\nKeep it under 200 words. Use plain text only, no markdown formatting. Content: ${rawText}`;
          break;
        case 'documentation':
          prompt = `Summarize this documentation concisely for a personal memory system. Focus on:\n\n- What it teaches and main concepts\n- Key procedures or methods\n- Important warnings or requirements\n- When to use this information\n\nKeep it under 200 words. Use plain text only, no markdown formatting. Content: ${rawText}`;
          break;
        case 'tutorial':
        case 'guide':
          prompt = `Summarize this tutorial/guide concisely for a personal memory system. Focus on:\n\n- What you'll learn and main steps\n- Key techniques or tools used\n- Important tips or warnings\n- Expected results or outcomes\n\nKeep it under 200 words. Use plain text only, no markdown formatting. Content: ${rawText}`;
          break;
        case 'news_article':
          prompt = `Summarize this news article concisely for a personal memory system. Focus on:\n\n- What happened and when\n- Key facts and important details\n- Who's involved and their positions\n- Why this matters or future implications\n\nKeep it under 200 words. Use plain text only, no markdown formatting. Content: ${rawText}`;
          break;
        case 'code_repository':
          prompt = `Summarize this code repository concisely for a personal memory system. Focus on:\n\n- What it does and main purpose\n- Key components or features\n- How to use or install it\n- Important dependencies or requirements\n\nKeep it under 200 words. Use plain text only, no markdown formatting. Content: ${rawText}`;
          break;
        case 'qa_thread':
          prompt = `Summarize this Q&A thread concisely for a personal memory system. Focus on:\n\n- The main question or problem\n- Best solution or answer\n- Key technical details or code\n- When to use this solution\n\nKeep it under 200 words. Use plain text only, no markdown formatting. Content: ${rawText}`;
          break;
        case 'video_content':
          prompt = `Summarize this video content concisely for a personal memory system. Focus on:\n\n- What it's about and main topics\n- Key learning points or skills\n- Practical applications or use cases\n- Important takeaways or next steps\n\nKeep it under 200 words. Use plain text only, no markdown formatting. Content: ${rawText}`;
          break;
        case 'social_media':
          prompt = `Summarize this social media post concisely for a personal memory system. Focus on:\n\n- Main message or opinion shared\n- Key insights or predictions\n- Important context or background\n- Why this matters or implications\n\nKeep it under 150 words. Use plain text only, no markdown formatting. Content: ${rawText}`;
          break;
        default:
          prompt = `Summarize this web content concisely for a personal memory system. Focus on:\n\n- Main topic and key points\n- Important facts or insights\n- Practical value or applications\n- Why this matters for future reference\n\nKeep it under 200 words. Use plain text only, no markdown formatting. Content: ${rawText}`;
      }

      const contextInfo = [];

      if (title) contextInfo.push(`Title: ${title}`);

      if (url) contextInfo.push(`URL: ${url}`);

      if (contentSummary) contextInfo.push(`Context: ${contentSummary}`);

      if (keyTopics.length > 0)
        contextInfo.push(`Topics: ${keyTopics.join(', ')}`);

      if (contextInfo.length > 0) {
        prompt = `${contextInfo.join('\n')}\n\n${prompt}`;
      }

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      if (!response.text) {
        throw new Error('No summary generated from Gemini API');
      }

      return response.text;
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw error;
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
    searchableTerms: string[];
  }> {
    if (!this.ai) {
      throw new Error(
        'Gemini service is not initialized. Please set GEMINI_API_KEY environment variable.'
      );
    }

    try {
      const contentType = metadata?.content_type || 'web_page';

      const title = metadata?.title || '';

      const url = metadata?.url || '';

      const prompt = `Analyze this content and extract structured metadata for a personal memory system. Return a JSON object with the following fields:
1. **topics**: Array of 5-10 specific topics/subjects this content covers
2. **categories**: Array of 3-5 broader categories this content belongs to
3. **keyPoints**: Array of 5-8 most important points or insights
4. **sentiment**: Overall sentiment (positive, negative, neutral, informative)
5. **importance**: Importance score from 1-10 (10 being most important for personal memory)
6. **searchableTerms**: Array of 10-15 terms someone might search for to find this content
Content Type: ${contentType}
Title: ${title}
URL: ${url}
Content: ${rawText.substring(0, 4000)}
Return only valid JSON, no additional text.`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      if (!response.text) {
        throw new Error('No metadata generated from Gemini API');
      }

      const jsonMatch = response.text.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('Invalid JSON response from Gemini API');
      }

      const extractedMetadata = JSON.parse(jsonMatch[0]);

      return {
        topics: Array.isArray(extractedMetadata.topics)
          ? extractedMetadata.topics.slice(0, 10)
          : [],
        categories: Array.isArray(extractedMetadata.categories)
          ? extractedMetadata.categories.slice(0, 5)
          : [],
        keyPoints: Array.isArray(extractedMetadata.keyPoints)
          ? extractedMetadata.keyPoints.slice(0, 8)
          : [],
        sentiment:
          typeof extractedMetadata.sentiment === 'string'
            ? extractedMetadata.sentiment
            : 'neutral',
        importance:
          typeof extractedMetadata.importance === 'number'
            ? Math.max(1, Math.min(10, extractedMetadata.importance))
            : 5,
        searchableTerms: Array.isArray(extractedMetadata.searchableTerms)
          ? extractedMetadata.searchableTerms.slice(0, 15)
          : [],
      };
    } catch (error) {
      console.error('Error extracting content metadata:', error);

      return {
        topics: metadata?.key_topics?.slice(0, 5) || [],
        categories: [metadata?.content_type || 'web_page'],
        keyPoints: [],
        sentiment: 'neutral',
        importance: 5,
        searchableTerms: [],
      };
    }
  }
}

export const geminiService = new GeminiService();
