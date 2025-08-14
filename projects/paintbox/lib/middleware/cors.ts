import { NextRequest, NextResponse } from 'next/server';

// CORS configuration
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(origin => origin.trim());

const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'X-Internal-Request',
  'X-Service',
  'X-Internal-Token',
];

const MAX_AGE = 86400; // 24 hours

export interface CorsOptions {
  origins?: string[];
  methods?: string[];
  headers?: string[];
  credentials?: boolean;
  maxAge?: number;
}

/**
 * Apply CORS headers to response
 */
export function applyCorsHeaders(
  request: NextRequest,
  response: NextResponse,
  options: CorsOptions = {}
): NextResponse {
  const {
    origins = ALLOWED_ORIGINS,
    methods = ALLOWED_METHODS,
    headers = ALLOWED_HEADERS,
    credentials = true,
    maxAge = MAX_AGE,
  } = options;

  const origin = request.headers.get('origin');

  // Check if origin is allowed
  if (origin && origins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else if (origins.includes('*')) {
    response.headers.set('Access-Control-Allow-Origin', '*');
  } else if (process.env.NODE_ENV === 'development') {
    // Allow localhost in development
    if (origin?.includes('localhost') || origin?.includes('127.0.0.1')) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
  }

  // Set other CORS headers
  response.headers.set('Access-Control-Allow-Methods', methods.join(', '));
  response.headers.set('Access-Control-Allow-Headers', headers.join(', '));

  if (credentials) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  response.headers.set('Access-Control-Max-Age', maxAge.toString());

  // Add Vary header for proper caching
  const varyHeader = response.headers.get('Vary');
  if (varyHeader) {
    response.headers.set('Vary', `${varyHeader}, Origin`);
  } else {
    response.headers.set('Vary', 'Origin');
  }

  return response;
}

/**
 * CORS middleware for API routes
 */
export async function corsMiddleware(
  request: NextRequest,
  options: CorsOptions = {}
): Promise<NextResponse | null> {
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    return applyCorsHeaders(request, response, options);
  }

  return null;
}

/**
 * Wrapper function to add CORS to API route handlers
 */
export function withCors(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: CorsOptions = {}
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Handle OPTIONS request
    const corsResponse = await corsMiddleware(req, options);
    if (corsResponse) {
      return corsResponse;
    }

    // Process the actual request
    const response = await handler(req);

    // Apply CORS headers to response
    return applyCorsHeaders(req, response, options);
  };
}

/**
 * Strict CORS configuration for production
 */
export const strictCors: CorsOptions = {
  origins: [
    'https://paintbox.app',
    'https://www.paintbox.app',
    'https://paintbox.vercel.app',
    'https://paintbox-app.fly.dev',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  headers: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 3600, // 1 hour
};

/**
 * Relaxed CORS configuration for development
 */
export const devCors: CorsOptions = {
  origins: ['*'],
  methods: ALLOWED_METHODS,
  headers: ALLOWED_HEADERS,
  credentials: true,
  maxAge: MAX_AGE,
};

/**
 * Get CORS configuration based on environment
 */
export function getCorsConfig(): CorsOptions {
  if (process.env.NODE_ENV === 'production') {
    return strictCors;
  }
  return devCors;
}
