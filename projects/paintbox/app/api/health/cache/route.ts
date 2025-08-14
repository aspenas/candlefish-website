import { NextResponse } from 'next/server';
import getCacheInstance from '@/lib/cache/cache-service';

export async function GET() {
  try {
    const startTime = Date.now();
    const cache = getCacheInstance();
    
    // Test cache operations
    const testKey = `health:check:${Date.now()}`;
    const testValue = 'healthy';
    
    // Set value
    await cache.set(testKey, testValue, 10);
    
    // Get value
    const retrieved = await cache.get(testKey);
    
    // Delete value
    await cache.delete(testKey);
    
    const isHealthy = retrieved === testValue;
    
    return NextResponse.json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      service: 'cache',
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }, { status: isHealthy ? 200 : 503 });
  } catch (error) {
    console.error('Cache health check failed:', error);
    return NextResponse.json({
      status: 'unhealthy',
      service: 'cache',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}