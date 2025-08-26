import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Suppress experimental warnings
    env: {
      NODE_NO_WARNINGS: '1',
    },
    // Set up test environment
    environment: 'node',
    // Include test files
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    // Exclude node_modules and build directories
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
    // Set up path mapping to match tsconfig
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Global test setup
    setupFiles: [],
    // Test timeout
    testTimeout: 10000,
    // Hook timeout
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
