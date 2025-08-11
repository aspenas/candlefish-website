/**
 * Horizontal Scalability and Data Partitioning Configuration
 * for Tyler Setup GraphQL Backend
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { createHash } from 'crypto';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Scalability configuration
const SCALABILITY_CONFIG = {
  // Partitioning strategies
  partitioning: {
    user: {
      strategy: 'hash',
      partitions: 10,
      hashFunction: 'md5',
      redistributionThreshold: 1000000, // 1M records per partition
    },
    audit: {
      strategy: 'temporal',
      partitions: 'monthly',
      retentionPeriod: 365, // days
      archiveAfter: 90, // days
    },
    events: {
      strategy: 'temporal',
      partitions: 'daily',
      retentionPeriod: 30, // days
      archiveAfter: 7, // days
    },
    cache: {
      strategy: 'functional',
      partitions: ['user', 'query', 'session', 'system'],
      ttlByPartition: {
        user: 300,     // 5 minutes
        query: 120,    // 2 minutes
        session: 1800, // 30 minutes
        system: 3600,  // 1 hour
      },
    },
  },

  // Auto-scaling configuration
  autoScaling: {
    enabled: true,
    targetUtilization: 70, // percent
    scaleUpCooldown: 300,  // seconds
    scaleDownCooldown: 900, // seconds
    minCapacity: 5,
    maxCapacity: 4000,

    // Table-specific settings
    tables: {
      entities: {
        readCapacity: { min: 10, max: 4000, target: 70 },
        writeCapacity: { min: 10, max: 4000, target: 70 },
        indexes: {
          'GSI1': { readCapacity: { min: 5, max: 2000, target: 70 } },
          'GSI2': { readCapacity: { min: 5, max: 2000, target: 70 } },
          'GSI3': { readCapacity: { min: 5, max: 1000, target: 70 } },
          'GSI4': { readCapacity: { min: 5, max: 1000, target: 70 } },
        },
      },
      events: {
        readCapacity: { min: 5, max: 1000, target: 70 },
        writeCapacity: { min: 20, max: 2000, target: 70 }, // Higher write capacity
      },
    },
  },

  // Read replica configuration
  readReplicas: {
    enabled: true,
    regions: ['us-west-2', 'eu-west-1'],
    consistencyLevel: 'eventually_consistent',
    replicationLag: 1000, // milliseconds
  },

  // Load balancing
  loadBalancing: {
    strategy: 'weighted_round_robin',
    healthCheckInterval: 30, // seconds
    failoverThreshold: 3,    // failed requests
    weights: {
      primary: 70,
      replica1: 20,
      replica2: 10,
    },
  },
};

/**
 * Data Partitioning Manager
 */
class DataPartitionManager {
  constructor() {
    this.partitionStrategies = {
      hash: this.hashPartitioning.bind(this),
      temporal: this.temporalPartitioning.bind(this),
      functional: this.functionalPartitioning.bind(this),
      range: this.rangePartitioning.bind(this),
    };
  }

  /**
   * Generate partition key based on strategy
   */
  generatePartitionKey(entityType, identifier, metadata = {}) {
    const config = SCALABILITY_CONFIG.partitioning[entityType.toLowerCase()];

    if (!config) {
      return this.defaultPartitionKey(entityType, identifier);
    }

    const strategy = this.partitionStrategies[config.strategy];
    if (!strategy) {
      throw new Error(`Unknown partitioning strategy: ${config.strategy}`);
    }

    return strategy(entityType, identifier, config, metadata);
  }

  /**
   * Hash-based partitioning for even distribution
   */
  hashPartitioning(entityType, identifier, config) {
    const hash = createHash(config.hashFunction || 'md5')
      .update(identifier.toString())
      .digest('hex');

    const partition = parseInt(hash.substring(0, 8), 16) % config.partitions;
    return `${entityType}#P${partition.toString().padStart(3, '0')}`;
  }

