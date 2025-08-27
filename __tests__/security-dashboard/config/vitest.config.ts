/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: [
      '**/__tests__/**/*.{test,spec}.{ts,tsx}',
      '**/src/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
      '**/cypress/**',
    ],
    coverage: {
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.ts',
        '**/types/**',
        '**/mocks/**',
        '**/__tests__/**',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        // Component-specific thresholds
        'src/components/dashboard/': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
        'src/components/security/': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
    },
    // Test timeout settings
    testTimeout: 10000,
    hookTimeout: 10000,
    // Mock WebSocket and other browser APIs
    deps: {
      inline: ['@testing-library/jest-dom'],
    },
    // Environment variables for tests
    env: {
      NODE_ENV: 'test',
      VITE_API_BASE_URL: 'http://localhost:3001/api',
      VITE_WS_BASE_URL: 'ws://localhost:3001',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../../apps/security-dashboard/src'),
      '@tests': path.resolve(__dirname, '../'),
    },
  },
  define: {
    global: 'globalThis',
  },
});