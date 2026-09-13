import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Keep the default test discovery (test/**), including integration tests.
    coverage: {
      // Use the V8 coverage provider (Requirement 5.3).
      provider: 'v8',
      // Report line coverage as a percentage in the terminal, plus summary.
      reporter: ['text', 'text-summary'],
      // Measure coverage across the application source only.
      include: ['src/**/*.ts'],
      // server.ts only binds a port at startup and is impractical to cover.
      exclude: ['src/server.ts'],
      // The line-coverage gate (Requirement 5.5) is set by the CI pipeline via
      // the `COVERAGE_MIN_LINES` environment variable. Local runs leave it unset
      // and fall back to the same 80% floor, so coverage is enforced everywhere.
      // Failing tests still exit non-zero by default (Requirement 5.4).
      thresholds: {
        lines: Number(process.env.COVERAGE_MIN_LINES ?? 80),
      },
    },
  },
});