  /**
   * Temporal partitioning for time-series data
   */
  temporalPartitioning(entityType, identifier, config, metadata = {}) {
    const timestamp = metadata.timestamp || Date.now();
    const date = new Date(timestamp);

    let partitionSuffix;

    switch (config.partitions) {
      case 'daily':
        partitionSuffix = date.toISOString().substring(0, 10); // YYYY-MM-DD
        break;
      case 'weekly':
        const weekNumber = this.getWeekNumber(date);
        partitionSuffix = `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
        break;
      case 'monthly':
        partitionSuffix = date.toISOString().substring(0, 7); // YYYY-MM
        break;
      case 'yearly':
        partitionSuffix = date.getFullYear().toString();
        break;
      default:
        partitionSuffix = date.toISOString().substring(0, 10);
    }

    return `${entityType}#${partitionSuffix}`;
  }

  /**
   * Functional partitioning based on data type/category
   */
  functionalPartitioning(entityType, identifier, config, metadata = {}) {
    const category = metadata.category || this.inferCategory(identifier);

    if (config.partitions.includes(category)) {
      return `${entityType}#${category.toUpperCase()}`;
    }

    return `${entityType}#DEFAULT`;
  }

  /**
   * Range-based partitioning for ordered data
   */
  rangePartitioning(entityType, identifier, config, metadata = {}) {
    const value = metadata.rangeValue || this.extractNumericValue(identifier);
    const rangeSize = config.rangeSize || 1000;
    const partition = Math.floor(value / rangeSize);

    return `${entityType}#R${partition.toString().padStart(6, '0')}`;
  }

  /**
   * Default partitioning strategy
   */
  defaultPartitionKey(entityType, identifier) {
    return `${entityType}#${identifier}`;
  }

  /**
   * Partition rebalancing for hot partitions
   */
  async rebalancePartition(originalPartition, newPartitionCount) {
    console.log(`Rebalancing partition: ${originalPartition}`);

    // Scan original partition
    const items = await this.scanPartition(originalPartition);

    // Redistribute items to new partitions
    const redistributedItems = this.redistributeItems(items, newPartitionCount);

    // Write to new partitions
    await this.writeRedistributedItems(redistributedItems);

    // Verify redistribution
    const verification = await this.verifyRedistribution(originalPartition, redistributedItems);

    if (verification.success) {
      console.log(`Successfully rebalanced ${items.length} items`);
      return { success: true, itemsRebalanced: items.length };
    } else {
      throw new Error(`Rebalancing verification failed: ${verification.error}`);
    }
  }

  /**
   * Utility methods
   */

  getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  inferCategory(identifier) {
    if (identifier.includes('user')) return 'user';
    if (identifier.includes('query')) return 'query';
    if (identifier.includes('session')) return 'session';
    return 'system';
  }

  extractNumericValue(identifier) {
    const match = identifier.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  }

  async scanPartition(partitionKey) {
    // Implementation would scan specific partition
    return [];
  }

  redistributeItems(items, newPartitionCount) {
    // Implementation would redistribute items based on new partition strategy
    return {};
  }

  async writeRedistributedItems(redistributedItems) {
    // Implementation would write items to new partitions
  }

  async verifyRedistribution(originalPartition, redistributedItems) {
    // Implementation would verify successful redistribution
    return { success: true };
  }
}

/**
 * Auto-Scaling Manager
 */
class AutoScalingManager {
  constructor() {
    this.scalingPolicies = new Map();
    this.metricsHistory = new Map();
  }

  /**
   * Configure auto-scaling for a table
   */
  async configureAutoScaling(tableName, tableConfig) {
    console.log(`Configuring auto-scaling for table: ${tableName}`);

    const config = tableConfig || SCALABILITY_CONFIG.autoScaling.tables.entities;

    // Configure read capacity scaling
    if (config.readCapacity) {
      await this.createScalingPolicy(tableName, 'read', config.readCapacity);
    }

    // Configure write capacity scaling
    if (config.writeCapacity) {
      await this.createScalingPolicy(tableName, 'write', config.writeCapacity);
    }

    // Configure index scaling
    if (config.indexes) {
      for (const [indexName, indexConfig] of Object.entries(config.indexes)) {
        await this.createIndexScalingPolicy(tableName, indexName, indexConfig);
      }
    }

    console.log(`Auto-scaling configured for ${tableName}`);
  }

