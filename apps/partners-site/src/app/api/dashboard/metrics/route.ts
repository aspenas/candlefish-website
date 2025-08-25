import { NextRequest, NextResponse } from 'next/server'

// Mock dashboard metrics
function generateMockMetrics() {
  return {
    apiCalls: Math.floor(Math.random() * 10000) + 50000,
    activeUsers: Math.floor(Math.random() * 500) + 1200,
    systemHealth: Math.floor(Math.random() * 15) + 85,
    responseTime: Math.floor(Math.random() * 100) + 50,
    errorRate: Math.random() * 3,
    uptime: 99.5 + (Math.random() * 0.4)
  }
}

export async function GET(request: NextRequest) {
  try {
    // In production, verify auth token
    const authHeader = request.headers.get('authorization')
    const cookieAuth = request.cookies.get('auth-token')

    if (!authHeader && !cookieAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const metrics = generateMockMetrics()

    return NextResponse.json(metrics)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
