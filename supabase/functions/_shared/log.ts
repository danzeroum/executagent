// Structured JSON logging for edge functions, mirroring packages/core/logger.
// trace_id is propagated through task_events so a whole task is reconstructable.
export interface LogCtx {
  fn: string;
  trace_id?: string;
  task_id?: string;
  [k: string]: unknown;
}

export function logger(ctx: LogCtx) {
  const emit = (level: string, msg: string, extra?: Record<string, unknown>) =>
    console.log(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...ctx, ...extra }));
  return {
    info: (m: string, e?: Record<string, unknown>) => emit("info", m, e),
    warn: (m: string, e?: Record<string, unknown>) => emit("warn", m, e),
    error: (m: string, e?: Record<string, unknown>) => emit("error", m, e),
    with: (extra: Record<string, unknown>) => logger({ ...ctx, ...extra }),
  };
}
