import { NextRequest, NextResponse } from 'next/server'
import { PKBCognitiveStatus } from '@/types/agent'

export async function GET(request: NextRequest) {
  try {
    // Try to fetch from PKB Cognitive Extension
    try {
      const pkbResponse = await fetch('https://pkb-cognitive.candlefish.ai/api/status', {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'NANDA-Dashboard/1.0'
        },
        next: { revalidate: 15 } // Cache for 15 seconds
      })

      if (pkbResponse.ok) {
        const data = await pkbResponse.json()
        return NextResponse.json(data)
      }
    } catch (error) {
      console.log('PKB Cognitive Extension not available:', error)
    }

    // Try local PKB agent if available
    try {
      const localResponse = await fetch('http://localhost:7100/status', {
        headers: {
          'Content-Type': 'application/json',
        },
        next: { revalidate: 10 }
      })

      if (localResponse.ok) {
        const data = await localResponse.json()
        return NextResponse.json(data)
      }
    } catch (error) {
      console.log('Local PKB agent not available:', error)
    }

    // Generate realistic mock data with some variability
    const baseTime = Date.now()
    const mockStatus: PKBCognitiveStatus = {
      agentId: 'pkb-cognitive-7aad5269',
      status: Math.random() > 0.1 ? 'active' : Math.random() > 0.5 ? 'processing' : 'idle',
      memoryModules: {
        episodic: 85.3 + Math.random() * 10 - 5,  // Vary by ±5%
        semantic: 92.1 + Math.random() * 6 - 3,   // Vary by ±3%
        working: 67.8 + Math.random() * 20 - 10,  // Vary by ±10%
        procedural: 88.9 + Math.random() * 8 - 4  // Vary by ±4%
      },
      cognitiveLoad: 34.2 + Math.random() * 30 - 15, // Vary by ±15%
      learningRate: Math.max(0.1, Math.min(1.0, 0.78 + Math.random() * 0.4 - 0.2)), // Keep in bounds
      knowledgeBase: {
        totalConcepts: 15847 + Math.floor(Math.random() * 200 - 100),
        recentlyLearned: Math.floor(23 + Math.random() * 20),
        connections: 89321 + Math.floor(Math.random() * 1000 - 500)
      },
      lastInteraction: new Date(baseTime - Math.random() * 300000).toISOString(), // Up to 5 minutes ago
      performanceMetrics: {
        reasoning: 94.2 + Math.random() * 8 - 4,
        creativity: 87.5 + Math.random() * 10 - 5,
        problemSolving: 91.8 + Math.random() * 6 - 3,
        adaptability: 89.3 + Math.random() * 12 - 6
      }
    }

    // Simulate some realistic correlations
    if (mockStatus.status === 'processing') {
      mockStatus.cognitiveLoad = Math.min(90, mockStatus.cognitiveLoad + 20)
      mockStatus.memoryModules.working = Math.min(95, mockStatus.memoryModules.working + 15)
      mockStatus.lastInteraction = new Date(baseTime - Math.random() * 60000).toISOString() // More recent
    }

    if (mockStatus.status === 'idle') {
      mockStatus.cognitiveLoad = Math.max(5, mockStatus.cognitiveLoad - 15)
      mockStatus.lastInteraction = new Date(baseTime - Math.random() * 600000).toISOString() // Up to 10 minutes ago
    }

    // Ensure all percentages are within bounds
    mockStatus.memoryModules.episodic = Math.max(0, Math.min(100, mockStatus.memoryModules.episodic))
    mockStatus.memoryModules.semantic = Math.max(0, Math.min(100, mockStatus.memoryModules.semantic))
    mockStatus.memoryModules.working = Math.max(0, Math.min(100, mockStatus.memoryModules.working))
    mockStatus.memoryModules.procedural = Math.max(0, Math.min(100, mockStatus.memoryModules.procedural))
    
    mockStatus.performanceMetrics.reasoning = Math.max(0, Math.min(100, mockStatus.performanceMetrics.reasoning))
    mockStatus.performanceMetrics.creativity = Math.max(0, Math.min(100, mockStatus.performanceMetrics.creativity))
    mockStatus.performanceMetrics.problemSolving = Math.max(0, Math.min(100, mockStatus.performanceMetrics.problemSolving))
    mockStatus.performanceMetrics.adaptability = Math.max(0, Math.min(100, mockStatus.performanceMetrics.adaptability))

    return NextResponse.json(mockStatus, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Data-Source': 'mock',
        'X-Agent-Status': mockStatus.status,
      }
    })

  } catch (error) {
    console.error('Failed to fetch PKB Cognitive status:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch PKB Cognitive status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}