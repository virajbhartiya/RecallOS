import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY environment variable is not set. Gemini service will be disabled.');
      this.ai = null as any;
      return;
    }
    
    // The client gets the API key from the environment variable `GEMINI_API_KEY`
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.ai) {
      throw new Error('Gemini service is not initialized. Please set GEMINI_API_KEY environment variable.');
    }
    
    try {
      const response = await this.ai.models.embedContent({
        model: "text-embedding-004",
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
      throw new Error('Gemini service is not initialized. Please set GEMINI_API_KEY environment variable.');
    }
    
    try {
      const contentType = metadata?.content_type || 'web_page';
      const contentSummary = metadata?.content_summary || '';
      
      let prompt = '';
      
      // Customize prompt based on content type
      switch (contentType) {
        case 'blog_post':
        case 'article':
          prompt = `Analyze this blog post/article and provide a comprehensive summary focusing on:\n1. Main topic and key arguments\n2. Important insights and takeaways\n3. Supporting evidence or examples\n4. Author's perspective or conclusions\n\nContent: ${rawText}`;
          break;
        case 'documentation':
          prompt = `Summarize this documentation focusing on:\n1. Main concepts and procedures\n2. Key technical details\n3. Important warnings or notes\n4. Practical applications\n\nContent: ${rawText}`;
          break;
        case 'tutorial':
        case 'guide':
          prompt = `Summarize this tutorial/guide focusing on:\n1. Learning objectives\n2. Step-by-step process\n3. Key techniques or methods\n4. Important tips or best practices\n\nContent: ${rawText}`;
          break;
        case 'news_article':
          prompt = `Summarize this news article focusing on:\n1. Main event or story\n2. Key facts and figures\n3. Important quotes or statements\n4. Implications or consequences\n\nContent: ${rawText}`;
          break;
        case 'code_repository':
          prompt = `Analyze this code repository content and provide a summary focusing on:\n1. Project purpose and functionality\n2. Key technical components\n3. Important code patterns or algorithms\n4. Usage instructions or examples\n\nContent: ${rawText}`;
          break;
        case 'qa_thread':
          prompt = `Summarize this Q&A thread focusing on:\n1. Main question or problem\n2. Key answers or solutions\n3. Important technical details\n4. Best practices or recommendations\n\nContent: ${rawText}`;
          break;
        default:
          prompt = `Analyze this web content and provide a meaningful summary focusing on:\n1. Main topic and purpose\n2. Key information and insights\n3. Important details or data\n4. Practical value or applications\n\nContent: ${rawText}`;
      }
      
      // Add content summary context if available
      if (contentSummary) {
        prompt = `Context: ${contentSummary}\n\n${prompt}`;
      }

      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
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
}

export const geminiService = new GeminiService();
