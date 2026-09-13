/**
 * Property-based test for the Todo service create round-trip.
 *
 * Property 1: Create round-trip
 * For any string whose trimmed length is between 1 and 500, creating a todo
 * with that title stores the trimmed title, returns a well-formed unique UUID,
 * and grows the list by exactly one item containing that id and title.
 *
 * Validates: Requirements 1.1, 1.2, 1.5
 */

// Feature: devops-pipeline-demo, Property 1: Create round-trip

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { TodoService } from '../src/services/todoService.js';
import { InMemoryTodoStore } from '../src/store/inMemoryStore.js';

/** Matches a well-formed UUID v4 string, as produced by `crypto.randomUUID()`. */
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Generates arbitrary unicode strings (including surrounding whitespace) whose
 * trimmed length lands within the valid [1, 500] range. We build the string as
 * optional leading/trailing whitespace around a non-empty core whose trimmed
 * length is constrained, then filter to guarantee the trimmed length invariant
 * holds even when the core itself contains interior whitespace.
 */
const whitespace = fc.stringOf(
  fc.constantFrom(' ', '\t', '\n', '\r', '\f', '\v', '\u00a0'),
  { maxLength: 5 },
);

const titleWithValidTrimmedLength = fc
  .tuple(
    whitespace,
    // A non-empty unicode core; length kept modest so trimmed length stays <= 500.
    fc.string({ minLength: 1, maxLength: 400, unit: 'binary' }),
    whitespace,
  )
  .map(([lead, core, trail]) => `${lead}${core}${trail}`)
  .filter((s) => {
    const trimmed = s.trim();
    return trimmed.length >= 1 && trimmed.length <= 500;
  });

describe('Property 1: Create round-trip (TodoService.create)', () => {
  it('stores the trimmed title, returns a unique well-formed UUID, and grows the list by exactly one', () => {
    fc.assert(
      fc.property(titleWithValidTrimmedLength, (rawTitle) => {
        const store = new InMemoryTodoStore();
        const service = new TodoService(store);

        const before = service.list();
        const trimmed = rawTitle.trim();

        const created = service.create(rawTitle);

        // Trimmed title is stored and returned (Requirements 1.1).
        expect(created.title).toBe(trimmed);

        // A well-formed UUID is assigned (Requirements 1.1, 1.5).
        expect(created.id).toMatch(UUID_V4_REGEX);

        // The list grows by exactly one item (Requirements 1.5).
        const after = service.list();
        expect(after).toHaveLength(before.length + 1);

        // Exactly one item matches the created id, and it carries the trimmed title
        // (Requirements 1.2, 1.5).
        const matches = after.filter((item) => item.id === created.id);
        expect(matches).toHaveLength(1);
        expect(matches[0].title).toBe(trimmed);
      }),
      { numRuns: 100 },
    );
  });

  it('assigns a distinct id on each successive create within the same store', () => {
    fc.assert(
      fc.property(
        fc.array(titleWithValidTrimmedLength, { minLength: 1, maxLength: 20 }),
        (rawTitles) => {
          const store = new InMemoryTodoStore();
          const service = new TodoService(store);

          const ids = rawTitles.map((title) => service.create(title).id);

          // Every id is well-formed and unique (Requirements 1.5).
          ids.forEach((id) => expect(id).toMatch(UUID_V4_REGEX));
          expect(new Set(ids).size).toBe(ids.length);

          // The list grew by exactly the number of successful creates.
          expect(service.list()).toHaveLength(rawTitles.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});
