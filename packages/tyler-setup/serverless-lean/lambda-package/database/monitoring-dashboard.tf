# CloudWatch Dashboard and Monitoring Configuration for Tyler Setup Database

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Variables
variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "candlefish-employee-setup-lean"
}

variable "alert_email" {
  description = "Email for critical alerts"
  type        = string
  default     = "ops@candlefish.ai"
}

# Local variables
locals {
  table_prefix = "${var.project_name}-${var.environment}"

  common_tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
    Purpose     = "database-monitoring"
  }

  # Table names for monitoring
  tables = {
    entities    = "${local.table_prefix}-entities"
    events      = "${local.table_prefix}-events"
    cache       = "${local.table_prefix}-cache"
    connections = "${local.table_prefix}-connections"
    rate_limits = "${local.table_prefix}-rate-limits"
  }
}

# ============================================================================
# SNS Topics for Alerts
# ============================================================================

resource "aws_sns_topic" "database_alerts" {
  name         = "${local.table_prefix}-database-alerts"
  display_name = "Tyler Setup Database Alerts"

  tags = local.common_tags
}

resource "aws_sns_topic_subscription" "email_alerts" {
  topic_arn = aws_sns_topic.database_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_sns_topic" "performance_alerts" {
  name         = "${local.table_prefix}-performance-alerts"
  display_name = "Tyler Setup Performance Alerts"

  tags = local.common_tags
}

resource "aws_sns_topic_subscription" "performance_email" {
  topic_arn = aws_sns_topic.performance_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# ============================================================================
# Custom Metrics Lambda Function
# ============================================================================

resource "aws_iam_role" "metrics_lambda_role" {
  name = "${local.table_prefix}-metrics-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "metrics_lambda_policy" {
  name = "${local.table_prefix}-metrics-lambda-policy"
  role = aws_iam_role.metrics_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:DescribeTable",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:GetItem"
        ]
        Resource = [
          "arn:aws:dynamodb:*:*:table/${local.table_prefix}-*",
          "arn:aws:dynamodb:*:*:table/${local.table_prefix}-*/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData",
          "cloudwatch:GetMetricStatistics"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_lambda_function" "custom_metrics" {
  filename         = data.archive_file.metrics_lambda_zip.output_path
  function_name    = "${local.table_prefix}-custom-metrics"
  role            = aws_iam_role.metrics_lambda_role.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.metrics_lambda_zip.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 300

  environment {
    variables = {
      ENTITY_TABLE    = local.tables.entities
      EVENT_TABLE     = local.tables.events
      CACHE_TABLE     = local.tables.cache
      CONNECTION_TABLE = local.tables.connections
      RATE_LIMIT_TABLE = local.tables.rate_limits
      ENVIRONMENT     = var.environment
    }
  }

  tags = local.common_tags
}

# Lambda function source code
data "archive_file" "metrics_lambda_zip" {
  type        = "zip"
  output_path = "/tmp/metrics-lambda.zip"

  source {
    content = file("${path.module}/metrics-lambda.js")
    filename = "index.js"
  }
}

# Schedule for custom metrics collection
resource "aws_cloudwatch_event_rule" "metrics_schedule" {
  name                = "${local.table_prefix}-metrics-schedule"
  description         = "Trigger custom metrics collection"
  schedule_expression = "rate(5 minutes)"

  tags = local.common_tags
}

resource "aws_cloudwatch_event_target" "metrics_lambda_target" {
  rule      = aws_cloudwatch_event_rule.metrics_schedule.name
  target_id = "MetricsLambdaTarget"
  arn       = aws_lambda_function.custom_metrics.arn
}

resource "aws_lambda_permission" "allow_cloudwatch_metrics" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.custom_metrics.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.metrics_schedule.arn
}

# ============================================================================
# CloudWatch Alarms - Database Health
# ============================================================================

