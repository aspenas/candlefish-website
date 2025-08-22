import { NextRequest, NextResponse } from 'next/server'
import { AgentNetwork } from '@/types/agent'

export async function GET(request: NextRequest) {
  try {
    // Try to fetch from NANDA registry first
    const registryUrl = process.env.NANDA_REGISTRY_URL || 'https://nanda-registry.candlefish.ai:8000'
    
    try {
      const response = await fetch(`${registryUrl}/network/metrics`, {
        headers: {
          'Content-Type': 'application/json',
        },
        next: { revalidate: 30 } // Cache for 30 seconds
      })

      if (response.ok) {
        const data = await response.json()
        return NextResponse.json(data)
      }
    } catch (registryError) {
      console.log('Network metrics not available from registry:', registryError)
    }

    // Try to aggregate from multiple sources
    const [paintboxAgents, pkbStatus] = await Promise.allSettled([
      fetchPaintboxAgents(),
      fetchPKBStatus()
    ])

    let totalAgents = 0
    let onlineAgents = 0
    let totalRequests = 0
    let totalErrors = 0
    let responseTimes: number[] = []

    // Count Paintbox agents
    if (paintboxAgents.status === 'fulfilled' && paintboxAgents.value) {
      const agents = paintboxAgents.value
      totalAgents += agents.length
      onlineAgents += agents.filter((a: any) => a.status === 'online').length
      
      agents.forEach((agent: any) => {
        if (agent.metrics) {
          totalRequests += agent.metrics.requestsPerMinute * 60 || 0 // Convert to hourly
          totalErrors += agent.metrics.errorsPerHour || 0
          if (agent.metrics.responseTime > 0) {
            responseTimes.push(agent.metrics.responseTime)
          }
        }
      })
    }

    // Count PKB agent
    if (pkbStatus.status === 'fulfilled' && pkbStatus.value) {
      totalAgents += 1
      onlineAgents += pkbStatus.value.status === 'active' ? 1 : 0
      // PKB doesn't have traditional request metrics, but we can estimate
      totalRequests += 50 // Estimated based on cognitive activities
      responseTimes.push(120) // Estimated response time for cognitive operations
    }

    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0

    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0
    const networkHealth = calculateNetworkHealth(onlineAgents, totalAgents, errorRate, averageResponseTime)

    const networkMetrics: AgentNetwork = {
      totalAgents,
      onlineAgents,
      networkHealth,
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime),
      errorRate: Number(errorRate.toFixed(2)),
      lastUpdate: new Date().toISOString()
    }

    return NextResponse.json(networkMetrics, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Total-Agents': totalAgents.toString(),
        'X-Online-Agents': onlineAgents.toString(),
        'X-Network-Health': networkHealth.toFixed(1),
      }
    })

  } catch (error) {
    console.error('Failed to fetch network metrics:', error)
    
    // Return fallback metrics
    const fallbackMetrics: AgentNetwork = {
      totalAgents: 2,
      onlineAgents: 1,
      networkHealth: 50.0,
      totalRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      lastUpdate: new Date().toISOString()
    }

    return NextResponse.json(fallbackMetrics, { status: 503 })
  }
}

async function fetchPaintboxAgents() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/agents/paintbox`, {
      next: { revalidate: 10 }
    })
    
    if (response.ok) {
      return await response.json()
    }
  } catch (error) {
    console.log('Failed to fetch Paintbox agents for metrics:', error)
  }
  
  return null
}

async function fetchPKBStatus() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/agents/pkb-cognitive`, {
      next: { revalidate: 10 }
    })
    
    if (response.ok) {
      return await response.json()
    }
  } catch (error) {
    console.log('Failed to fetch PKB status for metrics:', error)
  }
  
  return null
}

function calculateNetworkHealth(onlineAgents: number, totalAgents: number, errorRate: number, averageResponseTime: number): number {
  if (totalAgents === 0) return 0

  // Base health from agent availability
  const availabilityScore = (onlineAgents / totalAgents) * 100

  // Penalize for high error rates
  const errorPenalty = Math.min(errorRate * 2, 20) // Max 20% penalty

  // Penalize for slow response times
  const responsePenalty = Math.min(Math.max(0, (averageResponseTime - 200) / 10), 20) // Max 20% penalty

  const health = Math.max(0, availabilityScore - errorPenalty - responsePenalty)

  return Number(health.toFixed(1))
}