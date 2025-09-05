const { Resend } = require('resend');

// Rate limiting storage (in-memory for simplicity)
const rateLimitMap = new Map();

// Allowed origins for CORS
const ALLOWED_ORIGINS = undefined
  ? undefined.split(',')
  : ['https://candlefish.ai', 'https://www.candlefish.ai', 'https://test.candlefish.ai'];

// Rate limiting function
function rateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 2; // Allow 2 requests per minute per IP (restrictive for analysis)

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
    .substring(0, 10000); // Allow longer text for business data
}

// Business automation analysis engine
function analyzeBusinessData(businessData) {
  const {
    industry,
    employeeCount,
    currentProcesses,
    painPoints,
    objectives,
    timeline,
    budget
  } = businessData;

  // Calculate automation readiness score
  const readinessFactors = {
    processDocumentation: currentProcesses?.length > 3 ? 25 : 10,
    teamSize: employeeCount > 50 ? 20 : employeeCount > 10 ? 15 : 10,
    painPointClarity: painPoints?.length > 2 ? 20 : 10,
    objectiveClarity: objectives?.length > 1 ? 20 : 10,
    timelineRealism: timeline === 'immediate' ? 5 : timeline === '3-6-months' ? 15 : 10,
    budgetRealism: budget === 'enterprise' ? 20 : budget === 'mid-market' ? 15 : 10
  };

  const totalScore = Object.values(readinessFactors).reduce((sum, score) => sum + score, 0);
  const readinessLevel = totalScore >= 80 ? 'high' : totalScore >= 60 ? 'medium' : 'low';

  // Generate specific recommendations
  const recommendations = generateRecommendations({
    industry,
    employeeCount,
    currentProcesses,
    painPoints,
    readinessLevel,
    totalScore
  });

  // Calculate ROI potential
  const roiProjection = calculateROIProjection({
    employeeCount,
    painPoints,
    industry,
    readinessLevel
  });

  return {
    readinessScore: totalScore,
    readinessLevel,
    readinessFactors,
    recommendations,
    roiProjection,
    nextSteps: generateNextSteps(readinessLevel, recommendations),
    timestamp: new Date().toISOString()
  };
}

function generateRecommendations({ industry, employeeCount, currentProcesses, painPoints, readinessLevel, totalScore }) {
  const baseRecommendations = [];

  // Industry-specific recommendations
  const industryRecommendations = {
    'manufacturing': ['Implement IoT sensors for equipment monitoring', 'Automate quality control processes', 'Optimize supply chain logistics'],
    'retail': ['Deploy inventory management automation', 'Implement customer service chatbots', 'Automate pricing optimization'],
    'healthcare': ['Streamline patient scheduling', 'Automate billing processes', 'Implement EHR workflows'],
    'financial': ['Deploy fraud detection systems', 'Automate compliance reporting', 'Implement risk assessment tools'],
    'technology': ['Automate CI/CD pipelines', 'Implement automated testing', 'Deploy monitoring and alerting'],
    'other': ['Start with document automation', 'Implement workflow management', 'Deploy basic reporting automation']
  };

  baseRecommendations.push(...(industryRecommendations[industry] || industryRecommendations['other']));

  // Size-based recommendations
  if (employeeCount > 100) {
    baseRecommendations.push('Enterprise resource planning integration');
    baseRecommendations.push('Advanced analytics and reporting');
  } else if (employeeCount > 25) {
    baseRecommendations.push('Mid-market automation tools');
    baseRecommendations.push('Department-specific solutions');
  } else {
    baseRecommendations.push('Small business automation platforms');
    baseRecommendations.push('Cloud-based solutions');
  }

  // Pain point specific recommendations
  if (painPoints?.includes('manual-data-entry')) {
    baseRecommendations.push('OCR and document processing automation');
  }
  if (painPoints?.includes('communication-delays')) {
    baseRecommendations.push('Workflow automation with notifications');
  }
  if (painPoints?.includes('reporting-overhead')) {
    baseRecommendations.push('Automated dashboard and reporting systems');
  }

  return baseRecommendations.slice(0, 6); // Return top 6 recommendations
}

function calculateROIProjection({ employeeCount, painPoints, industry, readinessLevel }) {
  // Base efficiency gains by readiness level
  const efficiencyMultipliers = {
    'high': 0.25,    // 25% efficiency gain
    'medium': 0.15,  // 15% efficiency gain
    'low': 0.08      // 8% efficiency gain
  };

  // Average salary assumptions by company size
  const avgSalary = employeeCount > 100 ? 85000 : employeeCount > 25 ? 70000 : 55000;
  const affectedEmployees = Math.min(employeeCount * 0.6, employeeCount); // 60% or all employees affected

  const efficiencyGain = efficiencyMultipliers[readinessLevel];
  const annualSavings = affectedEmployees * avgSalary * efficiencyGain;

  // Implementation cost estimation
  const implementationCost = employeeCount > 100 ? 250000 : employeeCount > 25 ? 100000 : 35000;

  const timeToROI = Math.ceil(implementationCost / (annualSavings / 12)); // Months to break even
  const threeYearValue = (annualSavings * 3) - implementationCost;

  return {
    annualSavings: Math.round(annualSavings),
    implementationCost,
    timeToROI: Math.min(timeToROI, 36), // Cap at 36 months
    threeYearValue: Math.round(threeYearValue),
    efficiencyGain: Math.round(efficiencyGain * 100)
  };
}

