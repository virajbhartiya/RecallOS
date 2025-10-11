import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    
    // The client gets the API key from the environment variable `GEMINI_API_KEY`
    this.ai = new GoogleGenAI({ apiKey });
  }

  async summarizeContent(rawText: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Summarize key insights from the following content:\n\n${rawText}`,
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
