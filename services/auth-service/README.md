# Candlefish Authentication Service

Production-ready authentication microservice for the Candlefish AI platform, built with Node.js, TypeScript, Express.js, PostgreSQL, and Redis.

## 🌟 Features

- **JWT Authentication** - Secure access and refresh token system
- **Multi-tenant Support** - Organization-based user management
- **Production Security** - Rate limiting, input validation, CORS, security headers
- **Password Security** - Bcrypt hashing with strength validation
- **Session Management** - Redis-based session storage with TTL
- **Account Security** - Account locking, failed login attempt tracking
- **Audit Logging** - Comprehensive activity logging
- **Health Monitoring** - Built-in health checks for Kubernetes/Docker
- **Type Safety** - Full TypeScript implementation with strict mode
- **Comprehensive Testing** - Jest test suite with coverage reports

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │      Redis      │    │   PostgreSQL    │
│   (Fly.io)      │    │   (Sessions)    │    │   (Primary DB)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
┌─────────────────────────────────────────────────────────────────┐
│                 Authentication Service                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Controllers │  │ Middleware  │  │  Services   │            │
│  │ - Auth      │  │ - Rate Limit│  │ - Auth      │            │
│  │ - Health    │  │ - Validation│  │ - JWT       │            │
│  └─────────────┘  │ - Security  │  │ - Crypto    │            │
│                   └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Docker (optional)

### Environment Setup

1. Copy environment template:
```bash
cp .env.example .env
```

2. Configure your environment variables:
```env
DATABASE_URL="postgresql://candlefish:password@candlefish-postgres.internal:5432/candlefish_collaboration"
REDIS_URL="redis://candlefish-redis.internal:6379"
JWT_SECRET="your-super-secure-jwt-secret-256-bits"
SESSION_SECRET="your-session-secret"
```

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Generate Prisma client:
```bash
npm run db:generate
```

3. Run database migrations:
```bash
npm run db:migrate
```

4. Start development server:
```bash
npm run dev
```

The service will be available at `http://localhost:3000`

### Docker Deployment

1. Build the image:
```bash
docker build -t candlefish-auth .
```

2. Run the container:
```bash
docker run -d \
  --name candlefish-auth \
  -p 3000:3000 \
  --env-file .env \
  candlefish-auth
```

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecureP@ssw0rd123",
  "firstName": "John",
  "lastName": "Doe",
  "organizationName": "Acme Corp",
  "organizationSlug": "acme-corp"
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecureP@ssw0rd123",
  "rememberMe": false
}
```

#### Refresh Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

#### Get Profile
```http
GET /api/v1/auth/profile
Authorization: Bearer your-access-token
```

#### Verify Token (Service-to-Service)
```http
POST /api/v1/auth/verify
Authorization: Bearer access-token-to-verify
```

### Health Check Endpoints

#### Basic Health Check
```http
GET /api/v1/health
```

#### Detailed Health Check
```http
GET /api/v1/health/detailed
```

#### Kubernetes Probes
```http
GET /api/v1/health/ready   # Readiness probe
GET /api/v1/health/live    # Liveness probe
```

## 🔐 Security Features

### Password Requirements
- Minimum 8 characters, maximum 128
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- No repeating characters (3+ consecutive)

### Rate Limiting
- **Global**: 1000 requests per 15 minutes per IP
- **Authentication**: 10 attempts per 15 minutes per IP+email
- **Registration**: 3 registrations per hour per IP
- **Password Reset**: 5 attempts per hour per IP+email
- **API**: 500 requests per 15 minutes for authenticated users

### Account Security
- Account locking after 5 failed login attempts
- 15-minute lockout period
- Password reset tokens with expiration
- JWT tokens with short lifespan (15 minutes access, 7 days refresh)

### Security Headers
- HSTS with preload
- Content Security Policy
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

## 🛠️ Development

### Scripts

```bash
# Development
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema changes to database
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Prisma Studio

# Testing
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report

# Code Quality
npm run lint         # Lint code
npm run lint:fix     # Fix linting errors
npm run format       # Format code with Prettier
npm run type-check   # TypeScript type checking
```

### Project Structure

```
src/
├── config/          # Configuration files
│   ├── database.ts  # Prisma database config
│   ├── redis.ts     # Redis connection config
│   └── index.ts     # Main configuration
├── controllers/     # Route handlers
│   ├── auth.controller.ts
│   └── health.controller.ts
├── middleware/      # Express middleware
│   ├── auth.middleware.ts
│   ├── rate-limit.middleware.ts
│   ├── security.middleware.ts
│   ├── validation.middleware.ts
│   └── error.middleware.ts
├── services/        # Business logic
│   └── auth.service.ts
├── routes/          # Route definitions
│   ├── auth.routes.ts
│   ├── health.routes.ts
│   └── index.ts
├── types/           # TypeScript type definitions
│   └── index.ts
├── utils/           # Utility functions
│   ├── crypto.ts    # Encryption and hashing
│   └── logger.ts    # Winston logger setup
├── __tests__/       # Test files
│   ├── setup.ts
│   └── auth.service.test.ts
└── server.ts        # Main application entry point
```

## 🚢 Deployment

### Fly.io Deployment

1. Install Fly CLI:
```bash
curl -L https://fly.io/install.sh | sh
```

2. Login to Fly.io:
```bash
flyctl auth login
```

3. Deploy the application:
```bash
flyctl deploy
```

### Environment Variables for Production

Set these secrets in your deployment environment:

```bash
# Required
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."
JWT_SECRET="256-bit-secret-key"
SESSION_SECRET="session-secret-key"

# Optional
BCRYPT_ROUNDS="12"
MAX_LOGIN_ATTEMPTS="5"
ACCOUNT_LOCK_TIME="15m"
RATE_LIMIT_WINDOW_MS="900000"
RATE_LIMIT_MAX_REQUESTS="100"
```

### Health Checks

The service exposes several health check endpoints for monitoring:

- `/ping` - Simple pong response for load balancers
- `/api/v1/health` - Basic health status
- `/api/v1/health/detailed` - Comprehensive health check with dependencies
- `/api/v1/health/ready` - Kubernetes readiness probe
- `/api/v1/health/live` - Kubernetes liveness probe

## 🧪 Testing

Run the test suite:

```bash
npm test
```

Run with coverage:

```bash
npm run test:coverage
```

### Test Categories

- **Unit Tests**: Service and utility function tests
- **Integration Tests**: Database and Redis integration tests
- **API Tests**: HTTP endpoint tests
- **Security Tests**: Authentication and authorization tests

## 📊 Monitoring

### Metrics

The service exposes metrics on `/metrics` for Prometheus scraping:

- HTTP request duration and count
- Authentication success/failure rates
- Database connection health
- Redis connection health
- Memory and CPU usage

### Logs

Structured logging with Winston:

- Request/response logging
- Authentication events
- Error tracking
- Security events
- Performance metrics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make changes and add tests
4. Run tests and linting: `npm test && npm run lint`
5. Commit changes: `git commit -am 'Add new feature'`
6. Push to the branch: `git push origin feature/new-feature`
7. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please contact the Candlefish AI development team or create an issue in the repository.
