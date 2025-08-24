#!/bin/bash

# ======================================================================
# Netlify Monitoring Setup Script
# Configure monitoring, analytics, and observability for all sites
# ======================================================================

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONITORING_CONFIG_DIR="${SCRIPT_DIR}/monitoring"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Sites to monitor
declare -A SITES=(
    ["candlefish.ai"]="prod"
    ["staging.candlefish.ai"]="staging"
    ["paintbox.candlefish.ai"]="prod"
    ["inventory.candlefish.ai"]="prod"
    ["promoteros.candlefish.ai"]="prod"
    ["claude.candlefish.ai"]="prod"
    ["dashboard.candlefish.ai"]="prod"
    ["ibm.candlefish.ai"]="prod"
)

# Monitoring services configuration
MONITORING_SERVICES=(
    "google-analytics"
    "sentry"
    "datadog"
    "new-relic"
    "bugsnag"
)

# Create monitoring directory
mkdir -p "${MONITORING_CONFIG_DIR}"

# Logging functions
log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }
log_warning() { echo -e "${YELLOW}⚠${NC} $1"; }

# Setup Google Analytics
setup_google_analytics() {
    local site_domain="$1"
    local ga_id="$2"

    log_info "Setting up Google Analytics for ${site_domain}..."

    # Create GA snippet
    cat > "${MONITORING_CONFIG_DIR}/${site_domain}-ga.html" <<EOF
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${ga_id}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${ga_id}', {
    'page_location': window.location.href,
    'page_path': window.location.pathname,
    'page_title': document.title
  });
</script>
<!-- End Google Analytics -->
EOF

    # Set environment variable
    netlify env:set NEXT_PUBLIC_GA_ID "${ga_id}" --scope builds

    log_success "Google Analytics configured for ${site_domain}"
}

# Setup Sentry error tracking
setup_sentry() {
    local site_domain="$1"
    local environment="${SITES[$site_domain]}"

    log_info "Setting up Sentry for ${site_domain}..."

    # Get Sentry DSN from AWS Secrets Manager
    local sentry_dsn=$(aws secretsmanager get-secret-value \
        --secret-id "candlefish/sentry-dsn" \
        --query 'SecretString' \
        --output text 2>/dev/null || echo "")

    if [ -z "$sentry_dsn" ]; then
        log_warning "Sentry DSN not found in AWS Secrets Manager"
        return
    fi

    # Create Sentry configuration
    cat > "${MONITORING_CONFIG_DIR}/${site_domain}-sentry.js" <<EOF
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "${sentry_dsn}",
  environment: "${environment}",
  tracesSampleRate: ${environment} === "prod" ? 0.1 : 1.0,
  debug: ${environment} !== "prod",
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  beforeSend(event, hint) {
    // Filter out non-critical errors in production
    if (${environment} === "prod") {
      if (event.exception?.values?.[0]?.value?.includes("Network")) {
        return null;
      }
    }
    return event;
  },
});
EOF

    # Set Sentry environment variables
    netlify env:set SENTRY_DSN "${sentry_dsn}" --scope builds
    netlify env:set SENTRY_ENVIRONMENT "${environment}" --scope builds
    netlify env:set SENTRY_RELEASE "$(git rev-parse HEAD)" --scope builds

    log_success "Sentry configured for ${site_domain}"
}

