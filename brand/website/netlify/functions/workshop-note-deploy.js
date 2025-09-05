const { Resend } = require('resend');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * Candlefish Workshop Note Deployment Newsletter Function
 * 
 * Automatically sends newsletter updates when new workshop notes are deployed
 * Triggered by Netlify deploy succeeded webhook
 * 
 * Environment Variables Required:
 * - RESEND_API_KEY: Resend API key for sending emails
 * - RESEND_AUDIENCE_ID: Audience ID for workshop note subscribers
 * - DEPLOY_WEBHOOK_SECRET: Secret for validating webhook requests
 * - WORKSHOP_NOTE_FROM_EMAIL: From email for workshop notes (default: atelier@candlefish.ai)
 * - WORKSHOP_NOTE_REPLY_TO: Reply-to email (default: workshop@candlefish.ai)
 */

// Track sent notes to avoid duplicates
const SENT_NOTES_FILE = '/tmp/sent-workshop-notes.json';

async function getSentNotes() {
  try {
    const data = await fs.readFile(SENT_NOTES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

async function saveSentNotes(sentNotes) {
  try {
    await fs.writeFile(SENT_NOTES_FILE, JSON.stringify(sentNotes, null, 2));
  } catch (error) {
    console.error('Failed to save sent notes:', error);
  }
}

// Verify webhook signature
function verifyWebhookSignature(body, signature, secret) {
  if (!secret) return true; // Skip verification if no secret configured
  
  const hash = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  
  return `sha256=${hash}` === signature;
}

// Parse workshop note content for email
function parseNoteContent(note) {
  // Extract first paragraph as summary if not provided
  const summary = note.excerpt || note.content.split('\n\n')[0].replace(/#/g, '').trim();
  
  // Convert markdown to simple HTML for email
  let htmlContent = note.content
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^\* (.*)$/gim, '<li>$1</li>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  
  // Wrap in paragraphs
  htmlContent = `<p>${htmlContent}</p>`;
  
  // Limit content length for email (first 3 sections)
  const sections = htmlContent.split(/<h2>/);
  if (sections.length > 4) {
    htmlContent = sections.slice(0, 4).join('<h2>') + 
      '<p><strong>Continue reading the full note on our website...</strong></p>';
  }
  
  return {
    summary,
    htmlContent,
    plainContent: note.content.substring(0, 1000) + '...'
  };
}

// Load and prepare email template
async function prepareEmailTemplate(note) {
  try {
    // Read the workshop note email template
    const templatePath = path.join(__dirname, '../../lib/email/templates/workshop-note.html');
    let template = await fs.readFile(templatePath, 'utf8');
    
    const { summary, htmlContent } = parseNoteContent(note);
    
    // Replace template variables
    template = template
      .replace(/{{title}}/g, note.title)
      .replace(/{{reading_time}}/g, note.readTime.replace(' min read', ''))
      .replace(/{{category}}/g, note.category)
      .replace(/{{summary}}/g, summary)
      .replace(/{{content}}/g, htmlContent)
      .replace(/{{unsubscribe_url}}/g, 'https://candlefish.ai/unsubscribe');
    
    // Handle tags
    const tagsHtml = note.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
    template = template.replace(/{{#each tags}}.*?{{\/each}}/s, tagsHtml);
    
    return template;
  } catch (error) {
    console.error('Failed to load email template:', error);
    // Fallback to simple HTML
    return `
      <html>
        <body style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1>${note.title}</h1>
          <p><strong>${note.readTime}</strong> | ${note.category}</p>
          <p>${note.excerpt}</p>
          <a href="https://candlefish.ai/workshop-notes?note=${note.id}" 
             style="display: inline-block; background: #3FD3C6; color: #0D1B2A; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Read Full Note
          </a>
        </body>
      </html>
    `;
  }
}

// Get subscriber list from Resend
async function getSubscribers(resend, audienceId) {
  try {
    const { data, error } = await resend.contacts.list({
      audienceId: audienceId
    });
    
    if (error) {
      console.error('Failed to fetch subscribers:', error);
      return [];
    }
    
    // Filter for subscribed contacts interested in workshop notes
    return data.filter(contact => 
      contact.subscribed && 
      (!contact.tags || contact.tags.includes('workshop-notes'))
    ).map(contact => contact.email);
  } catch (error) {
    console.error('Failed to get subscribers:', error);
    return [];
  }
}

exports.handler = async (event, context) => {
  // Only process POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  // Verify webhook signature if secret is configured
  const webhookSecret = process.env.DEPLOY_WEBHOOK_SECRET;
  const signature = event.headers['x-webhook-signature'];
  
  if (webhookSecret && !verifyWebhookSignature(event.body, signature, webhookSecret)) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Invalid webhook signature' })
    };
  }
  
  // Parse the webhook payload
  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON payload' })
    };
  }
  
  // Check if this is a production deployment
  if (payload.context !== 'production') {
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Skipping non-production deployment' })
    };
  }
  
  // Initialize Resend
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Resend API key not configured' })
    };
  }
  
  const resend = new Resend(resendApiKey);
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  
  try {
    // Load workshop notes data directly (hardcoded for Netlify function)
    // This would normally be fetched from a database or API
    const workshopNotes = [
      {
        id: 'asymmetric-information-advantage',
        date: '2025.09.05',
        category: 'philosophical',
        title: 'The Asymmetric Information Advantage',
        excerpt: 'Our asymmetric information advantage doesn\'t come from secrecy. It comes from depth. From living through 62% OCR accuracy failures and discovering operational truths through experience.',
        readTime: '18 min read',
        tags: ['operational-philosophy', 'information-asymmetry', 'competitive-advantage', 'performance-art', 'craft-engineering']
      }
      // Add more notes as needed
    ];
    
    // Get previously sent notes
    const sentNotes = await getSentNotes();
    
    // Find new notes (not previously sent)
    const newNotes = workshopNotes.filter(note => !sentNotes[note.id]);
    
    if (newNotes.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No new workshop notes to send' })
      };
    }
    
    // Get subscriber list
    const subscribers = audienceId ? 
      await getSubscribers(resend, audienceId) :
      ['workshop@candlefish.ai']; // Fallback to admin email
    
    if (subscribers.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No subscribers found' })
      };
    }
    
    // Send email for each new note
    const results = [];
    for (const note of newNotes) {
      try {
        // Prepare email content
        const emailHtml = await prepareEmailTemplate(note);
        
        // Send email to all subscribers
        const { data, error } = await resend.emails.send({
          from: process.env.WORKSHOP_NOTE_FROM_EMAIL || 'Candlefish Atelier <atelier@candlefish.ai>',
          to: subscribers,
          reply_to: process.env.WORKSHOP_NOTE_REPLY_TO || 'workshop@candlefish.ai',
          subject: `[Workshop Note] ${note.title}`,
          html: emailHtml,
          text: `${note.title}\n\n${note.excerpt}\n\nRead more: https://candlefish.ai/workshop-notes?note=${note.id}`,
          tags: [
            {
              name: 'category',
              value: 'workshop-note'
            },
            {
              name: 'note-id',
              value: note.id
            }
          ]
        });
        
        if (error) {
          console.error(`Failed to send email for note ${note.id}:`, error);
          results.push({ noteId: note.id, success: false, error: error.message });
        } else {
          // Mark note as sent
          sentNotes[note.id] = {
            sentAt: new Date().toISOString(),
            emailId: data.id,
            subscriberCount: subscribers.length
          };
          results.push({ noteId: note.id, success: true, emailId: data.id });
        }
      } catch (error) {
        console.error(`Error processing note ${note.id}:`, error);
        results.push({ noteId: note.id, success: false, error: error.message });
      }
    }
    
    // Save updated sent notes
    await saveSentNotes(sentNotes);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Workshop note emails processed',
        results,
        totalNotes: newNotes.length,
        totalSubscribers: subscribers.length
      })
    };
    
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to process workshop notes',
        details: error.message 
      })
    };
  }
};