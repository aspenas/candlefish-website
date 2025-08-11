# Monitoring, Alerting, and Observability for Tyler Setup Platform

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name         = "${var.project_name}-alerts"
  display_name = "Tyler Setup Platform Alerts"

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-alerts-topic"
  })
}

resource "aws_sns_topic_subscription" "email_alerts" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = "alerts@candlefish.ai"  # Update with actual email
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-dashboard"

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
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", aws_lb.main.arn_suffix],
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
        x      = 12
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ServiceName", aws_ecs_service.blue.name, "ClusterName", aws_ecs_cluster.main.name],
            [".", "MemoryUtilization", ".", ".", ".", "."],
            [".", "RunningTaskCount", ".", ".", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "ECS Service Metrics"
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
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", aws_db_instance.main.id],
            [".", "DatabaseConnections", ".", "."],
            [".", "ReadLatency", ".", "."],
            [".", "WriteLatency", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "RDS Database Metrics"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ElastiCache", "CPUUtilization", "CacheClusterId", "${aws_elasticache_replication_group.main.replication_group_id}-001"],
            [".", "NetworkBytesIn", ".", "."],
            [".", "NetworkBytesOut", ".", "."],
            [".", "CurrConnections", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Redis Cache Metrics"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 24
        height = 6

        properties = {
          metrics = [
            ["AWS/CloudFront", "Requests", "DistributionId", aws_cloudfront_distribution.main.id],
            [".", "BytesDownloaded", ".", "."],
            [".", "4xxErrorRate", ".", "."],
            [".", "5xxErrorRate", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = "us-east-1"  # CloudFront metrics are only in us-east-1
          title   = "CloudFront Distribution Metrics"
          period  = 300
        }
      }
    ]
  })
}

# CloudWatch Alarms

# ALB High Error Rate
resource "aws_cloudwatch_metric_alarm" "alb_high_error_rate" {
  alarm_name          = "${var.project_name}-alb-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors ALB 5xx error rate"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions         = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = var.common_tags
}

# ALB High Response Time
resource "aws_cloudwatch_metric_alarm" "alb_high_response_time" {
  alarm_name          = "${var.project_name}-alb-high-response-time"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Average"
  threshold           = "2.0"
  alarm_description   = "This metric monitors ALB response time"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = var.common_tags
}

# ECS High CPU
resource "aws_cloudwatch_metric_alarm" "ecs_high_cpu" {
  alarm_name          = "${var.project_name}-ecs-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ECS CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ServiceName = aws_ecs_service.blue.name
    ClusterName = aws_ecs_cluster.main.name
  }

  tags = var.common_tags
}

# ECS High Memory
resource "aws_cloudwatch_metric_alarm" "ecs_high_memory" {
  alarm_name          = "${var.project_name}-ecs-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ECS memory utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ServiceName = aws_ecs_service.blue.name
    ClusterName = aws_ecs_cluster.main.name
  }

  tags = var.common_tags
}

# RDS High CPU
resource "aws_cloudwatch_metric_alarm" "rds_high_cpu" {
  alarm_name          = "${var.project_name}-rds-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "75"
  alarm_description   = "This metric monitors RDS CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  tags = var.common_tags
}

# RDS High Connection Count
resource "aws_cloudwatch_metric_alarm" "rds_high_connections" {
  alarm_name          = "${var.project_name}-rds-high-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors RDS connection count"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  tags = var.common_tags
}

# Redis High CPU
resource "aws_cloudwatch_metric_alarm" "redis_high_cpu" {
  alarm_name          = "${var.project_name}-redis-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "75"
  alarm_description   = "This metric monitors Redis CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    CacheClusterId = "${aws_elasticache_replication_group.main.replication_group_id}-001"
  }

  tags = var.common_tags
}

# CloudFront High Error Rate
resource "aws_cloudwatch_metric_alarm" "cloudfront_high_error_rate" {
  alarm_name          = "${var.project_name}-cloudfront-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "5xxErrorRate"
  namespace           = "AWS/CloudFront"
  period              = "300"
  statistic           = "Average"
  threshold           = "5"
  alarm_description   = "This metric monitors CloudFront 5xx error rate"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DistributionId = aws_cloudfront_distribution.main.id
  }

  tags = var.common_tags
}

