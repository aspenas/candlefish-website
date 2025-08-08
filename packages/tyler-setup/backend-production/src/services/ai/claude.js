import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../../utils/logger.js';
import { cache } from '../../cache/manager.js';
import { secretsManager } from '../aws/secrets-manager.js';
import pLimit from 'p-limit';
import crypto from 'crypto';

/**
 * Claude Opus 4.1 Service with Production Rate Limits
 * Input: 2,000,000 tokens per minute
 * Output: 400,000 tokens per minute
 */
class ClaudeService {
  constructor() {
    this.client = null;
    this.model = 'claude-opus-4-1-20250805';

    // Rate limiting configuration
    this.rateLimits = {
      input: {
        tokensPerMinute: 2_000_000,
        tokensPerSecond: 33_333,
        currentUsage: 0,
        resetTime: Date.now() + 60000,
      },
      output: {
        tokensPerMinute: 400_000,
        tokensPerSecond: 6_666,
        currentUsage: 0,
        resetTime: Date.now() + 60000,
      },
    };

    // Concurrent request limiting
    this.concurrencyLimit = pLimit(100); // Up to 100 concurrent requests

    // Response cache for efficiency
    this.responseCache = new Map();
    this.cacheTimeout = 300000; // 5 minutes

    // Usage tracking
    this.usageMetrics = {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalRequests: 0,
      totalCost: 0,
      requestHistory: [],
    };

    // Prompt templates
    this.promptTemplates = new Map();
    this.initialized = false;
  }

  async initialize() {
    try {
      // Get API key from AWS Secrets Manager
      const apiKey = await secretsManager.getSecret('claude/api-key');

      if (!apiKey) {
        throw new Error('Claude API key not found in Secrets Manager');
      }

      // Initialize Anthropic client
      this.client = new Anthropic({
        apiKey: typeof apiKey === 'object' ? apiKey.value : apiKey,
        maxRetries: 3,
        timeout: 60000, // 60 seconds
      });

      // Load prompt templates
      await this.loadPromptTemplates();

      // Set up usage tracking
      this.startUsageTracking();

      // Test connection
      await this.testConnection();

      this.initialized = true;
      logger.info('Claude Opus 4.1 service initialized successfully');
      logger.info(`Rate limits: ${this.rateLimits.input.tokensPerMinute.toLocaleString()} input tokens/min, ${this.rateLimits.output.tokensPerMinute.toLocaleString()} output tokens/min`);

      return true;
    } catch (error) {
      logger.error('Failed to initialize Claude service:', error);
      throw new Error('Claude service initialization failed');
    }
  }

  /**
   * Process employee onboarding with AI assistance
   */
  async processEmployeeOnboarding(employeeData, options = {}) {
    const operation = 'employee_onboarding';
    const cacheKey = this.getCacheKey(operation, employeeData);

    // Check cache first
    if (!options.bypassCache && this.responseCache.has(cacheKey)) {
      const cached = this.responseCache.get(cacheKey);
      if (cached.expires > Date.now()) {
        logger.info(`Using cached response for ${operation}`);
        return cached.response;
      }
    }

    try {
      const prompt = this.buildOnboardingPrompt(employeeData);
      const estimatedTokens = this.estimateTokens(prompt);

      // Check rate limits
      await this.checkRateLimits(estimatedTokens, 4000); // Estimate 4000 output tokens

      // Process with concurrency control
      const response = await this.concurrencyLimit(async () => {
        return await this.client.messages.create({
          model: this.model,
          max_tokens: 4000,
          temperature: 0.3,
          system: this.getSystemPrompt('onboarding'),
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });
      });

      // Update usage metrics
      this.updateUsageMetrics(response.usage.input_tokens, response.usage.output_tokens);

      // Parse and structure the response
      const structuredResponse = this.parseOnboardingResponse(response.content[0].text);

      // Cache the response
      this.responseCache.set(cacheKey, {
        response: structuredResponse,
        expires: Date.now() + this.cacheTimeout,
      });

      // Log for audit
      await this.logUsage(operation, employeeData.id, response.usage);

      return structuredResponse;
    } catch (error) {
      logger.error(`Failed to process employee onboarding:`, error);
      throw new Error('Unable to process employee onboarding');
    }
  }

