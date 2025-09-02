# CloudWatch Monitoring and Alerting Configuration

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name = "${local.name_prefix}-alerts"

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-alerts"
    }
  )
}

resource "aws_sns_topic_subscription" "alert_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${local.name_prefix}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            for service_key, service in local.services : [
              "ECS/ContainerInsights",
              "CpuUtilized",
              {
                ServiceName = "${local.name_prefix}-${service.name}"
                ClusterName = local.cluster_name
              }
            ]
          ]
          period = 300
          stat   = "Average"
          region = data.aws_region.current.name
          title  = "ECS Service CPU Utilization"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            for service_key, service in local.services : [
              "ECS/ContainerInsights",
              "MemoryUtilized",
              {
                ServiceName = "${local.name_prefix}-${service.name}"
                ClusterName = local.cluster_name
              }
            ]
          ]
          period = 300
          stat   = "Average"
          region = data.aws_region.current.name
          title  = "ECS Service Memory Utilization"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", { LoadBalancer = aws_lb.main.arn_suffix }],
            [".", "RequestCount", { LoadBalancer = aws_lb.main.arn_suffix }],
            [".", "HTTPCode_Target_4XX_Count", { LoadBalancer = aws_lb.main.arn_suffix }],
            [".", "HTTPCode_Target_5XX_Count", { LoadBalancer = aws_lb.main.arn_suffix }]
          ]
          period = 300
          stat   = "Sum"
          region = data.aws_region.current.name
          title  = "ALB Metrics"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", { DBInstanceIdentifier = aws_db_instance.postgres.id }],
            [".", "DatabaseConnections", { DBInstanceIdentifier = aws_db_instance.postgres.id }],
            [".", "FreeableMemory", { DBInstanceIdentifier = aws_db_instance.postgres.id }],
            [".", "ReadLatency", { DBInstanceIdentifier = aws_db_instance.postgres.id }],
            [".", "WriteLatency", { DBInstanceIdentifier = aws_db_instance.postgres.id }]
          ]
          period = 300
          stat   = "Average"
          region = data.aws_region.current.name
          title  = "RDS Database Metrics"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ElastiCache", "CPUUtilization", { CacheClusterId = aws_elasticache_replication_group.main.id }],
            [".", "EngineCPUUtilization", { CacheClusterId = aws_elasticache_replication_group.main.id }],
            [".", "CurrConnections", { CacheClusterId = aws_elasticache_replication_group.main.id }],
            [".", "Evictions", { CacheClusterId = aws_elasticache_replication_group.main.id }],
            [".", "CacheHits", { CacheClusterId = aws_elasticache_replication_group.main.id }],
            [".", "CacheMisses", { CacheClusterId = aws_elasticache_replication_group.main.id }]
          ]
          period = 300
          stat   = "Average"
          region = data.aws_region.current.name
          title  = "ElastiCache Redis Metrics"
        }
      }
    ]
  })
}

# CloudWatch Alarms for ECS Services
resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high" {
  for_each = local.services

  alarm_name          = "${local.name_prefix}-${each.value.name}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "This metric monitors ECS CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ServiceName = aws_ecs_service.services[each.key].name
    ClusterName = aws_ecs_cluster.main.name
  }

  tags = merge(
    local.common_tags,
    {
      Name    = "${local.name_prefix}-${each.value.name}-cpu-alarm"
      Service = each.value.name
    }
  )
}

resource "aws_cloudwatch_metric_alarm" "ecs_memory_high" {
  for_each = local.services

  alarm_name          = "${local.name_prefix}-${each.value.name}-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "This metric monitors ECS memory utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ServiceName = aws_ecs_service.services[each.key].name
    ClusterName = aws_ecs_cluster.main.name
  }

  tags = merge(
    local.common_tags,
    {
      Name    = "${local.name_prefix}-${each.value.name}-memory-alarm"
      Service = each.value.name
    }
  )
}

# ALB Alarms
resource "aws_cloudwatch_metric_alarm" "alb_target_response_time" {
  alarm_name          = "${local.name_prefix}-alb-response-time"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Average"
  threshold           = 2
  alarm_description   = "ALB target response time is too high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-alb-response-time-alarm"
    }
  )
}

