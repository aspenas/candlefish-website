# Salesforce CRM Integration for Paintbox

## Overview

This document provides comprehensive information about the Salesforce CRM integration in the Paintbox application. The integration provides full CRUD operations for Contacts, Accounts, Opportunities, and custom PaintboxEstimate objects with real-time synchronization, caching, and robust error handling.

## Features

### Core Functionality
- ✅ **Full CRUD Operations** - Create, Read, Update, Delete for all Salesforce objects
- ✅ **OAuth Authentication** - Secure authentication with automatic token refresh
- ✅ **Real-time Webhooks** - Instant updates from Salesforce changes
- ✅ **Batch Synchronization** - Automated sync every 5 minutes
- ✅ **Redis Caching** - High-performance caching layer
- ✅ **Conflict Resolution** - Intelligent data conflict handling
- ✅ **Comprehensive Testing** - Unit, integration, and API tests
- ✅ **Error Handling** - Retry mechanisms and graceful degradation

### Supported Objects

1. **Contacts** (`Contact`)
   - Standard Salesforce Contact fields
   - Custom search and filtering
   - Account relationship mapping

2. **Accounts** (`Account`)
   - Standard Salesforce Account fields
   - Billing and shipping address support
   - Hierarchical account relationships

3. **Opportunities** (`Opportunity`)
   - Sales pipeline management
   - Stage and probability tracking
   - Account and contact relationships

4. **PaintboxEstimates** (`PaintboxEstimate__c`)
   - Custom Salesforce object for estimates
   - Excel calculation data storage
   - Status workflow management

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Routes    │    │  Salesforce     │
│                 │    │                 │    │   Service       │
│ - React Forms   │───▶│ /api/v1/        │───▶│                 │
│ - Real-time     │    │ salesforce/     │    │ - OAuth Auth    │
│   Updates       │    │                 │    │ - CRUD Ops      │
└─────────────────┘    └─────────────────┘    │ - Caching       │
         ▲                       ▲             │ - Sync Logic    │
         │                       │             └─────────────────┘
         │              ┌─────────────────┐             │
         │              │   Webhooks      │             │
         └──────────────│                 │◀────────────┘
                        │ /api/webhooks/  │
                        │ salesforce      │    ┌─────────────────┐
                        └─────────────────┘    │   Salesforce    │
                                 ▲             │      CRM        │
                                 │             │                 │
                                 └─────────────│ - Contacts      │
                                               │ - Accounts      │
                                               │ - Opportunities │
                                               │ - Estimates     │
                                               └─────────────────┘
```

## Setup and Configuration

### 1. Salesforce Configuration

#### Create Connected App
1. In Salesforce Setup, go to App Manager
2. Create a New Connected App with these settings:
   - **Connected App Name**: Paintbox Integration
   - **API Name**: Paintbox_Integration
   - **Contact Email**: Your email
   - **Enable OAuth Settings**: ✓
   - **Callback URL**: `https://your-domain.com/auth/salesforce/callback`
   - **OAuth Scopes**:
     - Full access (full)
     - Perform requests on your behalf at any time (refresh_token, offline_access)

#### Create Custom Object (PaintboxEstimate__c)
```sql
-- Custom Fields for PaintboxEstimate__c
Contact__c (Lookup to Contact)
Account__c (Lookup to Account) 
Opportunity__c (Lookup to Opportunity)
Total_Amount__c (Currency)
Exterior_Amount__c (Currency)
Interior_Amount__c (Currency)
Materials_Cost__c (Currency)
Labor_Cost__c (Currency)
Status__c (Picklist: Draft, Pending, Approved, Rejected, Completed)
Estimate_Date__c (Date)
Valid_Until__c (Date)
Notes__c (Long Text Area)
Excel_Data__c (Long Text Area)
Square_Footage__c (Number)
Rooms_Count__c (Number)
Paint_Quality__c (Picklist: Good, Better, Best)
```