  /**
   * Generate personalized setup instructions
   */
  async generateSetupInstructions(employee, systems, options = {}) {
    const operation = 'setup_instructions';

    try {
      const prompt = this.buildSetupInstructionsPrompt(employee, systems);
      const estimatedTokens = this.estimateTokens(prompt);

      await this.checkRateLimits(estimatedTokens, 8000);

      const response = await this.concurrencyLimit(async () => {
        return await this.client.messages.create({
          model: this.model,
          max_tokens: 8000,
          temperature: 0.5,
          system: this.getSystemPrompt('setup_instructions'),
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });
      });

      this.updateUsageMetrics(response.usage.input_tokens, response.usage.output_tokens);

      const instructions = this.formatSetupInstructions(response.content[0].text);

      await this.logUsage(operation, employee.id, response.usage);

      return instructions;
    } catch (error) {
      logger.error(`Failed to generate setup instructions:`, error);
      throw new Error('Unable to generate setup instructions');
    }
  }

  /**
   * Analyze security configuration
   */
  async analyzeSecurityConfiguration(config, options = {}) {
    const operation = 'security_analysis';

    try {
      const prompt = this.buildSecurityAnalysisPrompt(config);
      const estimatedTokens = this.estimateTokens(prompt);

      await this.checkRateLimits(estimatedTokens, 6000);

      const response = await this.concurrencyLimit(async () => {
        return await this.client.messages.create({
          model: this.model,
          max_tokens: 6000,
          temperature: 0.2,
          system: this.getSystemPrompt('security'),
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });
      });

      this.updateUsageMetrics(response.usage.input_tokens, response.usage.output_tokens);

      const analysis = this.parseSecurityAnalysis(response.content[0].text);

      await this.logUsage(operation, 'system', response.usage);

      return analysis;
    } catch (error) {
      logger.error(`Failed to analyze security configuration:`, error);
      throw new Error('Unable to analyze security configuration');
    }
  }

