# ADR-001: Technology Stack Selection

## Status
Accepted

## Context
PromoterOS needs a modern, scalable tech stack that aligns with the Candlefish monorepo standards while enabling rapid MVP development and future growth.

## Decision

### Frontend: Next.js 14 with App Router
- **Rationale**: Server components for performance, built-in auth support, excellent DX
- **Alternative Considered**: Remix (less ecosystem support)

### API: tRPC with Express
- **Rationale**: Type-safe API calls, automatic client generation, minimal boilerplate
- **Alternative Considered**: GraphQL (overkill for MVP), REST (no type safety)

### Database: PostgreSQL with Prisma
- **Rationale**: Proven reliability, excellent tooling, type-safe ORM
- **Alternative Considered**: MongoDB (less suitable for relational data)

### Background Jobs: BullMQ with Redis
- **Rationale**: Battle-tested, great monitoring, supports complex workflows
- **Alternative Considered**: Temporal (too complex for MVP)

### Authentication: NextAuth (Auth.js)
- **Rationale**: Flexible providers, session management, multi-tenant ready
- **Alternative Considered**: Clerk (vendor lock-in), Supabase Auth (less control)

### Deployment: Fly.io
- **Rationale**: Fast deploys, built-in Postgres/Redis, excellent DX
- **Alternative Considered**: Vercel (expensive at scale), AWS ECS (complex for MVP)

## Consequences
- **Positive**: Rapid development, type safety throughout, excellent local DX
- **Negative**: Learning curve for tRPC if unfamiliar
- **Neutral**: Committed to TypeScript ecosystem
