import { NextRequest, NextResponse } from 'next/server';
import { circuitBreakerService } from '@/lib/services/circuit-breaker-service';

export async function GET(
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

    return NextResponse.json(breaker);
  } catch (error) {
    console.error('Error fetching circuit breaker:', error);
    return NextResponse.json(
      { error: 'Failed to fetch circuit breaker' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const breaker = circuitBreakerService.updateBreaker(id, body);

    if (!breaker) {
      return NextResponse.json(
        { error: 'Circuit breaker not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(breaker);
  } catch (error) {
    console.error('Error updating circuit breaker:', error);
    return NextResponse.json(
      { error: 'Failed to update circuit breaker' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const success = circuitBreakerService.deleteBreaker(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Circuit breaker not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Circuit breaker deleted successfully' });
  } catch (error) {
    console.error('Error deleting circuit breaker:', error);
    return NextResponse.json(
      { error: 'Failed to delete circuit breaker' },
      { status: 500 }
    );
  }
}
