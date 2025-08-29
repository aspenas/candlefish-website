import { NextRequest, NextResponse } from 'next/server'
import { databaseService } from '../../../../lib/email/database-service'
import { resendService } from '../../../../lib/email/resend-service'

/**
 * Send workshop note to all active subscribers
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { workshop_note_title, test_email } = data

    // Get workshop note by title or ID
    let workshopNote = await databaseService.getWorkshopNoteByTitle(workshop_note_title)
    if (!workshopNote && workshop_note_title) {
      workshopNote = await databaseService.getWorkshopNote(workshop_note_title)
    }

    if (!workshopNote) {
      return NextResponse.json(
        { error: 'Workshop note not found' },
        { status: 404 }
      )
    }

    // If test_email is provided, send only to that email
    if (test_email) {
      console.log(`Sending test email for "${workshopNote.title}" to ${test_email}`)
      
      const success = await resendService.sendTestEmail(test_email, workshopNote)
      
      if (success) {
        return NextResponse.json({
          success: true,
          message: `Test email sent successfully to ${test_email}`,
          workshop_note: workshopNote.title,
          sent_to: test_email
        })
      } else {
        return NextResponse.json(
          { error: 'Failed to send test email' },
          { status: 500 }
        )
      }
    }

    // Get all active subscribers
    const subscribers = await databaseService.getActiveSubscribers()
    
    if (subscribers.length === 0) {
      return NextResponse.json(
        { error: 'No active subscribers found' },
        { status: 404 }
      )
    }

    console.log(`Sending "${workshopNote.title}" to ${subscribers.length} subscribers`)

    // Create campaign record
    const campaign = await databaseService.createCampaign(
      workshopNote.id,
      workshopNote.title,
      'workshop-note'
    )

    // Update campaign status to sending
    await databaseService.updateCampaignStatus(campaign.id, 'sending')

    // Send emails to all subscribers
    const results = await resendService.sendToSubscribers(subscribers, workshopNote)

    // Update campaign status based on results
    const finalStatus = results.failed === 0 ? 'sent' : (results.sent > 0 ? 'sent' : 'failed')
    await databaseService.updateCampaignStatus(campaign.id, finalStatus)

    console.log('Email campaign completed:', {
      campaign_id: campaign.id,
      workshop_note: workshopNote.title,
      total_subscribers: results.total,
      sent: results.sent,
      failed: results.failed,
      status: finalStatus
    })

    return NextResponse.json({
      success: true,
      message: `Workshop note sent to subscribers`,
      campaign_id: campaign.id,
      workshop_note: workshopNote.title,
      stats: {
        total_subscribers: results.total,
        sent: results.sent,
        failed: results.failed
      },
      results: results.results
    })
  } catch (error) {
    console.error('Send workshop note error:', error)
    return NextResponse.json(
      { error: 'Failed to send workshop note' },
      { status: 500 }
    )
  }
}

/**
 * Get list of available workshop notes
 */
export async function GET() {
  try {
    const notes = await databaseService.getAllWorkshopNotes()
    const subscribers = await databaseService.getActiveSubscribers()
    const stats = await databaseService.getCampaignStats()

    return NextResponse.json({
      success: true,
      workshop_notes: notes.map(note => ({
        id: note.id,
        title: note.title,
        summary: note.summary,
        category: note.category,
        tags: note.tags,
        reading_time: note.reading_time,
        published_at: note.published_at
      })),
      subscriber_count: subscribers.length,
      campaign_stats: stats
    })
  } catch (error) {
    console.error('Get workshop notes error:', error)
    return NextResponse.json(
      { error: 'Failed to get workshop notes' },
      { status: 500 }
    )
  }
}