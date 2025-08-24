#!/bin/bash

# Netlify Extensions Monitoring Setup
# Sets up comprehensive monitoring for all deployed extensions

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARENT_DIR="$(dirname "${SCRIPT_DIR}")"

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create monitoring dashboard configuration
create_dashboard_config() {
    print_status "Creating monitoring dashboard configuration..."

    cat > "${SCRIPT_DIR}/dashboard-config.json" <<EOF
{
  "name": "Candlefish Netlify Extensions Dashboard",
  "version": "1.0.0",
  "sites": [
    {
      "name": "candlefish.ai",
      "url": "https://candlefish.ai",
      "monitors": {
        "performance": {
          "lighthouse": true,
          "webVitals": true,
          "customMetrics": ["webgl_fps", "webgl_memory", "render_time"]
        },
        "availability": {
          "uptime": true,
          "pingInterval": 60,
          "regions": ["us-east-1", "eu-west-1", "ap-southeast-1"]
        },
        "errors": {
          "sentry": true,
          "customErrors": true,
          "errorThreshold": 1
        }
      }
    },
    {
      "name": "staging.candlefish.ai",
      "url": "https://staging.candlefish.ai",
      "monitors": {
        "deployment": {
          "trackBuilds": true,
          "visualDiff": true,
          "testResults": true
        }
      }
    },
    {
      "name": "inventory.candlefish.ai",
      "url": "https://inventory.candlefish.ai",
      "monitors": {
        "realtime": {
          "websocketHealth": true,
          "connectionPool": true,
          "messageLatency": true
        },
        "auth": {
          "auth0Events": true,
          "loginSuccess": true,
          "tokenExpiry": true
        }
      }
    },
    {
      "name": "dashboard.candlefish.ai",
      "url": "https://dashboard.candlefish.ai",
      "monitors": {
        "metrics": {
          "dataFreshness": true,
          "aggregationLatency": true,
          "alertDelivery": true
        }
      }
    },
    {
      "name": "claude.candlefish.ai",
      "url": "https://claude.candlefish.ai",
      "monitors": {
        "search": {
          "searchLatency": true,
          "indexSize": true,
          "querySuccess": true
        },
        "accessibility": {
          "wcagCompliance": true,
          "screenReaderTests": true
        }
      }
    }
  ],
  "alerts": {
    "channels": [
      {
        "type": "slack",
        "webhook": "\${SLACK_WEBHOOK_URL}",
        "severity": ["critical", "warning"]
      },
      {
        "type": "email",
        "recipients": ["ops@candlefish.ai"],
        "severity": ["critical"]
      },
      {
        "type": "pagerduty",
        "apiKey": "\${PAGERDUTY_API_KEY}",
        "severity": ["critical"]
      }
    ],
    "rules": [
      {
        "metric": "lighthouse_performance",
        "threshold": 70,
        "comparison": "less_than",
        "severity": "warning"
      },
      {
        "metric": "error_rate",
        "threshold": 5,
        "comparison": "greater_than",
        "severity": "critical"
      },
      {
        "metric": "uptime",
        "threshold": 99.9,
        "comparison": "less_than",
        "severity": "warning"
      },
      {
        "metric": "webgl_fps",
        "threshold": 30,
        "comparison": "less_than",
        "severity": "warning"
      },
      {
        "metric": "websocket_connections",
        "threshold": 0,
        "comparison": "equals",
        "severity": "critical"
      }
    ]
  },
  "reporting": {
    "schedule": "daily",
    "format": ["html", "pdf", "json"],
    "recipients": ["team@candlefish.ai"],
    "metrics": [
      "performance_summary",
      "error_summary",
      "deployment_history",
      "cost_analysis"
    ]
  }
}
EOF

    print_success "Dashboard configuration created"
}

