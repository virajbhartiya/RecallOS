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
      const keyTopics = metadata?.key_topics || [];
      const url = metadata?.url || '';
      const title = metadata?.title || '';
      
      let prompt = '';
      
      // Customize prompt based on content type for better RAG processing
      switch (contentType) {
        case 'blog_post':
        case 'article':
          prompt = `Analyze this blog post/article for a personal memory system. Extract and summarize:\n\n1. **Main Topic**: What is this about?\n2. **Key Insights**: What are the main points, arguments, or findings?\n3. **Actionable Information**: What can the reader do with this information?\n4. **Important Details**: Key facts, statistics, examples, or evidence\n5. **Author's Perspective**: What viewpoint or conclusion is presented?\n6. **Related Concepts**: What topics or ideas are connected to this?\n\nContent: ${rawText}`;
          break;
        case 'documentation':
          prompt = `Analyze this documentation for a personal memory system. Extract and summarize:\n\n1. **Purpose**: What does this document explain or teach?\n2. **Key Concepts**: Main technical concepts, procedures, or methods\n3. **Important Details**: Critical technical specifications, warnings, or requirements\n4. **Practical Usage**: How to apply this information\n5. **Dependencies**: What other knowledge or tools are needed?\n6. **Common Issues**: Potential problems or troubleshooting tips\n\nContent: ${rawText}`;
          break;
        case 'tutorial':
        case 'guide':
          prompt = `Analyze this tutorial/guide for a personal memory system. Extract and summarize:\n\n1. **Learning Objective**: What will the reader learn or achieve?\n2. **Step-by-Step Process**: The main steps or stages\n3. **Key Techniques**: Important methods, tools, or approaches used\n4. **Prerequisites**: What knowledge or tools are needed beforehand?\n5. **Best Practices**: Important tips, warnings, or recommendations\n6. **Expected Outcomes**: What results should the reader expect?\n\nContent: ${rawText}`;
          break;
        case 'news_article':
          prompt = `Analyze this news article for a personal memory system. Extract and summarize:\n\n1. **Main Event**: What happened and when?\n2. **Key Facts**: Important details, numbers, dates, locations\n3. **Stakeholders**: Who is involved and what are their positions?\n4. **Implications**: What does this mean for the future?\n5. **Context**: Background information that helps understand the event\n6. **Quotes**: Important statements from key people\n\nContent: ${rawText}`;
          break;
        case 'code_repository':
          prompt = `Analyze this code repository content for a personal memory system. Extract and summarize:\n\n1. **Project Purpose**: What does this code do and why?\n2. **Key Components**: Main modules, functions, or classes\n3. **Technical Approach**: Programming languages, frameworks, or patterns used\n4. **Usage Instructions**: How to install, configure, or use this code\n5. **Important Features**: Key functionality or capabilities\n6. **Dependencies**: What other libraries or tools are required?\n\nContent: ${rawText}`;
          break;
        case 'qa_thread':
          prompt = `Analyze this Q&A thread for a personal memory system. Extract and summarize:\n\n1. **Main Question**: What problem or question is being asked?\n2. **Best Answer**: The most helpful or accepted solution\n3. **Alternative Solutions**: Other approaches or answers provided\n4. **Technical Details**: Important code, commands, or configurations\n5. **Common Issues**: Related problems others might face\n6. **Best Practices**: Recommended approaches or warnings\n\nContent: ${rawText}`;
          break;
        case 'video_content':
          prompt = `Analyze this video content description for a personal memory system. Extract and summarize:\n\n1. **Video Topic**: What is this video about?\n2. **Key Learning Points**: Main concepts or skills covered\n3. **Practical Applications**: How can this knowledge be used?\n4. **Important Timestamps**: Key sections or moments (if mentioned)\n5. **Related Topics**: What other subjects connect to this?\n6. **Action Items**: What should the viewer do next?\n\nContent: ${rawText}`;
          break;
        default:
          prompt = `Analyze this web content for a personal memory system. Extract and summarize:\n\n1. **Main Topic**: What is this content about?\n2. **Key Information**: Important facts, insights, or data\n3. **Practical Value**: How can this information be useful?\n4. **Important Details**: Specific examples, numbers, or specifics\n5. **Related Concepts**: What topics connect to this?\n6. **Actionable Insights**: What can be done with this information?\n\nContent: ${rawText}`;
      }
      
      // Add context information
      const contextInfo = [];
      if (title) contextInfo.push(`Title: ${title}`);
      if (url) contextInfo.push(`URL: ${url}`);
      if (contentSummary) contextInfo.push(`Context: ${contentSummary}`);
      if (keyTopics.length > 0) contextInfo.push(`Topics: ${keyTopics.join(', ')}`);
      
      if (contextInfo.length > 0) {
        prompt = `${contextInfo.join('\n')}\n\n${prompt}`;
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

  async extractContentMetadata(rawText: string, metadata?: any): Promise<{
    topics: string[];
    categories: string[];
    keyPoints: string[];
    sentiment: string;
    importance: number;
    searchableTerms: string[];
  }> {
    if (!this.ai) {
      throw new Error('Gemini service is not initialized. Please set GEMINI_API_KEY environment variable.');
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
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      if (!response.text) {
        throw new Error('No metadata generated from Gemini API');
      }

      // Parse JSON response
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON response from Gemini API');
      }

      const extractedMetadata = JSON.parse(jsonMatch[0]);
      
      // Validate and clean the response
      return {
        topics: Array.isArray(extractedMetadata.topics) ? extractedMetadata.topics.slice(0, 10) : [],
        categories: Array.isArray(extractedMetadata.categories) ? extractedMetadata.categories.slice(0, 5) : [],
        keyPoints: Array.isArray(extractedMetadata.keyPoints) ? extractedMetadata.keyPoints.slice(0, 8) : [],
        sentiment: typeof extractedMetadata.sentiment === 'string' ? extractedMetadata.sentiment : 'neutral',
        importance: typeof extractedMetadata.importance === 'number' ? Math.max(1, Math.min(10, extractedMetadata.importance)) : 5,
        searchableTerms: Array.isArray(extractedMetadata.searchableTerms) ? extractedMetadata.searchableTerms.slice(0, 15) : []
      };
    } catch (error) {
      console.error('Error extracting content metadata:', error);
      // Return default metadata if extraction fails
      return {
        topics: metadata?.key_topics?.slice(0, 5) || [],
        categories: [metadata?.content_type || 'web_page'],
        keyPoints: [],
        sentiment: 'neutral',
        importance: 5,
        searchableTerms: []
      };
    }
  }
}

export const geminiService = new GeminiService();
