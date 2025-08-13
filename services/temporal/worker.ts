#!/usr/bin/env ts-node
/**
 * Temporal Worker - processes workflows and activities
 */

import { createTemporalWorker } from './setup';

async function main() {
  console.log('🚀 Starting Candlefish Temporal Worker...');

  try {
    const worker = await createTemporalWorker();
    console.log('✅ Worker created successfully');

    // Start the worker
    await worker.run();
    console.log('🔄 Worker is running and processing tasks...');
  } catch (error) {
    console.error('❌ Failed to start worker:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down worker gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down worker gracefully...');
  process.exit(0);
});

main().catch((error) => {
  console.error('💥 Worker crashed:', error);
  process.exit(1);
});
