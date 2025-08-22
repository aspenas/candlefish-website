import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'NANDA Monitoring | Candlefish Research',
  description: 'Comprehensive monitoring system for NANDA index operations',
}

export default function NANDAMonitoringPage() {
  return (
    <div className="min-h-screen bg-atelier-canvas">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-bold text-ink-primary mb-6">
            NANDA Monitoring
          </h1>

          <div className="prose prose-lg">
            <p className="lead">
              Real-time operational monitoring for the NANDA index system,
              providing comprehensive visibility into system health, performance
              metrics, and operational status.
            </p>

            <h2>Key Metrics</h2>
            <ul>
              <li>Request latency (p50, p95, p99)</li>
              <li>Throughput and error rates</li>
              <li>Database connection pool status</li>
              <li>Cache hit ratios</li>
              <li>WebSocket connection counts</li>
            </ul>

            <h2>Documentation</h2>
            <p>
              For detailed monitoring documentation and setup instructions, see the{' '}
              <Link href="/docs/monitoring/nanda-monitoring" className="text-operation-active hover:underline">
                NANDA Monitoring Guide
              </Link>.
            </p>

            <h2>Health Endpoints</h2>
            <pre className="bg-material-concrete p-4 rounded">
{`GET /api/health          # Basic health check
GET /api/health/detailed # Detailed system status
GET /api/metrics         # Prometheus metrics`}
            </pre>

            <h2>SLO Targets</h2>
            <ul>
              <li>Availability: 99.9% uptime</li>
              <li>Latency: p95 &lt; 200ms</li>
              <li>Error Rate: &lt; 0.1%</li>
            </ul>
          </div>

          <div className="mt-8 flex gap-4">
            <Link
              href="/research"
              className="px-4 py-2 bg-material-concrete text-ink-primary rounded hover:bg-opacity-80"
            >
              ← Back to Research
            </Link>
            <Link
              href="/docs/monitoring/nanda-monitoring"
              className="px-4 py-2 bg-operation-active text-white rounded hover:bg-opacity-90"
            >
              View Full Documentation →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
