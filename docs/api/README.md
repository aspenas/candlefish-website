# Candlefish.ai Employee Setup Platform API Documentation

## Overview
This document describes the API for the Candlefish.ai Employee Setup Platform, designed for managing employee and contractor onboarding, authentication, and configuration.

## Authentication
All endpoints except `/auth/login` require a valid JWT token. Obtain a token by sending credentials to the login endpoint.

### Curl Example for Authentication
```bash
curl -X POST https://api.candlefish.ai/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@candlefish.ai",
    "password": "SecurePassword123!"
  }'
```

## Rate Limits
- Global: 100 requests/minute, 1000 requests/hour
- Login: 10 requests/minute, 50 requests/hour
- Secrets Access: 5 requests/minute, 20 requests/hour
- Audit Logs: 2 requests/minute, 10 requests/hour

## Postman Collection
A Postman collection is available for testing: [Link to Postman Collection]

## OpenAPI Specification
The full OpenAPI 3.0 specification is available in `openapi-specification.yaml`.

## Tools for Validation
- Swagger Editor: https://editor.swagger.io/
- Spectral CLI for linting: `npm install -g @stoplight/spectral`

## Support
For API support, contact devops@candlefish.ai