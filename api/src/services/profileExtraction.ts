import { aiProvider } from './aiProvider'
import { logger } from '../utils/logger'

export interface StaticProfile {
  interests: string[]
  skills: string[]
  profession?: string
  demographics?: {
    age_range?: string
    location?: string
    education?: string
  }
  long_term_patterns: string[]
  domains: string[]
  expertise_areas: string[]
  personality_traits?: string[]
  work_style?: {
    preferred_work_hours?: string
    collaboration_style?: string
    decision_making_style?: string
    problem_solving_approach?: string
  }
  communication_style?: {
    preferred_channels?: string[]
    communication_frequency?: string
    tone_preference?: string
  }
  learning_preferences?: {
    preferred_learning_methods?: string[]
    learning_pace?: string
    knowledge_retention_style?: string
  }
  values_and_priorities?: string[]
  technology_preferences?: {
    preferred_tools?: string[]
    tech_comfort_level?: string
    preferred_platforms?: string[]
  }
  lifestyle_patterns?: {
    activity_level?: string
    social_patterns?: string
    productivity_patterns?: string
  }
  cognitive_style?: {
    thinking_pattern?: string
    information_processing?: string
    creativity_level?: string
  }
}

export interface DynamicProfile {
  recent_activities: string[]
  current_projects: string[]
  temporary_interests: string[]
  recent_changes: string[]
  current_context: string[]
  active_goals?: string[]
  current_challenges?: string[]
  recent_achievements?: string[]
  current_focus_areas?: string[]
  emotional_state?: {
    current_concerns?: string[]
    current_excitements?: string[]
    stress_level?: string
  }
  active_research_topics?: string[]
  upcoming_events?: string[]
}

export interface ProfileExtractionResult {
  static_profile_json: StaticProfile
  static_profile_text: string
  dynamic_profile_json: DynamicProfile
  dynamic_profile_text: string
}

export class ProfileExtractionService {
  async extractProfileFromMemories(
    userId: string,
    memories: Array<{
      id: string
      title: string | null
      summary: string | null
      content: string
      created_at: Date
      page_metadata: any
    }>
  ): Promise<ProfileExtractionResult> {
    if (memories.length === 0) {
      return this.getEmptyProfile()
    }

    const memoryContext = this.prepareMemoryContext(memories)
    const prompt = this.buildExtractionPrompt(memoryContext)

    try {
      const response = await aiProvider.generateContent(prompt, false, userId)
      const parsed = this.parseProfileResponse(response)
      return parsed
    } catch (error) {
      logger.error('Error extracting profile from memories, retrying once:', error)

      try {
        const retryResponse = await aiProvider.generateContent(prompt, false, userId)
        const retryParsed = this.parseProfileResponse(retryResponse)
        logger.log('Profile extraction succeeded on retry')
        return retryParsed
      } catch (retryError) {
        logger.error('Error extracting profile from memories on retry, using fallback:', retryError)
        return this.extractProfileFallback(memories)
      }
    }
  }

  private prepareMemoryContext(
    memories: Array<{
      id: string
      title: string | null
      summary: string | null
      content: string
      created_at: Date
      page_metadata: any
    }>
  ): string {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const allMemories = memories
      .map((m, idx) => {
        const metadata = m.page_metadata as any
        const daysAgo = Math.floor((now.getTime() - m.created_at.getTime()) / (1000 * 60 * 60 * 24))
        const isRecent = m.created_at >= thirtyDaysAgo

        return `Memory ${idx + 1} (${daysAgo} days ago${isRecent ? ', RECENT' : ''}):
Title: ${m.title || 'Untitled'}
Summary: ${m.summary || 'No summary'}
Topics: ${metadata?.topics?.join(', ') || 'N/A'}
Categories: ${metadata?.categories?.join(', ') || 'N/A'}
Content preview: ${m.content.substring(0, 200)}...`
      })
      .join('\n\n')

    const recentCount = memories.filter(m => m.created_at >= thirtyDaysAgo).length
    const totalCount = memories.length

    return `Total memories: ${totalCount}
Recent memories (last 30 days): ${recentCount}

Memories:
${allMemories}`
  }

