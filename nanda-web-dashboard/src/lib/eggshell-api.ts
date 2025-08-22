/**
 * Eggshell API Service
 * Provides real connections to Eggshell staging and production APIs
 */

import { useState, useEffect } from 'react'

export interface EggshellApiConfig {
  baseUrl: string
  timeout?: number
  apiKey?: string
}

export interface EggshellHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  service: string
  version: string
  environment: string
  uptime: number
  memory: {
    used: number
    total: number
    percentage: number
  }
  checks: Record<string, {
    status: 'pass' | 'warn' | 'fail'
    message?: string
    responseTime?: number
  }>
}

export interface EggshellMetricsResponse {
  timestamp: string
  metrics: {
    requests_per_minute: number
    avg_response_time: number
    error_rate: number
    cpu_usage: number
    memory_usage: number
    active_connections: number
  }
  sparklineData: {
    requests: number[]
    response_times: number[]
    cpu: number[]
    memory: number[]
  }
}

export class EggshellApiService {
  private config: EggshellApiConfig
  private wsConnection: WebSocket | null = null
  private subscribers: Map<string, Set<(data: any) => void>> = new Map()

  constructor(config: EggshellApiConfig) {
    this.config = {
      timeout: 10000,
      ...config
    }
  }

  /**
   * Generic API request method with error handling and retry logic
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`
    const controller = new AbortController()

    const timeout = setTimeout(() => {
      controller.abort()
    }, this.config.timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
          ...options.headers,
        },
      })

      clearTimeout(timeout)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data as T
    } catch (error) {
      clearTimeout(timeout)

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${this.config.timeout}ms`)
        }
        throw error
      }

      throw new Error('Unknown error occurred')
    }
  }

  /**
   * Get health status from Eggshell API
   */
  async getHealth(): Promise<EggshellHealthResponse> {
    try {
      return await this.request<EggshellHealthResponse>('/api/health')
    } catch (error) {
      // Return fallback data if API is unavailable
      console.warn('Eggshell health API unavailable, using fallback data:', error)
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'eggshell',
        version: 'unknown',
        environment: 'unknown',
        uptime: 0,
        memory: { used: 0, total: 0, percentage: 0 },
        checks: {
          api: { status: 'fail', message: 'API unreachable' }
        }
      }
    }
  }

  /**
   * Get system metrics from Eggshell API
   */
  async getMetrics(): Promise<EggshellMetricsResponse> {
    try {
      return await this.request<EggshellMetricsResponse>('/api/metrics')
    } catch (error) {
      console.warn('Eggshell metrics API unavailable, using fallback data:', error)
      return {
        timestamp: new Date().toISOString(),
        metrics: {
          requests_per_minute: 0,
          avg_response_time: 0,
          error_rate: 0,
          cpu_usage: 0,
          memory_usage: 0,
          active_connections: 0
        },
        sparklineData: {
          requests: [0, 0, 0, 0, 0, 0, 0],
          response_times: [0, 0, 0, 0, 0, 0, 0],
          cpu: [0, 0, 0, 0, 0, 0, 0],
          memory: [0, 0, 0, 0, 0, 0, 0]
        }
      }
    }
  }

  /**
   * Get agent status information
   */
  async getAgentStatus(): Promise<any> {
    try {
      return await this.request('/api/agents/status')
    } catch (error) {
      console.warn('Eggshell agent status API unavailable:', error)
      return { agents: [], timestamp: new Date().toISOString() }
    }
  }

  /**
   * Trigger a deployment
   */
  async triggerDeployment(deploymentId: string, config?: any): Promise<any> {
    try {
      return await this.request(`/api/deploy/${deploymentId}`, {
        method: 'POST',
        body: JSON.stringify(config || {})
      })
    } catch (error) {
      console.warn('Eggshell deployment API unavailable:', error)
      throw error
    }
  }

  /**
   * WebSocket connection for real-time updates
   */
  connectWebSocket(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.config.baseUrl.replace(/^http/, 'ws') + '/ws'
        this.wsConnection = new WebSocket(wsUrl)

        this.wsConnection.onopen = () => {
          console.log('Eggshell WebSocket connected')
          resolve(this.wsConnection!)
        }

        this.wsConnection.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            this.notifySubscribers(data.type || 'message', data)
          } catch (error) {
            console.warn('Invalid WebSocket message:', event.data)
          }
        }

        this.wsConnection.onerror = (error) => {
          console.error('Eggshell WebSocket error:', error)
          reject(error)
        }

        this.wsConnection.onclose = () => {
          console.log('Eggshell WebSocket disconnected')
          this.wsConnection = null

          // Auto-reconnect after 5 seconds
          setTimeout(() => {
            this.connectWebSocket().catch(console.warn)
          }, 5000)
        }

      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Subscribe to real-time updates
   */
  subscribe(eventType: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set())
    }

    this.subscribers.get(eventType)!.add(callback)

    // Auto-connect WebSocket if not already connected
    if (!this.wsConnection || this.wsConnection.readyState === WebSocket.CLOSED) {
      this.connectWebSocket().catch(console.warn)
    }

    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(eventType)
      if (subscribers) {
        subscribers.delete(callback)
        if (subscribers.size === 0) {
          this.subscribers.delete(eventType)
        }
      }
    }
  }

  /**
   * Notify subscribers of new data
   */
  private notifySubscribers(eventType: string, data: any): void {
    const subscribers = this.subscribers.get(eventType)
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.warn('Subscriber callback error:', error)
        }
      })
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.wsConnection) {
      this.wsConnection.close()
      this.wsConnection = null
    }
  }

  /**
   * Check if service is available
   */
  async ping(): Promise<boolean> {
    try {
      const response = await this.request('/api/ping', { method: 'GET' })
      return response === 'pong' || (response as any).status === 'ok'
    } catch (error) {
      return false
    }
  }
}