  /**
   * Create scaling policy for table
   */
  async createScalingPolicy(tableName, capacityType, config) {
    const policyKey = `${tableName}-${capacityType}`;

    const policy = {
      tableName,
      capacityType,
      minCapacity: config.min,
      maxCapacity: config.max,
      targetUtilization: config.target,
      scaleUpCooldown: SCALABILITY_CONFIG.autoScaling.scaleUpCooldown,
      scaleDownCooldown: SCALABILITY_CONFIG.autoScaling.scaleDownCooldown,
      lastScalingAction: null,
      currentCapacity: config.min,
    };

    this.scalingPolicies.set(policyKey, policy);

    // In a real implementation, this would create AWS Application Auto Scaling policies
    console.log(`Created scaling policy: ${policyKey}`);
  }

  /**
   * Create scaling policy for index
   */
  async createIndexScalingPolicy(tableName, indexName, config) {
    const policyKey = `${tableName}-${indexName}-read`;

    const policy = {
      tableName,
      indexName,
      capacityType: 'read',
      minCapacity: config.readCapacity.min,
      maxCapacity: config.readCapacity.max,
      targetUtilization: config.readCapacity.target,
      scaleUpCooldown: SCALABILITY_CONFIG.autoScaling.scaleUpCooldown,
      scaleDownCooldown: SCALABILITY_CONFIG.autoScaling.scaleDownCooldown,
      lastScalingAction: null,
      currentCapacity: config.readCapacity.min,
    };

    this.scalingPolicies.set(policyKey, policy);

    console.log(`Created index scaling policy: ${policyKey}`);
  }

  /**
   * Monitor and trigger scaling based on metrics
   */
  async monitorAndScale() {
    for (const [policyKey, policy] of this.scalingPolicies.entries()) {
      try {
        const currentUtilization = await this.getCurrentUtilization(policy);
        const shouldScale = this.evaluateScalingNeed(policy, currentUtilization);

        if (shouldScale.action !== 'none') {
          await this.executeScalingAction(policy, shouldScale);
        }

      } catch (error) {
        console.error(`Error monitoring policy ${policyKey}:`, error);
      }
    }
  }

  /**
   * Evaluate if scaling is needed
   */
  evaluateScalingNeed(policy, currentUtilization) {
    const now = Date.now();

    // Check cooldown periods
    if (policy.lastScalingAction) {
      const timeSinceLastAction = now - policy.lastScalingAction.timestamp;
      const cooldownPeriod = policy.lastScalingAction.type === 'scale_up'
        ? policy.scaleUpCooldown * 1000
        : policy.scaleDownCooldown * 1000;

      if (timeSinceLastAction < cooldownPeriod) {
        return { action: 'none', reason: 'cooldown_active' };
      }
    }

    // Evaluate scaling need
    if (currentUtilization > policy.targetUtilization + 10) { // 10% buffer
      if (policy.currentCapacity < policy.maxCapacity) {
        return {
          action: 'scale_up',
          utilization: currentUtilization,
          reason: 'high_utilization'
        };
      }
    } else if (currentUtilization < policy.targetUtilization - 20) { // 20% buffer for scale down
      if (policy.currentCapacity > policy.minCapacity) {
        return {
          action: 'scale_down',
          utilization: currentUtilization,
          reason: 'low_utilization'
        };
      }
    }

    return { action: 'none', utilization: currentUtilization };
  }

