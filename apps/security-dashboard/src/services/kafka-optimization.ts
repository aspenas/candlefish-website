/**
 * Kafka Event Processing Optimization
 * Handles high-throughput event streaming for 10M+ events per day
 * Implements batch processing, deduplication, and stream processing optimization
 */

import { Kafka, Producer, Consumer, Admin, EachMessagePayload, CompressionTypes, logLevel } from 'kafkajs';
import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import pLimit from 'p-limit';

// ====================
// Kafka Configuration
// ====================

export interface OptimizedKafkaConfig {
  brokers: string[];
  clientId: string;
  connectionTimeout?: number;
  requestTimeout?: number;
  retry?: {
    retries?: number;
    initialRetryTime?: number;
    maxRetryTime?: number;
  };
  ssl?: boolean;
  sasl?: {
    mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
    username: string;
    password: string;
  };
}

export interface EventProcessingConfig {
  batchSize: number;
  batchTimeout: number;
  maxConcurrency: number;
  deduplicationWindow: number;
  compressionType: CompressionTypes;
  partitions: number;
  replicationFactor: number;
}

// ====================
// Event Deduplication
// ====================

export class EventDeduplicator {
  private seenEvents: Map<string, number>;
  private cleanupInterval: NodeJS.Timeout;
  private window: number;

  constructor(windowMs: number = 60000) {
    this.seenEvents = new Map();
    this.window = windowMs;
    
    // Cleanup old entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [hash, timestamp] of this.seenEvents.entries()) {
        if (now - timestamp > this.window) {
          this.seenEvents.delete(hash);
        }
      }
    }, 60000);
  }

  isDuplicate(event: any): boolean {
    const hash = this.generateHash(event);
    const existing = this.seenEvents.get(hash);
    
    if (existing) {
      return true;
    }
    
    this.seenEvents.set(hash, Date.now());
    return false;
  }

  private generateHash(event: any): string {
    const content = JSON.stringify({
      id: event.id,
      type: event.type,
      source: event.source,
      timestamp: event.timestamp,
    });
    
    return createHash('md5').update(content).digest('hex');
  }

  cleanup(): void {
    clearInterval(this.cleanupInterval);
    this.seenEvents.clear();
  }

  getStats(): { totalSeen: number; currentWindow: number } {
    return {
      totalSeen: this.seenEvents.size,
      currentWindow: this.window,
    };
  }
}

// ====================
// Batch Processor
// ====================

export class BatchProcessor extends EventEmitter {
  private batch: any[] = [];
  private batchTimer?: NodeJS.Timeout;
  private processing = false;
  private processedCount = 0;
  private errorCount = 0;

  constructor(
    private batchSize: number,
    private batchTimeout: number,
    private processFn: (batch: any[]) => Promise<void>
  ) {
    super();
  }

  async add(event: any): Promise<void> {
    this.batch.push(event);
    
    if (this.batch.length >= this.batchSize) {
      await this.flush();
    } else if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.flush().catch(console.error);
      }, this.batchTimeout);
    }
  }

  async flush(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    if (this.batch.length === 0 || this.processing) {
      return;
    }

    this.processing = true;
    const currentBatch = this.batch;
    this.batch = [];

    try {
      await this.processFn(currentBatch);
      this.processedCount += currentBatch.length;
      this.emit('batch_processed', currentBatch.length);
    } catch (error) {
      this.errorCount += currentBatch.length;
      this.emit('batch_error', error, currentBatch);
      
      // Re-queue failed events
      this.batch.unshift(...currentBatch);
    } finally {
      this.processing = false;
    }
  }

  getStats(): { processed: number; errors: number; pending: number } {
    return {
      processed: this.processedCount,
      errors: this.errorCount,
      pending: this.batch.length,
    };
  }

  async shutdown(): Promise<void> {
    await this.flush();
    this.removeAllListeners();
  }
}

// ====================
// Optimized Kafka Producer
// ====================

