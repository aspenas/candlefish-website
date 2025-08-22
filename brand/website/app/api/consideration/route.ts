import { NextRequest, NextResponse } from 'next/server'

// Rate limiting storage
const rateLimitMap = new Map()

// Rate limiting function
function rateLimit(ip: string): boolean {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute
  const maxRequests = 2 // More restrictive for consideration requests

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

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'

    // Apply rate limiting
    if (!rateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    const data = await request.json()
    const {
      yearsInOperation,
      operationalChallenge,
      manualHours,
      investmentRange,
      name,
      role,
      email,
      company
    } = data

    // Validate required fields
    if (!yearsInOperation || !operationalChallenge || !manualHours || !investmentRange ||
        !name || !role || !email || !company) {
      return NextResponse.json(
        { error: 'All fields are required' },
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

    // Validate numeric fields
    const years = parseInt(yearsInOperation)
    const hours = parseInt(manualHours)

    if (isNaN(years) || years < 1) {
      return NextResponse.json(
        { error: 'Years in operation must be a valid number' },
        { status: 400 }
      )
    }

    if (isNaN(hours) || hours < 1) {
      return NextResponse.json(
        { error: 'Manual hours must be a valid number' },
        { status: 400 }
      )
    }

    // Log the submission for tracking
    console.log('Consideration request received:', {
      timestamp: new Date().toISOString(),
      name,
      email,
      company,
      yearsInOperation: years,
      manualHours: hours,
      investmentRange,
      ip,
      challenge: operationalChallenge.substring(0, 100) + '...' // Log preview only
    })

    // In production, this would:
    // 1. Store in database with queue position
    // 2. Send email notification to hello@candlefish.ai
    // 3. Send confirmation email to applicant
    // 4. Add to consideration queue system
    // 5. Trigger internal workflow notifications

    // Mock email content that would be sent to hello@candlefish.ai
    const emailContent = `
New Consideration Request Received

Contact Information:
- Name: ${name}
- Role: ${role}
- Email: ${email}
- Company: ${company}

Operational Context:
- Years in Operation: ${years}
- Manual Hours/Week: ${hours}
- Investment Range: ${investmentRange}

Operational Challenge:
${operationalChallenge}

Submitted: ${new Date().toISOString()}
IP: ${ip}
    `.trim()

    // TODO: Replace with actual email service (SendGrid, AWS SES, Resend, etc.)
    // await sendEmail({
    //   to: 'hello@candlefish.ai',
    //   from: 'noreply@candlefish.ai',
    //   subject: `[Consideration Request] ${company} - ${name}`,
    //   text: emailContent,
    //   replyTo: email
    // })

    // Mock queue position calculation
    const currentQueueLength = 7
    const newPosition = currentQueueLength + 1

    return NextResponse.json({
      success: true,
      message: 'Your consideration request has been received.',
      queuePosition: newPosition,
      expectedConsideration: 'January-February 2026'
    })

  } catch (error) {
    console.error('Consideration request error:', error)
    return NextResponse.json(
      { error: 'Failed to process consideration request. Please try again.' },
      { status: 500 }
    )
  }
}
