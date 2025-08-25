import { NextRequest, NextResponse } from 'next/server'

// Mock alerts data
const mockAlerts = [
  {
    id: '1',
    type: 'warning' as const,
    title: 'High CPU Usage',
    message: 'Server CPU usage has exceeded 80% for the last 5 minutes',
    timestamp: new Date(Date.now() - 10 * 60 * 1000),
    resolved: false
  },
  {
    id: '2',
    type: 'critical' as const,
    title: 'Database Connection Failed',
    message: 'Primary database connection lost. Failing over to backup.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    resolved: true
  },
  {
    id: '3',
    type: 'info' as const,
    title: 'Maintenance Window',
    message: 'Scheduled maintenance completed successfully',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    resolved: true
  },
  {
    id: '4',
    type: 'warning' as const,
    title: 'API Rate Limit Approaching',
    message: 'Client is approaching rate limit threshold (90% of quota used)',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    resolved: false
  },
  {
    id: '5',
    type: 'critical' as const,
    title: 'Disk Space Low',
    message: 'Server disk usage is at 95% capacity. Immediate action required.',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    resolved: false
  }
]

export async function GET(request: NextRequest) {
  try {
    // In production, verify auth token
    const authHeader = request.headers.get('authorization')
    const cookieAuth = request.cookies.get('auth-token')

    if (!authHeader && !cookieAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Sort alerts by timestamp (newest first)
    const sortedAlerts = mockAlerts.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    return NextResponse.json(sortedAlerts)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
