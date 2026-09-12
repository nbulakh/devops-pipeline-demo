/**
 * Express application assembly for the Todo API.
 *
 * This module wires the layered architecture together into a configured
 * Express app: JSON body parsing -> todo routes -> fallback 404 -> centralized
 * error-handling middleware. The app is exported (rather than started here) so
 * tests can import and exercise it in-process with `supertest`.
 *
 * Middleware order matters:
 *   1. `express.json()`    — parses JSON bodies; parse failures surface to the
 *                            error middleware and are mapped to HTTP 400.
 *   2. todo router         — the create/list/delete endpoints.
 *   3. `notFoundHandler`   — JSON 404 for unknown routes/methods.
 *   4. `errorHandler`      — must be registered last; maps typed errors to
 *                            status codes and a consistent JSON error body.
 *
 * No authentication middleware exists anywhere in this stack, so no request
 * path can produce 401/403 or an authentication challenge, and any credentials
 * on a request are simply ignored (Requirements 4.1, 4.2, 4.3, 4.4).
 *
 * See the "App assembly" note in the design document.
 */

import express from 'express';
import type { Express } from 'express';
import { createTodoRouter } from './routes/todos.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { TodoService } from './services/todoService.js';
import { InMemoryTodoStore } from './store/inMemoryStore.js';

/**
 * Builds and returns a fully configured Express app.
 *
 * A fresh {@link InMemoryTodoStore} and {@link TodoService} are instantiated on
 * each call, so every app instance starts with an empty, isolated store. This
 * keeps tests independent and avoids shared mutable state between callers.
 *
 * @returns the configured Express application.
 */
export function createApp(): Express {
  const store = new InMemoryTodoStore();
  const service = new TodoService(store);

  const app = express();

  // 1. Parse JSON request bodies; malformed/absent JSON is surfaced to the
  //    error middleware and mapped to HTTP 400 (Requirement 1.4).
  app.use(express.json());

  // 2. Mount the todo endpoints.
  app.use(createTodoRouter(service));

  // 3. Fallback JSON 404 for unknown routes/methods.
  app.use(notFoundHandler);

  // 4. Centralized error handling — must be registered last.
  app.use(errorHandler);

  return app;
}
