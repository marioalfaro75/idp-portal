const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type LogLevel = keyof typeof LOG_LEVELS;

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

const SENSITIVE_PATTERNS: [RegExp, string][] = [
  [/AKIA[0-9A-Z]{16}/g, '[REDACTED_AWS_KEY]'],
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]*/g, '[REDACTED_TOKEN]'],
];

const SENSITIVE_KEYS = /password|secret|token|private.?key|credential|authorization/i;

function redactString(s: string): string {
  let result = s;
  for (const [pattern, replacement] of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function redactMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (SENSITIVE_KEYS.test(key)) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'string') {
      result[key] = redactString(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactMeta(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  if (LOG_LEVELS[level] < LOG_LEVELS[currentLevel]) return;
  const timestamp = new Date().toISOString();
  const safeMsg = redactString(message);
  const safeMetaStr = meta ? ` ${JSON.stringify(redactMeta(meta))}` : '';
  console[level === 'debug' ? 'log' : level](`[${timestamp}] [${level.toUpperCase()}] ${safeMsg}${safeMetaStr}`);
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => log('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta),
};