  private buildExtractionPrompt(memoryContext: string): string {
    return `You are RecallOS profile extraction system. Your task is to deeply understand WHO this user is as a person, not just what they do. Analyze their memories to build a comprehensive, deeply personalized profile that captures their essence, personality, preferences, and unique characteristics.

CRITICAL: Return ONLY valid JSON. No explanations, no markdown formatting, no code blocks, no special characters. Just the JSON object.

IMPORTANT JSON RULES:
- All strings must be properly escaped (use \\" for quotes inside strings, \\n for newlines)
- No trailing commas
- All property names must be in double quotes
- All string values must be in double quotes
- Escape all special characters in strings (quotes, newlines, backslashes)
- Do not include any text before or after the JSON object
- The JSON must be valid and parseable

Return a JSON object with this exact structure:
{
  "static_profile_json": {
    "interests": ["long-term interests and passions"],
    "skills": ["skills, expertise, and competencies"],
    "profession": "profession, field, or career path",
    "demographics": {
      "age_range": "age range if evident",
      "location": "location if evident",
      "education": "education level if evident"
    },
    "long_term_patterns": ["persistent behavioral patterns, habits, or tendencies"],
    "domains": ["knowledge domains and areas of focus"],
    "expertise_areas": ["areas of deep expertise"],
    "personality_traits": ["personality characteristics inferred from behavior and content"],
    "work_style": {
      "preferred_work_hours": "when they seem most active or productive",
      "collaboration_style": "how they work with others (independent, collaborative, etc.)",
      "decision_making_style": "how they make decisions (analytical, intuitive, etc.)",
      "problem_solving_approach": "how they approach problems (systematic, creative, etc.)"
    },
    "communication_style": {
      "preferred_channels": ["communication methods they use"],
      "communication_frequency": "how often they communicate",
      "tone_preference": "formal, casual, technical, etc."
    },
    "learning_preferences": {
      "preferred_learning_methods": ["how they learn (reading, videos, hands-on, etc.)"],
      "learning_pace": "fast, methodical, deep-dive, etc.",
      "knowledge_retention_style": "how they retain information"
    },
    "values_and_priorities": ["core values and what matters to them"],
    "technology_preferences": {
      "preferred_tools": ["tools, platforms, or technologies they use"],
      "tech_comfort_level": "early adopter, mainstream, cautious, etc.",
      "preferred_platforms": ["platforms they prefer"]
    },
    "lifestyle_patterns": {
      "activity_level": "active, balanced, focused, etc.",
      "social_patterns": "social preferences and patterns",
      "productivity_patterns": "how they organize and manage productivity"
    },
    "cognitive_style": {
      "thinking_pattern": "analytical, creative, practical, strategic, etc.",
      "information_processing": "how they process information (detail-oriented, big-picture, etc.)",
      "creativity_level": "highly creative, methodical, balanced, etc."
    }
  },
  "static_profile_text": "A rich, detailed natural language description (300-600 words) that captures WHO this user is as a person. Include their personality, work style, values, preferences, thinking patterns, and what makes them unique. Write as if you truly know them - be specific, personal, and insightful. Example: This user is a deeply analytical technologist who thrives on understanding complex systems. They have a methodical approach to problem-solving, preferring to dive deep into technical details before making decisions. They value efficiency and productivity, often researching tools and methods to optimize their workflow. Their communication style is technical and precise, suggesting they work in a field that requires accuracy. They show patterns of continuous learning, particularly in emerging technologies, and seem to be an early adopter of new tools. Their interests span from practical productivity tools to deep technical concepts, indicating a balance between pragmatism and intellectual curiosity. They appear to be someone who thinks systematically, values quality over speed, and has a strong preference for well-designed, functional solutions.",
  "dynamic_profile_json": {
    "recent_activities": ["recent activities and behaviors"],
    "current_projects": ["active projects or initiatives"],
    "temporary_interests": ["temporary or emerging interests"],
    "recent_changes": ["recent life or work changes"],
    "current_context": ["current situational context"],
    "active_goals": ["goals they're actively pursuing"],
    "current_challenges": ["challenges they're facing"],
    "recent_achievements": ["recent accomplishments or milestones"],
    "current_focus_areas": ["what they're currently focusing on"],
    "emotional_state": {
      "current_concerns": ["current worries or concerns"],
      "current_excitements": ["what they're excited about"],
      "stress_level": "high, medium, low, or inferred level"
    },
    "active_research_topics": ["topics they're actively researching"],
    "upcoming_events": ["upcoming events or deadlines"]
  },
  "dynamic_profile_text": "A detailed natural language description (200-400 words) of their current state, recent changes, active goals, challenges, and what's happening in their life right now. Be specific and personal. Example: Currently, this user is in an active research phase, exploring productivity tools and optimization methods. They recently seem to have taken on new responsibilities or projects, as evidenced by their increased focus on workflow efficiency. They are actively researching specific tools like mice for productivity, suggesting they are making practical decisions about their work setup. There is a pattern of them seeking to improve their daily operations, indicating they might be preparing for increased workload or new challenges. Their current focus appears to be on practical, actionable improvements to their work environment and processes."
}

Deep Analysis Guidelines:
- Go beyond surface-level facts - understand their personality, motivations, and unique characteristics
- Infer work style from when and how they engage with content
- Understand their thinking patterns from the types of content they consume
- Identify their values from what they prioritize and focus on
- Recognize their communication style from the language and topics they engage with
- Understand their learning preferences from how they consume information
- Identify patterns in their behavior, interests, and focus areas
- Be specific and personal - avoid generic statements
- Only include information that can be reasonably inferred from the memories
- For personality traits, think about: Are they analytical? Creative? Methodical? Spontaneous? Detail-oriented? Big-picture? Introverted? Extroverted? Practical? Theoretical?
- For work style, consider: When do they work? How do they approach tasks? Do they prefer structure or flexibility?
- For values, think about: What do they prioritize? What matters to them? What drives their decisions?

Memory Context:
${memoryContext}

Return ONLY the JSON object:`
  }

