const { authMiddleware } = require('../../src/middleware/auth');
const { validateInput } = require('../../src/middleware/validation');
const { rateLimiter } = require('../../src/middleware/rateLimiter');

/**
 * Booking Engine API
 * Smart booking recommendations based on artist, venue, and market data
 * Handles booking creation, optimization, and deal structuring
 */

// Mock venue database
const venues = {
  'fillmore-denver': {
    id: 'fillmore-denver',
    name: 'The Fillmore',
    city: 'Denver',
    state: 'CO',
    capacity: 3000,
    configurations: [
      { name: 'Full Capacity', capacity: 3000, rental: 15000 },
      { name: 'Seated Show', capacity: 2200, rental: 12000 },
      { name: 'GA Floor + Balcony', capacity: 2800, rental: 14000 }
    ],
    availability: ['2025-09-15', '2025-10-02', '2025-10-18', '2025-11-05'],
    avgTicketPrice: 55,
    barRevenuePct: 0.25
  },
  'ogden-denver': {
    id: 'ogden-denver',
    name: 'Ogden Theatre',
    city: 'Denver',
    state: 'CO',
    capacity: 2500,
    configurations: [
      { name: 'Full Capacity', capacity: 2500, rental: 10000 },
      { name: 'Reserved Seating', capacity: 1800, rental: 8000 }
    ],
    availability: ['2025-09-22', '2025-10-10', '2025-10-25', '2025-11-12'],
    avgTicketPrice: 45,
    barRevenuePct: 0.22
  },
  'gothic-englewood': {
    id: 'gothic-englewood',
    name: 'Gothic Theatre',
    city: 'Englewood',
    state: 'CO',
    capacity: 1900,
    configurations: [
      { name: 'Full Capacity', capacity: 1900, rental: 7500 },
      { name: 'Intimate Show', capacity: 1200, rental: 5500 }
    ],
    availability: ['2025-09-08', '2025-09-29', '2025-10-15', '2025-11-20'],
    avgTicketPrice: 38,
    barRevenuePct: 0.20
  }
};

// Calculate optimal booking parameters
function generateBookingRecommendation(artistData, venueId, date) {
  const venue = venues[venueId];
  if (!venue) {
    throw new Error('Venue not found');
  }

  // Select optimal configuration based on artist draw
  const optimalConfig = selectOptimalConfiguration(venue, artistData.predictedDraw);

  // Calculate financial projections
  const financials = calculateFinancials(
    artistData,
    venue,
    optimalConfig,
    date
  );

  // Generate deal structure recommendations
  const dealStructure = generateDealStructure(artistData, venue, financials);

  // Risk assessment
  const riskAssessment = assessRisk(artistData, venue, date, financials);

  return {
    venue: {
      id: venue.id,
      name: venue.name,
      location: `${venue.city}, ${venue.state}`,
      configuration: optimalConfig
    },
    date,
    financials,
    dealStructure,
    riskAssessment,
    recommendations: generateRecommendations(artistData, venue, financials, riskAssessment)
  };
}

function selectOptimalConfiguration(venue, predictedDraw) {
  // Find the configuration that best matches predicted draw
  const targetCapacity = predictedDraw * 0.85; // Target 85% capacity

  let optimal = venue.configurations[0];
  let minDiff = Math.abs(optimal.capacity - targetCapacity);

  for (const config of venue.configurations) {
    const diff = Math.abs(config.capacity - targetCapacity);
    if (diff < minDiff) {
      optimal = config;
      minDiff = diff;
    }
  }

  return optimal;
}

function calculateFinancials(artistData, venue, config, date) {
  // Base calculations
  const ticketPrice = artistData.avgTicketPrice || venue.avgTicketPrice;
  const soldCapacity = Math.min(config.capacity, artistData.predictedDraw);
  const capacityPct = (soldCapacity / config.capacity) * 100;

  // Revenue calculations
  const ticketRevenue = soldCapacity * ticketPrice;
  const barRevenue = ticketRevenue * venue.barRevenuePct;
  const totalRevenue = ticketRevenue + barRevenue;

  // Cost calculations
  const venueRental = config.rental;
  const artistFee = estimateArtistFee(artistData, ticketRevenue);
  const production = ticketRevenue * 0.15; // 15% for production
  const marketing = ticketRevenue * 0.10; // 10% for marketing
  const staffing = 3500; // Fixed staffing costs
  const insurance = 1500; // Event insurance
  const totalCosts = venueRental + artistFee + production + marketing + staffing + insurance;

  // Profit calculations
  const grossProfit = totalRevenue - totalCosts;
  const profitMargin = (grossProfit / totalRevenue) * 100;

  // Breakeven analysis
  const breakevenTickets = Math.ceil(totalCosts / ticketPrice);
  const breakevenPct = (breakevenTickets / config.capacity) * 100;

  return {
    revenue: {
      tickets: Math.round(ticketRevenue),
      bar: Math.round(barRevenue),
      total: Math.round(totalRevenue)
    },
    costs: {
      venue: venueRental,
      artist: Math.round(artistFee),
      production: Math.round(production),
      marketing: Math.round(marketing),
      staffing,
      insurance,
      total: Math.round(totalCosts)
    },
    profit: {
      gross: Math.round(grossProfit),
      margin: profitMargin.toFixed(1),
      perTicket: (grossProfit / soldCapacity).toFixed(2)
    },
    metrics: {
      soldCapacity,
      capacityPct: capacityPct.toFixed(1),
      ticketPrice,
      breakevenTickets,
      breakevenPct: breakevenPct.toFixed(1)
    }
  };
}

