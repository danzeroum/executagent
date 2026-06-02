// Typed errors + the standard error envelope. Note the deliberate generic 404:
// "not found" and "forbidden" are indistinguishable to callers (anti-enumeration).

export interface ErrorDetail {
  field?: string;
  message: string;
  [key: string]: unknown;
}

export class AppError extends Error {
  readonly code: string;
  readonly httpStatus: number;
  readonly details?: ErrorDetail[];
  constructor(code: string, httpStatus: number, message: string, details?: ErrorDetail[]) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.httpStatus = httpStatus;
    if (details) this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: ErrorDetail[]) {
    super("VALIDATION_ERROR", 400, message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super("UNAUTHORIZED", 401, message);
  }
}

/** Generic 404 — used for both missing and forbidden resources (no 403 leak). */
export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super("NOT_FOUND", 404, message);
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests") {
    super("RATE_LIMITED", 429, message);
  }
}

export interface ErrorEnvelope {
  error: { code: string; message: string; details?: ErrorDetail[]; request_id?: string };
}

export function toErrorEnvelope(err: unknown, requestId?: string): { status: number; body: ErrorEnvelope } {
  if (err instanceof AppError) {
    return {
      status: err.httpStatus,
      body: {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
          ...(requestId ? { request_id: requestId } : {}),
        },
      },
    };
  }
  // Unknown errors never leak internals.
  return {
    status: 500,
    body: { error: { code: "INTERNAL", message: "Internal server error", ...(requestId ? { request_id: requestId } : {}) } },
  };
}
