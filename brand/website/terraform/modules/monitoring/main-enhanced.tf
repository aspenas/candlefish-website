# Enhanced Monitoring Module for Candlefish.ai
# CloudWatch, X-Ray, SNS, Custom Metrics, Dashboards, Cost Monitoring

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  common_tags = merge(var.tags, {
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "Monitoring Infrastructure"
  })
  
  # Merge legacy email addresses with new configuration
  alert_email_addresses = length(var.alert_email_addresses) > 0 ? var.alert_email_addresses : []
}

# ============================================
# CloudWatch Log Groups
# ============================================
resource "aws_cloudwatch_log_group" "main" {
  for_each = var.cloudwatch_config.create_log_groups ? var.log_groups : {}

  name              = "/aws/${var.project_name}/${var.environment}/${each.key}"
  retention_in_days = each.value.retention_in_days
  kms_key_id        = each.value.kms_key_id

  tags = merge(local.common_tags, {
    Name     = "${var.project_name}-${var.environment}-${each.key}"
    LogGroup = each.key
  })
}

# ============================================
# CloudWatch Metric Filters
# ============================================
resource "aws_cloudwatch_log_metric_filter" "main" {
  for_each = var.cloudwatch_config.create_log_groups ? { for combo in flatten([
    for lg_name, lg_config in var.log_groups : [
      for filter in lg_config.metric_filters : {
        log_group_name   = lg_name
        filter_name      = filter.name
        filter_pattern   = filter.pattern
        metric_name      = filter.metric_name
        metric_namespace = filter.metric_namespace
        metric_value     = filter.metric_value
        default_value    = filter.default_value
      }
    ]
  ]) : "${combo.log_group_name}-${combo.filter_name}" => combo } : {}

  name           = each.value.filter_name
  log_group_name = aws_cloudwatch_log_group.main[each.value.log_group_name].name
  pattern        = each.value.filter_pattern

  metric_transformation {
    name      = each.value.metric_name
    namespace = each.value.metric_namespace
    value     = each.value.metric_value
    default_value = each.value.default_value
  }
}

# ============================================
# CloudWatch Log Subscription Filters
# ============================================
resource "aws_cloudwatch_log_subscription_filter" "main" {
  for_each = var.cloudwatch_config.create_log_groups ? { for combo in flatten([
    for lg_name, lg_config in var.log_groups : [
      for filter in lg_config.subscription_filters : {
        log_group_name  = lg_name
        filter_name     = filter.name
        filter_pattern  = filter.filter_pattern
        destination_arn = filter.destination_arn
      }
    ]
  ]) : "${combo.log_group_name}-${combo.filter_name}" => combo } : {}

  name            = each.value.filter_name
  log_group_name  = aws_cloudwatch_log_group.main[each.value.log_group_name].name
  filter_pattern  = each.value.filter_pattern
  destination_arn = each.value.destination_arn
}

# ============================================
# SNS Topics for Alerts
# ============================================
resource "aws_sns_topic" "main" {
  for_each = var.notification_config.create_topics ? var.notification_config.topics : {}

  name                        = "${var.project_name}-${var.environment}-${each.value.name}"
  display_name               = each.value.display_name
  kms_master_key_id         = each.value.kms_master_key_id
  delivery_policy           = each.value.delivery_policy

  tags = merge(local.common_tags, {
    Name  = "${var.project_name}-${var.environment}-${each.value.name}"
    Topic = each.key
  })
}

# SNS Topic Subscriptions - Email
resource "aws_sns_topic_subscription" "email" {
  for_each = { for combo in flatten([
    for topic_name, topic_config in var.notification_config.topics : [
      for email in concat(topic_config.email_endpoints, topic_name == "alerts" ? local.alert_email_addresses : []) : {
        topic_name = topic_name
        email      = email
      }
    ]
  ]) : "${combo.topic_name}-${replace(combo.email, "/[^a-zA-Z0-9]/", "-")}" => combo if var.notification_config.create_topics }

  topic_arn = aws_sns_topic.main[each.value.topic_name].arn
  protocol  = "email"
  endpoint  = each.value.email
}

# SNS Topic Subscriptions - SMS
resource "aws_sns_topic_subscription" "sms" {
  for_each = { for combo in flatten([
    for topic_name, topic_config in var.notification_config.topics : [
      for phone in topic_config.sms_endpoints : {
        topic_name = topic_name
        phone      = phone
      }
    ]
  ]) : "${combo.topic_name}-${replace(combo.phone, "/[^a-zA-Z0-9]/", "-")}" => combo if var.notification_config.create_topics }

  topic_arn = aws_sns_topic.main[each.value.topic_name].arn
  protocol  = "sms"
  endpoint  = each.value.phone
}

