const { handler, BookingRecommendationEngine } = require('../api/booking/score');

describe('BookingRecommendationEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new BookingRecommendationEngine();
  });

  describe('Comprehensive Booking Score Generation', () => {
    test('should generate complete booking analysis for Chappell Roan', async () => {
      const requestData = {
        artist_name: 'Chappell Roan',
        venue_capacity: 2000,
        target_date: '2024-10-15',
        budget_range: { min: 50000, max: 75000 },
        priority_factors: ['brand_alignment']
      };

      const result = await engine.generateBookingScore(requestData);

      // Validate overall structure
      expect(result).toHaveProperty('booking_score');
      expect(result).toHaveProperty('recommendation');
      expect(result).toHaveProperty('financial_analysis');
      expect(result).toHaveProperty('risk_analysis');
      expect(result).toHaveProperty('optimal_booking_parameters');
      expect(result).toHaveProperty('competitive_analysis');
      expect(result).toHaveProperty('action_plan');

      // Validate booking score structure
      expect(result.booking_score.overall_score).toBeGreaterThanOrEqual(0);
      expect(result.booking_score.overall_score).toBeLessThanOrEqual(100);
      expect(['HIGH', 'MEDIUM', 'LOW']).toContain(result.booking_score.confidence_level);

      // Validate component scores
      const components = result.booking_score.component_scores;
      expect(components).toHaveProperty('artist_momentum');
      expect(components).toHaveProperty('market_demand');
      expect(components).toHaveProperty('financial_viability');
      expect(components).toHaveProperty('risk_assessment');
      expect(components).toHaveProperty('timing_factors');
      expect(components).toHaveProperty('strategic_value');

      // All scores should be objects with score property
      Object.values(components).forEach(component => {
        expect(component).toHaveProperty('score');
        expect(component.score).toBeGreaterThanOrEqual(0);
        expect(component.score).toBeLessThanOrEqual(120); // Some scores can exceed 100
      });
    });

    test('should handle unknown artists appropriately', async () => {
      const requestData = {
        artist_name: 'Unknown Test Artist',
        venue_capacity: 1500,
        target_date: '2024-11-01'
      };

      const result = await engine.generateBookingScore(requestData);

      expect(result.artist).toBe('Unknown Test Artist');
      expect(result.booking_score.overall_score).toBeGreaterThan(0);
      expect(result.recommendation.action).toBeTruthy();
    });

    test('should apply venue capacity optimizations', async () => {
      const smallVenueRequest = {
        artist_name: 'Chappell Roan',
        venue_capacity: 1200
      };

      const largeVenueRequest = {
        artist_name: 'Chappell Roan',
        venue_capacity: 3000
      };

      const smallVenueResult = await engine.generateBookingScore(smallVenueRequest);
      const largeVenueResult = await engine.generateBookingScore(largeVenueRequest);

      // Financial projections should differ based on venue size
      expect(smallVenueResult.financial_analysis.revenue_breakdown.ticket_sales)
        .toBeLessThan(largeVenueResult.financial_analysis.revenue_breakdown.ticket_sales);
    });
  });

  describe('Individual Scoring Methods', () => {
    test('calculateMomentumScore should handle various momentum levels', () => {
      const explosiveMetrics = {
        spotify_growth_30d: 0.8,
        tiktok_velocity: 0.95,
        social_engagement_trend: 'EXPLOSIVE',
        media_buzz_score: 95,
        touring_momentum: 'PEAK',
        viral_coefficient: 0.94
      };

      const result = engine.calculateMomentumScore(explosiveMetrics);

      expect(result.score).toBeGreaterThan(90);
      expect(result.trend_direction).toBe('EXPLOSIVE');
      expect(result.momentum_sustainability).toBe('HIGH');
      expect(result.components).toHaveProperty('growth_velocity');
      expect(result.components).toHaveProperty('social_momentum');
      expect(result.components).toHaveProperty('media_presence');
      expect(result.components).toHaveProperty('viral_potential');
    });

    test('calculateMarketScore should evaluate market fit correctly', () => {
      const excellentMarketFit = {
        demographic_alignment: 0.9,
        geographic_demand: 0.85,
        venue_size_match: 0.88,
        price_elasticity: 0.75,
        market_penetration: 0.3
      };

      const result = engine.calculateMarketScore(excellentMarketFit);

      expect(result.score).toBeGreaterThan(75);
      expect(['PRIME', 'READY', 'DEVELOPING', 'EARLY']).toContain(result.market_readiness);
      expect(result.components.market_opportunity).toBeGreaterThan(60); // Low penetration = high opportunity
    });

    test('calculateFinancialScore should account for venue capacity', () => {
      const financialProfile = {
        avg_ticket_price: 65,
        profit_margin_estimate: 0.35,
        merchandise_velocity: 0.8,
        vip_upsell_rate: 0.2
      };

      const smallVenueScore = engine.calculateFinancialScore(financialProfile, 1200);
      const largeVenueScore = engine.calculateFinancialScore(financialProfile, 3000);

      expect(smallVenueScore.score).toBeGreaterThan(0);
      expect(largeVenueScore.score).toBeGreaterThan(0);
      expect(smallVenueScore.revenue_projection.profit_estimate)
        .toBeLessThan(largeVenueScore.revenue_projection.profit_estimate);
    });

    test('calculateRiskScore should properly invert risk levels', () => {
      const highRiskAssessment = {
        booking_competition: 'HIGH',
        price_inflation: 'HIGH',
        market_saturation: 'HIGH',
        tour_scheduling_conflicts: 'HIGH',
        overall_risk: 'HIGH'
      };

      const lowRiskAssessment = {
        booking_competition: 'LOW',
        price_inflation: 'VERY_LOW',
        market_saturation: 'LOW',
        tour_scheduling_conflicts: 'LOW',
        overall_risk: 'LOW'
      };

      const highRiskScore = engine.calculateRiskScore(highRiskAssessment);
      const lowRiskScore = engine.calculateRiskScore(lowRiskAssessment);

      expect(lowRiskScore.score).toBeGreaterThan(highRiskScore.score);
      expect(highRiskScore.risk_mitigation_priority).toBe('HIGH');
    });

    test('calculateTimingScore should handle seasonal variations', () => {
      const springDate = '2024-04-15'; // Good season
      const summerDate = '2024-07-15'; // Lower season

      const springScore = engine.calculateTimingScore(springDate);
      const summerScore = engine.calculateTimingScore(summerDate);

      expect(springScore.score).toBeGreaterThan(summerScore.score);
      expect(springScore.optimal_timing).toBe('EXCELLENT');
      expect(springScore.seasonal_factor).toBeGreaterThan(1.0);
    });
  });

  describe('Recommendation Logic', () => {
    test('should recommend immediate booking for high scores', () => {
      const compositeScore = { overall: 90, confidence: 'HIGH' };
      const mockArtistProfile = { momentum_metrics: {}, risk_assessment: {} };

      const recommendation = engine.generateRecommendation(compositeScore, mockArtistProfile);

      expect(recommendation.action).toBe('BOOK IMMEDIATELY');
      expect(recommendation.priority).toBe('CRITICAL');
      expect(recommendation.urgency).toBe('WITHIN_48_HOURS');
      expect(recommendation.confidence).toBe('VERY_HIGH');
    });

    test('should pass on low scores', () => {
      const compositeScore = { overall: 30, confidence: 'LOW' };
      const mockArtistProfile = { momentum_metrics: {}, risk_assessment: {} };

      const recommendation = engine.generateRecommendation(compositeScore, mockArtistProfile);

      expect(recommendation.action).toBe('PASS');
      expect(recommendation.priority).toBe('NONE');
      expect(recommendation.urgency).toBe('NOT_RECOMMENDED');
    });
  });

  describe('Financial Projections', () => {
    test('should calculate realistic financial projections', () => {
      const artistProfile = {
        financial_profile: {
          avg_ticket_price: 60,
          merchandise_velocity: 0.2,
          vip_upsell_rate: 0.15
        }
      };

      const projections = engine.createFinancialProjections(artistProfile, 2000);

      expect(projections.revenue_breakdown.ticket_sales).toBeGreaterThan(0);
      expect(projections.revenue_breakdown.total_revenue)
        .toBeGreaterThan(projections.revenue_breakdown.ticket_sales);
      expect(projections.profitability.gross_profit)
        .toBeLessThan(projections.revenue_breakdown.total_revenue);
      expect(projections.profitability.profit_margin).toBeGreaterThan(0);
      expect(projections.profitability.break_even_attendance).toBeGreaterThan(0);

      // Sensitivity analysis should show variance
      expect(projections.sensitivity_analysis.conservative_scenario)
        .toBeLessThan(projections.sensitivity_analysis.expected_scenario);
      expect(projections.sensitivity_analysis.expected_scenario)
        .toBeLessThan(projections.sensitivity_analysis.optimistic_scenario);
    });
  });

  describe('Action Plan Generation', () => {
    test('should generate critical actions for immediate booking recommendation', () => {
      const criticalRecommendation = {
        action: 'BOOK IMMEDIATELY',
        priority: 'CRITICAL'
      };

      const actionPlan = engine.createActionPlan(criticalRecommendation, {});

      expect(actionPlan.immediate_actions.length).toBeGreaterThan(0);
      expect(actionPlan.immediate_actions[0].priority).toBe('CRITICAL');
      expect(actionPlan.immediate_actions[0].timeline).toMatch(/hours?/);
    });
  });
});