# Create Grafana dashboard
create_grafana_dashboard() {
    print_status "Creating Grafana dashboard configuration..."

    cat > "${SCRIPT_DIR}/grafana-dashboard.json" <<EOF
{
  "dashboard": {
    "title": "Candlefish Netlify Extensions",
    "tags": ["netlify", "monitoring", "performance"],
    "timezone": "browser",
    "panels": [
      {
        "title": "Site Performance Overview",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(lighthouse_performance_score[5m])",
            "legendFormat": "{{site}}"
          }
        ]
      },
      {
        "title": "WebGL Performance",
        "type": "graph",
        "targets": [
          {
            "expr": "webgl_fps",
            "legendFormat": "FPS - {{quality_level}}"
          },
          {
            "expr": "webgl_memory_usage",
            "legendFormat": "Memory (MB)"
          }
        ]
      },
      {
        "title": "Real-time Connections",
        "type": "stat",
        "targets": [
          {
            "expr": "websocket_active_connections",
            "legendFormat": "Active Connections"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_errors_total[5m])",
            "legendFormat": "{{site}} - {{status_code}}"
          }
        ]
      },
      {
        "title": "Build Success Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "avg(netlify_build_success_rate)",
            "legendFormat": "Success Rate"
          }
        ]
      },
      {
        "title": "Core Web Vitals",
        "type": "table",
        "targets": [
          {
            "expr": "web_vitals_lcp",
            "legendFormat": "LCP"
          },
          {
            "expr": "web_vitals_fid",
            "legendFormat": "FID"
          },
          {
            "expr": "web_vitals_cls",
            "legendFormat": "CLS"
          }
        ]
      }
    ]
  }
}
EOF

    print_success "Grafana dashboard configuration created"
}

# Create monitoring scripts
create_monitoring_scripts() {
    print_status "Creating monitoring scripts..."

    # Health check script
    cat > "${SCRIPT_DIR}/health-check.sh" <<'EOF'
#!/bin/bash

# Health check for all Candlefish sites

SITES=(
    "https://candlefish.ai"
    "https://staging.candlefish.ai"
    "https://inventory.candlefish.ai"
    "https://dashboard.candlefish.ai"
    "https://claude.candlefish.ai"
)

check_site() {
    local url=$1
    local start_time=$(date +%s%N)
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    local end_time=$(date +%s%N)
    local response_time=$((($end_time - $start_time) / 1000000))

    if [ "$http_code" = "200" ]; then
        echo "✅ $url - ${response_time}ms"
    else
        echo "❌ $url - HTTP $http_code"
    fi
}

echo "Running health checks..."
for site in "${SITES[@]}"; do
    check_site "$site"
done
EOF
    chmod +x "${SCRIPT_DIR}/health-check.sh"

    # Performance test script
    cat > "${SCRIPT_DIR}/performance-test.sh" <<'EOF'
#!/bin/bash

# Performance testing using Lighthouse CLI

SITES=(
    "https://candlefish.ai"
    "https://staging.candlefish.ai"
    "https://inventory.candlefish.ai"
    "https://dashboard.candlefish.ai"
    "https://claude.candlefish.ai"
)

test_performance() {
    local url=$1
    local report_name=$(echo "$url" | sed 's/https:\/\///' | sed 's/\./-/g')

    echo "Testing $url..."

    lighthouse "$url" \
        --output=json \
        --output=html \
        --output-path="./reports/${report_name}" \
        --chrome-flags="--headless" \
        --only-categories=performance,accessibility,best-practices,seo \
        --quiet

    # Extract scores
    local perf_score=$(jq '.categories.performance.score * 100' "./reports/${report_name}.report.json")
    local a11y_score=$(jq '.categories.accessibility.score * 100' "./reports/${report_name}.report.json")

    echo "  Performance: ${perf_score}%"
    echo "  Accessibility: ${a11y_score}%"
}

mkdir -p ./reports

for site in "${SITES[@]}"; do
    test_performance "$site"
done

echo "Reports saved in ./reports/"
EOF
    chmod +x "${SCRIPT_DIR}/performance-test.sh"

    print_success "Monitoring scripts created"
}

# Create synthetic monitoring
create_synthetic_monitoring() {
    print_status "Creating synthetic monitoring configuration..."

    cat > "${SCRIPT_DIR}/synthetic-tests.js" <<'EOF'
// Synthetic monitoring tests for Candlefish sites

const puppeteer = require('puppeteer');
const { performance } = require('perf_hooks');

const sites = [
  {
    name: 'Main Site',
    url: 'https://candlefish.ai',
    tests: ['homepage', 'webgl', 'navigation']
  },
  {
    name: 'Inventory',
    url: 'https://inventory.candlefish.ai',
    tests: ['login', 'search', 'realtime']
  },
  {
    name: 'Dashboard',
    url: 'https://dashboard.candlefish.ai',
    tests: ['metrics', 'alerts', 'websocket']
  }
];

async function testHomepage(page, url) {
  const start = performance.now();
  await page.goto(url, { waitUntil: 'networkidle0' });
  const loadTime = performance.now() - start;

  // Check for critical elements
  const hasHero = await page.$('.hero') !== null;
  const hasNav = await page.$('nav') !== null;

  return {
    loadTime,
    hasHero,
    hasNav,
    success: hasHero && hasNav
  };
}

async function testWebGL(page, url) {
  await page.goto(url);

  // Check WebGL support
  const webglSupported = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  });

  // Monitor FPS if WebGL is active
  let fps = 0;
  if (webglSupported) {
    fps = await page.evaluate(() => {
      return new Promise(resolve => {
        let frames = 0;
        const start = performance.now();

        function countFrames() {
          frames++;
          if (performance.now() - start < 1000) {
            requestAnimationFrame(countFrames);
          } else {
            resolve(frames);
          }
        }

        requestAnimationFrame(countFrames);
      });
    });
  }

  return {
    webglSupported,
    fps,
    success: webglSupported && fps > 30
  };
}

