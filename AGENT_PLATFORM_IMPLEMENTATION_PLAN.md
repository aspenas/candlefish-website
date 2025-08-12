# Candlefish Agent Platform Implementation Plan

## 🚀 Quick Start: Week 1 Critical Actions

### Day 1-2: Security Fixes (CRITICAL)
```bash
# 1. Fix CORS configuration
# File: projects/paintbox/next.config.js
# Change: hostname: '**' → hostname: '*.candlefish.ai'

# 2. Fix JWT key persistence
# Create: services/auth-service/jwt-manager.ts
# Implement: AWS Secrets Manager for key storage

# 3. Remove environment credentials
# Move all .env variables to AWS Secrets Manager
aws secretsmanager create-secret --name candlefish/production --secret-string file://secrets.json
```

### Day 3-4: GitHub Actions Optimization
```yaml
# File: .github/workflows/candlefish-orchestrator-optimized.yml
# Reduce from 765 lines to ~200 lines
# Key changes:
- Remove chaos engineering from PR builds
- Implement proper caching (save $800/month)
- Reduce parallel jobs from 7 to 3
- Add cost tracking annotations
```

### Day 5: TypeScript/ESLint Re-enable
```javascript
// File: projects/paintbox/next.config.js
typescript: {
  ignoreBuildErrors: false, // Change from true
},
eslint: {
  ignoreDuringBuilds: false, // Change from true
}
```

---

## 📋 Phase 1: Foundation (Weeks 1-4)

### Week 1: Security & Infrastructure Setup

#### 1.1 API Gateway Setup
```bash
# Create Kong API Gateway on AWS
mkdir -p infrastructure/kong
cd infrastructure/kong
```

```yaml
# kong-config.yaml
_format_version: "3.0"
services:
  - name: agent-orchestrator
    url: http://orchestrator.candlefish.local:8080
    routes:
      - name: agent-route
        paths:
          - /api/agent
        methods:
          - GET
          - POST
    plugins:
      - name: rate-limiting
        config:
          minute: 100
          policy: local
      - name: cors
        config:
          origins:
            - https://*.candlefish.ai
          credentials: true
      - name: jwt
        config:
          key_claim_name: kid
          secret_is_base64: false
```

#### 1.2 Secrets Management Migration
```typescript
// services/secrets/secrets-manager.ts
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { LRUCache } from "lru-cache";

export class SecretsManager {
  private client: SecretsManagerClient;
  private cache: LRUCache<string, string>;

  constructor() {
    this.client = new SecretsManagerClient({ region: "us-east-1" });
    this.cache = new LRUCache({ max: 100, ttl: 1000 * 60 * 5 }); // 5 min cache
  }

  async getSecret(secretId: string): Promise<string> {
    const cached = this.cache.get(secretId);
    if (cached) return cached;

    const command = new GetSecretValueCommand({ SecretId: secretId });
    const response = await this.client.send(command);
    const secret = response.SecretString || "";
    
    this.cache.set(secretId, secret);
    return secret;
  }
}
```

### Week 2: Core Orchestrator Setup

#### 2.1 Install Temporal.io
```bash
# Docker Compose for local development
cat > docker-compose.temporal.yml << 'EOF'
version: '3.8'
services:
  temporal:
    image: temporalio/auto-setup:1.22.4
    ports:
      - "7233:7233"
    environment:
      - DB=postgresql
      - DB_PORT=5432
      - POSTGRES_USER=temporal
      - POSTGRES_PWD=temporal
      - POSTGRES_SEEDS=postgres
  
  temporal-admin-tools:
    image: temporalio/admin-tools:1.22.4
    depends_on:
      - temporal
    environment:
      - TEMPORAL_ADDRESS=temporal:7233
    stdin_open: true
    tty: true
  
  temporal-ui:
    image: temporalio/ui:2.21.3
    depends_on:
      - temporal
    environment:
      - TEMPORAL_ADDRESS=temporal:7233
    ports:
      - "8088:8080"
EOF

docker-compose -f docker-compose.temporal.yml up -d
```

