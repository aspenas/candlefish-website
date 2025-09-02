// =====================================================
// REAL-TIME SECURITY SUBSCRIPTIONS
// =====================================================
// WebSocket-based subscription system for real-time security alerts
// Supports Redis Pub/Sub, Kafka streaming, and in-memory channels
// =====================================================

import { PubSub } from 'graphql-subscriptions';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { withFilter } from 'graphql-subscriptions';
import Redis from 'ioredis';
import WebSocket from 'ws';
import { Server } from 'http';
import { ApolloServer } from 'apollo-server-express';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { execute, subscribe } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { KafkaJS, Consumer, Producer } from 'kafkajs';
import { EventEmitter } from 'events';

// =====================================================
// PUBSUB CONFIGURATION
// =====================================================

interface SubscriptionConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  kafka: {
    brokers: string[];
    clientId: string;
    groupId: string;
  };
  websocket: {
    port: number;
    path: string;
  };
}

export class SecuritySubscriptionManager {
  private redisPubSub: RedisPubSub;
  private kafkaProducer: Producer;
  private kafkaConsumer: Consumer;
  private subscriptionServer: SubscriptionServer;
  private alertProcessor: SecurityAlertProcessor;
  private correlationEngine: EventCorrelationEngine;

  constructor(private config: SubscriptionConfig) {
    this.setupRedisPubSub();
    this.setupKafkaStreaming();
    this.setupAlertProcessor();
    this.setupCorrelationEngine();
  }

  private setupRedisPubSub(): void {
    const redisOptions = {
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password,
      db: this.config.redis.db || 0,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    };

    this.redisPubSub = new RedisPubSub({
      publisher: new Redis(redisOptions),
      subscriber: new Redis(redisOptions),
      messageEventName: 'message',
      patternEventName: 'pmessage',
    });
  }

  private setupKafkaStreaming(): void {
    const kafka = KafkaJS({
      clientId: this.config.kafka.clientId,
      brokers: this.config.kafka.brokers,
    });

    this.kafkaProducer = kafka.producer({
      transactionTimeout: 30000,
    });

    this.kafkaConsumer = kafka.consumer({
      groupId: this.config.kafka.groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });

    this.initializeKafkaConsumers();
  }

