/**
 * Test Data Factories for PromoterOS Testing
 * Provides consistent, realistic test data for all test scenarios
 */

class TestDataFactory {
  /**
   * Generate artist streaming data
   */
  static createStreamingData(overrides = {}) {
    const defaults = {
      spotify_monthly: 10000000,
      apple_music_plays: 6000000,
      youtube_views: 50000000,
      tiktok_uses: 1000000,
      instagram_followers: 2000000,
      twitter_followers: 500000,
      growth_rate: 0.35,
      viral_coefficient: 0.75
    };

    return { ...defaults, ...overrides };
  }

  /**
   * Generate artist profile for booking recommendations
   */
  static createArtistProfile(tier = 'medium', overrides = {}) {
    const profiles = {
      high: {
        momentum_metrics: {
          spotify_growth_30d: 0.65,
          tiktok_velocity: 0.9,
          social_engagement_trend: 'EXPLOSIVE',
          media_buzz_score: 90,
          touring_momentum: 'PEAK',
          viral_coefficient: 0.92
        },
        market_fit: {
          demographic_alignment: 0.9,
          geographic_demand: 0.88,
          venue_size_match: 0.85,
          price_elasticity: 0.8,
          market_penetration: 0.4
        },
        financial_profile: {
          avg_ticket_price: 75,
          merchandise_velocity: 0.85,
          vip_upsell_rate: 0.25,
          cost_per_acquisition: 10,
          profit_margin_estimate: 0.45
        },
        risk_assessment: {
          booking_competition: 'HIGH',
          price_inflation: 'MEDIUM',
          market_saturation: 'LOW',
          tour_scheduling_conflicts: 'MEDIUM',
          overall_risk: 'MEDIUM'
        },
        strategic_value: {
          brand_alignment: 0.95,
          audience_expansion_potential: 0.9,
          social_media_amplification: 0.92,
          long_term_relationship: 0.88,
          portfolio_diversification: 0.8
        }
      },
      medium: {
        momentum_metrics: {
          spotify_growth_30d: 0.35,
          tiktok_velocity: 0.65,
          social_engagement_trend: 'STRONG',
          media_buzz_score: 70,
          touring_momentum: 'HIGH',
          viral_coefficient: 0.75
        },
        market_fit: {
          demographic_alignment: 0.75,
          geographic_demand: 0.7,
          venue_size_match: 0.72,
          price_elasticity: 0.68,
          market_penetration: 0.35
        },
        financial_profile: {
          avg_ticket_price: 55,
          merchandise_velocity: 0.6,
          vip_upsell_rate: 0.15,
          cost_per_acquisition: 15,
          profit_margin_estimate: 0.35
        },
        risk_assessment: {
          booking_competition: 'MEDIUM',
          price_inflation: 'LOW',
          market_saturation: 'MEDIUM',
          tour_scheduling_conflicts: 'LOW',
          overall_risk: 'LOW'
        },
        strategic_value: {
          brand_alignment: 0.8,
          audience_expansion_potential: 0.75,
          social_media_amplification: 0.78,
          long_term_relationship: 0.82,
          portfolio_diversification: 0.7
        }
      },
      low: {
        momentum_metrics: {
          spotify_growth_30d: 0.15,
          tiktok_velocity: 0.4,
          social_engagement_trend: 'BUILDING',
          media_buzz_score: 45,
          touring_momentum: 'EARLY',
          viral_coefficient: 0.55
        },
        market_fit: {
          demographic_alignment: 0.6,
          geographic_demand: 0.55,
          venue_size_match: 0.58,
          price_elasticity: 0.65,
          market_penetration: 0.2
        },
        financial_profile: {
          avg_ticket_price: 35,
          merchandise_velocity: 0.4,
          vip_upsell_rate: 0.08,
          cost_per_acquisition: 20,
          profit_margin_estimate: 0.25
        },
        risk_assessment: {
          booking_competition: 'LOW',
          price_inflation: 'VERY_LOW',
          market_saturation: 'LOW',
          tour_scheduling_conflicts: 'LOW',
          overall_risk: 'VERY_LOW'
        },
        strategic_value: {
          brand_alignment: 0.65,
          audience_expansion_potential: 0.8,
          social_media_amplification: 0.6,
          long_term_relationship: 0.7,
          portfolio_diversification: 0.85
        }
      }
    };

    const baseProfile = profiles[tier];

    // Deep merge overrides
    return this.deepMerge(baseProfile, overrides);
  }

