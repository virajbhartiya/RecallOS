import 'dotenv/config'
import path from 'path'
import fs from 'fs'
import { prisma } from '../lib/prisma.lib'
import { logger } from '../utils/logger.util'

async function run() {
  const args = process.argv.slice(2)
  const userArg = args.find(arg => arg.startsWith('--user='))
  const limitArg = args.find(arg => arg.startsWith('--limit='))

  const userId = userArg ? userArg.split('=')[1] : undefined
  const limit = limitArg ? Number(limitArg.split('=')[1]) : 50

  const queryEvents = await prisma.queryEvent.findMany({
    where: userId ? { user_id: userId } : undefined,
    orderBy: { created_at: 'desc' },
    take: Number.isFinite(limit) && limit > 0 ? limit : 50,
    include: {
      related: {
        orderBy: { rank: 'asc' },
        include: {
          memory: {
            select: {
              id: true,
              memory_type: true,
              importance_score: true,
            },
          },
        },
      },
    },
  })

  if (queryEvents.length === 0) {
    logger.warn('[memory-eval] No query events found, aborting.')
    process.exit(0)
  }

  let hits = 0
  let reciprocalRankSum = 0
  let scoreSum = 0
  let importanceSum = 0
  const typeCounts: Record<string, number> = {}

  queryEvents.forEach(event => {
    if (event.related.length > 0) {
      hits += 1
      const topRelation = event.related[0]
      reciprocalRankSum += 1 / Math.max(1, topRelation.rank)
      scoreSum += topRelation.score
      if (topRelation.memory?.importance_score) {
        importanceSum += topRelation.memory.importance_score
      }

      if (topRelation.memory?.memory_type) {
        typeCounts[topRelation.memory.memory_type] =
          (typeCounts[topRelation.memory.memory_type] || 0) + 1
      }
    }
  })

  const hitRate = hits / queryEvents.length
  const mrr = reciprocalRankSum / queryEvents.length
  const avgScore = scoreSum / Math.max(1, hits)
  const avgImportance = importanceSum / Math.max(1, hits)

  const report = {
    generatedAt: new Date().toISOString(),
    sampleSize: queryEvents.length,
    userScoped: !!userId,
    userId: userId || null,
    metrics: {
      hitRate,
      mrr,
      avgScore,
      avgImportance,
      topMemoryTypes: typeCounts,
    },
  }

  const outputDir = path.join(process.cwd(), 'api', 'tmp', 'evals')
  fs.mkdirSync(outputDir, { recursive: true })
  const outputPath = path.join(outputDir, `memory-eval-${Date.now()}.json`)
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2))
  // eslint-disable-next-line no-console
  console.log(`Memory evaluation written to ${outputPath}`)
  process.exit(0)
}

run().catch(error => {
  logger.error('[memory-eval] Evaluation failed', error)
  process.exit(1)
})
