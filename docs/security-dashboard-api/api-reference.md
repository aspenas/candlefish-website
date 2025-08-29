# Candlefish Security Dashboard API Reference

## Authentication

### Login
- **Endpoint**: `POST /auth/login`
- **Description**: Authenticate and receive JWT token
- **Request Body**:
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Response**:
  ```json
  {
    "token": "JWT_TOKEN",
    "user": {
      "id": "string",
      "email": "string",
      "role": "admin|guest"
    }
  }
  ```

## Dashboard Endpoints

### Dashboard Overview
- **Endpoint**: `GET /api/dashboard/overview`
- **Description**: Retrieve high-level security dashboard metrics
- **Response**:
  ```json
  {
    "totalIncidents": 42,
    "activeAlerts": 5,
    "complianceScore": 94.5
  }
  ```

## Incidents Management

### List Incidents
- **Endpoint**: `GET /api/incidents`
- **Query Parameters**:
  - `status`: Filter by incident status (open, in_progress, resolved, closed)
  - `severity`: Filter by incident severity (low, medium, high, critical)
- **Response**: Array of incident objects

### Create Incident
- **Endpoint**: `POST /api/incidents`
- **Request Body**:
  ```json
  {
    "type": "string",
    "severity": "low|medium|high|critical",
    "status": "open|in_progress|resolved|closed"
  }
  ```

## Alerts Management

### List Alerts
- **Endpoint**: `GET /api/alerts`
- **Query Parameters**:
  - `acknowledged`: Boolean to filter by alert acknowledgement
  - `severity`: Filter by alert severity (info, warning, critical)
- **Response**: Array of alert objects

### Acknowledge Alert
- **Endpoint**: `PUT /api/alerts/:id/acknowledge`
- **Description**: Mark a specific alert as acknowledged

## Rate Limits
- **Authentication**: 100 requests/minute
- **Dashboard Endpoints**: 50 requests/minute
- **Incident/Alert Management**: 25 requests/minute

## Error Codes
- `401 Unauthorized`: Invalid or missing authentication
- `403 Forbidden`: Insufficient privileges
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Unexpected server error