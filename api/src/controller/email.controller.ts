import { Response, NextFunction } from 'express'

import { AuthenticatedRequest } from '../middleware/auth.middleware'
import AppError from '../utils/app-error.util'
import { profileUpdateService } from '../services/profile-update.service'
import { aiProvider } from '../services/ai-provider.service'
import { logger } from '../utils/logger.util'
import { searchMemories } from '../services/memory-search.service'

const MAX_THREAD_CHARS = 15000
const MAX_DRAFT_CHARS = 6000

type EmailDraftResult = {
  subject: string
  body: string
  summary?: string
}

const sanitizeText = (value: unknown, limit: number): string => {
  if (!value || typeof value !== 'string') {
    return ''
  }
  return value.replace(/\s+/g, ' ').trim().substring(0, limit)
}

const extractJson = (text: string): string | null => {
  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null
  }
  return text.substring(firstBrace, lastBrace + 1)
}

const parseDraftResponse = (raw: string): EmailDraftResult | null => {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    const extracted = extractJson(raw)
    if (!extracted) {
      return null
    }
    try {
      parsed = JSON.parse(extracted)
    } catch {
      return null
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return null
  }

  const subject = sanitizeText((parsed as any).subject, 200)
  const body = ((parsed as any).body || '').toString().trim()
  const summary = sanitizeText((parsed as any).summary || (parsed as any).overview, 400)

  if (!subject || !body) {
    return null
  }

  return {
    subject,
    body,
    summary: summary || undefined,
  }
}

