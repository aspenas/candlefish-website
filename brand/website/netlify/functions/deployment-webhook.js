const { Resend } = require('resend');

/**
 * Netlify Deployment Webhook for Workshop Notes Newsletter
 * 
 * Automatically triggered on successful deployments to detect and send
 * new workshop notes to newsletter subscribers via Resend.com
 * 
 * Environment Variables Required:
 * - RESEND_API_KEY: Resend API key for sending emails
 * - WEBHOOK_SECRET: Secret for webhook verification
 * - DEPLOYMENT_BRANCH: Branch to monitor (default: main)
 * - ADMIN_EMAIL: Admin email for notifications
 * 
 * Usage:
 * POST /.netlify/functions/deployment-webhook
 * Content-Type: application/json
 * 
 * Webhook URL for Netlify: https://your-site.netlify.app/.netlify/functions/deployment-webhook
 */

// In-memory tracking for new notes (in production, use database/Redis)
const notificationState = new Map();

// Rate limiting storage (prevent spam)
const rateLimitMap = new Map();

/**
 * Rate limiting for webhook calls
 */
function rateLimit(ip) {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000; // 5 minutes
  const maxRequests = 10; // Allow 10 requests per 5 minutes per IP

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, [now]);
    return true;
  }

  const timestamps = rateLimitMap.get(ip).filter(t => now - t < windowMs);

  if (timestamps.length >= maxRequests) {
    return false;
  }

  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return true;
}

/**
 * Verify webhook signature from Netlify
 */
function verifyWebhookSignature(body, signature, secret) {
  if (!signature || !secret) return true; // Skip verification if not configured
  
  const crypto = require('crypto');
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
    
  return crypto.timingSafeEqual(
    Buffer.from(signature), 
    Buffer.from(expectedSignature)
  );
}

/**
 * Parse workshop notes from deployment context
 * This detects new notes by comparing deployment commit data
 */
function parseWorkshopNotesFromDeployment(deployment) {
  const newNotes = [];
  
  try {
    // Check if deployment includes changes to workshop content
    const commitMessage = deployment.commit_ref?.message || '';
    const changedFiles = deployment.commit_ref?.files || [];
    
    // Look for workshop note changes
    const workshopFiles = changedFiles.filter(file => 
      file.includes('workshop') || 
      file.includes('data/workshop') ||
      file.includes('app/workshop-notes')
    );
    
    // Check commit message for workshop note keywords
    const workshopKeywords = [
      'workshop note', 'new note', 'add note', 'publish note',
      'workshop:', 'note:', 'operational pattern'
    ];
    
    const hasWorkshopContent = workshopFiles.length > 0 || 
      workshopKeywords.some(keyword => 
        commitMessage.toLowerCase().includes(keyword.toLowerCase())
      );
    
    if (hasWorkshopContent) {
      // Extract note information from commit message or files
      const noteInfo = extractNoteInfo(commitMessage, workshopFiles);
      if (noteInfo) {
        newNotes.push(noteInfo);
      }
    }
    
    return newNotes;
  } catch (error) {
    console.error('Error parsing workshop notes from deployment:', error);
    return [];
  }
}

/**
 * Extract note information from commit message and changed files
 */
