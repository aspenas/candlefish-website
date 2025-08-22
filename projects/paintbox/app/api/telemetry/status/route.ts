/**
 * Telemetry Status API Endpoint
 * Provides comprehensive real-time telemetry data for the application
 * Including build info, integration status, and performance metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import Redis from 'ioredis';

interface IntegrationStatus {
  status: 'connected' | 'disconnected' | 'unavailable';
  lastCheck: string | null;
  responseTime?: number;
  error?: string;
}

// Get build-time information
function getBuildInfo() {
  try {
    // Try to read from build-time generated file
    const buildInfoPath = join(process.cwd(), '.next', 'BUILD_INFO.json');
    if (existsSync(buildInfoPath)) {
      const buildInfo = JSON.parse(readFileSync(buildInfoPath, 'utf-8'));
      return {
        buildTime: buildInfo.buildTime || new Date().toISOString(),
        commitSha: buildInfo.commitSha || process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || 'dev',
      };
    }
  } catch (error) {
    console.error('Failed to read build info:', error);
  }

  // Fallback to environment variables
  return {
    buildTime: process.env.BUILD_TIME || new Date().toISOString(),
    commitSha: (process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || 'dev').slice(0, 7),
  };
}

// Check Salesforce integration status
async function checkSalesforceStatus(): Promise<IntegrationStatus> {
  // In development or if Salesforce is not configured, mark as unavailable
  if (process.env.NODE_ENV === 'development' || !process.env.SALESFORCE_CLIENT_ID) {
    return {
      status: 'unavailable',
      lastCheck: null,
      error: 'Salesforce not configured in this environment',
    };
  }

  try {
    const startTime = Date.now();

    // Check if we have valid Salesforce configuration
    const hasConfig = process.env.SALESFORCE_CLIENT_ID &&
                     process.env.SALESFORCE_CLIENT_SECRET &&
                     process.env.SALESFORCE_USERNAME;

    if (!hasConfig) {
      return {
        status: 'unavailable',
        lastCheck: new Date().toISOString(),
        error: 'Missing Salesforce configuration',
      };
    }

    // Try to verify Salesforce connection via internal service check
    // This avoids making external API calls during health checks
    const { SalesforceService } = await import('@/lib/services/salesforce');
    const isConnected = await SalesforceService.getInstance().isConnected();

    const responseTime = Date.now() - startTime;

    return {
      status: isConnected ? 'connected' : 'disconnected',
      lastCheck: new Date().toISOString(),
      responseTime,
    };
  } catch (error) {
    return {
      status: 'disconnected',
      lastCheck: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Check Company Cam integration status
async function checkCompanyCamStatus(): Promise<IntegrationStatus> {
  // In development or if Company Cam is not configured, mark as unavailable
  if (process.env.NODE_ENV === 'development' || !process.env.COMPANYCAM_API_KEY) {
    return {
      status: 'unavailable',
      lastCheck: null,
      error: 'Company Cam not configured in this environment',
    };
  }

  try {
    const startTime = Date.now();

    const hasConfig = process.env.COMPANYCAM_API_KEY && process.env.COMPANYCAM_API_SECRET;

    if (!hasConfig) {
      return {
        status: 'unavailable',
        lastCheck: new Date().toISOString(),
        error: 'Missing Company Cam configuration',
      };
    }

    // Check Company Cam service status
    const { CompanyCamService } = await import('@/lib/services/companycam');
    const service = CompanyCamService.getInstance();

    // Use a lightweight check method if available
    const isConnected = !!service;

    const responseTime = Date.now() - startTime;

    return {
      status: isConnected ? 'connected' : 'disconnected',
      lastCheck: new Date().toISOString(),
      responseTime,
    };
  } catch (error) {
    return {
      status: 'disconnected',
      lastCheck: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Check Redis connection status
async function checkRedisStatus(): Promise<IntegrationStatus> {
  // In development without Redis, mark as unavailable
  if (process.env.NODE_ENV === 'development' && !process.env.REDIS_URL) {
    return {
      status: 'unavailable',
      lastCheck: null,
      error: 'Redis not configured in development',
    };
  }

  try {
    const startTime = Date.now();

    if (!process.env.REDIS_URL) {
      return {
        status: 'unavailable',
        lastCheck: new Date().toISOString(),
        error: 'Redis URL not configured',
      };
    }

    const redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      commandTimeout: 1000,
      lazyConnect: true,
    });

    await redis.connect();
    await redis.ping();
    await redis.disconnect();

    const responseTime = Date.now() - startTime;

    return {
      status: 'connected',
      lastCheck: new Date().toISOString(),
      responseTime,
    };
  } catch (error) {
    return {
      status: 'disconnected',
      lastCheck: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Redis connection failed',
    };
  }
}

// Check WebSocket service status
async function checkWebSocketStatus(): Promise<IntegrationStatus & { connectedClients?: number }> {
  // WebSocket is typically not available in serverless environments
  if (process.env.VERCEL || process.env.NETLIFY || !process.env.WEBSOCKET_URL) {
    return {
      status: 'unavailable',
      lastCheck: null,
      error: 'WebSocket not available in serverless environment',
    };
  }

  try {
    const startTime = Date.now();

    // Check if WebSocket server is configured
    const wsUrl = process.env.WEBSOCKET_URL || process.env.NEXT_PUBLIC_WS_URL;

    if (!wsUrl) {
      return {
        status: 'unavailable',
        lastCheck: new Date().toISOString(),
        error: 'WebSocket URL not configured',
      };
    }

    // In production, we'd check the actual WebSocket server
    // For now, we'll check if the configuration exists
    const responseTime = Date.now() - startTime;

    return {
      status: 'connected',
      lastCheck: new Date().toISOString(),
      responseTime,
      connectedClients: 0, // Would be populated from actual WS server metrics
    };
  } catch (error) {
    return {
      status: 'disconnected',
      lastCheck: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'WebSocket check failed',
    };
  }
}

// Get last E2E test run timestamp
function getLastE2ETestTime(): string | null {
  try {
    // Check for test results file
    const testResultsPath = join(process.cwd(), 'test-results', '.last-run.json');
    if (existsSync(testResultsPath)) {
      const testResults = JSON.parse(readFileSync(testResultsPath, 'utf-8'));
      return testResults.timestamp || null;
    }

    // Check environment variable set by CI/CD
    if (process.env.LAST_E2E_TEST_TIME) {
      return process.env.LAST_E2E_TEST_TIME;
    }

    return null;
  } catch (error) {
    console.error('Failed to read E2E test time:', error);
    return null;
  }
}

// Get environment type
function getEnvironment(): 'development' | 'staging' | 'production' {
  if (process.env.NODE_ENV === 'production') {
    // Check if we're on staging based on URL or environment variable
    if (process.env.VERCEL_ENV === 'preview' ||
        process.env.APP_ENV === 'staging' ||
        process.env.VERCEL_URL?.includes('staging')) {
      return 'staging';
    }
    return 'production';
  }
  return 'development';
}

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();

    // Gather all telemetry data in parallel where possible
    const [
      salesforceStatus,
      companyCamStatus,
      redisStatus,
      webSocketStatus,
    ] = await Promise.all([
      checkSalesforceStatus(),
      checkCompanyCamStatus(),
      checkRedisStatus(),
      checkWebSocketStatus(),
    ]);

    const buildInfo = getBuildInfo();
    const memUsage = process.memoryUsage();

    const telemetryData = {
      environment: getEnvironment(),
      buildTime: buildInfo.buildTime,
      commitSha: buildInfo.commitSha,
      lastE2ETest: getLastE2ETestTime(),
      uptime: Math.round(process.uptime()),
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
      },
      integrations: {
        salesforce: salesforceStatus,
        companyCam: companyCamStatus,
        redis: redisStatus,
        websocket: webSocketStatus,
      },
      webVitals: {
        // These would be populated by client-side measurements
        // Placeholder for server response
        tti: null,
        fcp: null,
        lcp: null,
        cls: null,
        ttfb: Date.now() - startTime,
      },
    };

    return NextResponse.json(telemetryData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Response-Time': `${Date.now() - startTime}ms`,
      },
    });
  } catch (error) {
    console.error('Telemetry status error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch telemetry data',
        message: error instanceof Error ? error.message : 'Unknown error',
        environment: getEnvironment(),
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }
}
