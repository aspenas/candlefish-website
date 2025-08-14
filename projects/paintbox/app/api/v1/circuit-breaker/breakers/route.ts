import { NextRequest, NextResponse } from 'next/server';
import { circuitBreakerService } from '@/lib/services/circuit-breaker-service';

export async function GET(request: NextRequest) {
  try {
    const breakers = circuitBreakerService.getAllBreakers();
    const metrics = circuitBreakerService.getMetrics();

    return NextResponse.json({
      breakers,
      metrics,
      total: breakers.length
    });
  } catch (error) {
    console.error('Error fetching circuit breakers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch circuit breakers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, service, failureThreshold, successThreshold, timeout } = body;

    if (!name || !service) {
      return NextResponse.json(
        { error: 'Name and service are required' },
        { status: 400 }
      );
    }

    const breaker = circuitBreakerService.createBreaker({
      name,
      service,
      failureThreshold,
      successThreshold,
      timeout
    });

    return NextResponse.json(breaker, { status: 201 });
  } catch (error) {
    console.error('Error creating circuit breaker:', error);
    return NextResponse.json(
      { error: 'Failed to create circuit breaker' },
      { status: 500 }
    );
  }
}
