const { Resend } = require('resend');

/**
 * Candlefish Newsletter Subscription Netlify Function
 *
 * Environment Variables Required:
 * - RESEND_API_KEY: Resend API key for sending emails
 * - RESEND_AUDIENCE_ID (optional): Resend audience ID to add subscribers to
 * - ALLOWED_ORIGINS (optional): Comma-separated list of allowed origins
 *
 * Features:
 * - Rate limiting (2 requests per minute per IP)
 * - Email validation and sanitization
 * - CORS support
 * - Welcome email to subscriber
 * - Admin notification email
 * - Automatic audience management (if configured)
 *
 * Usage:
 * POST /.netlify/functions/newsletter
 * Content-Type: application/json
 * Body: { email, firstName?, source?, interests? }
 */

// Rate limiting storage (in-memory for simplicity)
const rateLimitMap = new Map();

// Allowed origins for CORS
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['https://candlefish.ai', 'https://www.candlefish.ai', 'https://test.candlefish.ai'];

// Rate limiting function (more restrictive for newsletter to prevent spam)
function rateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 2; // Allow 2 requests per minute per IP

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

// Validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Sanitize input to prevent XSS
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;

  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim()
    .substring(0, 500); // Limit length for newsletter fields
}

// Get CORS headers based on request origin
function getCorsHeaders(event) {
  const origin = event.headers.origin || event.headers.Origin;
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);

  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY'
  };
}

exports.handler = async (event, context) => {
  const corsHeaders = getCorsHeaders(event);

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
    // Get client IP for rate limiting
    const ip = event.headers['x-forwarded-for'] ||
               event.headers['x-real-ip'] ||
               'unknown';

    // Apply rate limiting
    if (!rateLimit(ip)) {
      return {
        statusCode: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': '60',
        },
        body: JSON.stringify({
          error: 'Too many requests. Please try again later.'
        }),
      };
    }

    const data = JSON.parse(event.body);

    // Sanitize all inputs
    const email = sanitizeInput(data.email);
    const firstName = sanitizeInput(data.firstName || '');
    const source = sanitizeInput(data.source || 'website');
    const interests = Array.isArray(data.interests) ? data.interests.slice(0, 10) : [];

    // Validate required fields
    if (!email) {
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Email address is required'
        }),
      };
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Invalid email address'
        }),
      };
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Create welcome email content
    const welcomeEmailContent = `
Dear ${firstName || 'Friend'},

Welcome to Candlefish's operational insights newsletter!

You're now subscribed to receive:
• Weekly automation strategies and case studies
• Real-world AI implementation insights
• Operational excellence best practices
• Behind-the-scenes looks at our current projects

We believe in operational systems that outlive their creators - and we're excited to share that journey with you.

Your first insight will arrive within the next week.

Best regards,
The Candlefish Team
hello@candlefish.ai

---
Subscription Details:
- Email: ${normalizedEmail}
- Source: ${source}
- Interests: ${interests.join(', ') || 'General automation insights'}
- Subscribed: ${new Date().toISOString()}

You can unsubscribe at any time by replying to any newsletter email.
    `.trim();

    // Create admin notification content
    const adminEmailContent = `
New Newsletter Subscription

Contact Information:
- Email: ${normalizedEmail}
- First Name: ${firstName || 'Not provided'}
- Source: ${source}
- Interests: ${interests.join(', ') || 'None specified'}

Subscription Details:
- Timestamp: ${new Date().toISOString()}
- IP: ${ip}

Next Steps:
- Add to Resend audience if not already subscribed
- Welcome email sent automatically
    `.trim();

    // Send emails
    try {
      // Only try to send email if RESEND_API_KEY is configured
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey && apiKey !== 're_placeholder_key_change_this') {

        const resend = new Resend(apiKey);

        // Send welcome email to subscriber
        const welcomeEmailResult = await resend.emails.send({
          from: 'Candlefish Insights <insights@candlefish.ai>',
          to: [normalizedEmail],
          subject: 'Welcome to Candlefish Operational Insights',
          text: welcomeEmailContent,
          replyTo: 'hello@candlefish.ai',
        });

        // Send admin notification
        const adminEmailResult = await resend.emails.send({
          from: 'Candlefish Newsletter <newsletter@candlefish.ai>',
          to: ['hello@candlefish.ai'],
          subject: `[Newsletter] New subscription from ${normalizedEmail}`,
          text: adminEmailContent,
          replyTo: normalizedEmail,
        });

        // Add to Resend audience with double opt-in
        if (process.env.RESEND_AUDIENCE_ID) {
          try {
            // Check if double opt-in was requested
            const doubleOptIn = data.doubleOptIn === true;
            
            // Create contact in audience
            const { data: contactData, error: contactError } = await resend.contacts.create({
              audienceId: process.env.RESEND_AUDIENCE_ID,
              email: normalizedEmail,
              firstName: firstName || undefined,
              unsubscribed: false,
            });
            
            if (contactError) {
              if (contactError.message && contactError.message.includes('already exists')) {
                console.log('Contact already exists in audience');
              } else {
                throw contactError;
              }
            } else {
              console.log('Added contact to audience:', normalizedEmail);
              
              // Note: Double opt-in must be configured in Resend dashboard
              // The confirmation email will be sent automatically by Resend
              // if double opt-in is enabled for the audience
            }
          } catch (audienceError) {
            // Log but don't fail the request if audience addition fails
            console.log('Audience addition failed:', {
              timestamp: new Date().toISOString(),
              email: normalizedEmail,
              error: audienceError.message || 'audience_addition_failed'
            });
          }
        }

        // Log success without sensitive details
        console.log('Newsletter subscription processed:', {
          timestamp: new Date().toISOString(),
          source,
          firstName: !!firstName,
          interests: interests.length,
          welcomeEmailSent: !!welcomeEmailResult.data?.id,
          adminEmailSent: !!adminEmailResult.data?.id,
          success: true
        });

      } else {
        // Log request without sending email (for development)
        if (process.env.NODE_ENV !== 'production') {
          console.log('Email service not configured - request logged only');
          console.log('Newsletter subscription:', {
            timestamp: new Date().toISOString(),
            email: normalizedEmail,
            firstName,
            source,
            interests
          });
        }
      }
    } catch (emailError) {
      // Log error without exposing details
      console.error('Email service error:', {
        timestamp: new Date().toISOString(),
        type: 'newsletter_email_failure',
        error: emailError.message
      });
      // Don't fail the request if email fails - the subscription should still succeed
    }

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        message: 'Successfully subscribed to newsletter. Check your email for confirmation!'
      }),
    };

  } catch (error) {
    // Log error without exposing sensitive details
    console.error('Newsletter subscription processing error:', {
      timestamp: new Date().toISOString(),
      type: 'newsletter_processing_error'
    });

    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Failed to subscribe to newsletter. Please try again.'
      }),
    };
  }
};