# Setup custom performance monitoring
setup_performance_monitoring() {
    local site_domain="$1"

    log_info "Setting up performance monitoring for ${site_domain}..."

    # Create Web Vitals monitoring script
    cat > "${MONITORING_CONFIG_DIR}/${site_domain}-vitals.js" <<EOF
// Web Vitals Performance Monitoring
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // Send to custom analytics endpoint
  const body = JSON.stringify({
    site: '${site_domain}',
    metric: metric.name,
    value: metric.value,
    delta: metric.delta,
    id: metric.id,
    timestamp: Date.now(),
    url: window.location.href,
    userAgent: navigator.userAgent
  });

  // Use sendBeacon for reliability
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics/vitals', body);
  } else {
    fetch('/api/analytics/vitals', {
      method: 'POST',
      body,
      keepalive: true,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Monitor Core Web Vitals
getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);

// Custom performance marks
if (window.performance && window.performance.mark) {
  // Mark important events
  window.addEventListener('load', () => {
    performance.mark('page-fully-loaded');

    // Measure time to interactive
    const tti = performance.now();
    sendToAnalytics({
      name: 'TTI',
      value: tti,
      delta: tti,
      id: 'custom-tti',
    });
  });
}
EOF

    log_success "Performance monitoring configured for ${site_domain}"
}

# Setup uptime monitoring
setup_uptime_monitoring() {
    local site_domain="$1"

    log_info "Setting up uptime monitoring for ${site_domain}..."

    # Create StatusPage configuration
    cat > "${MONITORING_CONFIG_DIR}/${site_domain}-uptime.json" <<EOF
{
  "name": "${site_domain}",
  "url": "https://${site_domain}",
  "checks": [
    {
      "type": "http",
      "endpoint": "/",
      "expectedStatus": 200,
      "interval": 60,
      "timeout": 30
    },
    {
      "type": "http",
      "endpoint": "/api/health",
      "expectedStatus": 200,
      "interval": 30,
      "timeout": 10
    },
    {
      "type": "ssl",
      "daysBefore": 30
    },
    {
      "type": "dns",
      "expectedRecords": ["A", "AAAA", "CNAME"]
    }
  ],
  "alerts": {
    "email": ["ops@candlefish.ai"],
    "slack": {
      "webhook": "https://hooks.slack.com/services/...",
      "channel": "#monitoring"
    },
    "pagerduty": {
      "serviceKey": "..."
    }
  },
  "maintenance": {
    "schedule": "0 2 * * SUN",
    "duration": 30,
    "timezone": "America/New_York"
  }
}
EOF

    # Setup health check endpoint
    cat > "${MONITORING_CONFIG_DIR}/${site_domain}-health.js" <<EOF
// Health check API endpoint
export default function handler(req, res) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    site: '${site_domain}',
    version: process.env.NEXT_PUBLIC_VERSION || 'unknown',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    env: process.env.NODE_ENV,
    checks: {
      database: checkDatabase(),
      redis: checkRedis(),
      external_apis: checkExternalAPIs()
    }
  };

  const allHealthy = Object.values(health.checks).every(check => check.status === 'healthy');

  res.status(allHealthy ? 200 : 503).json(health);
}

function checkDatabase() {
  // Implement database health check
  return { status: 'healthy', latency: 5 };
}

function checkRedis() {
  // Implement Redis health check
  return { status: 'healthy', latency: 2 };
}

function checkExternalAPIs() {
  // Implement external API health checks
  return { status: 'healthy', latency: 50 };
}
EOF

    log_success "Uptime monitoring configured for ${site_domain}"
}