#### Setup Webhooks (Optional)
1. Install Salesforce Outbound Messages or Platform Events
2. Configure webhook endpoints pointing to: `https://your-domain.com/api/webhooks/salesforce`

### 2. AWS Secrets Manager Configuration

Store the following secrets in AWS Secrets Manager under the key `paintbox/secrets`:

```json
{
  "salesforce": {
    "clientId": "your_connected_app_client_id",
    "clientSecret": "your_connected_app_client_secret", 
    "username": "your_salesforce_username",
    "password": "your_salesforce_password",
    "securityToken": "your_salesforce_security_token",
    "instanceUrl": "https://your-instance.salesforce.com",
    "apiVersion": "v62.0",
    "webhookSecret": "optional_webhook_secret_for_verification"
  }
}
```

### 3. Environment Variables

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_SECRETS_MANAGER_SECRET_NAME=paintbox/secrets

# Redis Configuration  
REDIS_URL=redis://localhost:6379

# Development Mode (skips AWS Secrets Manager)
SKIP_AWS_SECRETS=true
```

## API Reference

### Authentication
All API endpoints require proper authentication. The service handles OAuth token management automatically.

### Base URL
```
/api/v1/salesforce/
```

### Contacts

#### Search Contacts
```http
GET /api/v1/salesforce/contacts?query={search_term}&limit={max_results}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "Id": "0034000001abcdef",
      "Name": "John Doe",
      "FirstName": "John",
      "LastName": "Doe", 
      "Email": "john@example.com",
      "Phone": "555-1234",
      "AccountId": "0014000001abcdef"
    }
  ],
  "count": 1
}
```

#### Create Contact
```http
POST /api/v1/salesforce/contacts
Content-Type: application/json

{
  "FirstName": "Jane",
  "LastName": "Smith",
  "Email": "jane@example.com",
  "Phone": "555-5678"
}
```

#### Get Contact by ID
```http
GET /api/v1/salesforce/contacts/{contact_id}
```

#### Update Contact
```http
PUT /api/v1/salesforce/contacts/{contact_id}
Content-Type: application/json

{
  "Phone": "555-9999",
  "Title": "Manager"
}
```

#### Delete Contact
```http
DELETE /api/v1/salesforce/contacts/{contact_id}
```

#### Bulk Update Contacts
```http
PUT /api/v1/salesforce/contacts
Content-Type: application/json

{
  "updates": [
    {
      "id": "contact_id_1",
      "data": { "Phone": "555-1111" }
    },
    {
      "id": "contact_id_2", 
      "data": { "Title": "Director" }
    }
  ]
}
```

### Accounts

Similar endpoints are available for Accounts:
- `GET /api/v1/salesforce/accounts?query={search_term}`
- `POST /api/v1/salesforce/accounts`
- `GET /api/v1/salesforce/accounts/{account_id}`
- `PUT /api/v1/salesforce/accounts/{account_id}`
- `DELETE /api/v1/salesforce/accounts/{account_id}`

### Opportunities

Opportunity endpoints:
- `GET /api/v1/salesforce/opportunities?lastModified={iso_date}`
- `POST /api/v1/salesforce/opportunities`
- `GET /api/v1/salesforce/opportunities/{opportunity_id}`
- `PUT /api/v1/salesforce/opportunities/{opportunity_id}`
- `DELETE /api/v1/salesforce/opportunities/{opportunity_id}`

### PaintboxEstimates

Custom estimate endpoints:
- `GET /api/v1/salesforce/estimates?lastModified={iso_date}`
- `POST /api/v1/salesforce/estimates`
- `GET /api/v1/salesforce/estimates/{estimate_id}`
- `PUT /api/v1/salesforce/estimates/{estimate_id}`
- `DELETE /api/v1/salesforce/estimates/{estimate_id}`

### Sync Operations

#### Trigger Manual Sync
```http
POST /api/v1/salesforce/sync
```

**Response:**
```json
{
  "success": true,
  "data": {
    "processed": 150,
    "errors": [],
    "conflicts": []
  }
}
```

#### Get Sync Status
```http
GET /api/v1/salesforce/sync
```

**Response:**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "lastSync": "2023-07-01T10:30:00.000Z",
    "syncInterval": "5 minutes"
  }
}
```