#### 2.2 Create Workflow Definitions
```typescript
// services/orchestrator/workflows/agent-workflow.ts
import { proxyActivities, sleep } from '@temporalio/workflow';
import type * as activities from '../activities';

const { 
  parseUserIntent,
  selectTool,
  executeTool,
  formatResponse 
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '1 second',
    maximumInterval: '30 seconds',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

export async function AgentWorkflow(input: {
  prompt: string;
  context: Record<string, any>;
  userId: string;
}): Promise<string> {
  // Step 1: Parse user intent
  const intent = await parseUserIntent(input.prompt);
  
  // Step 2: Select appropriate tool
  const tool = await selectTool(intent);
  
  // Step 3: Execute tool with retry logic
  const result = await executeTool({
    tool,
    params: intent.parameters,
    context: input.context,
  });
  
  // Step 4: Format response
  return await formatResponse(result);
}
```

### Week 3: LLM Router Implementation

#### 3.1 Multi-Model Router Service
```typescript
// services/llm-router/index.ts
import { Anthropic } from '@anthropic-ai/sdk';
import { OpenAI } from 'openai';
import { Together } from 'together-ai';

interface LLMRouter {
  route(prompt: string, options?: RouteOptions): Promise<LLMResponse>;
}

export class SmartLLMRouter implements LLMRouter {
  private anthropic: Anthropic;
  private openai: OpenAI;
  private together: Together;
  private costTracker: CostTracker;

  constructor() {
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.together = new Together({ apiKey: process.env.TOGETHER_API_KEY });
    this.costTracker = new CostTracker();
  }

  async route(prompt: string, options: RouteOptions = {}): Promise<LLMResponse> {
    const complexity = this.assessComplexity(prompt);
    const costBudget = options.maxCost || 1.0;

    // Decision matrix
    if (complexity === 'high' && costBudget > 0.5) {
      return this.useAnthropic(prompt, 'claude-opus-4-1-20250805');
    } else if (complexity === 'medium') {
      return this.useOpenAI(prompt, 'gpt-4o');
    } else {
      return this.useTogether(prompt, 'llama-3-70b');
    }
  }

  private assessComplexity(prompt: string): 'low' | 'medium' | 'high' {
    const wordCount = prompt.split(' ').length;
    const hasCode = /```/.test(prompt);
    const hasAnalysis = /analyze|compare|evaluate/i.test(prompt);
    
    if (hasCode || hasAnalysis || wordCount > 500) return 'high';
    if (wordCount > 100) return 'medium';
    return 'low';
  }
}
```

### Week 4: Tool Registry & Discovery

#### 4.1 Tool Registry Implementation
```typescript
// services/tool-registry/registry.ts
export interface Tool {
  id: string;
  name: string;
  description: string;
  category: 'connector' | 'workflow' | 'transformer';
  inputSchema: object;
  outputSchema: object;
  cost: number;
  timeout: number;
  execute: (params: any) => Promise<any>;
}

export class ToolRegistry {
  private tools = new Map<string, Tool>();
  private categories = new Map<string, Set<string>>();

  register(tool: Tool): void {
    this.tools.set(tool.id, tool);
    
    if (!this.categories.has(tool.category)) {
      this.categories.set(tool.category, new Set());
    }
    this.categories.get(tool.category)!.add(tool.id);
  }

  async discover(query: string): Promise<Tool[]> {
    // Use vector similarity to find relevant tools
    const embedding = await this.getEmbedding(query);
    const similarities = await this.computeSimilarities(embedding);
    
    return similarities
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => this.tools.get(s.toolId)!);
  }

  async execute(toolId: string, params: any): Promise<any> {
    const tool = this.tools.get(toolId);
    if (!tool) throw new Error(`Tool ${toolId} not found`);
    
    // Validate input against schema
    this.validateInput(params, tool.inputSchema);
    
    // Execute with timeout
    const result = await Promise.race([
      tool.execute(params),
      this.timeout(tool.timeout),
    ]);
    
    // Validate output
    this.validateOutput(result, tool.outputSchema);
    
    return result;
  }
}
```

---

## 📋 Phase 2: Core Platform (Weeks 5-8)

### Week 5: Excel Transformer Integration

#### 5.1 Integrate Your Core IP
```typescript
// services/excel-transformer/index.ts
import { ExcelParser } from './parser';
import { PatternRecognizer } from './patterns';
import { FormulaTranslator } from './formulas';
import { UIGenerator } from './ui-generator';

export class ExcelTransformationTool implements Tool {
  id = 'excel-transformer';
  name = 'Excel to Modern App Transformer';
  description = 'Transform Excel spreadsheets into modern web applications in 5 minutes';
  category = 'transformer' as const;
  