  private async initializeKafkaConsumers(): Promise<void> {
    await this.kafkaConsumer.connect();
    
    // Subscribe to security event topics
    await this.kafkaConsumer.subscribe({
      topics: [
        'security-events',
        'threat-intelligence',
        'attack-patterns',
        'ioc-updates',
        'case-updates',
        'playbook-executions'
      ]
    });

    // Process Kafka messages and publish to GraphQL subscriptions
    await this.kafkaConsumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const data = JSON.parse(message.value?.toString() || '{}');
          await this.processKafkaMessage(topic, data);
        } catch (error) {
          console.error('Error processing Kafka message:', error);
        }
      },
    });
  }

  private setupAlertProcessor(): void {
    this.alertProcessor = new SecurityAlertProcessor(this.redisPubSub);
  }

  private setupCorrelationEngine(): void {
    this.correlationEngine = new EventCorrelationEngine(this.redisPubSub);
  }

  private async processKafkaMessage(topic: string, data: any): Promise<void> {
    switch (topic) {
      case 'security-events':
        await this.handleSecurityEvent(data);
        break;
      case 'threat-intelligence':
        await this.handleThreatIntelligence(data);
        break;
      case 'attack-patterns':
        await this.handleAttackPattern(data);
        break;
      case 'ioc-updates':
        await this.handleIOCUpdate(data);
        break;
      case 'case-updates':
        await this.handleCaseUpdate(data);
        break;
      case 'playbook-executions':
        await this.handlePlaybookExecution(data);
        break;
    }
  }

  private async handleSecurityEvent(event: any): Promise<void> {
    // Publish to real-time event stream
    await this.redisPubSub.publish(SUBSCRIPTION_CHANNELS.SECURITY_EVENT_STREAM, {
      securityEventStream: event
    });

    // Check for critical alerts
    if (event.severity === 'CRITICAL' || event.riskScore >= 0.9) {
      await this.alertProcessor.processCriticalAlert(event);
    }

    // Trigger correlation analysis
    await this.correlationEngine.analyzeEvent(event);
  }

  private async handleThreatIntelligence(threatIntel: any): Promise<void> {
    await this.redisPubSub.publish(SUBSCRIPTION_CHANNELS.NEW_THREAT_INTELLIGENCE, {
      newThreatIntelligence: threatIntel
    });
  }

  private async handleAttackPattern(pattern: any): Promise<void> {
    await this.redisPubSub.publish(SUBSCRIPTION_CHANNELS.ATTACK_PATTERN_DETECTIONS, {
      attackPatternDetections: pattern
    });
  }

  private async handleIOCUpdate(ioc: any): Promise<void> {
    await this.redisPubSub.publish(SUBSCRIPTION_CHANNELS.IOC_UPDATES, {
      iocUpdates: ioc
    });
  }

  private async handleCaseUpdate(caseUpdate: any): Promise<void> {
    await this.redisPubSub.publish(SUBSCRIPTION_CHANNELS.CASE_UPDATES, {
      caseUpdates: caseUpdate
    });

    // Check for assignment notifications
    if (caseUpdate.assignee) {
      await this.redisPubSub.publish(SUBSCRIPTION_CHANNELS.CASE_ASSIGNMENTS, {
        caseAssignments: caseUpdate
      });
    }
  }

  private async handlePlaybookExecution(execution: any): Promise<void> {
    await this.redisPubSub.publish(SUBSCRIPTION_CHANNELS.PLAYBOOK_EXECUTION_UPDATES, {
      playbookExecutionUpdates: execution
    });

    // Check for approval requests
    const pendingApprovals = execution.stepExecutions?.filter(
      (step: any) => step.status === 'WAITING_FOR_APPROVAL'
    );

    if (pendingApprovals?.length > 0) {
      await this.redisPubSub.publish(SUBSCRIPTION_CHANNELS.PLAYBOOK_APPROVAL_REQUESTS, {
        playbookApprovalRequests: execution
      });
    }
  }

  public setupWebSocketServer(httpServer: Server, schema: any): void {
    this.subscriptionServer = SubscriptionServer.create(
      {
        schema,
        execute,
        subscribe,
        onConnect: async (connectionParams: any, webSocket: WebSocket, context: any) => {
          console.log('WebSocket client connected');
          
          // Authenticate connection
          const authToken = connectionParams.authorization || connectionParams.authToken;
          if (!authToken) {
            throw new Error('Authentication required');
          }

          try {
            const user = await this.authenticateToken(authToken);
            return {
              user,
              dataSources: context.dataSources,
              redisPubSub: this.redisPubSub,
              correlationId: this.generateCorrelationId()
            };
          } catch (error) {
            console.error('WebSocket authentication failed:', error);
            throw new Error('Authentication failed');
          }
        },
        onDisconnect: (webSocket: WebSocket, context: any) => {
          console.log('WebSocket client disconnected');
        },
        onOperation: async (message: any, params: any, webSocket: WebSocket) => {
          console.log('WebSocket operation:', message.payload?.operationName);
          return params;
        },
      },
      {
        server: httpServer,
        path: this.config.websocket.path,
      }
    );
  }

  private async authenticateToken(token: string): Promise<any> {
    // Implement JWT token validation
    // Return user object if valid, throw error if invalid
    return { id: 'user-id', email: 'user@example.com', permissions: [] };
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public async close(): Promise<void> {
    if (this.subscriptionServer) {
      this.subscriptionServer.close();
    }
    
    await this.kafkaConsumer.disconnect();
    await this.kafkaProducer.disconnect();
    
    // Close Redis connections
    this.redisPubSub.close();
  }
}

// =====================================================
// SUBSCRIPTION CHANNELS
// =====================================================

