// Structured JSON logging with a trace_id carried through the whole task flow.
// The lightweight stand-in for OpenTelemetry (which is scale-vision).

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  fn: string; // edge function / module name
  trace_id?: string;
  task_id?: string;
  [key: string]: unknown;
}

export interface Logger {
  debug(msg: string, extra?: Record<string, unknown>): void;
  info(msg: string, extra?: Record<string, unknown>): void;
  warn(msg: string, extra?: Record<string, unknown>): void;
  error(msg: string, extra?: Record<string, unknown>): void;
  child(extra: Record<string, unknown>): Logger;
}

function emit(ctx: LogContext, level: LogLevel, msg: string, extra?: Record<string, unknown>): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, msg, ...ctx, ...extra });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function createLogger(ctx: LogContext): Logger {
  return {
    debug: (m, e) => emit(ctx, "debug", m, e),
    info: (m, e) => emit(ctx, "info", m, e),
    warn: (m, e) => emit(ctx, "warn", m, e),
    error: (m, e) => emit(ctx, "error", m, e),
    child: (extra) => createLogger({ ...ctx, ...extra }),
  };
}
