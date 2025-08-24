import { NextRequest, NextResponse } from 'next/server'
import { databaseService } from '../../../../lib/email/database-service'

/**
 * Handle email unsubscribe via token (for email links)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Unsubscribe token is required' },
        { status: 400 }
      )
    }

    // Find subscriber by token
    const subscriber = await databaseService.getSubscriberByToken(token)
    if (!subscriber) {
      return NextResponse.json(
        { error: 'Invalid unsubscribe token' },
        { status: 404 }
      )
    }

    // If already unsubscribed, show success message
    if (subscriber.status === 'unsubscribed') {
      return new NextResponse(
        generateUnsubscribePage(subscriber.email, true),
        {
          status: 200,
          headers: { 'Content-Type': 'text/html' }
        }
      )
    }

    // Show confirmation page
    return new NextResponse(
      generateConfirmationPage(subscriber.email, token),
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }
    )
  } catch (error) {
    console.error('Unsubscribe GET error:', error)
    return new NextResponse(
      generateErrorPage('An error occurred while processing your unsubscribe request.'),
      {
        status: 500,
        headers: { 'Content-Type': 'text/html' }
      }
    )
  }
}

/**
 * Process unsubscribe confirmation
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Unsubscribe token is required' },
        { status: 400 }
      )
    }

    // Unsubscribe the user
    const success = await databaseService.unsubscribeByToken(token)
    
    if (!success) {
      return NextResponse.json(
        { error: 'Invalid unsubscribe token' },
        { status: 404 }
      )
    }

    // Get subscriber info for response
    const subscriber = await databaseService.getSubscriberByToken(token)
    const email = subscriber?.email || 'your email'

    console.log('Email unsubscribed via token:', {
      timestamp: new Date().toISOString(),
      email,
      token: token.substring(0, 8) + '...'
    })

    return new NextResponse(
      generateUnsubscribePage(email, false),
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }
    )
  } catch (error) {
    console.error('Unsubscribe POST error:', error)
    return new NextResponse(
      generateErrorPage('An error occurred while unsubscribing you from our emails.'),
      {
        status: 500,
        headers: { 'Content-Type': 'text/html' }
      }
    )
  }
}

/**
 * Generate unsubscribe confirmation page HTML
 */
