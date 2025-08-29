# Security Dashboard WebSocket Events

## Connection & Authentication
- **Endpoint**: `wss://api.candlefish.ai/ws`
- **Authentication**: JWT token required in connection handshake

## Event Types

### 1. New Security Alert
```json
{
  "event": "security.alert.new",
  "data": {
    "id": "alert_123",
    "type": "unauthorized_access",
    "severity": "critical",
    "timestamp": "2025-08-29T14:30:00Z"
  }
}
```

### 2. Incident Update
```json
{
  "event": "security.incident.update",
  "data": {
    "id": "incident_456",
    "status": "in_progress",
    "severity": "high",
    "updatedAt": "2025-08-29T14:35:00Z"
  }
}
```

### 3. Threat Detection
```json
{
  "event": "security.threat.detected",
  "data": {
    "type": "network_anomaly",
    "sourceIP": "203.0.113.42",
    "riskScore": 85,
    "detectedAt": "2025-08-29T14:40:00Z"
  }
}
```

## Client Implementation Example (JavaScript)
```javascript
const socket = new WebSocket('wss://api.candlefish.ai/ws', {
  headers: {
    Authorization: `Bearer ${jwtToken}`
  }
});

socket.onmessage = (event) => {
  const { event: eventType, data } = JSON.parse(event.data);
  
  switch (eventType) {
    case 'security.alert.new':
      handleNewAlert(data);
      break;
    case 'security.incident.update':
      handleIncidentUpdate(data);
      break;
    case 'security.threat.detected':
      handleThreatDetection(data);
      break;
  }
};