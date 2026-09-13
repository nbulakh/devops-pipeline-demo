/**
 * Property-based test for the Todo service layer.
 *
 * Property 3: A failing store operation returns an error and leaves the store
 * unchanged. When the store is forced to fail on `add` (via `create`) or on
 * `delete` (via `remove`), the service SHALL propagate a StoreError and the
 * store contents (items and their order) SHALL be identical before and after
 * the operation.
 *
 * Validates: Requirements 1.6, 3.4
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { TodoService } from '../src/services/todoService.js';
import { FailingStore } from '../src/store/inMemoryStore.js';
import { StoreError } from '../src/errors.js';
import type { TodoItem } from '../src/types.js';

const MIN_RUNS = 100;

/**
 * A store that fails on `add` and `delete` (propagating StoreError before any
 * mutation) but exposes a real, inspectable, ordered set of items via `list`.
 *
 * This lets the property assert the observable store contents are byte-for-byte
 * identical before and after a failing operation, for arbitrary starting state.
 * `list` itself never fails here so that the before/after snapshots are the
 * store's genuine contents rather than a forced failure.
 */
class FailingMutationStore extends FailingStore {
  private readonly items: TodoItem[];

  constructor(items: TodoItem[]) {
    super();
    // Defensive copy so external mutation cannot affect the snapshot.
    this.items = items.map((item) => ({ ...item }));
  }

  override list(): TodoItem[] {
    return this.items.map((item) => ({ ...item }));
  }
}

/** Generates an arbitrary, well-formed UUID v4 string. */
const uuidV4Arb = fc.uuid({ version: 4 });

/** Generates an arbitrary snapshot of store contents (items + order). */
const storeItemsArb = fc.array(
  fc.record({
    id: uuidV4Arb,
    title: fc.string({ minLength: 1, maxLength: 500 }),
    createdAt: fc.nat(),
  }),
  { maxLength: 10 },
);

/** Generates a title whose trimmed length is within the valid [1, 500] range. */
const validTitleArb = fc
  .string({ minLength: 1, maxLength: 500 })
  .map((s) => `x${s}`)
  .filter((s) => {
    const trimmed = s.trim();
    return trimmed.length >= 1 && trimmed.length <= 500;
  });

describe('TodoService — Property 3: failing store leaves the store unchanged', () => {
  // Feature: devops-pipeline-demo, Property 3: A failing store operation returns an error and leaves the store unchanged
  it('propagates StoreError from a failing create and leaves store contents identical', () => {
    fc.assert(
      fc.property(storeItemsArb, validTitleArb, (items, title) => {
        const store = new FailingMutationStore(items);
        const service = new TodoService(store);

        const before = store.list();

        expect(() => service.create(title)).toThrow(StoreError);

        const after = store.list();
        expect(after).toEqual(before);
      }),
      { numRuns: MIN_RUNS },
    );
  });

  // Feature: devops-pipeline-demo, Property 3: A failing store operation returns an error and leaves the store unchanged
  it('propagates StoreError from a failing delete and leaves store contents identical', () => {
    fc.assert(
      fc.property(storeItemsArb, uuidV4Arb, (items, targetId) => {
        const store = new FailingMutationStore(items);
        const service = new TodoService(store);

        const before = store.list();

        // A well-formed UUID v4 passes id validation and reaches the store,
        // which is forced to fail on delete.
        expect(() => service.remove(targetId)).toThrow(StoreError);

        const after = store.list();
        expect(after).toEqual(before);
      }),
      { numRuns: MIN_RUNS },
    );
  });
});