function estimateArtistFee(artistData, ticketRevenue) {
  // Estimate based on artist tier
  if (artistData.monthlyListeners > 40000000) {
    return ticketRevenue * 0.60; // Top tier: 60% of ticket revenue
  } else if (artistData.monthlyListeners > 20000000) {
    return ticketRevenue * 0.50; // Mid-top tier: 50%
  } else if (artistData.monthlyListeners > 10000000) {
    return ticketRevenue * 0.40; // Mid tier: 40%
  } else if (artistData.monthlyListeners > 5000000) {
    return ticketRevenue * 0.30; // Emerging: 30%
  } else {
    return ticketRevenue * 0.25; // New artist: 25%
  }
}

function generateDealStructure(artistData, venue, financials) {
  const structures = [];

  // Guarantee + percentage deal
  const guarantee = financials.costs.artist;
  structures.push({
    type: 'Guarantee Plus',
    description: `$${guarantee.toLocaleString()} guarantee + 85% of net after breakeven`,
    artistPayout: guarantee + (financials.profit.gross > 0 ? financials.profit.gross * 0.85 : 0),
    venueProfit: financials.profit.gross > 0 ? financials.profit.gross * 0.15 : -guarantee,
    recommended: true
  });

  // Straight percentage deal
  const percentageDeal = financials.revenue.total * 0.70;
  structures.push({
    type: 'Straight Percentage',
    description: '70% of gross revenue to artist',
    artistPayout: percentageDeal,
    venueProfit: financials.revenue.total - percentageDeal - (financials.costs.total - financials.costs.artist),
    recommended: financials.metrics.capacityPct > 90
  });

  // Co-promotion deal
  const coPromo = (financials.profit.gross * 0.50) + financials.costs.artist;
  structures.push({
    type: 'Co-Promotion',
    description: '50/50 profit split after costs',
    artistPayout: coPromo,
    venueProfit: financials.profit.gross * 0.50,
    recommended: artistData.growthRate > 10
  });

  return structures;
}

function assessRisk(artistData, venue, date, financials) {
  const risks = [];
  let overallRisk = 'Low';

  // Capacity risk
  if (financials.metrics.capacityPct < 70) {
    risks.push({
      type: 'Capacity',
      level: 'High',
      description: 'Predicted sales below 70% capacity',
      mitigation: 'Consider smaller configuration or aggressive marketing'
    });
    overallRisk = 'High';
  }

  // Breakeven risk
  if (financials.metrics.breakevenPct > 60) {
    risks.push({
      type: 'Breakeven',
      level: 'Medium',
      description: 'High breakeven threshold',
      mitigation: 'Negotiate lower artist guarantee or reduce production costs'
    });
    if (overallRisk === 'Low') overallRisk = 'Medium';
  }

  // Date risk
  const dayOfWeek = new Date(date).getDay();
  if (dayOfWeek === 0 || dayOfWeek === 1 || dayOfWeek === 2) {
    risks.push({
      type: 'Scheduling',
      level: 'Low',
      description: 'Weekday show may have lower attendance',
      mitigation: 'Consider special pricing or promotions'
    });
  }

  // Competition risk
  risks.push({
    type: 'Competition',
    level: 'Low',
    description: 'Check for competing events',
    mitigation: 'Monitor local event calendar'
  });

  return {
    overall: overallRisk,
    factors: risks,
    score: calculateRiskScore(risks)
  };
}

function calculateRiskScore(risks) {
  let score = 100;
  for (const risk of risks) {
    if (risk.level === 'High') score -= 30;
    else if (risk.level === 'Medium') score -= 15;
    else if (risk.level === 'Low') score -= 5;
  }
  return Math.max(0, score);
}

function generateRecommendations(artistData, venue, financials, riskAssessment) {
  const recommendations = [];

  // Pricing recommendation
  if (financials.metrics.capacityPct < 80) {
    recommendations.push({
      category: 'Pricing',
      action: 'Implement dynamic pricing',
      detail: 'Start with early bird pricing 20% below face value'
    });
  }

  // Marketing recommendation
  if (artistData.tiktokFollowers > 1000000) {
    recommendations.push({
      category: 'Marketing',
      action: 'TikTok campaign',
      detail: 'Partner with artist for exclusive content announcement'
    });
  }

  // Deal structure recommendation
  const recommended = financials.profit.margin > 20 ? 'Guarantee Plus' : 'Co-Promotion';
  recommendations.push({
    category: 'Deal Structure',
    action: `Use ${recommended} model`,
    detail: 'Optimal risk/reward balance for this show'
  });

  // Production recommendation
  if (venue.capacity > 2000) {
    recommendations.push({
      category: 'Production',
      action: 'Enhanced production value',
      detail: 'Invest in video walls and enhanced lighting'
    });
  }

  return recommendations;
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || 'https://promoteros.candlefish.ai',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimiter(event);
    if (rateLimitResult.blocked) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({
          error: 'Too many requests',
          retryAfter: rateLimitResult.retryAfter
        })
      };
    }

    // Require POST method
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    // Parse and validate body
    const body = JSON.parse(event.body || '{}');

    if (!body.artistData || !body.venueId || !body.date) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields',
          required: ['artistData', 'venueId', 'date']
        })
      };
    }

    // Validate inputs
    const venueId = validateInput(body.venueId, 'alphanumeric');
    const date = validateInput(body.date, 'date');

    // Authentication required for booking engine
    try {
      await authMiddleware(event);
    } catch (authError) {
      return {
        statusCode: 401,
        headers: { ...headers, 'WWW-Authenticate': 'Bearer' },
        body: JSON.stringify({ error: 'Authentication required' })
      };
    }

    // Generate booking recommendation
    const recommendation = generateBookingRecommendation(
      body.artistData,
      venueId,
      date
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: recommendation,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Booking engine error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
      })
    };
  }
};