export const SUBSCRIPTION_CHANNELS = {
  // Core Event Streams
  SECURITY_EVENT_STREAM: 'SECURITY_EVENT_STREAM',
  CRITICAL_SECURITY_ALERTS: 'CRITICAL_SECURITY_ALERTS',
  HIGH_RISK_EVENTS: 'HIGH_RISK_EVENTS',
  
  // Threat Intelligence
  NEW_THREAT_INTELLIGENCE: 'NEW_THREAT_INTELLIGENCE',
  THREAT_INTELLIGENCE_UPDATES: 'THREAT_INTELLIGENCE_UPDATES',
  IOC_UPDATES: 'IOC_UPDATES',
  IOC_HITS: 'IOC_HITS',
  
  // Case Management
  CASE_UPDATES: 'CASE_UPDATES',
  CASE_ASSIGNMENTS: 'CASE_ASSIGNMENTS',
  CASE_SLA_BREACHES: 'CASE_SLA_BREACHES',
  NEW_CASES: 'NEW_CASES',
  
  // SOAR Playbooks
  PLAYBOOK_EXECUTION_UPDATES: 'PLAYBOOK_EXECUTION_UPDATES',
  PLAYBOOK_APPROVAL_REQUESTS: 'PLAYBOOK_APPROVAL_REQUESTS',
  PLAYBOOK_FAILURES: 'PLAYBOOK_FAILURES',
  
  // Attack Detection
  ATTACK_PATTERN_DETECTIONS: 'ATTACK_PATTERN_DETECTIONS',
  BEHAVIORAL_ANOMALIES: 'BEHAVIORAL_ANOMALIES',
  SUSPICIOUS_ACTIVITIES: 'SUSPICIOUS_ACTIVITIES',
  
  // Correlation and Analysis
  EVENT_CORRELATIONS: 'EVENT_CORRELATIONS',
  THREAT_CAMPAIGNS: 'THREAT_CAMPAIGNS',
  ATTACK_CHAINS: 'ATTACK_CHAINS',
  
  // System Health
  SYSTEM_HEALTH_UPDATES: 'SYSTEM_HEALTH_UPDATES',
  INTEGRATION_STATUS_UPDATES: 'INTEGRATION_STATUS_UPDATES',
  PERFORMANCE_ALERTS: 'PERFORMANCE_ALERTS',
  
  // Compliance and Reporting
  COMPLIANCE_VIOLATIONS: 'COMPLIANCE_VIOLATIONS',
  AUDIT_EVENTS: 'AUDIT_EVENTS'
};

// =====================================================
// SECURITY ALERT PROCESSOR
// =====================================================

export class SecurityAlertProcessor extends EventEmitter {
  private alertRules: Map<string, AlertRule> = new Map();
  private alertHistory: Map<string, AlertHistory> = new Map();
  private suppressionRules: Map<string, SuppressionRule> = new Map();

  constructor(private pubsub: RedisPubSub) {
    super();
    this.loadAlertRules();
    this.loadSuppressionRules();
  }

  public async processCriticalAlert(event: any): Promise<void> {
    const alertKey = this.generateAlertKey(event);
    
    // Check suppression rules
    if (this.isAlertSuppressed(alertKey, event)) {
      console.log('Alert suppressed:', alertKey);
      return;
    }

    // Create critical alert
    const criticalAlert = await this.createCriticalAlert(event);
    
    // Publish to subscribers
    await this.pubsub.publish(SUBSCRIPTION_CHANNELS.CRITICAL_SECURITY_ALERTS, {
      criticalSecurityAlerts: criticalAlert
    });

    // Update alert history
    this.updateAlertHistory(alertKey, criticalAlert);

    // Trigger additional notifications if needed
    await this.triggerAdditionalNotifications(criticalAlert);
  }

  private async createCriticalAlert(event: any): Promise<any> {
    return {
      ...event,
      alertId: this.generateCorrelationId(),
      alertType: 'CRITICAL_SECURITY_ALERT',
      alertedAt: new Date(),
      severity: 'CRITICAL',
      riskScore: event.riskScore || 1.0,
      alertReason: this.determineAlertReason(event),
      recommendedActions: await this.getRecommendedActions(event),
      escalationRequired: this.requiresEscalation(event)
    };
  }

  private generateAlertKey(event: any): string {
    return `${event.deviceVendor}:${event.deviceProduct}:${event.name}:${event.sourceIp}`;
  }

  private isAlertSuppressed(alertKey: string, event: any): boolean {
    const history = this.alertHistory.get(alertKey);
    if (!history) return false;

    const suppressionRule = this.suppressionRules.get(event.name);
    if (!suppressionRule) return false;

    const timeSinceLastAlert = Date.now() - history.lastAlertTime.getTime();
    return timeSinceLastAlert < suppressionRule.suppressionWindow * 1000;
  }

