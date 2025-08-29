import { NextRequest, NextResponse } from 'next/server'

// Email configuration - in production, use environment variables
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'hello@candlefish.ai'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { name, email, company, type, message } = data

    // Validate required fields
    if (!name || !email || !message || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // In production, this would:
    // 1. Store in database
    // 2. Send email via SendGrid/AWS SES/Resend
    // 3. Create ticket in support system
    // 4. Trigger automation workflows

    // Log for now (in production, use proper logging service)
    console.log('Contact form submission:', {
      timestamp: new Date().toISOString(),
      name,
      email,
      company: company || 'Not provided',
      type,
      message: message.substring(0, 100) + '...' // Log preview only
    })

    // Mock email sending (replace with actual email service)
    // await sendEmail({
    //   to: ADMIN_EMAIL,
    //   from: 'noreply@candlefish.ai',
    //   subject: `[Contact Form] ${type}: ${name}`,
    //   text: `
    //     Name: ${name}
    //     Email: ${email}
    //     Company: ${company || 'Not provided'}
    //     Type: ${type}
    //     
    //     Message:
    //     ${message}
    //   `,
    //   replyTo: email
    // })

    return NextResponse.json({
      success: true,
      message: 'Your message has been received. We\'ll respond within 24 hours.'
    })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Failed to process contact form' },
      { status: 500 }
    )
  }
}

// Rate limiting (in production, use middleware like upstash/ratelimit)
const rateLimitMap = new Map()

function rateLimit(ip: string): boolean {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute
  const maxRequests = 3

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, [now])
    return true
  }

  const timestamps = rateLimitMap.get(ip).filter((t: number) => now - t < windowMs)
  
  if (timestamps.length >= maxRequests) {
    return false
  }

  timestamps.push(now)
  rateLimitMap.set(ip, timestamps)
  return true
}