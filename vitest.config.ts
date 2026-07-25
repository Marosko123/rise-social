import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
  test: {
    environment: 'node',
    exclude: ['tests/e2e/**', 'tests/pages/**', 'node_modules/**'],
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
