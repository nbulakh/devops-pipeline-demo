/**
 * In-memory Todo_Store implementation.
 *
 * The store holds Todo_Item records in insertion order and exposes the
 * `TodoStore` interface consumed by the service layer. A test-only
 * `FailingStore` variant is provided to exercise the HTTP 500 error paths
 * (Requirements 1.6, 2.3, 3.4) without any real I/O.
 */

import { randomUUID } from 'node:crypto';
import type { TodoItem } from '../types.js';
import { StoreError } from '../errors.js';

/**
 * Contract for a Todo_Store. Implementations preserve insertion order and
 * treat failures atomically (a throwing operation leaves the store unchanged).
 */
export interface TodoStore {
  /**
   * Adds a new item built from the given title. Returns the stored item.
   * Throws {@link StoreError} on failure, leaving the store unchanged.
   */
  add(title: string): TodoItem;
  /** Returns all items ordered oldest -> newest by creation order. */
  list(): TodoItem[];
  /**
   * Removes the item with the given id. Returns `true` if an item was
   * removed, `false` if no matching item existed. Throws {@link StoreError}
   * on failure, leaving the store unchanged.
   */
  delete(id: string): boolean;
}

/**
 * Default in-memory store backed by an ordered `Map<string, TodoItem>`.
 *
 * A `Map` preserves insertion order, which directly satisfies the
 * oldest -> newest ordering requirement. An incrementing counter supplies the
 * monotonic `createdAt` ordering key on each stored record.
 */
export class InMemoryTodoStore implements TodoStore {
  private readonly items = new Map<string, TodoItem>();

  /** Monotonic sequence used to populate `createdAt` on new records. */
  private sequence = 0;

  add(title: string): TodoItem {
    // Build the full record before mutating any state so that, if anything
    // above this point were to throw, the store would remain unchanged.
    const item: TodoItem = {
      id: randomUUID(),
      title,
      createdAt: this.sequence,
    };

    // Only mutate after the record is fully constructed (atomic add).
    this.items.set(item.id, item);
    this.sequence += 1;

    return item;
  }

  list(): TodoItem[] {
    // Map iteration yields entries in insertion order (oldest -> newest).
    return Array.from(this.items.values());
  }

  delete(id: string): boolean {
    // Confirm presence before removing so a "not found" delete never mutates.
    if (!this.items.has(id)) {
      return false;
    }
    return this.items.delete(id);
  }
}

/**
 * Test-only store variant that always fails before performing any mutation.
 *
 * Every operation throws {@link StoreError} up front, so the store contents
 * (which are always empty here) are guaranteed to be unchanged. This drives
 * the HTTP 500 code paths in tests (Requirements 1.6, 2.3, 3.4).
 */
export class FailingStore implements TodoStore {
  add(): TodoItem {
    throw new StoreError('failed to add todo item');
  }

  list(): TodoItem[] {
    throw new StoreError('failed to list todo items');
  }

  delete(): boolean {
    throw new StoreError('failed to delete todo item');
  }
}
