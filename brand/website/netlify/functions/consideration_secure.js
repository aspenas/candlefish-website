const { Resend } = require('resend');

// Rate limiting storage (in-memory for simplicity)
const rateLimitMap = new Map();

// Allowed origins for CORS
const ALLOWED_ORIGINS = undefined
  ? undefined.split(',')
  : ['https://candlefish.ai', 'https://www.candlefish.ai'];

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
    .substring(0, 1000); // Limit length
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
    const yearsInOperation = sanitizeInput(data.yearsInOperation);
    const operationalChallenge = sanitizeInput(data.operationalChallenge);
    const manualHours = sanitizeInput(data.manualHours);
    const investmentRange = sanitizeInput(data.investmentRange);
    const name = sanitizeInput(data.name);
    const role = sanitizeInput(data.role);
    const email = sanitizeInput(data.email);
    const company = sanitizeInput(data.company);

    // Validate required fields
    if (!yearsInOperation || !operationalChallenge || !manualHours ||
        !investmentRange || !name || !role || !email || !company) {
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'All fields are required'
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

    // Validate numeric fields
    const years = parseInt(yearsInOperation);
    const hours = parseInt(manualHours);

    if (isNaN(years) || years < 1 || years > 100) {
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Years in operation must be between 1 and 100'
        }),
      };
    }

    if (isNaN(hours) || hours < 1 || hours > 168) {
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Manual hours must be between 1 and 168'
        }),
      };
    }

    // Create email content
    const emailContent = `
New Consideration Request Received

Contact Information:
- Name: ${name}
- Role: ${role}
- Email: ${email}
- Company: ${company}

Operational Context:
- Years in Operation: ${years}
- Manual Hours/Week: ${hours}
- Investment Range: ${investmentRange}

Operational Challenge:
${operationalChallenge}

Submitted: ${new Date().toISOString()}
    `.trim();

    // Send email notification to hello@candlefish.ai
    try {
      // Only try to send email if RESEND_API_KEY is configured
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey &&
          apiKey !== 're_placeholder_key_change_this') {

        // Don't log API key information in production
        if (process.env.NODE_ENV !== 'production') {
          console.log('Attempting to send email with Resend API...');
        }

        const resend = new Resend(apiKey);

        const emailResult = await resend.emails.send({
          from: 'Candlefish <hello@candlefish.ai>',
          to: ['hello@candlefish.ai'],
          subject: `[Consideration Request] ${company} - ${name}`,
          text: emailContent,
          replyTo: email,
        });

        // Log success without sensitive details
        console.log('Consideration request processed:', {
          timestamp: new Date().toISOString(),
          company,
          success: true
        });

      } else {
        // Log request without sending email (for development)
        if ('production' !== 'production') {
          console.log('Email service not configured - request logged only');
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

    // Mock queue position calculation
    const currentQueueLength = 7;
    const newPosition = currentQueueLength + 1;

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        message: 'Your consideration request has been received.',
        queuePosition: newPosition,
        expectedConsideration: 'January-February 2026'
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
