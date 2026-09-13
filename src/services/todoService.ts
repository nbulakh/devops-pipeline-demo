/**
 * Service layer for the Todo API.
 *
 * The service owns input validation and orchestration between the HTTP layer
 * and the {@link TodoStore}. It translates invalid input and store failures
 * into typed domain errors:
 *   - ValidationError -> 400 (bad title, malformed id)
 *   - NotFoundError   -> 404 (well-formed id that matches no item)
 *   - StoreError      -> 500 (propagated from the store, unchanged)
 *
 * See the "Service interface" section of the design document.
 */

import type { TodoResponse } from '../types.js';
import type { TodoStore } from '../store/inMemoryStore.js';
import { ValidationError, NotFoundError } from '../errors.js';

/** Minimum allowed length of a trimmed title. */
const TITLE_MIN_LENGTH = 1;
/** Maximum allowed length of a trimmed title. */
const TITLE_MAX_LENGTH = 500;

/**
 * Matches a well-formed UUID v4 string (case-insensitive), as produced by
 * `crypto.randomUUID()`. The version nibble must be `4` and the variant
 * nibble must be one of 8, 9, a, or b.
 */
const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Orchestrates validation and store access for todo operations.
 */
export class TodoService {
  private readonly store: TodoStore;

  constructor(store: TodoStore) {
    this.store = store;
  }

  /**
   * Validates the raw title, then stores a new todo item.
   *
   * The title must be a string whose length, after trimming leading and
   * trailing whitespace, is between {@link TITLE_MIN_LENGTH} and
   * {@link TITLE_MAX_LENGTH} inclusive. The trimmed title is what gets stored.
   *
   * @throws {ValidationError} when the title is missing, not a string, empty
   *   after trimming, or longer than 500 characters after trimming.
   * @throws {StoreError} propagated unchanged when the store fails.
   */
  create(rawTitle: unknown): TodoResponse {
    if (typeof rawTitle !== 'string') {
      throw new ValidationError('title must be a string');
    }

    const title = rawTitle.trim();

    if (title.length < TITLE_MIN_LENGTH || title.length > TITLE_MAX_LENGTH) {
      throw new ValidationError(
        `title must be between ${TITLE_MIN_LENGTH} and ${TITLE_MAX_LENGTH} characters after trimming`,
      );
    }

    // A StoreError thrown here propagates to the caller unchanged.
    const item = this.store.add(title);

    return { id: item.id, title: item.title };
  }

  /**
   * Returns all todos projected to the public {@link TodoResponse} shape,
   * preserving oldest -> newest creation order.
   *
   * @throws {StoreError} propagated unchanged when the store fails.
   */
  list(): TodoResponse[] {
    return this.store.list().map((item) => ({ id: item.id, title: item.title }));
  }

  /**
   * Validates the id format, then removes the matching todo item.
   *
   * @throws {ValidationError} when the id is empty or not a well-formed UUID v4.
   * @throws {NotFoundError} when the id is well-formed but matches no item.
   * @throws {StoreError} propagated unchanged when the store fails.
   */
  remove(id: string): void {
    if (typeof id !== 'string' || !UUID_V4_PATTERN.test(id)) {
      throw new ValidationError('id must be a well-formed UUID v4');
    }

    // A StoreError thrown here propagates to the caller unchanged.
    const removed = this.store.delete(id);

    if (!removed) {
      throw new NotFoundError('no todo item found for the given id');
    }
  }
}