  private updateAlertHistory(alertKey: string, alert: any): void {
    const history = this.alertHistory.get(alertKey) || {
      alertKey,
      firstSeen: new Date(),
      lastAlertTime: new Date(),
      alertCount: 0
    };

    history.lastAlertTime = new Date();
    history.alertCount++;

    this.alertHistory.set(alertKey, history);
  }

  private determineAlertReason(event: any): string {
    const reasons = [];

    if (event.severity === 'CRITICAL') {
      reasons.push('Critical severity event detected');
    }

    if (event.riskScore >= 0.9) {
      reasons.push('High risk score detected');
    }

    if (event.mitreAttackPatterns?.length > 0) {
      reasons.push('MITRE ATT&CK technique detected');
    }

    if (event.threatIntelligence?.length > 0) {
      reasons.push('Threat intelligence match');
    }

    return reasons.join('; ');
  }

  private async getRecommendedActions(event: any): Promise<string[]> {
    const actions = [];

    // Based on event type and severity
    if (event.name.includes('malware') || event.name.includes('virus')) {
      actions.push('Isolate affected host');
      actions.push('Run full antivirus scan');
      actions.push('Collect malware samples');
    }

    if (event.sourceIp && event.severity === 'CRITICAL') {
      actions.push('Block source IP address');
      actions.push('Investigate network traffic');
    }

    if (event.userId) {
      actions.push('Review user account activity');
      actions.push('Consider account suspension');
    }

    return actions;
  }

  private requiresEscalation(event: any): boolean {
    return event.severity === 'CRITICAL' && 
           (event.riskScore >= 0.95 || 
            event.threatIntelligence?.length > 0 ||
            event.mitreAttackPatterns?.some((pattern: any) => 
              ['T1055', 'T1059', 'T1068'].includes(pattern.id)
            ));
  }

  private async triggerAdditionalNotifications(alert: any): Promise<void> {
    if (alert.escalationRequired) {
      // Notify security managers
      await this.pubsub.publish('ESCALATION_NOTIFICATIONS', {
        escalation: {
          alert,
          notifiedAt: new Date(),
          recipients: ['security-manager@company.com']
        }
      });
    }

    // Integration with external systems (email, Slack, etc.)
    this.emit('critical_alert', alert);
  }

  private loadAlertRules(): void {
    // Load alert rules from configuration
    const defaultRules: AlertRule[] = [
      {
        id: 'critical-malware',
        name: 'Critical Malware Detection',
        condition: (event) => event.name.toLowerCase().includes('malware') && event.severity === 'CRITICAL',
        priority: 1,
        enabled: true
      },
      {
        id: 'high-risk-score',
        name: 'High Risk Score Alert',
        condition: (event) => event.riskScore >= 0.9,
        priority: 2,
        enabled: true
      }
    ];

    defaultRules.forEach(rule => this.alertRules.set(rule.id, rule));
  }

  private loadSuppressionRules(): void {
    // Load suppression rules to prevent alert fatigue
    const defaultSuppressionRules: SuppressionRule[] = [
      {
        id: 'duplicate-alerts',
        eventName: '*',
        suppressionWindow: 300, // 5 minutes
        maxAlertsPerWindow: 5,
        enabled: true
      }
    ];

    defaultSuppressionRules.forEach(rule => this.suppressionRules.set(rule.id, rule));
  }

  private generateCorrelationId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// =====================================================
// EVENT CORRELATION ENGINE
// =====================================================

export class EventCorrelationEngine {
  private correlationRules: Map<string, CorrelationRule> = new Map();
  private eventBuffer: Map<string, any[]> = new Map();
  private correlationCache: Map<string, any> = new Map();

  constructor(private pubsub: RedisPubSub) {
    this.loadCorrelationRules();
    this.startCorrelationProcessing();
  }

  public async analyzeEvent(event: any): Promise<void> {
    // Add event to buffer for correlation analysis
    const bufferKey = this.getBufferKey(event);
    const buffer = this.eventBuffer.get(bufferKey) || [];
    buffer.push(event);
    
    // Keep only last 1000 events per buffer
    if (buffer.length > 1000) {
      buffer.shift();
    }
    
    this.eventBuffer.set(bufferKey, buffer);

    // Run correlation analysis
    await this.runCorrelationAnalysis(event);
  }

