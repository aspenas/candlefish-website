import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const error = searchParams.get('error');
  
  // Common authentication errors
  const errorMessages: Record<string, string> = {
    'Configuration': 'Authentication is not properly configured. Please check your environment variables.',
    'AccessDenied': 'Access denied. You do not have permission to sign in.',
    'Verification': 'Token verification failed. Please try signing in again.',
    'OAuthSignin': 'Error during OAuth sign-in. Please try again.',
    'OAuthCallback': 'Error during OAuth callback. Please try again.',
    'OAuthCreateAccount': 'Could not create OAuth account. Please try again.',
    'EmailCreateAccount': 'Could not create email account. Please try again.',
    'Callback': 'Error in authentication callback. Please try again.',
    'Default': 'An authentication error occurred. Please try again.',
  };

  const message = error ? (errorMessages[error] || errorMessages['Default']) : errorMessages['Default'];

  // Return JSON response for API calls
  if (request.headers.get('accept')?.includes('application/json')) {
    return NextResponse.json({
      success: false,
      error: error || 'Unknown',
      message,
    }, { status: 401 });
  }

  // Return HTML for browser requests
  return new NextResponse(
    `<!DOCTYPE html>
    <html>
      <head>
        <title>Authentication Error - CLOS Dashboard</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            max-width: 500px;
            margin: 0 auto;
            padding: 2rem;
            text-align: center;
            color: white;
          }
          .error-icon {
            width: 80px;
            height: 80px;
            margin: 0 auto 2rem;
            background: rgba(239, 68, 68, 0.1);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .error-icon svg {
            width: 40px;
            height: 40px;
            color: #ef4444;
          }
          h1 {
            font-size: 2rem;
            margin-bottom: 1rem;
            color: #f8fafc;
          }
          p {
            font-size: 1.125rem;
            color: #94a3b8;
            line-height: 1.6;
            margin-bottom: 2rem;
          }
          .error-code {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            background: rgba(148, 163, 184, 0.1);
            border-radius: 0.375rem;
            font-family: monospace;
            font-size: 0.875rem;
            color: #cbd5e1;
            margin-bottom: 2rem;
          }
          .button {
            display: inline-block;
            padding: 0.75rem 2rem;
            background: #3b82f6;
            color: white;
            text-decoration: none;
            border-radius: 0.5rem;
            font-weight: 500;
            transition: background 0.2s;
          }
          .button:hover {
            background: #2563eb;
          }
          .secondary-link {
            display: inline-block;
            margin-top: 1rem;
            color: #94a3b8;
            text-decoration: none;
            font-size: 0.875rem;
          }
          .secondary-link:hover {
            color: #cbd5e1;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
          </div>
          <h1>Authentication Error</h1>
          <p>${message}</p>
          ${error ? `<div class="error-code">Error: ${error}</div>` : ''}
          <a href="/login" class="button">Back to Login</a>
          <br>
          <a href="/" class="secondary-link">Go to Dashboard</a>
        </div>
      </body>
    </html>`,
    {
      status: 401,
      headers: {
        'Content-Type': 'text/html',
      },
    }
  );
}