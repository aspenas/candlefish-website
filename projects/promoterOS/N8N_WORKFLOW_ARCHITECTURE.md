# N8N Workflow Automation Architecture for PromoterOS

## Overview

N8N serves as the orchestration layer for PromoterOS, handling automated data pipelines, scheduled tasks, alert systems, and integration workflows. This document defines the complete workflow architecture for production deployment.

## 1. Core Workflow Categories

### 1.1 Data Ingestion Workflows

#### Artist Discovery Pipeline
```yaml
Workflow: artist-discovery-pipeline
Trigger: Schedule (Every 6 hours)
Nodes:
  1. HTTP Request: Fetch trending artists from multiple sources
  2. Filter: Remove already tracked artists
  3. Split: Batch into groups of 10
  4. Loop: For each artist batch
     - TikTok Scraper webhook
     - Instagram Scraper webhook
     - Spotify API call
     - YouTube Data API call
  5. Merge: Combine all platform data
  6. PostgreSQL: Insert new artists
  7. Redis: Update cache
  8. Webhook: Notify Mission Control UI
```

#### Real-time Metrics Update
```yaml
Workflow: realtime-metrics-updater
Trigger: Webhook (from scraper services)
Nodes:
  1. Webhook: Receive scraping results
  2. Function: Validate and normalize data
  3. InfluxDB: Write time-series metrics
  4. PostgreSQL: Update latest metrics
  5. Redis: Update hot cache
  6. IF: Check for significant changes
     - True: Trigger alert workflow
     - False: Continue
  7. WebSocket: Broadcast to subscribers
  8. Respond: Return success status
```

### 1.2 Analytics & ML Workflows

#### Daily Analytics Aggregation
```yaml
Workflow: daily-analytics-aggregation
Trigger: Cron (Daily at 2 AM)
Nodes:
  1. PostgreSQL: Query raw metrics from past 24h
  2. Function: Calculate aggregations
     - Average engagement rates
     - Growth percentages
     - Viral scores
  3. HTTP Request: Call ML prediction endpoint
  4. PostgreSQL: Store predictions
  5. Function: Generate insights
  6. Split: By organization
  7. Loop: For each organization
     - Generate report
     - Send email digest
  8. Slack: Post summary to ops channel
```

#### Viral Detection Pipeline
```yaml
Workflow: viral-detection-pipeline
Trigger: Every 30 minutes
Nodes:
  1. PostgreSQL: Query recent metrics
  2. Function: Calculate viral indicators
     - Sudden follower spikes (>50% in 24h)
     - Engagement surges (>200% baseline)
     - Cross-platform momentum
  3. Filter: Artists exceeding thresholds
  4. HTTP Request: Deep analysis via ML service
  5. IF: Viral confirmed
     - True: 
       a. Send critical alert
       b. Trigger immediate scraping
       c. Create booking recommendation
       d. Notify all subscribers
     - False: Log for monitoring
  6. PostgreSQL: Update viral_events table
```

### 1.3 Notification & Alert Workflows

#### Smart Alert System
```yaml
Workflow: smart-alert-system
Trigger: Multiple (Webhook, Schedule, Manual)
Nodes:
  1. Switch: Alert type router
     - Case "viral": Viral alert flow
     - Case "booking": Booking opportunity flow
     - Case "risk": Risk alert flow
     - Case "system": System alert flow
  2. Function: Enrich alert with context
  3. PostgreSQL: Check user preferences
  4. Filter: Apply notification rules
     - Severity thresholds
     - Time windows
     - Frequency limits
  5. Split: By channel preference
     - Email: SendGrid node
     - SMS: Twilio node
     - Slack: Slack node
     - In-app: WebSocket broadcast
  6. PostgreSQL: Log notification sent
  7. Wait: Delayed follow-up (if needed)
```