# Custom Application Metrics
resource "aws_cloudwatch_log_metric_filter" "authentication_failures" {
  name           = "${var.project_name}-auth-failures"
  log_group_name = aws_cloudwatch_log_group.ecs.name
  pattern        = "[timestamp, request_id, level=\"ERROR\", message=\"Authentication failed\", ...]"

  metric_transformation {
    name      = "AuthenticationFailures"
    namespace = "TylerSetup/Security"
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "high_auth_failures" {
  alarm_name          = "${var.project_name}-high-auth-failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "AuthenticationFailures"
  namespace           = "TylerSetup/Security"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "High number of authentication failures detected"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  tags = var.common_tags
}

resource "aws_cloudwatch_log_metric_filter" "claude_api_errors" {
  name           = "${var.project_name}-claude-api-errors"
  log_group_name = aws_cloudwatch_log_group.ecs.name
  pattern        = "[timestamp, request_id, level=\"ERROR\", message=\"Claude API error\", ...]"

  metric_transformation {
    name      = "ClaudeAPIErrors"
    namespace = "TylerSetup/AI"
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "claude_api_errors" {
  alarm_name          = "${var.project_name}-claude-api-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "ClaudeAPIErrors"
  namespace           = "TylerSetup/AI"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "High number of Claude API errors"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  tags = var.common_tags
}

# Cost Anomaly Detection
resource "aws_ce_anomaly_detector" "cost_anomaly" {
  name     = "${var.project_name}-cost-anomaly"
  type     = "DIMENSIONAL"

  specification = jsonencode({
    Dimension = "SERVICE"
    MatchOptions = ["EQUALS"]
    Values = ["Amazon Elastic Compute Cloud - Compute", "Amazon Relational Database Service"]
  })

  tags = var.common_tags
}

resource "aws_ce_anomaly_subscription" "cost_anomaly" {
  name      = "${var.project_name}-cost-anomaly-subscription"
  frequency = "DAILY"

  monitor_arn_list = [
    aws_ce_anomaly_detector.cost_anomaly.arn
  ]

  subscriber {
    type    = "EMAIL"
    address = "billing@candlefish.ai"  # Update with actual email
  }

  threshold_expression {
    and {
      dimension {
        key           = "ANOMALY_TOTAL_IMPACT_ABSOLUTE"
        values        = ["100"]
        match_options = ["GREATER_THAN_OR_EQUAL"]
      }
    }
  }

  tags = var.common_tags
}

# Budget Alert
resource "aws_budgets_budget" "monthly_cost" {
  name     = "${var.project_name}-monthly-budget"
  budget_type = "COST"
  limit_amount = tostring(var.monthly_cost_threshold)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"
  time_period_start = formatdate("YYYY-MM-01_00:00", timestamp())

  cost_filters = {
    Service = [
      "Amazon Elastic Compute Cloud - Compute",
      "Amazon Relational Database Service",
      "Amazon ElastiCache",
      "Amazon CloudFront",
      "Amazon Route 53"
    ]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = ["billing@candlefish.ai"]  # Update with actual email
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                 = 100
    threshold_type            = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = ["billing@candlefish.ai"]  # Update with actual email
  }
}

# X-Ray Tracing
resource "aws_xray_sampling_rule" "tyler_setup" {
  rule_name      = "${var.project_name}-sampling-rule"
  priority       = 9000
  version        = 1
  reservoir_size = 1
  fixed_rate     = 0.1
  url_path       = "*"
  host           = "*"
  http_method    = "*"
  service_type   = "*"
  service_name   = "*"
  resource_arn   = "*"
}

# CloudTrail for API Auditing
resource "aws_cloudtrail" "main" {
  name                          = "${var.project_name}-cloudtrail"
  s3_bucket_name               = aws_s3_bucket.cloudtrail.bucket
  s3_key_prefix                = "cloudtrail/"
  include_global_service_events = true
  is_multi_region_trail        = true
  enable_logging               = true

  event_selector {
    read_write_type                 = "All"
    include_management_events       = true

    data_resource {
      type   = "AWS::S3::Object"
      values = ["${aws_s3_bucket.frontend.arn}/*"]
    }

    data_resource {
      type   = "AWS::SecretsManager::Secret"
      values = ["arn:aws:secretsmanager:${var.aws_region}:*:secret:${var.project_name}/*"]
    }
  }

  depends_on = [aws_s3_bucket_policy.cloudtrail]

  tags = var.common_tags
}

# S3 Bucket for CloudTrail
resource "aws_s3_bucket" "cloudtrail" {
  bucket        = "${var.project_name}-cloudtrail-${random_id.cloudtrail_suffix.hex}"
  force_destroy = true

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-cloudtrail-bucket"
  })
}

resource "random_id" "cloudtrail_suffix" {
  byte_length = 4
}

resource "aws_s3_bucket_versioning" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        kms_master_key_id = aws_kms_key.main.arn
        sse_algorithm     = "aws:kms"
      }
    }
  }
}

resource "aws_s3_bucket_policy" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AWSCloudTrailAclCheck"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.cloudtrail.arn
      },
      {
        Sid    = "AWSCloudTrailWrite"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.cloudtrail.arn}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      }
    ]
  })
}

# GuardDuty
resource "aws_guardduty_detector" "main" {
  enable = true

  datasources {
    s3_logs {
      enable = true
    }
    kubernetes {
      audit_logs {
        enable = false  # Not using EKS
      }
    }
    malware_protection {
      scan_ec2_instance_with_findings {
        ebs_volumes {
          enable = false  # Not using EC2
        }
      }
    }
  }

  tags = var.common_tags
}

# Security Hub
resource "aws_securityhub_account" "main" {
  enable_default_standards = true
}

# Config
resource "aws_config_configuration_recorder" "main" {
  name     = "${var.project_name}-config-recorder"
  role_arn = aws_iam_role.config.arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }
}

resource "aws_config_delivery_channel" "main" {
  name           = "${var.project_name}-config-delivery-channel"
  s3_bucket_name = aws_s3_bucket.config.bucket
  depends_on     = [aws_config_configuration_recorder.main]
}

# S3 Bucket for Config
resource "aws_s3_bucket" "config" {
  bucket        = "${var.project_name}-config-${random_id.config_suffix.hex}"
  force_destroy = true

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-config-bucket"
  })
}

resource "random_id" "config_suffix" {
  byte_length = 4
}

# IAM Role for Config
resource "aws_iam_role" "config" {
  name = "${var.project_name}-config-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
      }
    ]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy_attachment" "config" {
  role       = aws_iam_role.config.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/ConfigRole"
}
