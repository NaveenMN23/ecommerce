/**
 * Minimal structured logger — zero dependencies.
 * Outputs newline-delimited JSON, compatible with Datadog, CloudWatch, and any
 * log aggregation tool that understands JSON lines.
 *
 * In production swap this for pino or winston without touching call sites.
 */

type LogContext = Record<string, unknown>;

function log(level: 'INFO' | 'WARN' | 'ERROR', msg: string, ctx?: LogContext): void {
  process.stdout.write(
    JSON.stringify({ level, msg, ...ctx, ts: new Date().toISOString() }) + '\n'
  );
}

export const logger = {
  info:  (msg: string, ctx?: LogContext) => log('INFO',  msg, ctx),
  warn:  (msg: string, ctx?: LogContext) => log('WARN',  msg, ctx),
  error: (msg: string, ctx?: LogContext) => log('ERROR', msg, ctx),
};
