/**
 * Webhook Validation Test Suite
 * Tests for webhook security, validation, and processing
 */

import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { POST as SlackWebhook } from '@/app/api/webhooks/slack/route';
import { POST as GitHubWebhook } from '@/app/api/webhooks/github/route';
import { webhookFactory } from '../../factories/apiFactory';
import { createMockWebhookService } from '../../mocks/webhookService';

// Mock external dependencies
jest.mock('@/lib/services/webhookService');
jest.mock('@/lib/middleware/rateLimiting');
jest.mock('@/lib/security/signatureValidation');

describe('Webhook Validation and Security', () => {
  let mockWebhookService: jest.Mocked<any>;

  beforeEach(() => {
    mockWebhookService = createMockWebhookService();
    jest.clearAllMocks();
  });

  describe('Slack Webhook Security', () => {
    const SLACK_SIGNING_SECRET = 'test-slack-secret';

    function generateSlackSignature(body: string, timestamp: string): string {
      const baseString = `v0:${timestamp}:${body}`;
      return `v0=${crypto.createHmac('sha256', SLACK_SIGNING_SECRET).update(baseString).digest('hex')}`;
    }

    it('should validate authentic Slack webhook signatures', async () => {
      // Arrange
      const payload = webhookFactory.createSlackEventPayload();
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const body = JSON.stringify(payload);
      const signature = generateSlackSignature(body, timestamp);

      const request = new NextRequest('http://localhost:3000/api/webhooks/slack', {
        method: 'POST',
        headers: {
          'X-Slack-Signature': signature,
          'X-Slack-Request-Timestamp': timestamp,
          'Content-Type': 'application/json'
        },
        body
      });

      mockWebhookService.validateSlackSignature.mockReturnValue(true);
      mockWebhookService.processSlackEvent.mockResolvedValue({ success: true });

      // Act
      const response = await SlackWebhook(request);

      // Assert
      expect(response.status).toBe(200);
      expect(mockWebhookService.validateSlackSignature).toHaveBeenCalledWith(
        signature,
        body,
        timestamp
      );
      expect(mockWebhookService.processSlackEvent).toHaveBeenCalledWith(payload);
    });

    it('should reject webhooks with invalid signatures', async () => {
      // Arrange
      const payload = webhookFactory.createSlackEventPayload();
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const body = JSON.stringify(payload);
      const invalidSignature = 'v0=invalid_signature';

      const request = new NextRequest('http://localhost:3000/api/webhooks/slack', {
        method: 'POST',
        headers: {
          'X-Slack-Signature': invalidSignature,
          'X-Slack-Request-Timestamp': timestamp,
          'Content-Type': 'application/json'
        },
        body
      });

      mockWebhookService.validateSlackSignature.mockReturnValue(false);

      // Act
      const response = await SlackWebhook(request);

      // Assert
      expect(response.status).toBe(401);
      expect(mockWebhookService.processSlackEvent).not.toHaveBeenCalled();
    });

    it('should reject webhooks with expired timestamps', async () => {
      // Arrange
      const payload = webhookFactory.createSlackEventPayload();
      const expiredTimestamp = Math.floor((Date.now() - 10 * 60 * 1000) / 1000).toString(); // 10 minutes ago
      const body = JSON.stringify(payload);
      const signature = generateSlackSignature(body, expiredTimestamp);

      const request = new NextRequest('http://localhost:3000/api/webhooks/slack', {
        method: 'POST',
        headers: {
          'X-Slack-Signature': signature,
          'X-Slack-Request-Timestamp': expiredTimestamp,
          'Content-Type': 'application/json'
        },
        body
      });

      mockWebhookService.validateSlackSignature.mockReturnValue(false);

      // Act
      const response = await SlackWebhook(request);

      // Assert
      expect(response.status).toBe(401);
    });

    it('should handle Slack URL verification challenge', async () => {
      // Arrange
      const challengePayload = webhookFactory.createSlackChallengePayload();
      const body = JSON.stringify(challengePayload);

      const request = new NextRequest('http://localhost:3000/api/webhooks/slack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body
      });

      // Act
      const response = await SlackWebhook(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.challenge).toBe(challengePayload.challenge);
    });

    it('should process Slack app mentions correctly', async () => {
      // Arrange
      const mentionPayload = webhookFactory.createSlackAppMentionPayload();
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const body = JSON.stringify(mentionPayload);
      const signature = generateSlackSignature(body, timestamp);

      const request = new NextRequest('http://localhost:3000/api/webhooks/slack', {
        method: 'POST',
        headers: {
          'X-Slack-Signature': signature,
          'X-Slack-Request-Timestamp': timestamp,
          'Content-Type': 'application/json'
        },
        body
      });

      mockWebhookService.validateSlackSignature.mockReturnValue(true);
      mockWebhookService.processSlackEvent.mockResolvedValue({ success: true });

      // Act
      const response = await SlackWebhook(request);

      // Assert
      expect(response.status).toBe(200);
      expect(mockWebhookService.processSlackEvent).toHaveBeenCalledWith(mentionPayload);
    });
  });

  describe('GitHub Webhook Security', () => {
    const GITHUB_WEBHOOK_SECRET = 'test-github-secret';

    function generateGitHubSignature(body: string): string {
      return `sha256=${crypto.createHmac('sha256', GITHUB_WEBHOOK_SECRET).update(body).digest('hex')}`;
    }

    it('should validate authentic GitHub webhook signatures', async () => {
      // Arrange
      const payload = webhookFactory.createGitHubPushPayload();
      const body = JSON.stringify(payload);
      const signature = generateGitHubSignature(body);

      const request = new NextRequest('http://localhost:3000/api/webhooks/github', {
        method: 'POST',
        headers: {
          'X-Hub-Signature-256': signature,
          'X-GitHub-Event': 'push',
          'Content-Type': 'application/json'
        },
        body
      });

      mockWebhookService.validateGitHubSignature.mockReturnValue(true);
      mockWebhookService.processGitHubEvent.mockResolvedValue({ success: true });

      // Act
      const response = await GitHubWebhook(request);

      // Assert
      expect(response.status).toBe(200);
      expect(mockWebhookService.validateGitHubSignature).toHaveBeenCalledWith(
        signature,
        body
      );
      expect(mockWebhookService.processGitHubEvent).toHaveBeenCalledWith('push', payload);
    });

    it('should reject GitHub webhooks with invalid signatures', async () => {
      // Arrange
      const payload = webhookFactory.createGitHubPushPayload();
      const body = JSON.stringify(payload);
      const invalidSignature = 'sha256=invalid_signature';

      const request = new NextRequest('http://localhost:3000/api/webhooks/github', {
        method: 'POST',
        headers: {
          'X-Hub-Signature-256': invalidSignature,
          'X-GitHub-Event': 'push',
          'Content-Type': 'application/json'
        },
        body
      });

      mockWebhookService.validateGitHubSignature.mockReturnValue(false);

      // Act
      const response = await GitHubWebhook(request);

      // Assert
      expect(response.status).toBe(401);
      expect(mockWebhookService.processGitHubEvent).not.toHaveBeenCalled();
    });

    it('should process GitHub pull request events', async () => {
      // Arrange
      const payload = webhookFactory.createGitHubPRPayload();
      const body = JSON.stringify(payload);
      const signature = generateGitHubSignature(body);

      const request = new NextRequest('http://localhost:3000/api/webhooks/github', {
        method: 'POST',
        headers: {
          'X-Hub-Signature-256': signature,
          'X-GitHub-Event': 'pull_request',
          'Content-Type': 'application/json'
        },
        body
      });

      mockWebhookService.validateGitHubSignature.mockReturnValue(true);
      mockWebhookService.processGitHubEvent.mockResolvedValue({ success: true });

      // Act
      const response = await GitHubWebhook(request);

      // Assert
      expect(response.status).toBe(200);
      expect(mockWebhookService.processGitHubEvent).toHaveBeenCalledWith('pull_request', payload);
    });

    it('should handle GitHub deployment status events', async () => {
      // Arrange
      const payload = webhookFactory.createGitHubDeploymentStatusPayload();
      const body = JSON.stringify(payload);
      const signature = generateGitHubSignature(body);

      const request = new NextRequest('http://localhost:3000/api/webhooks/github', {
        method: 'POST',
        headers: {
          'X-Hub-Signature-256': signature,
          'X-GitHub-Event': 'deployment_status',
          'Content-Type': 'application/json'
        },
        body
      });

      mockWebhookService.validateGitHubSignature.mockReturnValue(true);
      mockWebhookService.processGitHubEvent.mockResolvedValue({ success: true });

      // Act
      const response = await GitHubWebhook(request);

      // Assert
      expect(response.status).toBe(200);
      expect(mockWebhookService.processGitHubEvent).toHaveBeenCalledWith('deployment_status', payload);
    });
  });

  describe('Webhook Rate Limiting', () => {
    it('should rate limit webhook requests per IP', async () => {
      // Arrange
      const payload = webhookFactory.createSlackEventPayload();
      const body = JSON.stringify(payload);
      const timestamp = Math.floor(Date.now() / 1000).toString();

      const requests = Array.from({ length: 50 }, () =>
        new NextRequest('http://localhost:3000/api/webhooks/slack', {
          method: 'POST',
          headers: {
            'X-Slack-Request-Timestamp': timestamp,
            'Content-Type': 'application/json',
            'X-Forwarded-For': '192.168.1.1'
          },
          body
        })
      );

      mockWebhookService.validateSlackSignature.mockReturnValue(true);

      // Act
      const responses = await Promise.all(
        requests.map(request => SlackWebhook(request))
      );

      // Assert
      const rateLimitedResponses = responses.filter(response => response.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should rate limit based on webhook source', async () => {
      // Arrange
      const payload = webhookFactory.createSlackEventPayload();
      const body = JSON.stringify(payload);

      mockWebhookService.isRateLimited.mockReturnValue(true);

      const request = new NextRequest('http://localhost:3000/api/webhooks/slack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body
      });

      // Act
      const response = await SlackWebhook(request);

      // Assert
      expect(response.status).toBe(429);
    });
  });

  describe('Webhook Input Validation', () => {
    it('should validate required Slack webhook headers', async () => {
      // Arrange
      const payload = webhookFactory.createSlackEventPayload();
      const body = JSON.stringify(payload);

      const request = new NextRequest('http://localhost:3000/api/webhooks/slack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // Missing required headers
        },
        body
      });

      // Act
      const response = await SlackWebhook(request);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should validate JSON payload structure', async () => {
      // Arrange
      const invalidPayload = 'invalid json{';

      const request = new NextRequest('http://localhost:3000/api/webhooks/slack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: invalidPayload
      });

      // Act
      const response = await SlackWebhook(request);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should sanitize webhook payload data', async () => {
      // Arrange
      const maliciousPayload = webhookFactory.createMaliciousSlackPayload();
      const body = JSON.stringify(maliciousPayload);
      const timestamp = Math.floor(Date.now() / 1000).toString();

      const request = new NextRequest('http://localhost:3000/api/webhooks/slack', {
        method: 'POST',
        headers: {
          'X-Slack-Request-Timestamp': timestamp,
          'Content-Type': 'application/json'
        },
        body
      });

      mockWebhookService.validateSlackSignature.mockReturnValue(true);
      mockWebhookService.sanitizePayload.mockReturnValue(maliciousPayload);

      // Act
      const response = await SlackWebhook(request);

      // Assert
      expect(mockWebhookService.sanitizePayload).toHaveBeenCalledWith(maliciousPayload);
      expect(response.status).toBe(200);
    });
  });

  describe('Webhook Error Handling', () => {
    it('should handle webhook processing errors gracefully', async () => {
      // Arrange
      const payload = webhookFactory.createSlackEventPayload();
      const body = JSON.stringify(payload);
      const timestamp = Math.floor(Date.now() / 1000).toString();

      const request = new NextRequest('http://localhost:3000/api/webhooks/slack', {
        method: 'POST',
        headers: {
          'X-Slack-Request-Timestamp': timestamp,
          'Content-Type': 'application/json'
        },
        body
      });

      mockWebhookService.validateSlackSignature.mockReturnValue(true);
      mockWebhookService.processSlackEvent.mockRejectedValue(
        new Error('Processing failed')
      );

      // Act
      const response = await SlackWebhook(request);

      // Assert
      expect(response.status).toBe(500);
    });

    it('should log webhook processing metrics', async () => {
      // Arrange
      const payload = webhookFactory.createSlackEventPayload();
      const body = JSON.stringify(payload);
      const timestamp = Math.floor(Date.now() / 1000).toString();

      const request = new NextRequest('http://localhost:3000/api/webhooks/slack', {
        method: 'POST',
        headers: {
          'X-Slack-Request-Timestamp': timestamp,
          'Content-Type': 'application/json'
        },
        body
      });

      mockWebhookService.validateSlackSignature.mockReturnValue(true);
      mockWebhookService.processSlackEvent.mockResolvedValue({ success: true });

      // Act
      const response = await SlackWebhook(request);

      // Assert
      expect(mockWebhookService.logWebhookMetrics).toHaveBeenCalledWith({
        source: 'slack',
        event: payload.event?.type,
        success: true,
        processingTime: expect.any(Number)
      });
    });

    it('should handle webhook retry scenarios', async () => {
      // Arrange
      const payload = webhookFactory.createSlackEventPayload();
      const body = JSON.stringify(payload);
      const timestamp = Math.floor(Date.now() / 1000).toString();

      const request = new NextRequest('http://localhost:3000/api/webhooks/slack', {
        method: 'POST',
        headers: {
          'X-Slack-Request-Timestamp': timestamp,
          'X-Slack-Retry-Num': '2',
          'X-Slack-Retry-Reason': 'timeout',
          'Content-Type': 'application/json'
        },
        body
      });

      mockWebhookService.validateSlackSignature.mockReturnValue(true);
      mockWebhookService.isRetryRequest.mockReturnValue(true);
      mockWebhookService.processSlackEvent.mockResolvedValue({ success: true });

      // Act
      const response = await SlackWebhook(request);

      // Assert
      expect(response.status).toBe(200);
      expect(mockWebhookService.isRetryRequest).toHaveBeenCalledWith(request);
    });
  });

  describe('Webhook Integration Tests', () => {
    it('should trigger infrastructure alerts on critical events', async () => {
      // Arrange
      const criticalPayload = webhookFactory.createCriticalAlertPayload();
      const body = JSON.stringify(criticalPayload);

      const request = new NextRequest('http://localhost:3000/api/webhooks/slack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body
      });

      mockWebhookService.validateSlackSignature.mockReturnValue(true);
      mockWebhookService.processSlackEvent.mockResolvedValue({ success: true });

      // Act
      const response = await SlackWebhook(request);

      // Assert
      expect(response.status).toBe(200);
      expect(mockWebhookService.triggerInfrastructureAlert).toHaveBeenCalled();
    });

    it('should integrate with monitoring systems', async () => {
      // Arrange
      const payload = webhookFactory.createSlackEventPayload();
      const body = JSON.stringify(payload);

      const request = new NextRequest('http://localhost:3000/api/webhooks/slack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body
      });

      mockWebhookService.validateSlackSignature.mockReturnValue(true);
      mockWebhookService.processSlackEvent.mockResolvedValue({ success: true });

      // Act
      const response = await SlackWebhook(request);

      // Assert
      expect(mockWebhookService.updateMonitoringMetrics).toHaveBeenCalledWith({
        endpoint: '/api/webhooks/slack',
        method: 'POST',
        statusCode: 200,
        responseTime: expect.any(Number)
      });
    });
  });
});
