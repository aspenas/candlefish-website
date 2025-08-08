# Paintbox Architectural Decision Records (ADRs)

## ADR-001: Excel Formula Translation Strategy

**Date**: November 2024
**Status**: Accepted
**Context**: Need to replicate 14,000+ Excel formulas in a web application

### Decision

Translate Excel formulas to TypeScript functions rather than embedding Excel or using formula evaluation libraries.

### Rationale

- **Performance**: Native JS execution is faster than formula parsing
- **Type Safety**: TypeScript provides compile-time guarantees
- **Debugging**: Easier to debug native code than formula strings
- **Maintainability**: Can use standard development tools

### Consequences

- **Positive**: Full control over calculation logic, better performance
- **Negative**: Manual translation effort, potential for discrepancies

### Implementation

```typescript
// Excel: =IF(B2>100,B2*0.1,B2*0.05)
export const calculateDiscount = (value: Decimal): Decimal => {
  return value.greaterThan(100)
    ? value.times(0.1)
    : value.times(0.05);
};
```

---

## ADR-002: State Management with Zustand

**Date**: December 2024
**Status**: Accepted
**Context**: Need client-side state management for complex multi-step workflow

### Decision

Use Zustand for state management instead of Redux or Context API.

### Rationale

- **Simplicity**: Minimal boilerplate compared to Redux
- **TypeScript**: First-class TypeScript support
- **Performance**: Built-in shallow comparison and subscriptions
- **Persistence**: Easy localStorage/sessionStorage integration

### Consequences

- **Positive**: Faster development, cleaner code, better DX
- **Negative**: Smaller ecosystem than Redux

### Implementation

```typescript
export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      currentStep: 'client-info',
      formData: {},
      calculations: {},
      // ... methods
    }),
    { name: 'paintbox-workflow' }
  )
);
```

---

## ADR-003: AWS Secrets Manager for Credentials

**Date**: January 2025
**Status**: Accepted
**Context**: Critical security vulnerabilities with plaintext credentials in .env files

### Decision

Centralize all secrets in AWS Secrets Manager with runtime fetching.

### Rationale

- **Security**: Encryption at rest with KMS
- **Rotation**: Automatic secret rotation support
- **Audit**: Complete audit trail via CloudTrail
- **Access Control**: Fine-grained IAM policies

### Consequences

- **Positive**: Enterprise-grade security, compliance ready
- **Negative**: Additional AWS costs, slight latency for secret fetching

### Implementation

```typescript
const secretsManager = new SecretsManagerClient({ region: 'us-east-1' });
const secret = await secretsManager.send(
  new GetSecretValueCommand({ SecretId: 'paintbox/production/salesforce' })
);
```

---

## ADR-004: Multi-Step Workflow Architecture

**Date**: October 2024
**Status**: Accepted
**Context**: Complex business process with 5+ sequential steps

### Decision

Implement workflow as separate pages with shared state, not a single-page wizard.

### Rationale

- **URL State**: Each step has its own URL for bookmarking/sharing
- **Code Splitting**: Better performance with route-based splitting
- **Flexibility**: Easier to skip steps or navigate non-linearly
- **Testing**: Each step can be tested independently

### Consequences

- **Positive**: Better UX, improved performance, easier testing
- **Negative**: More complex state synchronization

### Implementation

```
/estimate/new/client-info
/estimate/new/exterior
/estimate/new/interior
/estimate/new/review
/estimate/new/finalize
```

---

## ADR-005: Redis Caching Strategy

**Date**: January 2025
**Status**: Accepted
**Context**: Need to optimize performance for expensive calculations and API calls

### Decision

Implement Redis caching with intelligent invalidation strategies.

### Rationale

- **Performance**: Sub-millisecond response times
- **Scalability**: Handles high concurrent load
- **Features**: TTL, pub/sub, atomic operations
- **Persistence**: Optional persistence for cache warming

### Consequences

- **Positive**: Significant performance improvement
- **Negative**: Additional infrastructure complexity

### Implementation

```typescript
const cached = await redis.get(`calc:${projectId}:${version}`);
if (cached) return JSON.parse(cached);

const result = await calculateProject(projectId);
await redis.set(`calc:${projectId}:${version}`,
  JSON.stringify(result), 'EX', 300);
```

---

## ADR-006: API Versioning Strategy

**Date**: November 2024
**Status**: Accepted
**Context**: Need to maintain backward compatibility while evolving APIs

### Decision

Use URL-based versioning with /api/v1/ prefix.

### Rationale

- **Clarity**: Version is explicit in the URL
- **Simplicity**: Easy to implement and understand
- **Flexibility**: Can run multiple versions simultaneously
- **Documentation**: Clear version boundaries

### Consequences

- **Positive**: Clear upgrade path, no breaking changes
- **Negative**: Potential code duplication between versions

### Implementation

```
/api/v1/calculations
/api/v1/salesforce/sync
/api/v2/calculations (future)
```

---

## ADR-007: Security Middleware Stack