export const draftEmailReply = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    logger.log('[email/draft] Request received', {
      userId: req.user?.id,
      hasBody: !!req.body,
      bodyKeys: req.body ? Object.keys(req.body) : [],
      threadTextLength: req.body?.thread_text?.length || 0,
    })

    if (!req.user) {
      return next(new AppError('User not authenticated', 401))
    }

    const threadText = sanitizeText(req.body?.thread_text, MAX_THREAD_CHARS)
    const subject = sanitizeText(req.body?.subject, 500)
    const provider =
      typeof req.body?.provider === 'string' ? req.body.provider.substring(0, 120) : 'unknown'
    const participants =
      Array.isArray(req.body?.participants) && req.body.participants.length > 0
        ? req.body.participants
            .map((participant: unknown) => sanitizeText(participant, 80))
            .filter(Boolean)
        : []
    const existingDraft = sanitizeText(req.body?.existing_draft, MAX_DRAFT_CHARS)

    if (!threadText || threadText.length < 50) {
      return next(new AppError('thread_text must be at least 50 characters', 400))
    }

    // Get user profile context (summary of important memories)
    let profileContext: string | null = null
    try {
      profileContext = await profileUpdateService.getProfileContext(req.user.id)
    } catch (profileError) {
      logger.warn('[email/draft] Failed to get profile context, continuing without it', {
        error: profileError instanceof Error ? profileError.message : String(profileError),
        userId: req.user.id,
      })
    }
    const normalizedProfile = profileContext || 'No profile context available.'

    // Search for relevant memories related to this email thread
    let relevantMemoriesContext = ''
    try {
      // Build a search query from the email thread and participants
      const searchQuery = [
        subject,
        ...participants.slice(0, 3), // Search by participant names
        threadText.substring(0, 200), // First 200 chars of thread for topic extraction
      ]
        .filter(Boolean)
        .join(' ')

      if (searchQuery.length > 20) {
        logger.log('[email/draft] Searching for relevant memories', {
          userId: req.user.id,
          queryLength: searchQuery.length,
        })

        const searchResults = await searchMemories({
          userId: req.user.id,
          query: searchQuery,
          limit: 15, // Get top 15 most relevant memories for better context
          enableReasoning: false,
          contextOnly: true, // Just get context, don't generate answer
          policy: 'chat', // Use chat policy for balanced retrieval
        })

        if (searchResults.results && searchResults.results.length > 0) {
          const memorySummaries = searchResults.results
            .slice(0, 15)
            .map((mem, idx) => {
              const date = mem.timestamp
                ? new Date(mem.timestamp * 1000).toISOString().slice(0, 10)
                : ''
              return `[${idx + 1}] ${date}: ${mem.title || 'Untitled'} - ${mem.summary || ''}`
            })
            .join('\n')

          relevantMemoriesContext = `\n\nRELEVANT MEMORIES FROM USER'S KNOWLEDGE BASE:\n${memorySummaries}\n\nUse these memories to provide context-aware responses. Reference specific details when relevant.`

          logger.log('[email/draft] Found relevant memories', {
            userId: req.user.id,
            memoryCount: searchResults.results.length,
          })
        }
      }
    } catch (memorySearchError) {
      logger.warn('[email/draft] Failed to search relevant memories, continuing without them', {
        error:
          memorySearchError instanceof Error
            ? memorySearchError.message
            : String(memorySearchError),
        userId: req.user.id,
      })
      // Continue without memory search - not critical
    }

    const prompt = `You are Cognia, a precise email drafting co-pilot. Using the user's profile, relevant memories, and the full thread, write a ready-to-send reply.

RULES:
- Match the tone of the thread while keeping it professional and friendly.
- Assume you are replying as the user. Reference commitments, timelines, and any requests clearly.
- Use relevant memories to provide context-aware responses (e.g., reference past conversations, preferences, or commitments).
- If the thread includes questions, answer them. If decisions are needed, propose next steps.
- Keep greetings and sign-off natural, e.g., "Hi Alex," and "Best, <USER>" (do NOT include their actual name – just say "Best,").
- Subject line must be <= 120 characters and reflect the reply content (rewrite if necessary).
- Body must be plain text with paragraphs separated by blank lines (no markdown, no bullets unless present in thread).
- Never include placeholders like "[insert]" or "[signature]".

Return ONLY valid JSON with this shape:
{
  "subject": "Improved subject",
  "body": "Reply body with paragraphs separated by blank lines.",
  "summary": "One sentence summary (<=40 words)."
}

USER PROFILE:
${normalizedProfile}${relevantMemoriesContext}

PARTICIPANTS: ${participants.join(', ') || 'Not specified'}
EMAIL PROVIDER: ${provider}
CURRENT SUBJECT: ${subject || 'Not provided'}
EXISTING DRAFT: ${existingDraft || 'None'}

EMAIL THREAD (newest first if possible):
${threadText}`

    logger.log('[email/draft] Calling AI provider', {
      userId: req.user.id,
      promptLength: prompt.length,
      threadTextLength: threadText.length,
    })

    let aiResponse: string
    try {
      // Use 5.5 minute timeout (330000ms) for email drafts - pass timeout override and high priority flag
      // Email drafts get priority 9 (below search but above normal processing) to ensure fast response
      // Timeout is slightly less than middleware timeout (6 minutes) to allow for cleanup
      aiResponse = await aiProvider.generateContent(prompt, false, req.user.id, 330000, true)
      logger.log('[email/draft] AI response received', {
        userId: req.user.id,
        responseLength: aiResponse?.length || 0,
      })
    } catch (aiError) {
      const errorMessage = aiError instanceof Error ? aiError.message : String(aiError)
      const isTimeout = errorMessage.includes('timeout') || errorMessage === 'timeout'

      logger.error('[email/draft] AI provider failed', {
        error: errorMessage,
        isTimeout,
        stack: aiError instanceof Error ? aiError.stack : undefined,
        userId: req.user.id,
      })

      return next(
        new AppError(
          isTimeout
            ? 'AI provider timed out. Please try again with a shorter email thread.'
            : `AI provider failed: ${errorMessage}`,
          isTimeout ? 504 : 502
        )
      )
    }

    const parsed = parseDraftResponse(aiResponse)

    if (!parsed) {
      logger.warn('[email/draft] Failed to parse AI response', {
        userId: req.user.id,
        responsePreview: aiResponse?.substring(0, 500) || 'No response',
        responseLength: aiResponse?.length || 0,
      })
      return next(new AppError('Failed to generate email draft: Invalid response format', 502))
    }

    res.status(200).json({
      success: true,
      data: parsed,
    })
  } catch (error) {
    logger.error('[email/draft] Error drafting reply:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.user?.id,
    })
    next(
      new AppError(
        `Failed to draft email reply: ${error instanceof Error ? error.message : String(error)}`,
        500
      )
    )
  }
}
