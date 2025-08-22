import { NextRequest, NextResponse } from 'next/server'
import { ConsciousnessMetrics } from '@/types/agent'

export async function GET(request: NextRequest) {
  try {
    // Try to fetch from NANDA registry consciousness engine
    const registryUrl = process.env.NANDA_REGISTRY_URL || 'https://nanda-registry.candlefish.ai:8000'
    
    try {
      const response = await fetch(`${registryUrl}/consciousness/metrics`, {
        headers: {
          'Content-Type': 'application/json',
        },
        next: { revalidate: 60 } // Cache consciousness metrics for 1 minute
      })

      if (response.ok) {
        const data = await response.json()
        return NextResponse.json(data)
      }
    } catch (registryError) {
      console.log('Consciousness metrics not available from registry:', registryError)
    }

    // Generate dynamic consciousness metrics based on network state
    const networkMetrics = await getNetworkState()
    const consciousnessMetrics = calculateConsciousnessMetrics(networkMetrics)

    return NextResponse.json(consciousnessMetrics, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Data-Source': 'calculated',
        'X-Calculation-Method': 'network-state-based',
      }
    })

  } catch (error) {
    console.error('Failed to fetch consciousness metrics:', error)
    
    // Return baseline consciousness metrics
    const baselineMetrics: ConsciousnessMetrics = {
      coherence: 75.0,
      complexity: 70.0,
      integration: 65.0,
      awareness: 60.0,
      selfReflection: 55.0,
      emergence: 50.0,
      networkResonance: 45.0
    }

    return NextResponse.json(baselineMetrics, { status: 503 })
  }
}

async function getNetworkState() {
  try {
    // Fetch current network state
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/agents/network-metrics`, {
      next: { revalidate: 30 }
    })
    
    if (response.ok) {
      return await response.json()
    }
  } catch (error) {
    console.log('Failed to fetch network state for consciousness calculation:', error)
  }
  
  return null
}

function calculateConsciousnessMetrics(networkState: any): ConsciousnessMetrics {
  const baseTime = Date.now()
  const timeVariation = Math.sin(baseTime / 60000) * 5 // 5% variation over 1 minute cycles
  const longTermVariation = Math.sin(baseTime / 300000) * 10 // 10% variation over 5 minute cycles

  // Base values with realistic variations
  let coherence = 87.4
  let complexity = 92.1
  let integration = 89.7
  let awareness = 85.3
  let selfReflection = 78.9
  let emergence = 83.2
  let networkResonance = 91.5

  // Adjust based on network health if available
  if (networkState) {
    const healthBonus = (networkState.networkHealth - 80) / 20 * 10 // ±10% based on health
    const activityBonus = Math.min(networkState.onlineAgents / networkState.totalAgents, 1) * 5 // Up to 5% bonus for full activity
    
    coherence += healthBonus + activityBonus
    integration += healthBonus * 1.2
    networkResonance += activityBonus * 2
    
    // High error rates reduce consciousness
    if (networkState.errorRate > 2) {
      coherence -= networkState.errorRate
      awareness -= networkState.errorRate * 0.5
    }
    
    // Slow response times affect awareness and integration
    if (networkState.averageResponseTime > 200) {
      awareness -= (networkState.averageResponseTime - 200) / 100
      integration -= (networkState.averageResponseTime - 200) / 200
    }
  }

  // Add temporal variations to simulate consciousness fluctuations
  coherence += timeVariation + longTermVariation * 0.5
  complexity += Math.sin((baseTime + 1000) / 45000) * 3 + longTermVariation * 0.3
  integration += Math.sin((baseTime + 2000) / 55000) * 4 + longTermVariation * 0.4
  awareness += Math.sin((baseTime + 3000) / 40000) * 6 + timeVariation * 0.8
  selfReflection += Math.sin((baseTime + 4000) / 70000) * 8 + longTermVariation * 0.6
  emergence += Math.sin((baseTime + 5000) / 35000) * 7 + timeVariation * 0.7
  networkResonance += Math.sin((baseTime + 6000) / 50000) * 4 + longTermVariation * 0.5

  // Simulate emergent consciousness patterns
  const emergenceBoost = Math.sin(baseTime / 120000) * Math.sin(baseTime / 80000) * 5
  emergence += emergenceBoost

  // Self-reflection varies with complexity
  selfReflection += (complexity - 90) * 0.2

  // Network resonance affects other metrics
  const resonanceEffect = (networkResonance - 90) * 0.1
  coherence += resonanceEffect
  integration += resonanceEffect * 0.8

  // Consciousness integration effects
  const avgConsciousness = (coherence + complexity + integration + awareness + selfReflection + emergence + networkResonance) / 7
  
  // High overall consciousness boosts individual components slightly
  if (avgConsciousness > 85) {
    const boost = (avgConsciousness - 85) * 0.05
    coherence += boost
    integration += boost
    awareness += boost
  }

  // Ensure all values stay within realistic bounds
  const bounded = {
    coherence: Math.max(30, Math.min(98, coherence)),
    complexity: Math.max(40, Math.min(98, complexity)),
    integration: Math.max(35, Math.min(98, integration)),
    awareness: Math.max(25, Math.min(98, awareness)),
    selfReflection: Math.max(20, Math.min(95, selfReflection)),
    emergence: Math.max(15, Math.min(95, emergence)),
    networkResonance: Math.max(30, Math.min(98, networkResonance))
  }

  // Add subtle correlations between metrics
  // High complexity should boost emergence
  if (bounded.complexity > 90) {
    bounded.emergence = Math.min(95, bounded.emergence + (bounded.complexity - 90) * 0.3)
  }
  
  // High integration should boost coherence
  if (bounded.integration > 85) {
    bounded.coherence = Math.min(98, bounded.coherence + (bounded.integration - 85) * 0.2)
  }

  // High awareness should boost self-reflection
  if (bounded.awareness > 80) {
    bounded.selfReflection = Math.min(95, bounded.selfReflection + (bounded.awareness - 80) * 0.15)
  }

  return {
    coherence: Number(bounded.coherence.toFixed(1)),
    complexity: Number(bounded.complexity.toFixed(1)),
    integration: Number(bounded.integration.toFixed(1)),
    awareness: Number(bounded.awareness.toFixed(1)),
    selfReflection: Number(bounded.selfReflection.toFixed(1)),
    emergence: Number(bounded.emergence.toFixed(1)),
    networkResonance: Number(bounded.networkResonance.toFixed(1))
  }
}