resource "aws_cloudwatch_metric_alarm" "alb_unhealthy_hosts" {
  alarm_name          = "${local.name_prefix}-alb-unhealthy-hosts"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Average"
  threshold           = 0
  alarm_description   = "ALB has unhealthy targets"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-alb-unhealthy-alarm"
    }
  )
}

resource "aws_cloudwatch_metric_alarm" "alb_5xx_errors" {
  alarm_name          = "${local.name_prefix}-alb-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "ALB 5XX errors are too high"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-alb-5xx-alarm"
    }
  )
}

# RDS Alarms
resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "${local.name_prefix}-rds-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "RDS CPU utilization is too high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.postgres.id
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-rds-cpu-alarm"
    }
  )
}

resource "aws_cloudwatch_metric_alarm" "rds_storage" {
  alarm_name          = "${local.name_prefix}-rds-storage-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 10737418240  # 10 GB in bytes
  alarm_description   = "RDS free storage space is low"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.postgres.id
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-rds-storage-alarm"
    }
  )
}

resource "aws_cloudwatch_metric_alarm" "rds_connections" {
  alarm_name          = "${local.name_prefix}-rds-connections-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 180  # 90% of max_connections (200)
  alarm_description   = "RDS connection count is high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.postgres.id
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-rds-connections-alarm"
    }
  )
}

# ElastiCache Alarms
resource "aws_cloudwatch_metric_alarm" "elasticache_cpu" {
  alarm_name          = "${local.name_prefix}-redis-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "EngineCPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Redis CPU utilization is too high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main.id
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-redis-cpu-alarm"
    }
  )
}

resource "aws_cloudwatch_metric_alarm" "elasticache_evictions" {
  alarm_name          = "${local.name_prefix}-redis-evictions"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Evictions"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Sum"
  threshold           = 1000
  alarm_description   = "Redis evictions are too high"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main.id
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-redis-evictions-alarm"
    }
  )
}

# X-Ray Tracing
resource "aws_xray_sampling_rule" "main" {
  rule_name      = "${local.name_prefix}-sampling"
  priority       = 1000
  version        = 1
  reservoir_size = 1
  fixed_rate     = 0.05
  url_path       = "*"
  host           = "*"
  http_method    = "*"
  service_type   = "*"
  service_name   = "*"
  resource_arn   = "*"

  attributes = {
    environment = var.environment
  }

  tags = local.common_tags
}

# CloudWatch Logs Insights Queries
resource "aws_cloudwatch_query_definition" "error_analysis" {
  name = "${local.name_prefix}-error-analysis"

  log_group_names = [
    for service_key, service in local.services : aws_cloudwatch_log_group.ecs_services[service_key].name
  ]

  query_string = <<-EOT
    fields @timestamp, @message, @logStream
    | filter @message like /ERROR/
    | stats count() by bin(5m)
  EOT
}

resource "aws_cloudwatch_query_definition" "performance_analysis" {
  name = "${local.name_prefix}-performance-analysis"

  log_group_names = [
    for service_key, service in local.services : aws_cloudwatch_log_group.ecs_services[service_key].name
  ]

  query_string = <<-EOT
    fields @timestamp, @message
    | filter @message like /response_time/
    | parse @message /response_time: (?<responseTime>\d+)/
    | stats avg(responseTime) as avg_response_time,
            max(responseTime) as max_response_time,
            min(responseTime) as min_response_time
    by bin(5m)
  EOT
}

# EventBridge Rule for automated responses
resource "aws_cloudwatch_event_rule" "high_error_rate" {
  name        = "${local.name_prefix}-high-error-rate"
  description = "Trigger when error rate is high"

  event_pattern = jsonencode({
    source      = ["aws.cloudwatch"]
    detail-type = ["CloudWatch Alarm State Change"]
    detail = {
      alarmName = [
        for service_key, service in local.services : "${local.name_prefix}-${service.name}-5xx-errors"
      ]
      state = {
        value = ["ALARM"]
      }
    }
  })

  tags = local.common_tags
}

resource "aws_cloudwatch_event_target" "sns" {
  rule      = aws_cloudwatch_event_rule.high_error_rate.name
  target_id = "SendToSNS"
  arn       = aws_sns_topic.alerts.arn
}