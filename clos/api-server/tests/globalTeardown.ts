import { Pool } from 'pg';
import Redis from 'ioredis';

export default async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...');
  
  try {
    // Clean up test database
    await cleanupTestDatabase();
    
    // Clean up Redis
    await cleanupTestRedis();
    
    console.log('✅ Test environment cleaned up');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

async function cleanupTestDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1
  });
  
  try {
    // Clean up test data (keep schema for next run)
    await pool.query('TRUNCATE agent_performance_metrics RESTART IDENTITY CASCADE');
    await pool.query('TRUNCATE service_performance_metrics RESTART IDENTITY CASCADE');
    await pool.query('TRUNCATE system_metrics RESTART IDENTITY CASCADE');
    
    console.log('✅ Test database cleaned');
  } catch (error) {
    console.error('❌ Failed to cleanup test database:', error);
  } finally {
    await pool.end();
  }
}

async function cleanupTestRedis() {
  const redis = new Redis(process.env.REDIS_URL!);
  
  try {
    // Clean up test keys
    const keys = await redis.keys('test:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    
    // Clean up session keys that might have been created
    const sessionKeys = await redis.keys('analytics:*');
    if (sessionKeys.length > 0) {
      await redis.del(...sessionKeys);
    }
    
    console.log('✅ Test Redis cleaned');
  } catch (error) {
    console.error('❌ Failed to cleanup test Redis:', error);
  } finally {
    await redis.disconnect();
  }
}