  /**
   * Process batch requests efficiently
   */
  async processBatch(requests, options = {}) {
    const results = [];
    const batchSize = options.batchSize || 10;
    const batches = this.chunkArray(requests, batchSize);

    for (const batch of batches) {
      const batchPromises = batch.map(request =>
        this.processRequest(request).catch(error => ({
          success: false,
          error: error.message,
          request,
        }))
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Brief pause between batches to respect rate limits
      if (batches.indexOf(batch) < batches.length - 1) {
        await this.sleep(1000);
      }
    }

    return results;
  }

  /**
   * Process a generic request
   */
  async processRequest(request) {
    const { prompt, maxTokens = 4000, temperature = 0.5, system } = request;

    try {
      const estimatedInputTokens = this.estimateTokens(prompt);
      await this.checkRateLimits(estimatedInputTokens, maxTokens);

      const response = await this.concurrencyLimit(async () => {
        return await this.client.messages.create({
          model: this.model,
          max_tokens: maxTokens,
          temperature,
          system: system || this.getSystemPrompt('general'),
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });
      });

      this.updateUsageMetrics(response.usage.input_tokens, response.usage.output_tokens);

      return {
        success: true,
        content: response.content[0].text,
        usage: response.usage,
        requestId: request.id,
      };
    } catch (error) {
      logger.error(`Request processing failed:`, error);
      throw error;
    }
  }

  /**
   * Build onboarding prompt
   */
  buildOnboardingPrompt(employeeData) {
    return `
    Analyze the following new employee information and generate a comprehensive onboarding plan:

    Employee Information:
    - Name: ${employeeData.name}
    - Role: ${employeeData.role}
    - Department: ${employeeData.department}
    - Start Date: ${employeeData.startDate}
    - Manager: ${employeeData.manager}
    - Location: ${employeeData.location}
    - Experience Level: ${employeeData.experienceLevel}

    Please provide:
    1. Personalized welcome message
    2. First week schedule
    3. Required system access list
    4. Training recommendations
    5. Key contacts and introductions
    6. Role-specific resources
    7. Compliance requirements
    8. Success metrics for first 30/60/90 days

    Format the response as structured JSON.
    `;
  }

  /**
   * Build setup instructions prompt
   */
  buildSetupInstructionsPrompt(employee, systems) {
    const systemsList = systems.map(s => `- ${s.name}: ${s.description}`).join('\n');

    return `
    Generate detailed setup instructions for the following employee and systems:

    Employee: ${employee.name} (${employee.role})
    Technical Level: ${employee.techLevel || 'intermediate'}

    Systems to Set Up:
    ${systemsList}

    For each system, provide:
    1. Step-by-step setup instructions
    2. Common troubleshooting tips
    3. Security best practices
    4. Quick reference guide
    5. Support contacts

    Make instructions clear and appropriate for the employee's technical level.
    Include command examples where applicable.
    `;
  }

  /**
   * Build security analysis prompt
   */
  buildSecurityAnalysisPrompt(config) {
    return `
    Analyze the following security configuration for vulnerabilities and compliance:

    Configuration:
    ${JSON.stringify(config, null, 2)}

    Evaluate against:
    1. OWASP Top 10 vulnerabilities
    2. SOC 2 Type II requirements
    3. GDPR compliance (if applicable)
    4. AWS Security Best Practices
    5. Zero Trust principles

    Provide:
    1. Critical vulnerabilities (immediate action required)
    2. High-risk issues (address within 7 days)
    3. Medium-risk issues (address within 30 days)
    4. Recommendations for improvement
    5. Compliance gaps

    Include specific remediation steps for each issue.
    `;
  }

  /**
   * Check and enforce rate limits
   */
  async checkRateLimits(inputTokens, outputTokens) {
    const now = Date.now();

    // Reset counters if minute has passed
    if (now >= this.rateLimits.input.resetTime) {
      this.rateLimits.input.currentUsage = 0;
      this.rateLimits.input.resetTime = now + 60000;
    }

    if (now >= this.rateLimits.output.resetTime) {
      this.rateLimits.output.currentUsage = 0;
      this.rateLimits.output.resetTime = now + 60000;
    }

    // Check if request would exceed limits
    if (this.rateLimits.input.currentUsage + inputTokens > this.rateLimits.input.tokensPerMinute) {
      const waitTime = this.rateLimits.input.resetTime - now;
      logger.warn(`Input rate limit reached. Waiting ${waitTime}ms`);
      await this.sleep(waitTime);
      return this.checkRateLimits(inputTokens, outputTokens);
    }

    if (this.rateLimits.output.currentUsage + outputTokens > this.rateLimits.output.tokensPerMinute) {
      const waitTime = this.rateLimits.output.resetTime - now;
      logger.warn(`Output rate limit reached. Waiting ${waitTime}ms`);
      await this.sleep(waitTime);
      return this.checkRateLimits(inputTokens, outputTokens);
    }

    // Update usage
    this.rateLimits.input.currentUsage += inputTokens;
    this.rateLimits.output.currentUsage += outputTokens;
  }

  /**
   * Estimate token count for a prompt
   */
  estimateTokens(text) {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Update usage metrics
   */
  updateUsageMetrics(inputTokens, outputTokens) {
    this.usageMetrics.totalInputTokens += inputTokens;
    this.usageMetrics.totalOutputTokens += outputTokens;
    this.usageMetrics.totalRequests += 1;

    // Calculate cost (example rates, adjust based on actual pricing)
    const inputCost = (inputTokens / 1_000_000) * 15; // $15 per million input tokens
    const outputCost = (outputTokens / 1_000_000) * 75; // $75 per million output tokens
    this.usageMetrics.totalCost += inputCost + outputCost;

    // Keep last 1000 requests in history
    this.usageMetrics.requestHistory.push({
      timestamp: new Date().toISOString(),
      inputTokens,
      outputTokens,
      cost: inputCost + outputCost,
    });

    if (this.usageMetrics.requestHistory.length > 1000) {
      this.usageMetrics.requestHistory.shift();
    }
  }

  /**
   * Get system prompts for different operations
   */
  getSystemPrompt(type) {
    const prompts = {
      onboarding: `You are an expert HR onboarding specialist at Candlefish.ai.
        Your role is to create personalized, comprehensive onboarding plans that ensure
        new employees have a smooth and successful start. Focus on clarity, completeness,
        and creating a welcoming experience.`,

      setup_instructions: `You are a technical documentation expert specializing in
        enterprise software setup. Create clear, step-by-step instructions that are
        appropriate for the user's technical level. Include troubleshooting tips and
        best practices.`,

      security: `You are a senior security architect with expertise in cloud security,
        compliance, and enterprise security best practices. Analyze configurations
        thoroughly and provide actionable recommendations with specific remediation steps.`,

      general: `You are Claude, an AI assistant for Candlefish.ai's Employee Setup Platform.
        Provide helpful, accurate, and professional responses. Focus on being clear,
        concise, and actionable.`,
    };

    return prompts[type] || prompts.general;
  }

  /**
   * Parse onboarding response into structured format
   */
  parseOnboardingResponse(text) {
    try {
      // Attempt to parse as JSON if the response is structured
      return JSON.parse(text);
    } catch {
      // Fall back to text parsing if not valid JSON
      return {
        welcomeMessage: this.extractSection(text, 'Welcome Message'),
        firstWeekSchedule: this.extractSection(text, 'First Week Schedule'),
        systemAccess: this.extractSection(text, 'System Access'),
        training: this.extractSection(text, 'Training'),
        contacts: this.extractSection(text, 'Contacts'),
        resources: this.extractSection(text, 'Resources'),
        compliance: this.extractSection(text, 'Compliance'),
        successMetrics: this.extractSection(text, 'Success Metrics'),
        raw: text,
      };
    }
  }

  /**
   * Parse security analysis response
   */
  parseSecurityAnalysis(text) {
    try {
      return JSON.parse(text);
    } catch {
      return {
        critical: this.extractSection(text, 'Critical'),
        high: this.extractSection(text, 'High'),
        medium: this.extractSection(text, 'Medium'),
        recommendations: this.extractSection(text, 'Recommendations'),
        compliance: this.extractSection(text, 'Compliance'),
        raw: text,
      };
    }
  }

  /**
   * Format setup instructions for display
   */
  formatSetupInstructions(text) {
    return {
      instructions: text,
      formatted: text.replace(/\n/g, '<br>'),
      sections: this.splitIntoSections(text),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Extract section from text
   */
  extractSection(text, sectionName) {
    const regex = new RegExp(`${sectionName}:?\\s*([\\s\\S]*?)(?=\\n\\n|\\n[A-Z]|$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  }

  /**
   * Split text into sections
   */
  splitIntoSections(text) {
    const sections = [];
    const lines = text.split('\n');
    let currentSection = null;

    for (const line of lines) {
      if (line.match(/^\d+\.|^[A-Z][^:]*:/)) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          title: line.replace(/[:\d.]/g, '').trim(),
          content: [],
        };
      } else if (currentSection) {
        currentSection.content.push(line);
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Generate cache key
   */
  getCacheKey(operation, data) {
    const hash = crypto.createHash('sha256');
    hash.update(operation);
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
  }

  /**
   * Log usage for tracking and billing
   */
  async logUsage(operation, entityId, usage) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      operation,
      entityId,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      model: this.model,
      cost: this.calculateCost(usage.input_tokens, usage.output_tokens),
    };

    logger.info('Claude usage:', logEntry);

    // Store in database for billing tracking
    // await db.query('INSERT INTO ai_usage_logs ...');
  }

  /**
   * Calculate cost for usage
   */
  calculateCost(inputTokens, outputTokens) {
    const inputCost = (inputTokens / 1_000_000) * 15;
    const outputCost = (outputTokens / 1_000_000) * 75;
    return inputCost + outputCost;
  }

  /**
   * Load prompt templates from configuration
   */
  async loadPromptTemplates() {
    // Load from database or configuration file
    this.promptTemplates.set('welcome_email', await this.loadTemplate('welcome_email'));
    this.promptTemplates.set('access_request', await this.loadTemplate('access_request'));
    this.promptTemplates.set('training_plan', await this.loadTemplate('training_plan'));
  }

  /**
   * Load a specific template
   */
  async loadTemplate(name) {
    // In production, load from database or S3
    return `Template for ${name}`;
  }

  /**
   * Test connection to Claude API
   */
  async testConnection() {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Test connection',
          },
        ],
      });

      logger.info('Claude API connection test successful');
      return true;
    } catch (error) {
      logger.error('Claude API connection test failed:', error);
      throw error;
    }
  }

  /**
   * Start usage tracking interval
   */
  startUsageTracking() {
    // Report usage metrics every 5 minutes
    setInterval(() => {
      logger.info('Claude usage metrics:', {
        totalRequests: this.usageMetrics.totalRequests,
        totalInputTokens: this.usageMetrics.totalInputTokens.toLocaleString(),
        totalOutputTokens: this.usageMetrics.totalOutputTokens.toLocaleString(),
        totalCost: `$${this.usageMetrics.totalCost.toFixed(2)}`,
        inputRateUsage: `${((this.rateLimits.input.currentUsage / this.rateLimits.input.tokensPerMinute) * 100).toFixed(1)}%`,
        outputRateUsage: `${((this.rateLimits.output.currentUsage / this.rateLimits.output.tokensPerMinute) * 100).toFixed(1)}%`,
      });
    }, 300000);
  }

  /**
   * Get current usage statistics
   */
  getUsageStats() {
    return {
      ...this.usageMetrics,
      currentRateLimits: {
        input: {
          used: this.rateLimits.input.currentUsage,
          limit: this.rateLimits.input.tokensPerMinute,
          percentage: (this.rateLimits.input.currentUsage / this.rateLimits.input.tokensPerMinute) * 100,
        },
        output: {
          used: this.rateLimits.output.currentUsage,
          limit: this.rateLimits.output.tokensPerMinute,
          percentage: (this.rateLimits.output.currentUsage / this.rateLimits.output.tokensPerMinute) * 100,
        },
      },
    };
  }

  /**
   * Utility: Chunk array into smaller arrays
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Utility: Sleep for milliseconds
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const claudeService = new ClaudeService();

// Export class for testing
export { ClaudeService };
