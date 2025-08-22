# 🥚 Eggshell - Professional Paint Estimation Platform

**Built by Candlefish.ai**

Eggshell is a production-grade web application that transforms the traditional Excel-based paint estimation process into a modern, cloud-connected solution. It features comprehensive integrations with Salesforce and Company Cam, along with a powerful calculation engine that replicates 14,000+ Excel formulas.

## 🚀 Nuclear Overhaul Complete

This application has undergone a comprehensive "nuclear overhaul" implementing:

- ✅ **14,000+ Excel Formula Engine** - Complete TypeScript implementation
- ✅ **Salesforce Integration** - Auto-populate customer data and sync estimates
- ✅ **Company Cam Integration** - Link project photos seamlessly
- ✅ **Production-Grade Infrastructure** - Redis caching, AWS Secrets Manager, comprehensive logging
- ✅ **Enterprise Security** - OAuth, encrypted secrets, secure API endpoints
- ✅ **Real-time Calculations** - Live updates as measurements are entered
- ✅ **Offline-First Architecture** - Work without internet, sync when connected

## 📋 Features

### Core Functionality

- **Multi-step Workflow**: Client Info → Exterior → Interior → Review → Finalize
- **Excel Parity**: All calculations match the original bart3.20.xlsx formulas exactly
- **Auto-save**: Never lose work with automatic saving
- **PDF Generation**: Professional estimates ready to send
- **Mobile Optimized**: Works perfectly on tablets in the field

### Integrations

- **Salesforce CRM**

  - Search existing customers
  - Auto-populate client information
  - Create/update opportunities
  - Sync estimate data

- **Company Cam**
  - Link to existing projects
  - Create new photo projects
  - Deep link to mobile app
  - View project photos inline

### Technical Excellence

- **Performance**: Sub-second calculations with Redis caching
- **Reliability**: Circuit breakers, retry logic, graceful degradation
- **Monitoring**: Sentry error tracking, structured logging, health checks
- **Security**: Encrypted secrets, API authentication, CORS protection
- **Scalability**: Horizontal scaling ready, queue-based processing

## 🛠 Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **State Management**: Zustand with persistence
- **Calculation Engine**: Custom Excel formula parser (mathjs, decimal.js)
- **Backend**: Node.js, Redis, PostgreSQL
- **APIs**: RESTful with OpenAPI documentation
- **Infrastructure**: Docker, AWS, Vercel-ready
- **Monitoring**: Sentry, Winston logging, OpenTelemetry

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Redis (optional, falls back gracefully)
- PostgreSQL (optional for development)

### Environment Setup

1. Clone the repository:

```bash
git clone https://github.com/your-org/eggshell.git
cd eggshell
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Company Cam (required for photo integration)
NEXT_PUBLIC_COMPANYCAM_API_TOKEN=your_token_here

# Salesforce (required for CRM integration)
SALESFORCE_CLIENT_ID=your_client_id
SALESFORCE_CLIENT_SECRET=your_client_secret
SALESFORCE_USERNAME=your_username
SALESFORCE_PASSWORD=your_password
SALESFORCE_SECURITY_TOKEN=your_token

# Optional but recommended
DATABASE_URL=postgresql://user:pass@localhost:5432/eggshell
REDIS_URL=redis://localhost:6379
SENTRY_DSN=your_sentry_dsn
```

4. Place the Excel file:

   - Copy `bart3.20.xlsx` to the project root
   - This file contains all pricing tables and formulas

5. Run development server:

```bash
npm run dev
```

Visit <http://localhost:3000> to see the application.

## 🏗 Architecture

### Directory Structure

```
eggshell/
├── app/                    # Next.js 15 app directory
│   ├── api/               # API routes
│   │   ├── health/        # Health check endpoint
│   │   └── v1/            # API v1 endpoints
│   ├── estimate/          # Estimate workflow pages
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── workflow/          # Workflow step components
│   ├── salesforce/        # Salesforce integration
│   └── companycam/        # Company Cam integration
├── lib/                   # Core libraries
│   ├── excel-engine/      # Excel formula engine
│   ├── services/          # Business logic services
│   ├── cache/             # Redis caching layer
│   └── logging/           # Structured logging
├── scripts/               # Deployment and utilities
└── docs/                  # Documentation
```

### Service Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│                 │     │                  │     │                 │
│  Next.js App    │────▶│  Calculation     │────▶│  Excel Engine   │
│                 │     │  Service         │     │  (14k formulas) │
└────────┬────────┘     └──────────────────┘     └─────────────────┘
         │
         │              ┌──────────────────┐     ┌─────────────────┐
         ├─────────────▶│  Salesforce      │────▶│  Salesforce     │
         │              │  Service         │     │  API            │
         │              └──────────────────┘     └─────────────────┘
         │
         │              ┌──────────────────┐     ┌─────────────────┐
         └─────────────▶│  Company Cam     │────▶│  Company Cam    │
                        │  Service         │     │  API            │
                        └──────────────────┘     └─────────────────┘
