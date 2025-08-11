/**
 * Global Jest Teardown for Collaboration Tests
 * Cleans up test database, Redis, WebSocket servers, and other infrastructure
 */

const { Client } = require('pg');
const Redis = require('ioredis');
const dockerCompose = require('docker-compose');
const path = require('path');

module.exports = async () => {
  console.log('🧹 Starting global test teardown...');

  try {
    // Get global test state
    const testState = global.__COLLABORATION_TEST_STATE__;

    if (!testState) {
      console.log('⚠️  No global test state found, skipping teardown');
      return;
    }

    const testDuration = new Date() - testState.startTime;
    console.log(`⏱️  Total test duration: ${Math.round(testDuration / 1000)}s`);

    // Close WebSocket server
    await closeWebSocketServer();

    // Clean up database
    await cleanupTestDatabase();

    // Clean up Redis
    await cleanupRedis();

    // Stop Docker services
    await stopDockerServices();

    console.log('✅ Global test teardown completed successfully');
  } catch (error) {
    console.error('❌ Global test teardown failed:', error);
    // Don't throw error in teardown to avoid masking test failures
  }
};

async function closeWebSocketServer() {
  console.log('🔌 Closing WebSocket server...');

  try {
    const wss = global.__TEST_WEBSOCKET_SERVER__;

    if (wss) {
      // Close all client connections
      wss.clients.forEach((ws) => {
        ws.terminate();
      });

      // Close the server
      await new Promise((resolve, reject) => {
        wss.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });

      console.log('✅ WebSocket server closed');
    } else {
      console.log('⚠️  No WebSocket server found to close');
    }
  } catch (error) {
    console.error('❌ Failed to close WebSocket server:', error);
  }
}

async function cleanupTestDatabase() {
  console.log('🗄️ Cleaning up test database...');

  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });

    await client.connect();

    // Drop all test tables in reverse dependency order
    await client.query(`
      DROP TABLE IF EXISTS operations CASCADE;
      DROP TABLE IF EXISTS presence_sessions CASCADE;
      DROP TABLE IF EXISTS comments CASCADE;
      DROP TABLE IF EXISTS document_versions CASCADE;
      DROP TABLE IF EXISTS documents CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS organizations CASCADE;
    `);

    await client.end();
    console.log('✅ Test database cleaned up');
  } catch (error) {
    console.error('❌ Failed to cleanup test database:', error);
  }
}

async function cleanupRedis() {
  console.log('📊 Cleaning up Redis...');

  try {
    const redis = new Redis(process.env.REDIS_URL);

    // Clear all test data
    await redis.flushdb();

    await redis.quit();
    console.log('✅ Redis cleaned up');
  } catch (error) {
    console.error('❌ Failed to cleanup Redis:', error);
  }
}

async function stopDockerServices() {
  console.log('📦 Stopping Docker services...');

  try {
    const composeFile = path.join(__dirname, '../../../docker-compose.test.yml');

    await dockerCompose.down({
      cwd: path.dirname(composeFile),
      log: true,
      commandOptions: ['--remove-orphans', '--volumes'],
    });

    console.log('✅ Docker services stopped');
  } catch (error) {
    console.error('❌ Failed to stop Docker services:', error);
  }
}

// Handle unexpected shutdowns
process.on('SIGINT', async () => {
  console.log('📞 Received SIGINT, running teardown...');
  await module.exports();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('📞 Received SIGTERM, running teardown...');
  await module.exports();
  process.exit(0);
});
