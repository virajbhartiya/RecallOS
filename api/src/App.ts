import express, { Request, Response, NextFunction } from 'express'

import morgan from 'morgan'

import cors from 'cors'

import compression from 'compression'

import cookieParser from 'cookie-parser'

import http from 'http'
import fs from 'fs'
import https from 'https'

import dotenv from 'dotenv'

import globalErrorHandler from './controller/utils/globalErrorController'

import { routes } from './routes/index.route'

import { prisma } from './lib/prisma'

import { startContentWorker } from './workers/contentWorker'
import { startCyclicProfileWorker } from './workers/profileWorker'
import { ensureCollection } from './lib/qdrant'
import { aiProvider } from './services/aiProvider'
import { logger } from './utils/logger'

dotenv.config()

const app = express()
app.set('trust proxy', 1)
app.use(cookieParser())

let server: http.Server | https.Server
if (process.env.NODE_ENV !== 'production' && process.env.HTTPS_ENABLE === 'true') {
  try {
    const keyPath = process.env.HTTPS_KEY_PATH || './certs/api.recallos.test+3-key.pem'
    const certPath = process.env.HTTPS_CERT_PATH || './certs/api.recallos.test+3.pem'
    const httpsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    }
    server = https.createServer(httpsOptions, app)
  } catch {
    server = http.createServer(app)
  }
} else {
  server = http.createServer(app)
}

const port = process.env.PORT || 3000

process.on('uncaughtException', (err: Error) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...')
  logger.error(err.name, err.message)
  process.exit(1)
})
morgan.token('timestamp', () => {
  return new Date().toISOString().replace('Z', '')
})

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
}

const shouldUseColors = process.stdout.isTTY && process.env.NO_COLOR !== '1'

const getMethodColor = (method: string): string => {
  if (!shouldUseColors) return ''
  switch (method) {
    case 'GET':
      return colors.green
    case 'POST':
      return colors.blue
    case 'PUT':
      return colors.yellow
    case 'PATCH':
      return colors.magenta
    case 'DELETE':
      return colors.red
    default:
      return colors.cyan
  }
}

const getStatusColor = (status: number): string => {
  if (!shouldUseColors) return ''
  if (status >= 500) return colors.red
  if (status >= 400) return colors.yellow
  if (status >= 300) return colors.cyan
  if (status >= 200) return colors.green
  return colors.reset
}

const coloredMorganFormat = (tokens: morgan.TokenIndexer, req: Request, res: Response): string => {
  const method = tokens.method(req, res)
  const status = tokens.status(req, res)
  const url = tokens.url(req, res)
  const responseTime = tokens['response-time'](req, res)
  const contentLength = tokens.res(req, res, 'content-length')
  const timestamp = tokens.timestamp(req, res)

  const methodColor = getMethodColor(method)
  const statusColor = getStatusColor(Number(status))
  const timestampColor = shouldUseColors ? colors.dim + colors.gray : ''
  const resetColor = shouldUseColors ? colors.reset : ''

  const coloredMethod = shouldUseColors ? `${methodColor}${method}${resetColor}` : method
  const coloredStatus = shouldUseColors ? `${statusColor}${status}${resetColor}` : status
  const coloredTimestamp = shouldUseColors
    ? `${timestampColor}${timestamp}${resetColor}`
    : timestamp

  return `${coloredTimestamp} ${coloredMethod} ${url} ${coloredStatus} ${responseTime} ms - ${contentLength || '-'}`
}

app.use(morgan(coloredMorganFormat))
app.use(express.urlencoded({ extended: false, limit: '10mb' }))
app.use(express.json({ limit: '10mb' }))
import { getAllowedOrigins } from './utils/env'
import { validateRequestSize } from './utils/validation'

app.use(validateRequestSize(10 * 1024 * 1024)) // 10MB limit

const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 60000) // 60 seconds default

app.use((req: Request, res: Response, next: NextFunction) => {
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        error: 'Request timeout',
        message: 'The request took too long to process',
      })
    }
  }, REQUEST_TIMEOUT_MS)

  res.on('finish', () => {
    clearTimeout(timeout)
  })

  res.on('close', () => {
    clearTimeout(timeout)
  })

  next()
})

app.use(
  cors({
    origin: (origin, callback) => {
      const allowlist = getAllowedOrigins()
      if (!origin) return callback(null, true)
      if (allowlist.has(origin)) return callback(null, true)
      return callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
)
app.use(compression())
routes(app)
app.use(
  globalErrorHandler as unknown as (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ) => void
)

async function testDatabaseConnection() {
  try {
    await prisma.$connect()
  } catch (error) {
    logger.error('Database connection failed:', error)
    process.exit(1)
  }
}

server.listen(port, async () => {
  const protocol =
    process.env.NODE_ENV !== 'production' && process.env.HTTPS_ENABLE === 'true' ? 'https' : 'http'
  await testDatabaseConnection()
  logger.log('[startup] database_connected')
  try {
    await ensureCollection()
    logger.log('[startup] qdrant_ready')
  } catch (e) {
    logger.warn('[startup] qdrant_unavailable', String((e as Error)?.message || e))
  }
  const aiReady = aiProvider.isInitialized
  logger.log('[startup] ai_provider', { initialized: aiReady })
  startContentWorker()
  logger.log('[startup] content_worker_started')
  startCyclicProfileWorker()
  logger.log('[startup] profile_worker_started')
  logger.log('[startup] server_listening', { protocol, port })
})
process.on('unhandledRejection', (err: Error) => {
  logger.error('Unhandled Rejection! 💥 Shutting down...')
  logger.error(err.name, err.message)
  server.close(() => {
    process.exit(1)
  })
})
