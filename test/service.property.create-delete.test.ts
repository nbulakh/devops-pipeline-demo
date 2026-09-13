/**
 * Property-based test for the create-then-delete round-trip on TodoService.
 *
 * // Feature: devops-pipeline-demo, Property 5: Create-then-delete round-trip removes exactly that item
 *
 * For any store state and any item currently present in it, deleting that
 * item's id removes exactly that item: the deleted item no longer appears in
 * the list, the list length decreases by exactly one, and all other items
 * remain present in their original (oldest -> newest) order.
 *
 * Validates: Requirements 3.1
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { TodoService } from '../src/services/todoService.js';
import { InMemoryTodoStore } from '../src/store/inMemoryStore.js';

/**
 * Arbitrary title whose trimmed length is guaranteed to be within [1, 500],
 * so every generated create succeeds and contributes one item to the store.
 * Includes unicode and surrounding whitespace to exercise trimming.
 */
const validTitleArb = fc
  .string({ minLength: 1, maxLength: 100 })
  .map((s) => s.trim())
  .filter((s) => s.length >= 1 && s.length <= 500);

describe('TodoService create-then-delete round-trip (Property 5)', () => {
  // Feature: devops-pipeline-demo, Property 5: Create-then-delete round-trip removes exactly that item
  it('removes exactly the targeted item, preserving the order of the rest', () => {
    fc.assert(
      fc.property(
        // A non-empty sequence of valid titles builds an arbitrary store state.
        fc.array(validTitleArb, { minLength: 1, maxLength: 20 }),
        // Fractional selector -> index of the present item to delete.
        fc.double({ min: 0, max: 1, noNaN: true }),
        (titles, selector) => {
          const store = new InMemoryTodoStore();
          const service = new TodoService(store);

          // Build the store state.
          const created = titles.map((title) => service.create(title));

          const before = service.list();
          const targetIndex = Math.min(
            before.length - 1,
            Math.floor(selector * before.length),
          );
          const target = before[targetIndex];

          // Delete the present item's id (should succeed with no throw).
          expect(() => service.remove(target.id)).not.toThrow();

          const after = service.list();

          // Length decreases by exactly one.
          expect(after.length).toBe(before.length - 1);

          // The deleted item no longer appears.
          expect(after.some((item) => item.id === target.id)).toBe(false);

          // All other items remain, in their original relative order.
          const expectedRemaining = before.filter(
            (item) => item.id !== target.id,
          );
          expect(after).toEqual(expectedRemaining);

          // Sanity: the created ids are unique so exactly one match existed.
          expect(new Set(created.map((c) => c.id)).size).toBe(created.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});
