import { aiProvider } from './aiProvider';
import { prisma } from '../lib/prisma';

export interface StaticProfile {
  interests: string[];
  skills: string[];
  profession?: string;
  demographics?: {
    age_range?: string;
    location?: string;
    education?: string;
  };
  long_term_patterns: string[];
  domains: string[];
  expertise_areas: string[];
}

export interface DynamicProfile {
  recent_activities: string[];
  current_projects: string[];
  temporary_interests: string[];
  recent_changes: string[];
  current_context: string[];
}

export interface ProfileExtractionResult {
  static_profile_json: StaticProfile;
  static_profile_text: string;
  dynamic_profile_json: DynamicProfile;
  dynamic_profile_text: string;
}

export class ProfileExtractionService {
  async extractProfileFromMemories(
    userId: string,
    memories: Array<{
      id: string;
      title: string | null;
      summary: string | null;
      content: string;
      created_at: Date;
      page_metadata: any;
    }>
  ): Promise<ProfileExtractionResult> {
    if (memories.length === 0) {
      return this.getEmptyProfile();
    }

    const memoryContext = this.prepareMemoryContext(memories);
    const prompt = this.buildExtractionPrompt(memoryContext);

    try {
      const response = await aiProvider.generateContent(prompt, false, userId);
      const parsed = this.parseProfileResponse(response);
      return parsed;
    } catch (error) {
      console.error('Error extracting profile from memories:', error);
      return this.extractProfileFallback(memories);
    }
  }

  private prepareMemoryContext(
    memories: Array<{
      id: string;
      title: string | null;
      summary: string | null;
      content: string;
      created_at: Date;
      page_metadata: any;
    }>
  ): string {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const allMemories = memories.map((m, idx) => {
      const metadata = m.page_metadata as any;
      const daysAgo = Math.floor((now.getTime() - m.created_at.getTime()) / (1000 * 60 * 60 * 24));
      const isRecent = m.created_at >= thirtyDaysAgo;

      return `Memory ${idx + 1} (${daysAgo} days ago${isRecent ? ', RECENT' : ''}):
Title: ${m.title || 'Untitled'}
Summary: ${m.summary || 'No summary'}
Topics: ${metadata?.topics?.join(', ') || 'N/A'}
Categories: ${metadata?.categories?.join(', ') || 'N/A'}
Content preview: ${m.content.substring(0, 200)}...`;
    }).join('\n\n');

    const recentCount = memories.filter(m => m.created_at >= thirtyDaysAgo).length;
    const totalCount = memories.length;

    return `Total memories: ${totalCount}
Recent memories (last 30 days): ${recentCount}

Memories:
${allMemories}`;
  }

  private buildExtractionPrompt(memoryContext: string): string {
    return `You are RecallOS profile extraction system. Analyze the user's memories to build a comprehensive profile.

CRITICAL: Return ONLY valid JSON. No explanations, no markdown formatting, no code blocks, no special characters. Just the JSON object.

Return a JSON object with this exact structure:
{
  "static_profile_json": {
    "interests": ["long-term interests"],
    "skills": ["skills and expertise"],
    "profession": "profession or field",
    "demographics": {
      "age_range": "age range if evident",
      "location": "location if evident",
      "education": "education level if evident"
    },
    "long_term_patterns": ["persistent patterns"],
    "domains": ["knowledge domains"],
    "expertise_areas": ["areas of expertise"]
  },
  "static_profile_text": "Natural language description of long-term stable facts about the user (e.g., 'User is a techie who works in tech industry, interested in AI and software development')",
  "dynamic_profile_json": {
    "recent_activities": ["recent activities"],
    "current_projects": ["current projects"],
    "temporary_interests": ["temporary interests"],
    "recent_changes": ["recent life changes"],
    "current_context": ["current context"]
  },
  "dynamic_profile_text": "Natural language description of recent context (e.g., 'User recently got a job, currently researching mouse options, interested in productivity tools')"
}

Rules:
- Static profile: Facts that persist across time (e.g., "techie", "works in tech", "interested in AI")
- Dynamic profile: Recent context and temporary interests (e.g., "recently got a job", "currently researching X")
- All arrays can be empty if no relevant items
- static_profile_text and dynamic_profile_text should be concise but comprehensive (200-500 words each)
- Do not include information that cannot be inferred from the memories
- Be specific and factual, avoid generic statements

Memory Context:
${memoryContext}

Return ONLY the JSON object:`;
  }