export class OptimizedKafkaProducer {
  private kafka: Kafka;
  private producer: Producer;
  private batchProcessor: BatchProcessor;
  private connected = false;
  private metrics = {
    sent: 0,
    failed: 0,
    batches: 0,
  };

  constructor(
    private config: OptimizedKafkaConfig,
    private processingConfig: EventProcessingConfig
  ) {
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      connectionTimeout: config.connectionTimeout || 10000,
      requestTimeout: config.requestTimeout || 30000,
      retry: config.retry || {
        retries: 10,
        initialRetryTime: 100,
        maxRetryTime: 30000,
      },
      logLevel: logLevel.ERROR,
      ssl: config.ssl,
      sasl: config.sasl,
    });

    this.producer = this.kafka.producer({
      allowAutoTopicCreation: false,
      transactionTimeout: 30000,
      compression: processingConfig.compressionType,
      maxInFlightRequests: 10,
      idempotent: true, // Ensure exactly-once delivery
    });

    this.batchProcessor = new BatchProcessor(
      processingConfig.batchSize,
      processingConfig.batchTimeout,
      this.sendBatch.bind(this)
    );

    this.batchProcessor.on('batch_processed', (count) => {
      this.metrics.batches++;
      this.metrics.sent += count;
    });

    this.batchProcessor.on('batch_error', (error, batch) => {
      this.metrics.failed += batch.length;
      console.error('Batch processing error:', error);
    });
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      await this.producer.connect();
      this.connected = true;
      console.log('Kafka producer connected');
    }
  }

  async sendEvent(topic: string, event: any, key?: string): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }

    await this.batchProcessor.add({
      topic,
      key: key || event.id,
      value: JSON.stringify(event),
      timestamp: Date.now().toString(),
      headers: {
        'event-type': event.type || 'unknown',
        'event-severity': event.severity || 'info',
        'event-source': event.source || 'system',
      },
    });
  }

  private async sendBatch(batch: any[]): Promise<void> {
    // Group by topic for efficient sending
    const topicGroups = batch.reduce((groups, message) => {
      const topic = message.topic;
      if (!groups[topic]) {
        groups[topic] = [];
      }
      groups[topic].push(message);
      return groups;
    }, {} as Record<string, any[]>);

    // Send each topic group
    await Promise.all(
      Object.entries(topicGroups).map(([topic, messages]) =>
        this.producer.send({
          topic,
          messages: messages.map(m => ({
            key: m.key,
            value: m.value,
            timestamp: m.timestamp,
            headers: m.headers,
          })),
          compression: this.processingConfig.compressionType,
        })
      )
    );
  }

  async flush(): Promise<void> {
    await this.batchProcessor.flush();
  }

  async disconnect(): Promise<void> {
    await this.batchProcessor.shutdown();
    
    if (this.connected) {
      await this.producer.disconnect();
      this.connected = false;
    }
  }

  getMetrics(): any {
    return {
      ...this.metrics,
      ...this.batchProcessor.getStats(),
    };
  }
}

// ====================
// Optimized Kafka Consumer
// ====================

export class OptimizedKafkaConsumer {
  private kafka: Kafka;
  private consumer: Consumer;
  private deduplicator: EventDeduplicator;
  private concurrencyLimit: pLimit.Limit;
  private running = false;
  private metrics = {
    consumed: 0,
    processed: 0,
    duplicates: 0,
    errors: 0,
  };