  private parseProfileResponse(response: string): ProfileExtractionResult {
    let jsonStr = this.extractJsonString(response)

    if (!jsonStr) {
      throw new Error('No JSON found in response')
    }

    let data

    try {
      data = JSON.parse(jsonStr)
    } catch {
      try {
        jsonStr = this.fixJson(jsonStr)
        data = JSON.parse(jsonStr)
      } catch {
        try {
          jsonStr = this.fixJsonAdvanced(jsonStr)
          data = JSON.parse(jsonStr)
        } catch (thirdError) {
          logger.error('Error parsing profile response after fixes:', thirdError)
          logger.error('JSON string (first 1000 chars):', jsonStr.substring(0, 1000))
          logger.error(
            'JSON string (last 500 chars):',
            jsonStr.substring(Math.max(0, jsonStr.length - 500))
          )
          throw new Error('Failed to parse JSON after fixes')
        }
      }
    }

    if (!data.static_profile_json || !data.dynamic_profile_json) {
      throw new Error('Invalid profile structure: missing required fields')
    }

    return {
      static_profile_json: data.static_profile_json,
      static_profile_text: data.static_profile_text || '',
      dynamic_profile_json: data.dynamic_profile_json,
      dynamic_profile_text: data.dynamic_profile_text || '',
    }
  }

  private extractJsonString(response: string): string | null {
    const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
    if (jsonMatch && jsonMatch[1]) {
      return jsonMatch[1]
    }

    const firstBrace = response.indexOf('{')
    if (firstBrace === -1) {
      return null
    }

    let braceCount = 0
    let inString = false
    let escapeNext = false
    let lastValidBrace = -1

    for (let i = firstBrace; i < response.length; i++) {
      const char = response[i]

      if (escapeNext) {
        escapeNext = false
        continue
      }

      if (char === '\\') {
        escapeNext = true
        continue
      }

      if (char === '"' && !escapeNext) {
        inString = !inString
        continue
      }

      if (inString) {
        continue
      }

      if (char === '{') {
        braceCount++
        lastValidBrace = i
      } else if (char === '}') {
        braceCount--
        if (braceCount === 0) {
          return response.substring(firstBrace, i + 1)
        }
        lastValidBrace = i
      }
    }

    if (lastValidBrace > firstBrace) {
      return response.substring(firstBrace, lastValidBrace + 1)
    }

    return null
  }

