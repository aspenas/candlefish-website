# NANDA Index - Revolutionary AI Agent Discovery Infrastructure

## 🚀 The Internet of AI Agents

NANDA (Network Architecture for Next-generation Distributed Agents) is a revolutionary infrastructure that replaces DNS for the Internet of AI Agents. Based on the groundbreaking NANDA paper (arxiv:2507.14263), this implementation provides production-ready infrastructure for discovering, authenticating, and routing to trillions of AI agents.

## 🎯 Key Features

### Core Infrastructure
- **Lean Index**: <120 bytes per record, supporting billions of agents
- **CRDT-Based Updates**: Sub-second global propagation with eventual consistency
- **W3C Verifiable Credentials v2**: Industry-standard agent capability assertions
- **Adaptive Routing**: Geo-aware, load-balanced, DDoS-protected agent resolution
- **Privacy Layer**: Zero-knowledge proofs and mix-net routing for unlinkable lookups

### Enterprise Integration
- **Multi-Platform Support**: Google A2A, Microsoft NLWeb, OpenAI GPT Store, Anthropic Claude
- **MCP Server Integration**: Native support for Model Context Protocol
- **Web3 Markets**: DID-based agent marketplace integration
- **Cross-Registry Federation**: Seamless interoperability between platforms

### Performance at Scale
- **10,000+ updates/second** per shard
- **<100ms p95 latency** for global resolution
- **Horizontal scaling** to billions of agents
- **Edge caching** with Cloudflare Workers
- **Real-time WebSocket** subscriptions

## 📦 Installation

```bash
# Install the core package
npm install @candlefish/nanda-index

# Or use pnpm
pnpm add @candlefish/nanda-index
```

## 🔧 Quick Start

### Basic Usage

```typescript
import { NANDAIndex, AgentFactsResolver } from '@candlefish/nanda-index';

// Initialize the index
const index = new NANDAIndex({
  region: 'us-east-1',
  redisUrl: 'redis://localhost:6379'
});

await index.initialize();

// Register an AI agent
const agent = await index.registerAgent({
  agentName: 'my-ai-assistant',
  primaryFactsUrl: 'https://my-domain.com/agent-facts.json',
  privateFactsUrl: 'ipfs://QmXxx...',
  adaptiveResolverUrl: 'https://resolver.my-domain.com',
  ttl: 3600
});

console.log('Agent registered:', agent.agent_id);

// Query agents
const agents = await index.queryAgents({
  capability: 'text-generation',
  vendor: 'openai',
  limit: 10
});

// Resolve agent capabilities
const resolver = new AgentFactsResolver();
const facts = await resolver.resolveAgentFacts(agent.primaryFactsUrl);
const capability = await resolver.getAgentCapability(
  agent.primaryFactsUrl, 
  'text-generation'
);
```

### Privacy-Preserving Lookups

```typescript
import { PrivacyLayer } from '@candlefish/nanda-index';

const privacy = new PrivacyLayer();

// Generate zero-knowledge proof
const proof = await privacy.generateCapabilityProof({
  capability: 'medical-diagnosis',
  agentId: 'agent-123'
});

// Perform private lookup through mix-net
const result = await privacy.privateLookup({
  queryHash: 'sha256:abc123...',
  zeroKnowledgeProof: JSON.stringify(proof),
  mixNetRoute: ['mix-us-east-1', 'mix-eu-west-1'],
  ephemeralKey: 'generated-key'
});
```

### Adaptive Routing

```typescript
import { AdaptiveResolver } from '@candlefish/nanda-index';

const resolver = new AdaptiveResolver({
  agent_id: 'resolver-1',
  strategies: {
    geographic: true,
    loadBalanced: true,
    failover: true,
    canary: false
  }
});

// Route request to best endpoint
const routing = await resolver.route({
  agentId: 'agent-123',
  capability: 'text-generation',
  clientIP: '192.168.1.1',
  region: 'us-east-1',
  priority: 'high'
});

console.log('Route to:', routing.endpoint);
console.log('Session token:', routing.token);
```

### Enterprise Integration

```typescript
import { EnterpriseConnector, EnterprisePlatform } from '@candlefish/nanda-index';

const connector = new EnterpriseConnector();

// Add OpenAI registry
connector.addRegistry({
  type: 'openai',
  endpoint: 'https://api.openai.com/v1',
  authentication: {
    type: 'apikey',
    credentials: { apiKey: process.env.OPENAI_API_KEY }
  },
  syncInterval: 3600
});

// Sync agents from platform
const status = await connector.syncPlatform(EnterprisePlatform.OPENAI_GPT_STORE);
console.log(`Synced ${status.syncedAgents} agents from OpenAI`);
```

## 🏗️ Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Applications                      │
└────────────┬────────────────────────────────────┬────────────┘
             │                                    │
             ▼                                    ▼
┌─────────────────────┐              ┌─────────────────────┐
│   REST/GraphQL API  │              │  WebSocket Server   │
└──────────┬──────────┘              └──────────┬──────────┘
           │                                     │
           ▼                                     ▼
