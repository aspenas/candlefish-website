# ADR-002: Multi-Tenancy Architecture

## Status
Accepted

## Context
PromoterOS must support multiple organizations (venues) with isolated data and user access control.

## Decision

### Row-Level Security via Application Layer
- Every table includes `organizationId`
- All queries filtered by organization context
- Middleware enforces tenant isolation

### Organization Hierarchy
```
Organization (root tenant)
  ├── Venues (physical locations)
  ├── Users (via Membership)
  └── Events (scoped to venues)
```

### Role-Based Access Control (RBAC)
- **OWNER**: Full admin rights
- **MANAGER**: Manage events, users
- **STAFF**: Operate events, tasks
- **PROMOTER**: Limited view, submit requests

### Session Context
- Organization selected at login
- Stored in JWT claims
- Validated on every request

## Implementation
```typescript
// Every query includes org filter
const events = await prisma.event.findMany({
  where: {
    organizationId: ctx.session.organizationId,
    ...userFilters
  }
})
```

## Consequences
- **Positive**: Simple to implement, performant, flexible
- **Negative**: Must remember to filter every query
- **Mitigation**: Prisma middleware to auto-inject filters