  /**
   * Generate API request data
   */
  static createApiRequest(type = 'evaluate', overrides = {}) {
    const requests = {
      evaluate: {
        artist_name: 'Test Artist',
        context: {
          venue_capacity: 2000,
          date: '2024-12-01'
        }
      },
      booking: {
        artist_name: 'Test Artist',
        venue_capacity: 2000,
        target_date: '2024-10-15',
        budget_range: { min: 40000, max: 60000 },
        priority_factors: ['brand_alignment']
      }
    };

    return { ...requests[type], ...overrides };
  }

  /**
   * Generate mock HTTP event for Netlify Functions
   */
  static createMockEvent(method = 'POST', path = '/api/artists/evaluate', body = null) {
    return {
      httpMethod: method,
      path,
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://test.promoteros.com'
      },
      body: body ? JSON.stringify(body) : JSON.stringify(this.createApiRequest()),
      queryStringParameters: {},
      isBase64Encoded: false
    };
  }

  /**
   * Generate mock Netlify context
   */
  static createMockContext() {
    return {
      functionName: 'test-function',
      functionVersion: '1.0.0',
      invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test',
      memoryLimitInMB: '128',
      remainingTimeInMillis: () => 30000
    };
  }

  /**
   * Create venue data variations
   */
  static createVenueScenarios() {
    return {
      small: { capacity: 800, type: 'club', atmosphere: 'intimate' },
      medium: { capacity: 2000, type: 'theater', atmosphere: 'acoustic' },
      large: { capacity: 3500, type: 'arena', atmosphere: 'energetic' },
      festival: { capacity: 10000, type: 'outdoor', atmosphere: 'festival' }
    };
  }

  /**
   * Create seasonal date scenarios
   */
  static createSeasonalDates() {
    return {
      peak_spring: '2024-04-15',
      peak_fall: '2024-10-15',
      summer_low: '2024-07-15',
      winter_medium: '2024-01-15',
      holiday_avoid: '2024-12-25'
    };
  }

  /**
   * Create financial scenarios for testing
   */
  static createFinancialScenarios(venueCapacity = 2000) {
    const baseTicketPrice = 50;
    const fillRate = 0.75;

    return {
      conservative: {
        ticket_price: baseTicketPrice * 0.8,
        fill_rate: fillRate * 0.8,
        merchandise_rate: 0.1,
        vip_rate: 0.05
      },
      expected: {
        ticket_price: baseTicketPrice,
        fill_rate: fillRate,
        merchandise_rate: 0.2,
        vip_rate: 0.15
      },
      optimistic: {
        ticket_price: baseTicketPrice * 1.3,
        fill_rate: Math.min(fillRate * 1.2, 0.95),
        merchandise_rate: 0.35,
        vip_rate: 0.25
      }
    };
  }

  /**
   * Generate error scenarios for testing
   */
  static createErrorScenarios() {
    return {
      missing_artist: { context: { venue_capacity: 2000 } },
      invalid_capacity: { artist_name: 'Test', venue_capacity: -100 },
      malformed_date: { artist_name: 'Test', target_date: 'invalid-date' },
      empty_request: {},
      invalid_json: 'not json',
      large_payload: {
        artist_name: 'Test'.repeat(1000),
        context: { venue_capacity: 2000 }
      }
    };
  }

  /**
   * Deep merge utility for nested objects
   */
  static deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Generate time-series data for performance testing
   */
  static createPerformanceTestData(artistCount = 10) {
    const artists = [];
    const tiers = ['high', 'medium', 'low'];

    for (let i = 0; i < artistCount; i++) {
      const tier = tiers[i % tiers.length];
      artists.push({
        name: `Test Artist ${i + 1}`,
        profile: this.createArtistProfile(tier),
        venue_capacity: 1500 + (i * 100),
        target_date: this.createSeasonalDates().peak_fall
      });
    }

    return artists;
  }

  /**
   * Create edge case test scenarios
   */
  static createEdgeCases() {
    return {
      zero_followers: this.createStreamingData({
        spotify_monthly: 0,
        instagram_followers: 0,
        twitter_followers: 0
      }),

      viral_explosion: this.createStreamingData({
        spotify_monthly: 100000000,
        growth_rate: 5.0,
        viral_coefficient: 0.99,
        tiktok_uses: 50000000
      }),

      declining_artist: this.createStreamingData({
        growth_rate: -0.3,
        viral_coefficient: 0.1
      }),

      venue_mismatch_small: {
        venue_capacity: 50000,
        artist_profile: this.createArtistProfile('low')
      },

      venue_mismatch_large: {
        venue_capacity: 200,
        artist_profile: this.createArtistProfile('high')
      }
    };
  }
}

module.exports = TestDataFactory;
