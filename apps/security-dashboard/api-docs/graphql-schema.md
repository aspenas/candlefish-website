# Security Dashboard GraphQL Schema Documentation

## Overview

This document provides a comprehensive guide to the Security Dashboard GraphQL API, detailing the available types, queries, mutations, and subscriptions.

## Authentication and Authorization

### Authentication Flow
1. Use the `login` mutation to obtain JWT tokens
2. Include the token in the `Authorization` header for subsequent requests
3. MFA is supported and may require additional verification

### User Roles
- `VIEWER`: Read-only access
- `ANALYST`: Can investigate and respond to alerts
- `INCIDENT_RESPONDER`: Can take actions on incidents
- `ADMIN`: Full organizational management
- `SUPER_ADMIN`: Platform-wide administrative access

## Core Entities

### User
Represents an authenticated user in the system.

**Fields**:
- `id`: Unique identifier
- `email`: User's email address
- `firstName`: First name
- `lastName`: Last name
- `role`: User's role in the system
- `permissions`: List of specific permissions
- `isActive`: Account status
- `lastLoginAt`: Timestamp of last login
- `organizationId`: Associated organization

### Asset
Represents a monitored asset in the security ecosystem.

**Fields**:
- `id`: Unique identifier
- `name`: Asset name
- `assetType`: Type of asset (e.g., WEB_APPLICATION, SERVER)
- `securityLevel`: Current security rating
- `riskScore`: Numerical risk assessment
- `platform`: Hosting platform
- `healthStatus`: Current operational status

### Alert
Represents a security alert or potential threat.

**Fields**:
- `id`: Unique identifier
- `title`: Alert title
- `description`: Detailed alert information
- `severity`: Alert severity level
- `status`: Current alert status
- `firstTriggered`: Initial detection timestamp
- `lastTriggered`: Most recent occurrence
- `assignedTo`: User responsible for investigation

### Vulnerability
Represents a detected security vulnerability.

**Fields**:
- `id`: Unique identifier
- `cveId`: CVE identifier (if applicable)
- `title`: Vulnerability title
- `severity`: Vulnerability severity
- `status`: Current vulnerability status
- `discoveredAt`: Detection timestamp
- `remediation`: Suggested fix details

## Queries

### Authentication Queries
- `me`: Retrieve current user's information
- `users`: List users (admin-only)
- `organization`: Retrieve organization details

### Security Queries
- `assets`: List and filter assets
- `alerts`: List and filter security alerts
- `vulnerabilities`: List and filter vulnerabilities
- `securityEvents`: Retrieve detailed security events

## Mutations

### Authentication Mutations
- `login`: User authentication
- `logout`: End current session
- `changePassword`: Update user password
- `setupMfa`: Configure multi-factor authentication

### Management Mutations
- `createUser`: Add new user (admin)
- `updateUser`: Modify user details
- `createAsset`: Add new monitored asset
- `updateAsset`: Modify asset details
- `acknowledgeAlert`: Update alert status
- `createVulnerabilityException`: Mark vulnerability as acceptable risk

## Subscriptions

### Real-time Event Streams
- `authEvents`: Authentication-related events
- `alertCreated`: New alert notifications
- `vulnerabilityDetected`: New vulnerability alerts
- `securityEventStream`: Continuous security event monitoring

## Rate Limiting

- Default: 1000 requests per minute
- Per-endpoint variations may apply
- Exceeding limits results in temporary blocking

## Error Handling

Errors include:
- `UNAUTHORIZED`: Authentication failure
- `FORBIDDEN`: Insufficient permissions
- `RATE_LIMIT_EXCEEDED`: API request limit reached
- `NOT_FOUND`: Requested resource doesn't exist
- `VALIDATION_ERROR`: Input data incorrect

## Best Practices

1. Always use the latest access token
2. Implement proper error handling
3. Use pagination for large result sets
4. Leverage subscriptions for real-time monitoring
5. Rotate API keys periodically

## Example Queries

### Retrieve User Assets
```graphql
query {
  me {
    managedAssets {
      edges {
        node {
          id
          name
          securityLevel
          riskScore
        }
      }
    }
  }
}
```

### List High Severity Alerts
```graphql
query {
  alerts(severity: [HIGH, CRITICAL]) {
    edges {
      node {
        id
        title
        severity
        status
        firstTriggered
      }
    }
  }
}
```

## SDK and Client Libraries

Official client libraries are available for:
- TypeScript
- Python
- Go
- JavaScript/Node.js

Consult individual library documentation for specific usage instructions.