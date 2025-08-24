import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3001,
    host: true,
    proxy: {
      '/api': {
        target: process.env.NODE_ENV === 'production'
          ? 'https://api.candlefish.ai'
          : 'http://localhost:3000',
        changeOrigin: true,
        secure: true,
      },
      '/graphql': {
        target: process.env.NODE_ENV === 'production'
          ? 'https://api.candlefish.ai'
          : 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
        secure: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          apollo: ['@apollo/client'],
        },
      },
    },
  },
  preview: {
    port: 3001,
    host: true,
  },
})