describe('Booking Score API Handler', () => {
  const mockEvent = {
    httpMethod: 'POST',
    body: JSON.stringify({
      artist_name: 'Sabrina Carpenter',
      venue_capacity: 2500,
      target_date: '2024-09-15',
      priority_factors: ['audience_expansion_potential']
    })
  };

  test('should return comprehensive booking analysis', async () => {
    const result = await handler(mockEvent, {});

    expect(result.statusCode).toBe(200);

    const response = JSON.parse(result.body);
    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('booking_score');
    expect(response.metadata).toHaveProperty('analysis_type');
    expect(response.metadata.analysis_type).toBe('comprehensive_booking_recommendation');
    expect(response.metadata.confidence_metrics).toHaveProperty('recommendation_reliability');
  });

  test('should handle missing artist_name parameter', async () => {
    const invalidEvent = {
      ...mockEvent,
      body: JSON.stringify({ venue_capacity: 2000 })
    };

    const result = await handler(invalidEvent, {});

    expect(result.statusCode).toBe(400);
    const response = JSON.parse(result.body);
    expect(response.error).toBe('artist_name is required');
    expect(response.example).toHaveProperty('artist_name');
  });

  test('should handle server errors gracefully', async () => {
    // Mock a scenario that would cause an error
    const invalidEvent = {
      ...mockEvent,
      body: 'invalid json'
    };

    const result = await handler(invalidEvent, {});

    expect(result.statusCode).toBe(500);
    const response = JSON.parse(result.body);
    expect(response.error).toBe('Failed to generate booking score');
    expect(response).toHaveProperty('timestamp');
  });
});