  /**
   * Execute scaling action
   */
  async executeScalingAction(policy, scalingDecision) {
    console.log(`Executing ${scalingDecision.action} for ${policy.tableName}`);

    const scalingFactor = scalingDecision.action === 'scale_up' ? 2 : 0.5;
    const newCapacity = Math.round(policy.currentCapacity * scalingFactor);

    // Ensure within bounds
    const boundedCapacity = Math.max(
      policy.minCapacity,
      Math.min(policy.maxCapacity, newCapacity)
    );

    try {
      // In real implementation, this would call DynamoDB UpdateTable API
      await this.updateTableCapacity(policy, boundedCapacity);

      // Update policy state
      policy.currentCapacity = boundedCapacity;
      policy.lastScalingAction = {
        type: scalingDecision.action,
        timestamp: Date.now(),
        oldCapacity: policy.currentCapacity,
        newCapacity: boundedCapacity,
        utilization: scalingDecision.utilization,
      };

      console.log(`Successfully scaled ${policy.tableName} to ${boundedCapacity} capacity units`);

    } catch (error) {
      console.error(`Failed to scale ${policy.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Get current utilization metrics
   */
  async getCurrentUtilization(policy) {
    // In real implementation, this would query CloudWatch metrics
    // For now, return simulated data
    return Math.random() * 100; // Random utilization between 0-100%
  }

  /**
   * Update table capacity
   */
  async updateTableCapacity(policy, newCapacity) {
    // Placeholder for actual DynamoDB table update
    console.log(`Updating ${policy.tableName} capacity to ${newCapacity}`);
  }

  /**
   * Get scaling statistics
   */
  getScalingStats() {
    const stats = {
      totalPolicies: this.scalingPolicies.size,
      activePolicies: 0,
      recentScalingActions: [],
      capacityDistribution: {},
    };

    for (const [policyKey, policy] of this.scalingPolicies.entries()) {
      stats.capacityDistribution[policyKey] = {
        current: policy.currentCapacity,
        min: policy.minCapacity,
        max: policy.maxCapacity,
        utilization: policy.targetUtilization,
      };

      if (policy.lastScalingAction) {
        const timeSinceLastAction = Date.now() - policy.lastScalingAction.timestamp;

        if (timeSinceLastAction < 3600000) { // Last hour
          stats.recentScalingActions.push({
            policy: policyKey,
            action: policy.lastScalingAction.type,
            timestamp: new Date(policy.lastScalingAction.timestamp).toISOString(),
            capacity: policy.lastScalingAction.newCapacity,
          });
        }
      }
    }

    stats.activePolicies = this.scalingPolicies.size;
    return stats;
  }
}

/**
 * Read Replica Manager
 */
class ReadReplicaManager {
  constructor() {
    this.replicas = new Map();
    this.healthStatus = new Map();
    this.loadBalancer = new LoadBalancer();
  }

  /**
   * Configure read replicas
   */
  async configureReadReplicas() {
    const config = SCALABILITY_CONFIG.readReplicas;

    if (!config.enabled) {
      console.log('Read replicas disabled');
      return;
    }

    console.log('Configuring read replicas...');

    for (const region of config.regions) {
      await this.createReadReplica(region, config);
    }

    // Configure load balancer
    this.loadBalancer.configure(SCALABILITY_CONFIG.loadBalancing);

    console.log(`Read replicas configured for ${config.regions.length} regions`);
  }

  /**
   * Create read replica in specific region
   */
  async createReadReplica(region, config) {
    const replicaId = `replica-${region}`;

    const replica = {
      id: replicaId,
      region,
      endpoint: `https://dynamodb.${region}.amazonaws.com`,
      consistencyLevel: config.consistencyLevel,
      replicationLag: config.replicationLag,
      status: 'creating',
      lastHealthCheck: null,
    };

    this.replicas.set(replicaId, replica);
    this.healthStatus.set(replicaId, { healthy: false, lastCheck: null });

    // In real implementation, this would create Global Tables
    console.log(`Created read replica: ${replicaId} in ${region}`);

    // Simulate replica becoming available
    setTimeout(() => {
      replica.status = 'available';
      this.healthStatus.set(replicaId, { healthy: true, lastCheck: Date.now() });
    }, 5000);
  }

  /**
   * Route read requests to appropriate replica
   */
  async routeReadRequest(query, options = {}) {
    const consistencyRequirement = options.consistencyLevel || 'eventually_consistent';

    // For strong consistency, always use primary
    if (consistencyRequirement === 'strong') {
      return this.executeOnPrimary(query);
    }

    // Get available replicas
    const availableReplicas = this.getHealthyReplicas();

    if (availableReplicas.length === 0) {
      console.warn('No healthy replicas available, falling back to primary');
      return this.executeOnPrimary(query);
    }

    // Use load balancer to select replica
    const selectedReplica = this.loadBalancer.selectReplica(availableReplicas);

    try {
      return await this.executeOnReplica(query, selectedReplica);
    } catch (error) {
      console.error(`Query failed on replica ${selectedReplica.id}:`, error);

      // Mark replica as unhealthy and retry on primary
      this.markReplicaUnhealthy(selectedReplica.id);
      return this.executeOnPrimary(query);
    }
  }

  /**
   * Execute query on primary region
   */
  async executeOnPrimary(query) {
    // Implementation would execute query on primary DynamoDB instance
    console.log('Executing query on primary region');
    return { source: 'primary', result: 'query_result' };
  }

  /**
   * Execute query on specific replica
   */
  async executeOnReplica(query, replica) {
    console.log(`Executing query on replica: ${replica.id}`);

    // Check replication lag
    if (replica.replicationLag > SCALABILITY_CONFIG.readReplicas.replicationLag) {
      console.warn(`High replication lag on ${replica.id}: ${replica.replicationLag}ms`);
    }

    return { source: replica.id, result: 'query_result' };
  }

  /**
   * Get healthy replicas
   */
  getHealthyReplicas() {
    const healthy = [];

    for (const [replicaId, replica] of this.replicas.entries()) {
      const health = this.healthStatus.get(replicaId);

      if (health && health.healthy && replica.status === 'available') {
        healthy.push(replica);
      }
    }

    return healthy;
  }

  /**
   * Mark replica as unhealthy
   */
  markReplicaUnhealthy(replicaId) {
    this.healthStatus.set(replicaId, {
      healthy: false,
      lastCheck: Date.now(),
      consecutiveFailures: (this.healthStatus.get(replicaId)?.consecutiveFailures || 0) + 1,
    });
  }

  /**
   * Health check for all replicas
   */
  async performHealthChecks() {
    for (const [replicaId, replica] of this.replicas.entries()) {
      try {
        const isHealthy = await this.checkReplicaHealth(replica);

        this.healthStatus.set(replicaId, {
          healthy: isHealthy,
          lastCheck: Date.now(),
          consecutiveFailures: isHealthy ? 0 :
            (this.healthStatus.get(replicaId)?.consecutiveFailures || 0) + 1,
        });

      } catch (error) {
        console.error(`Health check failed for ${replicaId}:`, error);
        this.markReplicaUnhealthy(replicaId);
      }
    }
  }

  /**
   * Check individual replica health
   */
  async checkReplicaHealth(replica) {
    // Implementation would perform actual health check
    // For now, simulate health check
    return Math.random() > 0.1; // 90% healthy
  }
}

/**
 * Load Balancer for replica selection
 */
class LoadBalancer {
  constructor() {
    this.strategy = null;
    this.weights = {};
    this.requestCounts = new Map();
  }

