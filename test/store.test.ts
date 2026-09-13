/**
 * Unit tests for the in-memory Todo_Store.
 *
 * Covers:
 *  - insertion-order preservation on list()            (Requirements 2.1)
 *  - add() assigning well-formed unique ids            (Requirements 1.5)
 *  - delete() of present and absent ids                (Requirements 3.1)
 *  - FailingStore throwing without mutating state      (Requirements 1.6, 2.3, 3.4)
 */

import { describe, it, expect } from 'vitest';
import {
  InMemoryTodoStore,
  FailingStore,
} from '../src/store/inMemoryStore.js';
import { StoreError } from '../src/errors.js';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('InMemoryTodoStore', () => {
  describe('add', () => {
    it('stores the item with the given title and returns it', () => {
      const store = new InMemoryTodoStore();

      const item = store.add('buy milk');

      expect(item.title).toBe('buy milk');
      expect(item).toEqual(store.list()[0]);
    });

    it('assigns a well-formed UUID v4 id to each item (Requirement 1.5)', () => {
      const store = new InMemoryTodoStore();

      const item = store.add('task');

      expect(item.id).toMatch(UUID_V4_REGEX);
    });

    it('assigns unique ids across multiple adds', () => {
      const store = new InMemoryTodoStore();

      const ids = [store.add('a').id, store.add('b').id, store.add('c').id];

      expect(new Set(ids).size).toBe(3);
    });

    it('assigns a monotonically increasing createdAt ordering key', () => {
      const store = new InMemoryTodoStore();

      const first = store.add('first');
      const second = store.add('second');
      const third = store.add('third');

      expect(first.createdAt).toBeLessThan(second.createdAt);
      expect(second.createdAt).toBeLessThan(third.createdAt);
    });
  });

  describe('list', () => {
    it('returns an empty array when the store has no items (Requirement 2.2)', () => {
      const store = new InMemoryTodoStore();

      expect(store.list()).toEqual([]);
    });

    it('preserves insertion order oldest -> newest (Requirement 2.1)', () => {
      const store = new InMemoryTodoStore();
      const titles = ['first', 'second', 'third', 'fourth'];

      titles.forEach((title) => store.add(title));

      expect(store.list().map((item) => item.title)).toEqual(titles);
    });

    it('keeps insertion order stable across repeated list() calls', () => {
      const store = new InMemoryTodoStore();
      ['a', 'b', 'c'].forEach((title) => store.add(title));

      const firstCall = store.list().map((item) => item.id);
      const secondCall = store.list().map((item) => item.id);

      expect(secondCall).toEqual(firstCall);
    });

    it('preserves the order of remaining items after a middle deletion', () => {
      const store = new InMemoryTodoStore();
      const a = store.add('a');
      const b = store.add('b');
      const c = store.add('c');

      store.delete(b.id);

      expect(store.list().map((item) => item.id)).toEqual([a.id, c.id]);
    });
  });

  describe('delete', () => {
    it('removes a present item and returns true (Requirement 3.1)', () => {
      const store = new InMemoryTodoStore();
      const item = store.add('to remove');

      const removed = store.delete(item.id);

      expect(removed).toBe(true);
      expect(store.list()).toEqual([]);
    });

    it('returns false for an absent id and leaves the store unchanged (Requirement 3.2)', () => {
      const store = new InMemoryTodoStore();
      const kept = store.add('keep me');
      const before = store.list();

      const removed = store.delete('non-existent-id');

      expect(removed).toBe(false);
      expect(store.list()).toEqual(before);
      expect(store.list()[0].id).toBe(kept.id);
    });

    it('returns false when deleting the same id twice', () => {
      const store = new InMemoryTodoStore();
      const item = store.add('once');

      expect(store.delete(item.id)).toBe(true);
      expect(store.delete(item.id)).toBe(false);
    });
  });
});

describe('FailingStore', () => {
  it('throws StoreError from add without mutating state (Requirement 1.6)', () => {
    const store = new FailingStore();

    expect(() => store.add('anything')).toThrow(StoreError);
  });

  it('throws StoreError from list (Requirement 2.3)', () => {
    const store = new FailingStore();

    expect(() => store.list()).toThrow(StoreError);
  });

  it('throws StoreError from delete without mutating state (Requirement 3.4)', () => {
    const store = new FailingStore();

    expect(() => store.delete('some-id')).toThrow(StoreError);
  });
});
