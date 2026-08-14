/**
 * Production-safe logger.
 * In production, only warn/error are emitted; in development, all levels are emitted.
 */

const isProd = typeof import.meta !== 'undefined' && import.meta.env?.PROD;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function shouldLog(level: LogLevel): boolean {
  if (level === 'error' || level === 'warn') {
    return true;
  }
  return !isProd;
}

export const logger = {
  debug: (...args: unknown[]) => {
    if (shouldLog('debug')) {
      console.debug('[Gupta_Chat]', ...args);
    }
  },
  info: (...args: unknown[]) => {
    if (shouldLog('info')) {
      console.info('[Gupta_Chat]', ...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (shouldLog('warn')) {
      console.warn('[Gupta_Chat]', ...args);
    }
  },
  error: (...args: unknown[]) => {
    if (shouldLog('error')) {
      console.error('[Gupta_Chat]', ...args);
    }
  },
};