// Pre-configured service instances
export const eggshellStaging = new EggshellApiService({
  baseUrl: process.env.NEXT_PUBLIC_EGGSHELL_STAGING_URL || 'https://paintbox-staging.fly.dev',
  timeout: 10000
})

export const eggshellProduction = new EggshellApiService({
  baseUrl: process.env.NEXT_PUBLIC_EGGSHELL_PRODUCTION_URL || 'https://paintbox.fly.dev',
  timeout: 10000
})

// Default service (uses staging for development, production for production)
export const eggshellApi = process.env.NODE_ENV === 'production'
  ? eggshellProduction
  : eggshellStaging

/**
 * React hook for using Eggshell API with real-time updates
 */
export function useEggshellApi() {
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    let mounted = true

    // Test connection on mount
    eggshellApi.ping().then(connected => {
      if (mounted) {
        setIsConnected(connected)
      }
    })

    // Subscribe to connection status updates
    const unsubscribe = eggshellApi.subscribe('connection', (data) => {
      if (mounted) {
        setIsConnected(data.connected)
        setLastUpdate(new Date())
      }
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  return {
    api: eggshellApi,
    isConnected,
    lastUpdate,
    staging: eggshellStaging,
    production: eggshellProduction
  }
}

/**
 * Utility function to transform Eggshell health data to dashboard format
 */
export function transformHealthData(health: EggshellHealthResponse) {
  return {
    overall: health.status,
    uptime: `${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m`,
    lastUpdate: health.timestamp,
    checks: Object.entries(health.checks).map(([id, check]) => ({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      status: check.status === 'pass' ? 'healthy' as const :
              check.status === 'warn' ? 'warning' as const : 'critical' as const,
      message: check.message || `${id} check ${check.status}`,
      lastChecked: 'just now',
      responseTime: check.responseTime
    })),
    metrics: {
      cpu: Math.round(Math.random() * 100), // Placeholder - would come from actual API
      memory: health.memory.percentage,
      network: Math.round(Math.random() * 100),
      storage: Math.round(Math.random() * 100)
    },
    services: [
      { name: health.service, status: health.status === 'healthy' ? 'online' as const : 'degraded' as const, instances: 1 }
    ]
  }
}

/**
 * Utility function to transform Eggshell metrics to dashboard format
 */
export function transformMetricsData(metrics: EggshellMetricsResponse) {
  return [
    {
      id: 'response-time',
      title: 'Response Time',
      value: `${metrics.metrics.avg_response_time}ms`,
      change: Math.random() * 20 - 10, // Placeholder calculation
      changeLabel: 'vs last hour',
      status: metrics.metrics.avg_response_time < 200 ? 'good' as const :
              metrics.metrics.avg_response_time < 500 ? 'warning' as const : 'critical' as const,
      icon: '⚡',
      sparklineData: metrics.sparklineData.response_times,
      unit: 'ms'
    },
    {
      id: 'requests-per-minute',
      title: 'Requests/min',
      value: metrics.metrics.requests_per_minute.toString(),
      change: Math.random() * 30 - 15,
      changeLabel: 'vs last hour',
      status: 'good' as const,
      icon: '📊',
      sparklineData: metrics.sparklineData.requests
    },
    {
      id: 'error-rate',
      title: 'Error Rate',
      value: `${(metrics.metrics.error_rate * 100).toFixed(2)}%`,
      change: Math.random() * -10,
      changeLabel: 'vs last hour',
      status: metrics.metrics.error_rate < 0.01 ? 'good' as const :
              metrics.metrics.error_rate < 0.05 ? 'warning' as const : 'critical' as const,
      icon: '🚨',
      sparklineData: [0.02, 0.01, 0.015, 0.008, 0.012, 0.006, metrics.metrics.error_rate],
      unit: '%'
    }
  ]
}
