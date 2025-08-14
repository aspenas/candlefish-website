# Candlefish.ai - Coherent Vertical Automation Platform

[![CI/CD](https://github.com/candlefish-ai/candlefish-ai/actions/workflows/monorepo-ci.yml/badge.svg)](https://github.com/candlefish-ai/candlefish-ai/actions/workflows/monorepo-ci.yml)
[![Security](https://github.com/candlefish-ai/candlefish-ai/actions/workflows/auto-security.yml/badge.svg)](https://github.com/candlefish-ai/candlefish-ai/actions/workflows/auto-security.yml)
[![Dependencies](https://github.com/candlefish-ai/candlefish-ai/actions/workflows/auto-dependencies.yml/badge.svg)](https://github.com/candlefish-ai/candlefish-ai/actions/workflows/auto-dependencies.yml)
[![Performance](https://github.com/candlefish-ai/candlefish-ai/actions/workflows/auto-performance.yml/badge.svg)](https://github.com/candlefish-ai/candlefish-ai/actions/workflows/auto-performance.yml)
[![License](https://img.shields.io/badge/license-Proprietary-blue.svg)](LICENSE)

> Converting messy, Excel-bound operations into durable, AI-native systems for real-world industries

## Vision

Candlefish is building the AI control plane for blue-collar and craft industries, transforming spreadsheet chaos into intelligent automation through our "single spine, many faces" architecture.

## Core Products

### Vertical Applications
- **Paintbox** - Professional paint estimation and job management
- **Crown** - Trophy and awards inventory and production
- **PromoterOS** - Venue booking and settlement management  
- **Brewkit** - Brewery production planning and inventory

### Platform Capabilities
- **Excel Migration Engine** - 5-minute spreadsheet to application transformation
- **Coherent Core** - Shared infrastructure across all verticals
- **Operator Network** - Certified partners for implementation and support
- **AI Alignment** - Systems that evolve with their users

## Quick Start

### Development Setup

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Configure environment**
   ```bash
   cp .env.local.example .env.local
   # Add your API keys and configuration
   ```

3. **Run development server**
   ```bash
   pnpm dev
   ```

4. **Access applications**
   - Main platform: http://localhost:3000
   - Paintbox: http://localhost:3001
   - Documentation: http://localhost:3002

## Architecture

```
┌─────────────────────────────────────────┐
│      VERTICAL APPLICATIONS              │
│  Paintbox | Crown | PromoterOS | Brewkit│
└─────────────────────────────────────────┘
                    ▼
┌─────────────────────────────────────────┐
│         CANDLEFISH CORE                 │
│  Identity | Data | Workflow | Agents    │
└─────────────────────────────────────────┘
                    ▼
┌─────────────────────────────────────────┐
│       EXCEL MIGRATION ENGINE            │
│  Parse | Analyze | Transform | Generate │
└─────────────────────────────────────────┘
```

## Project Structure

```
candlefish-ai/
├── apps/                    # Applications
│   ├── website/            # Main marketing site
│   ├── mobile-dashboard/   # Mobile applications
│   └── brand-portal/       # Brand assets
├── projects/               # Vertical implementations
│   ├── paintbox/          # Painting contractors
│   ├── crowntrophy/       # Trophy/awards
│   └── promoteros/        # Venue management
├── packages/              # Shared packages
│   ├── ui-components/     # Design system
│   └── tyler-setup/       # Employee onboarding
├── deployment/            # Infrastructure
│   ├── terraform/         # IaC configurations
│   └── k8s/              # Kubernetes manifests
└── docs/                  # Documentation
    └── operator-network/  # Partner resources
```

## Key Documents

- [Strategic Plan 2025-2027](./STRATEGY_2025.md)
- [Operator Network Playbook](./OPERATOR_NETWORK_PLAYBOOK.md)
- [Excel Migration Architecture](./EXCEL_MIGRATION_ARCHITECTURE.md)
- [Alignment Manifesto](./ALIGNMENT_MANIFESTO.md)

## Technology Stack

- **Frontend**: Next.js 14, React, TypeScript, TailwindCSS
- **Backend**: Node.js, GraphQL Federation, Prisma
- **Database**: PostgreSQL, Redis, S3
- **AI/ML**: Anthropic Claude, OpenAI, Custom models
- **Infrastructure**: AWS EKS, Terraform, GitHub Actions
- **Monitoring**: Prometheus, Grafana, OpenTelemetry

## Development Workflow

### Running Tests
```bash
# Unit tests
pnpm test

# Integration tests
pnpm test:integration

# E2E tests
pnpm test:e2e
```

### Code Quality
```bash
# Linting
pnpm lint

# Type checking
pnpm typecheck

# Format code
pnpm format
```

### Deployment
```bash
# Deploy to staging
pnpm deploy:staging

# Deploy to production
pnpm deploy:production
```

## Contributing

We follow a structured development process:

1. **Branch Naming**: `feat/description-YYYYMMDD`
2. **Commit Style**: Present tense, concise messages
3. **Code Review**: All PRs require approval
4. **Testing**: Maintain 80% coverage minimum

## Security

- SOC 2 Type I target: Q1 2026
- Per-tenant encryption with KMS
- Row-level security on all data
- Complete audit trail
- GDPR/CCPA compliant

## Support

- **Documentation**: [docs.candlefish.ai](https://docs.candlefish.ai)
- **Partner Portal**: [partners.candlefish.ai](https://partners.candlefish.ai)
- **API Reference**: [api.candlefish.ai](https://api.candlefish.ai)

## License

Proprietary - Candlefish.ai © 2025

---

**Building the future of work through aligned intelligence.**
