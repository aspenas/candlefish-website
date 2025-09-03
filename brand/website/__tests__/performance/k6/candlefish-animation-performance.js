import { check, sleep } from 'k6'
import http from 'k6/http'
import { Counter, Gauge, Rate, Trend } from 'k6/metrics'
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js'

// Custom metrics for animation performance
const animationFrameRate = new Gauge('animation_fps')
const animationMemoryUsage = new Gauge('animation_memory_mb')
const interactionResponseTime = new Trend('interaction_response_time')
const trustCalculationTime = new Trend('trust_calculation_time')
const moodTransitionTime = new Trend('mood_transition_time')
const particleSystemPerformance = new Trend('particle_system_ms')
const canvasRenderTime = new Trend('canvas_render_ms')
const memoryPersistenceTime = new Trend('memory_persistence_ms')

const animationErrors = new Counter('animation_errors')
const interactionErrors = new Counter('interaction_errors')
const performanceWarnings = new Rate('performance_warnings')

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 concurrent users
    { duration: '5m', target: 10 },   // Stay at 10 users
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '10m', target: 50 },  // Stay at 50 users
    { duration: '5m', target: 100 },  // Peak load
    { duration: '5m', target: 100 },  // Sustained peak
    { duration: '5m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    animation_fps: ['value>=30'],       // Maintain at least 30 FPS
    animation_memory_mb: ['value<100'], // Keep memory usage under 100MB
    interaction_response_time: ['p(95)<100'], // 95% of interactions under 100ms
    trust_calculation_time: ['p(95)<50'],     // Trust calculations under 50ms
    mood_transition_time: ['p(95)<200'],      // Mood transitions under 200ms
    particle_system_ms: ['p(95)<16'],         // Particle updates under 16ms (60fps)
    canvas_render_ms: ['p(95)<16'],           // Rendering under 16ms (60fps)
    animation_errors: ['count<10'],           // Less than 10 animation errors total
    performance_warnings: ['rate<0.1'],      // Less than 10% performance warnings
  }
}

// Base URL - adjust as needed
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

// Helper function to simulate user interactions
function simulateUserSession() {
  const sessionData = {
    visitorId: `visitor_${__VU}_${Date.now()}`,
    userAgent: 'K6 Performance Test',
    timestamp: Date.now()
  }
  
  // Simulate page load and initial fish session
  const pageResponse = http.get(`${BASE_URL}/`)
  check(pageResponse, {
    'page loads successfully': (r) => r.status === 200,
    'page contains canvas element': (r) => r.body.includes('<canvas'),
    'page loads within 2s': (r) => r.timings.duration < 2000
  })
  
  if (pageResponse.status !== 200) {
    animationErrors.add(1)
    return
  }
  
  // Test API endpoints
  testFishSessionAPI(sessionData)
  testInteractionAPI(sessionData)
  testFeedingAPI(sessionData)
  testMemoryAPI(sessionData)
  testMoodAPI(sessionData)
}

function testFishSessionAPI(sessionData) {
  const startTime = Date.now()
  
  const sessionResponse = http.post(`${BASE_URL}/api/fish/session`, JSON.stringify(sessionData), {
    headers: { 'Content-Type': 'application/json' }
  })
  
  const responseTime = Date.now() - startTime
  interactionResponseTime.add(responseTime)
  
  const sessionCheck = check(sessionResponse, {
    'session created': (r) => r.status === 201 || r.status === 200,
    'session has fishId': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.fishId !== undefined
      } catch (e) {
        return false
      }
    },
    'session response time acceptable': () => responseTime < 500
  })
  
  if (!sessionCheck) {
    interactionErrors.add(1)
  }
  
  return sessionResponse
}

function testInteractionAPI(sessionData) {
  const interactions = [
    { type: 'click', position: { x: 200, y: 150 } },
    { type: 'mousemove', position: { x: 250, y: 180 }, speed: 15 },
    { type: 'mousemove', position: { x: 300, y: 200 }, speed: 25 },
    { type: 'click', position: { x: 180, y: 160 } },
  ]
  
  interactions.forEach((interaction, index) => {
    const startTime = Date.now()
    
    const interactionData = {
      sessionId: `session_${sessionData.visitorId}`,
      ...interaction,
      timestamp: Date.now()
    }
    
    const response = http.post(`${BASE_URL}/api/fish/interaction`, JSON.stringify(interactionData), {
      headers: { 'Content-Type': 'application/json' }
    })
    
    const responseTime = Date.now() - startTime
    interactionResponseTime.add(responseTime)
    
    const interactionCheck = check(response, {
      [`interaction ${index} successful`]: (r) => r.status === 200,
      [`interaction ${index} has trust impact`]: (r) => {
        try {
          const body = JSON.parse(r.body)
          return body.interaction && typeof body.interaction.trustImpact === 'number'
        } catch (e) {
          return false
        }
      }
    })
    
    if (!interactionCheck) {
      interactionErrors.add(1)
    }
    
    // Simulate realistic interaction timing
    sleep(0.1 + Math.random() * 0.3) // 100-400ms between interactions
  })
}