  configure(config) {
    this.strategy = config.strategy;
    this.weights = config.weights || {};
    this.failoverThreshold = config.failoverThreshold;
  }

  selectReplica(availableReplicas) {
    if (availableReplicas.length === 0) {
      return null;
    }

    if (availableReplicas.length === 1) {
      return availableReplicas[0];
    }

    switch (this.strategy) {
      case 'round_robin':
        return this.roundRobinSelection(availableReplicas);
      case 'weighted_round_robin':
        return this.weightedRoundRobinSelection(availableReplicas);
      case 'least_connections':
        return this.leastConnectionsSelection(availableReplicas);
      case 'random':
        return this.randomSelection(availableReplicas);
      default:
        return this.roundRobinSelection(availableReplicas);
    }
  }

  roundRobinSelection(replicas) {
    const currentIndex = this.requestCounts.get('round_robin_index') || 0;
    const selectedReplica = replicas[currentIndex % replicas.length];
    this.requestCounts.set('round_robin_index', currentIndex + 1);
    return selectedReplica;
  }

  weightedRoundRobinSelection(replicas) {
    // Simplified weighted selection
    const weights = [70, 20, 10]; // Primary, replica1, replica2
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const random = Math.random() * totalWeight;

    let cumulativeWeight = 0;
    for (let i = 0; i < replicas.length && i < weights.length; i++) {
      cumulativeWeight += weights[i];
      if (random <= cumulativeWeight) {
        return replicas[i];
      }
    }

    return replicas[0];
  }

  leastConnectionsSelection(replicas) {
    // Select replica with fewest active connections
    let minConnections = Infinity;
    let selectedReplica = replicas[0];

    for (const replica of replicas) {
      const connections = this.requestCounts.get(`connections_${replica.id}`) || 0;
      if (connections < minConnections) {
        minConnections = connections;
        selectedReplica = replica;
      }
    }

    return selectedReplica;
  }

  randomSelection(replicas) {
    const randomIndex = Math.floor(Math.random() * replicas.length);
    return replicas[randomIndex];
  }

  recordRequest(replicaId) {
    const current = this.requestCounts.get(`connections_${replicaId}`) || 0;
    this.requestCounts.set(`connections_${replicaId}`, current + 1);
  }