  private fixJson(jsonStr: string): string {
    let fixed = jsonStr

    fixed = fixed.replace(/,(\s*[}\]])/g, '$1')

    fixed = fixed.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')

    const textFields = ['static_profile_text', 'dynamic_profile_text']
    for (const field of textFields) {
      const regex = new RegExp(`"${field}"\\s*:\\s*"([^"]*(?:\\\\.[^"]*)*)"`, 'g')
      fixed = fixed.replace(regex, (match, value) => {
        const escaped = value
          .replace(/\\\\/g, '\\')
          .replace(/\\"/g, '"')
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\t/g, '\\t')
        return `"${field}": "${escaped}"`
      })
    }

    fixed = fixed.replace(/:\s*"([^"]*(?:\\.[^"]*)*)"\s*([,}\]])/g, (match, value, end) => {
      if (value.includes('"') && !value.match(/\\"/)) {
        const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
        return `: "${escaped}"${end}`
      }
      return match
    })

    return fixed
  }

  private fixJsonAdvanced(jsonStr: string): string {
    let fixed = jsonStr

    fixed = fixed.replace(/,(\s*[}\]])/g, '$1')

    fixed = fixed.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')

    const lastBrace = fixed.lastIndexOf('}')
    if (lastBrace !== -1 && lastBrace < fixed.length - 1) {
      fixed = fixed.substring(0, lastBrace + 1)
    }

    fixed = this.escapeUnescapedQuotesInStrings(fixed)

    return fixed
  }

  private escapeUnescapedQuotesInStrings(jsonStr: string): string {
    let result = ''
    let inString = false
    let escapeNext = false

    for (let i = 0; i < jsonStr.length; i++) {
      const char = jsonStr[i]

      if (escapeNext) {
        result += char
        escapeNext = false
        continue
      }

      if (char === '\\') {
        result += char
        escapeNext = true
        continue
      }

      if (char === '"') {
        if (!inString) {
          inString = true
          result += char
        } else {
          const nextChar = i + 1 < jsonStr.length ? jsonStr[i + 1] : ''
          if (
            nextChar === ':' ||
            nextChar === ',' ||
            nextChar === '}' ||
            nextChar === ']' ||
            nextChar === '\n' ||
            nextChar === '\r' ||
            nextChar === ' '
          ) {
            inString = false
            result += char
          } else {
            result += '\\"'
          }
        }
      } else {
        result += char
      }
    }

    return result
  }

  private extractProfileFallback(
    memories: Array<{
      id: string
      title: string | null
      summary: string | null
      content: string
      created_at: Date
      page_metadata: any
    }>
  ): ProfileExtractionResult {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const allTopics = new Set<string>()
    const allCategories = new Set<string>()
    const recentTopics = new Set<string>()
    const recentCategories = new Set<string>()

    memories.forEach(m => {
      const metadata = m.page_metadata as any
      const isRecent = m.created_at >= thirtyDaysAgo

      if (metadata?.topics) {
        metadata.topics.forEach((topic: string) => {
          allTopics.add(topic)
          if (isRecent) recentTopics.add(topic)
        })
      }

      if (metadata?.categories) {
        metadata.categories.forEach((cat: string) => {
          allCategories.add(cat)
          if (isRecent) recentCategories.add(cat)
        })
      }
    })

    const staticProfile: StaticProfile = {
      interests: Array.from(allTopics).slice(0, 10),
      skills: [],
      long_term_patterns: Array.from(allCategories).slice(0, 5),
      domains: Array.from(allCategories).slice(0, 5),
      expertise_areas: Array.from(allTopics).slice(0, 5),
      personality_traits: [],
      work_style: {},
      communication_style: {},
      learning_preferences: {},
      values_and_priorities: [],
      technology_preferences: {},
      lifestyle_patterns: {},
      cognitive_style: {},
    }

    const dynamicProfile: DynamicProfile = {
      recent_activities: Array.from(recentTopics).slice(0, 5),
      current_projects: [],
      temporary_interests: Array.from(recentTopics).slice(0, 5),
      recent_changes: [],
      current_context: Array.from(recentCategories).slice(0, 3),
      active_goals: [],
      current_challenges: [],
      recent_achievements: [],
      current_focus_areas: [],
      emotional_state: {},
      active_research_topics: Array.from(recentTopics).slice(0, 5),
      upcoming_events: [],
    }

    return {
      static_profile_json: staticProfile,
      static_profile_text: `User is interested in: ${Array.from(allTopics).slice(0, 5).join(', ')}. Active in domains: ${Array.from(allCategories).slice(0, 3).join(', ')}.`,
      dynamic_profile_json: dynamicProfile,
      dynamic_profile_text: `Recently interested in: ${Array.from(recentTopics).slice(0, 5).join(', ')}.`,
    }
  }

  private getEmptyProfile(): ProfileExtractionResult {
    return {
      static_profile_json: {
        interests: [],
        skills: [],
        long_term_patterns: [],
        domains: [],
        expertise_areas: [],
        personality_traits: [],
        work_style: {},
        communication_style: {},
        learning_preferences: {},
        values_and_priorities: [],
        technology_preferences: {},
        lifestyle_patterns: {},
        cognitive_style: {},
      },
      static_profile_text: 'No profile information available yet.',
      dynamic_profile_json: {
        recent_activities: [],
        current_projects: [],
        temporary_interests: [],
        recent_changes: [],
        current_context: [],
        active_goals: [],
        current_challenges: [],
        recent_achievements: [],
        current_focus_areas: [],
        emotional_state: {},
        active_research_topics: [],
        upcoming_events: [],
      },
      dynamic_profile_text: 'No recent context available yet.',
    }
  }
}

export const profileExtractionService = new ProfileExtractionService()
