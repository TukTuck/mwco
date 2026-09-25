// SPDX-License-Identifier: MIT
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      'better-sqlite3': path.resolve(__dirname, 'mocks/better-sqlite3.js'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
  },
});
