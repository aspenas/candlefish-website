# CloudWatch Monitoring and Alerting Configuration

# SNS Topic for Alerts
resource "aws_sns_topic" "paintbox_alerts" {
  name              = "paintbox-alerts-${var.environment}"
  kms_master_key_id = aws_kms_key.paintbox.arn

  tags = local.common_tags
}

resource "aws_sns_topic_subscription" "email_alerts" {
  count = length(var.alert_email_addresses)

  topic_arn = aws_sns_topic.paintbox_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email_addresses[count.index]
}

# Fallback for backward compatibility
resource "aws_sns_topic_subscription" "email_alerts_fallback" {
  count = var.alert_email != "" ? 1 : 0

  topic_arn = aws_sns_topic.paintbox_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# CloudWatch Alarms for Database
resource "aws_cloudwatch_metric_alarm" "database_cpu" {
  alarm_name          = "paintbox-database-cpu-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors RDS CPU utilization"
  alarm_actions       = [aws_sns_topic.paintbox_alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.paintbox.id
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "database_connections" {
  alarm_name          = "paintbox-database-connections-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "40"
  alarm_description   = "This metric monitors RDS connection count"
  alarm_actions       = [aws_sns_topic.paintbox_alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.paintbox.id
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "database_storage" {
  alarm_name          = "paintbox-database-storage-${var.environment}"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "2000000000" # 2GB in bytes
  alarm_description   = "This metric monitors RDS free storage space"
  alarm_actions       = [aws_sns_topic.paintbox_alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.paintbox.id
  }

  tags = local.common_tags
}

# CloudWatch Alarms for Redis
resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "paintbox-redis-cpu-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "75"
  alarm_description   = "This metric monitors ElastiCache CPU utilization"
  alarm_actions       = [aws_sns_topic.paintbox_alerts.arn]

  dimensions = {
    CacheClusterId = "${aws_elasticache_replication_group.paintbox.replication_group_id}-001"
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  alarm_name          = "paintbox-redis-memory-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ElastiCache memory utilization"
  alarm_actions       = [aws_sns_topic.paintbox_alerts.arn]

  dimensions = {
    CacheClusterId = "${aws_elasticache_replication_group.paintbox.replication_group_id}-001"
  }

  tags = local.common_tags
}

# Custom CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "paintbox" {
  dashboard_name = "Paintbox-${var.environment}"

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
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", aws_db_instance.paintbox.id],
            [".", "DatabaseConnections", ".", "."],
            [".", "FreeStorageSpace", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "RDS Metrics"
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
            ["AWS/ElastiCache", "CPUUtilization", "CacheClusterId", "${aws_elasticache_replication_group.paintbox.replication_group_id}-001"],
            [".", "DatabaseMemoryUsagePercentage", ".", "."],
            [".", "CurrConnections", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "ElastiCache Metrics"
          period  = 300
        }
      },
      {
        type   = "log"
        x      = 0
        y      = 12
        width  = 12
        height = 6

        properties = {
          query   = "SOURCE '${aws_cloudwatch_log_group.paintbox_app.name}' | fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 100"
          region  = var.aws_region
          title   = "Application Errors"
        }
      },
      {
        type   = "log"
        x      = 0
        y      = 18
        width  = 12
        height = 6

        properties = {
          query   = "SOURCE '${aws_cloudwatch_log_group.paintbox_api.name}' | fields @timestamp, @message | filter @message like /5[0-9][0-9]/ | sort @timestamp desc | limit 100"
          region  = var.aws_region
          title   = "API Server Errors"
        }
      }
    ]
  })

  tags = local.common_tags
}

# CloudWatch Log Metric Filters
resource "aws_cloudwatch_log_metric_filter" "error_count" {
  name           = "paintbox-error-count-${var.environment}"
  log_group_name = aws_cloudwatch_log_group.paintbox_app.name
  pattern        = "ERROR"

  metric_transformation {
    name      = "ErrorCount"
    namespace = "Paintbox/${var.environment}"
    value     = "1"
  }
}

resource "aws_cloudwatch_log_metric_filter" "api_errors" {
  name           = "paintbox-api-errors-${var.environment}"
  log_group_name = aws_cloudwatch_log_group.paintbox_api.name
  pattern        = "[timestamp, request_id, level=\"ERROR\", ...]"

  metric_transformation {
    name      = "APIErrors"
    namespace = "Paintbox/${var.environment}"
    value     = "1"
  }
}

# CloudWatch Alarm for Error Rate
resource "aws_cloudwatch_metric_alarm" "high_error_rate" {
  alarm_name          = "paintbox-high-error-rate-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ErrorCount"
  namespace           = "Paintbox/${var.environment}"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "High error rate detected"
  alarm_actions       = [aws_sns_topic.paintbox_alerts.arn]
  treat_missing_data  = "notBreaching"

  tags = local.common_tags
}

# CloudWatch Insights Queries
resource "aws_cloudwatch_query_definition" "error_analysis" {
  name = "paintbox-error-analysis-${var.environment}"

  log_group_names = [
    aws_cloudwatch_log_group.paintbox_app.name,
    aws_cloudwatch_log_group.paintbox_api.name
  ]

  query_string = <<EOF
fields @timestamp, @message, @logStream
| filter @message like /ERROR/
| stats count() by bin(5m)
| sort @timestamp desc
EOF
}

resource "aws_cloudwatch_query_definition" "performance_analysis" {
  name = "paintbox-performance-analysis-${var.environment}"

  log_group_names = [
    aws_cloudwatch_log_group.paintbox_api.name
  ]

  query_string = <<EOF
fields @timestamp, @message, @requestId, @duration
| filter @type = "REPORT"
| stats avg(@duration), max(@duration), min(@duration) by bin(5m)
| sort @timestamp desc
EOF
}

# EventBridge Rule for Security Events
resource "aws_cloudwatch_event_rule" "security_events" {
  name        = "paintbox-security-events-${var.environment}"
  description = "Capture security-related events"

  event_pattern = jsonencode({
    source      = ["aws.secretsmanager", "aws.kms", "aws.iam"]
    detail-type = ["AWS API Call via CloudTrail"]
  })

  tags = local.common_tags
}

resource "aws_cloudwatch_event_target" "security_events_sns" {
  rule      = aws_cloudwatch_event_rule.security_events.name
  target_id = "SendToSNS"
  arn       = aws_sns_topic.paintbox_alerts.arn
}

# CloudTrail for Security Auditing
resource "aws_cloudtrail" "paintbox_security" {
  count = var.environment == "production" ? 1 : 0

  name           = "paintbox-security-trail-${var.environment}"
  s3_bucket_name = aws_s3_bucket.cloudtrail[0].bucket
  s3_key_prefix  = "security-logs"

  include_global_service_events = true
  is_multi_region_trail         = true
  enable_logging                = true

  kms_key_id = aws_kms_key.paintbox.arn

  event_selector {
    read_write_type                 = "All"
    include_management_events       = true
    data_resource {
      type   = "AWS::S3::Object"
      values = ["${aws_s3_bucket.cloudtrail[0].arn}/*"]
    }
  }

  tags = local.common_tags

  depends_on = [aws_s3_bucket_policy.cloudtrail[0]]
}

# S3 Bucket for CloudTrail (Production only)
resource "aws_s3_bucket" "cloudtrail" {
  count = var.environment == "production" ? 1 : 0

  bucket        = "paintbox-cloudtrail-${var.environment}-${random_id.bucket_suffix[0].hex}"
  force_destroy = false

  tags = local.common_tags
}

resource "aws_s3_bucket_policy" "cloudtrail" {
  count = var.environment == "production" ? 1 : 0

  bucket = aws_s3_bucket.cloudtrail[0].id

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
        Resource = aws_s3_bucket.cloudtrail[0].arn
      },
      {
        Sid    = "AWSCloudTrailWrite"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.cloudtrail[0].arn}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      }
    ]
  })
}

