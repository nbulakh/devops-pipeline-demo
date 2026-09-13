/**
 * Property-based test for the TodoService create-validation behavior.
 *
 * Property 2: Invalid title is rejected and leaves the store unchanged.
 * For any title value that is missing, not a string, empty after trimming,
 * or longer than 500 characters after trimming, TodoService.create SHALL
 * throw a ValidationError and the store contents (items + order) SHALL be
 * identical to their state before the request.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { TodoService } from '../src/services/todoService.js';
import { InMemoryTodoStore } from '../src/store/inMemoryStore.js';
import { ValidationError } from '../src/errors.js';
import type { TodoItem } from '../src/types.js';

/** Snapshot the store's full contents (items in order) for comparison. */
function snapshot(store: InMemoryTodoStore): TodoItem[] {
  return store.list().map((item) => ({ ...item }));
}

/**
 * Arbitrary that yields a "valid" title (trimmed length in [1, 500]) used to
 * pre-populate the store so the "unchanged" assertion is meaningful.
 */
const validTitleArb = fc
  .string({ minLength: 1, maxLength: 200 })
  .filter((s) => {
    const t = s.trim();
    return t.length >= 1 && t.length <= 500;
  });

/**
 * Arbitrary that yields an invalid title value covering every rejection case:
 *  - missing: undefined / null
 *  - non-string: numbers, booleans, objects, arrays
 *  - empty-after-trim: "", whitespace-only strings
 *  - too long: strings whose trimmed length exceeds 500
 */
const invalidTitleArb: fc.Arbitrary<unknown> = fc.oneof(
  // missing
  fc.constant(undefined),
  fc.constant(null),
  // non-string values
  fc.integer(),
  fc.double(),
  fc.boolean(),
  fc.object(),
  fc.array(fc.string()),
  // empty after trimming (empty string or whitespace-only)
  fc.constant(''),
  fc.stringMatching(/^[ \t\n\r]{1,20}$/),
  // longer than 500 characters after trimming
  fc
    .string({ minLength: 501, maxLength: 800 })
    // ensure trimmed length is still > 500 by padding with non-whitespace
    .map((s) => 'a'.repeat(501) + s),
);

describe('TodoService.create - Property 2: invalid title rejected, store unchanged', () => {
  // Feature: devops-pipeline-demo, Property 2: Invalid title is rejected and leaves the store unchanged
  it('rejects invalid titles with ValidationError and leaves the store unchanged', () => {
    fc.assert(
      fc.property(
        fc.array(validTitleArb, { maxLength: 10 }),
        invalidTitleArb,
        (seedTitles, invalidTitle) => {
          const store = new InMemoryTodoStore();
          const service = new TodoService(store);

          // Pre-populate the store with a sequence of valid items.
          for (const title of seedTitles) {
            service.create(title);
          }

          const before = snapshot(store);

          // The invalid create must throw a ValidationError.
          expect(() => service.create(invalidTitle)).toThrow(ValidationError);

          // Store contents (items and order) must be identical afterwards.
          const after = snapshot(store);
          expect(after).toEqual(before);
        },
      ),
      { numRuns: 200 },
    );
  });
});
