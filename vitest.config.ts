import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'url';

// Kept separate from vite.config.js so tests don't load the Univer build plugin.
export default defineConfig({
  envPrefix: 'BN_',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx,js,jsx}'],
    env: { BN_BASE_URL: 'http://api.test' },
  },
});
