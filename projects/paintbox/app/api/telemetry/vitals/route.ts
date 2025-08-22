/**
 * Web Vitals Collection Endpoint
 * Receives and stores Web Vitals metrics from client-side measurements
 */

import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';

interface VitalsPayload {
  metric: string;
  value: number;
  delta?: number;
  id: string;
  rating?: 'good' | 'needs-improvement' | 'poor';
  navigationType?: string;
  timestamp: string;
  sessionId?: string;
  pathname?: string;
}

// Store vitals in memory if Redis is not available
const inMemoryVitals: VitalsPayload[] = [];
const MAX_IN_MEMORY_VITALS = 1000;

async function storeVitals(vitals: VitalsPayload) {
  // Try Redis first
  if (process.env.REDIS_URL) {
    try {
      const redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        connectTimeout: 1000,
        commandTimeout: 500,
        lazyConnect: true,
      });

      await redis.connect();

      // Store in a sorted set with timestamp as score
      const key = `webvitals:${vitals.metric}:${new Date().toISOString().split('T')[0]}`;
      const score = new Date(vitals.timestamp).getTime();
      const value = JSON.stringify(vitals);

      await redis.zadd(key, score, value);

      // Set expiry to 7 days
      await redis.expire(key, 7 * 24 * 60 * 60);

      // Store aggregate metrics
      const aggregateKey = `webvitals:aggregate:${vitals.metric}`;
      await redis.lpush(aggregateKey, vitals.value);
      await redis.ltrim(aggregateKey, 0, 999); // Keep last 1000 values
      await redis.expire(aggregateKey, 24 * 60 * 60); // 24 hour expiry

      await redis.disconnect();
    } catch (error) {
      console.error('Failed to store vitals in Redis:', error);
      // Fall through to in-memory storage
    }
  }

  // Fallback to in-memory storage
  inMemoryVitals.push(vitals);

  // Limit in-memory storage
  if (inMemoryVitals.length > MAX_IN_MEMORY_VITALS) {
    inMemoryVitals.shift();
  }
}

async function getAggregateVitals(metric?: string) {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  // Filter in-memory vitals
  const recentVitals = inMemoryVitals.filter(v => {
    const timestamp = new Date(v.timestamp).getTime();
    return timestamp > oneDayAgo && (!metric || v.metric === metric);
  });

  // Calculate aggregates
  const aggregates: Record<string, any> = {};

  const metricGroups = recentVitals.reduce((acc, vital) => {
    if (!acc[vital.metric]) {
      acc[vital.metric] = [];
    }
    acc[vital.metric].push(vital.value);
    return acc;
  }, {} as Record<string, number[]>);

  for (const [metricName, values] of Object.entries(metricGroups)) {
    if (values.length > 0) {
      const sorted = values.sort((a, b) => a - b);
      aggregates[metricName] = {
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        median: sorted[Math.floor(sorted.length / 2)],
        p75: sorted[Math.floor(sorted.length * 0.75)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        average: values.reduce((a, b) => a + b, 0) / values.length,
      };
    }
  }

  return aggregates;
}

// POST endpoint to receive vitals
export async function POST(request: NextRequest) {
  try {
    const vitals: VitalsPayload = await request.json();

    // Validate payload
    if (!vitals.metric || typeof vitals.value !== 'number' || !vitals.id) {
      return NextResponse.json(
        { error: 'Invalid vitals payload' },
        { status: 400 }
      );
    }

    // Add additional context
    vitals.timestamp = vitals.timestamp || new Date().toISOString();
    vitals.pathname = request.headers.get('referer')?.replace(request.headers.get('origin') || '', '') || '/';
    vitals.sessionId = request.cookies.get('sessionId')?.value;

    // Store the vitals
    await storeVitals(vitals);

    // Log significant issues
    if (vitals.rating === 'poor') {
      console.warn(`Poor Web Vital detected: ${vitals.metric} = ${vitals.value}ms (${vitals.pathname})`);
    }

    return NextResponse.json(
      { success: true, received: vitals.metric },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('Failed to process vitals:', error);
    return NextResponse.json(
      { error: 'Failed to process vitals' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve aggregate vitals
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const metric = searchParams.get('metric') || undefined;

    const aggregates = await getAggregateVitals(metric);

    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        period: '24h',
        metrics: aggregates,
        sampleCount: inMemoryVitals.length,
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=60', // Cache for 1 minute
        },
      }
    );
  } catch (error) {
    console.error('Failed to get aggregate vitals:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve vitals' },
      { status: 500 }
    );
  }
}
