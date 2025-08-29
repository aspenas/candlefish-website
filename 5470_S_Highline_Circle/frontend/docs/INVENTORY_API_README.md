# Highline Inventory Management API Documentation

## Overview

The Highline Inventory Management API provides a comprehensive solution for tracking and managing inventory across multiple locations. This API supports full CRUD operations, authentication, batch processing, and real-time analytics.

## Authentication

### JWT Authentication Flow

1. **Register**: 
   ```bash
   POST /auth/register
   {
     "email": "user@highline.work",
     "password": "securePassword123",
     "name": "John Doe"
   }
   ```

2. **Login**: 
   ```bash
   POST /auth/login
   {
     "email": "user@highline.work",
     "password": "securePassword123"
   }
   ```
   Returns an HttpOnly JWT cookie for subsequent requests.

3. **Token Refresh**:
   ```bash
   POST /auth/refresh
   ```
   Automatically renews the authentication token.

## SDK Generation

### Go SDK (Backend Language)
```bash
# Generate Go client
swagger-codegen generate \
  -i inventory-api-spec.yaml \
  -l go \
  -o ./go-client
```

### TypeScript/React SDK
```bash
# Generate TypeScript client
openapi-generator generate \
  -i inventory-api-spec.yaml \
  -g typescript-axios \
  -o ./typescript-client
```

## Postman Collection

[![Run in Postman](https://run.pstmn.io/button.svg)](https://www.postman.com/highline-inventory)

Download the Postman collection to quickly test and explore the API endpoints.

## WebSocket Real-Time Updates

Connect to real-time inventory updates:

```javascript
const socket = new WebSocket('wss://5470-inventory.fly.dev/ws');

socket.onmessage = (event) => {
  const update = JSON.parse(event.data);
  // Handle inventory updates in real-time
};
```

Supported WebSocket Events:
- `item_created`
- `item_updated`
- `item_deleted`
- `inventory_changed`

## Rate Limiting

- **Global Limit**: 100 requests/minute
- **Burst Limit**: 200 requests/5 minutes
- Exceeding limits returns a `429 Too Many Requests` error

## Error Handling

Standard error response structure:
```json
{
  "code": "RESOURCE_NOT_FOUND",
  "message": "The requested item could not be found.",
  "details": [
    "Verify the item ID is correct",
    "Ensure you have appropriate permissions"
  ]
}
```

## Security Considerations

- HttpOnly cookies prevent XSS attacks
- CSRF protection enabled
- JWT tokens expire after 1 hour
- Role-based access control (admin, editor, viewer)

## Batch Operations

Efficiently create, update, or upsert multiple items:

```bash
POST /batch/items
{
  "mode": "upsert",
  "items": [
    {"id": "123", "name": "Office Chair", "quantity": 5},
    {"name": "Desk Lamp", "quantity": 10}
  ]
}
```

## File Upload

Upload item photos with multipart/form-data:

```bash
POST /photos/upload
Content-Type: multipart/form-data

[form-data with itemId and photos]
```

## Analytics Endpoint

Get comprehensive inventory insights:

```bash
GET /analytics/summary
```

Returns total items, total value, and category-wise summaries.

## Webhook Integrations

Configure webhooks to receive real-time inventory notifications:
1. Navigate to Account Settings
2. Create a new Webhook Endpoint
3. Select desired events (item creation, updates, etc.)

## Support & Documentation

- **API Documentation**: https://inventory.highline.work/docs
- **Support Email**: support@highline.work
- **Status Page**: https://status.highline.work

## Changelog

### v1.0.0 (Current)
- Initial API release
- JWT authentication
- Full CRUD operations
- Batch processing
- Real-time WebSocket updates

## License

Commercial license. Contact sales@highline.work for details.