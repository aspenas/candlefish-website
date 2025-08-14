import { EventEmitter } from 'events';

export interface MetricEvent {
  type: string;
  value: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface LLMMetric {
  model: string;
  latency: number;
  tokens: number;
  cost: number;
  timestamp?: Date;
}

export interface WorkflowMetric {
  workflowId: string;
  duration: number;
  status: 'success' | 'failure' | 'timeout';
  steps: number;
  timestamp?: Date;
}

export class MetricsCollector extends EventEmitter {
  private metrics: Map<string, MetricEvent[]> = new Map();
  private aggregates: Map<string, any> = new Map();
  private flushInterval?: NodeJS.Timeout;
  private readonly maxMetricsPerType = 1000;

  constructor() {
    super();
    this.startFlushInterval();
  }

  private startFlushInterval() {
    // Flush metrics to external service every minute
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 60000);
  }

  recordActivity(activity: string, duration: number, metadata?: Record<string, any>) {
    this.recordMetric({
      type: `activity.${activity}`,
      value: duration,
      timestamp: new Date(),
      metadata,
    });

    // Update aggregates
    this.updateAggregate(`activity.${activity}`, duration);
  }

  recordError(operation: string, error: any) {
    this.recordMetric({
      type: `error.${operation}`,
      value: 1,
      timestamp: new Date(),
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    });

    // Increment error counter
    this.incrementCounter(`error.${operation}`);
  }

  recordLLMCall(metric: LLMMetric) {
    this.recordMetric({
      type: 'llm.call',
      value: metric.latency,
      timestamp: metric.timestamp || new Date(),
      metadata: {
        model: metric.model,
        tokens: metric.tokens,
        cost: metric.cost,
      },
    });

    // Update model-specific aggregates
    this.updateAggregate(`llm.${metric.model}.latency`, metric.latency);
    this.updateAggregate(`llm.${metric.model}.tokens`, metric.tokens);
    this.updateAggregate(`llm.${metric.model}.cost`, metric.cost);
  }

  recordWorkflow(metric: WorkflowMetric) {
    this.recordMetric({
      type: 'workflow.execution',
      value: metric.duration,
      timestamp: metric.timestamp || new Date(),
      metadata: {
        workflowId: metric.workflowId,
        status: metric.status,
        steps: metric.steps,
      },
    });

    // Update workflow aggregates
    this.updateAggregate('workflow.duration', metric.duration);
    this.incrementCounter(`workflow.status.${metric.status}`);
  }

  recordTokenUsage(model: string, tokens: number) {
    this.recordMetric({
      type: 'tokens.usage',
      value: tokens,
      timestamp: new Date(),
      metadata: { model },
    });

    // Update daily token usage
    const today = new Date().toISOString().split('T')[0];
    this.updateAggregate(`tokens.daily.${today}.${model}`, tokens);
  }

  async recordWorkflowError(params: {
    userId: string;
    sessionId: string;
    error: string;
    state: any;
    timestamp: Date;
  }) {
    this.recordMetric({
      type: 'workflow.error',
      value: 1,
      timestamp: params.timestamp,
      metadata: {
        userId: params.userId,
        sessionId: params.sessionId,
        error: params.error,
        state: params.state,
      },
    });

    // Emit error event for monitoring
    this.emit('workflow:error', params);
  }

  private recordMetric(metric: MetricEvent) {
    const metrics = this.metrics.get(metric.type) || [];
    metrics.push(metric);

    // Keep only recent metrics to prevent memory issues
    if (metrics.length > this.maxMetricsPerType) {
      metrics.shift();
    }

    this.metrics.set(metric.type, metrics);

    // Emit metric event for real-time monitoring
    this.emit('metric', metric);
  }

  private updateAggregate(key: string, value: number) {
    const current = this.aggregates.get(key) || {
      count: 0,
      sum: 0,
      min: Infinity,
      max: -Infinity,
      avg: 0,
    };

    current.count++;
    current.sum += value;
    current.min = Math.min(current.min, value);
    current.max = Math.max(current.max, value);
    current.avg = current.sum / current.count;

    this.aggregates.set(key, current);
  }

  private incrementCounter(key: string) {
    const current = this.aggregates.get(key) || 0;
    this.aggregates.set(key, current + 1);
  }

  getMetrics(type?: string): MetricEvent[] {
    if (type) {
      return this.metrics.get(type) || [];
    }

    const allMetrics: MetricEvent[] = [];
    for (const metrics of this.metrics.values()) {
      allMetrics.push(...metrics);
    }
    return allMetrics;
  }

  getAggregates(prefix?: string): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of this.aggregates.entries()) {
      if (!prefix || key.startsWith(prefix)) {
        result[key] = value;
      }
    }

    return result;
  }

  getSummary(): Record<string, any> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const recentMetrics = this.getMetrics().filter(
      m => m.timestamp >= oneHourAgo
    );

    // Calculate summaries
    const summary: Record<string, any> = {
      timestamp: now,
      period: '1h',
      metrics: {
        total: recentMetrics.length,
        byType: {},
      },
      aggregates: this.getAggregates(),
      health: this.calculateHealth(),
    };

    // Group metrics by type
    for (const metric of recentMetrics) {
      if (!summary.metrics.byType[metric.type]) {
        summary.metrics.byType[metric.type] = {
          count: 0,
          avgValue: 0,
          totalValue: 0,
        };
      }

      const typeMetrics = summary.metrics.byType[metric.type];
      typeMetrics.count++;
      typeMetrics.totalValue += metric.value;
      typeMetrics.avgValue = typeMetrics.totalValue / typeMetrics.count;
    }

    return summary;
  }

  private calculateHealth(): string {
    const errorRate = this.getErrorRate();
    const avgLatency = this.getAverageLatency();

    if (errorRate > 0.1 || avgLatency > 5000) {
      return 'unhealthy';
    } else if (errorRate > 0.05 || avgLatency > 3000) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  private getErrorRate(): number {
    const errors = this.aggregates.get('workflow.status.failure') || 0;
    const successes = this.aggregates.get('workflow.status.success') || 0;
    const total = errors + successes;

    return total > 0 ? errors / total : 0;
  }

  private getAverageLatency(): number {
    const latencyAggregate = this.aggregates.get('activity.generate_response');
    return latencyAggregate?.avg || 0;
  }

  async flush() {
    const summary = this.getSummary();

    try {
      // Send to monitoring service (CloudWatch, Datadog, etc.)
      await this.sendToMonitoringService(summary);

      // Clear old metrics
      this.cleanupOldMetrics();
    } catch (error) {
      console.error('Failed to flush metrics:', error);
    }
  }

  private async sendToMonitoringService(summary: Record<string, any>) {
    // Implement sending to your monitoring service
    // For now, just log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Metrics Summary:', JSON.stringify(summary, null, 2));
    }

    // Example: Send to CloudWatch
    // await cloudwatch.putMetricData({ ... });
  }

  private cleanupOldMetrics() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    for (const [type, metrics] of this.metrics.entries()) {
      const recentMetrics = metrics.filter(m => m.timestamp >= oneHourAgo);
      this.metrics.set(type, recentMetrics);
    }
  }

  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
    this.removeAllListeners();
  }
}
