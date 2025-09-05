const { Resend } = require('resend');

// Rate limiting storage (in-memory for simplicity)
const rateLimitMap = new Map();

// Allowed origins for CORS
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['https://candlefish.ai', 'https://www.candlefish.ai', 'https://test.candlefish.ai'];

// Rate limiting function
function rateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 5; // Allow 5 requests per minute per IP

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
    .substring(0, 2000); // Limit length
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
    const name = sanitizeInput(data.name);
    const email = sanitizeInput(data.email);
    const company = sanitizeInput(data.company);
    const type = sanitizeInput(data.type);
    const message = sanitizeInput(data.message);

    // Validate required fields
    if (!name || !email || !message || !type) {
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'All fields except company are required'
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

    // Create email content
    const emailContent = `
New Contact Form Submission

Contact Information:
- Name: ${name}
- Email: ${email}
- Company: ${company || 'Not provided'}
- Inquiry Type: ${type}

Message:
${message}

Submitted: ${new Date().toISOString()}
    `.trim();

    // Send email notification to hello@candlefish.ai
    try {
      // Only try to send email if RESEND_API_KEY is configured
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey &&
          apiKey !== 're_placeholder_key_change_this') {

        const resend = new Resend(apiKey);

        const emailResult = await resend.emails.send({
          from: 'Candlefish Contact <contact@candlefish.ai>',
          to: ['hello@candlefish.ai'],
          subject: `[${type}] Contact from ${name}${company ? ` - ${company}` : ''}`,
          text: emailContent,
          replyTo: email,
        });

        // Log success without sensitive details
        console.log('Contact form processed:', {
          timestamp: new Date().toISOString(),
          name,
          company,
          type,
          success: true
        });

      } else {
        // Log request without sending email (for development)
        if (process.env.NODE_ENV !== 'production') {
          console.log('Email service not configured - request logged only');
          console.log('Contact form submission:', {
            timestamp: new Date().toISOString(),
            name,
            email,
            company,
            type,
            message
          });
        }
      }
    } catch (emailError) {
      // Log error without exposing details
      console.error('Email service error:', {
        timestamp: new Date().toISOString(),
        type: 'email_failure'
      });
      // Don't fail the request if email fails
    }

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        message: 'Your message has been received. We\'ll respond within 24 hours.'
      }),
    };

  } catch (error) {
    // Log error without exposing sensitive details
    console.error('Request processing error:', {
      timestamp: new Date().toISOString(),
      type: 'processing_error'
    });

    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Failed to process request. Please try again.'
      }),
    };
  }
};
