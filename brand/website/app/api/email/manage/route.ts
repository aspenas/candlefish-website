import { NextRequest, NextResponse } from 'next/server'
import { databaseService } from '../../../../lib/email/database-service'

/**
 * Email management API - Get subscribers, stats, and analytics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'subscribers':
        const subscribers = await databaseService.debugListAllSubscribers()
        return NextResponse.json({
          success: true,
          subscribers: subscribers.map(sub => ({
            id: sub.id,
            email: sub.email,
            name: sub.name,
            status: sub.status,
            unsubscribe_token: sub.unsubscribe_token
          }))
        })

      case 'notes':
        const notes = await databaseService.debugListAllNotes()
        return NextResponse.json({
          success: true,
          notes: notes.map(note => ({
            id: note.id,
            title: note.title,
            summary: note.summary,
            category: note.category,
            tags: note.tags,
            reading_time: note.reading_time,
            author: note.author,
            published_at: note.published_at
          }))
        })

      case 'stats':
        const subscriberCount = await databaseService.getSubscriberCount()
        const campaignStats = await databaseService.getCampaignStats()
        return NextResponse.json({
          success: true,
          stats: {
            active_subscribers: subscriberCount,
            ...campaignStats
          }
        })

      default:
        // Default: return overview
        const allSubscribers = await databaseService.debugListAllSubscribers()
        const allNotes = await databaseService.debugListAllNotes()
        const allStats = await databaseService.getCampaignStats()

        return NextResponse.json({
          success: true,
          overview: {
            subscribers: {
              total: allSubscribers.length,
              active: allSubscribers.filter(s => s.status === 'active').length,
              unsubscribed: allSubscribers.filter(s => s.status === 'unsubscribed').length
            },
            workshop_notes: {
              total: allNotes.length,
              published: allNotes.length
            },
            campaigns: allStats
          },
          recent_subscribers: allSubscribers.slice(0, 5).map(sub => ({
            email: sub.email,
            name: sub.name,
            status: sub.status
          })),
          workshop_notes: allNotes.map(note => ({
            id: note.id,
            title: note.title,
            category: note.category,
            reading_time: note.reading_time
          }))
        })
    }
  } catch (error) {
    console.error('Email management API error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve email data' },
      { status: 500 }
    )
  }
}

/**
 * Administrative actions for email management
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { action } = data

    switch (action) {
      case 'create_test_subscriber':
        const { email, name } = data
        if (!email) {
          return NextResponse.json(
            { error: 'Email is required' },
            { status: 400 }
          )
        }

        const subscriber = await databaseService.createSubscriber(email, name, 'admin-test')
        return NextResponse.json({
          success: true,
          message: 'Test subscriber created',
          subscriber: {
            id: subscriber.id,
            email: subscriber.email,
            name: subscriber.name,
            status: subscriber.status
          }
        })

      case 'reactivate_subscriber':
        const { subscriber_email } = data
        if (!subscriber_email) {
          return NextResponse.json(
            { error: 'Subscriber email is required' },
            { status: 400 }
          )
        }

        const existingSubscriber = await databaseService.getSubscriberByEmail(subscriber_email)
        if (!existingSubscriber) {
          return NextResponse.json(
            { error: 'Subscriber not found' },
            { status: 404 }
          )
        }

        // Reactivate by creating/updating
        const reactivated = await databaseService.createSubscriber(subscriber_email, existingSubscriber.name, 'admin-reactivate')
        return NextResponse.json({
          success: true,
          message: 'Subscriber reactivated',
          subscriber: {
            id: reactivated.id,
            email: reactivated.email,
            status: reactivated.status
          }
        })

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Email management POST error:', error)
    return NextResponse.json(
      { error: 'Failed to process email management request' },
      { status: 500 }
    )
  }
}