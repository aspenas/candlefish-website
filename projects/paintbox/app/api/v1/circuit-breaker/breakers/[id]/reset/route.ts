import { NextRequest, NextResponse } from 'next/server';
import { circuitBreakerService } from '@/lib/services/circuit-breaker-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const breaker = circuitBreakerService.getBreaker(id);

    if (!breaker) {
      return NextResponse.json(
        { error: 'Circuit breaker not found' },
        { status: 404 }
      );
    }

    circuitBreakerService.resetBreaker(id);
    const updatedBreaker = circuitBreakerService.getBreaker(id);

    return NextResponse.json({
      message: 'Circuit breaker reset successfully',
      breaker: updatedBreaker
    });
  } catch (error) {
    console.error('Error resetting circuit breaker:', error);
    return NextResponse.json(
      { error: 'Failed to reset circuit breaker' },
      { status: 500 }
    );
  }
}
