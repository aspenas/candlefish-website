import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()

    // Check system health
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'NANDA Web Dashboard',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)
      },
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version
      },
      network: {
        port: process.env.PORT || 3000,
        hostname: process.env.HOSTNAME || 'localhost'
      },
      responseTime: Date.now() - startTime
    }

    // Add consciousness state indicator
    const consciousnessState = {
      state: 'aware',
      networkConnections: await checkNetworkConnections(),
      agentRegistryStatus: await checkAgentRegistry(),
      distributedMeshActive: true
    }

    const healthWithConsciousness = {
      ...health,
      consciousness: consciousnessState
    }

    return NextResponse.json(healthWithConsciousness, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Service': 'NANDA-Dashboard',
        'X-Health-Status': health.status,
        'X-Response-Time': health.responseTime.toString(),
      }
    })

  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'NANDA Web Dashboard',
        error: error instanceof Error ? error.message : 'Unknown error',
        consciousness: {
          state: 'disconnected',
          networkConnections: false,
          agentRegistryStatus: 'unavailable'
        }
      },
      { 
        status: 503,
        headers: {
          'X-Service': 'NANDA-Dashboard',
          'X-Health-Status': 'unhealthy'
        }
      }
    )
  }
}

async function checkNetworkConnections(): Promise<boolean> {
  try {
    // Quick check of key services
    const checks = [
      checkService('https://paintbox.fly.dev/api/health'),
      checkService('https://paintbox-staging.fly.dev/api/health')
    ]

    const results = await Promise.allSettled(checks)
    const successCount = results.filter(r => r.status === 'fulfilled').length
    
    return successCount > 0
  } catch {
    return false
  }
}

async function checkAgentRegistry(): Promise<string> {
  try {
    const registryUrl = process.env.NANDA_REGISTRY_URL
    if (!registryUrl) return 'not-configured'

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000)
    
    const response = await fetch(`${registryUrl}/health`, {
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)

    return response.ok ? 'available' : 'degraded'
  } catch {
    return 'unavailable'
  }
}

async function checkService(url: string, timeout: number = 2000): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'NANDA-Health-Check/1.0' }
    })

    clearTimeout(timeoutId)
    return response.ok
  } catch {
    return false
  }
}