  recordCompletion(replicaId) {
    const current = this.requestCounts.get(`connections_${replicaId}`) || 0;
    this.requestCounts.set(`connections_${replicaId}`, Math.max(0, current - 1));
  }
}

/**
 * Main Scalability Controller
 */
class ScalabilityController {
  constructor() {
    this.partitionManager = new DataPartitionManager();
    this.autoScalingManager = new AutoScalingManager();
    this.readReplicaManager = new ReadReplicaManager();
    this.monitoringInterval = null;
  }

  /**
   * Initialize all scalability components
   */
  async initialize() {
    console.log('Initializing scalability components...');

    // Configure auto-scaling for all tables
    const tables = Object.keys(SCALABILITY_CONFIG.autoScaling.tables);
    for (const tableName of tables) {
      const tableConfig = SCALABILITY_CONFIG.autoScaling.tables[tableName];
      await this.autoScalingManager.configureAutoScaling(tableName, tableConfig);
    }

    // Configure read replicas
    await this.readReplicaManager.configureReadReplicas();

    // Start monitoring
    this.startMonitoring();

    console.log('Scalability components initialized successfully');
  }

  /**
   * Start monitoring and auto-scaling
   */
  startMonitoring() {
    // Monitor auto-scaling every minute
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.autoScalingManager.monitorAndScale();
        await this.readReplicaManager.performHealthChecks();
      } catch (error) {
        console.error('Monitoring error:', error);
      }
    }, 60000);

    console.log('Started scalability monitoring');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('Stopped scalability monitoring');
    }
  }

  /**
   * Get comprehensive scalability status
   */
  getScalabilityStatus() {
    return {
      autoScaling: this.autoScalingManager.getScalingStats(),
      readReplicas: {
        configured: this.readReplicaManager.replicas.size,
        healthy: this.readReplicaManager.getHealthyReplicas().length,
        replicas: Array.from(this.readReplicaManager.replicas.values()),
      },
      partitioning: {
        strategies: Object.keys(SCALABILITY_CONFIG.partitioning),
        config: SCALABILITY_CONFIG.partitioning,
      },
      monitoring: {
        active: this.monitoringInterval !== null,
        interval: 60000,
      },
    };
  }

  /**
   * Handle partition key generation
   */
  generatePartitionKey(entityType, identifier, metadata = {}) {
    return this.partitionManager.generatePartitionKey(entityType, identifier, metadata);
  }

  /**
   * Route read request through replicas
   */
  async routeReadRequest(query, options = {}) {
    return this.readReplicaManager.routeReadRequest(query, options);
  }

  /**
   * Perform partition rebalancing
   */
  async rebalancePartition(partitionKey, newPartitionCount) {
    return this.partitionManager.rebalancePartition(partitionKey, newPartitionCount);
  }
}

// Export singleton instance
const scalabilityController = new ScalabilityController();

export {
  ScalabilityController,
  DataPartitionManager,
  AutoScalingManager,
  ReadReplicaManager,
  LoadBalancer,
  SCALABILITY_CONFIG,
  scalabilityController,
};

// CLI interface
async function main() {
  const command = process.argv[2];

  try {
    switch (command) {
      case 'init':
        await scalabilityController.initialize();
        break;

      case 'status':
        const status = scalabilityController.getScalabilityStatus();
        console.log(JSON.stringify(status, null, 2));
        break;

      case 'generate-key':
        const entityType = process.argv[3];
        const identifier = process.argv[4];
        const key = scalabilityController.generatePartitionKey(entityType, identifier);
        console.log(`Partition key: ${key}`);
        break;

      case 'rebalance':
        const partition = process.argv[3];
        const newCount = parseInt(process.argv[4]) || 10;
        const result = await scalabilityController.rebalancePartition(partition, newCount);
        console.log(`Rebalanced ${result.itemsRebalanced} items`);
        break;

      default:
        console.log(`
Usage: node scalability-config.js <command>

Commands:
  init                              - Initialize scalability components
  status                           - Show scalability status
  generate-key <type> <id>         - Generate partition key
  rebalance <partition> <count>    - Rebalance partition

Examples:
  node scalability-config.js init
  node scalability-config.js generate-key USER user123
  node scalability-config.js rebalance USER#P001 20
        `);
    }
  } catch (error) {
    console.error('Command failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
