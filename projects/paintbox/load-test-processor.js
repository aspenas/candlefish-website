// Artillery Load Test Processor for Paintbox
// Custom functions for advanced load testing scenarios

const crypto = require('crypto');

// Generate realistic test data
function generateTestData() {
  return {
    generateProjectId: () => {
      return `PROJ-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    },

    generateClientData: () => {
      const firstNames = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana'];
      const lastNames = ['Smith', 'Johnson', 'Brown', 'Davis', 'Wilson', 'Moore'];
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

      return {
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        phone: `555-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
        address: {
          street: `${Math.floor(Math.random() * 9999)} Main St`,
          city: 'Seattle',
          state: 'WA',
          zip: '98101'
        }
      };
    },

    generateMeasurements: () => {
      return {
        exterior: {
          sqft: Math.floor(Math.random() * 2000) + 1000,
          stories: Math.floor(Math.random() * 2) + 1,
          siding: ['wood', 'vinyl', 'brick', 'stucco'][Math.floor(Math.random() * 4)],
          trim: Math.floor(Math.random() * 500) + 100,
          shutters: Math.floor(Math.random() * 20) + 0,
          doors: Math.floor(Math.random() * 5) + 2,
          windows: Math.floor(Math.random() * 30) + 10,
          garage: Math.floor(Math.random() * 3) + 0
        },
        interior: {
          rooms: Math.floor(Math.random() * 10) + 5,
          sqft: Math.floor(Math.random() * 3000) + 1500,
          ceilings: Math.floor(Math.random() * 2) + 8,
          walls: Math.floor(Math.random() * 6000) + 3000,
          trim: Math.floor(Math.random() * 1000) + 500,
          doors: Math.floor(Math.random() * 30) + 15,
          closets: Math.floor(Math.random() * 10) + 3
        }
      };
    },

    generateExcelFormula: () => {
      const formulas = [
        '=SUM(A1:A10)',
        '=AVERAGE(B1:B20)',
        '=IF(C1>100,"High","Low")',
        '=VLOOKUP(D1,Sheet2!A:B,2,FALSE)',
        '=SUMIF(E:E,">1000",F:F)',
        '=CONCATENATE(G1," - ",H1)',
        '=COUNT(I:I)',
        '=MAX(J1:J100)',
        '=MIN(K1:K100)',
        '=ROUND(L1*1.25,2)'
      ];
      return formulas[Math.floor(Math.random() * formulas.length)];
    }
  };
}

// Before request hook
function beforeRequest(requestParams, context, ee, next) {
  // Add timestamp for tracking
  requestParams.headers = requestParams.headers || {};
  requestParams.headers['X-Load-Test-ID'] = crypto.randomBytes(16).toString('hex');
  requestParams.headers['X-Load-Test-Timestamp'] = Date.now().toString();

  // Add correlation ID for distributed tracing
  context.vars.correlationId = crypto.randomBytes(8).toString('hex');
  requestParams.headers['X-Correlation-ID'] = context.vars.correlationId;

  // Generate test data if needed
  const testData = generateTestData();
  context.vars.projectId = context.vars.projectId || testData.generateProjectId();
  context.vars.clientData = context.vars.clientData || testData.generateClientData();
  context.vars.measurements = context.vars.measurements || testData.generateMeasurements();
  context.vars.formula = context.vars.formula || testData.generateExcelFormula();

  return next();
}