  constructor(
    private config: OptimizedKafkaConfig,
    private processingConfig: EventProcessingConfig,
    private groupId: string
  ) {
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      connectionTimeout: config.connectionTimeout || 10000,
      requestTimeout: config.requestTimeout || 30000,
      retry: config.retry,
      logLevel: logLevel.ERROR,
      ssl: config.ssl,
      sasl: config.sasl,
    });

    this.consumer = this.kafka.consumer({
      groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      maxWaitTimeInMs: 5000,
      maxBytesPerPartition: 1024 * 1024 * 10, // 10MB per partition
      retry: {
        retries: 10,
        initialRetryTime: 100,
        maxRetryTime: 30000,
      },
    });

    this.deduplicator = new EventDeduplicator(processingConfig.deduplicationWindow);
    this.concurrencyLimit = pLimit(processingConfig.maxConcurrency);
  }

  async connect(): Promise<void> {
    await this.consumer.connect();
    console.log('Kafka consumer connected');
  }

  async subscribe(topics: string[]): Promise<void> {
    await this.consumer.subscribe({
      topics,
      fromBeginning: false,
    });
    console.log(`Subscribed to topics: ${topics.join(', ')}`);
  }

  async run(handler: (event: any) => Promise<void>): Promise<void> {
    if (this.running) {
      throw new Error('Consumer is already running');
    }

    this.running = true;

    await this.consumer.run({
      autoCommit: false,
      eachBatch: async ({ batch, resolveOffset, heartbeat, commitOffsetsIfNecessary }) => {
        const messages = batch.messages;
        const processPromises: Promise<void>[] = [];

        for (const message of messages) {
          processPromises.push(
            this.concurrencyLimit(async () => {
              try {
                this.metrics.consumed++;

                // Parse message
                const event = JSON.parse(message.value?.toString() || '{}');
                
                // Check for duplicates
                if (this.deduplicator.isDuplicate(event)) {
                  this.metrics.duplicates++;
                  return;
                }

                // Process event
                await handler(event);
                this.metrics.processed++;

                // Resolve offset for this message
                resolveOffset(message.offset);
              } catch (error) {
                this.metrics.errors++;
                console.error('Error processing message:', error);
                
                // Optionally send to DLQ
                await this.sendToDLQ(message, error as Error);
              }
            })
          );

          // Heartbeat periodically
          if (processPromises.length % 100 === 0) {
            await heartbeat();
          }
        }

        // Wait for all messages to be processed
        await Promise.all(processPromises);
        
        // Commit offsets
        await commitOffsetsIfNecessary();
      },
    });
  }

  private async sendToDLQ(message: any, error: Error): Promise<void> {
    // Dead Letter Queue logic
    console.error(`Sending message to DLQ: ${message.offset}`, error);
    
    // In production, you would send this to a separate DLQ topic
    // await this.producer.send({
    //   topic: `${message.topic}.dlq`,
    //   messages: [{
    //     key: message.key,
    //     value: message.value,
    //     headers: {
    //       ...message.headers,
    //       'error': error.message,
    //       'original-topic': message.topic,
    //       'original-offset': message.offset.toString(),
    //     },
    //   }],
    // });
  }

  async pause(): Promise<void> {
    const assignment = this.consumer.assignment();
    this.consumer.pause(assignment);
    console.log('Consumer paused');
  }

  async resume(): Promise<void> {
    const assignment = this.consumer.assignment();
    this.consumer.resume(assignment);
    console.log('Consumer resumed');
  }

  async disconnect(): Promise<void> {
    this.running = false;
    this.deduplicator.cleanup();
    await this.consumer.disconnect();
    console.log('Consumer disconnected');
  }

  getMetrics(): any {
    return {
      ...this.metrics,
      deduplication: this.deduplicator.getStats(),
    };
  }
}

// ====================
// Kafka Stream Processor
// ====================

export class KafkaStreamProcessor {
  private producer: OptimizedKafkaProducer;
  private consumers: Map<string, OptimizedKafkaConsumer>;
  private admin: Admin;
  private processingPipeline: Map<string, Function[]>;

