import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const {
      name,
      email,
      company,
      role,
      phone,
      preferredTime,
      message,
      sessionId,
      score
    } = data

    // Validate required fields
    if (!name || !email || !company || !role || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // In production, this would:
    // 1. Store in database
    // 2. Send notification email to sales team
    // 3. Send confirmation email to user
    // 4. Create CRM entry
    // 5. Schedule follow-up task

    // For now, we'll log and return success
    console.log('Consultation request received:', {
      sessionId,
      name,
      email,
      company,
      role,
      score: score?.level,
      qualified: score?.candlefishFit?.qualified,
      timestamp: new Date().toISOString()
    })

    // Send notification (in production, this would be an actual email service)
    // await sendNotificationEmail({
    //   to: 'team@candlefish.ai',
    //   subject: `New Consultation Request - ${company} (${score?.level})`,
    //   data: { name, email, company, role, sessionId, score }
    // })

    // Send confirmation (in production)
    // await sendConfirmationEmail({
    //   to: email,
    //   subject: 'Consultation Request Received - Candlefish',
    //   data: { name, sessionId }
    // })

    return NextResponse.json({
      success: true,
      message: 'Consultation request received',
      sessionId
    })
  } catch (error) {
    console.error('Consultation request error:', error)
    return NextResponse.json(
      { error: 'Failed to process consultation request' },
      { status: 500 }
    )
  }
}
