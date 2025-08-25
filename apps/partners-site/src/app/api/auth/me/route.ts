import { NextRequest, NextResponse } from 'next/server'

// Mock user data - replace with actual authentication logic
const mockUser = {
  id: '1',
  email: 'admin@company.com',
  name: 'System Administrator',
  avatar: null,
  role: 'admin' as const,
  permissions: ['read', 'write', 'delete', 'admin'],
  organization: {
    id: 'org-1',
    name: 'Candlefish Enterprise',
    plan: 'enterprise' as const
  },
  lastLogin: new Date(),
  mfaEnabled: true
}

export async function GET(request: NextRequest) {
  try {
    // In a real app, validate JWT token here
    const authHeader = request.headers.get('authorization')
    const cookieAuth = request.cookies.get('auth-token')

    if (!authHeader && !cookieAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Mock authentication check
    // In production, decode and validate JWT token

    return NextResponse.json(mockUser)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
