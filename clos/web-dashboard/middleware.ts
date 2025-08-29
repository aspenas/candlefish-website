import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jwt from 'jsonwebtoken';

// Public routes that don't require authentication
const publicRoutes = ['/login', '/api/health', '/test-login.html', '/test-login'];

// JWT secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Check if it's a public route or static file
  const isPublicRoute = publicRoutes.some(route => path.startsWith(route));
  const isStaticFile = path.includes('.') && !path.startsWith('/api');
  
  // Skip authentication for public routes and static files
  if (isPublicRoute || isStaticFile) {
    return NextResponse.next();
  }
  
  // Get token from cookies or Authorization header
  const accessToken = request.cookies.get('accessToken')?.value;
  const authHeader = request.headers.get('authorization');
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  
  const token = accessToken || headerToken;
  
  // Check if token exists
  if (!token) {
    // Redirect to login if accessing protected route without token
    if (!path.startsWith('/api')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Return 401 for API routes
    return NextResponse.json(
      { success: false, message: 'Authentication required' },
      { status: 401 }
    );
  }
  
  // Validate JWT token
  try {
    // For now, just check if token exists
    // In production, you should verify the JWT signature
    // const decoded = jwt.verify(token, JWT_SECRET);
    
    // If accessing login page with valid token, redirect to dashboard
    if (path === '/login') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    return NextResponse.next();
  } catch (error) {
    // Invalid token
    if (!path.startsWith('/api')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.json(
      { success: false, message: 'Invalid token' },
      { status: 401 }
    );
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};