#### Booking Opportunity Detector
```yaml
Workflow: booking-opportunity-detector
Trigger: Every 2 hours
Nodes:
  1. PostgreSQL: Query artist metrics + venue data
  2. Function: Calculate booking scores
  3. Filter: Score > 80
  4. HTTP Request: Check tour dates (Bandsintown API)
  5. Function: Find routing opportunities
  6. IF: Good match found
     - Generate detailed recommendation
     - Include financial projections
     - Add competitive analysis
  7. Email: Send to venue managers
  8. PostgreSQL: Track opportunity status
  9. Schedule: Follow-up in 48 hours
```

### 1.4 Report Generation Workflows

#### Weekly Executive Report
```yaml
Workflow: weekly-executive-report
Trigger: Cron (Mondays at 9 AM)
Nodes:
  1. PostgreSQL: Aggregate week's data
     - New artists tracked
     - Viral events detected
     - Booking recommendations made
     - Platform performance
  2. Function: Calculate KPIs
     - Success rate
     - ROI metrics
     - Prediction accuracy
  3. HTTP Request: Generate charts (QuickChart API)
  4. HTML: Build report template
  5. PDF: Convert to PDF
  6. Split: By recipient role
     - Executive: Summary version
     - Ops Team: Detailed version
     - Venue Managers: Venue-specific
  7. Email: Send reports
  8. Google Drive: Archive copy
```

#### Custom Report Builder
```yaml
Workflow: custom-report-builder
Trigger: Webhook (from UI)
Nodes:
  1. Webhook: Receive report parameters
     - Date range
     - Metrics selected
     - Artists/venues
     - Format preference
  2. PostgreSQL: Dynamic query builder
  3. Function: Process data
  4. Switch: Output format
     - Case "pdf": PDF generator
     - Case "excel": Excel builder
     - Case "json": API response
     - Case "csv": CSV formatter
  5. S3: Upload to temporary storage
  6. Email: Send download link
  7. Wait: 24 hours
  8. S3: Delete temporary file
```

### 1.5 Data Quality & Maintenance

#### Data Validation Pipeline
```yaml
Workflow: data-validation-pipeline
Trigger: Every 4 hours
Nodes:
  1. PostgreSQL: Query recent data
  2. Function: Run validation rules
     - Check for nulls
     - Verify ranges
     - Detect anomalies
     - Cross-reference platforms
  3. Filter: Find issues
  4. Switch: Issue severity
     - Critical: Immediate alert
     - Warning: Log and monitor
     - Info: Weekly digest
  5. IF: Auto-fixable
     - True: Apply corrections
     - False: Create manual task
  6. PostgreSQL: Update data_quality_log
  7. Grafana: Update dashboard
```

#### Database Maintenance
```yaml
Workflow: database-maintenance
Trigger: Cron (Daily at 3 AM)
Nodes:
  1. PostgreSQL: VACUUM ANALYZE
  2. PostgreSQL: Update statistics
  3. Function: Check table sizes
  4. IF: Size > threshold
     - Archive old data to S3
     - Truncate archived records
  5. Redis: Clear expired keys
  6. InfluxDB: Downsample old metrics
  7. Elasticsearch: Optimize indices
  8. Email: Maintenance report
```

## 2. Integration Workflows

### 2.1 Third-Party API Integrations

#### TikTok Research API Sync
```yaml
Workflow: tiktok-research-api-sync
Trigger: Every 6 hours
Nodes:
  1. PostgreSQL: Get artists to update
  2. OAuth2: Refresh TikTok token
  3. Loop: Batch API calls
     - HTTP Request: Get creator info
     - HTTP Request: Get video analytics
     - Rate Limiter: Respect API limits
  4. Function: Transform to schema
  5. PostgreSQL: Upsert metrics
  6. Comparison: Detect significant changes
  7. IF: Major change detected
     - Trigger deep analysis
     - Send alert
```

