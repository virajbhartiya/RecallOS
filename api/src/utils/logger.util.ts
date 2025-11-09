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

const formatMessage = (args: unknown[], color: string, label: string): unknown[] => {
  const timestamp = `${colors.dim}${colors.gray}[${getTimestamp()}]${colors.reset}`
  const labelColor = `${color}${colors.bright}${label}${colors.reset}`
  return [timestamp, labelColor, ...args]
}

const shouldUseColors = process.stdout.isTTY && process.env.NO_COLOR !== '1'

export const logger = {
  log: (...args: unknown[]) => {
    const formatted = shouldUseColors
      ? formatMessage(args, colors.cyan, 'LOG')
      : [`[${getTimestamp()}]`, 'LOG', ...args]
    console.log(...formatted)
  },
  error: (...args: unknown[]) => {
    const formatted = shouldUseColors
      ? formatMessage(args, colors.red, 'ERROR')
      : [`[${getTimestamp()}]`, 'ERROR', ...args]
    console.error(...formatted)
  },
  warn: (...args: unknown[]) => {
    const formatted = shouldUseColors
      ? formatMessage(args, colors.yellow, 'WARN')
      : [`[${getTimestamp()}]`, 'WARN', ...args]
    console.warn(...formatted)
  },
  info: (...args: unknown[]) => {
    const formatted = shouldUseColors
      ? formatMessage(args, colors.blue, 'INFO')
      : [`[${getTimestamp()}]`, 'INFO', ...args]
    console.info(...formatted)
  },
  debug: (...args: unknown[]) => {
    const formatted = shouldUseColors
      ? formatMessage(args, colors.gray, 'DEBUG')
      : [`[${getTimestamp()}]`, 'DEBUG', ...args]
    console.debug(...formatted)
  },
}