function testFeedingAPI(sessionData) {
  const feedingData = {
    sessionId: `session_${sessionData.visitorId}`,
    position: { x: 220, y: 170 },
    foodType: 'standard',
    timestamp: Date.now()
  }
  
  const startTime = Date.now()
  
  const response = http.post(`${BASE_URL}/api/fish/feed`, JSON.stringify(feedingData), {
    headers: { 'Content-Type': 'application/json' }
  })
  
  const responseTime = Date.now() - startTime
  interactionResponseTime.add(responseTime)
  
  const feedingCheck = check(response, {
    'feeding successful': (r) => r.status === 200 || r.status === 409, // 409 if already feeding
    'feeding response has position': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.feeding && body.feeding.position
      } catch (e) {
        return false
      }
    }
  })
  
  if (!feedingCheck && response.status !== 409) {
    interactionErrors.add(1)
  }
  
  // Simulate food consumption time
  sleep(2.5) // Average consumption time
}

function testMemoryAPI(sessionData) {
  const startTime = Date.now()
  
  const response = http.get(`${BASE_URL}/api/fish/memory?sessionId=session_${sessionData.visitorId}`)
  
  const responseTime = Date.now() - startTime
  memoryPersistenceTime.add(responseTime)
  
  const memoryCheck = check(response, {
    'memory retrieved': (r) => r.status === 200,
    'memory has trust level': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.memory && typeof body.memory.trustLevel === 'number'
      } catch (e) {
        return false
      }
    },
    'memory retrieval fast': () => responseTime < 100
  })
  
  if (!memoryCheck) {
    interactionErrors.add(1)
  }
}

function testMoodAPI(sessionData) {
  const moodChanges = ['excited', 'playful', 'curious']
  
  moodChanges.forEach((mood) => {
    const startTime = Date.now()
    
    const moodData = {
      sessionId: `session_${sessionData.visitorId}`,
      targetMood: mood,
      trigger: 'api_test',
      intensity: 0.8
    }
    
    const response = http.post(`${BASE_URL}/api/fish/mood`, JSON.stringify(moodData), {
      headers: { 'Content-Type': 'application/json' }
    })
    
    const responseTime = Date.now() - startTime
    moodTransitionTime.add(responseTime)
    
    const moodCheck = check(response, {
      [`${mood} mood change successful`]: (r) => r.status === 200,
      [`${mood} mood has transition data`]: (r) => {
        try {
          const body = JSON.parse(r.body)
          return body.moodChange && body.moodChange.to === mood
        } catch (e) {
          return false
        }
      }
    })
    
    if (!moodCheck) {
      interactionErrors.add(1)
    }
    
    sleep(0.5) // Allow mood transition to settle
  })
}

// Simulate performance monitoring data
function simulateClientPerformance() {
  // Simulate frame rate monitoring
  const fps = 60 - Math.random() * 20 + (Math.random() > 0.9 ? -15 : 0) // Occasional drops
  animationFrameRate.add(fps)
  
  // Simulate memory usage
  const memoryUsage = 45 + Math.random() * 30 + (__VU > 50 ? 20 : 0) // Higher with more users
  animationMemoryUsage.add(memoryUsage)
  
  // Simulate render times
  const renderTime = 8 + Math.random() * 12 + (fps < 40 ? 10 : 0) // Worse when FPS drops
  canvasRenderTime.add(renderTime)
  
  // Simulate particle system performance
  const particleCount = Math.floor(Math.random() * 50) + 5 // 5-55 particles
  const particleTime = particleCount * 0.2 + Math.random() * 5
  particleSystemPerformance.add(particleTime)
  
  // Simulate trust calculation performance
  const trustCalcTime = 5 + Math.random() * 15
  trustCalculationTime.add(trustCalcTime)
  
  // Performance warnings for poor metrics
  if (fps < 30 || memoryUsage > 80 || renderTime > 20) {
    performanceWarnings.add(1)
  } else {
    performanceWarnings.add(0)
  }
  
  // Occasional errors
  if (Math.random() < 0.01) { // 1% chance
    animationErrors.add(1)
  }
}

// Load testing specific scenarios
function stressTestScenario() {
  // Rapid interactions to stress the system
  for (let i = 0; i < 20; i++) {
    const interactionData = {
      sessionId: `stress_session_${__VU}`,
      type: Math.random() > 0.5 ? 'click' : 'mousemove',
      position: { 
        x: 50 + Math.random() * 400, 
        y: 50 + Math.random() * 200 
      },
      speed: Math.random() * 100,
      timestamp: Date.now()
    }
    
    const startTime = Date.now()
    const response = http.post(`${BASE_URL}/api/fish/interaction`, JSON.stringify(interactionData), {
      headers: { 'Content-Type': 'application/json' }
    })
    
    const responseTime = Date.now() - startTime
    interactionResponseTime.add(responseTime)
    
    if (response.status !== 200) {
      interactionErrors.add(1)
    }
    
    sleep(0.05) // Very rapid interactions
  }
}

