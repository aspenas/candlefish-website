#!/usr/bin/env node

// Test Temporal Cloud connection with API key
const { Connection, Client } = require('@temporalio/client');

async function testConnection() {
  const apiKey = process.env.TEMPORAL_API_KEY;
  const address = process.env.TEMPORAL_ADDRESS || 'hgipo.tmprl.cloud:7233';
  const namespace = process.env.TEMPORAL_NAMESPACE || 'default';

  if (!apiKey) {
    console.error('❌ TEMPORAL_API_KEY environment variable is required');
    process.exit(1);
  }

  console.log('🔧 Testing Temporal Cloud connection...');
  console.log(`Address: ${address}`);
  console.log(`Namespace: ${namespace}`);
  console.log(`API Key: ${apiKey.substring(0, 20)}...`);

  try {
    // For Temporal Cloud, use Connection.connect with API key
    const connection = await Connection.connect({
      address,
      tls: true,
      apiKey,
    });

    console.log('✅ Connection established');

    // Create client
    const client = new Client({
      connection,
      namespace,
    });

    // Test the connection by listing workflows
    console.log('📋 Testing client connection...');
    const handle = await client.workflow.list({
      query: 'WorkflowType="PaintboxWorkflow"'
    });

    let count = 0;
    for await (const workflow of handle) {
      count++;
      if (count <= 3) {
        console.log(`  - Workflow: ${workflow.workflowId} (${workflow.status.name})`);
      }
    }

    if (count === 0) {
      console.log('  No workflows found (this is normal for a new namespace)');
    } else {
      console.log(`  Total workflows: ${count}`);
    }

    console.log('✅ Temporal Cloud connection successful!');

    await connection.close();

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

// Load environment variables and test
async function main() {
  // Try to load from AWS Secrets Manager if available
  try {
    const { execSync } = require('child_process');
    const apiKey = execSync('aws secretsmanager get-secret-value --secret-id temporal/api-key --query SecretString --output text 2>/dev/null', { encoding: 'utf8' }).trim();
    if (apiKey) {
      process.env.TEMPORAL_API_KEY = apiKey;
      console.log('✅ Loaded API key from AWS Secrets Manager');
    }
  } catch (e) {
    console.log('⚠️  Could not load from AWS Secrets Manager, using environment variable');
  }

  process.env.TEMPORAL_ADDRESS = 'hgipo.tmprl.cloud:7233';
  process.env.TEMPORAL_NAMESPACE = 'default';

  await testConnection();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testConnection };
