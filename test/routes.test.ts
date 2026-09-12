/**
 * Example / edge-case unit tests for the Todo API HTTP routes and the
 * centralized error-to-status mapping.
 *
 * These pin the concrete scenarios called out explicitly by the requirements
 * (Requirement 5.1 success cases, Requirement 5.2 error cases) and the
 * body-parsing edge cases (Requirement 1.4). They complement the property-based
 * tests, which cover universal behavior across many inputs.
 *
 * Two app assemblies are exercised:
 *   1. The production `createApp()` (backed by `InMemoryTodoStore`) for the
 *      success paths and the validation/not-found error paths.
 *   2. A locally assembled app backed by `FailingStore` for the store-failure
 *      (HTTP 500) paths — assembled from the same exported building blocks
 *      (`createTodoRouter`, `errorHandler`, `notFoundHandler`, `TodoService`)
 *      so that `createApp()`'s public behavior is not modified.
 *
 * Requirements: 1.3, 1.4, 1.6, 2.2, 2.3, 3.2, 5.1, 5.2
 */

import { describe, it, expect } from 'vitest';
import express from 'express';
import type { Express } from 'express';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createTodoRouter } from '../src/routes/todos.js';
import { errorHandler, notFoundHandler } from '../src/middleware/errorHandler.js';
import { TodoService } from '../src/services/todoService.js';
import { FailingStore } from '../src/store/inMemoryStore.js';

/**
 * Builds an app whose service is backed by a {@link FailingStore}, so every
 * store operation throws {@link StoreError}. This exercises the HTTP 500 paths
 * (Requirements 1.6, 2.3, 3.4) without modifying `createApp()`'s behavior.
 */
function createFailingStoreApp(): Express {
  const service = new TodoService(new FailingStore());
  const app = express();
  app.use(express.json());
  app.use(createTodoRouter(service));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

/** A well-formed UUID v4 that will never exist in a fresh store. */
const ABSENT_UUID = '11111111-1111-4111-8111-111111111111';

describe('Todo routes — success cases (Requirement 5.1)', () => {
  it('POST /todos creates a todo and responds 201 with { id, title }', async () => {
    const app = createApp();

    const res = await request(app).post('/todos').send({ title: 'buy milk' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('buy milk');
    expect(typeof res.body.id).toBe('string');
    expect(res.body.id.length).toBeGreaterThan(0);
  });

  it('POST /todos stores the trimmed title', async () => {
    const app = createApp();

    const res = await request(app).post('/todos').send({ title: '  spaced  ' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('spaced');
  });

  it('GET /todos lists all created todos in creation order', async () => {
    const app = createApp();

    await request(app).post('/todos').send({ title: 'first' });
    await request(app).post('/todos').send({ title: 'second' });

    const res = await request(app).get('/todos');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.map((t: { title: string }) => t.title)).toEqual(['first', 'second']);
    // Each element exposes only id and title.
    for (const item of res.body) {
      expect(Object.keys(item).sort()).toEqual(['id', 'title']);
    }
  });

  it('GET /todos responds 200 with an empty array when the store is empty (Requirement 2.2)', async () => {
    const app = createApp();

    const res = await request(app).get('/todos');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('DELETE /todos/:id removes an existing todo and responds 204 with an empty body', async () => {
    const app = createApp();

    const created = await request(app).post('/todos').send({ title: 'to delete' });
    const id = created.body.id as string;

    const del = await request(app).delete(`/todos/${id}`);

    expect(del.status).toBe(204);
    expect(del.body).toEqual({});
    expect(del.text).toBe('');

    // The deleted item no longer appears in the list.
    const list = await request(app).get('/todos');
    expect(list.body).toEqual([]);
  });
});

describe('Todo routes — validation / not-found errors (Requirements 1.3, 3.2, 5.2)', () => {
  it('POST /todos with a missing title responds 400 with an error body (Requirement 1.3)', async () => {
    const app = createApp();

    const res = await request(app).post('/todos').send({});

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
    expect(res.body.error.length).toBeGreaterThan(0);
  });

  it('POST /todos with an empty (whitespace-only) title responds 400 (Requirement 1.3)', async () => {
    const app = createApp();

    const res = await request(app).post('/todos').send({ title: '   ' });

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
  });

  it('POST /todos with a non-string title responds 400 (Requirement 1.3)', async () => {
    const app = createApp();

    const res = await request(app).post('/todos').send({ title: 42 });

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
  });

  it('DELETE /todos/:id with a well-formed but unknown id responds 404 (Requirement 3.2)', async () => {
    const app = createApp();

    const res = await request(app).delete(`/todos/${ABSENT_UUID}`);

    expect(res.status).toBe(404);
    expect(typeof res.body.error).toBe('string');
    expect(res.body.error.length).toBeGreaterThan(0);
  });

  it('DELETE /todos/:id with a malformed id responds 400 (Requirement 3.3)', async () => {
    const app = createApp();

    const res = await request(app).delete('/todos/not-a-uuid');

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
  });
});

describe('Todo routes — store-failure errors (Requirements 1.6, 2.3, 5.2)', () => {
  it('POST /todos responds 500 when the store add fails (Requirement 1.6)', async () => {
    const app = createFailingStoreApp();

    const res = await request(app).post('/todos').send({ title: 'valid title' });

    expect(res.status).toBe(500);
    expect(typeof res.body.error).toBe('string');
    expect(res.body.error.length).toBeGreaterThan(0);
  });

  it('GET /todos responds 500 when the store list fails (Requirement 2.3)', async () => {
    const app = createFailingStoreApp();

    const res = await request(app).get('/todos');

    expect(res.status).toBe(500);
    expect(typeof res.body.error).toBe('string');
  });

  it('DELETE /todos/:id responds 500 when the store delete fails (Requirement 3.4)', async () => {
    const app = createFailingStoreApp();

    const res = await request(app).delete(`/todos/${ABSENT_UUID}`);

    expect(res.status).toBe(500);
    expect(typeof res.body.error).toBe('string');
  });
});

describe('Todo routes — body-parsing edge cases (Requirement 1.4)', () => {
  it('POST /todos with an empty body responds 400', async () => {
    const app = createApp();

    // No body, but declare JSON content type so express.json() attempts a parse.
    const res = await request(app)
      .post('/todos')
      .set('Content-Type', 'application/json')
      .send('');

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
  });

  it('POST /todos with non-JSON text responds 400', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/todos')
      .set('Content-Type', 'application/json')
      .send('this is not json');

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
  });

  it('POST /todos with truncated JSON responds 400', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/todos')
      .set('Content-Type', 'application/json')
      .send('{"title": "oops"');

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
  });

  it('POST /todos with the wrong content type is not parsed as JSON and responds 400', async () => {
    const app = createApp();

    // With a text/plain content type, express.json() skips parsing, so req.body
    // is empty and the title is missing -> validation 400.
    const res = await request(app)
      .post('/todos')
      .set('Content-Type', 'text/plain')
      .send('{"title": "ignored"}');

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
  });
});
