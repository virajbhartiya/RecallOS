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
      lazyConnect: true,
      connectTimeout: 10000,
      commandTimeout: 3000,
      ...(connection.commandTimeout && { commandTimeout: Math.min(connection.commandTimeout, 3000) }),
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
    
    redisClient.on('error', (error) => {
      const errorMessage = error.message || String(error)
      if (errorMessage.includes('Command timed out') || errorMessage.includes('timeout')) {
        // Suppress timeout errors as they're handled in application code with Promise.race
        return
      }
      logger.error('Redis client error:', error)
    })
  }
  return redisClient
}
