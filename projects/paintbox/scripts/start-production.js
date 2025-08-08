#!/usr/bin/env node

/**
 * Production start script for Paintbox
 * Starts both Next.js server and WebSocket server with Redis caching
 */

const { spawn } = require('child_process');
const path = require('path');

const port = process.env.PORT || 3000;
const wsPort = process.env.WEBSOCKET_PORT || 3001;
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

console.log(`🎨 Starting Paintbox Production Services...`);
console.log(`   Web Server: http://localhost:${port}`);
console.log(`   WebSocket:  ws://localhost:${wsPort}`);
console.log(`   Redis:      ${redisUrl}`);
console.log('');

// Check if WebSocket server build exists
const fs = require('fs');
const wsServerPath = path.join(__dirname, '..', 'dist', 'websocket-server.js');
const wsServerExists = fs.existsSync(wsServerPath);

let processes = [];

// Start WebSocket server if built
if (wsServerExists) {
  console.log('📡 Starting WebSocket server...');

  const wsProcess = spawn('node', [wsServerPath], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      WEBSOCKET_PORT: wsPort,
      REDIS_URL: redisUrl,
    }
  });

  wsProcess.on('error', (err) => {
    console.error('Failed to start WebSocket server:', err);
    cleanup();
    process.exit(1);
  });

  wsProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`WebSocket server exited with code ${code}`);
      cleanup();
      process.exit(code);
    }
  });

  processes.push(wsProcess);
} else {
  console.log('⚠️  WebSocket server not built. Run: npm run build:websocket');
}

// Start Next.js in production mode
console.log('🚀 Starting Next.js server...');

const nextProcess = spawn('npm', ['run', 'start:next'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: port,
    NODE_ENV: 'production',
    NEXT_PUBLIC_WEBSOCKET_URL: `http://localhost:${wsPort}`,
    REDIS_URL: redisUrl,
  }
});

nextProcess.on('error', (err) => {
  console.error('Failed to start Next.js server:', err);
  cleanup();
  process.exit(1);
});

nextProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error(`Next.js server exited with code ${code}`);
  }
  cleanup();
  process.exit(code);
});

processes.push(nextProcess);

// Cleanup function
function cleanup() {
  console.log('\n🛑 Shutting down services...');
  processes.forEach(proc => {
    if (proc && !proc.killed) {
      proc.kill('SIGTERM');
    }
  });
}

// Handle termination signals
process.on('SIGINT', () => {
  console.log('\n⚡ Received SIGINT, shutting down gracefully...');
  cleanup();
  setTimeout(() => {
    console.log('⚠️  Force shutdown after 5 seconds');
    process.exit(0);
  }, 5000);
});

process.on('SIGTERM', () => {
  console.log('\n⚡ Received SIGTERM, shutting down gracefully...');
  cleanup();
  setTimeout(() => {
    console.log('⚠️  Force shutdown after 5 seconds');
    process.exit(0);
  }, 5000);
});

// Log startup complete
setTimeout(() => {
  console.log('\n✅ Paintbox Production Services Started Successfully!');
  console.log(`   Web:       http://localhost:${port}`);
  console.log(`   WebSocket: ws://localhost:${wsPort}`);
  console.log(`   Health:    http://localhost:${port}/api/health`);
  console.log('');
}, 2000);