# Setup real user monitoring (RUM)
setup_rum() {
    local site_domain="$1"

    log_info "Setting up Real User Monitoring for ${site_domain}..."

    cat > "${MONITORING_CONFIG_DIR}/${site_domain}-rum.js" <<EOF
// Real User Monitoring (RUM)
class RUM {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.metrics = [];
    this.init();
  }

  init() {
    // Page load metrics
    window.addEventListener('load', () => this.capturePageLoad());

    // Navigation timing
    this.captureNavigationTiming();

    // Resource timing
    this.captureResourceTiming();

    // User interactions
    this.captureInteractions();

    // Errors
    this.captureErrors();

    // Send metrics periodically
    setInterval(() => this.sendMetrics(), 30000);

    // Send on page unload
    window.addEventListener('beforeunload', () => this.sendMetrics());
  }

  generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  capturePageLoad() {
    const perfData = performance.getEntriesByType('navigation')[0];
    this.metrics.push({
      type: 'page_load',
      data: {
        dns: perfData.domainLookupEnd - perfData.domainLookupStart,
        tcp: perfData.connectEnd - perfData.connectStart,
        request: perfData.responseStart - perfData.requestStart,
        response: perfData.responseEnd - perfData.responseStart,
        dom: perfData.domComplete - perfData.domInteractive,
        load: perfData.loadEventEnd - perfData.loadEventStart,
        total: perfData.loadEventEnd - perfData.fetchStart
      },
      timestamp: Date.now(),
      url: window.location.href,
      sessionId: this.sessionId
    });
  }

  captureNavigationTiming() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.metrics.push({
          type: 'navigation',
          data: {
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime
          },
          timestamp: Date.now(),
          sessionId: this.sessionId
        });
      }
    });
    observer.observe({ entryTypes: ['navigation'] });
  }

  captureResourceTiming() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 100) { // Only log slow resources
          this.metrics.push({
            type: 'resource',
            data: {
              name: entry.name,
              duration: entry.duration,
              size: entry.transferSize,
              type: entry.initiatorType
            },
            timestamp: Date.now(),
            sessionId: this.sessionId
          });
        }
      }
    });
    observer.observe({ entryTypes: ['resource'] });
  }

  captureInteractions() {
    ['click', 'input', 'scroll'].forEach(eventType => {
      document.addEventListener(eventType, (e) => {
        this.metrics.push({
          type: 'interaction',
          data: {
            event: eventType,
            target: e.target?.tagName,
            timestamp: Date.now()
          },
          sessionId: this.sessionId
        });
      }, { passive: true, capture: true });
    });
  }

  captureErrors() {
    window.addEventListener('error', (e) => {
      this.metrics.push({
        type: 'error',
        data: {
          message: e.message,
          source: e.filename,
          line: e.lineno,
          column: e.colno,
          stack: e.error?.stack
        },
        timestamp: Date.now(),
        sessionId: this.sessionId,
        url: window.location.href
      });
    });
  }

  sendMetrics() {
    if (this.metrics.length === 0) return;

    const payload = {
      site: '${site_domain}',
      metrics: this.metrics.splice(0, 50), // Send max 50 at a time
      userAgent: navigator.userAgent,
      screen: {
        width: window.screen.width,
        height: window.screen.height
      }
    };

    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/rum', JSON.stringify(payload));
    } else {
      fetch('/api/rum', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
        keepalive: true
      });
    }
  }
}

// Initialize RUM
if (typeof window !== 'undefined') {
  new RUM();
}
EOF

    log_success "Real User Monitoring configured for ${site_domain}"
}

# Setup alerting rules
setup_alerting() {
    local site_domain="$1"

    log_info "Setting up alerting for ${site_domain}..."

    cat > "${MONITORING_CONFIG_DIR}/${site_domain}-alerts.yaml" <<EOF
# Alerting rules for ${site_domain}
alerts:
  - name: HighErrorRate
    condition: error_rate > 1%
    duration: 5m
    severity: critical
    notifications:
      - email
      - slack
      - pagerduty

  - name: SlowResponseTime
    condition: p95_latency > 2000ms
    duration: 10m
    severity: warning
    notifications:
      - email
      - slack

  - name: LowConversionRate
    condition: conversion_rate < 1%
    duration: 1h
    severity: info
    notifications:
      - email

  - name: HighMemoryUsage
    condition: memory_usage > 90%
    duration: 5m
    severity: warning
    notifications:
      - email
      - slack

  - name: SSLCertificateExpiry
    condition: ssl_days_remaining < 30
    duration: 1h
    severity: warning
    notifications:
      - email

  - name: BuildFailure
    condition: build_status = failed
    duration: immediate
    severity: warning
    notifications:
      - slack

  - name: DeploymentFailure
    condition: deployment_status = failed
    duration: immediate
    severity: critical
    notifications:
      - email
      - slack
      - pagerduty

notification_channels:
  email:
    to: ["ops@candlefish.ai", "dev@candlefish.ai"]
    from: "monitoring@candlefish.ai"

  slack:
    webhook: "https://hooks.slack.com/services/..."
    channel: "#alerts"
    username: "Netlify Monitor"

  pagerduty:
    service_key: "..."
    integration_key: "..."
EOF

    log_success "Alerting configured for ${site_domain}"
}