  async execute(params: {
    file: Buffer;
    targetFramework: 'react' | 'vue' | 'angular';
    features: string[];
  }): Promise<TransformationResult> {
    // Step 1: Parse Excel file
    const parsed = await this.parser.parse(params.file);
    
    // Step 2: Recognize patterns
    const patterns = await this.patternRecognizer.analyze(parsed);
    
    // Step 3: Translate formulas
    const logic = await this.formulaTranslator.translate(patterns.formulas);
    
    // Step 4: Generate UI
    const app = await this.uiGenerator.generate({
      data: parsed.data,
      logic,
      framework: params.targetFramework,
      features: params.features,
    });
    
    return {
      success: true,
      duration: Date.now() - startTime,
      app,
      preview: app.previewUrl,
    };
  }
}
```

### Week 6: Connector Development

#### 6.1 Salesforce Connector
```typescript
// connectors/salesforce/index.ts
import jsforce from 'jsforce';

export class SalesforceConnector implements Tool {
  private conn: jsforce.Connection;
  
  async connect(credentials: SalesforceCredentials): Promise<void> {
    this.conn = new jsforce.Connection({
      oauth2: {
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        redirectUri: credentials.redirectUri,
      },
    });
    
    await this.conn.login(credentials.username, credentials.password);
  }
  
  async execute(params: {
    operation: 'read' | 'create' | 'update' | 'delete';
    object: string;
    data?: any;
    query?: string;
  }): Promise<any> {
    switch (params.operation) {
      case 'read':
        return this.conn.query(params.query || `SELECT Id, Name FROM ${params.object}`);
      case 'create':
        return this.conn.sobject(params.object).create(params.data);
      case 'update':
        return this.conn.sobject(params.object).update(params.data);
      case 'delete':
        return this.conn.sobject(params.object).delete(params.data.id);
    }
  }
}
```

### Week 7: Memory & Context Management

#### 7.1 Conversation Memory
```typescript
// services/memory/conversation-store.ts
import { Pool } from 'pg';
import Redis from 'ioredis';

export class ConversationMemory {
  private pg: Pool;
  private redis: Redis;
  