  private async runCorrelationAnalysis(event: any): Promise<void> {
    for (const [ruleId, rule] of this.correlationRules) {
      if (!rule.enabled) continue;

      const correlationResult = await this.evaluateCorrelationRule(rule, event);
      if (correlationResult.isCorrelated) {
        await this.publishCorrelation(correlationResult);
      }
    }
  }

  private async evaluateCorrelationRule(rule: CorrelationRule, event: any): Promise<CorrelationResult> {
    switch (rule.type) {
      case 'TEMPORAL':
        return this.evaluateTemporalCorrelation(rule, event);
      case 'SPATIAL':
        return this.evaluateSpatialCorrelation(rule, event);
      case 'BEHAVIORAL':
        return this.evaluateBehavioralCorrelation(rule, event);
      case 'CHAIN':
        return this.evaluateChainCorrelation(rule, event);
      default:
        return { isCorrelated: false, score: 0, relatedEvents: [] };
    }
  }

  private evaluateTemporalCorrelation(rule: CorrelationRule, event: any): CorrelationResult {
    const timeWindow = rule.parameters.timeWindowSeconds * 1000;
    const eventTime = new Date(event.timestamp).getTime();
    const bufferKey = this.getBufferKey(event);
    const buffer = this.eventBuffer.get(bufferKey) || [];

    const relatedEvents = buffer.filter(e => {
      const eTime = new Date(e.timestamp).getTime();
      return Math.abs(eventTime - eTime) <= timeWindow && 
             e.id !== event.id &&
             rule.condition(event, e);
    });

    return {
      isCorrelated: relatedEvents.length >= (rule.parameters.minEvents || 2),
      score: Math.min(relatedEvents.length / 10, 1.0),
      relatedEvents,
      correlationType: 'TEMPORAL',
      ruleId: rule.id
    };
  }

  private evaluateSpatialCorrelation(rule: CorrelationRule, event: any): CorrelationResult {
    // Correlate events from same source IP, subnet, or geographic location
    const bufferKey = this.getBufferKey(event);
    const buffer = this.eventBuffer.get(bufferKey) || [];

    const relatedEvents = buffer.filter(e => {
      return e.id !== event.id &&
             (e.sourceIp === event.sourceIp ||
              this.isInSameSubnet(e.sourceIp, event.sourceIp) ||
              this.isSameGeoLocation(e.geoLocation, event.geoLocation)) &&
             rule.condition(event, e);
    });

    return {
      isCorrelated: relatedEvents.length >= (rule.parameters.minEvents || 2),
      score: Math.min(relatedEvents.length / 5, 1.0),
      relatedEvents,
      correlationType: 'SPATIAL',
      ruleId: rule.id
    };
  }

  private evaluateBehavioralCorrelation(rule: CorrelationRule, event: any): CorrelationResult {
    // Correlate events based on user behavior patterns
    const bufferKey = `user:${event.userId}`;
    const buffer = this.eventBuffer.get(bufferKey) || [];

    const relatedEvents = buffer.filter(e => {
      return e.id !== event.id &&
             e.userId === event.userId &&
             rule.condition(event, e);
    });

    return {
      isCorrelated: relatedEvents.length >= (rule.parameters.minEvents || 2),
      score: this.calculateBehavioralScore(event, relatedEvents),
      relatedEvents,
      correlationType: 'BEHAVIORAL',
      ruleId: rule.id
    };
  }

  private evaluateChainCorrelation(rule: CorrelationRule, event: any): CorrelationResult {
    // Correlate events that form an attack chain
    const chainEvents = this.findAttackChain(event, rule);
    
    return {
      isCorrelated: chainEvents.length >= (rule.parameters.minChainLength || 3),
      score: Math.min(chainEvents.length / 10, 1.0),
      relatedEvents: chainEvents,
      correlationType: 'CHAIN',
      ruleId: rule.id
    };
  }

  private async publishCorrelation(result: CorrelationResult): Promise<void> {
    const correlation = {
      id: this.generateCorrelationId(),
      type: result.correlationType,
      score: result.score,
      primaryEvent: result.relatedEvents[0], // First event in correlation
      correlatedEvents: result.relatedEvents.slice(1),
      detectedAt: new Date(),
      ruleId: result.ruleId,
      metadata: {
        totalEvents: result.relatedEvents.length,
        confidence: result.score,
        timespan: this.calculateTimespan(result.relatedEvents)
      }
    };

    // Publish correlation to subscribers
    await this.pubsub.publish(SUBSCRIPTION_CHANNELS.EVENT_CORRELATIONS, {
      eventCorrelations: correlation
    });

    // Cache correlation for future reference
    this.correlationCache.set(correlation.id, correlation);
  }