// After response hook
function afterResponse(requestParams, response, context, ee, next) {
  // Track performance metrics
  const responseTime = response.timings && response.timings.phases ? response.timings.phases.total : 0;

  // Custom metrics based on endpoint
  if (requestParams.url.includes('/calculations')) {
    ee.emit('counter', 'custom.calculations.total', 1);
    if (responseTime > 100) {
      ee.emit('counter', 'custom.calculations.slow', 1);
    }
  } else if (requestParams.url.includes('/estimates')) {
    ee.emit('counter', 'custom.estimates.total', 1);
    if (response.statusCode === 201) {
      ee.emit('counter', 'custom.estimates.created', 1);
    }
  } else if (requestParams.url.includes('/pdf')) {
    ee.emit('counter', 'custom.pdf.total', 1);
    ee.emit('histogram', 'custom.pdf.response_time', responseTime);
  } else if (requestParams.url.includes('/salesforce')) {
    ee.emit('counter', 'custom.salesforce.total', 1);
    if (response.statusCode >= 500) {
      ee.emit('counter', 'custom.salesforce.errors', 1);
    }
  }

  // Track error rates by status code
  if (response.statusCode >= 400) {
    ee.emit('counter', `custom.errors.${response.statusCode}`, 1);
  }

  // Log slow responses
  if (responseTime > 2000) {
    console.log(`[SLOW] ${requestParams.method} ${requestParams.url}: ${responseTime}ms`);
  }

  // Check for security headers
  const securityHeaders = [
    'x-frame-options',
    'x-content-type-options',
    'x-xss-protection',
    'content-security-policy',
    'strict-transport-security'
  ];

  let missingHeaders = [];
  securityHeaders.forEach(header => {
    if (!response.headers[header]) {
      missingHeaders.push(header);
    }
  });

  if (missingHeaders.length > 0) {
    ee.emit('counter', 'custom.security.missing_headers', missingHeaders.length);
  }

  // Track cache hits/misses
  if (response.headers['x-cache']) {
    const cacheStatus = response.headers['x-cache'].toLowerCase();
    if (cacheStatus.includes('hit')) {
      ee.emit('counter', 'custom.cache.hits', 1);
    } else if (cacheStatus.includes('miss')) {
      ee.emit('counter', 'custom.cache.misses', 1);
    }
  }

  // Track rate limiting
  if (response.headers['x-ratelimit-remaining']) {
    const remaining = parseInt(response.headers['x-ratelimit-remaining']);
    if (remaining < 10) {
      ee.emit('counter', 'custom.ratelimit.near_limit', 1);
    }
  }

  return next();
}

// Custom function to validate calculation results
function validateCalculation(context, events, done) {
  const expectedResult = context.vars.expectedResult;
  const actualResult = context.vars.calculationResult;

  if (expectedResult && actualResult) {
    const difference = Math.abs(expectedResult - actualResult);
    const tolerance = 0.01; // 1 cent tolerance for financial calculations

    if (difference > tolerance) {
      console.error(`Calculation mismatch: Expected ${expectedResult}, got ${actualResult}`);
      context.vars.calculationValid = false;
    } else {
      context.vars.calculationValid = true;
    }
  }

  return done();
}

// WebSocket message handler
function handleWebSocketMessage(data, ws, context) {
  try {
    const message = JSON.parse(data);

    // Track message types
    context.ee.emit('counter', `custom.websocket.messages.${message.type}`, 1);

    // Handle specific message types
    switch (message.type) {
      case 'calculation_result':
        context.vars.lastCalculationResult = message.result;
        context.ee.emit('histogram', 'custom.websocket.calculation_time', message.processingTime || 0);
        break;

      case 'error':
        context.ee.emit('counter', 'custom.websocket.errors', 1);
        console.error(`WebSocket error: ${message.error}`);
        break;

      case 'ping':
        // Respond to ping with pong
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;
    }
  } catch (error) {
    console.error('Failed to parse WebSocket message:', error);
    context.ee.emit('counter', 'custom.websocket.parse_errors', 1);
  }
}

// Generate realistic Excel context data
function generateExcelContext(context, events, done) {
  const cells = {};
  const rows = 100;
  const cols = 10;

  // Generate random data for cells
  for (let row = 1; row <= rows; row++) {
    for (let col = 0; col < cols; col++) {
      const colLetter = String.fromCharCode(65 + col); // A, B, C, etc.
      const cellRef = `${colLetter}${row}`;
      cells[cellRef] = Math.floor(Math.random() * 1000);
    }
  }

  context.vars.excelContext = cells;
  return done();
}

// Stress test function for sustained load
function sustainedLoadTest(context, events, done) {
  const duration = 60000; // 1 minute
  const requestsPerSecond = 100;
  const interval = 1000 / requestsPerSecond;

  let count = 0;
  const startTime = Date.now();

  const intervalId = setInterval(() => {
    if (Date.now() - startTime > duration) {
      clearInterval(intervalId);
      console.log(`Sustained load test completed: ${count} requests sent`);
      return done();
    }

    // Emit custom metric
    context.ee.emit('counter', 'custom.sustained_load.requests', 1);
    count++;
  }, interval);
}

// Export all functions
module.exports = {
  beforeRequest,
  afterResponse,
  validateCalculation,
  handleWebSocketMessage,
  generateExcelContext,
  sustainedLoadTest,
  generateTestData
};
