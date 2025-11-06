const getTimestamp = (): string => {
  return new Date().toISOString().replace('Z', '');
};

const formatMessage = (args: any[]): any[] => {
  return [`[${getTimestamp()}]`, ...args];
};

export const logger = {
  log: (...args: any[]) => {
    console.log(...formatMessage(args));
  },
  error: (...args: any[]) => {
    console.error(...formatMessage(args));
  },
  warn: (...args: any[]) => {
    console.warn(...formatMessage(args));
  },
  info: (...args: any[]) => {
    console.info(...formatMessage(args));
  },
  debug: (...args: any[]) => {
    console.debug(...formatMessage(args));
  },
};