#### Spotify Playlist Monitor
```yaml
Workflow: spotify-playlist-monitor
Trigger: Every 12 hours
Nodes:
  1. Spotify OAuth: Authenticate
  2. HTTP Request: Get editorial playlists
  3. Loop: For each playlist
     - Get tracks
     - Extract artist IDs
     - Check if new additions
  4. Filter: New artists on major playlists
  5. PostgreSQL: Flag as "playlist breakthrough"
  6. Trigger: Artist discovery pipeline
  7. Alert: Notify of opportunity
```

### 2.2 Venue System Integrations

#### Ticketing System Sync
```yaml
Workflow: ticketing-system-sync
Trigger: Webhook (from Ticketmaster/AXS/etc)
Nodes:
  1. Webhook: Receive sales data
  2. Function: Parse and validate
  3. PostgreSQL: Update event records
  4. Calculate: Real-time capacity %
  5. IF: Milestone reached (50%, 75%, 90%, Sold Out)
     - Send alerts
     - Update predictions
     - Trigger social posts
  6. InfluxDB: Track sales velocity
  7. ML Service: Refine demand model
```

#### Calendar Integration
```yaml
Workflow: calendar-integration
Trigger: Two-way sync every hour
Nodes:
  1. Google Calendar API: Fetch events
  2. PostgreSQL: Get PromoterOS events
  3. Diff: Find discrepancies
  4. Merge: Resolve conflicts
  5. Update: Sync both systems
  6. Notification: Alert on conflicts
  7. Audit: Log all changes
```

## 3. Advanced Automation Workflows

### 3.1 AI-Powered Workflows

#### Automated Booking Negotiation
```yaml
Workflow: automated-booking-negotiation
Trigger: Booking opportunity score > 90
Nodes:
  1. PostgreSQL: Get artist & venue data
  2. AI Service: Generate offer terms
     - Suggested fee range
     - Rider requirements
     - Marketing commitments
  3. Template: Create offer document
  4. Email: Send to artist management
  5. Wait: 48 hours for response
  6. Email Trigger: On reply
  7. NLP Service: Parse response
  8. Switch: Response type
     - Accept: Proceed to contract
     - Counter: Evaluate and respond
     - Decline: Archive and learn
  9. PostgreSQL: Update negotiation history
  10. ML Service: Train on outcome
```

#### Content Generation Pipeline
```yaml
Workflow: content-generation-pipeline
Trigger: New booking confirmed
Nodes:
  1. PostgreSQL: Get event details
  2. AI Service: Generate marketing copy
     - Social media posts
     - Press release
     - Email announcement
  3. Image AI: Create promotional graphics
  4. Review Queue: Human approval
  5. IF: Approved
     - Schedule social posts
     - Distribute press release
     - Send email campaign
  6. Track: Engagement metrics
```

### 3.2 Predictive Maintenance

#### System Health Monitor
```yaml
Workflow: system-health-monitor
Trigger: Every 5 minutes
Nodes:
  1. Multi-probe:
     - API health checks
     - Database connections
     - Redis ping
     - Scraper status
  2. Aggregate: System health score
  3. IF: Score < threshold
     - Diagnostic deep dive
     - Auto-healing attempts
     - Escalation if needed
  4. InfluxDB: Track metrics
  5. ML Service: Predict failures
  6. IF: Failure predicted
     - Preventive action
     - Alert DevOps
```

## 4. Workflow Management & Orchestration

### 4.1 Meta-Workflows

#### Workflow Performance Monitor
```yaml
Workflow: workflow-performance-monitor
Trigger: Every hour
Nodes:
  1. N8N API: Get workflow executions
  2. Calculate: Success rates, duration, errors
  3. Identify: Bottlenecks and failures
  4. Auto-optimize:
     - Adjust schedules
     - Modify batch sizes
     - Update rate limits
  5. Alert: On degradation
  6. Report: Daily summary
```

