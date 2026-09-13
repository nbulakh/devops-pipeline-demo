/**
 * Shared data types for the Todo API.
 *
 * These mirror the "Components and Interfaces" section of the design document.
 */

/**
 * The canonical stored record held by the Todo_Store.
 */
export interface TodoItem {
  /** UUID v4 identifier. */
  id: string;
  /** Trimmed title, 1..500 characters. */
  title: string;
  /** Monotonic ordering key used to preserve creation order (oldest -> newest). */
  createdAt: number;
}

/**
 * The public API representation of a todo (what clients see).
 */
export interface TodoResponse {
  id: string;
  title: string;
}

/**
 * Standard error body shape returned for all error responses.
 */
export interface ErrorBody {
  /** Human-readable message describing the failure. */
  error: string;
}
