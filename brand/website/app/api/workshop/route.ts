import { NextRequest, NextResponse } from 'next/server';
import workshopData from '../../../workshop/index.json';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface WorkshopFormData {
  // Operational Context
  currentProcesses: string;
  manualHours: string;
  teamSize: string;
  urgencyLevel: string;

  // Technical Readiness
  systemsInUse: string[];
  technicalTeam: string;
  implementationTimeline: string;
  budgetRange: string;

  // Workshop Preferences
  workshopFormat: 'onsite' | 'remote' | 'hybrid';
  preferredDuration: string;
  teamAttendees: string;

  // Contact Information
  name: string;
  role: string;
  email: string;
  company: string;
  phone: string;

  // Metadata
  readinessScore: number;
  submissionTime: string;
}

// Workshop API endpoint to serve project titles for header morph effect
export async function GET() {
  try {
    // Return workshop projects with rotation-friendly format
    const projects = workshopData.map(project => ({
      id: project.slug,
      title: project.title.toLowerCase(), // Lowercase for design consistency
      status: project.status,
      domain: project.domain,
      complexity: project.complexity,
      impact: project.impact,
      updated_at: project.updated_at
    }));

    return NextResponse.json({
      projects,
      count: projects.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to load workshop data:', error);
    return NextResponse.json(
      { error: 'Failed to load workshop data' },
      { status: 500 }
    );
  }
}

// Workshop request submission endpoint
export async function POST(req: NextRequest) {
  try {
    const formData: WorkshopFormData = await req.json();

    // Basic validation
    const requiredFields = ['name', 'email', 'company', 'currentProcesses', 'manualHours', 'urgencyLevel'];
    for (const field of requiredFields) {
      if (!formData[field as keyof WorkshopFormData]) {
        return NextResponse.json({ error: `${field} is required` }, { status: 400 });
      }
    }

    // Generate workshop request ID
    const requestId = `WS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const queuePosition = Math.floor(Math.random() * 15) + 5; // Simulate queue position

    // Create email content
    const emailContent = `
    <div style="font-family: 'SF Mono', Consolas, monospace; background: #0a0a0a; color: #f8f8f2; padding: 40px;">
      <div style="max-width: 600px; margin: 0 auto;">
        <div style="border: 1px solid #b87333; padding: 30px; background: rgba(52, 58, 64, 0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #3fd3c6; font-size: 24px; font-weight: 300; margin: 0;">
              Workshop Request Received
            </h1>
            <div style="color: #b87333; font-size: 12px; margin-top: 8px;">
              REQUEST_ID: ${requestId}
            </div>
          </div>

          <div style="background: rgba(0,0,0,0.3); padding: 20px; margin-bottom: 20px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; text-align: center;">
              <div>
                <div style="color: #3fd3c6; font-size: 18px;">#${queuePosition}</div>
                <div style="color: #f8f8f2; opacity: 0.5; font-size: 10px;">QUEUE POSITION</div>
              </div>
              <div>
                <div style="color: #b87333; font-size: 18px;">${formData.readinessScore}%</div>
                <div style="color: #f8f8f2; opacity: 0.5; font-size: 10px;">READINESS SCORE</div>
              </div>
              <div>
                <div style="color: #f8f8f2; font-size: 18px;">2-3 weeks</div>
                <div style="color: #f8f8f2; opacity: 0.5; font-size: 10px;">RESPONSE TIME</div>
              </div>
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="color: #b87333; font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">
              Contact Information
            </h3>
            <div style="color: #f8f8f2; opacity: 0.8; line-height: 1.6;">
              <strong>${formData.name}</strong> - ${formData.role}<br/>
              ${formData.company}<br/>
              ${formData.email} | ${formData.phone}
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="color: #b87333; font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">
              Operational Context
            </h3>
            <div style="color: #f8f8f2; opacity: 0.8; line-height: 1.6;">
              <strong>Manual Hours/Week:</strong> ${formData.manualHours}<br/>
              <strong>Team Size:</strong> ${formData.teamSize}<br/>
              <strong>Urgency:</strong> ${formData.urgencyLevel}<br/>
              <strong>Current Processes:</strong><br/>
              <div style="background: rgba(0,0,0,0.3); padding: 10px; margin-top: 5px; font-size: 12px;">
                ${formData.currentProcesses}
              </div>
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="color: #b87333; font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">
              Technical Readiness
            </h3>
            <div style="color: #f8f8f2; opacity: 0.8; line-height: 1.6;">
              <strong>Systems:</strong> ${formData.systemsInUse.join(', ')}<br/>
              <strong>Technical Team:</strong> ${formData.technicalTeam}<br/>
              <strong>Implementation Timeline:</strong> ${formData.implementationTimeline}<br/>
              <strong>Budget Range:</strong> ${formData.budgetRange}
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="color: #b87333; font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">
              Workshop Preferences
            </h3>
            <div style="color: #f8f8f2; opacity: 0.8; line-height: 1.6;">
              <strong>Format:</strong> ${formData.workshopFormat}<br/>
              <strong>Duration:</strong> ${formData.preferredDuration}<br/>
              <strong>Attendees:</strong> ${formData.teamAttendees} people
            </div>
          </div>

          <div style="border-top: 1px solid #b87333; padding-top: 20px; margin-top: 30px; text-align: center;">
            <div style="color: #f8f8f2; opacity: 0.7; font-size: 12px; line-height: 1.6;">
              Your request is being evaluated by our operational engineering team.<br/>
              We'll respond within 2-3 weeks with next steps and potential workshop dates.<br/>
              <br/>
              <span style="color: #3fd3c6;">CANDLEFISH ATELIER</span> - Operational Laboratory<br/>
              Precision automation engineering
            </div>
          </div>
        </div>
      </div>
    </div>
    `;

    // Send confirmation email to client
    if (process.env.RESEND_API_KEY) {
      try {
        await resend.emails.send({
          from: 'workshop@candlefish.ai',
          to: formData.email,
          subject: `Workshop Request Received - Queue Position #${queuePosition}`,
          html: emailContent,
        });

        // Send notification email to internal team
        await resend.emails.send({
          from: 'workshop@candlefish.ai',
          to: 'workshop@candlefish.ai',
          subject: `New Workshop Request - ${formData.company} (Score: ${formData.readinessScore}%)`,
          html: emailContent,
        });
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // Continue with response even if email fails
      }
    }

    return NextResponse.json({
      success: true,
      requestId,
      queuePosition,
      message: 'Workshop request submitted successfully'
    });

  } catch (error) {
    console.error('Workshop request error:', error);
    return NextResponse.json({ error: 'Failed to submit workshop request' }, { status: 500 });
  }
}
