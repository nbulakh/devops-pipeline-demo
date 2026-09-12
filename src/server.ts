/**
 * Server entry point for the Todo API.
 *
 * Builds the Express app via {@link createApp} and starts listening. This is
 * the runtime/Docker entry point (`CMD ["node", "dist/server.js"]`); the app
 * itself lives in `app.ts` so it can be imported by tests without binding a
 * port.
 */

import { createApp } from './app.js';

/** Default listen port; overridable via the `PORT` environment variable. */
const PORT = process.env.PORT ?? 3000;

const app = createApp();

app.listen(PORT, () => {
  console.log(`Todo API listening on port ${PORT}`);
});
