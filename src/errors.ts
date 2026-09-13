/**
 * Typed domain errors for the Todo API.
 *
 * Each error type maps to a specific HTTP status code in the centralized
 * error-handling middleware:
 *   - ValidationError -> 400
 *   - NotFoundError   -> 404
 *   - StoreError      -> 500
 */

/**
 * Raised when input fails validation (bad title, malformed id, invalid body).
 * Maps to HTTP 400.
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Raised when a well-formed identifier matches no existing Todo_Item.
 * Maps to HTTP 404.
 */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Raised when a Todo_Store operation fails. The store is left unchanged.
 * Maps to HTTP 500.
 */
export class StoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StoreError';
    Object.setPrototypeOf(this, StoreError.prototype);
  }
}
