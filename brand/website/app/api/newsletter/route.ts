import { NextRequest, NextResponse } from 'next/server'

// Email configuration
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'hello@candlefish.ai'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { email, source = 'website' } = data

    // Validate email
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
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

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim()

    // In production, this would:
    // 1. Add to email marketing service (Mailchimp, SendGrid, ConvertKit, etc.)
    // 2. Store in database with preferences
    // 3. Send welcome email
    // 4. Track analytics

    console.log('Newsletter subscription:', {
      timestamp: new Date().toISOString(),
      email: normalizedEmail,
      source
    })

    // Mock subscription (replace with actual service)
    // await subscribeToNewsletter({
    //   email: normalizedEmail,
    //   tags: ['website', source],
    //   customFields: {
    //     signupDate: new Date().toISOString(),
    //     source
    //   }
    // })

    // Send notification to admin (optional)
    // await sendEmail({
    //   to: ADMIN_EMAIL,
    //   subject: 'New Newsletter Subscription',
    //   text: `New subscription from ${normalizedEmail} via ${source}`
    // })

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to newsletter'
    })
  } catch (error) {
    console.error('Newsletter subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to subscribe to newsletter' },
      { status: 500 }
    )
  }
}

// Handle unsubscribe (optional)
export async function DELETE(request: NextRequest) {
  try {
    const data = await request.json()
    const { email } = data

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // In production, remove from email service
    console.log('Newsletter unsubscribe:', {
      timestamp: new Date().toISOString(),
      email: normalizedEmail
    })

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from newsletter'
    })
  } catch (error) {
    console.error('Newsletter unsubscribe error:', error)
    return NextResponse.json(
      { error: 'Failed to unsubscribe from newsletter' },
      { status: 500 }
    )
  }
}