resource "aws_s3_bucket_server_side_encryption_configuration" "cloudtrail" {
  count = var.environment == "production" ? 1 : 0

  bucket = aws_s3_bucket.cloudtrail[0].bucket

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.paintbox.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_versioning" "cloudtrail" {
  count = var.environment == "production" ? 1 : 0

  bucket = aws_s3_bucket.cloudtrail[0].id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "cloudtrail" {
  count = var.environment == "production" ? 1 : 0

  bucket = aws_s3_bucket.cloudtrail[0].bucket

  rule {
    id     = "security_logs_lifecycle"
    status = "Enabled"

    expiration {
      days = 90
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

resource "random_id" "bucket_suffix" {
  count = var.environment == "production" ? 1 : 0

  byte_length = 8
}

# ECS Service Monitoring and Alerting
# Only create if ECS resources exist (when ecs.tf is applied)
data "aws_ecs_cluster" "paintbox" {
  count = var.environment == "production" || var.environment == "staging" ? 1 : 0
  cluster_name = "paintbox-${var.environment}"

  depends_on = [aws_ecs_cluster.paintbox]
}

data "aws_ecs_service" "paintbox" {
  count = var.environment == "production" || var.environment == "staging" ? 1 : 0
  service_name = "paintbox-${var.environment}-service"
  cluster_arn  = data.aws_ecs_cluster.paintbox[0].arn

  depends_on = [aws_ecs_service.paintbox]
}

# ECS CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high" {
  count = var.environment == "production" || var.environment == "staging" ? 1 : 0

  alarm_name          = "paintbox-ecs-cpu-high-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = var.cpu_threshold_high
  alarm_description   = "ECS service CPU utilization is too high"
  alarm_actions       = [aws_sns_topic.paintbox_alerts.arn]
  ok_actions         = [aws_sns_topic.paintbox_alerts.arn]

  dimensions = {
    ServiceName = "paintbox-${var.environment}-service"
    ClusterName = "paintbox-${var.environment}"
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "ecs_memory_high" {
  count = var.environment == "production" || var.environment == "staging" ? 1 : 0

  alarm_name          = "paintbox-ecs-memory-high-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = var.memory_threshold_high
  alarm_description   = "ECS service memory utilization is too high"
  alarm_actions       = [aws_sns_topic.paintbox_alerts.arn]
  ok_actions         = [aws_sns_topic.paintbox_alerts.arn]

  dimensions = {
    ServiceName = "paintbox-${var.environment}-service"
    ClusterName = "paintbox-${var.environment}"
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "ecs_service_tasks_stopped" {
  count = var.environment == "production" || var.environment == "staging" ? 1 : 0

  alarm_name          = "paintbox-ecs-tasks-stopped-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "RunningTaskCount"
  namespace           = "AWS/ECS"
  period              = "60"
  statistic           = "Average"
  threshold           = "0"
  alarm_description   = "ECS service has no running tasks"
  alarm_actions       = [aws_sns_topic.paintbox_alerts.arn]
  treat_missing_data  = "breaching"

  dimensions = {
    ServiceName = "paintbox-${var.environment}-service"
    ClusterName = "paintbox-${var.environment}"
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "ecs_service_desired_count" {
  count = var.environment == "production" || var.environment == "staging" ? 1 : 0

  alarm_name          = "paintbox-ecs-desired-count-${var.environment}"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "RunningTaskCount"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = var.app_count
  alarm_description   = "ECS service running task count is below desired count"
  alarm_actions       = [aws_sns_topic.paintbox_alerts.arn]

  dimensions = {
    ServiceName = "paintbox-${var.environment}-service"
    ClusterName = "paintbox-${var.environment}"
  }

  tags = local.common_tags
}

# Application Load Balancer Monitoring
resource "aws_cloudwatch_metric_alarm" "alb_response_time" {
  count = var.environment == "production" || var.environment == "staging" ? 1 : 0

  alarm_name          = "paintbox-alb-response-time-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Average"
  threshold           = "2" # 2 seconds
  alarm_description   = "ALB target response time is too high"
  alarm_actions       = [aws_sns_topic.paintbox_alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.paintbox.arn_suffix
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "alb_5xx_errors" {
  count = var.environment == "production" || var.environment == "staging" ? 1 : 0

  alarm_name          = "paintbox-alb-5xx-errors-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HTTPCode_ELB_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "Too many 5xx errors from ALB"
  alarm_actions       = [aws_sns_topic.paintbox_alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_lb.paintbox.arn_suffix
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "alb_4xx_errors" {
  count = var.environment == "production" || var.environment == "staging" ? 1 : 0

  alarm_name          = "paintbox-alb-4xx-errors-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "HTTPCode_Target_4XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "20"
  alarm_description   = "High rate of 4xx errors from targets"
  alarm_actions       = [aws_sns_topic.paintbox_alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_lb.paintbox.arn_suffix
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "alb_healthy_targets" {
  count = var.environment == "production" || var.environment == "staging" ? 1 : 0

  alarm_name          = "paintbox-alb-healthy-targets-${var.environment}"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Average"
  threshold           = "1"
  alarm_description   = "No healthy targets available"
  alarm_actions       = [aws_sns_topic.paintbox_alerts.arn]

  dimensions = {
    TargetGroup  = aws_lb_target_group.paintbox.arn_suffix
    LoadBalancer = aws_lb.paintbox.arn_suffix
  }

  tags = local.common_tags
}

# Enhanced CloudWatch Dashboard with ECS metrics
resource "aws_cloudwatch_dashboard" "paintbox_enhanced" {
  count = var.environment == "production" || var.environment == "staging" ? 1 : 0

  dashboard_name = "Paintbox-Enhanced-${var.environment}"

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
            ["AWS/ECS", "CPUUtilization", "ServiceName", "paintbox-${var.environment}-service", "ClusterName", "paintbox-${var.environment}"],
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
        x      = 12
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", aws_lb.paintbox.arn_suffix],
            [".", "TargetResponseTime", ".", "."],
            [".", "HTTPCode_Target_2XX_Count", ".", "."],
            [".", "HTTPCode_Target_4XX_Count", ".", "."],
            [".", "HTTPCode_Target_5XX_Count", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Load Balancer Metrics"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 8
        height = 6

        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", aws_db_instance.paintbox.id],
            [".", "DatabaseConnections", ".", "."],
            [".", "ReadLatency", ".", "."],
            [".", "WriteLatency", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "RDS Performance"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 6
        width  = 8
        height = 6

        properties = {
          metrics = [
            ["AWS/ElastiCache", "CPUUtilization", "CacheClusterId", "${aws_elasticache_replication_group.paintbox.replication_group_id}-001"],
            [".", "DatabaseMemoryUsagePercentage", ".", "."],
            [".", "CurrConnections", ".", "."],
            [".", "NetworkBytesIn", ".", "."],
            [".", "NetworkBytesOut", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Redis Performance"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 6
        width  = 8
        height = 6

        properties = {
          metrics = [
            ["AWS/ApplicationELB", "HealthyHostCount", "TargetGroup", aws_lb_target_group.paintbox.arn_suffix, "LoadBalancer", aws_lb.paintbox.arn_suffix],
            [".", "UnHealthyHostCount", ".", ".", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Target Health"
          period  = 300
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },
      {
        type   = "log"
        x      = 0
        y      = 12
        width  = 12
        height = 6

        properties = {
          query   = "SOURCE '${aws_cloudwatch_log_group.ecs_app.name}' | fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 50"
          region  = var.aws_region
          title   = "Application Errors (ECS)"
        }
      },
      {
        type   = "log"
        x      = 12
        y      = 12
        width  = 12
        height = 6

        properties = {
          query   = "SOURCE '${aws_cloudwatch_log_group.ecs_app.name}' | fields @timestamp, @message | filter @message like /WARN/ | sort @timestamp desc | limit 50"
          region  = var.aws_region
          title   = "Application Warnings (ECS)"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 18
        width  = 24
        height = 6

        properties = {
          metrics = [
            ["Paintbox/${var.environment}", "ErrorCount"],
            [".", "APIErrors"]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Custom Application Metrics"
          period  = 300
        }
      }
    ]
  })

  tags = local.common_tags
}

# CloudWatch Composite Alarm for Service Health
resource "aws_cloudwatch_composite_alarm" "service_health" {
  count = var.environment == "production" ? 1 : 0

  alarm_name        = "paintbox-service-health-${var.environment}"
  alarm_description = "Composite alarm for overall service health"

  alarm_rule = join(" OR ", [
    "ALARM('${aws_cloudwatch_metric_alarm.ecs_cpu_high[0].alarm_name}')",
    "ALARM('${aws_cloudwatch_metric_alarm.ecs_memory_high[0].alarm_name}')",
    "ALARM('${aws_cloudwatch_metric_alarm.ecs_service_tasks_stopped[0].alarm_name}')",
    "ALARM('${aws_cloudwatch_metric_alarm.alb_5xx_errors[0].alarm_name}')",
    "ALARM('${aws_cloudwatch_metric_alarm.alb_healthy_targets[0].alarm_name}')"
  ])

  alarm_actions = [aws_sns_topic.paintbox_alerts.arn]
  ok_actions   = [aws_sns_topic.paintbox_alerts.arn]

  tags = local.common_tags
}

# CloudWatch Insights Queries for ECS
resource "aws_cloudwatch_query_definition" "ecs_error_analysis" {
  count = var.environment == "production" || var.environment == "staging" ? 1 : 0

  name = "paintbox-ecs-error-analysis-${var.environment}"

  log_group_names = [
    aws_cloudwatch_log_group.ecs_app.name
  ]

  query_string = <<EOF
fields @timestamp, @message, @requestId
| filter @message like /ERROR/
| stats count() by bin(5m), @requestId
| sort @timestamp desc
EOF
}

resource "aws_cloudwatch_query_definition" "ecs_performance_analysis" {
  count = var.environment == "production" || var.environment == "staging" ? 1 : 0

  name = "paintbox-ecs-performance-analysis-${var.environment}"

  log_group_names = [
    aws_cloudwatch_log_group.ecs_app.name
  ]

  query_string = <<EOF
fields @timestamp, @message, @duration, @requestId
| filter @message like /duration/
| stats avg(@duration), max(@duration), min(@duration), count() by bin(5m)
| sort @timestamp desc
EOF
}