**Date**: January 2025
**Status**: Accepted
**Context**: Need comprehensive security for production deployment

### Decision

Implement layered security middleware for defense in depth.

### Rationale

- **Layers**: Multiple security checks at different levels
- **Standards**: OWASP compliance out of the box
- **Monitoring**: Centralized security event logging
- **Performance**: Minimal overhead with proper ordering

### Consequences

- **Positive**: Robust security posture
- **Negative**: Slight request processing overhead

### Implementation

```typescript
// Middleware order matters!
app.use(helmet()); // Security headers
app.use(rateLimiter); // DDoS protection
app.use(authenticate); // JWT validation
app.use(authorize); // RBAC
app.use(validateInput); // Input sanitization
app.use(auditLogger); // Security events
```

---

## ADR-008: Decimal.js for Financial Calculations

**Date**: October 2024
**Status**: Accepted
**Context**: JavaScript's floating-point arithmetic causes precision issues

### Decision

Use decimal.js library for all financial calculations.

### Rationale

- **Precision**: Arbitrary precision decimal arithmetic
- **Compatibility**: Matches Excel's calculation precision
- **API**: Familiar API similar to native Number
- **Performance**: Optimized for financial calculations

### Consequences

- **Positive**: Accurate financial calculations
- **Negative**: Slightly more complex than native numbers

### Implementation

```typescript
import Decimal from 'decimal.js';

const price = new Decimal('19.99');
const tax = new Decimal('0.0825');
const total = price.times(tax.plus(1)); // 21.64
```

---

## ADR-009: Container-Based Deployment

**Date**: January 2025
**Status**: Accepted
**Context**: Need consistent deployments across environments

### Decision

Use Docker containers for all deployments with multi-stage builds.

### Rationale

- **Consistency**: Same container runs everywhere
- **Security**: Minimal attack surface with Alpine
- **Efficiency**: Multi-stage builds reduce size
- **Orchestration**: Works with any container platform

### Consequences

- **Positive**: Reproducible deployments, better security
- **Negative**: Additional build complexity

### Implementation

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine
RUN apk add --no-cache dumb-init
USER node
COPY --from=builder /app/node_modules ./node_modules
```

---

## ADR-010: Real-time Updates via WebSocket

**Date**: December 2024
**Status**: Accepted
**Context**: Need real-time calculation updates across devices

### Decision

Implement WebSocket connections for real-time synchronization.

### Rationale

- **Performance**: Lower latency than polling
- **Efficiency**: Reduced server load
- **UX**: Instant updates improve user experience
- **Scalability**: Can handle many concurrent connections

### Consequences

- **Positive**: Real-time collaboration features
- **Negative**: More complex connection management

### Implementation

```typescript
const ws = new WebSocket('wss://api.paintbox.com/realtime');
ws.on('calculation:update', (data) => {
  updateLocalState(data);
});
```

---

## ADR-011: Terraform for Infrastructure

**Date**: January 2025
**Status**: Accepted
**Context**: Need reproducible infrastructure deployments

### Decision

Use Terraform for all infrastructure as code.

### Rationale

- **Declarative**: Describe desired state
- **Multi-Cloud**: Works with AWS, Azure, GCP
- **State Management**: Tracks infrastructure changes
- **Modules**: Reusable infrastructure components

### Consequences

- **Positive**: Version-controlled infrastructure
- **Negative**: Learning curve for team

### Implementation

```hcl
resource "aws_secretsmanager_secret" "api_keys" {
  name = "paintbox/production/api-keys"
  kms_key_id = aws_kms_key.secrets.id
}
```

---

## ADR-012: Monitoring with CloudWatch

**Date**: January 2025
**Status**: Accepted
**Context**: Need comprehensive monitoring and alerting

### Decision

Use AWS CloudWatch for application and infrastructure monitoring.

### Rationale

- **Integration**: Native AWS service integration
- **Features**: Metrics, logs, alarms, dashboards
- **Cost**: Pay-per-use pricing model
- **Automation**: Auto-scaling based on metrics

### Consequences

- **Positive**: Comprehensive monitoring solution
- **Negative**: AWS vendor lock-in

### Implementation

```typescript
cloudwatch.putMetricData({
  Namespace: 'Paintbox/API',
  MetricData: [{
    MetricName: 'CalculationTime',
    Value: executionTime,
    Unit: 'Milliseconds'
  }]
});
```

---

## Decision Review Schedule

- **Quarterly**: Review ADRs for relevance
- **Major Changes**: Create new ADRs for significant pivots
- **Deprecation**: Mark outdated decisions as superseded

## Template for New ADRs

```markdown
## ADR-XXX: [Decision Title]

**Date**: [YYYY-MM-DD]
**Status**: [Proposed|Accepted|Deprecated|Superseded]
**Context**: [Why we need to make this decision]

### Decision
[What we decided]

### Rationale
[Why we made this choice]

### Consequences
- **Positive**: [Good outcomes]
- **Negative**: [Trade-offs]

### Implementation
[Code example or implementation notes]
```