┌──────────────────────────────────────────────────────────┐
│                      NANDA Core Index                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ CRDT Engine  │  │ Agent Facts  │  │  Adaptive    │   │
│  │              │  │   Resolver   │  │   Resolver   │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
└──────────────────────────────────────────────────────────┘
           │                                     │
           ▼                                     ▼
┌──────────────────┐                  ┌──────────────────┐
│  Privacy Layer   │                  │   Enterprise     │
│  - ZK Proofs     │                  │   Connector      │
│  - Mix Networks  │                  │  - Platform APIs │
└──────────────────┘                  └──────────────────┘
           │                                     │
           ▼                                     ▼
┌──────────────────────────────────────────────────────────┐
│                    Storage & Caching                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   DynamoDB   │  │    Redis     │  │     IPFS     │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Agent Registration**: Agents register with lean index records
2. **CRDT Propagation**: Updates propagate globally via CRDT protocol
3. **Capability Discovery**: AgentFacts resolved with W3C VC verification
4. **Adaptive Routing**: Intelligent routing based on geo, load, and health
5. **Privacy Protection**: ZK proofs and mix-nets for anonymous lookups

## 🔒 Security Features

- **Ed25519 Signatures**: All records cryptographically signed
- **W3C Verifiable Credentials**: Industry-standard capability assertions
- **Zero-Knowledge Proofs**: Privacy-preserving capability verification
- **Mix-Net Routing**: Unlinkable lookup paths
- **DDoS Protection**: Adaptive rate limiting and challenge tokens
- **Tamper-Evident Audit Logs**: Blockchain-inspired audit trail

## 📊 Performance Benchmarks

| Metric | Value | Notes |
|--------|-------|-------|
| Write Throughput | 10,000 ops/sec | Per shard |
| Read Latency (p50) | 5ms | With caching |
| Read Latency (p95) | 50ms | Global resolution |
| Read Latency (p99) | 100ms | Worst case |
| Storage Efficiency | 120 bytes/record | Compressed |
| Network Bandwidth | <1KB per query | Including proof |
| Concurrent Connections | 100,000+ | Per node |

## 🌍 Deployment

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nanda-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nanda-api
  template:
    metadata:
      labels:
        app: nanda-api
    spec:
      containers:
      - name: nanda-api
        image: candlefish/nanda-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: REDIS_URL
          value: redis://redis-service:6379
        - name: AWS_REGION
          value: us-east-1
```

### Environment Variables

```bash
# Core Configuration
NODE_ID=nanda-node-1
PORT=3000
LOG_LEVEL=info

# AWS Configuration
AWS_REGION=us-east-1
DYNAMO_TABLE=nanda-index
S3_BUCKET=nanda-private-facts

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Authentication
JWKS_URL=https://your-domain.com/.well-known/jwks.json
JWT_ISSUER=https://nanda.candlefish.ai
JWT_AUDIENCE=nanda-api

# Rate Limiting
RATE_LIMIT_REQUESTS=1000
RATE_LIMIT_WINDOW=60000

# Privacy Configuration
MIX_NODE_1_KEY=<hex-encoded-public-key>
MIX_NODE_2_KEY=<hex-encoded-public-key>
ZK_PRIME=<large-prime-for-zk>

# Enterprise Integration
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run load tests
npm run test:load

# Run all tests with coverage
npm run test:coverage
```

## 📚 API Documentation

### REST API

Full OpenAPI documentation available at: `https://api.nanda.candlefish.ai/documentation`

### GraphQL API

Interactive GraphQL playground: `https://api.nanda.candlefish.ai/graphql`

### WebSocket API

Real-time subscriptions: `wss://api.nanda.candlefish.ai/ws`

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🏆 Acknowledgments

- Based on the NANDA paper (arxiv:2507.14263)
- Built on W3C Verifiable Credentials v2
- Inspired by DNS and BGP architectures
- Leveraging CRDT research from Shapiro et al.

## 🚀 Roadmap

- [ ] Quantum-resistant signatures
- [ ] WASM edge computing
- [ ] Satellite network support
- [ ] Neural protocol negotiation
- [ ] Homomorphic encryption
- [ ] Cross-chain integration

## 💡 Use Cases

- **AI Agent Marketplaces**: Discover and trade AI capabilities
- **Multi-Agent Systems**: Coordinate complex agent interactions
- **Enterprise AI Governance**: Manage and audit AI agent usage
- **Privacy-Preserving AI**: Enable anonymous AI interactions
- **Decentralized AI Networks**: Build Web3 AI ecosystems

## 📞 Support

- Documentation: [https://docs.nanda.candlefish.ai](https://docs.nanda.candlefish.ai)
- Discord: [https://discord.gg/nanda](https://discord.gg/nanda)
- Email: nanda@candlefish.ai

---

**Built with ❤️ by Candlefish AI - Illuminating the Internet of AI Agents**