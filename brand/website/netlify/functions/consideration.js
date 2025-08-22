const { Resend } = require('resend');

// Rate limiting storage (in-memory for simplicity)
const rateLimitMap = new Map();

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

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  try {
    // Get client IP for rate limiting
    const ip = event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown';

    // Apply rate limiting
    if (!rateLimit(ip)) {
      return {
        statusCode: 429,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Too many requests. Please try again later.'
        }),
      };
    }

    const data = JSON.parse(event.body);
    const {
      yearsInOperation,
      operationalChallenge,
      manualHours,
      investmentRange,
      name,
      role,
      email,
      company
    } = data;

    // Validate required fields
    if (!yearsInOperation || !operationalChallenge || !manualHours || !investmentRange ||
        !name || !role || !email || !company) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
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
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Invalid email address'
        }),
      };
    }

    // Validate numeric fields
    const years = parseInt(yearsInOperation);
    const hours = parseInt(manualHours);

    if (isNaN(years) || years < 1) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Years in operation must be a valid number'
        }),
      };
    }

    if (isNaN(hours) || hours < 1) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Manual hours must be a valid number'
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
IP: ${ip}
    `.trim();

    // Send email notification to hello@candlefish.ai
    try {
      // Only try to send email if RESEND_API_KEY is configured
      if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_placeholder_key_change_this') {
        console.log('Attempting to send email with Resend API...');
        console.log('API Key present:', !!process.env.RESEND_API_KEY);
        console.log('API Key length:', process.env.RESEND_API_KEY?.length);
        console.log('API Key prefix:', process.env.RESEND_API_KEY?.substring(0, 10) + '...');

        const resend = new Resend(process.env.RESEND_API_KEY);

        const emailResult = await resend.emails.send({
          from: 'Candlefish <hello@candlefish.ai>',
          to: ['hello@candlefish.ai'],
          subject: `[Consideration Request] ${company} - ${name}`,
          text: emailContent,
          replyTo: email,
        });

        console.log('Email send result:', {
          success: !!emailResult.data?.id,
          emailId: emailResult.data?.id,
          error: emailResult.error,
          fullResult: JSON.stringify(emailResult)
        });

        console.log('Consideration request received and email sent:', {
          timestamp: new Date().toISOString(),
          name,
          email,
          company,
          yearsInOperation: years,
          manualHours: hours,
          investmentRange,
          ip,
          emailId: emailResult.data?.id,
          challenge: operationalChallenge.substring(0, 100) + '...' // Log preview only
        });
      } else {
        console.log('RESEND_API_KEY not configured - logging request without sending email:', {
          timestamp: new Date().toISOString(),
          name,
          email,
          company,
          yearsInOperation: years,
          manualHours: hours,
          investmentRange,
          ip,
          emailContent: emailContent
        });
      }
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Don't fail the request if email fails - log it and continue
      console.log('Consideration request logged despite email failure:', {
        timestamp: new Date().toISOString(),
        name,
        email,
        company,
        emailError: emailError.message
      });
    }

    // Mock queue position calculation
    const currentQueueLength = 7;
    const newPosition = currentQueueLength + 1;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        message: 'Your consideration request has been received.',
        queuePosition: newPosition,
        expectedConsideration: 'January-February 2026'
      }),
    };

  } catch (error) {
    console.error('Consideration request error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Failed to process consideration request. Please try again.'
      }),
    };
  }
};