# SNS Topic Subscriptions - Lambda
resource "aws_sns_topic_subscription" "lambda" {
  for_each = { for combo in flatten([
    for topic_name, topic_config in var.notification_config.topics : [
      for lambda_arn in topic_config.lambda_endpoints : {
        topic_name = topic_name
        lambda_arn = lambda_arn
      }
    ]
  ]) : "${combo.topic_name}-${basename(combo.lambda_arn)}" => combo if var.notification_config.create_topics }

  topic_arn = aws_sns_topic.main[each.value.topic_name].arn
  protocol  = "lambda"
  endpoint  = each.value.lambda_arn
}

# ============================================
# CloudWatch Alarms
# ============================================
resource "aws_cloudwatch_metric_alarm" "main" {
  for_each = var.alerts

  alarm_name          = "${var.project_name}-${var.environment}-${each.key}"
  comparison_operator = each.value.comparison_operator
  evaluation_periods  = each.value.evaluation_periods
  metric_name         = each.value.metric_name
  namespace           = each.value.namespace
  period              = each.value.period
  statistic           = each.value.statistic
  threshold           = each.value.threshold
  alarm_description   = each.value.description

  dimensions = each.value.dimensions

  alarm_actions             = length(each.value.alarm_actions) > 0 ? each.value.alarm_actions : (var.notification_config.create_topics ? [aws_sns_topic.main["alerts"].arn] : [])
  ok_actions               = length(each.value.ok_actions) > 0 ? each.value.ok_actions : []
  insufficient_data_actions = each.value.insufficient_data_actions

  datapoints_to_alarm = each.value.datapoints_to_alarm
  treat_missing_data  = each.value.treat_missing_data

  tags = merge(local.common_tags, {
    Name  = "${var.project_name}-${var.environment}-${each.key}"
    Alarm = each.key
  })
}

# ============================================
# Custom CloudWatch Metrics
# ============================================
resource "aws_cloudwatch_metric_alarm" "custom" {
  for_each = { for metric_name, metric_config in var.custom_metrics : metric_name => metric_config if metric_config.create_alarm && metric_config.alarm_config != null }

  alarm_name          = "${var.project_name}-${var.environment}-custom-${each.key}"
  comparison_operator = each.value.alarm_config.comparison_operator
  evaluation_periods  = each.value.alarm_config.evaluation_periods
  metric_name         = each.value.metric_name
  namespace           = each.value.namespace
  period              = each.value.alarm_config.period
  statistic           = each.value.alarm_config.statistic
  threshold           = each.value.alarm_config.threshold
  alarm_description   = "Custom metric alarm for ${each.key}"

  dimensions = each.value.dimensions

  alarm_actions = var.notification_config.create_topics ? [aws_sns_topic.main["critical_alerts"].arn] : []

  tags = merge(local.common_tags, {
    Name        = "${var.project_name}-${var.environment}-custom-${each.key}"
    CustomAlarm = each.key
  })
}

# ============================================
# CloudWatch Dashboards
# ============================================
resource "aws_cloudwatch_dashboard" "main" {
  for_each = var.dashboards

  dashboard_name = "${var.project_name}-${var.environment}-${each.key}"

  dashboard_body = jsonencode({
    widgets = [
      for widget in each.value.widgets : {
        type   = widget.type
        x      = widget.x
        y      = widget.y
        width  = widget.width
        height = widget.height

        properties = merge(widget.properties, {
          region = widget.properties.region != null ? widget.properties.region : var.aws_region
          title  = widget.properties.title != null ? widget.properties.title : "Untitled Widget"
        })
      }
    ]
  })
}

# ============================================
# X-Ray Configuration
# ============================================
resource "aws_xray_encryption_config" "main" {
  count = var.xray_config.enable_tracing && var.xray_config.enable_encryption ? 1 : 0

  type   = var.xray_config.kms_key_id != null ? "KMS" : "NONE"
  key_id = var.xray_config.kms_key_id
}

resource "aws_xray_sampling_rule" "main" {
  for_each = var.xray_config.enable_tracing ? { for rule in var.xray_config.sampling_rules : rule.rule_name => rule } : {}

  rule_name      = "${var.project_name}-${var.environment}-${each.value.rule_name}"
  priority       = each.value.priority
  version        = each.value.version
  reservoir_size = each.value.reservoir_size
  fixed_rate     = each.value.fixed_rate
  url_path       = each.value.url_path
  host           = each.value.host
  http_method    = each.value.http_method
  service_type   = each.value.service_type
  service_name   = each.value.service_name

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-${each.value.rule_name}"
  })
}

