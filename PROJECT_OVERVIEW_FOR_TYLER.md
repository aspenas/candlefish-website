# Candlefish AI - Complete Project Repository Overview

## Repository Access
Tyler (GitHub: tyler812) has **full admin access** to the repository: https://github.com/candlefish-ai/candlefish-ai

## Repository Structure

### 🎨 Brand & Marketing (`/brand`)
- **website/** - Main marketing site at test.candlefish.ai
  - Next.js 14 with static export
  - Consideration form with email integration (now working!)
  - Netlify deployment
  - Documentation: `/brand/website/docs/`

### 🏗️ Active Projects (`/projects`)

#### Paintbox
- **Path**: `/projects/paintbox`
- **Description**: Painting estimation platform
- **Stack**: Next.js, TypeScript, PostgreSQL, Prisma
- **Status**: Production
- **Key Features**: Offline mode, CompanyCam integration, Salesforce sync

#### PromoterOS
- **Path**: `/projects/promoterOS`
- **Description**: Artist promotion management system
- **Stack**: Node.js, Express, MongoDB
- **Status**: Active development

#### Crown Trophy
- **Path**: `/projects/crown-trophy` (referenced in operational data)
- **Description**: Engraving automation for franchise network
- **Stack**: AI document parsing, automation pipeline

### 🚀 Applications (`/apps`)
- **analytics-dashboard** - Data visualization platform
- **brand-portal** - Brand asset management
- **collaboration-editor** - Real-time collaborative editing
- **dashboard** - Main operational dashboard
- **mobile-collaboration** - Mobile collaboration tools
- **mobile-dashboard** - Mobile dashboard app
- **nanda-api** - Nanda service API
- **nanda-dashboard** - Nanda management interface
- **otter-gateway** - API gateway service
- **rtpm-api** - Real-time project management API
- **valuation-web** - Property valuation tools
- **website** - Main website

### 🔧 Services (`/services`)
- **auth-service** - Authentication and authorization
- **llm-router** - LLM routing and management
- **temporal** - Workflow orchestration
- **vector-store** - Vector database management
- **secrets** - Secret management utilities

### 📦 Packages (`/packages`)
- **cli-commons** - Shared CLI utilities
- **components** - Shared React components
- **config** - Configuration management
- **llm-toolkit** - LLM integration tools
- **nanda-index** - Nanda indexing service
- **telemetry** - Telemetry and monitoring
- **temporal-activities** - Temporal workflow activities
- **temporal-workflows** - Temporal workflow definitions
- **utils** - Shared utilities

### 🏠 Property Projects
- **5470_S_Highline_Circle** - Property valuation and due diligence

### 🛠️ Infrastructure (`/deployment`)
- **docker** - Docker configurations
- **fly** - Fly.io deployment configs
- **helm** - Kubernetes Helm charts
- **k8s** - Kubernetes manifests
- **monitoring** - Monitoring configurations
- **terraform** - Infrastructure as Code

### 📚 Documentation (`/docs`)
- Architecture diagrams
- API documentation
- Deployment guides
- Security policies

### 🧪 Testing (`/__tests__`)
- Unit tests
- Integration tests
- E2E tests
- Performance tests

## Key Technologies Used
- **Frontend**: React, Next.js, TypeScript, Tailwind CSS
- **Backend**: Node.js, Python, Express, FastAPI
- **Databases**: PostgreSQL, MongoDB, Redis
- **Infrastructure**: AWS, Netlify, Fly.io, Kubernetes
- **AI/ML**: OpenAI, Anthropic Claude, LangChain
- **Real-time**: WebSockets, Temporal workflows
- **Monitoring**: Prometheus, Grafana, Sentry

## Important Files for Tyler

### Configuration Files
- `/netlify.toml` - Netlify deployment configuration
- `/package.json` - Root package dependencies
- `/pnpm-workspace.yaml` - Monorepo workspace configuration
- `/.github/workflows/` - CI/CD pipelines

### Documentation
- `/README.md` - Main repository documentation
- `/CLAUDE.md` - AI assistant instructions
- `/brand/website/docs/CONSIDERATION_FORM_TECHNICAL_DOCUMENTATION.md` - Email system docs

### Environment Variables
All environment variables are stored in:
- **Netlify Dashboard** - For production deployments
- **AWS Secrets Manager** - For API keys and sensitive data
- `.env.local` files - For local development (not committed)

## Getting Started

### Clone the Repository
```bash
git clone https://github.com/candlefish-ai/candlefish-ai.git
cd candlefish-ai
```

### Install Dependencies
```bash
# We use pnpm for package management
npm install -g pnpm
pnpm install
```

### Run Projects Locally

#### Brand Website
```bash
cd brand/website
npm install
npm run dev
# Visit http://localhost:3000
```

#### Paintbox
```bash
cd projects/paintbox
npm install
npm run dev
# Visit http://localhost:3001
```

#### PromoterOS
```bash
cd projects/promoterOS
npm install
npm run dev
# Visit http://localhost:3002
```

## Deployment

### Brand Website (Netlify)
- **Production**: https://test.candlefish.ai
- **Deploy**: Push to main branch triggers auto-deployment
- **Manual Deploy**: `netlify deploy --prod`

### Other Projects
- Use respective deployment scripts in `/scripts/` folders
- Most projects support Docker deployment
- Kubernetes configs available in `/k8s/` folders

## Access & Credentials

### GitHub Repository
- **URL**: https://github.com/candlefish-ai/candlefish-ai
- **Your Access**: Admin (full permissions)

### Netlify
- **Site**: test.candlefish.ai
- **Dashboard**: https://app.netlify.com
- **Team**: Candlefish

### AWS Resources
- **Account ID**: 681214184463
- **Region**: us-east-1
- **Secrets**: AWS Secrets Manager

### API Keys (stored in AWS Secrets Manager)
- `candlefish/resend-api-key` - Email service
- `candlefish/openai-api-key` - OpenAI API
- `candlefish/anthropic-api-key` - Claude API
- `candlefish/porkbun-api-credentials` - DNS management

## Support & Documentation

### Internal Documentation
- Technical specs in `/docs/`
- API documentation in each service's README
- Architecture decisions in `/docs/architecture/`

### External Services
- **Resend**: https://resend.com (Email delivery)
- **Porkbun**: https://porkbun.com (Domain management)
- **Netlify**: https://netlify.com (Hosting)
- **AWS**: https://aws.amazon.com (Infrastructure)

## Contact

For any questions about the repository structure or specific projects:
- Check project-specific README files
- Review documentation in `/docs/`
- Slack: #claude-ai channel for technical discussions

---

*This overview was generated on January 22, 2025 to provide Tyler with complete visibility into the Candlefish AI repository structure and projects.*
