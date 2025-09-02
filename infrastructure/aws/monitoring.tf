# Claude Configuration System - Monitoring and Auto Scaling

# SNS Topic for alerts
resource "aws_sns_topic" "alerts" {
  name              = "${var.project_name}-alerts"
  kms_master_key_id = aws_kms_key.main.arn

  tags = {
    Name = "${var.project_name}-alerts"
  }
}

resource "aws_sns_topic_subscription" "email_alerts" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
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
            ["AWS/ECS", "CPUUtilization", "ServiceName", var.ecs_services.api.name, "ClusterName", aws_ecs_cluster.main.name],
            [".", "MemoryUtilization", ".", ".", ".", "."],
            ["AWS/ECS", "CPUUtilization", "ServiceName", var.ecs_services.analytics.name, "ClusterName", aws_ecs_cluster.main.name],
            [".", "MemoryUtilization", ".", ".", ".", "."],
            ["AWS/ECS", "CPUUtilization", "ServiceName", var.ecs_services.router.name, "ClusterName", aws_ecs_cluster.main.name],
            [".", "MemoryUtilization", ".", ".", ".", "."],
            ["AWS/ECS", "CPUUtilization", "ServiceName", var.ecs_services.monitor.name, "ClusterName", aws_ecs_cluster.main.name],
            [".", "MemoryUtilization", ".", ".", ".", "."]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "ECS Services CPU and Memory Utilization"
          yAxis = {
            left = {
              min = 0
              max = 100
            }
          }
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
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", aws_lb.main.arn_suffix],
            [".", "TargetResponseTime", ".", "."],
            [".", "HTTPCode_Target_2XX_Count", ".", "."],
            [".", "HTTPCode_Target_4XX_Count", ".", "."],
            [".", "HTTPCode_Target_5XX_Count", ".", "."]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "Application Load Balancer Metrics"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 6
        height = 6

        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", aws_db_instance.main.id],
            [".", "DatabaseConnections", ".", "."],
            [".", "FreeableMemory", ".", "."]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "RDS Database Metrics"
        }
      },
      {
        type   = "metric"
        x      = 6
        y      = 12
        width  = 6
        height = 6

        properties = {
          metrics = [
            ["AWS/ElastiCache", "CPUUtilization", "CacheClusterId", "${aws_elasticache_replication_group.main.replication_group_id}-001"],
            [".", "DatabaseMemoryUsagePercentage", ".", "."],
            [".", "CurrConnections", ".", "."],
            [".", "CacheHitRate", ".", "."]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "Redis Cache Metrics"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 18
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/CloudFront", "Requests", "DistributionId", aws_cloudfront_distribution.main.id],
            [".", "BytesDownloaded", ".", "."],
            [".", "4xxErrorRate", ".", "."],
            [".", "5xxErrorRate", ".", "."],
            [".", "OriginLatency", ".", "."]
          ]
          period = 300
          stat   = "Sum"
          region = "us-east-1" # CloudFront metrics are always in us-east-1
          title  = "CloudFront Distribution Metrics"
        }
      }
    ]
  })
}

# Auto Scaling Policies for ECS Services
resource "aws_appautoscaling_policy" "ecs_cpu_up" {
  for_each = var.ecs_services

  name               = "${each.value.name}-cpu-scale-up"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    target_value       = var.autoscaling_target_cpu
    scale_in_cooldown  = var.autoscaling_scale_in_cooldown
    scale_out_cooldown = var.autoscaling_scale_out_cooldown

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
  }
}

resource "aws_appautoscaling_policy" "ecs_memory_up" {
  for_each = var.ecs_services

  name               = "${each.value.name}-memory-scale-up"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    target_value       = var.autoscaling_target_memory
    scale_in_cooldown  = var.autoscaling_scale_in_cooldown
    scale_out_cooldown = var.autoscaling_scale_out_cooldown

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
  }
}

# CloudWatch Alarms for ECS Services
resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high" {
  for_each = var.ecs_services

  alarm_name          = "${each.value.name}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "90"
  alarm_description   = "This metric monitors ${each.value.name} CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ServiceName = each.value.name
    ClusterName = aws_ecs_cluster.main.name
  }

  tags = {
    Name = "${each.value.name}-cpu-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "ecs_memory_high" {
  for_each = var.ecs_services

  alarm_name          = "${each.value.name}-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "90"
  alarm_description   = "This metric monitors ${each.value.name} memory utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ServiceName = each.value.name
    ClusterName = aws_ecs_cluster.main.name
  }

  tags = {
    Name = "${each.value.name}-memory-alarm"
  }
}