  private getBufferKey(event: any): string {
    // Create buffer key based on event characteristics
    return `${event.deviceVendor}:${event.sourceIp}`;
  }

  private isInSameSubnet(ip1: string, ip2: string): boolean {
    // Implement subnet comparison logic
    if (!ip1 || !ip2) return false;
    const subnet1 = ip1.split('.').slice(0, 3).join('.');
    const subnet2 = ip2.split('.').slice(0, 3).join('.');
    return subnet1 === subnet2;
  }

  private isSameGeoLocation(geo1: any, geo2: any): boolean {
    // Implement geolocation comparison
    if (!geo1 || !geo2) return false;
    return geo1.country === geo2.country && geo1.city === geo2.city;
  }

  private calculateBehavioralScore(event: any, relatedEvents: any[]): number {
    // Calculate behavioral anomaly score
    const timePattern = this.analyzeTimePattern(relatedEvents);
    const actionPattern = this.analyzeActionPattern(relatedEvents);
    const locationPattern = this.analyzeLocationPattern(relatedEvents);
    
    return (timePattern + actionPattern + locationPattern) / 3;
  }

  private analyzeTimePattern(events: any[]): number {
    // Analyze if events follow unusual time patterns
    const hours = events.map(e => new Date(e.timestamp).getHours());
    const offHoursCount = hours.filter(h => h < 8 || h > 18).length;
    return offHoursCount / hours.length;
  }

  private analyzeActionPattern(events: any[]): number {
    // Analyze if actions are unusual for the user
    const uniqueActions = new Set(events.map(e => e.name)).size;
    const totalEvents = events.length;
    return Math.min(uniqueActions / totalEvents, 1.0);
  }

  private analyzeLocationPattern(events: any[]): number {
    // Analyze if locations are geographically dispersed
    const uniqueLocations = new Set(
      events.map(e => `${e.geoLocation?.country}:${e.geoLocation?.city}`)
        .filter(loc => loc !== 'undefined:undefined')
    ).size;
    
    return Math.min(uniqueLocations / 5, 1.0); // Normalize to 0-1
  }

  private findAttackChain(event: any, rule: CorrelationRule): any[] {
    // Implementation for finding attack chains based on MITRE ATT&CK patterns
    const chainEvents = [event];
    const buffer = this.eventBuffer.get(this.getBufferKey(event)) || [];
    
    // Look for events that form logical attack progression
    for (const candidateEvent of buffer) {
      if (this.isNextInAttackChain(chainEvents[chainEvents.length - 1], candidateEvent)) {
        chainEvents.push(candidateEvent);
      }
    }
    
    return chainEvents;
  }

  private isNextInAttackChain(currentEvent: any, candidateEvent: any): boolean {
    // Implementation for determining if candidateEvent logically follows currentEvent
    // in an attack chain based on MITRE ATT&CK kill chain phases
    if (!currentEvent.mitreAttackPatterns || !candidateEvent.mitreAttackPatterns) {
      return false;
    }

    const currentPhases = currentEvent.mitreAttackPatterns.map((p: any) => p.tactic.shortName);
    const candidatePhases = candidateEvent.mitreAttackPatterns.map((p: any) => p.tactic.shortName);

    // Define kill chain progression
    const killChainOrder = [
      'initial-access',
      'execution',
      'persistence',
      'privilege-escalation',
      'defense-evasion',
      'credential-access',
      'discovery',
      'lateral-movement',
      'collection',
      'command-and-control',
      'exfiltration',
      'impact'
    ];

    // Check if candidate event represents next phase in kill chain
    for (const currentPhase of currentPhases) {
      for (const candidatePhase of candidatePhases) {
        const currentIndex = killChainOrder.indexOf(currentPhase);
        const candidateIndex = killChainOrder.indexOf(candidatePhase);
        
        if (candidateIndex > currentIndex && candidateIndex - currentIndex <= 2) {
          return true;
        }
      }
    }

    return false;
  }

