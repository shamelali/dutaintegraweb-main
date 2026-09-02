// api/lib/errors.js — unified error taxonomy
export class AppError extends Error {
  constructor(message, { status = 500, code = "INTERNAL", expose = true, cause } = {}) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.expose = expose;
    if (cause) this.cause = cause;
  }
}

export function toHttpError(err) {
  if (err instanceof AppError) return err;
  // map known audit errors
  const code = err?.code || "INTERNAL";
  const map = {
    NO_URL: 400, BAD_URL: 400, BAD_SCHEME: 400, BAD_HOST: 400, NOT_HTML: 400, BLOCKED: 400, TIMEOUT: 504,
  };
  const status = map[code] || 500;
  return new AppError(err?.message || "Internal error", { status, code, expose: status < 500 });
}

export function errorBody(err, { requestId } = {}) {
  const http = toHttpError(err);
  return {
    ok: false,
    error: http.expose ? http.message : "Internal error",
    code: http.code,
    ...(requestId ? { requestId } : {}),
  };
}
