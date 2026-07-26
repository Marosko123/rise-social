import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
  test: {
    environment: 'node',
    exclude: [
      ...configDefaults.exclude,
      '.worktrees/**',
      'tests/e2e/**',
      'tests/pages/**',
    ],
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