async function testLogin(page, url) {
  await page.goto(url + '/login');

  // Check for Auth0 integration
  const hasLoginForm = await page.$('[data-testid="login-form"]') !== null;
  const hasAuth0 = await page.evaluate(() => {
    return typeof window.auth0 !== 'undefined';
  });

  return {
    hasLoginForm,
    hasAuth0,
    success: hasLoginForm || hasAuth0
  };
}

async function runTests() {
  const browser = await puppeteer.launch({ headless: true });
  const results = [];

  for (const site of sites) {
    console.log(`Testing ${site.name}...`);
    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });

    const siteResults = {
      name: site.name,
      url: site.url,
      timestamp: new Date().toISOString(),
      tests: {}
    };

    // Run applicable tests
    for (const test of site.tests) {
      try {
        switch (test) {
          case 'homepage':
            siteResults.tests.homepage = await testHomepage(page, site.url);
            break;
          case 'webgl':
            siteResults.tests.webgl = await testWebGL(page, site.url);
            break;
          case 'login':
            siteResults.tests.login = await testLogin(page, site.url);
            break;
          // Add more tests as needed
        }
      } catch (error) {
        siteResults.tests[test] = {
          success: false,
          error: error.message
        };
      }
    }

    await page.close();
    results.push(siteResults);
  }

  await browser.close();

  // Send results to monitoring service
  console.log(JSON.stringify(results, null, 2));

  return results;
}

// Run tests every 5 minutes
setInterval(runTests, 5 * 60 * 1000);
runTests(); // Run immediately
EOF

    print_success "Synthetic monitoring configuration created"
}

# Main setup function
main() {
    print_status "Setting up Netlify Extensions Monitoring"
    echo "========================================="

    # Create directories
    mkdir -p "${SCRIPT_DIR}/reports"
    mkdir -p "${SCRIPT_DIR}/alerts"
    mkdir -p "${SCRIPT_DIR}/dashboards"

    # Create configurations
    create_dashboard_config
    create_grafana_dashboard
    create_monitoring_scripts
    create_synthetic_monitoring

    # Create cron job for automated monitoring
    print_status "Setting up automated monitoring..."

    cat > "${SCRIPT_DIR}/crontab.txt" <<EOF
# Netlify Extensions Monitoring Cron Jobs

# Health check every 5 minutes
*/5 * * * * ${SCRIPT_DIR}/health-check.sh >> ${SCRIPT_DIR}/reports/health.log 2>&1

# Performance test every hour
0 * * * * ${SCRIPT_DIR}/performance-test.sh >> ${SCRIPT_DIR}/reports/performance.log 2>&1

# Daily report at 9 AM
0 9 * * * ${PARENT_DIR}/deploy.sh test && ${SCRIPT_DIR}/generate-report.sh

# Weekly full test on Sunday at 2 AM
0 2 * * 0 ${PARENT_DIR}/deploy.sh all && ${SCRIPT_DIR}/performance-test.sh
EOF

    print_status "To install cron jobs, run:"
    echo "  crontab -l | cat - ${SCRIPT_DIR}/crontab.txt | crontab -"

    print_success "Monitoring setup completed!"
    echo ""
    echo "Next steps:"
    echo "1. Configure environment variables in ${PARENT_DIR}/.env"
    echo "2. Install monitoring dependencies: npm install puppeteer lighthouse"
    echo "3. Set up Grafana dashboard using the generated configuration"
    echo "4. Configure alert channels (Slack, email, PagerDuty)"
    echo "5. Run initial tests: ${SCRIPT_DIR}/health-check.sh"
}

# Run main function
main