# ALB Target Health Alarms
resource "aws_cloudwatch_metric_alarm" "alb_unhealthy_targets" {
  for_each = var.ecs_services

  alarm_name          = "${each.value.name}-unhealthy-targets"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Average"
  threshold           = "0"
  alarm_description   = "This metric monitors unhealthy targets for ${each.value.name}"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    TargetGroup  = aws_lb_target_group.services[each.key].arn_suffix
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = {
    Name = "${each.value.name}-unhealthy-targets-alarm"
  }
}

# ALB Response Time Alarm
resource "aws_cloudwatch_metric_alarm" "alb_response_time" {
  alarm_name          = "${var.project_name}-alb-response-time-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Average"
  threshold           = "2"
  alarm_description   = "This metric monitors ALB response time"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = {
    Name = "${var.project_name}-alb-response-time-alarm"
  }
}

# ALB 5XX Error Rate Alarm
resource "aws_cloudwatch_metric_alarm" "alb_5xx_errors" {
  alarm_name          = "${var.project_name}-alb-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors ALB 5XX errors"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = {
    Name = "${var.project_name}-alb-5xx-errors-alarm"
  }
}

# Custom CloudWatch Log Insights Queries
resource "aws_cloudwatch_query_definition" "error_logs" {
  name = "${var.project_name}-error-logs"

  log_group_names = [
    for service in var.ecs_services : aws_cloudwatch_log_group.ecs[keys(var.ecs_services)[index(values(var.ecs_services), service)]].name
  ]

  query_string = <<EOF
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 100
EOF
}

resource "aws_cloudwatch_query_definition" "slow_requests" {
  name = "${var.project_name}-slow-requests"

  log_group_names = [
    for service in var.ecs_services : aws_cloudwatch_log_group.ecs[keys(var.ecs_services)[index(values(var.ecs_services), service)]].name
  ]

  query_string = <<EOF
fields @timestamp, @message
| filter @message like /response_time/
| parse @message /response_time=(?<response_time>\d+)/
| filter response_time > 1000
| sort @timestamp desc
| limit 50
EOF
}

resource "aws_cloudwatch_query_definition" "api_usage" {
  name = "${var.project_name}-api-usage"

  log_group_names = [aws_cloudwatch_log_group.ecs["api"].name]

  query_string = <<EOF
fields @timestamp, @message
| parse @message /method=(?<method>\w+) path=(?<path>\/\S+) status=(?<status>\d+)/
| stats count() as request_count by path, method, status
| sort request_count desc
| limit 20
EOF
}

# CloudWatch Composite Alarms
resource "aws_cloudwatch_composite_alarm" "service_health" {
  for_each = var.ecs_services

  alarm_name        = "${each.value.name}-service-health"
  alarm_description = "Composite alarm for ${each.value.name} service health"
  
  alarm_rule = format("(ALARM('%s') OR ALARM('%s')) AND ALARM('%s')",
    aws_cloudwatch_metric_alarm.ecs_cpu_high[each.key].alarm_name,
    aws_cloudwatch_metric_alarm.ecs_memory_high[each.key].alarm_name,
    aws_cloudwatch_metric_alarm.alb_unhealthy_targets[each.key].alarm_name
  )

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Name = "${each.value.name}-service-health-composite"
  }
}

# Application Insights
resource "aws_applicationinsights_application" "main" {
  resource_group_name = aws_resourcegroups_group.main.name
  auto_config_enabled = true
  cwe_monitor_enabled = true
  log_patterns {
    pattern_name = "ECSLogPattern"
    pattern      = "[timestamp, request_id=\"*\", level, message]"
    rank         = 1
  }

  tags = {
    Name = "${var.project_name}-app-insights"
  }
}

# Resource Group for Application Insights
resource "aws_resourcegroups_group" "main" {
  name = "${var.project_name}-resources"

  resource_query {
    query = jsonencode({
      ResourceTypeFilters = [
        "AWS::ECS::Service",
        "AWS::ECS::Cluster",
        "AWS::ElasticLoadBalancingV2::LoadBalancer",
        "AWS::RDS::DBInstance",
        "AWS::ElastiCache::ReplicationGroup"
      ]
      TagFilters = [
        {
          Key    = "Project"
          Values = ["Claude Configuration System"]
        }
      ]
    })
  }

  tags = {
    Name = "${var.project_name}-resource-group"
  }
}

# X-Ray Tracing (if enabled)
resource "aws_xray_sampling_rule" "main" {
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

  tags = {
    Name = "${var.project_name}-xray-sampling"
  }
}