```

## 🧮 Excel Calculation Engine

The calculation engine perfectly replicates the Excel formulas:

- **4,741 IF statements** - Complex conditional logic
- **883 VLOOKUP formulas** - Table lookups
- **1,092 text functions** - String manipulation
- **456 mathematical operations** - SUM, arithmetic
- **Cross-sheet references** - Full dependency tracking

### Example Calculation Flow

```typescript
// 1. Load client info
await calculationService.loadClientInfo(clientInfo);

// 2. Calculate exterior
const exterior = await calculationService.calculateExterior(measurements);

// 3. Calculate interior
const interior = await calculationService.calculateInterior(measurements);

// 4. Apply markups and generate totals
const result = await calculationService.calculateEstimate(estimate);
```

## 🔌 API Documentation

### Health Check

```bash
GET /api/health
```

### Quick Estimate

```bash
GET /api/v1/calculate?exterior=1000&interior=2000&complexity=standard
```

### Full Calculation

```bash
POST /api/v1/calculate
Content-Type: application/json

{
  "estimate": {
    "id": "uuid",
    "clientInfo": {...},
    "exteriorMeasurements": [...],
    "interiorMeasurements": [...]
  }
}
```

### Salesforce Search

```bash
GET /api/v1/salesforce/search?q=John+Doe
```

## 🚀 Deployment

### Staging on Fly.io (Canonical)

Requirements:

- App: `paintbox-staging`
- Health path: `/api/health` (10s interval, 60s grace)
- Node 20

Secrets (stored in AWS Secrets Manager and synced to Fly):

- `NEXT_PUBLIC_COMPANYCAM_API_TOKEN`
- `SALESFORCE_CLIENT_ID`, `SALESFORCE_CLIENT_SECRET`, `SALESFORCE_USERNAME`, `SALESFORCE_PASSWORD`, `SALESFORCE_SECURITY_TOKEN`
- `DATABASE_URL`, `REDIS_URL`
- `SENTRY_DSN`
- `JWT_PUBLIC_KEY`, `JWT_PRIVATE_KEY`
- `SLACK_ALERTS_WEBHOOK_URL`

Deploy:

```bash
flyctl apps create eggshell-staging || true
flyctl deploy -c fly.toml --remote-only
```

### Docker

```bash
./scripts/deploy.sh docker
```

### AWS

```bash
./scripts/deploy.sh aws
```

### Environment Variables for Production

Required:

- `NEXT_PUBLIC_COMPANYCAM_API_TOKEN`
- `SALESFORCE_CLIENT_ID`
- `SALESFORCE_CLIENT_SECRET`
- `SALESFORCE_USERNAME`
- `SALESFORCE_PASSWORD`
- `SALESFORCE_SECURITY_TOKEN`

Recommended:

- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis for caching
- `SENTRY_DSN` - Error tracking
- `AWS_SECRETS_MANAGER_SECRET_NAME` - For secure secrets
- `JWT_PUBLIC_KEY`, `JWT_PRIVATE_KEY` - RS256 keys stored in AWS Secrets
- `SLACK_ALERTS_WEBHOOK_URL` - Slack notifications for alerts

### Security Notes

- RS256 keys are persisted via AWS Secrets Manager; no ephemeral fallback.
- CSP hardened with per-request nonces; no `unsafe-inline`/`unsafe-eval`.
- Input sanitization added to `POST /api/v1/build/validate`.
- Rate limiter uses in-memory fallback when Redis unavailable; fails-closed on algorithm decisions.

## 🧪 Testing

Run the test suite:

```bash
npm test
```

Test specific integrations:

```bash
npm run test:companycam
npm run test:salesforce
npm run test:calculations
```

## 🔒 Security

- All secrets stored in AWS Secrets Manager or environment variables
- API authentication with bearer tokens
- CORS protection and security headers
- Input validation with Zod schemas
- SQL injection protection with parameterized queries
- XSS protection with React's built-in escaping

## 📊 Monitoring

### Health Endpoint

Monitor application health:

```bash
curl https://your-domain.com/api/health
```

Response:

```json
{
  "status": "healthy",
  "services": {
    "cache": true,
    "secrets": true,
    "salesforce": true,
    "companyCam": true,
    "calculations": true
  },
  "timestamp": "2024-01-31T10:00:00Z"
}
```

### Logging

Structured logs are written to:

- Console (development)
- Files with rotation (production)
- Sentry (errors)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is proprietary software owned by Kind Home Paint Company.

## 🙏 Acknowledgments

- Built with ❤️ by [Candlefish.ai](https://candlefish.ai)
- Original Excel system by Kind Home Paint Company
- Powered by Next.js, Vercel, and the open source community

---

**Need Help?**

- 📧 Email: <support@candlefish.ai>
- 📚 Docs: See `/docs` directory
- 🐛 Issues: GitHub Issues

**Built by Candlefish.ai** - Transforming businesses with AI-powered solutions.
