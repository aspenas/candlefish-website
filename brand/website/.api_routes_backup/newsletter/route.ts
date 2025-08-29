import { NextRequest, NextResponse } from 'next/server'
import { databaseService } from '../../../lib/email/database-service'

// Email configuration
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'hello@candlefish.ai'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { email, name, source = 'website' } = data

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

    // Create subscriber in database
    const subscriber = await databaseService.createSubscriber(email, name, source)
    
    console.log('Newsletter subscription:', {
      timestamp: new Date().toISOString(),
      email: subscriber.email,
      name: subscriber.name,
      source,
      subscriber_id: subscriber.id
    })

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to workshop notes',
      subscriber_id: subscriber.id
    })
  } catch (error) {
    console.error('Newsletter subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to subscribe to newsletter' },
      { status: 500 }
    )
  }
}

// Handle unsubscribe
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

    // Unsubscribe from database
    const success = await databaseService.unsubscribeByEmail(email)
    
    if (!success) {
      return NextResponse.json(
        { error: 'Email address not found in subscription list' },
        { status: 404 }
      )
    }

    console.log('Newsletter unsubscribe:', {
      timestamp: new Date().toISOString(),
      email: email.toLowerCase().trim()
    })

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from workshop notes'
    })
  } catch (error) {
    console.error('Newsletter unsubscribe error:', error)
    return NextResponse.json(
      { error: 'Failed to unsubscribe from newsletter' },
      { status: 500 }
    )
  }
}