#### Workflow Version Control
```yaml
Workflow: workflow-version-control
Trigger: On workflow save
Nodes:
  1. Export: Workflow JSON
  2. Git: Commit to repository
  3. Diff: Compare with previous
  4. Test: Run validation suite
  5. IF: Breaking changes
     - Require approval
     - Schedule migration
  6. Deploy: Update production
  7. Monitor: Track for issues
```

## 5. Implementation Strategy

### Phase 1: Foundation (Week 1)
```bash
# Deploy N8N instance
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD} \
  -e DB_TYPE=postgresdb \
  -e DB_POSTGRESDB_DATABASE=n8n \
  -e DB_POSTGRESDB_HOST=postgres \
  -e DB_POSTGRESDB_PORT=5432 \
  -e DB_POSTGRESDB_USER=n8n \
  -e DB_POSTGRESDB_PASSWORD=${DB_PASSWORD} \
  -v n8n_data:/home/node/.n8n \
  n8nio/n8n

# Configure external services
- PostgreSQL credentials
- Redis connection
- Email service (SendGrid)
- Slack webhook
- AWS S3 access
```

### Phase 2: Core Workflows (Week 2)
1. Implement data ingestion workflows
2. Set up real-time metrics updates
3. Configure basic alerting
4. Test with mock data

### Phase 3: Intelligence Layer (Week 3)
1. Deploy ML service integrations
2. Implement viral detection
3. Add booking recommendations
4. Configure predictive analytics

### Phase 4: Advanced Features (Week 4)
1. Multi-channel notifications
2. Report generation
3. Third-party integrations
4. Automated negotiations

## 6. Monitoring & Maintenance

### Workflow KPIs
```yaml
Metrics to Track:
  - Execution success rate: >99%
  - Average execution time: <30s
  - Error rate: <1%
  - Data freshness: <1 hour
  - Alert accuracy: >90%
  - System uptime: >99.9%
```

### Backup & Recovery
```yaml
Backup Strategy:
  - Workflow definitions: Git repository
  - Execution history: 90 days retention
  - Credentials: AWS Secrets Manager
  - Database: Daily snapshots
  - Recovery time objective: <1 hour
  - Recovery point objective: <6 hours
```

## 7. Security Considerations

### Credential Management
```javascript
// Use N8N's built-in credential system
{
  "credentials": {
    "postgresDb": {
      "id": "1",
      "name": "PromoterOS Database",
      "type": "postgres",
      "data": {
        "host": "{{$env.DB_HOST}}",
        "database": "{{$env.DB_NAME}}",
        "user": "{{$env.DB_USER}}",
        "password": "{{$env.DB_PASSWORD}}",
        "port": 5432,
        "ssl": true
      }
    }
  }
}
```

### Access Control
```yaml
Roles:
  Admin:
    - Full workflow management
    - Credential management
    - System configuration
  
  Developer:
    - Create/edit workflows
    - Test execution
    - View logs
  
  Operator:
    - Execute workflows
    - View results
    - Manage schedules
  
  Viewer:
    - Read-only access
    - View dashboards
    - Export reports
```

## 8. Cost Optimization

### Resource Management
```yaml
Optimization Strategies:
  - Batch API calls to reduce costs
  - Cache frequently accessed data
  - Use webhooks vs polling where possible
  - Implement exponential backoff
  - Archive old execution data
  - Use conditional execution
  - Optimize database queries
  - Implement circuit breakers
```

## Conclusion

N8N provides a powerful, visual workflow automation platform for PromoterOS. This architecture enables:

- **Automated Data Pipeline**: Continuous ingestion and processing
- **Intelligent Alerting**: ML-powered opportunity detection
- **Scalable Integration**: Easy third-party service connections
- **Self-Healing Systems**: Automated error recovery
- **Business Intelligence**: Automated insights and reporting

The modular workflow design allows for rapid iteration and scaling as PromoterOS grows.

---
*N8N Workflow Architecture Complete*
*Estimated Implementation: 2-3 weeks*
*Required Team: 1 DevOps + 1 Backend Engineer*