  constructor(
    private config: OptimizedKafkaConfig,
    private processingConfig: EventProcessingConfig
  ) {
    this.producer = new OptimizedKafkaProducer(config, processingConfig);
    this.consumers = new Map();
    this.processingPipeline = new Map();
    
    const kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      ssl: config.ssl,
      sasl: config.sasl,
    });
    
    this.admin = kafka.admin();
  }

  async initialize(): Promise<void> {
    await this.admin.connect();
    await this.producer.connect();
    console.log('Kafka stream processor initialized');
  }

  async createTopicsIfNeeded(topics: string[]): Promise<void> {
    const existingTopics = await this.admin.listTopics();
    const topicsToCreate = topics.filter(topic => !existingTopics.includes(topic));

    if (topicsToCreate.length > 0) {
      await this.admin.createTopics({
        topics: topicsToCreate.map(topic => ({
          topic,
          numPartitions: this.processingConfig.partitions,
          replicationFactor: this.processingConfig.replicationFactor,
          configEntries: [
            { name: 'retention.ms', value: '86400000' }, // 1 day
            { name: 'compression.type', value: 'lz4' },
            { name: 'min.insync.replicas', value: '2' },
          ],
        })),
      });
      console.log(`Created topics: ${topicsToCreate.join(', ')}`);
    }
  }

  async addStreamProcessor(
    inputTopic: string,
    outputTopic: string,
    groupId: string,
    processors: Function[]
  ): Promise<void> {
    // Create consumer for this stream
    const consumer = new OptimizedKafkaConsumer(
      this.config,
      this.processingConfig,
      groupId
    );

    await consumer.connect();
    await consumer.subscribe([inputTopic]);

    // Store processors
    this.processingPipeline.set(groupId, processors);
    this.consumers.set(groupId, consumer);

    // Run the stream processor
    await consumer.run(async (event) => {
      let processedEvent = event;
      
      // Apply all processors in sequence
      for (const processor of processors) {
        processedEvent = await processor(processedEvent);
        
        // If processor returns null, stop processing
        if (!processedEvent) {
          return;
        }
      }
      
      // Send to output topic
      await this.producer.sendEvent(outputTopic, processedEvent);
    });

    console.log(`Stream processor added: ${inputTopic} -> ${outputTopic}`);
  }

  // Example processors
  static createEnrichmentProcessor(enrichFn: (event: any) => Promise<any>) {
    return async (event: any) => {
      const enrichedData = await enrichFn(event);
      return { ...event, enriched: enrichedData };
    };
  }

  static createFilterProcessor(filterFn: (event: any) => boolean) {
    return async (event: any) => {
      return filterFn(event) ? event : null;
    };
  }

  static createAggregationProcessor(window: number) {
    const aggregates = new Map<string, any[]>();
    
    return async (event: any) => {
      const key = event.aggregationKey || 'default';
      
      if (!aggregates.has(key)) {
        aggregates.set(key, []);
      }
      
      const events = aggregates.get(key)!;
      events.push(event);
      
      // Remove old events outside window
      const cutoff = Date.now() - window;
      const filtered = events.filter(e => 
        new Date(e.timestamp).getTime() > cutoff
      );
      aggregates.set(key, filtered);
      
      // Return aggregated result
      return {
        key,
        count: filtered.length,
        events: filtered,
        window,
        timestamp: new Date().toISOString(),
      };
    };
  }

  async getMetrics(): Promise<any> {
    const consumerMetrics = Array.from(this.consumers.entries()).map(
      ([groupId, consumer]) => ({
        groupId,
        metrics: consumer.getMetrics(),
      })
    );

    return {
      producer: this.producer.getMetrics(),
      consumers: consumerMetrics,
      timestamp: new Date().toISOString(),
    };
  }

  async shutdown(): Promise<void> {
    // Shutdown all consumers
    await Promise.all(
      Array.from(this.consumers.values()).map(consumer => 
        consumer.disconnect()
      )
    );

    // Shutdown producer
    await this.producer.disconnect();
    
    // Disconnect admin
    await this.admin.disconnect();
    
    console.log('Kafka stream processor shut down');
  }
}

// ====================
// Unified Event Processing System
// ====================

export class UnifiedEventProcessor {
  private streamProcessor: KafkaStreamProcessor;
  private config: OptimizedKafkaConfig;
  private processingConfig: EventProcessingConfig;

