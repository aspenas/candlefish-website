import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '15m';
const JWT_REFRESH_EXPIRES_IN = '7d';

// Mock user database - replace with actual database queries
const users = [
  {
    id: '1',
    username: 'patrick',
    email: 'patrick@candlefish.ai',
    password: '$2a$10$K7L1OJ1J8Z0l/n5Vv5YN1e5QJ5K7L1OJ1J8Z0l/n5Vv5YN1e5QJ5', // admin_password
    role: 'admin' as const,
  },
  {
    id: '2',
    username: 'tyler',
    email: 'tyler@candlefish.ai',
    password: '$2a$10$abcdefghijklmnopqrstuvwxyz123456789ABCDEFGHIJKLMNOP', // user_password  
    role: 'user' as const,
  },
  {
    id: '3',
    username: 'aaron',
    email: 'aaron@candlefish.ai',
    password: '$2a$10$abcdefghijklmnopqrstuvwxyz123456789ABCDEFGHIJKLMNOP', // user_password
    role: 'user' as const,
  },
  {
    id: '4',
    username: 'james',
    email: 'james@candlefish.ai',
    password: '$2a$10$abcdefghijklmnopqrstuvwxyz123456789ABCDEFGHIJKLMNOP', // user_password
    role: 'user' as const,
  },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Find user
    const user = users.find(u => u.username === username || u.email === username);
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // For demo purposes, accept hardcoded passwords
    const validPasswords: Record<string, string[]> = {
      'patrick': ['admin_password'],
      'tyler': ['user_password'],
      'aaron': ['user_password'],
      'james': ['user_password'],
    };

    const isValidPassword = validPasswords[user.username]?.includes(password);

    if (!isValidPassword) {
      // Try bcrypt comparison as fallback
      try {
        const bcryptValid = await bcrypt.compare(password, user.password);
        if (!bcryptValid) {
          return NextResponse.json(
            { success: false, message: 'Invalid credentials' },
            { status: 401 }
          );
        }
      } catch {
        return NextResponse.json(
          { success: false, message: 'Invalid credentials' },
          { status: 401 }
        );
      }
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { 
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
      { 
        userId: user.id,
        type: 'refresh'
      },
      JWT_SECRET,
      { expiresIn: JWT_REFRESH_EXPIRES_IN }
    );

    // Set cookies
    const cookieStore = cookies();
    
    cookieStore.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    });

    cookieStore.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return NextResponse.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}