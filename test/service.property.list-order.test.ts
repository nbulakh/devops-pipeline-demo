/**
 * Property-based test for the Todo service listing behavior.
 *
 * Property 4: Listing preserves creation order
 *   For any sequence of successful create operations, list() returns an array
 *   whose elements each contain only { id, title } and whose ids appear in the
 *   same order the items were created (oldest -> newest).
 *
 * Validates: Requirements 2.1
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { TodoService } from '../src/services/todoService.js';
import { InMemoryTodoStore } from '../src/store/inMemoryStore.js';

// Feature: devops-pipeline-demo, Property 4: Listing preserves creation order
describe('TodoService.list() — Property 4: Listing preserves creation order', () => {
  it('returns only {id, title} in oldest->newest creation order', () => {
    fc.assert(
      fc.property(
        // A random sequence of titles whose trimmed length is within [1, 500],
        // so every create() succeeds. Include unicode and surrounding
        // whitespace to exercise the trimming path.
        fc.array(
          fc
            .string({ minLength: 1, maxLength: 500 })
            .filter((s) => s.trim().length >= 1 && s.trim().length <= 500),
          { minLength: 0, maxLength: 30 },
        ),
        (rawTitles) => {
          const service = new TodoService(new InMemoryTodoStore());

          // Perform the successful creates in order, recording the expected
          // projection (id + trimmed title) in creation order.
          const expected = rawTitles.map((raw) => {
            const created = service.create(raw);
            return { id: created.id, title: created.title };
          });

          const listed = service.list();

          // Same length: exactly the created items appear.
          expect(listed).toHaveLength(expected.length);

          // Same order and values: oldest -> newest by creation order.
          expect(listed).toEqual(expected);

          // Each element contains ONLY id and title (no createdAt or extras).
          for (const item of listed) {
            expect(Object.keys(item).sort()).toEqual(['id', 'title']);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
