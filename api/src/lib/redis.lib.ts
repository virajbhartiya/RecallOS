import Redis from 'ioredis'
import { getRedisConnection } from '../utils/env.util'
import { logger } from '../utils/logger.util'

let redisClient: Redis | null = null

export function getRedisClient(): Redis {
  if (!redisClient) {
    const connection = getRedisConnection()
    const commonOptions = {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
      connectTimeout: 10000,
      commandTimeout: connection.commandTimeout || 60000,
      keepAlive: 10000,
      retryStrategy: (times: number) => {
        if (times > 3) {
          return null
        }
        return Math.min(times * 200, 2000)
      },
    }
    if ('url' in connection) {
      redisClient = new Redis(connection.url, commonOptions)
    } else {
      redisClient = new Redis({
        host: connection.host,
        port: connection.port,
        username: connection.username,
        password: connection.password,
        ...commonOptions,
      })
    }

    redisClient.on('error', error => {
      const errorMessage = error.message || String(error)
      if (errorMessage.includes('Command timed out') || errorMessage.includes('timeout')) {
        return
      }
      logger.error('Redis client error:', error)
    })

    redisClient.on('connect', () => {
      logger.log('Redis client connected')
    })

    redisClient.on('ready', () => {
      logger.log('Redis client ready')
    })
  }
  return redisClient
}

export async function scanKeys(
  client: Redis,
  pattern: string,
  maxKeys: number = 1000
): Promise<string[]> {
  const keys: string[] = []
  let cursor = '0'

  do {
    const result = await client.scan(cursor, 'MATCH', pattern, 'COUNT', '100')
    cursor = result[0]
    const foundKeys = result[1]
    keys.push(...foundKeys)

    if (keys.length >= maxKeys) {
      break
    }
  } while (cursor !== '0')

  return keys.slice(0, maxKeys)
}
