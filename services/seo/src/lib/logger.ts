/**
 * Logger Utility
 * Centralised logging with colours, levels, history, and SSE broadcasting.
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, SUCCESS: 4,
};

const COLORS = {
  reset: '\x1b[0m', bright: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', cyan: '\x1b[36m',
};

const LOG_STYLES: Record<LogLevel, { color: string; icon: string }> = {
  DEBUG:   { color: COLORS.dim,    icon: '🔍' },
  INFO:    { color: COLORS.cyan,   icon: 'ℹ️' },
  WARN:    { color: COLORS.yellow, icon: '⚠️' },
  ERROR:   { color: COLORS.red,    icon: '❌' },
  SUCCESS: { color: COLORS.green,  icon: '✅' },
};

let currentLogLevel: LogLevel = 'INFO';
const logHistory: LogEntry[] = [];
const MAX_HISTORY = 1000;
let sseCallback: ((event: string, data: unknown) => void) | null = null;

export function setSSEBroadcast(cb: (event: string, data: unknown) => void): void {
  sseCallback = cb;
}

function formatTimestamp(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 23);
}

function log(level: LogLevel, category: string, message: string, data?: unknown): void {
  if (LOG_LEVELS[level] < LOG_LEVELS[currentLogLevel]) return;

  const timestamp = formatTimestamp();
  const style = LOG_STYLES[level];
  const entry: LogEntry = { timestamp, level, category, message, data };

  logHistory.push(entry);
  if (logHistory.length > MAX_HISTORY) logHistory.shift();

  const line = `${COLORS.dim}[${timestamp}]${COLORS.reset} ${style.color}${style.icon} ${level.padEnd(7)}${COLORS.reset} ${COLORS.bright}[${category.padEnd(15)}]${COLORS.reset} ${message}`;

  if (level === 'ERROR') {
    console.error(line);
    if (data) console.error(`${COLORS.dim}    └─ Details:${COLORS.reset}`, data);
  } else if (level === 'WARN') {
    console.warn(line);
  } else {
    console.log(line);
    if (data && level === 'DEBUG') console.log(`${COLORS.dim}    └─ Details:${COLORS.reset}`, data);
  }

  if (sseCallback) sseCallback('log', entry);
}

export const logDebug   = (c: string, m: string, d?: unknown) => log('DEBUG', c, m, d);
export const logInfo    = (c: string, m: string, d?: unknown) => log('INFO', c, m, d);
export const logWarn    = (c: string, m: string, d?: unknown) => log('WARN', c, m, d);
export const logError   = (c: string, m: string, d?: unknown) => log('ERROR', c, m, d);
export const logSuccess = (c: string, m: string, d?: unknown) => log('SUCCESS', c, m, d);

export function setLogLevel(level: LogLevel): void  { currentLogLevel = level; }
export function getLogLevel(): LogLevel              { return currentLogLevel; }

export function getLogHistory(opts?: { level?: LogLevel; category?: string; limit?: number }): LogEntry[] {
  let logs = [...logHistory];
  if (opts?.level)    logs = logs.filter(l => LOG_LEVELS[l.level] >= LOG_LEVELS[opts.level!]);
  if (opts?.category) logs = logs.filter(l => l.category.toLowerCase().includes(opts.category!.toLowerCase()));
  if (opts?.limit)    logs = logs.slice(-opts.limit);
  return logs;
}

export function clearLogHistory(): void { logHistory.length = 0; }

export class OperationTimer {
  private startTime = Date.now();
  constructor(private category: string, private operation: string) {
    logDebug(category, `Starting: ${operation}`);
  }
  complete(message?: string): number {
    const d = Date.now() - this.startTime;
    logSuccess(this.category, `${message || this.operation} completed in ${d > 1000 ? (d / 1000).toFixed(2) + 's' : d + 'ms'}`);
    return d;
  }
  error(err: string | Error): number {
    const d = Date.now() - this.startTime;
    const msg = err instanceof Error ? err.message : err;
    logError(this.category, `${this.operation} failed after ${d > 1000 ? (d / 1000).toFixed(2) + 's' : d + 'ms'}: ${msg}`);
    return d;
  }
}

export function startTimer(category: string, operation: string): OperationTimer {
  return new OperationTimer(category, operation);
}