  constructor() {
    this.pg = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: 6379,
    });
  }
  
  async saveMessage(conversationId: string, message: Message): Promise<void> {
    // Save to PostgreSQL for persistence
    await this.pg.query(
      `INSERT INTO conversations (id, user_id, message, timestamp, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [conversationId, message.userId, message.content, new Date(), message.metadata]
    );
    
    // Cache in Redis for quick access
    await this.redis.zadd(
      `conv:${conversationId}`,
      Date.now(),
      JSON.stringify(message)
    );
    
    // Maintain sliding window of last 10 messages
    await this.redis.zremrangebyrank(`conv:${conversationId}`, 0, -11);
  }
  
  async getContext(conversationId: string, limit = 10): Promise<Message[]> {
    // Try Redis first
    const cached = await this.redis.zrevrange(`conv:${conversationId}`, 0, limit - 1);
    
    if (cached.length > 0) {
      return cached.map(c => JSON.parse(c));
    }
    
    // Fallback to PostgreSQL
    const result = await this.pg.query(
      `SELECT * FROM conversations 
       WHERE id = $1 
       ORDER BY timestamp DESC 
       LIMIT $2`,
      [conversationId, limit]
    );
    
    return result.rows;
  }
}
```

### Week 8: Testing Framework

#### 8.1 Agent Testing Suite
```typescript
// tests/agent-platform/workflow.test.ts
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { AgentWorkflow } from '../../services/orchestrator/workflows/agent-workflow';

describe('Agent Workflow Tests', () => {
  let testEnv: TestWorkflowEnvironment;
  
  beforeAll(async () => {
    testEnv = await TestWorkflowEnvironment.createLocal();
  });
  
  afterAll(async () => {
    await testEnv.teardown();
  });
  
  test('should handle Excel transformation request', async () => {
    const { client, nativeConnection } = testEnv;
    const worker = await Worker.create({
      connection: nativeConnection,
      workflowsPath: require.resolve('../../services/orchestrator/workflows'),
      activities,
    });
    
    const result = await worker.runUntil(
      client.workflow.execute(AgentWorkflow, {
        args: [{
          prompt: 'Transform this Excel file into a React app',
          context: { file: 'test.xlsx' },
          userId: 'test-user',
        }],
      })
    );
    
    expect(result).toContain('Transformation complete');
    expect(result).toContain('preview');
  });
});
```

---

## 📋 Phase 3: Production Readiness (Weeks 9-12)

### Week 9: Monitoring & Observability

#### 9.1 Prometheus Metrics
```yaml
# monitoring/prometheus/config.yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'agent-platform'
    static_configs:
      - targets:
        - orchestrator:8080
        - llm-router:8081
        - tool-registry:8082
    metrics_path: /metrics
    
  - job_name: 'temporal'
    static_configs:
      - targets:
        - temporal:8000
    metrics_path: /metrics
```

#### 9.2 Custom Metrics
```typescript
// services/metrics/collector.ts
import { Registry, Counter, Histogram, Gauge } from 'prom-client';

export class MetricsCollector {
  private registry = new Registry();
  
  // Agent metrics
  agentInvocations = new Counter({
    name: 'agent_invocations_total',
    help: 'Total number of agent invocations',
    labelNames: ['agent_type', 'status'],
    registers: [this.registry],
  });
  
  agentDuration = new Histogram({
    name: 'agent_duration_seconds',
    help: 'Agent execution duration',
    labelNames: ['agent_type'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
    registers: [this.registry],
  });
  
  // LLM metrics
  llmCost = new Counter({
    name: 'llm_cost_dollars',
    help: 'LLM API costs in dollars',
    labelNames: ['provider', 'model'],
    registers: [this.registry],
  });
  
  llmTokens = new Counter({
    name: 'llm_tokens_total',
    help: 'Total tokens processed',
    labelNames: ['provider', 'model', 'type'],
    registers: [this.registry],
  });
  
  // System metrics
  activeWorkflows = new Gauge({
    name: 'active_workflows',
    help: 'Number of active workflows',
    registers: [this.registry],
  });
}
```

### Week 10: Security Hardening

#### 10.1 API Security Middleware
```typescript
// middleware/security.ts
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';

export const securityMiddleware = [
  // Security headers
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
  
  // Rate limiting
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: res.getHeader('Retry-After'),
      });
    },
  }),
  
  // CORS configuration
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        'https://candlefish.ai',
        'https://app.candlefish.ai',
        /^https:\/\/.*\.candlefish\.ai$/,
      ];
      
      if (!origin || allowedOrigins.some(allowed => 
        typeof allowed === 'string' ? allowed === origin : allowed.test(origin)
      )) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }),
];
```

### Week 11: Auto-scaling Configuration

#### 11.1 Kubernetes HPA
```yaml
# k8s/autoscaling/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: agent-orchestrator-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: agent-orchestrator
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: active_workflows
      target:
        type: AverageValue
        averageValue: "30"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
```

### Week 12: Documentation & Training

#### 12.1 API Documentation
```yaml
# docs/openapi/agent-platform.yaml
openapi: 3.0.0
info:
  title: Candlefish Agent Platform API
  version: 1.0.0
  description: |
    Agent orchestration platform with Excel transformation capabilities
    
    ## Authentication
    All requests require a valid JWT token in the Authorization header.
    
    ## Rate Limits
    - 100 requests per minute per user
    - 1000 requests per minute per organization

paths:
  /api/agent/invoke:
    post:
      summary: Invoke an agent
      operationId: invokeAgent
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                prompt:
                  type: string
                  description: Natural language prompt
                context:
                  type: object
                  description: Additional context
                options:
                  type: object
                  properties:
                    timeout:
                      type: integer
                      default: 300000
                    maxCost:
                      type: number
                      default: 1.0
      responses:
        '200':
          description: Successful execution
          content:
            application/json:
              schema:
                type: object
                properties:
                  result:
                    type: string
                  metadata:
                    type: object
        '429':
          description: Rate limit exceeded
```

---

## 📋 Phase 4: Optimization & Scale (Weeks 13-16)

### Week 13-14: Performance Optimization

#### 13.1 Caching Strategy
```typescript
// services/cache/multi-layer-cache.ts
export class MultiLayerCache {
  private l1: Map<string, CacheEntry>; // Memory
  private l2: Redis; // Redis
  private l3: S3Client; // S3 for large objects
  
  async get(key: string): Promise<any> {
    // L1: Memory cache (microseconds)
    const l1Result = this.l1.get(key);
    if (l1Result && !this.isExpired(l1Result)) {
      return l1Result.value;
    }
    
    // L2: Redis cache (milliseconds)
    const l2Result = await this.l2.get(key);
    if (l2Result) {
      this.l1.set(key, { value: l2Result, ttl: 60 });
      return l2Result;
    }
    
    // L3: S3 cache (seconds)
    const l3Result = await this.getFromS3(key);
    if (l3Result) {
      await this.l2.setex(key, 300, l3Result);
      this.l1.set(key, { value: l3Result, ttl: 60 });
      return l3Result;
    }
    
    return null;
  }
}
```

### Week 15-16: Advanced Features

#### 15.1 Agent Chaining
```typescript
// services/orchestrator/chain.ts
export class AgentChain {
  async execute(steps: ChainStep[]): Promise<any> {
    let context = {};
    
    for (const step of steps) {
      const result = await this.runStep(step, context);
      
      if (step.condition && !this.evaluateCondition(step.condition, result)) {
        if (step.onFailure) {
          return this.execute(step.onFailure);
        }
        throw new Error(`Step ${step.name} failed condition`);
      }
      
      context = { ...context, [step.name]: result };
    }
    
    return context;
  }
}
```

---

## 🎯 Success Metrics

### Technical Metrics
- API Response Time: < 100ms p95
- Agent Execution Time: < 5 seconds p95
- System Uptime: > 99.9%
- Error Rate: < 0.1%

### Business Metrics
- Cost Savings: $800/month (GitHub Actions)
- Development Velocity: 2x faster
- Customer Onboarding: < 1 hour
- Excel Transformation Success Rate: > 95%

### Cost Tracking
```typescript
// Monthly cost breakdown
const costs = {
  infrastructure: {
    aws_compute: 800,
    aws_storage: 200,
    aws_networking: 150,
  },
  services: {
    llm_apis: 500,
    temporal_cloud: 200,
    monitoring: 100,
  },
  total: 1950,
  savings_vs_trayai: 3050, // $5000 - $1950
};
```

---

## 🚨 Risk Mitigation

### Technical Risks
1. **LLM API Failures**
   - Mitigation: Multi-provider fallback
   - Implementation: Circuit breakers, retry logic

2. **Data Loss**
   - Mitigation: Multi-region backups
   - Implementation: Daily snapshots, point-in-time recovery

3. **Security Breaches**
   - Mitigation: Defense in depth
   - Implementation: WAF, encryption, audit logging

### Business Risks
1. **Cost Overruns**
   - Mitigation: Budget alerts, cost controls
   - Implementation: Daily cost tracking, automatic shutoffs

2. **Scaling Issues**
   - Mitigation: Auto-scaling, load testing
   - Implementation: HPA, stress testing, capacity planning

---

## 📚 Resources & Support

### Documentation
- Architecture: `/docs/architecture/`
- API Reference: `/docs/api/`
- Deployment Guide: `/docs/deployment/`
- Troubleshooting: `/docs/troubleshooting/`

### Monitoring Dashboards
- System Health: https://grafana.candlefish.ai/system
- Agent Performance: https://grafana.candlefish.ai/agents
- Cost Tracking: https://grafana.candlefish.ai/costs

### Support Channels
- Slack: #agent-platform
- Email: platform@candlefish.ai
- On-call: PagerDuty

---

## ✅ Checklist for Success

### Week 1
- [ ] Fix critical security issues
- [ ] Reduce GitHub Actions costs
- [ ] Set up API Gateway
- [ ] Implement secrets management

### Month 1
- [ ] Deploy Temporal.io
- [ ] Build LLM router
- [ ] Create tool registry
- [ ] Implement conversation memory

### Month 2
- [ ] Integrate Excel transformer
- [ ] Build 5 connectors
- [ ] Add monitoring
- [ ] Implement testing

### Month 3
- [ ] Security hardening
- [ ] Auto-scaling setup
- [ ] Documentation complete
- [ ] Performance optimization

### Month 4
- [ ] Production deployment
- [ ] Customer onboarding
- [ ] Advanced features
- [ ] Optimization complete

---

**Start Date**: August 12, 2025
**Target Production**: December 12, 2025
**Budget**: $56,000 (vs $120,000 for Tray.ai)
**Savings**: $64,000 in Year 1