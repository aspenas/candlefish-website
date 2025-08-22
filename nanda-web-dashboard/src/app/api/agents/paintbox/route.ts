import { NextRequest, NextResponse } from 'next/server'
import { AgentStatus } from '@/types/agent'

export async function GET(request: NextRequest) {
  try {
    const stagingUrl = process.env.PAINTBOX_STAGING_URL || 'https://paintbox-staging.fly.dev'
    const productionUrl = process.env.PAINTBOX_PRODUCTION_URL || 'https://paintbox.fly.dev'
    
    const agents: AgentStatus[] = []
    
    // Check staging environment
    try {
      const stagingResponse = await fetch(`${stagingUrl}/api/health`, {
        headers: {
          'User-Agent': 'NANDA-Dashboard/1.0',
        },
        next: { revalidate: 30 } // Cache for 30 seconds
      })
      
      if (stagingResponse.ok) {
        const health = await stagingResponse.json()
        agents.push({
          id: 'paintbox-staging-monitor',
          name: 'Paintbox Staging Monitor',
          type: 'monitor',
          status: health.status === 'healthy' ? 'online' : health.status === 'degraded' ? 'warning' : 'offline',
          port: 443,
          uptime: health.uptime || 0,
          lastHeartbeat: new Date().toISOString(),
          purpose: 'Staging environment health monitoring',
          responsibilities: [
            'Monitor staging application health',
            'Track memory usage and optimization',
            'Validate API endpoints',
            'Monitor database connections'
          ],
          metrics: {
            cpuUsage: health.cpu?.usage || 0,
            memoryUsage: health.memory?.used || 0,
            requestsPerMinute: health.requests?.perMinute || 0,
            errorsPerHour: health.errors?.perHour || 0,
            responseTime: health.responseTime || 0,
            successRate: health.successRate || 0,
            tasksCompleted: health.tasks?.completed || 0,
            tasksQueued: health.tasks?.queued || 0,
            customMetrics: {
              memoryPercentage: health.memory?.percentage || 0,
              buildVersion: health.version || 'unknown',
              environment: 'staging'
            }
          },
          location: { host: 'paintbox-staging.fly.dev', region: 'us-east-1' },
          version: health.version || '1.0.0',
          capabilities: ['health-monitoring', 'memory-optimization', 'auto-scaling']
        })
      }
    } catch (error) {
      console.log('Staging environment not available:', error)
      // Add offline agent for staging
      agents.push({
        id: 'paintbox-staging-monitor',
        name: 'Paintbox Staging Monitor',
        type: 'monitor',
        status: 'offline',
        port: 443,
        uptime: 0,
        lastHeartbeat: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
        purpose: 'Staging environment health monitoring',
        responsibilities: [
          'Monitor staging application health',
          'Track memory usage and optimization',
          'Validate API endpoints'
        ],
        metrics: {
          cpuUsage: 0,
          memoryUsage: 0,
          requestsPerMinute: 0,
          errorsPerHour: 0,
          responseTime: 0,
          successRate: 0,
          tasksCompleted: 0,
          tasksQueued: 0
        },
        location: { host: 'paintbox-staging.fly.dev', region: 'us-east-1' },
        version: '1.0.0',
        capabilities: ['health-monitoring']
      })
    }

    // Check production environment
    try {
      const productionResponse = await fetch(`${productionUrl}/api/health`, {
        headers: {
          'User-Agent': 'NANDA-Dashboard/1.0',
        },
        next: { revalidate: 30 }
      })
      
      if (productionResponse.ok) {
        const health = await productionResponse.json()
        agents.push({
          id: 'paintbox-production-monitor',
          name: 'Paintbox Production Monitor',
          type: 'monitor',
          status: health.status === 'healthy' ? 'online' : health.status === 'degraded' ? 'warning' : 'offline',
          port: 443,
          uptime: health.uptime || 0,
          lastHeartbeat: new Date().toISOString(),
          purpose: 'Production environment health monitoring',
          responsibilities: [
            'Monitor production application health',
            'Track memory usage and performance',
            'Validate critical API endpoints',
            'Monitor user experience metrics'
          ],
          metrics: {
            cpuUsage: health.cpu?.usage || 0,
            memoryUsage: health.memory?.used || 0,
            requestsPerMinute: health.requests?.perMinute || 0,
            errorsPerHour: health.errors?.perHour || 0,
            responseTime: health.responseTime || 0,
            successRate: health.successRate || 0,
            tasksCompleted: health.tasks?.completed || 0,
            tasksQueued: health.tasks?.queued || 0,
            customMetrics: {
              memoryPercentage: health.memory?.percentage || 0,
              buildVersion: health.version || 'unknown',
              environment: 'production'
            }
          },
          location: { host: 'paintbox.fly.dev', region: 'us-east-1' },
          version: health.version || '1.0.0',
          capabilities: ['health-monitoring', 'memory-optimization', 'performance-tracking']
        })
      }
    } catch (error) {
      console.log('Production environment not available:', error)
      // Add offline agent for production
      agents.push({
        id: 'paintbox-production-monitor',
        name: 'Paintbox Production Monitor',
        type: 'monitor',
        status: 'offline',
        port: 443,
        uptime: 0,
        lastHeartbeat: new Date(Date.now() - 300000).toISOString(),
        purpose: 'Production environment health monitoring',
        responsibilities: [
          'Monitor production application health',
          'Track memory usage and performance'
        ],
        metrics: {
          cpuUsage: 0,
          memoryUsage: 0,
          requestsPerMinute: 0,
          errorsPerHour: 0,
          responseTime: 0,
          successRate: 0,
          tasksCompleted: 0,
          tasksQueued: 0
        },
        location: { host: 'paintbox.fly.dev', region: 'us-east-1' },
        version: '1.0.0',
        capabilities: ['health-monitoring']
      })
    }

    // Try to fetch from local NANDA deployment logs
    try {
      // Check if we can get more detailed agent information
      const nandaResponse = await fetch('http://localhost:8000/agents', {
        headers: {
          'Content-Type': 'application/json',
        },
        next: { revalidate: 10 }
      })

      if (nandaResponse.ok) {
        const nandaData = await nandaResponse.json()
        // Merge with NANDA agent data if available
        if (nandaData.agents) {
          nandaData.agents.forEach((agent: any) => {
            if (agent.id && agent.id.includes('paintbox')) {
              const existingIndex = agents.findIndex(a => a.id === agent.id)
              if (existingIndex >= 0) {
                // Update existing agent with more detailed data
                agents[existingIndex] = { ...agents[existingIndex], ...agent }
              } else {
                // Add new agent
                agents.push(agent)
              }
            }
          })
        }
      }
    } catch (error) {
      console.log('Local NANDA deployment not available:', error)
    }

    return NextResponse.json(agents, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Agent-Count': agents.length.toString(),
        'X-Online-Count': agents.filter(a => a.status === 'online').length.toString(),
      }
    })
  } catch (error) {
    console.error('Failed to fetch Paintbox agents:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch Paintbox agents',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}