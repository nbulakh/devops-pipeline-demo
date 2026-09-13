/**
 * Property-based test for Property 6 of the devops-pipeline-demo design.
 *
 * Property 6: Deleting a well-formed but absent id returns not-found and
 * leaves the store unchanged.
 *
 * For any store state and any well-formed UUID that is not present in the
 * store, TodoService.remove(id) SHALL throw NotFoundError and the store
 * contents (items and order) SHALL be unchanged.
 *
 * Validates: Requirements 3.2
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { TodoService } from '../src/services/todoService.js';
import { InMemoryTodoStore } from '../src/store/inMemoryStore.js';
import { NotFoundError } from '../src/errors.js';

// Feature: devops-pipeline-demo, Property 6: Deleting a well-formed but absent id returns not-found and leaves the store unchanged
describe('Property 6: deleting a well-formed but absent id returns not-found and leaves the store unchanged', () => {
  it('throws NotFoundError and leaves the store unchanged for an absent valid UUID', () => {
    fc.assert(
      fc.property(
        // Arbitrary store state: a list of valid titles (trimmed length 1..500)
        // that we seed into the store before attempting the absent delete.
        fc.array(
          fc
            .string({ minLength: 1, maxLength: 100 })
            .filter((s) => s.trim().length >= 1 && s.trim().length <= 500),
          { maxLength: 20 },
        ),
        // A well-formed UUID v4 candidate for deletion.
        fc.uuidV(4),
        (titles, candidateId) => {
          const store = new InMemoryTodoStore();
          const service = new TodoService(store);

          // Build an arbitrary store state via successful creates.
          for (const title of titles) {
            service.create(title);
          }

          // Ensure the candidate id is genuinely absent. The ids assigned by
          // the store come from crypto.randomUUID(); a collision with the
          // generated candidate is astronomically unlikely, but we guard
          // against it explicitly by skipping any colliding example.
          const before = service.list();
          fc.pre(!before.some((item) => item.id === candidateId));

          // Deleting a well-formed but absent id must be reported as not-found.
          expect(() => service.remove(candidateId)).toThrow(NotFoundError);

          // The store must be completely unchanged: same items, same order.
          const after = service.list();
          expect(after).toEqual(before);
        },
      ),
      { numRuns: 100 },
    );
  });
});
