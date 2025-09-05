import { NextRequest, NextResponse } from 'next/server';

interface WebVitalData {
  name: string;
  value: number;
  id: string;
  delta: number;
  timestamp: number;
  url: string;
  userAgent: string;
}

// In-memory storage for development (use database in production)
const vitalsData: WebVitalData[] = [];

export async function POST(request: NextRequest) {
  try {
    const data: WebVitalData = await request.json();
    
    // Validate the data
    if (!data.name || typeof data.value !== 'number' || !data.id) {
      return NextResponse.json(
        { error: 'Invalid web vital data' },
        { status: 400 }
      );
    }

    // Add timestamp if not provided
    if (!data.timestamp) {
      data.timestamp = Date.now();
    }

    // Store the data (in production, store in database)
    vitalsData.push(data);

    // Log performance issues in development
    if (process.env.NODE_ENV === 'development') {
      const thresholds = {
        LCP: { good: 2500, poor: 4000 },
        FID: { good: 100, poor: 300 },
        CLS: { good: 0.1, poor: 0.25 },
        FCP: { good: 1800, poor: 3000 },
        TTFB: { good: 600, poor: 1500 }
      };

      const threshold = thresholds[data.name as keyof typeof thresholds];
      if (threshold) {
        let status = 'good';
        if (data.value > threshold.poor) {
          status = 'poor';
        } else if (data.value > threshold.good) {
          status = 'needs improvement';
        }

        console.log(
          `[Web Vitals] ${data.name}: ${data.value}${data.name === 'CLS' ? '' : 'ms'} (${status})`,
          data.url
        );

        // Warn about poor performance
        if (status === 'poor') {
          console.warn(
            `[Performance Warning] ${data.name} is ${data.value}${data.name === 'CLS' ? '' : 'ms'}, which is above the recommended threshold`
          );
        }
      }
    }

    // In production, you might want to:
    // 1. Store in database (PostgreSQL, MongoDB, etc.)
    // 2. Send to analytics service (Google Analytics, Amplitude, etc.)
    // 3. Send alerts for poor performance
    // 4. Aggregate data for reporting

    return NextResponse.json(
      { success: true, timestamp: data.timestamp },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (error) {
    console.error('Error processing web vitals data:', error);
    return NextResponse.json(
      { error: 'Failed to process web vitals data' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const metric = searchParams.get('metric');
    const limit = parseInt(searchParams.get('limit') || '100');
    const since = searchParams.get('since');

    let filtered = vitalsData;

    // Filter by metric if specified
    if (metric) {
      filtered = filtered.filter(data => data.name === metric);
    }

    // Filter by date if specified
    if (since) {
      const sinceTimestamp = new Date(since).getTime();
      filtered = filtered.filter(data => data.timestamp >= sinceTimestamp);
    }

    // Sort by timestamp (newest first) and limit
    const result = filtered
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    // Calculate statistics
    const stats = {
      total: filtered.length,
      metrics: {} as Record<string, {
        count: number;
        average: number;
        min: number;
        max: number;
        p75: number;
        p95: number;
      }>
    };

    // Group by metric for statistics
    const groupedByMetric = filtered.reduce((acc, data) => {
      if (!acc[data.name]) acc[data.name] = [];
      acc[data.name].push(data.value);
      return acc;
    }, {} as Record<string, number[]>);

    // Calculate statistics for each metric
    Object.entries(groupedByMetric).forEach(([metricName, values]) => {
      const sorted = values.sort((a, b) => a - b);
      const count = values.length;
      const sum = values.reduce((a, b) => a + b, 0);
      
      stats.metrics[metricName] = {
        count,
        average: sum / count,
        min: sorted[0],
        max: sorted[count - 1],
        p75: sorted[Math.floor(count * 0.75)],
        p95: sorted[Math.floor(count * 0.95)],
      };
    });

    return NextResponse.json(
      { data: result, stats },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=60', // Cache for 1 minute
        }
      }
    );
  } catch (error) {
    console.error('Error retrieving web vitals data:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve web vitals data' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}