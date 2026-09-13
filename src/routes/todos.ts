/**
 * HTTP routes for the Todo API.
 *
 * This is the thin routes layer of the layered architecture
 * (routes -> service -> store). Each handler extracts request data, delegates
 * to the {@link TodoService}, and shapes the HTTP response. Any error thrown by
 * the service (ValidationError -> 400, NotFoundError -> 404, StoreError -> 500)
 * is forwarded to the centralized error-handling middleware via `next(err)`.
 *
 * No authentication logic exists here; credentials on a request are never read,
 * upholding the open-access invariant (Requirements 4.1, 4.2).
 *
 * See the "HTTP endpoints" section of the design document.
 *
 * | Method | Path           | Success                 |
 * |--------|----------------|-------------------------|
 * | POST   | /todos         | 201 + TodoResponse      |
 * | GET    | /todos         | 200 + TodoResponse[]    |
 * | DELETE | /todos/:id     | 204 (empty body)        |
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { TodoService } from '../services/todoService.js';

/**
 * Builds an Express {@link Router} bound to the given {@link TodoService}.
 *
 * A factory is used (rather than a module-level singleton) so the router can be
 * constructed with any service/store implementation, which keeps it testable
 * (for example, with a `FailingStore`-backed service to exercise 500 paths).
 *
 * @param service the service the routes delegate to.
 * @returns a configured Express router mounting the todo endpoints.
 */
export function createTodoRouter(service: TodoService): Router {
  const router = Router();

  // POST /todos -> 201 + created TodoResponse.
  router.post('/todos', (req: Request, res: Response, next: NextFunction) => {
    try {
      const created = service.create(req.body?.title);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  // GET /todos -> 200 + TodoResponse[] (oldest -> newest).
  router.get('/todos', (_req: Request, res: Response, next: NextFunction) => {
    try {
      const todos = service.list();
      res.status(200).json(todos);
    } catch (err) {
      next(err);
    }
  });

  // DELETE /todos/:id -> 204 with an empty body.
  router.delete('/todos/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      service.remove(req.params.id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
