import { useState, useCallback } from 'react';
import { PromptRequest, PromptResponse, PromptError } from '@/lib/prompt-engineering/types';

interface UsePromptExecutionReturn {
  execute: (request: PromptRequest) => Promise<PromptResponse>;
  stream: (request: PromptRequest) => AsyncGenerator<string>;
  cancel: (requestId?: string) => void;
  isLoading: boolean;
  error: PromptError | null;
  response: PromptResponse | null;
  progress: number;
  requestId: string | null;
}

export const usePromptExecution = (): UsePromptExecutionReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<PromptError | null>(null);
  const [response, setResponse] = useState<PromptResponse | null>(null);
  const [progress, setProgress] = useState(0);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const execute = useCallback(async (request: PromptRequest): Promise<PromptResponse> => {
    const controller = new AbortController();
    setAbortController(controller);
    setIsLoading(true);
    setError(null);
    setResponse(null);
    setProgress(0);
    
    const id = `req-${Date.now()}`;
    setRequestId(id);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Mock API call - replace with actual prompt engineering API
      const mockResponse = await new Promise<PromptResponse>((resolve, reject) => {
        const timeout = setTimeout(() => {
          clearInterval(progressInterval);
          setProgress(100);
          
          // Mock response based on template
          const mockData: PromptResponse = {
            id,
            templateId: request.templateId,
            model: request.modelConfig?.model || 'claude-opus-4-1-20250805',
            provider: request.modelConfig?.provider || 'anthropic',
            prompt: generatePromptFromTemplate(request),
            response: generateMockResponse(request),
            tokensUsed: {
              prompt: Math.floor(Math.random() * 500) + 100,
              completion: Math.floor(Math.random() * 1000) + 200,
              total: 0,
            },
            latency: Math.floor(Math.random() * 3000) + 500,
            cost: Math.random() * 0.01 + 0.001,
            quality: {
              accuracy: Math.random() * 0.3 + 0.7,
              relevance: Math.random() * 0.3 + 0.7,
              coherence: Math.random() * 0.3 + 0.7,
              completeness: Math.random() * 0.3 + 0.7,
              overall: Math.random() * 0.3 + 0.7,
            },
            cached: Math.random() > 0.7,
            timestamp: new Date(),
            traceId: request.traceId,
          };
          
          mockData.tokensUsed.total = mockData.tokensUsed.prompt + mockData.tokensUsed.completion;
          mockData.quality!.overall = Object.values(mockData.quality!)
            .filter(v => typeof v === 'number' && v !== mockData.quality!.overall)
            .reduce((sum, val) => sum + (val as number), 0) / 4;
          
          resolve(mockData);
        }, Math.floor(Math.random() * 2000) + 1000);

        // Handle abort
        controller.signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          clearInterval(progressInterval);
          reject(new Error('Request cancelled'));
        });
      });

      setResponse(mockResponse);
      return mockResponse;
    } catch (err) {
      const promptError: PromptError = {
        code: 'EXECUTION_ERROR',
        message: err instanceof Error ? err.message : 'Unknown error occurred',
        retryable: true,
        timestamp: new Date(),
      };
      setError(promptError);
      throw promptError;
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  }, []);

  const stream = useCallback(async function* (request: PromptRequest): AsyncGenerator<string> {
    setIsLoading(true);
    setError(null);
    setResponse(null);
    
    const id = `stream-${Date.now()}`;
    setRequestId(id);

    try {
      // Mock streaming response
      const mockResponse = generateMockResponse(request);
      const words = mockResponse.split(' ');
      
      for (let i = 0; i < words.length; i++) {
        yield words.slice(0, i + 1).join(' ') + (i < words.length - 1 ? ' ' : '');
        await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
      }
      
      // Create final response object
      const finalResponse: PromptResponse = {
        id,
        templateId: request.templateId,
        model: request.modelConfig?.model || 'claude-opus-4-1-20250805',
        provider: request.modelConfig?.provider || 'anthropic',
        prompt: generatePromptFromTemplate(request),
        response: mockResponse,
        tokensUsed: {
          prompt: Math.floor(Math.random() * 500) + 100,
          completion: Math.floor(Math.random() * 1000) + 200,
          total: 0,
        },
        latency: Math.floor(Math.random() * 3000) + 500,
        cost: Math.random() * 0.01 + 0.001,
        cached: false,
        timestamp: new Date(),
        traceId: request.traceId,
      };
      
      finalResponse.tokensUsed.total = finalResponse.tokensUsed.prompt + finalResponse.tokensUsed.completion;
      setResponse(finalResponse);
    } catch (err) {
      const promptError: PromptError = {
        code: 'STREAM_ERROR',
        message: err instanceof Error ? err.message : 'Stream error occurred',
        retryable: true,
        timestamp: new Date(),
      };
      setError(promptError);
      throw promptError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cancel = useCallback((requestIdToCancel?: string) => {
    if (requestIdToCancel && requestIdToCancel !== requestId) return;
    
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    
    setIsLoading(false);
    setProgress(0);
  }, [abortController, requestId]);

  return {
    execute,
    stream,
    cancel,
    isLoading,
    error,
    response,
    progress,
    requestId,
  };
};

// Helper functions for mock data generation
function generatePromptFromTemplate(request: PromptRequest): string {
  // This would typically involve template processing
  let prompt = `Template: ${request.templateId}\n\nVariables:\n`;
  
  Object.entries(request.variables).forEach(([key, value]) => {
    prompt += `${key}: ${value}\n`;
  });
  
  return prompt;
}

function generateMockResponse(request: PromptRequest): string {
  const responses = {
    'code-review-automated': `I've reviewed the provided code and found several areas for improvement:

**Security Issues:**
1. Input validation is missing for user-provided data
2. SQL queries appear vulnerable to injection attacks
3. Authentication tokens are not properly validated

**Performance Concerns:**
1. Database queries could be optimized with proper indexing
2. Memory usage could be reduced by streaming large responses
3. Consider implementing caching for frequently accessed data

**Code Quality:**
1. Error handling should be more comprehensive
2. Function complexity is high - consider breaking into smaller functions
3. Missing unit tests for critical paths

**Recommendations:**
1. Implement input sanitization and validation
2. Use parameterized queries to prevent SQL injection
3. Add comprehensive error handling and logging
4. Implement proper authentication middleware
5. Add unit tests with at least 80% coverage

Overall, the code structure is solid but needs security and performance improvements before production deployment.`,

    'test-generation-unit': `Here are comprehensive unit tests for the provided function:

\`\`\`typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mockFunction, clearAllMocks } from 'jest-mock';

describe('UserService', () => {
  let userService: UserService;
  let mockDatabase: Database;

  beforeEach(() => {
    mockDatabase = mockFunction();
    userService = new UserService(mockDatabase);
  });

  afterEach(() => {
    clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a new user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'John Doe',
        age: 25
      };

      mockDatabase.insert.mockResolvedValue({ id: 1, ...userData });

      const result = await userService.createUser(userData);

      expect(result).toEqual({ id: 1, ...userData });
      expect(mockDatabase.insert).toHaveBeenCalledWith('users', userData);
    });

    it('should throw error for invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        name: 'John Doe',
        age: 25
      };

      await expect(userService.createUser(userData)).rejects.toThrow('Invalid email format');
    });

    it('should handle database errors gracefully', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'John Doe',
        age: 25
      };

      mockDatabase.insert.mockRejectedValue(new Error('Database connection failed'));

      await expect(userService.createUser(userData)).rejects.toThrow('Failed to create user');
    });
  });
});
\`\`\`

These tests cover:
- Happy path scenarios
- Error conditions
- Edge cases
- Database interaction mocking
- Proper setup and teardown`,

    'documentation-auto-generator': `# API Documentation

## Overview
This API provides comprehensive user management functionality with RESTful endpoints for creating, reading, updating, and deleting user accounts.

## Base URL
\`https://api.example.com/v1\`

## Authentication
All endpoints require a valid JWT token in the Authorization header:
\`Authorization: Bearer <token>\`

## Endpoints

### Users

#### GET /users
Retrieve a list of all users.

**Parameters:**
- \`page\` (optional): Page number for pagination (default: 1)
- \`limit\` (optional): Number of users per page (default: 20)
- \`search\` (optional): Search term for filtering users

**Response:**
\`\`\`json
{
  "data": [
    {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "per_page": 20
  }
}
\`\`\`

#### POST /users
Create a new user account.

**Request Body:**
\`\`\`json
{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "secure_password"
}
\`\`\`

**Response:**
\`\`\`json
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "created_at": "2025-01-01T00:00:00Z"
}
\`\`\`

## Error Handling
The API uses standard HTTP status codes and returns error details in JSON format:

\`\`\`json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address"
      }
    ]
  }
}
\`\`\`

## Rate Limiting
- 1000 requests per hour per API key
- Rate limit headers included in all responses

## SDKs and Examples
Coming soon: JavaScript, Python, and PHP SDKs with code examples.`,
  };

  return responses[request.templateId as keyof typeof responses] || 
    `This is a sample response for template: ${request.templateId}. The system would generate contextually appropriate content based on the template and provided variables.`;
}