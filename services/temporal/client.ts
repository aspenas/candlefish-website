#!/usr/bin/env ts-node
/**
 * Temporal Client - example usage for starting workflows
 */

import { createTemporalClient } from './setup';
import { agentWorkflow } from './workflows/agent-workflow';

async function main() {
  console.log('🚀 Connecting to Temporal...');

  try {
    const client = await createTemporalClient();
    console.log('✅ Connected to Temporal successfully');

    // Example: Start an agent workflow
    const handle = await client.workflow.start(agentWorkflow, {
      workflowId: `agent-workflow-${Date.now()}`,
      taskQueue: 'candlefish-agent-queue',
      args: [{
        agentId: 'test-agent',
        task: 'analyze_data',
        parameters: { dataset: 'user_interactions' }
      }],
    });

    console.log(`🎯 Started workflow: ${handle.workflowId}`);

    // Wait for result
    const result = await handle.result();
    console.log('📊 Workflow result:', result);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main().catch(console.error);
