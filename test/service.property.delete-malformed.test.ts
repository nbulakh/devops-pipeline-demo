/**
 * Property-based test for the Todo service delete path with malformed ids.
 *
 * Property 7: Deleting a malformed or empty id returns a validation error and
 * leaves the store unchanged (Validates Requirements 3.3).
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { TodoService } from '../src/services/todoService.js';
import { InMemoryTodoStore } from '../src/store/inMemoryStore.js';
import { ValidationError } from '../src/errors.js';

/**
 * Matches a well-formed UUID v4 string (case-insensitive), mirroring the
 * pattern the service uses to validate ids. Used here only to *exclude* any
 * generated string that happens to be a valid UUID v4.
 */
const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * A snapshot of the store's public list projection, used to assert the store
 * contents (items and order) are unchanged across a rejected delete.
 */
function snapshot(service: TodoService): Array<{ id: string; title: string }> {
  return service.list();
}

describe('TodoService.remove property: malformed/empty id', () => {
  // Feature: devops-pipeline-demo, Property 7: Deleting a malformed or empty id returns a validation error and leaves the store unchanged
  it('rejects empty and non-UUID ids with ValidationError and leaves the store unchanged', () => {
    fc.assert(
      fc.property(
        // Seed the store with an arbitrary set of titles so the "unchanged"
        // assertion is meaningful across empty and non-empty store states.
        fc.array(
          fc
            .string({ minLength: 1, maxLength: 50 })
            .map((s) => s.trim())
            .filter((s) => s.length >= 1 && s.length <= 500),
          { maxLength: 8 },
        ),
        // A malformed id: either the empty string, or an arbitrary string that
        // is guaranteed NOT to be a valid UUID v4.
        fc.oneof(
          fc.constant(''),
          fc.string().filter((s) => !UUID_V4_PATTERN.test(s)),
        ),
        (titles, malformedId) => {
          const store = new InMemoryTodoStore();
          const service = new TodoService(store);

          // Build an arbitrary store state.
          for (const title of titles) {
            service.create(title);
          }

          const before = snapshot(service);

          // The delete must be rejected with a ValidationError...
          expect(() => service.remove(malformedId)).toThrow(ValidationError);

          // ...and the store contents (items and order) must be unchanged.
          const after = snapshot(service);
          expect(after).toEqual(before);
        },
      ),
      { numRuns: 100 },
    );
  });
});
