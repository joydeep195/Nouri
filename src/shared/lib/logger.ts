// A tiny on-device logger. Entries live in memory only (never stored or sent anywhere), so a
// problem can be inspected from the error screen without any third-party telemetry.

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  at: number;
  level: LogLevel;
  message: string;
  detail?: string | undefined;
}

const MAX_ENTRIES = 50;
const buffer: LogEntry[] = [];

export function describeError(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`.slice(0, 500);
  if (typeof err === 'string') return err.slice(0, 500);
  return 'Unknown error';
}

function push(level: LogLevel, message: string, detail?: unknown) {
  buffer.push({ at: Date.now(), level, message, detail: detail === undefined ? undefined : describeError(detail) });
  if (buffer.length > MAX_ENTRIES) buffer.shift();
  if (!import.meta.env.DEV) return;
  if (level === 'error') console.error(`[nouri] ${message}`, detail ?? '');
  else if (level === 'warn') console.warn(`[nouri] ${message}`, detail ?? '');
}

export const logger = {
  info: (message: string, detail?: unknown) => {
    push('info', message, detail);
  },
  warn: (message: string, detail?: unknown) => {
    push('warn', message, detail);
  },
  error: (message: string, detail?: unknown) => {
    push('error', message, detail);
  },
  entries: (): readonly LogEntry[] => [...buffer],
  clear: () => {
    buffer.length = 0;
  },
};

let installed = false;

/** Records uncaught errors and unhandled promise rejections. */
export function installGlobalErrorHandlers(target: Window = window): void {
  if (installed) return;
  installed = true;
  target.addEventListener('error', (e) => {
    logger.error('Uncaught error', e.error ?? e.message);
  });
  target.addEventListener('unhandledrejection', (e) => {
    logger.error('Unhandled promise rejection', e.reason);
  });
}
