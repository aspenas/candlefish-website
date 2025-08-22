// Simplified observability setup
export function setupMetrics() {
  return {
    metricsRegistry: {
      metrics: async () => '# HELP nanda_requests_total Total requests\n# TYPE nanda_requests_total counter\nnanda_requests_total 0',
      contentType: 'text/plain; version=0.0.4; charset=utf-8'
    }
  }
}

export function setupTracing() {
  return {
    tracer: {
      startSpan: () => ({ end: () => {} })
    }
  }
}