# Setup custom dashboards
setup_dashboards() {
    local site_domain="$1"

    log_info "Creating monitoring dashboard configuration for ${site_domain}..."

    cat > "${MONITORING_CONFIG_DIR}/${site_domain}-dashboard.json" <<EOF
{
  "name": "${site_domain} Monitoring Dashboard",
  "refresh": "30s",
  "widgets": [
    {
      "type": "metric",
      "title": "Request Rate",
      "query": "sum(rate(requests_total[5m])) by (site)",
      "visualization": "line"
    },
    {
      "type": "metric",
      "title": "Error Rate",
      "query": "sum(rate(errors_total[5m])) by (site, error_type)",
      "visualization": "stacked_area"
    },
    {
      "type": "metric",
      "title": "Response Time (p95)",
      "query": "histogram_quantile(0.95, response_time_bucket)",
      "visualization": "gauge",
      "thresholds": {
        "green": 500,
        "yellow": 1000,
        "red": 2000
      }
    },
    {
      "type": "metric",
      "title": "Active Users",
      "query": "count(distinct(session_id))",
      "visualization": "single_stat"
    },
    {
      "type": "metric",
      "title": "Core Web Vitals",
      "query": "web_vitals{site='${site_domain}'}",
      "visualization": "heatmap"
    },
    {
      "type": "log",
      "title": "Recent Errors",
      "query": "level='error' AND site='${site_domain}'",
      "limit": 10
    },
    {
      "type": "metric",
      "title": "Build Success Rate",
      "query": "sum(builds_successful) / sum(builds_total) * 100",
      "visualization": "single_stat",
      "format": "percentage"
    },
    {
      "type": "metric",
      "title": "CDN Hit Rate",
      "query": "cdn_hits / (cdn_hits + cdn_misses) * 100",
      "visualization": "gauge",
      "format": "percentage"
    }
  ]
}
EOF

    log_success "Dashboard configuration created for ${site_domain}"
}

# Main monitoring setup
setup_monitoring_for_site() {
    local site_domain="$1"

    log_info "Setting up complete monitoring for ${site_domain}..."

    # Generate unique GA ID (in production, use real IDs)
    local ga_id="G-$(echo $site_domain | md5sum | cut -c1-10 | tr '[:lower:]' '[:upper:]')"

    # Setup all monitoring components
    setup_google_analytics "${site_domain}" "${ga_id}"
    setup_sentry "${site_domain}"
    setup_performance_monitoring "${site_domain}"
    setup_uptime_monitoring "${site_domain}"
    setup_rum "${site_domain}"
    setup_alerting "${site_domain}"
    setup_dashboards "${site_domain}"

    log_success "Monitoring setup complete for ${site_domain}"
}

# Main execution
main() {
    log_info "================================"
    log_info "Netlify Monitoring Setup"
    log_info "================================"
    echo ""

    # Setup monitoring for all sites
    for site_domain in "${!SITES[@]}"; do
        setup_monitoring_for_site "${site_domain}"
        echo ""
    done

    # Create aggregated monitoring view
    log_info "Creating aggregated monitoring configuration..."

    cat > "${MONITORING_CONFIG_DIR}/all-sites-monitoring.json" <<EOF
{
  "sites": $(echo "${!SITES[@]}" | jq -R 'split(" ")'),
  "aggregated_metrics": [
    "total_requests",
    "total_errors",
    "average_response_time",
    "total_bandwidth",
    "unique_visitors"
  ],
  "comparison_views": [
    "site_performance",
    "error_rates",
    "traffic_distribution",
    "conversion_funnels"
  ],
  "reports": {
    "daily": ["performance", "errors", "traffic"],
    "weekly": ["trends", "conversions", "user_behavior"],
    "monthly": ["growth", "costs", "optimization_opportunities"]
  }
}
EOF

    log_success "All monitoring configurations created in ${MONITORING_CONFIG_DIR}"
    log_info "Next steps:"
    log_info "1. Review generated configurations"
    log_info "2. Add real API keys and webhooks"
    log_info "3. Deploy monitoring endpoints"
    log_info "4. Configure data retention policies"
}

# Run main
main "$@"
