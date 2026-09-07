import pino, { type Logger } from 'pino';

/**
 * Logger for the CLI scripts.
 *
 * `pino-pretty` is a transport, which runs in a worker thread and buffers its
 * output. That is fine on a terminal but means a piped or redirected run shows
 * nothing until the process exits — exactly when you most want to watch a slow
 * deploy make progress. So pretty-print only when stdout is a TTY, and fall
 * back to pino's default synchronous JSON writer otherwise.
 */
export function createLogger(name: string): Logger {
  const level = process.env['LOG_LEVEL'] ?? 'info';
  return process.stdout.isTTY
    ? pino({ name, level, transport: { target: 'pino-pretty' } })
    : pino({ name, level });
}