# Entity Table Alarms
resource "aws_cloudwatch_metric_alarm" "entity_table_throttles" {
  alarm_name          = "${local.table_prefix}-entity-table-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "SystemErrors"
  namespace           = "AWS/DynamoDB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "Entity table throttling detected"
  alarm_actions       = [aws_sns_topic.database_alerts.arn]
  ok_actions         = [aws_sns_topic.database_alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = local.tables.entities
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "entity_table_high_latency" {
  alarm_name          = "${local.table_prefix}-entity-table-high-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "SuccessfulRequestLatency"
  namespace           = "AWS/DynamoDB"
  period              = "300"
  statistic           = "Average"
  threshold           = "100"
  alarm_description   = "High latency on entity table operations"
  alarm_actions       = [aws_sns_topic.performance_alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = local.tables.entities
    Operation = "Query"
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "entity_table_consumed_capacity" {
  alarm_name          = "${local.table_prefix}-entity-table-high-capacity"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ConsumedReadCapacityUnits"
  namespace           = "AWS/DynamoDB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "800"
  alarm_description   = "High read capacity consumption on entity table"
  alarm_actions       = [aws_sns_topic.performance_alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = local.tables.entities
  }

  tags = local.common_tags
}

# Event Table Alarms
resource "aws_cloudwatch_metric_alarm" "event_table_high_writes" {
  alarm_name          = "${local.table_prefix}-event-table-high-writes"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ConsumedWriteCapacityUnits"
  namespace           = "AWS/DynamoDB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "500"
  alarm_description   = "High write activity on event table"
  alarm_actions       = [aws_sns_topic.performance_alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = local.tables.events
  }

  tags = local.common_tags
}

# Cache Performance Alarms
resource "aws_cloudwatch_metric_alarm" "cache_hit_ratio_low" {
  alarm_name          = "${local.table_prefix}-cache-hit-ratio-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "CacheHitRatio"
  namespace           = "Tyler-Setup/Database"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "Cache hit ratio below acceptable threshold"
  alarm_actions       = [aws_sns_topic.performance_alerts.arn]
  treat_missing_data  = "notBreaching"

  tags = local.common_tags
}

# Connection State Alarms
resource "aws_cloudwatch_metric_alarm" "active_connections_high" {
  alarm_name          = "${local.table_prefix}-active-connections-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ActiveConnections"
  namespace           = "Tyler-Setup/WebSocket"
  period              = "300"
  statistic           = "Maximum"
  threshold           = "500"
  alarm_description   = "High number of active WebSocket connections"
  alarm_actions       = [aws_sns_topic.performance_alerts.arn]
  treat_missing_data  = "notBreaching"

  tags = local.common_tags
}

# ============================================================================
# CloudWatch Alarms - Business Metrics
# ============================================================================

resource "aws_cloudwatch_metric_alarm" "user_login_failures" {
  alarm_name          = "${local.table_prefix}-user-login-failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "LoginFailures"
  namespace           = "Tyler-Setup/Authentication"
  period              = "300"
  statistic           = "Sum"
  threshold           = "20"
  alarm_description   = "High number of login failures"
  alarm_actions       = [aws_sns_topic.database_alerts.arn]
  treat_missing_data  = "notBreaching"

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "graphql_error_rate" {
  alarm_name          = "${local.table_prefix}-graphql-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "ErrorRate"
  namespace           = "Tyler-Setup/GraphQL"
  period              = "300"
  statistic           = "Average"
  threshold           = "5"
  alarm_description   = "GraphQL error rate above acceptable threshold"
  alarm_actions       = [aws_sns_topic.database_alerts.arn]
  treat_missing_data  = "notBreaching"

  tags = local.common_tags
}

# ============================================================================
# CloudWatch Dashboard
# ============================================================================

resource "aws_cloudwatch_dashboard" "database_dashboard" {
  dashboard_name = "${local.table_prefix}-database-performance"

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
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", local.tables.entities],
            [".", "ConsumedWriteCapacityUnits", ".", "."],
            [".", "ConsumedReadCapacityUnits", ".", local.tables.events],
            [".", "ConsumedWriteCapacityUnits", ".", "."],
          ]
          view    = "timeSeries"
          stacked = false
          region  = data.aws_region.current.name
          title   = "Table Capacity Consumption"
          period  = 300
          stat    = "Sum"
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
            ["AWS/DynamoDB", "SuccessfulRequestLatency", "TableName", local.tables.entities, "Operation", "Query"],
            [".", ".", ".", ".", ".", "GetItem"],
            [".", ".", ".", ".", ".", "PutItem"],
            [".", ".", ".", local.tables.events, ".", "Query"],
          ]
          view    = "timeSeries"
          stacked = false
          region  = data.aws_region.current.name
          title   = "Request Latency by Operation"
          period  = 300
          stat    = "Average"
          yAxis = {
            left = {
              min = 0
              max = 200
            }
          }
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
            ["AWS/DynamoDB", "SystemErrors", "TableName", local.tables.entities],
            [".", ".", ".", local.tables.events],
            [".", "UserErrors", ".", local.tables.entities],
            [".", ".", ".", local.tables.events],
          ]
          view    = "timeSeries"
          stacked = false
          region  = data.aws_region.current.name
          title   = "Errors by Table"
          period  = 300
          stat    = "Sum"
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
            ["Tyler-Setup/Database", "CacheHitRatio"],
            [".", "CacheMissRatio"],
            [".", "CacheSize"],
          ]
          view    = "timeSeries"
          stacked = false
          region  = data.aws_region.current.name
          title   = "Cache Performance"
          period  = 300
          stat    = "Average"
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
            ["Tyler-Setup/WebSocket", "ActiveConnections"],
            [".", "ConnectionsPerMinute"],
            [".", "DisconnectionsPerMinute"],
          ]
          view    = "timeSeries"
          stacked = false
          region  = data.aws_region.current.name
          title   = "WebSocket Connections"
          period  = 300
          stat    = "Average"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["Tyler-Setup/GraphQL", "QueryCount"],
            [".", "MutationCount"],
            [".", "SubscriptionCount"],
            [".", "ErrorCount"],
          ]
          view    = "timeSeries"
          stacked = false
          region  = data.aws_region.current.name
          title   = "GraphQL Operations"
          period  = 300
          stat    = "Sum"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 12
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["Tyler-Setup/Authentication", "LoginAttempts"],
            [".", "LoginSuccesses"],
            [".", "LoginFailures"],
            [".", "TokenRefreshes"],
          ]
          view    = "timeSeries"
          stacked = false
          region  = data.aws_region.current.name
          title   = "Authentication Metrics"
          period  = 300
          stat    = "Sum"
        }
      },
      {
        type   = "log"
        x      = 0
        y      = 18
        width  = 24
        height = 6

        properties = {
          query   = "SOURCE '/aws/lambda/${local.table_prefix}-custom-metrics' | fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 20"
          region  = data.aws_region.current.name
          title   = "Recent Errors"
          view    = "table"
        }
      }
    ]
  })
}