### Webhooks

#### Salesforce Webhook Endpoint
```http
POST /api/webhooks/salesforce
X-Salesforce-Signature: sha256={signature}
Content-Type: application/json

{
  "sobject": {
    "Id": "0034000001abcdef",
    "attributes": {
      "type": "Contact",
      "url": "/services/data/v62.0/sobjects/Contact/0034000001abcdef"
    },
    "Name": "John Doe"
  },
  "event": {
    "type": "created",
    "createdDate": "2023-07-01T10:30:00.000Z",
    "replayId": 12345
  }
}
```

#### Get Recent Webhook Events
```http
GET /api/webhooks/salesforce
```

## Testing

### Running Tests

```bash
# Run unit tests
npm test

# Run integration tests  
npm run test:integration

# Run API tests
npm run test:api

# Run comprehensive Salesforce integration tests
npm run test:salesforce:integration

# Run all tests
npm run test:all
```

### Test Coverage

The integration includes comprehensive testing:

- **Unit Tests** (`__tests__/integration/salesforce-integration.test.ts`)
  - Service initialization
  - OAuth token management
  - CRUD operations
  - Cache functionality
  - Error handling

- **API Tests** (`__tests__/api/salesforce-api.test.ts`)
  - Route validation
  - Request/response handling
  - Error responses
  - Bulk operations

- **Webhook Tests** (`__tests__/api/salesforce-webhook.test.ts`)
  - Signature verification
  - Event processing
  - Cache invalidation
  - Audit trail

- **Integration Tests** (`scripts/test-salesforce-integration.ts`)
  - End-to-end functionality
  - Performance testing
  - Real Salesforce connectivity

### Manual Testing

Use the comprehensive test script:

```bash
npm run test:salesforce:integration
```

This will:
- Test connection and authentication
- Perform CRUD operations on all objects
- Verify caching functionality  
- Test batch sync operations
- Validate error handling
- Generate a detailed report

## Caching Strategy

### Cache Keys
- `salesforce:tokens` - OAuth tokens
- `search:contacts:{query}:{limit}` - Contact search results
- `search:accounts:{query}:{limit}` - Account search results  
- `contact:{id}` - Individual contact data
- `account:{id}` - Individual account data
- `opportunity:{id}` - Individual opportunity data
- `estimate:{id}` - Individual estimate data
- `salesforce:lastSync` - Last successful sync timestamp
- `webhook:recent` - Recent webhook events list
- `webhook:{type}:{id}` - Individual webhook events

### Cache TTL
- Search results: 5 minutes
- Individual records: 5 minutes
- OAuth tokens: Based on expiration
- Sync timestamps: 24 hours
- Webhook events: 24 hours

### Cache Invalidation
- Automatic invalidation on create/update/delete operations
- Webhook-triggered invalidation for real-time updates
- Manual invalidation via sync operations

## Error Handling

### Retry Logic
- Automatic retries for transient failures (network, rate limits)
- Exponential backoff for repeated failures
- Maximum of 3 retry attempts per operation

### Token Refresh
- Automatic OAuth token refresh on expiration
- Fallback to username/password authentication
- Graceful handling of refresh token expiration

### Conflict Resolution
The service provides conflict resolution strategies:
- **Local wins** - Use local data
- **Remote wins** - Use Salesforce data  
- **Merge** - Combine both datasets
- **Manual** - Flag for user resolution

Example:
```typescript
await salesforceService.resolveConflict(conflict, 'merge');
```

### Error Types
- `INVALID_SESSION_ID` - Token expired (handled automatically)
- `REQUIRED_FIELD_MISSING` - Validation errors
- `DUPLICATE_VALUE` - Unique constraint violations
- `INSUFFICIENT_ACCESS` - Permission errors
- `REQUEST_LIMIT_EXCEEDED` - Rate limiting