  private parseProfileResponse(response: string): ProfileExtractionResult {
    try {
      let jsonMatch = response.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          jsonMatch[0] = jsonMatch[1];
        }
      }
      
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      let data;
      try {
        data = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        let fixedJson = jsonMatch[0];
        fixedJson = fixedJson.replace(/,(\s*[}\]])/g, '$1');
        fixedJson = fixedJson.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
        data = JSON.parse(fixedJson);
      }

      return {
        static_profile_json: data.static_profile_json || this.getEmptyProfile().static_profile_json,
        static_profile_text: data.static_profile_text || '',
        dynamic_profile_json: data.dynamic_profile_json || this.getEmptyProfile().dynamic_profile_json,
        dynamic_profile_text: data.dynamic_profile_text || '',
      };
    } catch (error) {
      console.error('Error parsing profile response:', error);
      return this.getEmptyProfile();
    }
  }

  private extractProfileFallback(
    memories: Array<{
      id: string;
      title: string | null;
      summary: string | null;
      content: string;
      created_at: Date;
      page_metadata: any;
    }>
  ): ProfileExtractionResult {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const allTopics = new Set<string>();
    const allCategories = new Set<string>();
    const recentTopics = new Set<string>();
    const recentCategories = new Set<string>();

    memories.forEach(m => {
      const metadata = m.page_metadata as any;
      const isRecent = m.created_at >= thirtyDaysAgo;

      if (metadata?.topics) {
        metadata.topics.forEach((topic: string) => {
          allTopics.add(topic);
          if (isRecent) recentTopics.add(topic);
        });
      }

      if (metadata?.categories) {
        metadata.categories.forEach((cat: string) => {
          allCategories.add(cat);
          if (isRecent) recentCategories.add(cat);
        });
      }
    });

    const staticProfile: StaticProfile = {
      interests: Array.from(allTopics).slice(0, 10),
      skills: [],
      long_term_patterns: Array.from(allCategories).slice(0, 5),
      domains: Array.from(allCategories).slice(0, 5),
      expertise_areas: Array.from(allTopics).slice(0, 5),
    };

    const dynamicProfile: DynamicProfile = {
      recent_activities: Array.from(recentTopics).slice(0, 5),
      current_projects: [],
      temporary_interests: Array.from(recentTopics).slice(0, 5),
      recent_changes: [],
      current_context: Array.from(recentCategories).slice(0, 3),
    };

    return {
      static_profile_json: staticProfile,
      static_profile_text: `User is interested in: ${Array.from(allTopics).slice(0, 5).join(', ')}. Active in domains: ${Array.from(allCategories).slice(0, 3).join(', ')}.`,
      dynamic_profile_json: dynamicProfile,
      dynamic_profile_text: `Recently interested in: ${Array.from(recentTopics).slice(0, 5).join(', ')}.`,
    };
  }

  private getEmptyProfile(): ProfileExtractionResult {
    return {
      static_profile_json: {
        interests: [],
        skills: [],
        long_term_patterns: [],
        domains: [],
        expertise_areas: [],
      },
      static_profile_text: 'No profile information available yet.',
      dynamic_profile_json: {
        recent_activities: [],
        current_projects: [],
        temporary_interests: [],
        recent_changes: [],
        current_context: [],
      },
      dynamic_profile_text: 'No recent context available yet.',
    };
  }
}

export const profileExtractionService = new ProfileExtractionService();

