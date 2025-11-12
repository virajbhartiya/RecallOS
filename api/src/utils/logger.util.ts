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
  white: '\x1b[37m',
  gray: '\x1b[90m',
}

const getTimestamp = (): string => {
  return new Date().toISOString().replace('Z', '')
}

const formatMessage = (
  args: unknown[],
  color: string,
  label: string,
  method: 'log' | 'error' | 'warn' | 'info' | 'debug'
): unknown[] => {
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

export const logger = {
  log: (...args: unknown[]) => {
    const formatted = shouldUseColors
      ? formatMessage(args, colors.cyan, 'LOG', 'log')
      : [`[${getTimestamp()}]`, 'LOG', args.map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ')]
    console.log(...formatted)
  },
  error: (...args: unknown[]) => {
    const formatted = shouldUseColors
      ? formatMessage(args, colors.red, 'ERROR', 'error')
      : [
          `[${getTimestamp()}]`,
          'ERROR',
          args.map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' '),
        ]
    console.error(...formatted)
  },
  warn: (...args: unknown[]) => {
    const formatted = shouldUseColors
      ? formatMessage(args, colors.yellow, 'WARN', 'warn')
      : [`[${getTimestamp()}]`, 'WARN', args.map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ')]
    console.warn(...formatted)
  },
  info: (...args: unknown[]) => {
    const formatted = shouldUseColors
      ? formatMessage(args, colors.blue, 'INFO', 'info')
      : [`[${getTimestamp()}]`, 'INFO', args.map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ')]
    console.info(...formatted)
  },
  debug: (...args: unknown[]) => {
    const formatted = shouldUseColors
      ? formatMessage(args, colors.gray, 'DEBUG', 'debug')
      : [`[${getTimestamp()}]`, 'DEBUG', args.map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ')]
    console.debug(...formatted)
  },
}