# ============================================
# Cost Monitoring - Budgets
# ============================================
resource "aws_budgets_budget" "main" {
  for_each = var.cost_monitoring.enable_budgets ? var.cost_monitoring.budgets : {}

  name         = "${var.project_name}-${var.environment}-${each.key}"
  budget_type  = each.value.budget_type
  limit_amount = each.value.limit_amount
  limit_unit   = each.value.limit_unit
  time_unit    = each.value.time_unit

  time_period_start = each.value.time_period_start

  cost_filters = each.value.cost_filters

  dynamic "notification" {
    for_each = each.value.notifications
    content {
      comparison_operator        = notification.value.comparison_operator
      threshold                 = notification.value.threshold
      threshold_type            = notification.value.threshold_type
      notification_type         = notification.value.notification_type
      subscriber_email_addresses = notification.value.subscriber_email_addresses
      subscriber_sns_topic_arns  = concat(
        notification.value.subscriber_sns_topic_arns,
        var.notification_config.create_topics ? [aws_sns_topic.main["alerts"].arn] : []
      )
    }
  }

  tags = merge(local.common_tags, {
    Name   = "${var.project_name}-${var.environment}-${each.key}"
    Budget = each.key
  })
}

# ============================================
# CloudWatch Synthetics (Canaries)
# ============================================
resource "aws_synthetics_canary" "operational_health" {
  count = var.environment == "production" ? 1 : 0

  name                 = "${var.project_name}-${var.environment}-health-check"
  artifact_s3_location = "s3://${aws_s3_bucket.canary_artifacts[0].bucket}/canary-artifacts/"
  execution_role_arn   = aws_iam_role.canary[0].arn
  handler              = "apiCanaryBlueprint.handler"
  zip_file             = data.archive_file.canary_zip[0].output_path
  runtime_version      = "syn-nodejs-puppeteer-6.2"

  schedule {
    expression = "rate(5 minutes)"
  }

  run_config {
    timeout_in_seconds    = 60
    memory_in_mb         = 960
    active_tracing       = var.xray_config.enable_tracing
  }

  success_retention_period = 2
  failure_retention_period = 14

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-health-check"
  })
}

# S3 bucket for canary artifacts
resource "aws_s3_bucket" "canary_artifacts" {
  count = var.environment == "production" ? 1 : 0

  bucket        = "${var.project_name}-${var.environment}-canary-artifacts-${random_id.canary_suffix[0].hex}"
  force_destroy = true

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-canary-artifacts"
  })
}

resource "random_id" "canary_suffix" {
  count       = var.environment == "production" ? 1 : 0
  byte_length = 4
}

resource "aws_s3_bucket_public_access_block" "canary_artifacts" {
  count = var.environment == "production" ? 1 : 0

  bucket = aws_s3_bucket.canary_artifacts[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Canary execution role
resource "aws_iam_role" "canary" {
  count = var.environment == "production" ? 1 : 0

  name = "${var.project_name}-${var.environment}-canary-execution-role"

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

resource "aws_iam_role_policy_attachment" "canary" {
  count = var.environment == "production" ? 1 : 0

  role       = aws_iam_role.canary[0].name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchSyntheticsExecutionRolePolicy"
}

# Canary script
data "archive_file" "canary_zip" {
  count = var.environment == "production" ? 1 : 0

  type        = "zip"
  output_path = "/tmp/canary.zip"

  source {
    content = templatefile("${path.module}/canary-script.js", {
      domain = var.project_name == "candlefish" ? "candlefish.ai" : "${var.project_name}.com"
    })
    filename = "nodejs/node_modules/apiCanaryBlueprint.js"
  }
}

# ============================================
# Application Insights
# ============================================
resource "aws_applicationinsights_application" "main" {
  count = var.environment == "production" ? 1 : 0

  resource_group_name = aws_resourcegroups_group.main[0].name
  auto_create         = true
  auto_config_enabled = true

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-insights"
  })
}

resource "aws_resourcegroups_group" "main" {
  count = var.environment == "production" ? 1 : 0

  name = "${var.project_name}-${var.environment}-resources"

  resource_query {
    query = jsonencode({
      ResourceTypeFilters = [
        "AWS::AllSupported"
      ]
      TagFilters = [
        {
          Key    = "Project"
          Values = [var.project_name]
        },
        {
          Key    = "Environment"
          Values = [var.environment]
        }
      ]
    })
  }

  tags = local.common_tags
}