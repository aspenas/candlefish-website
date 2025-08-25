import { NextRequest, NextResponse } from 'next/server'

// Mock credentials - replace with actual authentication
const mockCredentials = {
  'admin@company.com': 'password123',
  'manager@company.com': 'manager456',
  'user@company.com': 'user789'
}

const mockUsers = {
  'admin@company.com': {
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
  },
  'manager@company.com': {
    id: '2',
    email: 'manager@company.com',
    name: 'Team Manager',
    avatar: null,
    role: 'manager' as const,
    permissions: ['read', 'write'],
    organization: {
      id: 'org-1',
      name: 'Candlefish Enterprise',
      plan: 'professional' as const
    },
    lastLogin: new Date(),
    mfaEnabled: false
  },
  'user@company.com': {
    id: '3',
    email: 'user@company.com',
    name: 'Regular User',
    avatar: null,
    role: 'user' as const,
    permissions: ['read'],
    organization: {
      id: 'org-2',
      name: 'Small Business Inc',
      plan: 'starter' as const
    },
    lastLogin: new Date(),
    mfaEnabled: false
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Check credentials
    if (mockCredentials[email as keyof typeof mockCredentials] !== password) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const user = mockUsers[email as keyof typeof mockUsers]
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Update last login
    user.lastLogin = new Date()

    // In production, generate and sign a JWT token
    const token = `mock-jwt-token-${user.id}-${Date.now()}`

    // Set HTTP-only cookie
    const response = NextResponse.json(user)
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    return response
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
