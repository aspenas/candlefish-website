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
  const maxRequests = 3; // Allow 3 requests per minute per IP (more restrictive for consultations)

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
    const role = sanitizeInput(data.role);
    const phone = sanitizeInput(data.phone);
    const preferredTime = sanitizeInput(data.preferredTime);
    const message = sanitizeInput(data.message);
    const sessionId = sanitizeInput(data.sessionId);
    const score = data.score; // This is an object, don't sanitize

    // Validate required fields
    if (!name || !email || !company || !role || !sessionId) {
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Name, email, company, role, and session ID are required'
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

    // Create email content for the admin notification
    const adminEmailContent = `
New Consultation Request from Maturity Assessment

Contact Information:
- Name: ${name}
- Email: ${email}
- Company: ${company}
- Role: ${role}
- Phone: ${phone || 'Not provided'}
- Preferred Time: ${preferredTime || 'Not specified'}

Assessment Results:
- Session ID: ${sessionId}
- Maturity Level: ${score?.level || 'Unknown'}
- Score: ${score?.percentage || 'N/A'}%
- Percentile: ${score?.percentile || 'N/A'}
- Candlefish Fit: ${score?.candlefishFit?.qualified ? 'Qualified' : 'Not qualified'}

Discussion Areas:
${message || 'Not specified'}

Submitted: ${new Date().toISOString()}
    `.trim();

    // Create confirmation email content for the user
    const userEmailContent = `
Dear ${name},

Thank you for requesting a consultation following your Operational Maturity Assessment.

Your Request Details:
- Assessment Session: ${sessionId}
- Maturity Level: ${score?.level || 'Unknown'}
- Company: ${company}
- Your Role: ${role}

What happens next:
• We'll review your assessment results in detail
• Someone from our team will contact you within 24 hours
• We'll schedule a 45-minute consultation call at your convenience
• Together, we'll discuss specific intervention strategies for your ${score?.level ? score.level.split(':')[1].toLowerCase() : ''} operations

No sales pressure - just operational truth. We're here to help you transform your operations into systematic excellence.

Best regards,
The Candlefish Team
hello@candlefish.ai

---
Reference Number: ${sessionId}
    `.trim();

    // Send emails
    try {
      // Only try to send email if RESEND_API_KEY is configured
      if (process.env.RESEND_API_KEY &&
          process.env.RESEND_API_KEY !== 're_placeholder_key_change_this') {

        const resend = new Resend(process.env.RESEND_API_KEY);

        // Send admin notification
        const adminEmailResult = await resend.emails.send({
          from: 'Candlefish Assessment <assessment@candlefish.ai>',
          to: ['hello@candlefish.ai'],
          subject: `[Consultation Request] ${company} - ${name} (${score?.level || 'Assessment Complete'})`,
          text: adminEmailContent,
          replyTo: email,
        });

        // Send user confirmation
        const userEmailResult = await resend.emails.send({
          from: 'Candlefish Team <hello@candlefish.ai>',
          to: [email],
          subject: 'Consultation Request Received - Candlefish',
          text: userEmailContent,
          replyTo: 'hello@candlefish.ai',
        });

        // Log success without sensitive details
        console.log('Consultation request processed:', {
          timestamp: new Date().toISOString(),
          sessionId,
          name,
          company,
          score: score?.level,
          qualified: score?.candlefishFit?.qualified,
          adminEmailSent: !!adminEmailResult.data?.id,
          userEmailSent: !!userEmailResult.data?.id,
          success: true
        });

      } else {
        // Log request without sending email (for development)
        console.log('Email service not configured - request logged only');
        console.log('Consultation request submission:', {
          timestamp: new Date().toISOString(),
          sessionId,
          name,
          email,
          company,
          role,
          score
        });
      }
    } catch (emailError) {
      // Log error without exposing details
      console.error('Email service error:', {
        timestamp: new Date().toISOString(),
        sessionId,
        type: 'consultation_email_failure',
        error: emailError.message
      });
      // Don't fail the request if email fails - the form submission should still succeed
    }

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        message: 'Consultation request received. We\'ll respond within 24 hours.',
        sessionId
      }),
    };

  } catch (error) {
    // Log error without exposing sensitive details
    console.error('Consultation request processing error:', {
      timestamp: new Date().toISOString(),
      type: 'consultation_processing_error'
    });

    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Failed to process consultation request. Please try again.'
      }),
    };
  }
};
