import fs from 'fs'
import path from 'path'
import { getLogFilePath, getLoggerOutputMode, getMorganOutputMode } from './env.util'

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
}

const getTimestamp = (): string => {
  return new Date().toISOString().replace('Z', '')
}

const formatMessageForFile = (args: unknown[], label: string): string => {
  const timestamp = getTimestamp()
  const line = args
    .map(arg => {
      if (typeof arg === 'string') return arg
      try {
        return JSON.stringify(arg)
      } catch {
        return String(arg)
      }
    })
    .join(' ')
  return `[${timestamp}] ${label} ${line}\n`
}

const formatMessageForConsole = (args: unknown[], color: string, label: string): unknown[] => {
  const timestamp = `${colors.dim}${colors.gray}[${getTimestamp()}]${colors.reset}`
  const labelColor = `${color}${colors.bright}${label}${colors.reset}`
  const line = args
    .map(arg => {
      if (typeof arg === 'string') return arg
      try {
        return JSON.stringify(arg)
      } catch {
        return String(arg)
      }
    })
    .join(' ')
  return [timestamp, labelColor, line]
}

const shouldUseColors = process.stdout.isTTY && process.env.NO_COLOR !== '1'
const loggerOutputMode = getLoggerOutputMode()
const morganOutputMode = getMorganOutputMode()

const logFilePath = getLogFilePath()
const logDir = path.dirname(logFilePath)

let logFileStream: fs.WriteStream | null = null

const needsFileStream =
  (loggerOutputMode === 'log' || loggerOutputMode === 'both') ||
  (morganOutputMode === 'log' || morganOutputMode === 'both')

if (needsFileStream) {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true })
  }

  logFileStream = fs.createWriteStream(logFilePath, { flags: 'a' })

  process.on('exit', () => {
    logFileStream?.end()
  })

  process.on('SIGINT', () => {
    logFileStream?.end()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    logFileStream?.end()
    process.exit(0)
  })
}

const writeToFile = (message: string) => {
  if (logFileStream) {
    logFileStream.write(message)
  }
}

export const logger = {
  log: (...args: unknown[]) => {
    if (loggerOutputMode === 'none') return
    
    const fileMessage = formatMessageForFile(args, 'LOG')
    const shouldPrint = loggerOutputMode === 'print' || loggerOutputMode === 'both'
    const shouldLog = loggerOutputMode === 'log' || loggerOutputMode === 'both'

    if (shouldLog) {
      writeToFile(fileMessage)
    }
    if (shouldPrint) {
      const formatted = shouldUseColors
        ? formatMessageForConsole(args, colors.cyan, 'LOG')
        : [
            `[${getTimestamp()}]`,
            'LOG',
            args.map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' '),
          ]
      console.log(...formatted)
    }
  },
  error: (...args: unknown[]) => {
    if (loggerOutputMode === 'none') return
    
    const fileMessage = formatMessageForFile(args, 'ERROR')
    const shouldPrint = loggerOutputMode === 'print' || loggerOutputMode === 'both'
    const shouldLog = loggerOutputMode === 'log' || loggerOutputMode === 'both'

    if (shouldLog) {
      writeToFile(fileMessage)
    }
    if (shouldPrint) {
      const formatted = shouldUseColors
        ? formatMessageForConsole(args, colors.red, 'ERROR')
        : [
            `[${getTimestamp()}]`,
            'ERROR',
            args.map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' '),
          ]
      console.error(...formatted)
    }
  },
  warn: (...args: unknown[]) => {
    if (loggerOutputMode === 'none') return
    
    const fileMessage = formatMessageForFile(args, 'WARN')
    const shouldPrint = loggerOutputMode === 'print' || loggerOutputMode === 'both'
    const shouldLog = loggerOutputMode === 'log' || loggerOutputMode === 'both'

    if (shouldLog) {
      writeToFile(fileMessage)
    }
    if (shouldPrint) {
      const formatted = shouldUseColors
        ? formatMessageForConsole(args, colors.yellow, 'WARN')
        : [
            `[${getTimestamp()}]`,
            'WARN',
            args.map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' '),
          ]
      console.warn(...formatted)
    }
  },
  info: (...args: unknown[]) => {
    if (loggerOutputMode === 'none') return
    
    const fileMessage = formatMessageForFile(args, 'INFO')
    const shouldPrint = loggerOutputMode === 'print' || loggerOutputMode === 'both'
    const shouldLog = loggerOutputMode === 'log' || loggerOutputMode === 'both'

    if (shouldLog) {
      writeToFile(fileMessage)
    }
    if (shouldPrint) {
      const formatted = shouldUseColors
        ? formatMessageForConsole(args, colors.blue, 'INFO')
        : [
            `[${getTimestamp()}]`,
            'INFO',
            args.map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' '),
          ]
      console.info(...formatted)
    }
  },
  debug: (...args: unknown[]) => {
    if (loggerOutputMode === 'none') return
    
    const fileMessage = formatMessageForFile(args, 'DEBUG')
    const shouldPrint = loggerOutputMode === 'print' || loggerOutputMode === 'both'
    const shouldLog = loggerOutputMode === 'log' || loggerOutputMode === 'both'

    if (shouldLog) {
      writeToFile(fileMessage)
    }
    if (shouldPrint) {
      const formatted = shouldUseColors
        ? formatMessageForConsole(args, colors.gray, 'DEBUG')
        : [
            `[${getTimestamp()}]`,
            'DEBUG',
            args.map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' '),
          ]
      console.debug(...formatted)
    }
  },
  writeToFile: (message: string) => {
    writeToFile(message)
  },
}
