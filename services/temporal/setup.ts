/**
 * Temporal.io Setup and Configuration
 * For Candlefish Agent Platform
 */

import { Connection, Client } from '@temporalio/client';
import { Worker } from '@temporalio/worker';
import { SecretsManager } from '../secrets/secrets-manager';
import * as activities from './activities';

// Temporal Cloud connection configuration
export interface TemporalConfig {
  address: string; // Your Temporal Cloud address
  namespace: string; // Your namespace
  taskQueue: string;
  identity?: string;
  tls?: {
    clientCertPath?: string;
    clientKeyPath?: string;
  };
}

/**
 * Initialize Temporal Client for workflow execution
 */
export async function createTemporalClient(): Promise<Client> {
  const secretsManager = new SecretsManager();

  // Get Temporal Cloud credentials from AWS Secrets Manager
  const temporalSecret = await secretsManager.getSecret('temporal/cloud/credentials');
  const config: TemporalConfig = JSON.parse(temporalSecret);

  // Create connection with TLS if using Temporal Cloud
  const connection = await Connection.connect({
    address: config.address || 'localhost:7233',
    tls: config.tls ? {
      clientCertPair: {
        crt: await secretsManager.getSecret('temporal/cloud/client-cert'),
        key: await secretsManager.getSecret('temporal/cloud/client-key'),
      },
    } : undefined,
  });

  // Create client
  const client = new Client({
    connection,
    namespace: config.namespace || 'default',
  });

  return client;
}

/**
 * Create Temporal Worker for processing workflows
 */
export async function createTemporalWorker(): Promise<Worker> {
  const secretsManager = new SecretsManager();
  const temporalSecret = await secretsManager.getSecret('temporal/cloud/credentials');
  const config: TemporalConfig = JSON.parse(temporalSecret);

  const connection = await Connection.connect({
    address: config.address || 'localhost:7233',
    tls: config.tls ? {
      clientCertPair: {
        crt: await secretsManager.getSecret('temporal/cloud/client-cert'),
        key: await secretsManager.getSecret('temporal/cloud/client-key'),
      },
    } : undefined,
  });

  const worker = await Worker.create({
    connection,
    namespace: config.namespace || 'default',
    taskQueue: config.taskQueue || 'candlefish-agent-queue',
    workflowsPath: require.resolve('./workflows'),
    activities,
    maxConcurrentActivityTaskExecutions: 10,
    maxConcurrentWorkflowTaskExecutions: 10,
  });

  return worker;
}

/**
 * Health check for Temporal connection
 */
export async function checkTemporalHealth(): Promise<boolean> {
  try {
    const client = await createTemporalClient();
    const handle = await client.workflow.getHandle('health-check-workflow');
    await handle.query('status');
    return true;
  } catch (error) {
    console.error('Temporal health check failed:', error);
    return false;
  }
}
