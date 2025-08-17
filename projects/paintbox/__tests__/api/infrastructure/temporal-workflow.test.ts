/**
 * Temporal Workflow Test Suite
 * Tests for Temporal workflow execution and monitoring
 */

import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import { AgentWorkflow, AgentWorkflowInput } from '@/services/temporal/workflows/agent-workflow';
import { temporalWorkflowFactory } from '../../factories/apiFactory';
import { createMockActivities } from '../../mocks/temporalActivities';

describe('Temporal Workflow Integration', () => {
  let testEnv: TestWorkflowEnvironment;
  let mockActivities: jest.Mocked<any>;

  beforeAll(async () => {
    // Create test environment
    testEnv = await TestWorkflowEnvironment.createTimeSkipping();
    mockActivities = createMockActivities();
  });

  afterAll(async () => {
    await testEnv?.teardown();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AgentWorkflow Execution', () => {
    it('should execute complete workflow successfully', async () => {
      // Arrange
      const workflowInput: AgentWorkflowInput = temporalWorkflowFactory.createWorkflowInput();
      const worker = await Worker.create({
        connection: testEnv.nativeConnection,
        taskQueue: 'test-queue',
        workflowsPath: require.resolve('@/services/temporal/workflows'),
        activities: mockActivities,
      });

      // Act
      const result = await testEnv.client.workflow.execute(AgentWorkflow, {
        args: [workflowInput],
        workflowId: `test-workflow-${Date.now()}`,
        taskQueue: 'test-queue',
      });

      // Assert
      expect(result.metadata.success).toBe(true);
      expect(result.metadata.workflowId).toBeDefined();
      expect(result.metadata.duration).toBeGreaterThan(0);
      expect(result.response).toBeDefined();
      expect(mockActivities.parseUserIntent).toHaveBeenCalled();
      expect(mockActivities.formatResponse).toHaveBeenCalled();
    });

    it('should handle Excel transformation requests', async () => {
      // Arrange
      const workflowInput = temporalWorkflowFactory.createExcelTransformationInput();
      mockActivities.parseUserIntent.mockResolvedValue({
        type: 'excel_transformation',
        fileData: 'mock-excel-data',
        targetFramework: 'react',
        features: ['charts', 'validation'],
        cost: 0.1
      });
      mockActivities.performExcelTransformation.mockResolvedValue({
        response: 'Excel transformation completed successfully',
        duration: 5000,
        generatedFiles: ['component.tsx', 'types.ts']
      });

      // Act
      const result = await testEnv.client.workflow.execute(AgentWorkflow, {
        args: [workflowInput],
        workflowId: `excel-workflow-${Date.now()}`,
        taskQueue: 'test-queue',
      });

      // Assert
      expect(result.metadata.success).toBe(true);
      expect(result.metadata.toolsUsed).toContain('excel-transformer');
      expect(mockActivities.performExcelTransformation).toHaveBeenCalledWith({
        fileData: 'mock-excel-data',
        targetFramework: 'react',
        features: ['charts', 'validation']
      });
      expect(mockActivities.saveToMemory).toHaveBeenCalled();
    });

    it('should handle tool selection and execution', async () => {
      // Arrange
      const workflowInput = temporalWorkflowFactory.createToolExecutionInput();
      mockActivities.parseUserIntent.mockResolvedValue({
        type: 'tool_execution',
        parameters: { action: 'deploy', environment: 'staging' },
        cost: 0.05
      });
      mockActivities.selectTool.mockResolvedValue({
        name: 'deployment-tool',
        confidence: 0.9
      });
      mockActivities.executeTool.mockResolvedValue({
        success: true,
        output: 'Deployment completed successfully',
        duration: 3000
      });

      // Act
      const result = await testEnv.client.workflow.execute(AgentWorkflow, {
        args: [workflowInput],
        workflowId: `tool-workflow-${Date.now()}`,
        taskQueue: 'test-queue',
      });

      // Assert
      expect(result.metadata.success).toBe(true);
      expect(result.metadata.toolsUsed).toContain('deployment-tool');
      expect(mockActivities.selectTool).toHaveBeenCalled();
      expect(mockActivities.executeTool).toHaveBeenCalledWith({
        tool: 'deployment-tool',
        params: { action: 'deploy', environment: 'staging' },
        context: expect.any(Object)
      });
    });

    it('should handle workflow cancellation', async () => {
      // Arrange
      const workflowInput = temporalWorkflowFactory.createWorkflowInput();
      mockActivities.parseUserIntent.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 10000)) // Long-running task
      );

      // Act
      const workflowHandle = await testEnv.client.workflow.start(AgentWorkflow, {
        args: [workflowInput],
        workflowId: `cancel-workflow-${Date.now()}`,
        taskQueue: 'test-queue',
      });

      // Cancel after 1 second
      setTimeout(() => workflowHandle.cancel(), 1000);

      // Assert
      await expect(workflowHandle.result()).rejects.toThrow('CANCELLED');
    });

    it('should handle activity timeouts', async () => {
      // Arrange
      const workflowInput = temporalWorkflowFactory.createWorkflowInput();
      mockActivities.parseUserIntent.mockImplementation(() =>
        new Promise(() => {}) // Never resolves
      );

      // Act & Assert
      await expect(
        testEnv.client.workflow.execute(AgentWorkflow, {
          args: [workflowInput],
          workflowId: `timeout-workflow-${Date.now()}`,
          taskQueue: 'test-queue',
        })
      ).rejects.toThrow();
    });

    it('should handle activity failures with retries', async () => {
      // Arrange
      const workflowInput = temporalWorkflowFactory.createWorkflowInput();
      let attemptCount = 0;
      mockActivities.parseUserIntent.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return {
          type: 'simple_query',
          parameters: {},
          cost: 0.02
        };
      });

      // Act
      const result = await testEnv.client.workflow.execute(AgentWorkflow, {
        args: [workflowInput],
        workflowId: `retry-workflow-${Date.now()}`,
        taskQueue: 'test-queue',
      });

      // Assert
      expect(result.metadata.success).toBe(true);
      expect(attemptCount).toBe(3); // Should have retried twice
    });

    it('should handle conversation context properly', async () => {
      // Arrange
      const workflowInput = temporalWorkflowFactory.createWorkflowInputWithConversation();
      mockActivities.getConversationContext.mockResolvedValue([
        { role: 'user', content: 'Previous message' },
        { role: 'assistant', content: 'Previous response' }
      ]);

      // Act
      const result = await testEnv.client.workflow.execute(AgentWorkflow, {
        args: [workflowInput],
        workflowId: `conversation-workflow-${Date.now()}`,
        taskQueue: 'test-queue',
      });

      // Assert
      expect(mockActivities.getConversationContext).toHaveBeenCalledWith({
        conversationId: workflowInput.conversationId,
        limit: 10
      });
      expect(result.metadata.success).toBe(true);
    });

    it('should track cost and usage metrics', async () => {
      // Arrange
      const workflowInput = temporalWorkflowFactory.createWorkflowInput();
      mockActivities.parseUserIntent.mockResolvedValue({
        type: 'complex_query',
        parameters: {},
        cost: 0.15
      });
      mockActivities.formatResponse.mockResolvedValue({
        response: 'Formatted response',
        cost: 0.08
      });

      // Act
      const result = await testEnv.client.workflow.execute(AgentWorkflow, {
        args: [workflowInput],
        workflowId: `cost-workflow-${Date.now()}`,
        taskQueue: 'test-queue',
      });

      // Assert
      expect(result.metadata.llmCost).toBe(0.23); // 0.15 + 0.08
      expect(result.metadata.success).toBe(true);
    });
  });

  describe('Workflow Error Handling', () => {
    it('should handle non-retryable errors gracefully', async () => {
      // Arrange
      const workflowInput = temporalWorkflowFactory.createWorkflowInput();
      mockActivities.parseUserIntent.mockRejectedValue(
        new Error('ValidationError: Invalid input')
      );

      // Act
      const result = await testEnv.client.workflow.execute(AgentWorkflow, {
        args: [workflowInput],
        workflowId: `validation-error-workflow-${Date.now()}`,
        taskQueue: 'test-queue',
      });

      // Assert
      expect(result.metadata.success).toBe(false);
      expect(result.response).toContain('error processing your request');
      expect(mockActivities.saveToMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('Error:')
          })
        })
      );
    });

    it('should handle authentication errors', async () => {
      // Arrange
      const workflowInput = temporalWorkflowFactory.createWorkflowInput();
      mockActivities.parseUserIntent.mockRejectedValue(
        new Error('AuthenticationError: Invalid credentials')
      );

      // Act
      const result = await testEnv.client.workflow.execute(AgentWorkflow, {
        args: [workflowInput],
        workflowId: `auth-error-workflow-${Date.now()}`,
        taskQueue: 'test-queue',
      });

      // Assert
      expect(result.metadata.success).toBe(false);
      expect(result.response).toContain('error processing your request');
    });

    it('should handle tool execution failures', async () => {
      // Arrange
      const workflowInput = temporalWorkflowFactory.createToolExecutionInput();
      mockActivities.parseUserIntent.mockResolvedValue({
        type: 'tool_execution',
        parameters: { action: 'deploy' },
        cost: 0.05
      });
      mockActivities.selectTool.mockResolvedValue({
        name: 'deployment-tool',
        confidence: 0.9
      });
      mockActivities.executeTool.mockRejectedValue(
        new Error('Tool execution failed: Permission denied')
      );

      // Act
      const result = await testEnv.client.workflow.execute(AgentWorkflow, {
        args: [workflowInput],
        workflowId: `tool-error-workflow-${Date.now()}`,
        taskQueue: 'test-queue',
      });

      // Assert
      expect(result.metadata.success).toBe(false);
      expect(result.response).toContain('error processing your request');
    });
  });

  describe('Workflow Performance', () => {
    it('should complete within acceptable time limits', async () => {
      // Arrange
      const workflowInput = temporalWorkflowFactory.createWorkflowInput();
      const startTime = Date.now();

      // Act
      const result = await testEnv.client.workflow.execute(AgentWorkflow, {
        args: [workflowInput],
        workflowId: `performance-workflow-${Date.now()}`,
        taskQueue: 'test-queue',
      });

      const endTime = Date.now();
      const actualDuration = endTime - startTime;

      // Assert
      expect(actualDuration).toBeLessThan(30000); // Should complete within 30 seconds
      expect(result.metadata.duration).toBeLessThan(30000);
      expect(result.metadata.success).toBe(true);
    });

    it('should handle concurrent workflow executions', async () => {
      // Arrange
      const workflowInputs = Array.from({ length: 10 }, () =>
        temporalWorkflowFactory.createWorkflowInput()
      );

      // Act
      const promises = workflowInputs.map((input, index) =>
        testEnv.client.workflow.execute(AgentWorkflow, {
          args: [input],
          workflowId: `concurrent-workflow-${index}-${Date.now()}`,
          taskQueue: 'test-queue',
        })
      );

      const results = await Promise.all(promises);

      // Assert
      results.forEach(result => {
        expect(result.metadata.success).toBe(true);
        expect(result.metadata.workflowId).toBeDefined();
      });
    });
  });

  describe('Workflow Monitoring and Observability', () => {
    it('should emit workflow metrics', async () => {
      // Arrange
      const workflowInput = temporalWorkflowFactory.createWorkflowInput();

      // Act
      const result = await testEnv.client.workflow.execute(AgentWorkflow, {
        args: [workflowInput],
        workflowId: `metrics-workflow-${Date.now()}`,
        taskQueue: 'test-queue',
      });

      // Assert
      expect(result.metadata).toHaveProperty('workflowId');
      expect(result.metadata).toHaveProperty('duration');
      expect(result.metadata).toHaveProperty('toolsUsed');
      expect(result.metadata).toHaveProperty('llmCost');
      expect(result.metadata).toHaveProperty('success');
    });

    it('should track workflow execution history', async () => {
      // Arrange
      const workflowInput = temporalWorkflowFactory.createWorkflowInput();

      // Act
      const workflowHandle = await testEnv.client.workflow.start(AgentWorkflow, {
        args: [workflowInput],
        workflowId: `history-workflow-${Date.now()}`,
        taskQueue: 'test-queue',
      });

      await workflowHandle.result();
      const history = workflowHandle.fetchHistory();

      // Assert
      expect(history).toBeDefined();
    });
  });
});
