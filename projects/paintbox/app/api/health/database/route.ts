import { NextResponse } from 'next/server';
import { createConnection } from '@/lib/database/connection-pool';

export async function GET() {
  try {
    const startTime = Date.now();
    
    // Test database connection
    const connection = await createConnection();
    const [result] = await connection.query('SELECT 1 as test');
    await connection.end();
    
    return NextResponse.json({
      status: 'healthy',
      service: 'database',
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }, { status: 200 });
  } catch (error) {
    console.error('Database health check failed:', error);
    return NextResponse.json({
      status: 'unhealthy',
      service: 'database',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}