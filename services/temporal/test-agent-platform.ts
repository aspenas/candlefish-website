#!/usr/bin/env ts-node

import { Client } from '@temporalio/client';
import { AgentOrchestrationWorkflow } from './workflows/agent-orchestrator';
import { v4 as uuidv4 } from 'uuid';

async function testAgentPlatform() {
  console.log('🧪 Testing Candlefish Agent Platform');
  console.log('=====================================\n');

  try {
    // Initialize Temporal client
    console.log('1. Connecting to Temporal...');
    const client = new Client({
      connection: {
        address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
      },
      namespace: process.env.TEMPORAL_NAMESPACE || 'default',
    });

    // Test cases
    const testCases = [
      {
        name: 'Simple Question',
        request: {
          prompt: 'What is the capital of France?',
          metadata: {},
        },
        config: {
          modelPreference: 'together' as const, // Use cheap model for testing
        },
      },
      {
        name: 'Code Generation',
        request: {
          prompt: 'Write a TypeScript function to calculate fibonacci numbers',
          metadata: {
            projectId: 'test-project',
          },
        },
        config: {
          modelPreference: 'anthropic' as const,
        },
      },
      {
        name: 'Data Analysis',
        request: {
          prompt: 'Analyze the trend: [1, 2, 4, 8, 16, 32]',
          metadata: {},
        },
        config: {
          modelPreference: 'openai' as const,
        },
      },
    ];

    console.log('2. Running test cases...\n');

    for (const testCase of testCases) {
      console.log(`📝 Test: ${testCase.name}`);
      console.log(`   Prompt: "${testCase.request.prompt}"`);
      console.log(`   Model: ${testCase.config.modelPreference}`);

      const workflowId = `test-agent-${uuidv4()}`;

      try {
        // Start workflow
        const handle = await client.workflow.start(AgentOrchestrationWorkflow, {
          taskQueue: 'candlefish-agent-queue',
          workflowId,
          args: [{
            request: testCase.request,
            userId: 'test-user',
            sessionId: uuidv4(),
            config: testCase.config,
          }],
        });

        console.log(`   Workflow ID: ${workflowId}`);

        // Poll for progress
        let lastProgress = 0;
        const pollInterval = setInterval(async () => {
          try {
            const progress = await handle.query('getProgress');
            if (progress > lastProgress) {
              console.log(`   Progress: ${progress}%`);
              lastProgress = progress;
            }
          } catch (e) {
            // Query might fail if workflow hasn't started
          }
        }, 500);

        // Wait for result with timeout
        const result = await Promise.race([
          handle.result(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 10000)
          ),
        ]);

        clearInterval(pollInterval);

        if (result.success) {
          console.log(`   ✅ Success!`);
          console.log(`   Response preview: ${result.content.substring(0, 100)}...`);
          console.log(`   Tokens used: ${result.metadata?.tokensUsed || 'N/A'}`);
          console.log(`   Processing time: ${result.metadata?.processingTime || 'N/A'}ms`);
        } else {
          console.log(`   ❌ Failed: ${result.error}`);
        }

      } catch (error) {
        console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      console.log('');
    }

    console.log('3. Testing workflow queries...');

    // Start a workflow for query testing
    const queryTestId = `test-query-${uuidv4()}`;
    const handle = await client.workflow.start(AgentOrchestrationWorkflow, {
      taskQueue: 'candlefish-agent-queue',
      workflowId: queryTestId,
      args: [{
        request: { prompt: 'Long running test', metadata: {} },
        userId: 'test-user',
        sessionId: uuidv4(),
        config: { modelPreference: 'together' as const },
      }],
    });

    // Test queries
    const state = await handle.query('getState');
    console.log(`   State query: ${JSON.stringify(state.status)}`);

    const progress = await handle.query('getProgress');
    console.log(`   Progress query: ${progress}%`);

    // Test signal
    console.log('   Sending cancel signal...');
    await handle.signal('cancel');

    // Wait a bit and check state
    await new Promise(resolve => setTimeout(resolve, 1000));
    const finalState = await handle.query('getState');
    console.log(`   Final state: ${finalState.status}`);

    console.log('\n✅ All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testAgentPlatform().catch(console.error);
