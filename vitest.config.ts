import { defineConfig } from 'vitest/config';

// https://vitest.dev/config/
export default defineConfig({
  base: './',
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
  },
});
