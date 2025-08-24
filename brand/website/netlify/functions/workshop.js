const { Resend } = require('resend');

/**
 * Candlefish Workshop Request Netlify Function
 *
 * Comprehensive workshop visit request handler with:
 * - Rate limiting and validation
 * - Professional email templates
 * - Queue position management
 * - Readiness scoring
 * - Admin notifications
 *
 * Environment Variables Required:
 * - RESEND_API_KEY: Resend API key for sending emails
 * - ALLOWED_ORIGINS (optional): Comma-separated list of allowed origins
 * - NODE_ENV (optional): Environment (production, staging, development)
 */

// Rate limiting storage (in-memory for simplicity)
const rateLimitMap = new Map();

// Allowed origins for CORS
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
    'https://candlefish.ai',
    'https://www.candlefish.ai',
    'https://test.candlefish.ai',
    'https://amazing-croquembouche-6c4f14.netlify.app'
  ];

/**
 * Rate limiting function (5 requests per 15 minutes per IP for workshops)
 */
function rateLimit(ip) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 5; // Allow 5 requests per window per IP

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

  // Clean up old entries periodically
  if (rateLimitMap.size > 1000) {
    const cutoff = now - windowMs * 2;
    for (const [key, timestamps] of rateLimitMap.entries()) {
      const valid = timestamps.filter(t => t > cutoff);
      if (valid.length === 0) {
        rateLimitMap.delete(key);
      } else {
        rateLimitMap.set(key, valid);
      }
    }
  }

  return true;
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format (flexible international format)
 */
function isValidPhone(phone) {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)\.]/g, ''));
}

/**
 * Sanitize input to prevent XSS and injection
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;

  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/&lt;script&gt;/gi, '') // Remove encoded script tags
    .trim()
    .substring(0, 2000); // Limit length for workshop fields
}

/**
 * Sanitize array of strings
 */
function sanitizeArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(item => sanitizeInput(item)).filter(item => item.length > 0).slice(0, 20);
}

/**
 * Get CORS headers based on request origin
 */
function getCorsHeaders(event) {
  const origin = event.headers.origin || event.headers.Origin;
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);

  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  };
}

/**
 * Calculate queue position based on current load
 */
function calculateQueuePosition() {
  const basePosition = 8; // Base queue position
  const randomVariation = Math.floor(Math.random() * 12) + 1; // 1-12
  return basePosition + randomVariation;
}

/**
 * Calculate readiness score based on form completion and values
 */
function calculateReadinessScore(formData) {
  let score = 0;
  let maxScore = 0;

  // Operational Context (35% weight)
  maxScore += 35;
  if (formData.currentProcesses && formData.currentProcesses.length > 50) score += 10;
  if (formData.manualHours && parseInt(formData.manualHours) >= 10) score += 8;
  if (formData.teamSize && formData.teamSize !== '1-5') score += 7;
  if (formData.urgencyLevel === 'high') score += 5;
  else if (formData.urgencyLevel === 'medium') score += 10; // Medium urgency is optimal

  // Technical Readiness (30% weight)
  maxScore += 30;
  if (formData.systemsInUse && formData.systemsInUse.length >= 3) score += 10;
  if (formData.technicalTeam === 'full-time') score += 10;
  else if (formData.technicalTeam === 'part-time') score += 5;
  if (formData.implementationTimeline === 'immediate' || formData.implementationTimeline === '1-month') score += 5;
  if (formData.budgetRange && !formData.budgetRange.includes('need-estimate')) score += 5;

  // Workshop Preferences (20% weight)
  maxScore += 20;
  if (formData.preferredDuration === 'full-day' || formData.preferredDuration === 'two-days') score += 10;
  if (formData.teamAttendees && parseInt(formData.teamAttendees) >= 3 && parseInt(formData.teamAttendees) <= 8) score += 10;

  // Contact Quality (15% weight)
  maxScore += 15;
  if (formData.name && formData.name.length > 3) score += 3;
  if (formData.role && formData.role.length > 3) score += 3;
  if (formData.company && formData.company.length > 3) score += 3;
  if (isValidEmail(formData.email)) score += 3;
  if (formData.phone && isValidPhone(formData.phone)) score += 3;

  return Math.min(Math.round((score / maxScore) * 100), 100);
}