  private calculateTimespan(events: any[]): number {
    if (events.length < 2) return 0;
    
    const timestamps = events.map(e => new Date(e.timestamp).getTime()).sort();
    return timestamps[timestamps.length - 1] - timestamps[0];
  }

  private loadCorrelationRules(): void {
    const defaultRules: CorrelationRule[] = [
      {
        id: 'temporal-bruteforce',
        name: 'Temporal Brute Force Detection',
        type: 'TEMPORAL',
        enabled: true,
        parameters: {
          timeWindowSeconds: 300,
          minEvents: 5
        },
        condition: (event1, event2) => {
          return event1.name.includes('login') && 
                 event2.name.includes('login') &&
                 event1.sourceIp === event2.sourceIp;
        }
      },
      {
        id: 'spatial-lateral-movement',
        name: 'Lateral Movement Detection',
        type: 'SPATIAL',
        enabled: true,
        parameters: {
          minEvents: 3
        },
        condition: (event1, event2) => {
          return event1.name.includes('login') &&
                 event2.name.includes('login') &&
                 event1.userId === event2.userId &&
                 event1.destinationIp !== event2.destinationIp;
        }
      }
    ];

    defaultRules.forEach(rule => this.correlationRules.set(rule.id, rule));
  }

  private startCorrelationProcessing(): void {
    // Process correlations every 30 seconds
    setInterval(async () => {
      await this.processBufferedEvents();
    }, 30000);
  }

  private async processBufferedEvents(): Promise<void> {
    // Process any buffered events that haven't been correlated yet
    for (const [bufferKey, events] of this.eventBuffer) {
      if (events.length > 100) {
        // Keep only most recent events to prevent memory issues
        this.eventBuffer.set(bufferKey, events.slice(-100));
      }
    }
  }