# Application Performance Dashboard
resource "aws_cloudwatch_dashboard" "application_dashboard" {
  dashboard_name = "${local.table_prefix}-application-metrics"

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
            ["AWS/Lambda", "Duration", "FunctionName", "${local.table_prefix}-graphql-gateway"],
            [".", "Errors", ".", "."],
            [".", "Throttles", ".", "."],
          ]
          view    = "timeSeries"
          stacked = false
          region  = data.aws_region.current.name
          title   = "Lambda Performance"
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
            ["Tyler-Setup/Database", "ConnectionPoolSize"],
            [".", "ConnectionPoolUtilization"],
            [".", "CircuitBreakerState"],
          ]
          view    = "timeSeries"
          stacked = false
          region  = data.aws_region.current.name
          title   = "Connection Pool Status"
          period  = 300
        }
      }
    ]
  })
}

# Data source for current region
data "aws_region" "current" {}

# ============================================================================
# Outputs
# ============================================================================

output "database_dashboard_url" {
  description = "URL to the database performance dashboard"
  value       = "https://${data.aws_region.current.name}.console.aws.amazon.com/cloudwatch/home?region=${data.aws_region.current.name}#dashboards:name=${aws_cloudwatch_dashboard.database_dashboard.dashboard_name}"
}

output "application_dashboard_url" {
  description = "URL to the application metrics dashboard"
  value       = "https://${data.aws_region.current.name}.console.aws.amazon.com/cloudwatch/home?region=${data.aws_region.current.name}#dashboards:name=${aws_cloudwatch_dashboard.application_dashboard.dashboard_name}"
}

output "database_alerts_topic_arn" {
  description = "ARN of the database alerts SNS topic"
  value       = aws_sns_topic.database_alerts.arn
}

output "performance_alerts_topic_arn" {
  description = "ARN of the performance alerts SNS topic"
  value       = aws_sns_topic.performance_alerts.arn
}

output "custom_metrics_function_name" {
  description = "Name of the custom metrics Lambda function"
  value       = aws_lambda_function.custom_metrics.function_name
}
