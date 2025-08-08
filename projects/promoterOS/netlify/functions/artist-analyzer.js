const { authMiddleware } = require('../../src/middleware/auth');
const { validateInput } = require('../../src/middleware/validation');
const { rateLimiter } = require('../../src/middleware/rateLimiter');

/**
 * Artist Analyzer API
 * Analyzes artist metrics from TikTok, Spotify, and YouTube
 * Returns booking recommendations and predicted draw
 */

// Mock data for development (will be replaced with real API calls)
const mockArtistData = {
  'olivia-rodrigo': {
    name: 'Olivia Rodrigo',
    genre: 'Pop Rock',
    monthlyListeners: 45000000,
    tiktokFollowers: 8200000,
    avgTicketPrice: 65,
    drawCapacity: 3000,
    growthRate: 15.2,
    demographics: {
      age: { '18-24': 45, '25-34': 30, '35-44': 15, '45+': 10 },
      gender: { female: 70, male: 25, other: 5 }
    }
  },
  'phoebe-bridgers': {
    name: 'Phoebe Bridgers',
    genre: 'Indie Rock',
    monthlyListeners: 12000000,
    tiktokFollowers: 2500000,
    avgTicketPrice: 45,
    drawCapacity: 2500,
    growthRate: 8.7,
    demographics: {
      age: { '18-24': 35, '25-34': 40, '35-44': 20, '45+': 5 },
      gender: { female: 60, male: 35, other: 5 }
    }
  }
};

// Analyze artist metrics and generate recommendations
function analyzeArtist(artistId) {
  const artist = mockArtistData[artistId] || mockArtistData['olivia-rodrigo'];

  // Calculate booking score (0-100)
  const bookingScore = calculateBookingScore(artist);

  // Generate venue recommendations based on capacity
  const venueRecommendations = getVenueRecommendations(artist.drawCapacity);

  // Calculate ROI projection
  const roiProjection = calculateROI(artist);

  return {
    artist: {
      id: artistId,
      name: artist.name,
      genre: artist.genre,
      metrics: {
        monthlyListeners: artist.monthlyListeners,
        tiktokFollowers: artist.tiktokFollowers,
        growthRate: artist.growthRate
      }
    },
    analysis: {
      bookingScore,
      predictedDraw: artist.drawCapacity,
      recommendedTicketPrice: artist.avgTicketPrice,
      demographics: artist.demographics
    },
    recommendations: {
      venues: venueRecommendations,
      optimalBookingWindow: '3-4 months out',
      marketingStrategy: getMarketingStrategy(artist),
      roiProjection
    }
  };
}

function calculateBookingScore(artist) {
  // Weighted scoring algorithm
  const listenerScore = Math.min(artist.monthlyListeners / 500000, 100) * 0.4;
  const socialScore = Math.min(artist.tiktokFollowers / 100000, 100) * 0.3;
  const growthScore = Math.min(artist.growthRate * 5, 100) * 0.2;
  const capacityScore = Math.min(artist.drawCapacity / 35, 100) * 0.1;

  return Math.round(listenerScore + socialScore + growthScore + capacityScore);
}

function getVenueRecommendations(capacity) {
  const venues = [];

  if (capacity >= 2800) {
    venues.push({
      name: 'The Fillmore',
      capacity: 3000,
      city: 'Denver',
      fit: 'Excellent'
    });
  }

  if (capacity >= 2000 && capacity <= 3000) {
    venues.push({
      name: 'Ogden Theatre',
      capacity: 2500,
      city: 'Denver',
      fit: 'Great'
    });
  }

  if (capacity >= 1500 && capacity <= 2500) {
    venues.push({
      name: 'Gothic Theatre',
      capacity: 1900,
      city: 'Englewood',
      fit: 'Good'
    });
  }

  venues.push({
    name: 'Bluebird Theater',
    capacity: 1200,
    city: 'Denver',
    fit: capacity < 1500 ? 'Great' : 'Backup Option'
  });

  return venues;
}

function calculateROI(artist) {
  const ticketRevenue = artist.drawCapacity * artist.avgTicketPrice * 0.85; // 85% capacity
  const estimatedCosts = ticketRevenue * 0.4; // 40% costs
  const profit = ticketRevenue - estimatedCosts;
  const roi = ((profit / estimatedCosts) * 100).toFixed(1);

  return {
    estimatedRevenue: ticketRevenue,
    estimatedCosts,
    estimatedProfit: profit,
    roiPercentage: roi
  };
}

function getMarketingStrategy(artist) {
  const strategies = [];

  if (artist.tiktokFollowers > 5000000) {
    strategies.push('TikTok viral campaign with artist involvement');
  }

  if (artist.demographics.age['18-24'] > 40) {
    strategies.push('Instagram stories and reels campaign');
    strategies.push('University campus promotions');
  }

  if (artist.demographics.age['25-34'] > 35) {
    strategies.push('Spotify playlist placements');
    strategies.push('Local radio partnerships');
  }

  strategies.push('Early bird pricing strategy');
  strategies.push('VIP package offerings');

  return strategies;
}

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || 'https://promoteros.candlefish.ai',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

    // Validate request method
    if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    // Get artist ID from query params or body
    let artistId;
    if (event.httpMethod === 'GET') {
      artistId = event.queryStringParameters?.artistId;
    } else {
      const body = JSON.parse(event.body || '{}');
      artistId = body.artistId;
    }

    // Validate artist ID
    if (!artistId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Artist ID is required' })
      };
    }

    // Sanitize input
    artistId = validateInput(artistId, 'alphanumeric').toLowerCase();

    // For now, authentication is optional for GET requests
    let authenticated = false;
    if (event.headers.authorization) {
      try {
        const authResult = await authMiddleware(event);
        authenticated = authResult.authenticated;
      } catch (authError) {
        // Continue without authentication for GET requests
        if (event.httpMethod === 'POST') {
          return {
            statusCode: 401,
            headers: { ...headers, 'WWW-Authenticate': 'Bearer' },
            body: JSON.stringify({ error: 'Authentication required for POST requests' })
          };
        }
      }
    }

    // Analyze artist
    const analysis = analyzeArtist(artistId);

    // Add auth status to response
    analysis.authenticated = authenticated;
    if (authenticated) {
      analysis.premiumData = {
        contactInfo: 'Available for authenticated users',
        historicalData: 'Last 12 months performance metrics',
        competitorAnalysis: 'Similar artists in market'
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: analysis,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Artist analyzer error:', error);
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
