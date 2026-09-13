/**
 * Centralized Express error-handling middleware for the Todo API.
 *
 * All error handling flows through typed domain errors caught here, which
 * guarantees a consistent JSON error body (`{ "error": "..." }`) and the
 * correct HTTP status code:
 *   - ValidationError               -> 400
 *   - express.json() parse failure  -> 400
 *   - NotFoundError                 -> 404
 *   - StoreError                    -> 500
 *   - anything else                 -> 500 (generic)
 *
 * No code path here emits 401/403 or a `WWW-Authenticate` challenge header,
 * upholding the open-access invariant (Requirements 4.3, 4.4).
 *
 * See the "Error Handling" section of the design document.
 */

import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { ErrorBody } from '../types.js';
import { ValidationError, NotFoundError, StoreError } from '../errors.js';

/**
 * Detects a body-parser (`express.json()`) parse failure.
 *
 * `express.json()` surfaces malformed/absent JSON bodies as an error whose
 * `type` is `'entity.parse.failed'`, or as a `SyntaxError` carrying a
 * `status`/`statusCode` property. Either shape is mapped to HTTP 400.
 */
function isJsonParseError(err: unknown): boolean {
  if (err === null || typeof err !== 'object') {
    return false;
  }

  const candidate = err as {
    type?: unknown;
    status?: unknown;
    statusCode?: unknown;
  };

  if (candidate.type === 'entity.parse.failed') {
    return true;
  }

  if (err instanceof SyntaxError) {
    const status =
      typeof candidate.status === 'number'
        ? candidate.status
        : typeof candidate.statusCode === 'number'
          ? candidate.statusCode
          : undefined;
    return status === 400;
  }

  return false;
}

/**
 * Maps a caught error to its HTTP status code and error message.
 */
function mapError(err: unknown): { status: number; message: string } {
  if (err instanceof ValidationError) {
    return { status: 400, message: err.message };
  }

  if (isJsonParseError(err)) {
    return { status: 400, message: 'invalid request body: malformed JSON' };
  }

  if (err instanceof NotFoundError) {
    return { status: 404, message: err.message };
  }

  if (err instanceof StoreError) {
    return { status: 500, message: err.message };
  }

  return { status: 500, message: 'internal server error' };
}

/**
 * Express error-handling middleware. Must be registered last, after the routes.
 *
 * The `next` parameter is required so Express recognizes this as an
 * error-handling middleware (it inspects the arity of the handler), even
 * though it is intentionally unused here.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const { status, message } = mapError(err);
  const body: ErrorBody = { error: message };
  res.status(status).json(body);
};

/**
 * Fallback handler for unknown routes/methods. Registered after all routes but
 * before {@link errorHandler}. Always responds with a JSON 404 body and never
 * emits an authentication challenge.
 */
export const notFoundHandler: RequestHandler = (_req, res) => {
  const body: ErrorBody = { error: 'resource not found' };
  res.status(404).json(body);
};