## Performance Optimization

### Batch Operations
- Bulk updates reduce API calls
- Batch sync processes multiple records efficiently
- Configurable batch sizes (default: 200)

### Caching
- Redis-based caching reduces API calls
- Smart cache invalidation preserves data consistency
- Configurable TTL values

### Connection Pooling
- Persistent connections reduce authentication overhead
- Connection reuse across requests
- Automatic connection recovery

## Monitoring and Logging

### Logging
All operations are logged using the application's logging system:

```typescript
import { logger } from '@/lib/logging/simple-logger';

// Logs include context and structured data
logger.info('Contact created', { 
  contactId: 'abc123', 
  name: 'John Doe' 
});
```

### Metrics
Key metrics tracked:
- API response times
- Cache hit/miss ratios
- Sync success rates
- Error frequencies
- Token refresh events

### Health Checks
```http
GET /api/v1/salesforce/sync
```
Returns connection status and last sync information.

## Security Considerations

### Authentication
- OAuth 2.0 with refresh tokens
- Secure token storage in AWS Secrets Manager
- Automatic token rotation

### Webhook Security  
- HMAC signature verification
- Request origin validation
- Replay attack prevention

### Data Privacy
- Field-level security respect
- No sensitive data in logs
- Encrypted credential storage

### Network Security
- HTTPS-only connections
- Certificate validation
- Request timeout limits

## Troubleshooting

### Common Issues

#### 1. Connection Failures
**Symptoms:** `Failed to initialize Salesforce connection`

**Solutions:**
- Verify credentials in AWS Secrets Manager
- Check Salesforce instance URL
- Validate Connected App configuration
- Review security token

#### 2. Token Refresh Issues
**Symptoms:** Frequent re-authentication

**Solutions:**
- Verify refresh token is being stored
- Check OAuth scopes include `refresh_token`
- Validate Connected App callback URL

#### 3. Cache Issues
**Symptoms:** Stale data or performance problems

**Solutions:**
- Verify Redis connection
- Check cache TTL settings
- Monitor cache hit rates
- Clear cache manually if needed

#### 4. Webhook Problems  
**Symptoms:** Missing real-time updates

**Solutions:**
- Verify webhook endpoint accessibility
- Check signature verification
- Validate webhook secret configuration
- Review Salesforce outbound message setup

### Debug Mode

Enable debug logging:
```bash
DEBUG=salesforce* npm run dev
```

### Testing Connection

```bash
# Test basic connectivity
npm run test:salesforce:integration

# Test specific operations
node -e "
const { salesforceService } = require('./lib/services/salesforce');
salesforceService.testConnection().then(console.log);
"
```

## Development

### Adding New Objects

1. **Define TypeScript interface:**
```typescript
export interface CustomObject {
  Id: string;
  Name: string;
  Custom_Field__c?: string;
  // ... other fields
}
```

2. **Add CRUD methods to service:**
```typescript
async createCustomObject(data: Partial<CustomObject>): Promise<string> {
  // Implementation
}
```

3. **Create API routes:**
```typescript
// app/api/v1/salesforce/customobjects/route.ts
export async function POST(request: NextRequest) {
  // Handle creation
}
```

4. **Add webhook handling:**
```typescript
async function handleCustomObjectWebhook(event: WebhookEvent) {
  // Handle webhook events
}
```

5. **Update tests:**
```typescript
describe('Custom Object Operations', () => {
  // Add test cases
});
```

### Contributing

1. Follow existing code patterns
2. Add comprehensive tests
3. Update documentation
4. Ensure error handling
5. Add logging and monitoring

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review logs for error details
3. Test connectivity with the test script
4. Verify configuration settings

## Changelog

### v1.0.0 (Current)
- ✅ Initial implementation
- ✅ Full CRUD operations
- ✅ OAuth authentication  
- ✅ Webhook support
- ✅ Caching layer
- ✅ Batch synchronization
- ✅ Comprehensive testing
- ✅ Error handling and retries
