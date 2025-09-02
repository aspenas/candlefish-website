import { Pool, PoolClient } from 'pg';
import { DatabaseService } from '../../src/services/database';
import { AnalyticsService } from '../../src/services/analytics';

describe('Database Integration Tests', () => {
  let pool: Pool;
  let databaseService: DatabaseService;
  let analyticsService: AnalyticsService;
  let client: PoolClient;

  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10
    });
    
    databaseService = new DatabaseService(pool);
    analyticsService = new AnalyticsService(databaseService);
    client = await pool.connect();
  });

  beforeEach(async () => {
    // Clean slate for each test
    await client.query('BEGIN');
    await cleanAllTestData();
  });

  afterEach(async () => {
    await client.query('ROLLBACK');
  });

  afterAll(async () => {
    client.release();
    await pool.end();
  });

  describe('Agent Performance Metrics', () => {
    it('should insert and retrieve agent metrics correctly', async () => {
      const testMetric = {
        agent_id: 'integration-test-agent',
        agent_name: 'Integration Test Agent',
        metric_type: 'response_time',
        value: 125.7,
        unit: 'ms',
        metadata: { test_run: 'integration' }
      };

      // Insert metric
      const insertedId = await databaseService.insertAgentMetric(testMetric);
      expect(insertedId).toBeDefined();
      expect(typeof insertedId).toBe('number');

      // Retrieve metric
      const retrievedMetrics = await databaseService.getAgentMetrics({
        agent_id: testMetric.agent_id
      });

      expect(retrievedMetrics).toHaveLength(1);
      const retrieved = retrievedMetrics[0];
      
      expect(retrieved.agent_id).toBe(testMetric.agent_id);
      expect(retrieved.agent_name).toBe(testMetric.agent_name);
      expect(retrieved.metric_type).toBe(testMetric.metric_type);
      expect(parseFloat(retrieved.value)).toBe(testMetric.value);
      expect(retrieved.unit).toBe(testMetric.unit);
      expect(retrieved.metadata).toEqual(testMetric.metadata);
    });

    it('should handle bulk insert of agent metrics', async () => {
      const testMetrics = [
        {
          agent_id: 'bulk-agent-1',
          agent_name: 'Bulk Agent 1',
          metric_type: 'response_time',
          value: 100.0,
          unit: 'ms'
        },
        {
          agent_id: 'bulk-agent-1',
          agent_name: 'Bulk Agent 1',
          metric_type: 'success_rate',
          value: 98.5,
          unit: '%'
        },
        {
          agent_id: 'bulk-agent-2',
          agent_name: 'Bulk Agent 2',
          metric_type: 'response_time',
          value: 85.3,
          unit: 'ms'
        }
      ];

      const insertedCount = await databaseService.bulkInsertAgentMetrics(testMetrics);
      expect(insertedCount).toBe(testMetrics.length);

      // Verify all metrics were inserted
      const allMetrics = await databaseService.getAgentMetrics({});
      const bulkMetrics = allMetrics.filter(m => m.agent_id.startsWith('bulk-agent'));
      expect(bulkMetrics).toHaveLength(testMetrics.length);
    });

    it('should filter agent metrics by date range', async () => {
      const baseTime = new Date('2024-01-01T00:00:00Z');
      
      // Insert metrics with different timestamps
      await client.query(`
        INSERT INTO agent_performance_metrics (agent_id, agent_name, metric_type, value, created_at)
        VALUES 
          ('date-test-agent', 'Date Test Agent', 'response_time', 100, $1),
          ('date-test-agent', 'Date Test Agent', 'response_time', 110, $2),
          ('date-test-agent', 'Date Test Agent', 'response_time', 120, $3)
      `, [
        new Date(baseTime.getTime()),
        new Date(baseTime.getTime() + 60 * 60 * 1000), // +1 hour
        new Date(baseTime.getTime() + 2 * 60 * 60 * 1000) // +2 hours
      ]);

      const startDate = new Date(baseTime.getTime() + 30 * 60 * 1000); // +30 minutes
      const endDate = new Date(baseTime.getTime() + 90 * 60 * 1000); // +90 minutes

      const filteredMetrics = await databaseService.getAgentMetrics({
        agent_id: 'date-test-agent',
        start_date: startDate,
        end_date: endDate
      });

      expect(filteredMetrics).toHaveLength(1);
      expect(parseFloat(filteredMetrics[0].value)).toBe(110);
    });

    it('should aggregate agent metrics correctly', async () => {
      // Insert multiple metrics for aggregation
      await client.query(`
        INSERT INTO agent_performance_metrics (agent_id, agent_name, metric_type, value, unit)
        VALUES 
          ('agg-agent', 'Aggregation Agent', 'response_time', 100, 'ms'),
          ('agg-agent', 'Aggregation Agent', 'response_time', 150, 'ms'),
          ('agg-agent', 'Aggregation Agent', 'response_time', 200, 'ms')
      `);

      const aggregation = await databaseService.getAgentMetricsAggregation({
        agent_id: 'agg-agent',
        metric_type: 'response_time'
      });

      expect(aggregation).toHaveProperty('avg');
      expect(aggregation).toHaveProperty('min');
      expect(aggregation).toHaveProperty('max');
      expect(aggregation).toHaveProperty('count');
      
      expect(parseFloat(aggregation.avg)).toBe(150);
      expect(parseFloat(aggregation.min)).toBe(100);
      expect(parseFloat(aggregation.max)).toBe(200);
      expect(parseInt(aggregation.count)).toBe(3);
    });
  });

  describe('Service Performance Metrics', () => {
    it('should track service health metrics over time', async () => {
      const testService = {
        service_name: 'integration-test-service',
        endpoint: '/api/test',
        response_time_ms: 150,
        status_code: 200,
        cpu_usage: 45.2,
        memory_usage: 512.5
      };

      const insertedId = await databaseService.insertServiceMetric(testService);
      expect(insertedId).toBeDefined();

      const metrics = await databaseService.getServiceMetrics({
        service_name: testService.service_name
      });

      expect(metrics).toHaveLength(1);
      const metric = metrics[0];
      
      expect(metric.service_name).toBe(testService.service_name);
      expect(metric.endpoint).toBe(testService.endpoint);
      expect(metric.response_time_ms).toBe(testService.response_time_ms);
      expect(metric.status_code).toBe(testService.status_code);
      expect(parseFloat(metric.cpu_usage)).toBe(testService.cpu_usage);
      expect(parseFloat(metric.memory_usage)).toBe(testService.memory_usage);
    });

    it('should calculate service uptime and availability', async () => {
      // Insert mixed success/failure metrics
      const serviceName = 'uptime-test-service';
      
      await client.query(`
        INSERT INTO service_performance_metrics (service_name, endpoint, status_code, created_at)
        VALUES 
          ($1, '/api/test', 200, NOW() - INTERVAL '4 hours'),
          ($1, '/api/test', 200, NOW() - INTERVAL '3 hours'),
          ($1, '/api/test', 500, NOW() - INTERVAL '2 hours'),
          ($1, '/api/test', 200, NOW() - INTERVAL '1 hour'),
          ($1, '/api/test', 200, NOW())
      `, [serviceName]);

      const availability = await databaseService.calculateServiceAvailability({
        service_name: serviceName,
        period_hours: 5
      });

      expect(availability).toHaveProperty('uptime_percentage');
      expect(availability).toHaveProperty('total_requests');
      expect(availability).toHaveProperty('successful_requests');
      expect(availability).toHaveProperty('failed_requests');
      
      expect(availability.total_requests).toBe(5);
      expect(availability.successful_requests).toBe(4);
      expect(availability.failed_requests).toBe(1);
      expect(availability.uptime_percentage).toBe(80);
    });

    it('should identify performance bottlenecks', async () => {
      const serviceName = 'bottleneck-test-service';
      
      // Insert metrics with varying response times
      await client.query(`
        INSERT INTO service_performance_metrics (service_name, endpoint, response_time_ms)
        VALUES 
          ($1, '/api/fast', 50),
          ($1, '/api/medium', 150),
          ($1, '/api/slow', 500),
          ($1, '/api/very-slow', 1200)
      `, [serviceName]);

      const bottlenecks = await databaseService.identifyPerformanceBottlenecks({
        service_name: serviceName,
        threshold_ms: 200
      });

      expect(bottlenecks).toHaveLength(2);
      expect(bottlenecks[0].endpoint).toBe('/api/slow');
      expect(bottlenecks[1].endpoint).toBe('/api/very-slow');
      
      bottlenecks.forEach(bottleneck => {
        expect(bottleneck.response_time_ms).toBeGreaterThan(200);
      });
    });
  });

  describe('System Metrics', () => {
    it('should track system-wide performance metrics', async () => {
      const systemMetrics = [
        {
          metric_name: 'cpu_usage',
          metric_value: 75.5,
          metric_unit: '%',
          component: 'system',
          severity: 'warning'
        },
        {
          metric_name: 'memory_usage',
          metric_value: 4096.2,
          metric_unit: 'MB',
          component: 'system',
          severity: 'info'
        },
        {
          metric_name: 'disk_usage',
          metric_value: 85.3,
          metric_unit: '%',
          component: 'storage',
          severity: 'critical'
        }
      ];

      for (const metric of systemMetrics) {
        await databaseService.insertSystemMetric(metric);
      }

      const retrievedMetrics = await databaseService.getSystemMetrics({});
      expect(retrievedMetrics.length).toBeGreaterThanOrEqual(systemMetrics.length);
      
      const testMetrics = retrievedMetrics.filter(m => 
        systemMetrics.some(tm => tm.metric_name === m.metric_name)
      );
      
      expect(testMetrics).toHaveLength(systemMetrics.length);
    });

    it('should alert on critical system metrics', async () => {
      await databaseService.insertSystemMetric({
        metric_name: 'cpu_usage',
        metric_value: 95.8,
        metric_unit: '%',
        component: 'system',
        severity: 'critical',
        metadata: { alert: true, threshold: 90 }
      });

      const criticalAlerts = await databaseService.getCriticalSystemAlerts({
        severity: 'critical',
        hours_back: 1
      });

      expect(criticalAlerts.length).toBeGreaterThanOrEqual(1);
      const alert = criticalAlerts.find(a => a.metric_name === 'cpu_usage');
      
      expect(alert).toBeDefined();
      expect(alert!.severity).toBe('critical');
      expect(parseFloat(alert!.metric_value)).toBe(95.8);
    });
  });

  describe('Advanced Analytics Queries', () => {
    it('should generate performance trends over time', async () => {
      const agentId = 'trend-test-agent';
      
      // Insert metrics over time intervals
      await client.query(`
        INSERT INTO agent_performance_metrics (agent_id, agent_name, metric_type, value, created_at)
        VALUES 
          ($1, 'Trend Agent', 'response_time', 100, NOW() - INTERVAL '3 hours'),
          ($1, 'Trend Agent', 'response_time', 120, NOW() - INTERVAL '2 hours'),
          ($1, 'Trend Agent', 'response_time', 110, NOW() - INTERVAL '1 hour'),
          ($1, 'Trend Agent', 'response_time', 95, NOW())
      `, [agentId]);

      const trends = await databaseService.getPerformanceTrends({
        agent_id: agentId,
        metric_type: 'response_time',
        period_hours: 4,
        interval_minutes: 60
      });

      expect(trends.length).toBe(4);
      trends.forEach(trend => {
        expect(trend).toHaveProperty('time_bucket');
        expect(trend).toHaveProperty('avg_value');
        expect(trend.time_bucket).toBeValidDate();
      });
    });

    it('should detect anomalies in performance data', async () => {
      const agentId = 'anomaly-test-agent';
      
      // Insert normal metrics and one anomaly
      await client.query(`
        INSERT INTO agent_performance_metrics (agent_id, agent_name, metric_type, value)
        VALUES 
          ($1, 'Anomaly Agent', 'response_time', 100),
          ($1, 'Anomaly Agent', 'response_time', 105),
          ($1, 'Anomaly Agent', 'response_time', 95),
          ($1, 'Anomaly Agent', 'response_time', 102),
          ($1, 'Anomaly Agent', 'response_time', 500)  -- Anomaly
      `, [agentId]);

      const anomalies = await databaseService.detectPerformanceAnomalies({
        agent_id: agentId,
        metric_type: 'response_time',
        sensitivity: 2.0 // 2 standard deviations
      });

      expect(anomalies.length).toBe(1);
      expect(parseFloat(anomalies[0].value)).toBe(500);
      expect(anomalies[0]).toHaveProperty('z_score');
      expect(Math.abs(parseFloat(anomalies[0].z_score))).toBeGreaterThan(2);
    });

    it('should perform cross-service correlation analysis', async () => {
      // Insert correlated metrics for different services
      await client.query(`
        INSERT INTO service_performance_metrics (service_name, response_time_ms, cpu_usage, created_at)
        VALUES 
          ('service-a', 100, 50, NOW() - INTERVAL '3 minutes'),
          ('service-b', 200, 75, NOW() - INTERVAL '3 minutes'),
          ('service-a', 150, 60, NOW() - INTERVAL '2 minutes'),
          ('service-b', 300, 85, NOW() - INTERVAL '2 minutes'),
          ('service-a', 120, 55, NOW() - INTERVAL '1 minute'),
          ('service-b', 250, 80, NOW() - INTERVAL '1 minute')
      `);

      const correlation = await databaseService.calculateServiceCorrelation({
        service_a: 'service-a',
        service_b: 'service-b',
        metric: 'response_time_ms',
        period_hours: 1
      });

      expect(correlation).toHaveProperty('correlation_coefficient');
      expect(correlation).toHaveProperty('p_value');
      expect(correlation).toHaveProperty('sample_size');
      
      expect(Math.abs(parseFloat(correlation.correlation_coefficient))).toBeWithinRange(0, 1);
      expect(parseInt(correlation.sample_size)).toBe(3);
    });
  });

  describe('Database Transaction Integrity', () => {
    it('should handle concurrent metric insertions', async () => {
      const concurrentInserts = Array.from({ length: 10 }, (_, i) => 
        databaseService.insertAgentMetric({
          agent_id: 'concurrent-agent',
          agent_name: 'Concurrent Agent',
          metric_type: 'response_time',
          value: 100 + i,
          unit: 'ms'
        })
      );

      const results = await Promise.all(concurrentInserts);
      
      // All inserts should succeed
      results.forEach(id => {
        expect(id).toBeDefined();
        expect(typeof id).toBe('number');
      });

      // Verify all metrics were inserted
      const metrics = await databaseService.getAgentMetrics({
        agent_id: 'concurrent-agent'
      });
      
      expect(metrics).toHaveLength(10);
    });

    it('should rollback on transaction failure', async () => {
      const invalidMetric = {
        agent_id: 'rollback-test',
        agent_name: 'Rollback Test',
        metric_type: 'response_time',
        value: 'invalid-value' as any, // This should cause an error
        unit: 'ms'
      };

      await expect(databaseService.insertAgentMetric(invalidMetric))
        .rejects.toThrow();

      // Verify no partial data was inserted
      const metrics = await databaseService.getAgentMetrics({
        agent_id: 'rollback-test'
      });
      
      expect(metrics).toHaveLength(0);
    });
  });

  async function cleanAllTestData() {
    await client.query(`
      DELETE FROM agent_performance_metrics 
      WHERE agent_id LIKE '%test%' OR agent_id LIKE '%integration%'
    `);
    
    await client.query(`
      DELETE FROM service_performance_metrics 
      WHERE service_name LIKE '%test%' OR service_name LIKE '%integration%'
    `);
    
    await client.query(`
      DELETE FROM system_metrics 
      WHERE component LIKE '%test%' OR metric_name LIKE '%test%'
    `);
  }
});