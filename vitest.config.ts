import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Parallel-load mitigation: heavy AntD/Recharts imports + a saturated
    // thread pool can exhaust vitest's default 5s per-test budget during the
    // first render, surfacing as "Test timed out in 5000ms" on otherwise
    // healthy tests (see docs/backlog.md). Bump both timeouts to 15s.
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
