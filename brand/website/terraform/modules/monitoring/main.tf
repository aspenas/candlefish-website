# Monitoring Module for Bioluminescent Candlefish Animation
# Comprehensive observability stack with CloudWatch, Prometheus, and Grafana

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
  }
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "application_logs" {
  name              = "/aws/eks/${var.cluster_name}/application"
  retention_in_days = var.log_retention_days
  kms_key_id        = aws_kms_key.logs.arn

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "animation_logs" {
  name              = "/aws/eks/${var.cluster_name}/animation"
  retention_in_days = var.log_retention_days
  kms_key_id        = aws_kms_key.logs.arn

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "performance_logs" {
  name              = "/aws/eks/${var.cluster_name}/performance"
  retention_in_days = var.log_retention_days
  kms_key_id        = aws_kms_key.logs.arn

  tags = var.tags
}

# KMS Key for log encryption
resource "aws_kms_key" "logs" {
  description             = "KMS key for ${var.environment} log encryption"
  deletion_window_in_days = 7
  
  tags = var.tags
}

resource "aws_kms_alias" "logs" {
  name          = "alias/${var.environment}-candlefish-logs"
  target_key_id = aws_kms_key.logs.key_id
}

# CloudWatch Alarms for Application Health
resource "aws_cloudwatch_metric_alarm" "high_error_rate" {
  alarm_name          = "${var.environment}-candlefish-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ErrorRate"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Average"
  threshold           = "5"
  alarm_description   = "This metric monitors application error rate"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "high_response_time" {
  alarm_name          = "${var.environment}-candlefish-high-response-time"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Average"
  threshold           = "2"
  alarm_description   = "This metric monitors application response time"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  tags = var.tags
}

# Animation-specific CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "animation_frame_rate_low" {
  alarm_name          = "${var.environment}-candlefish-animation-low-fps"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "AnimationFPS"
  namespace           = "Candlefish/Animation"
  period              = "300"
  statistic           = "Average"
  threshold           = "45"
  alarm_description   = "This metric monitors bioluminescent animation frame rate"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "webgl_memory_high" {
  alarm_name          = "${var.environment}-candlefish-webgl-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "WebGLMemoryUsage"
  namespace           = "Candlefish/Animation"
  period              = "300"
  statistic           = "Average"
  threshold           = "512"
  alarm_description   = "This metric monitors WebGL memory usage in MB"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  tags = var.tags
}

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name = "${var.environment}-candlefish-alerts"

  tags = var.tags
}

resource "aws_sns_topic_subscription" "slack_alerts" {
  count     = var.slack_webhook_url != null ? 1 : 0
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "https"
  endpoint  = var.slack_webhook_url
}

resource "aws_sns_topic_subscription" "email_alerts" {
  count     = length(var.alert_email_addresses)
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email_addresses[count.index]
}

# Prometheus and Grafana Helm Charts
resource "helm_release" "prometheus_stack" {
  name       = "prometheus-stack"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  version    = "51.2.0"
  namespace  = "monitoring"
  
  create_namespace = true

  values = [
    yamlencode({
      prometheus = {
        prometheusSpec = {
          retention = "30d"
          storageSpec = {
            volumeClaimTemplate = {
              spec = {
                storageClassName = "gp3"
                accessModes      = ["ReadWriteOnce"]
                resources = {
                  requests = {
                    storage = "50Gi"
                  }
                }
              }
            }
          }
          additionalScrapeConfigs = [
            {
              job_name = "candlefish-animation"
              static_configs = [
                {
                  targets = ["candlefish-website.production.svc.cluster.local:3000"]
                }
              ]
              metrics_path = "/api/metrics"
              scrape_interval = "30s"
            }
          ]
        }
      }
      
      grafana = {
        adminPassword = var.grafana_admin_password
        service = {
          type = "LoadBalancer"
          annotations = {
            "service.beta.kubernetes.io/aws-load-balancer-type" = "nlb"
          }
        }
        persistence = {
          enabled = true
          storageClassName = "gp3"
          size = "10Gi"
        }
        dashboards = {
          default = {
            candlefish-animation = {
              gnetId = 1860
              revision = 27
              datasource = "Prometheus"
            }
          }
        }
        grafana.ini = {
          security = {
            disable_gravatar = true
          }
          users = {
            allow_sign_up = false
            auto_assign_org_role = "Viewer"
          }
          server = {
            domain = var.grafana_domain
            root_url = "https://${var.grafana_domain}"
          }
        }
      }
      
      alertmanager = {
        config = {
          global = {
            slack_api_url = var.slack_webhook_url
          }
          route = {
            group_by = ["alertname", "cluster", "service"]
            group_wait = "10s"
            group_interval = "10s"
            repeat_interval = "1h"
            receiver = "web.hook"
            routes = [
              {
                match = {
                  severity = "critical"
                }
                receiver = "critical-alerts"
                group_interval = "5s"
                repeat_interval = "10m"
              }
            ]
          }
          receivers = [
            {
              name = "web.hook"
              slack_configs = [
                {
                  channel = "#alerts"
                  title = "Candlefish Alert"
                  text = "{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}"
                }
              ]
            },
            {
              name = "critical-alerts"
              slack_configs = [
                {
                  channel = "#critical-alerts"
                  title = "🚨 CRITICAL: Candlefish Animation Issue"
                  text = "{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}"
                }
              ]
            }
          ]
        }
      }
    })
  ]

  depends_on = [kubernetes_namespace.monitoring]
}

# Kubernetes namespace for monitoring
resource "kubernetes_namespace" "monitoring" {
  metadata {
    name = "monitoring"
    
    labels = {
      name = "monitoring"
      environment = var.environment
    }
  }
}

# Jaeger for distributed tracing
resource "helm_release" "jaeger" {
  name       = "jaeger"
  repository = "https://jaegertracing.github.io/helm-charts"
  chart      = "jaeger"
  version    = "0.71.2"
  namespace  = "monitoring"

  values = [
    yamlencode({
      storage = {
        type = "elasticsearch"
        elasticsearch = {
          host = aws_elasticsearch_domain.jaeger.endpoint
          port = 443
          scheme = "https"
        }
      }
      query = {
        service = {
          type = "LoadBalancer"
        }
      }
    })
  ]

  depends_on = [helm_release.prometheus_stack]
}

# Elasticsearch for Jaeger storage
resource "aws_elasticsearch_domain" "jaeger" {
  domain_name           = "${var.environment}-candlefish-jaeger"
  elasticsearch_version = "7.10"

  cluster_config {
    instance_type  = "t3.small.elasticsearch"
    instance_count = 1
  }

  ebs_options {
    ebs_enabled = true
    volume_type = "gp3"
    volume_size = 20
  }

  encrypt_at_rest {
    enabled = true
  }

  domain_endpoint_options {
    enforce_https = true
  }

  tags = var.tags
}

# Custom CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "candlefish_animation" {
  dashboard_name = "${var.environment}-candlefish-animation"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", var.alb_arn_suffix],
            [".", "TargetResponseTime", ".", "."],
            [".", "HTTPCode_Target_2XX_Count", ".", "."],
            [".", "HTTPCode_Target_4XX_Count", ".", "."],
            [".", "HTTPCode_Target_5XX_Count", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Application Load Balancer Metrics"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["Candlefish/Animation", "AnimationFPS"],
            [".", "WebGLMemoryUsage"],
            [".", "ActiveConnections"],
            [".", "RenderTime"]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Bioluminescent Animation Metrics"
          period  = 300
        }
      }
    ]
  })
}

# Application Insights with X-Ray
resource "aws_xray_sampling_rule" "candlefish_animation" {
  rule_name      = "${var.environment}-candlefish-animation"
  priority       = 9000
  version        = 1
  reservoir_size = 1
  fixed_rate     = 0.1
  url_path       = "/api/animation/*"
  host           = "*"
  http_method    = "*"
  resource_arn   = "*"
  service_name   = "candlefish-website"
  service_type   = "*"
}