# Cost Anomaly Detection
resource "aws_ce_anomaly_detector" "main" {
  name         = "${var.project_name}-cost-anomaly-detector"
  monitor_type = "DIMENSIONAL"

  specification = jsonencode({
    Dimension = "SERVICE"
    MatchOptions = ["EQUALS"]
    Values = [
      "Amazon Elastic Container Service",
      "Amazon Relational Database Service",
      "Amazon ElastiCache",
      "Amazon Route 53",
      "Amazon CloudFront"
    ]
  })

  tags = {
    Name = "${var.project_name}-cost-anomaly-detector"
  }
}

resource "aws_ce_anomaly_subscription" "main" {
  name      = "${var.project_name}-cost-anomaly-subscription"
  frequency = "DAILY"
  
  monitor_arn_list = [
    aws_ce_anomaly_detector.main.arn
  ]

  subscriber {
    type    = "EMAIL"
    address = var.alert_email
  }

  tags = {
    Name = "${var.project_name}-cost-anomaly-subscription"
  }
}

# CloudWatch Events Rule for ECS Task State Changes
resource "aws_cloudwatch_event_rule" "ecs_task_state" {
  name        = "${var.project_name}-ecs-task-state"
  description = "Capture ECS task state changes"

  event_pattern = jsonencode({
    source      = ["aws.ecs"]
    detail-type = ["ECS Task State Change"]
    detail = {
      clusterArn = [aws_ecs_cluster.main.arn]
      lastStatus = ["STOPPED"]
    }
  })

  tags = {
    Name = "${var.project_name}-ecs-task-state-rule"
  }
}

resource "aws_cloudwatch_event_target" "ecs_task_state" {
  rule      = aws_cloudwatch_event_rule.ecs_task_state.name
  target_id = "ECSTaskStateTarget"
  arn       = aws_sns_topic.alerts.arn
}

# Lambda function for custom metrics (optional)
data "archive_file" "custom_metrics_lambda" {
  type        = "zip"
  output_path = "/tmp/custom_metrics.zip"
  
  source {
    content = <<EOF
import json
import boto3
import os

def lambda_handler(event, context):
    cloudwatch = boto3.client('cloudwatch')
    
    # Custom metric: Active configurations
    cloudwatch.put_metric_data(
        Namespace='${var.project_name}/Custom',
        MetricData=[
            {
                'MetricName': 'ActiveConfigurations',
                'Value': 100,  # This would be fetched from your API
                'Unit': 'Count'
            }
        ]
    )
    
    return {
        'statusCode': 200,
        'body': json.dumps('Custom metrics published')
    }
EOF
    filename = "lambda_function.py"
  }
}

resource "aws_lambda_function" "custom_metrics" {
  filename         = data.archive_file.custom_metrics_lambda.output_path
  function_name    = "${var.project_name}-custom-metrics"
  role            = aws_iam_role.lambda_custom_metrics.arn
  handler         = "lambda_function.lambda_handler"
  source_code_hash = data.archive_file.custom_metrics_lambda.output_base64sha256
  runtime         = "python3.9"
  timeout         = 60

  environment {
    variables = {
      PROJECT_NAME = var.project_name
    }
  }

  tags = {
    Name = "${var.project_name}-custom-metrics-lambda"
  }
}

# IAM role for custom metrics Lambda
resource "aws_iam_role" "lambda_custom_metrics" {
  name = "${var.project_name}-lambda-custom-metrics-role"

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

  tags = {
    Name = "${var.project_name}-lambda-custom-metrics-role"
  }
}

resource "aws_iam_role_policy_attachment" "lambda_custom_metrics_basic" {
  role       = aws_iam_role.lambda_custom_metrics.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_custom_metrics_cloudwatch" {
  name = "${var.project_name}-lambda-custom-metrics-policy"
  role = aws_iam_role.lambda_custom_metrics.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData"
        ]
        Resource = "*"
      }
    ]
  })
}

# EventBridge rule to trigger custom metrics Lambda
resource "aws_cloudwatch_event_rule" "custom_metrics_schedule" {
  name                = "${var.project_name}-custom-metrics-schedule"
  description         = "Trigger custom metrics collection every 5 minutes"
  schedule_expression = "rate(5 minutes)"

  tags = {
    Name = "${var.project_name}-custom-metrics-schedule"
  }
}

resource "aws_cloudwatch_event_target" "custom_metrics_lambda" {
  rule      = aws_cloudwatch_event_rule.custom_metrics_schedule.name
  target_id = "CustomMetricsLambdaTarget"
  arn       = aws_lambda_function.custom_metrics.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.custom_metrics.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.custom_metrics_schedule.arn
}