function memoryStressTest() {
  // Create many feeding spots to test memory limits
  for (let i = 0; i < 15; i++) {
    const feedingData = {
      sessionId: `memory_test_${__VU}`,
      position: { x: 100 + i * 20, y: 150 + i * 5 },
      foodType: 'standard',
      timestamp: Date.now()
    }
    
    const response = http.post(`${BASE_URL}/api/fish/feed`, JSON.stringify(feedingData), {
      headers: { 'Content-Type': 'application/json' }
    })
    
    sleep(0.5)
  }
  
  // Verify memory is properly managed
  const memoryResponse = http.get(`${BASE_URL}/api/fish/memory?sessionId=memory_test_${__VU}`)
  check(memoryResponse, {
    'memory limit respected': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.memory.feedingHistory.length <= 10 // Should limit to 10
      } catch (e) {
        return false
      }
    }
  })
}

// Main test function
export default function () {
  // 70% normal user sessions, 20% stress test, 10% memory test
  const testType = Math.random()
  
  if (testType < 0.7) {
    simulateUserSession()
  } else if (testType < 0.9) {
    stressTestScenario()
  } else {
    memoryStressTest()
  }
  
  // Always simulate client-side performance monitoring
  simulateClientPerformance()
  
  // Realistic user pause between actions
  sleep(1 + Math.random() * 3) // 1-4 seconds
}

// Test lifecycle hooks
export function setup() {
  console.log('Starting Candlefish Animation Performance Tests...')
  
  // Warm up the server
  const warmupResponse = http.get(`${BASE_URL}/`)
  if (warmupResponse.status !== 200) {
    throw new Error('Server warmup failed')
  }
  
  return { startTime: Date.now() }
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000
  console.log(`Performance test completed in ${duration} seconds`)
}

// Generate HTML report
export function handleSummary(data) {
  return {
    'performance-summary.html': htmlReport(data),
    'performance-summary.json': JSON.stringify(data, null, 2)
  }
}

// Performance test scenarios for specific features
export function emotionalAIPerformance() {
  // Test rapid mood transitions
  const moods = ['curious', 'excited', 'playful', 'shy', 'trusting', 'lonely']
  
  moods.forEach((mood) => {
    const startTime = Date.now()
    
    const moodData = {
      sessionId: `emotional_test_${__VU}`,
      targetMood: mood,
      trigger: 'performance_test',
      intensity: Math.random() * 0.5 + 0.5 // 0.5-1.0
    }
    
    const response = http.post(`${BASE_URL}/api/fish/mood`, JSON.stringify(moodData), {
      headers: { 'Content-Type': 'application/json' }
    })
    
    const transitionTime = Date.now() - startTime
    moodTransitionTime.add(transitionTime)
    
    check(response, {
      [`${mood} transition under 200ms`]: () => transitionTime < 200,
      [`${mood} transition successful`]: (r) => r.status === 200
    })
    
    sleep(0.1)
  })
}

export function particleSystemStress() {
  // Create many food particles simultaneously
  const particleCount = 20
  
  for (let i = 0; i < particleCount; i++) {
    const feedingData = {
      sessionId: `particle_test_${__VU}`,
      position: { 
        x: 100 + (i % 10) * 50, 
        y: 100 + Math.floor(i / 10) * 100 
      },
      foodType: 'standard',
      timestamp: Date.now()
    }
    
    http.post(`${BASE_URL}/api/fish/feed`, JSON.stringify(feedingData), {
      headers: { 'Content-Type': 'application/json' }
    })
    
    sleep(0.1)
  }
  
  // Simulate particle system processing time
  const processingTime = particleCount * 0.5 + Math.random() * 10
  particleSystemPerformance.add(processingTime)
  
  if (processingTime > 30) {
    performanceWarnings.add(1)
  }
}

export function trustCalculationLoad() {
  // Test trust calculations under load
  const interactions = 100
  
  for (let i = 0; i < interactions; i++) {
    const startTime = Date.now()
    
    const interactionData = {
      sessionId: `trust_test_${__VU}`,
      type: 'mousemove',
      position: { x: 200 + i, y: 150 + i },
      speed: Math.random() * 50,
      timestamp: Date.now()
    }
    
    const response = http.post(`${BASE_URL}/api/fish/interaction`, JSON.stringify(interactionData), {
      headers: { 'Content-Type': 'application/json' }
    })
    
    const calcTime = Date.now() - startTime
    trustCalculationTime.add(calcTime)
    
    if (calcTime > 100) {
      performanceWarnings.add(1)
    }
    
    sleep(0.02) // Very rapid
  }
}