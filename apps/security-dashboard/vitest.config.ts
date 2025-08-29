import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      '__tests__/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      '__tests__/integration/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    exclude: [
      'node_modules/',
      'dist/',
      'build/',
      'cypress/',
      '__tests__/e2e/',
      '__tests__/performance/',
      '__tests__/security/',
      'src/test/__mocks__/',
    ],
    coverage: {
      provider: 'v8',
      reporter: [
        'text',
        'text-summary', 
        'json',
        'json-summary',
        'html',
        'lcov',
        'clover',
        'cobertura'
      ],
      reportsDirectory: './coverage',
      include: [
        'src/**/*.{js,jsx,ts,tsx}',
      ],
      exclude: [
        'node_modules/',
        'src/test/',
        'src/**/__tests__/',
        'src/**/__mocks__/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/*.stories.*',
        'dist/',
        'build/',
        'src/main.tsx',
        'src/App.tsx',
        'src/debug.tsx',
        'src/vite-env.d.ts',
        'src/**/*.test.{js,jsx,ts,tsx}',
        'src/**/*.spec.{js,jsx,ts,tsx}',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        // Higher thresholds for critical modules
        'src/lib/': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
        'src/hooks/': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
        'src/services/': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        'src/security/': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95,
        },
      },
      watermarks: {
        statements: [80, 95],
        functions: [80, 95],
        branches: [80, 95],
        lines: [80, 95],
      },
    },
    reporters: [
      'default',
      'verbose',
      'html',
      'json',
      'junit'
    ],
    outputFile: {
      json: './coverage/test-results.json',
      junit: './coverage/junit.xml',
      html: './coverage/report.html',
    },
    // Test timeout
    testTimeout: 30000,
    hookTimeout: 30000,
    
    // Pool options for better performance
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 4,
      },
    },
    
    // Watch options
    watch: false, // Disable for CI
    
    // Mocking
    clearMocks: true,
    restoreMocks: true,
    
    // Snapshot options
    snapshotFormat: {
      escapeString: true,
      printBasicPrototype: true,
    },
    
    // Environment options
    env: {
      NODE_ENV: 'test',
      VITE_API_URL: 'http://localhost:4000',
      VITE_WS_URL: 'ws://localhost:4001',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/test': path.resolve(__dirname, './src/test'),
    },
  },
  define: {
    'process.env.NODE_ENV': '"test"',
  },
})
