#!/bin/bash

# Setup Grafana Security Dashboard
echo "Setting up Grafana Security Dashboard..."

# First, let's add Prometheus as a data source via API
echo "Adding Prometheus data source..."
curl -X POST http://admin:admin123@localhost:3003/api/datasources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Prometheus",
    "type": "prometheus",
    "url": "http://host.docker.internal:9091",
    "access": "proxy",
    "isDefault": true
  }' 2>/dev/null

# Create a Security Dashboard
echo "Creating Security Dashboard..."
DASHBOARD_JSON='{
  "dashboard": {
    "title": "Security Dashboard",
    "panels": [
      {
        "datasource": "Prometheus",
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "palette-classic"
            },
            "custom": {
              "axisLabel": "",
              "axisPlacement": "auto",
              "barAlignment": 0,
              "drawStyle": "line",
              "fillOpacity": 10,
              "gradientMode": "none",
              "hideFrom": {
                "tooltip": false,
                "viz": false,
                "legend": false
              },
              "lineInterpolation": "linear",
              "lineWidth": 1,
              "pointSize": 5,
              "scaleDistribution": {
                "type": "linear"
              },
              "showPoints": "never",
              "spanNulls": true,
              "stacking": {
                "group": "A",
                "mode": "none"
              },
              "thresholdsStyle": {
                "mode": "off"
              }
            },
            "mappings": [],
            "thresholds": {
              "mode": "absolute",
              "steps": [
                {
                  "color": "green",
                  "value": null
                },
                {
                  "color": "red",
                  "value": 80
                }
              ]
            },
            "unit": "short"
          },
          "overrides": []
        },
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 0,
          "y": 0
        },
        "id": 1,
        "options": {
          "legend": {
            "calcs": [],
            "displayMode": "list",
            "placement": "bottom"
          },
          "tooltip": {
            "mode": "single"
          }
        },
        "pluginVersion": "8.0.0",
        "targets": [
          {
            "expr": "up",
            "refId": "A"
          }
        ],
        "title": "System Status",
        "type": "timeseries"
      },
      {
        "datasource": "Prometheus",
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "thresholds"
            },
            "mappings": [
              {
                "options": {
                  "0": {
                    "text": "Down"
                  },
                  "1": {
                    "text": "Up"
                  }
                },
                "type": "value"
              }
            ],
            "thresholds": {
              "mode": "absolute",
              "steps": [
                {
                  "color": "red",
                  "value": null
                },
                {
                  "color": "green",
                  "value": 1
                }
              ]
            },
            "unit": "short"
          },
          "overrides": []
        },
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 12,
          "y": 0
        },
        "id": 2,
        "options": {
          "colorMode": "background",
          "graphMode": "none",
          "justifyMode": "center",
          "orientation": "auto",
          "reduceOptions": {
            "calcs": [
              "lastNotNull"
            ],
            "fields": "",
            "values": false
          },
          "text": {},
          "textMode": "auto"
        },
        "pluginVersion": "8.0.0",
        "targets": [
          {
            "expr": "up",
            "refId": "A"
          }
        ],
        "title": "Service Health",
        "type": "stat"
      },
      {
        "datasource": "Prometheus",
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "palette-classic"
            },
            "custom": {
              "hideFrom": {
                "tooltip": false,
                "viz": false,
                "legend": false
              }
            },
            "mappings": [],
            "unit": "short"
          },
          "overrides": []
        },
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 0,
          "y": 8
        },
        "id": 3,
        "options": {
          "legend": {
            "displayMode": "list",
            "placement": "right"
          },
          "pieType": "pie",
          "reduceOptions": {
            "calcs": [
              "lastNotNull"
            ],
            "fields": "",
            "values": true
          },
          "tooltip": {
            "mode": "single"
          }
        },
        "pluginVersion": "8.0.0",
        "targets": [
          {
            "expr": "prometheus_http_requests_total",
            "refId": "A"
          }
        ],
        "title": "Request Distribution",
        "type": "piechart"
      },
      {
        "datasource": "Prometheus",
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "continuous-GrYlRd"
            },
            "custom": {
              "align": "auto",
              "displayMode": "auto"
            },
            "mappings": [],
            "thresholds": {
              "mode": "absolute",
              "steps": [
                {
                  "color": "green",
                  "value": null
                }
              ]
            },
            "unit": "short"
          },
          "overrides": []
        },
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 12,
          "y": 8
        },
        "id": 4,
        "options": {
          "showHeader": true
        },
        "pluginVersion": "8.0.0",
        "targets": [
          {
            "expr": "prometheus_target_metadata_cache_entries",
            "format": "table",
            "refId": "A"
          }
        ],
        "title": "Metrics Overview",
        "type": "table"
      }
    ],
    "refresh": "5s",
    "schemaVersion": 27,
    "style": "dark",
    "tags": ["security", "monitoring"],
    "templating": {
      "list": []
    },
    "time": {
      "from": "now-6h",
      "to": "now"
    },
    "timepicker": {},
    "timezone": "",
    "uid": "security-dashboard-001",
    "version": 0
  },
  "overwrite": true
}'

curl -X POST http://admin:admin123@localhost:3003/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d "$DASHBOARD_JSON" 2>/dev/null

echo ""
echo "✅ Security Dashboard created!"
echo ""
echo "Access your dashboard at:"
echo "http://localhost:3003/d/security-dashboard-001/security-dashboard"
echo ""
echo "Or go to http://localhost:3003 and click on 'Dashboards' to see it"