function extractNoteInfo(commitMessage, files) {
  // Default note structure
  const noteInfo = {
    id: `note-${Date.now()}`,
    title: 'New Workshop Note Published',
    summary: 'A new operational pattern has been published to the workshop notes.',
    category: 'operational-pattern',
    tags: ['workshop', 'operational', 'pattern'],
    reading_time: 5,
    author: 'Candlefish Atelier',
    published_at: new Date(),
    deployment_detected: true
  };
  
  // Try to extract title from commit message
  const titleMatch = commitMessage.match(/(?:add|publish|new)?\s*(?:workshop\s+)?note:?\s*([^(\n]+)/i);
  if (titleMatch) {
    noteInfo.title = titleMatch[1].trim();
    noteInfo.id = `note-${titleMatch[1].toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50)}`;
  }
  
  // Try to extract category from commit message or files
  const categoryMatch = commitMessage.match(/category:?\s*([a-zA-Z-]+)/i);
  if (categoryMatch) {
    noteInfo.category = categoryMatch[1].toLowerCase();
  }
  
  // Extract tags from commit message
  const tagsMatch = commitMessage.match(/tags?:?\s*([^\n\r]+)/i);
  if (tagsMatch) {
    const extractedTags = tagsMatch[1].split(',').map(tag => tag.trim().toLowerCase());
    noteInfo.tags = [...new Set([...noteInfo.tags, ...extractedTags])];
  }
  
  return noteInfo;
}

/**
 * Get active newsletter subscribers
 * In production, this would query your database
 */
async function getNewsletterSubscribers() {
  // Mock subscribers for testing - replace with actual database query
  return [
    {
      id: 'test-001',
      email: process.env.ADMIN_EMAIL || 'hello@candlefish.ai',
      name: 'Admin',
      status: 'active',
      unsubscribe_token: 'test-token-' + Date.now()
    }
  ];
}

/**
 * Send workshop note notification email
 */
async function sendWorkshopNoteNotification(subscriber, note) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  const unsubscribeUrl = `${process.env.NETLIFY_URL || 'https://candlefish.ai'}/api/email/unsubscribe?token=${subscriber.unsubscribe_token}`;
  
  const emailContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${note.title} - Candlefish Workshop Notes</title>
    <style>
        body { font-family: Georgia, serif; line-height: 1.6; color: #0D1B2A; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0D1B2A 0%, #1B263B 100%); 
                  padding: 30px 20px; text-align: center; color: white; }
        .content { padding: 30px 20px; background: #F8F8F2; }
        .footer { padding: 20px; background: #F9FAFB; text-align: center; font-size: 12px; color: #415A77; }
        .note-title { font-size: 24px; font-weight: 700; margin-bottom: 16px; }
        .note-meta { color: #415A77; margin-bottom: 20px; font-size: 14px; }
        .cta-button { display: inline-block; background: #3FD3C6; color: #0D1B2A; 
                     padding: 12px 24px; text-decoration: none; border-radius: 6px; 
                     font-weight: 600; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin:0; font-size: 18px; letter-spacing: 2px;">CANDLEFISH ATELIER</h1>
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #3FD3C6;">New Workshop Note Published</p>
        </div>
        
        <div class="content">
            <h2 class="note-title">${note.title}</h2>
            
            <div class="note-meta">
                <span style="background: #3FD3C6; color: #0D1B2A; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-right: 12px;">
                    ${note.reading_time} min read
                </span>
                <span style="text-transform: uppercase; letter-spacing: 1px;">${note.category}</span>
            </div>
            
            <div style="font-size: 16px; line-height: 1.7; margin-bottom: 24px;">
                ${note.summary}
            </div>
            
            <div style="margin: 20px 0;">
                ${note.tags.map(tag => 
                  `<span style="display: inline-block; background: #F3F4F6; color: #415A77; 
                   padding: 4px 8px; border-radius: 12px; font-size: 11px; margin-right: 8px;">
                   ${tag}</span>`
                ).join('')}
            </div>
            
            <div style="background: #0D1B2A; padding: 24px; border-radius: 8px; text-align: center; margin: 30px 0;">
                <h3 style="color: #F8F8F2; margin: 0 0 12px 0;">Read the Full Note</h3>
                <p style="color: #E0E1DD; font-size: 14px; margin: 0 0 20px 0;">
                    Discover the operational patterns that emerge from real work.
                </p>
                <a href="https://candlefish.ai/workshop-notes" class="cta-button">
                    Visit Workshop Notes
                </a>
            </div>
            
            <div style="background: linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%); 
                        border: 1px solid #3FD3C6; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <h4 style="color: #0D1B2A; font-size: 14px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">
                    Operational Pattern
                </h4>
                <p style="margin: 0; font-size: 14px; line-height: 1.5;">
                    We publish when we discover something worth sharing. No content calendar. 
                    No SEO games. Just operational patterns that emerge from real work.
                </p>
            </div>
        </div>
        
        <div class="footer">
            <p>This note was sent from Candlefish Atelier</p>
            <p>Operational patterns for technical organizations</p>
            <p style="margin-top: 20px;">
                <a href="https://candlefish.ai" style="color: #415A77; margin: 0 8px;">Website</a>
                <a href="https://candlefish.ai/workshop-notes" style="color: #415A77; margin: 0 8px;">All Notes</a>
                <a href="https://candlefish.ai/atelier" style="color: #415A77; margin: 0 8px;">Atelier</a>
            </p>
            <p style="margin-top: 16px;">
                <a href="${unsubscribeUrl}" style="color: #9CA3AF; font-size: 11px;">
                    Unsubscribe from workshop notes
                </a>
            </p>
        </div>
    </div>
</body>
</html>
  `.trim();

  try {
    const result = await resend.emails.send({
      from: 'Candlefish Atelier <hello@candlefish.ai>',
      to: [subscriber.email],
      subject: `New Workshop Note: ${note.title}`,
      html: emailContent,
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
      },
      tags: [
        { name: 'type', value: 'workshop-note-alert' },
        { name: 'category', value: note.category },
        { name: 'deployment', value: 'auto' }
      ]
    });

    return {
      success: !!result.data?.id,
      messageId: result.data?.id,
      error: result.error?.message
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send admin notification about deployment processing
 */
async function sendAdminNotification(deployment, notes, emailResults) {
  if (!process.env.ADMIN_EMAIL) return;

  const resend = new Resend(process.env.RESEND_API_KEY);
  
  const adminContent = `
Deployment Webhook Processed

Deployment Details:
- Site: ${deployment.site_name}
- Branch: ${deployment.branch}
- Deploy ID: ${deployment.id}
- Commit: ${deployment.commit_ref?.sha?.substring(0, 7)}
- Message: ${deployment.commit_ref?.message || 'No message'}

Workshop Notes Detected: ${notes.length}
${notes.map(note => `- ${note.title} (${note.category})`).join('\n')}

Email Results:
- Total subscribers: ${emailResults.length}
- Successful sends: ${emailResults.filter(r => r.success).length}
- Failed sends: ${emailResults.filter(r => !r.success).length}

Timestamp: ${new Date().toISOString()}
  `.trim();

  try {
    await resend.emails.send({
      from: 'Candlefish Deployment <deploy@candlefish.ai>',
      to: [process.env.ADMIN_EMAIL],
      subject: `[Workshop Notes] Deployment webhook processed - ${notes.length} notes`,
      text: adminContent
    });
  } catch (error) {
    console.error('Failed to send admin notification:', error);
  }
}

/**
 * Main webhook handler
 */
exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Get client IP for rate limiting
    const ip = event.headers['x-forwarded-for'] || 
               event.headers['x-real-ip'] || 
               'unknown';

    // Apply rate limiting
    if (!rateLimit(ip)) {
      return {
        statusCode: 429,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Too many requests' }),
      };
    }

    // Verify webhook signature if secret is configured
    const signature = event.headers['x-webhook-signature'];
    const webhookSecret = process.env.WEBHOOK_SECRET;
    
    if (webhookSecret && !verifyWebhookSignature(event.body, signature, webhookSecret)) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid webhook signature' }),
      };
    }

    const deployment = JSON.parse(event.body);
    
    // Only process successful deployments to the main branch
    const targetBranch = process.env.DEPLOYMENT_BRANCH || 'main';
    if (deployment.state !== 'ready' || deployment.branch !== targetBranch) {
      console.log(`Skipping deployment: state=${deployment.state}, branch=${deployment.branch}`);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: 'Deployment skipped - not ready or wrong branch',
          processed: false
        }),
      };
    }

    // Check if we've already processed this deployment
    const deploymentId = deployment.id;
    if (notificationState.has(deploymentId)) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: 'Deployment already processed',
          processed: false
        }),
      };
    }

    // Mark deployment as processed
    notificationState.set(deploymentId, { processed: true, timestamp: Date.now() });

    // Parse workshop notes from deployment
    const newNotes = parseWorkshopNotesFromDeployment(deployment);
    
    if (newNotes.length === 0) {
      console.log('No new workshop notes detected in deployment');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: 'No new workshop notes detected',
          processed: true,
          notes: 0
        }),
      };
    }

    console.log(`Found ${newNotes.length} new workshop note(s):`, newNotes.map(n => n.title));

    // Only send emails if RESEND_API_KEY is configured
    let emailResults = [];
    if (process.env.RESEND_API_KEY && 
        process.env.RESEND_API_KEY !== 're_placeholder_key_change_this') {
      
      // Get newsletter subscribers
      const subscribers = await getNewsletterSubscribers();
      console.log(`Sending to ${subscribers.length} subscribers`);

      // Send notification for each new note
      for (const note of newNotes) {
        for (const subscriber of subscribers) {
          const result = await sendWorkshopNoteNotification(subscriber, note);
          emailResults.push({
            subscriber: subscriber.email,
            note: note.title,
            ...result
          });
          
          // Rate limiting: 100ms between emails (Resend allows 10/sec)
          if (subscribers.indexOf(subscriber) < subscribers.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }

      // Send admin notification
      await sendAdminNotification(deployment, newNotes, emailResults);
    } else {
      console.log('Email service not configured - skipping notifications');
    }

    // Clean up old notification states (keep last 1000)
    if (notificationState.size > 1000) {
      const entries = Array.from(notificationState.entries())
        .sort((a, b) => b[1].timestamp - a[1].timestamp)
        .slice(500);
      
      notificationState.clear();
      entries.forEach(([key, value]) => notificationState.set(key, value));
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Workshop notes deployment processed successfully',
        processed: true,
        notes: newNotes.length,
        notifications_sent: emailResults.length,
        successful_sends: emailResults.filter(r => r.success).length
      }),
    };

  } catch (error) {
    console.error('Deployment webhook error:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal server error processing deployment webhook'
      }),
    };
  }
};