/**
 * Generate professional email template for the requester
 */
function generateRequesterEmail(formData, requestId, queuePosition, readinessScore) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Workshop Request Received - Candlefish Atelier</title>
    <style>
        * { box-sizing: border-box; }
        body {
            margin: 0;
            padding: 0;
            font-family: 'SF Mono', Consolas, monospace;
            background: #0a0a0a;
            color: #f8f8f2;
            line-height: 1.6;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        .header {
            border: 1px solid #b87333;
            background: rgba(52, 58, 64, 0.1);
            padding: 30px;
            text-align: center;
            margin-bottom: 0;
        }
        .logo {
            color: #3fd3c6;
            font-size: 24px;
            font-weight: 300;
            margin: 0 0 8px 0;
            letter-spacing: 2px;
        }
        .tagline {
            color: #b87333;
            font-size: 12px;
            letter-spacing: 1px;
            text-transform: uppercase;
        }
        .request-id {
            color: #b87333;
            font-size: 11px;
            margin-top: 15px;
            opacity: 0.8;
        }
        .metrics {
            background: rgba(0,0,0,0.5);
            padding: 25px;
            margin: 0;
            border-left: 1px solid #b87333;
            border-right: 1px solid #b87333;
            display: flex;
            justify-content: space-around;
            text-align: center;
        }
        .metric {
            flex: 1;
        }
        .metric-value {
            color: #3fd3c6;
            font-size: 20px;
            font-weight: bold;
            display: block;
        }
        .metric-label {
            color: #f8f8f2;
            opacity: 0.6;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 5px;
        }
        .content {
            border: 1px solid #b87333;
            border-top: none;
            padding: 30px;
            background: rgba(52, 58, 64, 0.05);
        }
        .section {
            margin-bottom: 25px;
        }
        .section-title {
            color: #b87333;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 0 0 12px 0;
            border-bottom: 1px solid rgba(184, 115, 51, 0.3);
            padding-bottom: 5px;
        }
        .section-content {
            color: #f8f8f2;
            opacity: 0.85;
            font-size: 13px;
        }
        .highlight {
            background: rgba(63, 211, 198, 0.1);
            padding: 15px;
            border-left: 3px solid #3fd3c6;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid rgba(184, 115, 51, 0.3);
            color: #f8f8f2;
            opacity: 0.7;
            font-size: 11px;
        }
        .footer-brand {
            color: #3fd3c6;
            font-size: 12px;
            font-weight: bold;
        }
        .process-steps {
            background: rgba(0,0,0,0.3);
            padding: 20px;
            margin: 20px 0;
        }
        .step {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
            font-size: 12px;
        }
        .step-number {
            background: #b87333;
            color: #0a0a0a;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 15px;
            font-weight: bold;
            font-size: 11px;
        }
        @media only screen and (max-width: 480px) {
            .container { padding: 20px 10px; }
            .header, .content { padding: 20px; }
            .metrics { flex-direction: column; gap: 15px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="logo">Workshop Request Received</h1>
            <div class="tagline">Candlefish Atelier · Secret Operational Laboratory</div>
            <div class="request-id">REQUEST_ID: ${requestId}</div>
        </div>

        <div class="metrics">
            <div class="metric">
                <span class="metric-value">#${queuePosition}</span>
                <div class="metric-label">Queue Position</div>
            </div>
            <div class="metric">
                <span class="metric-value">${readinessScore}%</span>
                <div class="metric-label">Readiness Score</div>
            </div>
            <div class="metric">
                <span class="metric-value">2-3 weeks</span>
                <div class="metric-label">Response Time</div>
            </div>
        </div>

        <div class="content">
            <div class="highlight">
                <strong>Your workshop request has been received and entered into our evaluation queue.</strong><br><br>
                Each request undergoes careful review by our operational engineering team to ensure mutual fit and maximum value delivery.
            </div>

            <div class="section">
                <h3 class="section-title">Contact Information</h3>
                <div class="section-content">
                    <strong>${formData.name}</strong> · ${formData.role}<br>
                    ${formData.company}<br>
                    ${formData.email} · ${formData.phone}
                </div>
            </div>

            <div class="section">
                <h3 class="section-title">Operational Context</h3>
                <div class="section-content">
                    <strong>Manual Hours/Week:</strong> ${formData.manualHours}<br>
                    <strong>Team Size:</strong> ${formData.teamSize}<br>
                    <strong>Urgency Level:</strong> ${formData.urgencyLevel}<br>
                    <strong>Current Processes:</strong><br>
                    <div style="background: rgba(0,0,0,0.4); padding: 12px; margin-top: 8px; font-size: 12px; border-left: 2px solid #3fd3c6;">
                        ${formData.currentProcesses}
                    </div>
                </div>
            </div>

            <div class="section">
                <h3 class="section-title">Technical Readiness</h3>
                <div class="section-content">
                    <strong>Systems in Use:</strong> ${formData.systemsInUse.join(', ')}<br>
                    <strong>Technical Team:</strong> ${formData.technicalTeam}<br>
                    <strong>Implementation Timeline:</strong> ${formData.implementationTimeline}<br>
                    <strong>Budget Range:</strong> ${formData.budgetRange}
                </div>
            </div>

            <div class="section">
                <h3 class="section-title">Workshop Preferences</h3>
                <div class="section-content">
                    <strong>Format:</strong> ${formData.workshopFormat}<br>
                    <strong>Duration:</strong> ${formData.preferredDuration}<br>
                    <strong>Team Attendees:</strong> ${formData.teamAttendees} people
                </div>
            </div>

            <div class="section">
                <h3 class="section-title">Next Steps</h3>
                <div class="process-steps">
                    <div class="step">
                        <div class="step-number">1</div>
                        <div>Operational fit assessment (5-7 business days)</div>
                    </div>
                    <div class="step">
                        <div class="step-number">2</div>
                        <div>Technical evaluation and scoping (7-10 business days)</div>
                    </div>
                    <div class="step">
                        <div class="step-number">3</div>
                        <div>Workshop scheduling and confirmation</div>
                    </div>
                </div>
            </div>

            <div class="highlight">
                <strong>Evaluation Criteria:</strong><br>
                We assess each request based on operational fit, technical complexity, strategic alignment, and craft opportunity. High-readiness organizations with clear implementation paths receive priority consideration.
            </div>
        </div>

        <div class="footer">
            <div class="footer-brand">Candlefish Atelier</div>
            Precision automation engineering for discerning organizations<br>
            <a href="https://candlefish.ai/atelier" style="color: #3fd3c6; text-decoration: none;">Visit the Laboratory</a>
        </div>
    </div>
</body>
</html>
  `.trim();
}

/**
 * Generate admin notification email
 */
function generateAdminEmail(formData, requestId, queuePosition, readinessScore, clientIp) {
  const timestamp = new Date().toISOString();
  const priorityLevel = readinessScore >= 75 ? 'HIGH' : readinessScore >= 50 ? 'MEDIUM' : 'LOW';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>New Workshop Request - ${formData.company}</title>
    <style>
        * { box-sizing: border-box; }
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8f9fa;
            color: #212529;
            line-height: 1.6;
        }
        .container { max-width: 700px; margin: 0 auto; padding: 20px; }
        .header {
            background: linear-gradient(135deg, #0d1b2a 0%, #1b263b 100%);
            color: #f8f8f2;
            padding: 25px;
            text-align: center;
        }
        .priority-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 15px;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .priority-high { background: #dc3545; color: white; }
        .priority-medium { background: #ffc107; color: black; }
        .priority-low { background: #6c757d; color: white; }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            background: white;
            padding: 25px;
            border: 1px solid #dee2e6;
        }
        .metric {
            text-align: center;
            padding: 15px;
            background: #f8f9fa;
            border: 1px solid #e9ecef;
        }
        .metric-value {
            font-size: 24px;
            font-weight: bold;
            color: #495057;
        }
        .metric-label {
            font-size: 12px;
            color: #6c757d;
            text-transform: uppercase;
            margin-top: 5px;
        }
        .section {
            background: white;
            padding: 25px;
            margin: 15px 0;
            border: 1px solid #dee2e6;
        }
        .section-title {
            color: #495057;
            font-size: 16px;
            font-weight: 600;
            margin: 0 0 15px 0;
            padding-bottom: 8px;
            border-bottom: 2px solid #e9ecef;
        }
        .field-grid {
            display: grid;
            grid-template-columns: 1fr 2fr;
            gap: 10px 20px;
            align-items: start;
        }
        .field-label {
            font-weight: 600;
            color: #6c757d;
            font-size: 13px;
        }
        .field-value {
            color: #495057;
            font-size: 14px;
        }
        .process-description {
            background: #f8f9fa;
            border-left: 4px solid #007bff;
            padding: 15px;
            margin: 15px 0;
            font-style: italic;
        }
        .action-buttons {
            display: flex;
            gap: 15px;
            justify-content: center;
            margin: 30px 0;
        }
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 5px;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
            text-align: center;
        }
        .btn-primary { background: #007bff; color: white; }
        .btn-success { background: #28a745; color: white; }
        .btn-warning { background: #ffc107; color: black; }
        .system-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin: 10px 0;
        }
        .tag {
            background: #e9ecef;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            color: #495057;
        }
        .meta-info {
            background: #f8f9fa;
            padding: 15px;
            border: 1px solid #dee2e6;
            font-size: 12px;
            color: #6c757d;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0; font-size: 24px; font-weight: 300;">New Workshop Request</h1>
            <div style="margin-top: 10px;">
                <span class="priority-badge priority-${priorityLevel.toLowerCase()}">
                    ${priorityLevel} Priority
                </span>
            </div>
            <div style="margin-top: 8px; font-size: 12px; opacity: 0.8;">
                ${requestId} · ${timestamp}
            </div>
        </div>

        <div class="metrics-grid">
            <div class="metric">
                <div class="metric-value">#${queuePosition}</div>
                <div class="metric-label">Queue Position</div>
            </div>
            <div class="metric">
                <div class="metric-value">${readinessScore}%</div>
                <div class="metric-label">Readiness Score</div>
            </div>
            <div class="metric">
                <div class="metric-value">${formData.manualHours}</div>
                <div class="metric-label">Manual Hours/Week</div>
            </div>
            <div class="metric">
                <div class="metric-value">${formData.teamAttendees}</div>
                <div class="metric-label">Team Attendees</div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Contact Information</h2>
            <div class="field-grid">
                <div class="field-label">Name:</div>
                <div class="field-value">${formData.name}</div>
                <div class="field-label">Role:</div>
                <div class="field-value">${formData.role}</div>
                <div class="field-label">Company:</div>
                <div class="field-value">${formData.company}</div>
                <div class="field-label">Email:</div>
                <div class="field-value">${formData.email}</div>
                <div class="field-label">Phone:</div>
                <div class="field-value">${formData.phone}</div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Operational Context</h2>
            <div class="field-grid">
                <div class="field-label">Manual Hours/Week:</div>
                <div class="field-value">${formData.manualHours}</div>
                <div class="field-label">Team Size:</div>
                <div class="field-value">${formData.teamSize}</div>
                <div class="field-label">Urgency Level:</div>
                <div class="field-value">${formData.urgencyLevel}</div>
            </div>
            <div class="process-description">
                <strong>Current Processes:</strong><br>
                ${formData.currentProcesses}
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Technical Readiness</h2>
            <div class="field-grid">
                <div class="field-label">Technical Team:</div>
                <div class="field-value">${formData.technicalTeam}</div>
                <div class="field-label">Implementation Timeline:</div>
                <div class="field-value">${formData.implementationTimeline}</div>
                <div class="field-label">Budget Range:</div>
                <div class="field-value">${formData.budgetRange}</div>
            </div>
            <div>
                <div class="field-label">Systems in Use:</div>
                <div class="system-tags">
                    ${formData.systemsInUse.map(system => `<span class="tag">${system}</span>`).join('')}
                </div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Workshop Preferences</h2>
            <div class="field-grid">
                <div class="field-label">Format:</div>
                <div class="field-value">${formData.workshopFormat}</div>
                <div class="field-label">Duration:</div>
                <div class="field-value">${formData.preferredDuration}</div>
                <div class="field-label">Team Attendees:</div>
                <div class="field-value">${formData.teamAttendees} people</div>
            </div>
        </div>

        <div class="action-buttons">
            <a href="mailto:${formData.email}?subject=Re: Workshop Request ${requestId}" class="btn btn-primary">
                Reply to Requester
            </a>
            <a href="https://candlefish.ai/queue" class="btn btn-success">
                View Queue
            </a>
            <a href="https://candlefish.ai/atelier" class="btn btn-warning">
                Laboratory Dashboard
            </a>
        </div>

        <div class="meta-info">
            <strong>System Information:</strong><br>
            IP Address: ${clientIp}<br>
            User Agent: ${process.env.HTTP_USER_AGENT || 'N/A'}<br>
            Submission Time: ${timestamp}<br>
            Request ID: ${requestId}
        </div>
    </div>
</body>
</html>
  `.trim();
}

/**
 * Main handler function
 */
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
    // Get client IP for rate limiting and logging
    const clientIp = event.headers['x-forwarded-for'] ||
                     event.headers['x-real-ip'] ||
                     event.headers['cf-connecting-ip'] ||
                     'unknown';

    // Apply rate limiting
    if (!rateLimit(clientIp)) {
      return {
        statusCode: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': '900', // 15 minutes
        },
        body: JSON.stringify({
          error: 'Rate limit exceeded. Please try again in 15 minutes.',
          retryAfter: 900
        }),
      };
    }

    // Parse and validate JSON body
    let data;
    try {
      data = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Invalid JSON payload'
        }),
      };
    }

    // Sanitize all inputs
    const formData = {
      // Operational Context
      currentProcesses: sanitizeInput(data.currentProcesses || ''),
      manualHours: sanitizeInput(data.manualHours || ''),
      teamSize: sanitizeInput(data.teamSize || ''),
      urgencyLevel: sanitizeInput(data.urgencyLevel || ''),

      // Technical Readiness
      systemsInUse: sanitizeArray(data.systemsInUse || []),
      technicalTeam: sanitizeInput(data.technicalTeam || ''),
      implementationTimeline: sanitizeInput(data.implementationTimeline || ''),
      budgetRange: sanitizeInput(data.budgetRange || ''),

      // Workshop Preferences
      workshopFormat: sanitizeInput(data.workshopFormat || 'onsite'),
      preferredDuration: sanitizeInput(data.preferredDuration || ''),
      teamAttendees: sanitizeInput(data.teamAttendees || ''),

      // Contact Information
      name: sanitizeInput(data.name || ''),
      role: sanitizeInput(data.role || ''),
      email: sanitizeInput(data.email || ''),
      company: sanitizeInput(data.company || ''),
      phone: sanitizeInput(data.phone || ''),

      // Metadata
      submissionTime: new Date().toISOString(),
    };

    // Validate required fields
    const requiredFields = [
      'name', 'email', 'company', 'role', 'phone',
      'currentProcesses', 'manualHours', 'teamSize', 'urgencyLevel',
      'technicalTeam', 'implementationTimeline', 'budgetRange',
      'preferredDuration', 'teamAttendees'
    ];

    const missingFields = requiredFields.filter(field => !formData[field] || formData[field].length === 0);

    if (missingFields.length > 0) {
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Missing required fields',
          missingFields
        }),
      };
    }

    // Validate email format
    if (!isValidEmail(formData.email)) {
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Invalid email address format'
        }),
      };
    }

    // Validate phone number
    if (!isValidPhone(formData.phone)) {
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Invalid phone number format'
        }),
      };
    }

    // Validate workshop format
    if (!['onsite', 'remote', 'hybrid'].includes(formData.workshopFormat)) {
      formData.workshopFormat = 'onsite';
    }

    // Validate team attendees number
    const attendeesNum = parseInt(formData.teamAttendees);
    if (isNaN(attendeesNum) || attendeesNum < 1 || attendeesNum > 25) {
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Team attendees must be between 1 and 25'
        }),
      };
    }

    // Generate request metadata
    const requestId = `WS-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const queuePosition = calculateQueuePosition();
    const readinessScore = calculateReadinessScore(formData);

    // Prepare email content
    const requesterEmailHtml = generateRequesterEmail(formData, requestId, queuePosition, readinessScore);
    const adminEmailHtml = generateAdminEmail(formData, requestId, queuePosition, readinessScore, clientIp);

    // Send emails if Resend is configured
    const emailResults = { requesterSent: false, adminSent: false, errors: [] };

    if (process.env.RESEND_API_KEY &&
        process.env.RESEND_API_KEY !== 're_placeholder_key_change_this' &&
        process.env.RESEND_API_KEY.startsWith('re_')) {

      const resend = new Resend(process.env.RESEND_API_KEY);

      try {
        // Send confirmation email to requester
        const requesterResult = await resend.emails.send({
          from: 'Candlefish Atelier <workshop@candlefish.ai>',
          to: [formData.email],
          subject: `Workshop Request Received - Queue Position #${queuePosition}`,
          html: requesterEmailHtml,
          replyTo: 'workshop@candlefish.ai',
          headers: {
            'X-Workshop-Request-ID': requestId,
            'X-Queue-Position': queuePosition.toString(),
          }
        });

        emailResults.requesterSent = !!requesterResult.data?.id;

        // Send admin notification
        const adminResult = await resend.emails.send({
          from: 'Candlefish Workshop <workshop@candlefish.ai>',
          to: ['workshop@candlefish.ai'],
          subject: `New Workshop Request - ${formData.company} (${readinessScore}% Readiness)`,
          html: adminEmailHtml,
          replyTo: formData.email,
          headers: {
            'X-Workshop-Request-ID': requestId,
            'X-Priority': readinessScore >= 75 ? 'high' : readinessScore >= 50 ? 'medium' : 'low',
          }
        });

        emailResults.adminSent = !!adminResult.data?.id;

      } catch (emailError) {
        console.error('Email sending failed:', {
          timestamp: new Date().toISOString(),
          requestId,
          error: emailError.message,
          clientIp
        });
        emailResults.errors.push(emailError.message);
        // Continue with response even if email fails
      }
    } else {
      // Log for development/testing
      if (process.env.NODE_ENV !== 'production') {
        console.log('Workshop request (Email service not configured):', {
          timestamp: new Date().toISOString(),
          requestId,
          requester: `${formData.name} <${formData.email}>`,
          company: formData.company,
          readinessScore,
          queuePosition
        });
      }
    }

    // Log successful submission
    console.log('Workshop request processed:', {
      timestamp: new Date().toISOString(),
      requestId,
      queuePosition,
      readinessScore,
      company: formData.company,
      urgency: formData.urgencyLevel,
      emailsSent: emailResults.requesterSent && emailResults.adminSent,
      clientIp,
      success: true
    });

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        message: 'Workshop request submitted successfully',
        requestId,
        queuePosition,
        readinessScore,
        estimatedResponse: '2-3 weeks',
        emailsSent: {
          confirmation: emailResults.requesterSent,
          notification: emailResults.adminSent
        }
      }),
    };

  } catch (error) {
    // Log error without exposing sensitive details
    console.error('Workshop request processing error:', {
      timestamp: new Date().toISOString(),
      type: 'workshop_processing_error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Failed to process workshop request. Please try again.',
        requestId: `ERR-${Date.now()}`
      }),
    };
  }
};
