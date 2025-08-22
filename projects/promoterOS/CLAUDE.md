# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PromoterOS is an AI-powered concert booking platform designed for 1,200-3,500 capacity venues. It integrates with TikTok and other social platforms to analyze artist metrics and provide booking recommendations.

- **Infrastructure**: Netlify serverless functions
- **Site ID**: `ef0d6f05-62ba-46dd-82ad-39afbaa267ae`  
- **Production URL**: `https://promoteros.candlefish.ai`
- **Netlify URL**: `https://steady-cuchufli-1890bc.netlify.app`

## Development Commands

### Local Development
```bash
# Install dependencies
npm install
cd netlify/functions && npm install && cd ../..

# Start local dev server (port 8888)
npm run dev
# or
netlify dev
```

### Testing
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Security audit
npm run security:check
npm run security:fix
```

### Linting & Formatting
```bash
# Run linter
npm run lint

# Fix lint issues
npm run lint:fix

# Format code
npm run format
```

### Deployment
```bash
# Quick deployment (minimal checks)
./deploy-promoteros.sh

# Full automated deployment (with tests and security checks)
npm run deploy
# or
./scripts/deploy-automated.sh

# Manual deployment to staging
npm run deploy:staging

# Manual deployment to production
npm run deploy:production
```

## Architecture

### Project Structure
- **`/netlify/functions/`**: Serverless API endpoints
  - `artist-analyzer.js`: Artist analysis and scoring
  - `booking-engine.js`: Booking recommendations engine
  - `health.js`: Health check endpoint (public, no auth)
  
- **`/src/middleware/`**: Security middleware
  - `auth.js`: JWT authentication
  - `validation.js`: Input validation
  - `rateLimiter.js`: Rate limiting
  
- **`/tests/`**: Test suites
  - Unit tests for each function
  - Integration tests
  - Security tests
  - Performance tests

### API Routes
All API endpoints are available at `/.netlify/functions/[function-name]` and are also accessible via `/api/[function-name]` through redirect rules.

### Security Configuration
- Authentication via JWT tokens from AWS Secrets Manager
- CORS configured for `https://promoteros.candlefish.ai`
- Rate limiting on all API endpoints
- Input validation on all requests
- Security headers configured in `netlify.toml`

## Environment & Secrets

### AWS Secrets Manager
Primary secret: `promoteros/production/config`

Access secrets in code:
```javascript
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager({ region: 'us-east-1' });
const secret = await secretsManager.getSecretValue({ SecretId: 'promoteros/production/config' }).promise();
```

### Local Development
Use `.env` file (never commit) or `.env.secure` for non-sensitive config.

## Testing Approach

### Test Configuration
- Framework: Jest
- Timeout: 30s per test
- Coverage goal: 80%
- Custom matchers available in `tests/setup.js`:
  - `toBeWithinRange(min, max)`
  - `toHaveValidTimestamp()`
  - `toMatchApiResponseSchema()`
  - `toHaveValidBookingScore()`

### Running Single Tests
```bash
# Run specific test file
npx jest tests/artist-analyzer.test.js

# Run tests matching pattern
npx jest --testNamePattern="should analyze artist"

# Debug mode
NODE_ENV=test VERBOSE_TESTS=true npm test
```

## Deployment Process

The automated deployment script (`scripts/deploy-automated.sh`) performs:
1. Pre-deployment checks (git status, branch)
2. Dependency installation
3. Security middleware verification
4. Test suite execution
5. Function bundling with esbuild
6. Netlify deployment
7. Post-deployment verification
8. Report generation

For quick deployments without full checks, use `./deploy-promoteros.sh`.

## E2E Testing

Playwright configuration supports:
- Multiple browsers (Chrome, Firefox, Safari, Edge)
- Mobile viewports
- Automatic screenshots on failure
- Video recording on failure
- HTML/JSON/JUnit reports

Run E2E tests:
```bash
npx playwright test
npx playwright test --project=chromium
npx playwright show-report
```

## Important Notes

- **Independent Project**: PromoterOS is completely separate from other projects
- **No Cross-References**: Do not reference Tyler Setup or other project infrastructure
- **DNS Provider**: Porkbun (credentials in AWS Secrets: `candlefish/porkbun-api-credentials`)
- **Bundle Functions**: Production functions are bundled with esbuild for performance
- **CORS Policy**: Strictly configured for production domain only
