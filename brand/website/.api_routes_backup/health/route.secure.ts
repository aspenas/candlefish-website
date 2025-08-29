// Secure health check endpoint - removes sensitive information
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Basic health check without exposing sensitive information
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      // Only include non-sensitive application version
      version: process.env.npm_package_version || '1.0.0'
    };

    // Optional: Add database connectivity check without details
    // try {
    //   await checkDatabaseConnection();
    //   healthCheck.database = 'connected';
    // } catch {
    //   healthCheck.database = 'disconnected';
    //   healthCheck.status = 'degraded';
    // }

    return NextResponse.json(healthCheck, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);

    // Return generic error without exposing details
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString()
        // Never expose error details in production
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, private'
        }
      }
    );
  }
}