  private generateCorrelationId(): string {
    return `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// =====================================================
// TYPE DEFINITIONS
// =====================================================

interface AlertRule {
  id: string;
  name: string;
  condition: (event: any) => boolean;
  priority: number;
  enabled: boolean;
}

interface AlertHistory {
  alertKey: string;
  firstSeen: Date;
  lastAlertTime: Date;
  alertCount: number;
}

interface SuppressionRule {
  id: string;
  eventName: string;
  suppressionWindow: number; // seconds
  maxAlertsPerWindow: number;
  enabled: boolean;
}

interface CorrelationRule {
  id: string;
  name: string;
  type: 'TEMPORAL' | 'SPATIAL' | 'BEHAVIORAL' | 'CHAIN';
  enabled: boolean;
  parameters: any;
  condition: (event1: any, event2: any) => boolean;
}

interface CorrelationResult {
  isCorrelated: boolean;
  score: number;
  relatedEvents: any[];
  correlationType?: string;
  ruleId?: string;
}

// =====================================================
// SUBSCRIPTION RESOLVERS WITH FILTERS
// =====================================================

export const subscriptionResolvers = {
  securityEventStream: {
    subscribe: withFilter(
      () => redisPubSub.asyncIterator(SUBSCRIPTION_CHANNELS.SECURITY_EVENT_STREAM),
      (payload, variables, context) => {
        // Permission check
        if (!context.user?.permissions?.includes('READ_SECURITY_EVENTS')) {
          return false;
        }

        if (!variables.filter) return true;
        
        const event = payload.securityEventStream;
        
        // Apply severity filter
        if (variables.filter.severities && 
            !variables.filter.severities.includes(event.severity)) {
          return false;
        }

        // Apply risk score threshold
        if (variables.filter.riskScoreThreshold && 
            event.riskScore < variables.filter.riskScoreThreshold) {
          return false;
        }

        // Apply vendor filter
        if (variables.filter.deviceVendors && 
            !variables.filter.deviceVendors.includes(event.deviceVendor)) {
          return false;
        }

        // Apply source IP filter
        if (variables.filter.sourceIps && 
            !variables.filter.sourceIps.includes(event.sourceIp)) {
          return false;
        }

        // Apply MITRE ATT&CK filter
        if (variables.filter.mitreAttackPatternIds && 
            !event.mitreAttackPatterns?.some((pattern: any) => 
              variables.filter.mitreAttackPatternIds.includes(pattern.id)
            )) {
          return false;
        }

        return true;
      }
    )
  },

  criticalSecurityAlerts: {
    subscribe: withFilter(
      () => redisPubSub.asyncIterator(SUBSCRIPTION_CHANNELS.CRITICAL_SECURITY_ALERTS),
      (payload, variables, context) => {
        // Only allow critical alert access to authorized users
        return context.user?.permissions?.includes('READ_CRITICAL_ALERTS');
      }
    )
  },

  caseUpdates: {
    subscribe: withFilter(
      () => redisPubSub.asyncIterator(SUBSCRIPTION_CHANNELS.CASE_UPDATES),
      (payload, variables, context) => {
        if (!context.user?.permissions?.includes('READ_CASES')) {
          return false;
        }

        if (!variables.caseId) return true;
        return payload.caseUpdates.id === variables.caseId;
      }
    )
  },

  caseAssignments: {
    subscribe: withFilter(
      () => redisPubSub.asyncIterator(SUBSCRIPTION_CHANNELS.CASE_ASSIGNMENTS),
      (payload, variables, context) => {
        // Only notify the assigned analyst
        return payload.caseAssignments.assignee?.id === variables.analystId;
      }
    )
  },

  playbookExecutionUpdates: {
    subscribe: withFilter(
      () => redisPubSub.asyncIterator(SUBSCRIPTION_CHANNELS.PLAYBOOK_EXECUTION_UPDATES),
      (payload, variables, context) => {
        if (!context.user?.permissions?.includes('READ_PLAYBOOK_EXECUTIONS')) {
          return false;
        }

        return payload.playbookExecutionUpdates.id === variables.executionId;
      }
    )
  },

  playbookApprovalRequests: {
    subscribe: withFilter(
      () => redisPubSub.asyncIterator(SUBSCRIPTION_CHANNELS.PLAYBOOK_APPROVAL_REQUESTS),
      (payload, variables, context) => {
        const execution = payload.playbookApprovalRequests;
        const pendingApprovals = execution.stepExecutions?.filter(
          (step: any) => step.step.requiresApproval && 
                        step.status === 'WAITING_FOR_APPROVAL' &&
                        step.step.approvers?.some((approver: any) => 
                          approver.id === variables.analystId
                        )
        );
        return pendingApprovals?.length > 0;
      }
    )
  },

  newThreatIntelligence: {
    subscribe: withFilter(
      () => redisPubSub.asyncIterator(SUBSCRIPTION_CHANNELS.NEW_THREAT_INTELLIGENCE),
      (payload, variables, context) => {
        if (!context.user?.permissions?.includes('READ_THREAT_INTELLIGENCE')) {
          return false;
        }

        if (!variables.source) return true;
        return payload.newThreatIntelligence.source?.name === variables.source;
      }
    )
  },

  iocUpdates: {
    subscribe: withFilter(
      () => redisPubSub.asyncIterator(SUBSCRIPTION_CHANNELS.IOC_UPDATES),
      (payload, variables, context) => {
        return context.user?.permissions?.includes('READ_IOCS');
      }
    )
  },

  systemHealthUpdates: {
    subscribe: withFilter(
      () => redisPubSub.asyncIterator(SUBSCRIPTION_CHANNELS.SYSTEM_HEALTH_UPDATES),
      (payload, variables, context) => {
        return context.user?.permissions?.includes('READ_SYSTEM_STATUS');
      }
    )
  },

  attackPatternDetections: {
    subscribe: withFilter(
      () => redisPubSub.asyncIterator(SUBSCRIPTION_CHANNELS.ATTACK_PATTERN_DETECTIONS),
      (payload, variables, context) => {
        return context.user?.permissions?.includes('READ_ATTACK_PATTERNS');
      }
    )
  },

  eventCorrelations: {
    subscribe: withFilter(
      () => redisPubSub.asyncIterator(SUBSCRIPTION_CHANNELS.EVENT_CORRELATIONS),
      (payload, variables, context) => {
        return context.user?.permissions?.includes('READ_CORRELATIONS');
      }
    )
  }
};

// Create global instance for use in resolvers
const redisPubSub = new RedisPubSub({
  publisher: new Redis(process.env.REDIS_URL || 'redis://localhost:6379'),
  subscriber: new Redis(process.env.REDIS_URL || 'redis://localhost:6379'),
});

export { redisPubSub };