function generateNextSteps(readinessLevel, recommendations) {
  const baseSteps = [
    'Document current workflows and pain points',
    'Identify quick wins for immediate automation',
    'Evaluate vendor solutions and platforms'
  ];

  if (readinessLevel === 'high') {
    return [
      'Begin pilot program with highest-impact process',
      'Establish automation center of excellence',
      'Create detailed implementation roadmap',
      ...baseSteps
    ];
  } else if (readinessLevel === 'medium') {
    return [
      'Conduct detailed process audit',
      'Build internal automation capabilities',
      'Start with simple, low-risk automations',
      ...baseSteps
    ];
  } else {
    return [
      'Invest in process documentation and standardization',
      'Build organizational change management capacity',
      'Start with manual process optimization',
      ...baseSteps
    ];
  }
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
    const businessData = {
      company: sanitizeInput(data.company),
      industry: sanitizeInput(data.industry),
      employeeCount: parseInt(data.employeeCount) || 0,
      currentProcesses: Array.isArray(data.currentProcesses)
        ? data.currentProcesses.map(p => sanitizeInput(p)).filter(Boolean)
        : [],
      painPoints: Array.isArray(data.painPoints)
        ? data.painPoints.map(p => sanitizeInput(p)).filter(Boolean)
        : [],
      objectives: Array.isArray(data.objectives)
        ? data.objectives.map(o => sanitizeInput(o)).filter(Boolean)
        : [],
      timeline: sanitizeInput(data.timeline),
      budget: sanitizeInput(data.budget),
      contactName: sanitizeInput(data.contactName),
      contactEmail: sanitizeInput(data.contactEmail),
      requestResults: data.requestResults === true
    };

    // Validate required fields
    if (!businessData.company || !businessData.industry || !businessData.employeeCount) {
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Company name, industry, and employee count are required'
        }),
      };
    }

    // Validate email if results are requested
    if (businessData.requestResults && businessData.contactEmail && !isValidEmail(businessData.contactEmail)) {
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Valid email address is required to receive results'
        }),
      };
    }

    // Perform business automation analysis
    const analysis = analyzeBusinessData(businessData);

    // Generate analysis report
    const analysisReport = `
Business Automation Analysis Report
Company: ${businessData.company}

AUTOMATION READINESS ASSESSMENT
Readiness Score: ${analysis.readinessScore}/100 (${analysis.readinessLevel.toUpperCase()})

Key Factors:
${Object.entries(analysis.readinessFactors)
  .map(([factor, score]) => `- ${factor.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${score}/25`)
  .join('\n')}

ROI PROJECTION
- Annual Savings: $${analysis.roiProjection.annualSavings.toLocaleString()}
- Implementation Cost: $${analysis.roiProjection.implementationCost.toLocaleString()}
- Time to ROI: ${analysis.roiProjection.timeToROI} months
- 3-Year Value: $${analysis.roiProjection.threeYearValue.toLocaleString()}
- Efficiency Gain: ${analysis.roiProjection.efficiencyGain}%

TOP RECOMMENDATIONS
${analysis.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

NEXT STEPS
${analysis.nextSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

Generated: ${new Date().toISOString()}
    `.trim();

    // Send results via email if requested
    if (businessData.requestResults && businessData.contactEmail && businessData.contactName) {
      try {
        const apiKey = process.env.RESEND_API_KEY;
        if (apiKey &&
            apiKey !== 're_placeholder_key_change_this') {

          const resend = new Resend(apiKey);

          // Send analysis results to user
          const userEmailResult = await resend.emails.send({
            from: 'Candlefish Analysis <analysis@candlefish.ai>',
            to: [businessData.contactEmail],
            subject: `Business Automation Analysis - ${businessData.company}`,
            text: `Dear ${businessData.contactName},

Thank you for using Candlefish's Business Automation Analysis tool. Please find your detailed analysis report below.

${analysisReport}

For questions or to discuss implementation, please contact us at hello@candlefish.ai.

Best regards,
The Candlefish Team`,
            replyTo: 'hello@candlefish.ai',
          });

          // Send notification to admin
          const adminEmailResult = await resend.emails.send({
            from: 'Candlefish Analysis <analysis@candlefish.ai>',
            to: ['hello@candlefish.ai'],
            subject: `[NANDA Analysis] ${businessData.company} - ${analysis.readinessLevel.toUpperCase()} Readiness`,
            text: `New Business Automation Analysis completed:

Contact: ${businessData.contactName} <${businessData.contactEmail}>
${analysisReport}`,
            replyTo: businessData.contactEmail,
          });

          console.log('NANDA analysis processed and emailed:', {
            timestamp: new Date().toISOString(),
            company: businessData.company,
            readinessLevel: analysis.readinessLevel,
            score: analysis.readinessScore,
            contactEmail: businessData.contactEmail,
            userEmailSent: !!userEmailResult.data?.id,
            adminEmailSent: !!adminEmailResult.data?.id
          });
        }
      } catch (emailError) {
        console.error('Email service error:', {
          timestamp: new Date().toISOString(),
          company: businessData.company,
          type: 'nanda_email_failure',
          error: emailError.message
        });
        // Don't fail the request if email fails
      }
    }

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        analysis,
        message: businessData.requestResults && businessData.contactEmail
          ? 'Analysis complete. Detailed report sent to your email.'
          : 'Analysis complete.'
      }),
    };

  } catch (error) {
    console.error('NANDA analysis processing error:', {
      timestamp: new Date().toISOString(),
      type: 'nanda_processing_error',
      error: error.message
    });

    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Failed to process business analysis. Please try again.'
      }),
    };
  }
};
