const { Handler } = require('@netlify/functions');

exports.handler = async (event, context) => {
  // Enforce strict CORS allowlist and security headers
  const allowedOriginsEnv = process.env.CORS_ORIGINS || '';
  const nodeEnv = process.env.NODE_ENV || process.env.CONTEXT || 'development';
  const defaultProd = [
    'https://candlefish.ai',
    'https://www.candlefish.ai',
    'https://dashboard.candlefish.ai',
  ];
  const allowedOrigins = (allowedOriginsEnv
    ? allowedOriginsEnv.split(',').map((o) => o.trim()).filter(Boolean)
    : (nodeEnv === 'production' ? defaultProd : ['*'])
  );
  const origin = event.headers.origin || event.headers.Origin;
  const corsOrigin = allowedOrigins.includes('*')
    ? '*'
    : (allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || 'https://candlefish.ai');

  const headers = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'X-Request-ID': context.awsRequestId
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const queryParams = event.queryStringParameters || {};
    const period = queryParams.period || '24h';
    const pageUrl = queryParams.page_url;

    // Mock aggregated performance data
    const mockAverages = {
      fcp: Math.floor(Math.random() * 1000) + 1500,
      lcp: Math.floor(Math.random() * 1500) + 2500,
      fid: Math.floor(Math.random() * 50) + 75,
      cls: (Math.random() * 0.2 + 0.1).toFixed(3),
      ttfb: Math.floor(Math.random() * 200) + 300,
      dom_content_loaded: Math.floor(Math.random() * 500) + 1000,
      load_complete: Math.floor(Math.random() * 1000) + 2000
    };

    // Calculate performance score
    const calculatePerformanceScore = (averages) => {
      let overall = 100;
      const scores = {};

      // FCP scoring
      if (averages.fcp) {
        const fcpScore = Math.max(0, Math.min(100, 100 - (averages.fcp - 1800) / 30));
        scores.fcp = Math.round(fcpScore * 100) / 100;
        overall -= (100 - fcpScore) * 0.15;
      }

      // LCP scoring
      if (averages.lcp) {
        const lcpScore = Math.max(0, Math.min(100, 100 - (averages.lcp - 2500) / 40));
        scores.lcp = Math.round(lcpScore * 100) / 100;
        overall -= (100 - lcpScore) * 0.25;
      }

      // FID scoring
      if (averages.fid) {
        const fidScore = Math.max(0, Math.min(100, 100 - (averages.fid - 100) / 3));
        scores.fid = Math.round(fidScore * 100) / 100;
        overall -= (100 - fidScore) * 0.40;
      }

      // CLS scoring
      if (averages.cls) {
        const clsScore = Math.max(0, Math.min(100, 100 - (parseFloat(averages.cls) - 0.1) * 400));
        scores.cls = Math.round(clsScore * 100) / 100;
        overall -= (100 - clsScore) * 0.20;
      }

      const finalScore = Math.round(Math.max(0, overall) * 100) / 100;
      let grade = 'F';
      if (finalScore >= 90) grade = 'A';
      else if (finalScore >= 80) grade = 'B';
      else if (finalScore >= 70) grade = 'C';
      else if (finalScore >= 60) grade = 'D';

      return {
        overall: finalScore,
        metrics: scores,
        grade: grade
      };
    };

    const performanceScore = calculatePerformanceScore(mockAverages);

    // Generate recommendations
    const recommendations = [];
    if (mockAverages.fcp > 3000) {
      recommendations.push("First Contentful Paint is slow. Consider optimizing server response time and reducing render-blocking resources.");
    }
    if (mockAverages.lcp > 4000) {
      recommendations.push("Largest Contentful Paint needs improvement. Optimize images, preload critical resources, and minimize JavaScript execution time.");
    }
    if (mockAverages.fid > 300) {
      recommendations.push("First Input Delay is high. Break up long JavaScript tasks and optimize event handlers.");
    }
    if (parseFloat(mockAverages.cls) > 0.25) {
      recommendations.push("Cumulative Layout Shift is poor. Add size attributes to images and avoid inserting content above existing content.");
    }
    if (!recommendations.length) {
      recommendations.push("Performance metrics are within acceptable ranges. Continue monitoring for regressions.");
    }

    const response = {
      status: 'success',
      period: period,
      page_url: pageUrl,
      metrics: {
        averages: mockAverages,
        count: Math.floor(Math.random() * 1000) + 100,
        percentiles: {
          p50: Math.floor(mockAverages.fcp * 0.8),
          p75: Math.floor(mockAverages.fcp * 0.9),
          p95: Math.floor(mockAverages.fcp * 1.2)
        }
      },
      performance_score: performanceScore,
      recommendations: recommendations,
      timestamp: new Date().toISOString()
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error('Performance aggregate error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        request_id: context.awsRequestId
      })
    };
  }
};