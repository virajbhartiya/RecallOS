import { Request, Response, NextFunction } from 'express'
import { AuthenticatedRequest } from '../middleware/auth'
import AppError from '../utils/appError'
import { searchMemories } from '../services/memorySearch'
import { createSearchJob, getSearchJob } from '../services/searchJob'
import { logger } from '../utils/logger'

export const postSearch = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  let job: { id: string } | null = null
  try {
    const { query, limit, contextOnly } = req.body || {}
    if (!query) return next(new AppError('query is required', 400))

    if (!req.user) {
      return next(new AppError('User not authenticated', 401))
    }

    const userId = req.user.externalId || req.user.id

    logger.log('[search/controller] request received', {
      ts: new Date().toISOString(),
      userId: userId,
      query: query.slice(0, 100),
      limit,
      contextOnly,
    })

    const data = await searchMemories({
      userId: userId,
      query,
      limit,
      contextOnly,
      jobId: undefined,
    })

    // Only create job and return jobId if we don't have an immediate answer (for async delivery)
    if (!contextOnly && !data.answer) {
      job = createSearchJob()
      // Update job with initial results
      setImmediate(async () => {
        try {
          const { setSearchJobResult } = await import('../services/searchJob')
          await setSearchJobResult(job!.id, {
            status: 'pending',
            results: data.results.slice(0, 10).map(r => ({
              memory_id: r.memory_id,
              title: r.title,
              url: r.url,
              score: r.score,
            })),
          })
          // Generate answer asynchronously
          const filteredRows = data.results.map(r => ({
            id: r.memory_id,
            title: r.title,
            summary: r.summary,
            url: r.url,
            timestamp: BigInt(r.timestamp),
            content: r.summary || '',
          }))
          const bullets = filteredRows
            .map((r, i) => {
              const date = r.timestamp
                ? new Date(Number(r.timestamp) * 1000).toISOString().slice(0, 10)
                : ''
              return `- [${i + 1}] ${date} ${r.summary || ''}`.trim()
            })
            .join('\n')
          const ansPrompt = `You are RecallOS. Answer the user's query using the evidence notes, and insert bracketed numeric citations wherever you use a note.

Rules:
- Use inline numeric citations like [1], [2].
- Keep it concise (2-4 sentences).
- Plain text only.

CRITICAL: Return ONLY plain text content. Do not use any markdown formatting including:
- No asterisks (*) for bold or italic text
- No underscores (_) for emphasis
- No backticks for code blocks
- No hash symbols (#) for headers
- No brackets [] or parentheses () for links (except numeric citations [1], [2], etc.)
- No special characters for formatting
- No bullet points with dashes or asterisks
- No numbered lists with special formatting

Return clean, readable plain text only.

User query: "${data.query}"
Evidence notes (ordered by relevance):
${bullets}`
          const { aiProvider } = await import('../services/aiProvider')
          const { withTimeout } = await import('../services/memorySearch')
          logger.log('[search/controller] generating async answer', {
            ts: new Date().toISOString(),
            jobId: job.id,
          })
          const answerResult = await withTimeout(
            aiProvider.generateContent(ansPrompt, true),
            180000
          ) // 3 minutes for async, true = search request (high priority)
          type AnswerResult = string | { text?: string }
          const generatedAnswer =
            typeof answerResult === 'string'
              ? answerResult
              : (answerResult as AnswerResult).text || answerResult
          logger.log('[search/controller] async answer generated', {
            ts: new Date().toISOString(),
            jobId: job.id,
            answerLength: generatedAnswer?.length,
          })
          const allCitations = filteredRows.map((r, i) => ({
            label: i + 1,
            memory_id: r.id,
            title: r.title,
            url: r.url,
          }))
          const pickOrderFrom = (text: string | undefined) => {
            if (!text) return [] as number[]
            const order: number[] = []
            const seen = new Set<number>()
            const re = /\[([\d,\s]+)\]/g
            let m: RegExpExecArray | null
            while ((m = re.exec(text))) {
              const content = m[1]
              const numbers = content
                .split(',')
                .map(s => s.trim())
                .filter(s => s.length > 0)
                .map(s => Number(s))
              for (const n of numbers) {
                if (!isNaN(n) && !seen.has(n)) {
                  seen.add(n)
                  order.push(n)
                }
              }
            }
            return order
          }
          const order = pickOrderFrom(generatedAnswer)
          const generatedCitations = order.length
            ? order
                .map(n => allCitations.find(c => c.label === n))
                .filter(
                  (
                    c
                  ): c is {
                    label: number
                    memory_id: string
                    title: string | null
                    url: string | null
                  } => Boolean(c)
                )
            : []
          await setSearchJobResult(job!.id, {
            answer: generatedAnswer,
            citations: generatedCitations,
            status: 'completed',
          })
        } catch (error) {
          logger.error('[search] error generating async answer in controller:', error)
          try {
            const { setSearchJobResult } = await import('../services/searchJob')
            await setSearchJobResult(job!.id, { status: 'failed' })
          } catch (jobError) {
            logger.error('Error updating search job status:', jobError)
          }
        }
      })
    }

    // Return response with appropriate fields
    type SearchResponse = {
      query: string
      results: Array<{
        memory_id: string
        title: string | null
        summary: string | null
        url: string | null
        timestamp: number
        related_memories: string[]
        score: number
      }>
      answer?: string
      context?: string
      citations?: Array<{
        label: number
        memory_id: string
        title: string | null
        url: string | null
      }>
      status?: string
    }
    const response: SearchResponse = {
      query: data.query,
      results: data.results,
      answer: data.answer,
      citations: data.citations,
      context: data.context,
    }

    // Only return jobId if we don't have an answer (meaning it's being generated async)
    if (job && !data.answer) {
      response.job_id = job.id
    }

    res.status(200).json(response)
  } catch (err) {
    logger.error('Error in postSearch:', err)
    // Update search job status to failed if there's a job
    try {
      if (job?.id) {
        const { setSearchJobResult } = await import('../services/searchJob')
        await setSearchJobResult(job.id, { status: 'failed' })
      }
    } catch (jobError) {
      logger.error('Error updating search job status in controller:', jobError)
    }
    next(err)
  }
}

export const getSearchJobStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string }
    if (!id) return next(new AppError('job id required', 400))
    const job = await getSearchJob(id)
    if (!job) return next(new AppError('job not found', 404))
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.set('Pragma', 'no-cache')
    res.set('Expires', '0')
    res.set('Surrogate-Control', 'no-store')
    res.set('ETag', `${Date.now()}`)
    res.status(200).json(job)
  } catch (err) {
    next(err)
  }
}

export const getContext = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { query, limit } = req.body || {}
    if (!query) return next(new AppError('query is required', 400))

    if (!req.user) {
      return next(new AppError('User not authenticated', 401))
    }

    const userId = req.user.externalId || req.user.id

    const data = await searchMemories({ userId: userId, query, limit, contextOnly: true })

    res.status(200).json({
      query: data.query,
      context: data.context || 'No relevant memories found.',
      resultCount: data.results.length,
    })
  } catch (err) {
    next(err)
  }
}