  constructor() {
    this.config = {
      brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
      clientId: 'security-dashboard',
      connectionTimeout: 10000,
      requestTimeout: 30000,
      retry: {
        retries: 10,
        initialRetryTime: 100,
        maxRetryTime: 30000,
      },
    };

    this.processingConfig = {
      batchSize: 1000,
      batchTimeout: 5000,
      maxConcurrency: 50,
      deduplicationWindow: 60000,
      compressionType: CompressionTypes.LZ4,
      partitions: 10,
      replicationFactor: 3,
    };

    this.streamProcessor = new KafkaStreamProcessor(
      this.config,
      this.processingConfig
    );
  }

  async setup(): Promise<void> {
    await this.streamProcessor.initialize();
    
    // Create required topics
    await this.streamProcessor.createTopicsIfNeeded([
      'security-events',
      'security-events-enriched',
      'security-alerts',
      'security-metrics',
      'security-events.dlq',
    ]);

    // Set up processing pipelines
    await this.setupEventProcessingPipeline();
    await this.setupAlertGenerationPipeline();
    await this.setupMetricsAggregationPipeline();
  }

  private async setupEventProcessingPipeline(): Promise<void> {
    await this.streamProcessor.addStreamProcessor(
      'security-events',
      'security-events-enriched',
      'event-enrichment-group',
      [
        // Filter out test events
        KafkaStreamProcessor.createFilterProcessor(
          (event) => !event.isTest
        ),
        
        // Enrich with threat intelligence
        KafkaStreamProcessor.createEnrichmentProcessor(async (event) => {
          // Simulate threat intel lookup
          return {
            threatScore: Math.random(),
            indicators: ['IOC1', 'IOC2'],
            mitreTactics: ['TA0001', 'TA0002'],
          };
        }),
        
        // Add geolocation
        KafkaStreamProcessor.createEnrichmentProcessor(async (event) => {
          // Simulate geo lookup
          return {
            country: 'US',
            city: 'San Francisco',
            coordinates: { lat: 37.7749, lon: -122.4194 },
          };
        }),
      ]
    );
  }

  private async setupAlertGenerationPipeline(): Promise<void> {
    await this.streamProcessor.addStreamProcessor(
      'security-events-enriched',
      'security-alerts',
      'alert-generation-group',
      [
        // Filter for high-severity events
        KafkaStreamProcessor.createFilterProcessor(
          (event) => event.severity === 'critical' || event.severity === 'high'
        ),
        
        // Transform to alert format
        async (event) => ({
          id: `alert_${event.id}`,
          type: 'security_alert',
          severity: event.severity,
          title: `Security Alert: ${event.type}`,
          description: `${event.type} detected from ${event.source}`,
          event,
          timestamp: new Date().toISOString(),
          status: 'open',
        }),
      ]
    );
  }

  private async setupMetricsAggregationPipeline(): Promise<void> {
    await this.streamProcessor.addStreamProcessor(
      'security-events-enriched',
      'security-metrics',
      'metrics-aggregation-group',
      [
        // Aggregate events in 1-minute windows
        KafkaStreamProcessor.createAggregationProcessor(60000),
        
        // Calculate metrics
        async (aggregate) => ({
          window: {
            start: new Date(Date.now() - 60000).toISOString(),
            end: new Date().toISOString(),
          },
          metrics: {
            totalEvents: aggregate.count,
            eventsByType: this.groupBy(aggregate.events, 'type'),
            eventsBySeverity: this.groupBy(aggregate.events, 'severity'),
            avgThreatScore: this.average(
              aggregate.events.map((e: any) => e.enriched?.threatScore || 0)
            ),
          },
        }),
      ]
    );
  }

  private groupBy(events: any[], key: string): Record<string, number> {
    return events.reduce((groups, event) => {
      const value = event[key];
      groups[value] = (groups[value] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);
  }

  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  async getMetrics(): Promise<any> {
    return this.streamProcessor.getMetrics();
  }

  async shutdown(): Promise<void> {
    await this.streamProcessor.shutdown();
  }
}

export default UnifiedEventProcessor;