function generateConfirmationPage(email: string, token: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Unsubscribe - Candlefish Atelier</title>
    <style>
        :root {
            --depth-void: #0D1B2A;
            --depth-ocean: #1B263B;
            --depth-graphite: #415A77;
            --light-primary: #F8F8F2;
            --light-secondary: #E0E1DD;
            --operation-active: #3FD3C6;
        }
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
            font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
            background: linear-gradient(135deg, var(--depth-void) 0%, var(--depth-ocean) 100%);
            color: var(--light-primary);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            max-width: 500px;
            background: var(--light-primary);
            color: var(--depth-void);
            border-radius: 12px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }
        
        .logo {
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: var(--depth-graphite);
            margin-bottom: 32px;
        }
        
        h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 16px;
            color: var(--depth-void);
        }
        
        .email {
            color: var(--operation-active);
            font-weight: 600;
            background: #F0F9FF;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 14px;
        }
        
        p {
            margin-bottom: 24px;
            line-height: 1.6;
            color: var(--depth-graphite);
        }
        
        .buttons {
            margin-top: 32px;
            display: flex;
            gap: 16px;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .btn {
            padding: 12px 24px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            border: none;
            transition: all 0.3s ease;
        }
        
        .btn-primary {
            background: #EF4444;
            color: white;
        }
        
        .btn-primary:hover {
            background: #DC2626;
        }
        
        .btn-secondary {
            background: var(--light-secondary);
            color: var(--depth-void);
        }
        
        .btn-secondary:hover {
            background: #D1D5DB;
        }
        
        .footer {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #E5E7EB;
            color: var(--depth-graphite);
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">Candlefish Atelier</div>
        <h1>Confirm Unsubscribe</h1>
        <p>We're sorry to see you go! Are you sure you want to unsubscribe <span class="email">${email}</span> from our workshop notes?</p>
        <p>You'll no longer receive emails about new operational patterns, technical insights, or workshop discoveries.</p>
        
        <div class="buttons">
            <form method="POST" action="/api/email/unsubscribe?token=${token}" style="display: inline;">
                <button type="submit" class="btn btn-primary">Yes, Unsubscribe</button>
            </form>
            <a href="https://candlefish.ai" class="btn btn-secondary">Keep Subscription</a>
        </div>
        
        <div class="footer">
            <p>Candlefish Atelier · Operational patterns for technical organizations</p>
        </div>
    </div>
</body>
</html>
  `.trim()
}

/**
 * Generate successful unsubscribe page HTML
 */
function generateUnsubscribePage(email: string, wasAlreadyUnsubscribed: boolean): string {
  const message = wasAlreadyUnsubscribed 
    ? "You were already unsubscribed from our workshop notes."
    : "You have been successfully unsubscribed from our workshop notes."

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Unsubscribed - Candlefish Atelier</title>
    <style>
        :root {
            --depth-void: #0D1B2A;
            --depth-ocean: #1B263B;
            --depth-graphite: #415A77;
            --light-primary: #F8F8F2;
            --light-secondary: #E0E1DD;
            --operation-active: #3FD3C6;
        }
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
            font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
            background: linear-gradient(135deg, var(--depth-void) 0%, var(--depth-ocean) 100%);
            color: var(--light-primary);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            max-width: 500px;
            background: var(--light-primary);
            color: var(--depth-void);
            border-radius: 12px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }
        
        .logo {
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: var(--depth-graphite);
            margin-bottom: 32px;
        }
        
        .success-icon {
            width: 64px;
            height: 64px;
            margin: 0 auto 24px;
            background: #10B981;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 32px;
        }
        
        h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 16px;
            color: var(--depth-void);
        }
        
        .email {
            color: var(--operation-active);
            font-weight: 600;
            background: #F0F9FF;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 14px;
        }
        
        p {
            margin-bottom: 16px;
            line-height: 1.6;
            color: var(--depth-graphite);
        }
        
        .message {
            font-size: 16px;
            margin-bottom: 24px;
        }
        
        .btn {
            display: inline-block;
            padding: 12px 24px;
            background: var(--operation-active);
            color: var(--depth-void);
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
            transition: all 0.3s ease;
            margin-top: 24px;
        }
        
        .btn:hover {
            background: #2DD4BF;
        }
        
        .footer {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #E5E7EB;
            color: var(--depth-graphite);
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">Candlefish Atelier</div>
        <div class="success-icon">✓</div>
        <h1>Unsubscribed</h1>
        <p class="message">${message}</p>
        <p>The email <span class="email">${email}</span> will no longer receive workshop notes from us.</p>
        <p>If you change your mind, you can always resubscribe from our website.</p>
        
        <a href="https://candlefish.ai" class="btn">Visit Candlefish.ai</a>
        
        <div class="footer">
            <p>Thank you for being part of our community.<br>Candlefish Atelier · Operational patterns for technical organizations</p>
        </div>
    </div>
</body>
</html>
  `.trim()
}

/**
 * Generate error page HTML
 */
function generateErrorPage(errorMessage: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Error - Candlefish Atelier</title>
    <style>
        :root {
            --depth-void: #0D1B2A;
            --depth-ocean: #1B263B;
            --depth-graphite: #415A77;
            --light-primary: #F8F8F2;
            --operation-active: #3FD3C6;
        }
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
            font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
            background: linear-gradient(135deg, var(--depth-void) 0%, var(--depth-ocean) 100%);
            color: var(--light-primary);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            max-width: 500px;
            background: var(--light-primary);
            color: var(--depth-void);
            border-radius: 12px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }
        
        .logo {
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: var(--depth-graphite);
            margin-bottom: 32px;
        }
        
        .error-icon {
            width: 64px;
            height: 64px;
            margin: 0 auto 24px;
            background: #EF4444;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 32px;
        }
        
        h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 16px;
            color: var(--depth-void);
        }
        
        p {
            margin-bottom: 24px;
            line-height: 1.6;
            color: var(--depth-graphite);
        }
        
        .btn {
            display: inline-block;
            padding: 12px 24px;
            background: var(--operation-active);
            color: var(--depth-void);
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
            transition: all 0.3s ease;
        }
        
        .btn:hover {
            background: #2DD4BF;
        }
        
        .footer {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #E5E7EB;
            color: var(--depth-graphite);
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">Candlefish Atelier</div>
        <div class="error-icon">!</div>
        <h1>Something Went Wrong</h1>
        <p>${errorMessage}</p>
        <p>Please try again later, or contact us if the problem persists.</p>
        
        <a href="https://candlefish.ai/contact" class="btn">Contact Support</a>
        
        <div class="footer">
            <p>Candlefish Atelier · Operational patterns for technical organizations</p>
        </div>
    </div>
</body>
</html>
  `.trim()
}