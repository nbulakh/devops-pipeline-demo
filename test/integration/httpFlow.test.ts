/**
 * Integration test for the full Todo API HTTP flow.
 *
 * Unlike the unit tests (which exercise individual layers or specific error
 * mappings), this test boots the fully assembled Express app via `createApp()`
 * and drives it end-to-end over HTTP with `supertest`. It confirms the layers
 * (routes -> service -> in-memory store -> error middleware) are wired together
 * correctly by exercising the create -> list -> delete lifecycle:
 *
 *   1. POST /todos      — create two todos (assert 201 + body).
 *   2. GET  /todos      — list them (assert 200 + both present, in order).
 *   3. DELETE /todos/:id — delete one (assert 204, empty body).
 *   4. GET  /todos      — assert the deleted one is gone and the other remains.
 *
 * This runs as the CI "integration test step" (Requirement 6.3) via the
 * `test:integration` npm script, which targets the `test/integration` folder.
 *
 * Requirements: 6.3
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

describe('Todo API — full create -> list -> delete HTTP flow (integration)', () => {
  it('wires the layers together across the full lifecycle', async () => {
    const app = createApp();

    // 1. Create two todos over HTTP.
    const firstRes = await request(app).post('/todos').send({ title: 'first task' });
    expect(firstRes.status).toBe(201);
    expect(firstRes.body.title).toBe('first task');
    expect(typeof firstRes.body.id).toBe('string');
    expect(firstRes.body.id.length).toBeGreaterThan(0);

    const secondRes = await request(app).post('/todos').send({ title: 'second task' });
    expect(secondRes.status).toBe(201);
    expect(secondRes.body.title).toBe('second task');
    expect(typeof secondRes.body.id).toBe('string');
    expect(secondRes.body.id.length).toBeGreaterThan(0);

    const firstId = firstRes.body.id as string;
    const secondId = secondRes.body.id as string;
    expect(firstId).not.toBe(secondId);

    // 2. List: both todos are present, in creation order (oldest -> newest).
    const listRes = await request(app).get('/todos');
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body).toEqual([
      { id: firstId, title: 'first task' },
      { id: secondId, title: 'second task' },
    ]);

    // 3. Delete the first todo: 204 with an empty body.
    const deleteRes = await request(app).delete(`/todos/${firstId}`);
    expect(deleteRes.status).toBe(204);
    expect(deleteRes.body).toEqual({});
    expect(deleteRes.text).toBe('');

    // 4. List again: the deleted todo is gone, the other remains.
    const finalListRes = await request(app).get('/todos');
    expect(finalListRes.status).toBe(200);
    expect(finalListRes.body).toEqual([{ id: secondId, title: 'second task' }]);
  });
});
