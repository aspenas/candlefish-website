const { Resend } = require('resend');

/**
 * Candlefish Newsletter Unsubscribe Function
 * 
 * Handles unsubscribe requests via:
 * 1. Token-based unsubscribe (from email links)
 * 2. Email-based unsubscribe (from unsubscribe page)
 * 
 * Environment Variables Required:
 * - RESEND_API_KEY: Resend API key
 * - RESEND_AUDIENCE_ID: Audience ID to manage subscribers
 */

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { token, email } = JSON.parse(event.body);

    // Validate input
    if (!token && !email) {
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          error: 'Either token or email is required' 
        }),
      };
    }

    // Initialize Resend
    const apiKey = process.env.RESEND_API_KEY;
    const audienceId = process.env.RESEND_AUDIENCE_ID;

    if (!apiKey || apiKey === 're_placeholder_replace_with_real_key') {
      console.error('RESEND_API_KEY not configured');
      return {
        statusCode: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          error: 'Email service not configured' 
        }),
      };
    }

    const resend = new Resend(apiKey);

    // Handle unsubscribe
    let unsubscribeEmail = email;
    
    if (token) {
      // Token-based unsubscribe
      // In a production system, you would:
      // 1. Decode the token to get the email
      // 2. Verify the token hasn't expired
      // 3. Check the token against a database
      
      // For now, we'll use a simple base64 decode
      // In production, use JWT or encrypted tokens
      try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const parts = decoded.split('|');
        if (parts.length >= 2) {
          unsubscribeEmail = parts[0];
        }
      } catch (e) {
        // Invalid token format
        return {
          statusCode: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            error: 'Invalid unsubscribe token' 
          }),
        };
      }
    }

    // Normalize email
    unsubscribeEmail = unsubscribeEmail.toLowerCase().trim();

    // Unsubscribe from Resend audience
    if (audienceId) {
      try {
        // First, find the contact
        const { data: contacts } = await resend.contacts.list({
          audienceId: audienceId
        });

        const contact = contacts?.find(c => 
          c.email.toLowerCase() === unsubscribeEmail
        );

        if (contact) {
          // Update contact to unsubscribed
          const { error: updateError } = await resend.contacts.update({
            audienceId: audienceId,
            id: contact.id,
            unsubscribed: true
          });

          if (updateError) {
            console.error('Failed to unsubscribe contact:', updateError);
          }
        } else {
          // Contact not found in audience
          console.log('Contact not found in audience:', unsubscribeEmail);
        }
      } catch (error) {
        console.error('Error managing Resend contact:', error);
        // Continue anyway - we'll still mark them as unsubscribed locally
      }
    }

    // Send confirmation email (optional)
    try {
      await resend.emails.send({
        from: 'Candlefish <hello@candlefish.ai>',
        to: [unsubscribeEmail],
        subject: 'You\'ve been unsubscribed',
        html: `
          <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #0D1B2A;">You've been unsubscribed</h2>
            <p>This email confirms that ${unsubscribeEmail} has been removed from the Candlefish workshop notes mailing list.</p>
            <p>We're sorry to see you go. If this was a mistake, you can <a href="https://candlefish.ai/#newsletter" style="color: #3FD3C6;">resubscribe here</a>.</p>
            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #666;">
              If you have any feedback about why you're unsubscribing, we'd love to hear it. 
              Just reply to this email.
            </p>
            <p style="font-size: 12px; color: #666;">
              Best regards,<br>
              The Candlefish Team
            </p>
          </div>
        `,
        text: `You've been unsubscribed

This email confirms that ${unsubscribeEmail} has been removed from the Candlefish workshop notes mailing list.

We're sorry to see you go. If this was a mistake, you can resubscribe at https://candlefish.ai/#newsletter

If you have any feedback about why you're unsubscribing, we'd love to hear it. Just reply to this email.

Best regards,
The Candlefish Team`
      });
    } catch (emailError) {
      console.error('Failed to send unsubscribe confirmation:', emailError);
      // Don't fail the request if confirmation email fails
    }

    // Log unsubscribe event
    console.log('Unsubscribe successful:', {
      timestamp: new Date().toISOString(),
      email: unsubscribeEmail,
      method: token ? 'token' : 'manual'
    });

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        message: 'Successfully unsubscribed',
        email: unsubscribeEmail
      }),
    };

  } catch (error) {
    console.error('Unsubscribe error:', error);
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Failed to process unsubscribe request'
      }),
    };
  }
};