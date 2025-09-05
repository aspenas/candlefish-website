# Cost Optimization Configuration for Candlefish.ai
# Implements intelligent resource scaling and cost management

# Spot Fleet for non-critical workloads
resource "aws_spot_fleet_request" "background_workers" {
  iam_fleet_role                      = aws_iam_role.spot_fleet.arn
  allocation_strategy                 = "lowestPrice"
  target_capacity                     = var.spot_target_capacity
  valid_until                        = "2025-12-31T23:59:59Z"
  terminate_instances_with_expiration = true
  instance_interruption_behavior      = "terminate"
  
  launch_specification {
    instance_type        = "t3.medium"
    ami                  = data.aws_ami.ecs_optimized.id
    key_name            = var.key_pair_name
    security_groups     = [aws_security_group.worker.id]
    iam_instance_profile = aws_iam_instance_profile.ecs_instance.name
    
    user_data = base64encode(templatefile("${path.module}/user-data/ecs-worker.sh", {
      cluster_name = aws_ecs_cluster.main.name
      region       = var.aws_region
    }))
    
    spot_price = "0.02"
    weighted_capacity = 1
  }
  
  launch_specification {
    instance_type        = "t3a.medium"
    ami                  = data.aws_ami.ecs_optimized.id
    key_name            = var.key_pair_name
    security_groups     = [aws_security_group.worker.id]
    iam_instance_profile = aws_iam_instance_profile.ecs_instance.name
    
    user_data = base64encode(templatefile("${path.module}/user-data/ecs-worker.sh", {
      cluster_name = aws_ecs_cluster.main.name
      region       = var.aws_region
    }))
    
    spot_price = "0.019"
    weighted_capacity = 1
  }
  
  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-candlefish-spot-workers"
      CostCenter = "optimization"
    }
  )
}

# Auto Scaling with predictive scaling
resource "aws_autoscaling_policy" "predictive_scaling" {
  name                   = "${var.environment}-predictive-scaling"
  autoscaling_group_name = aws_autoscaling_group.ecs_asg.name
  policy_type           = "PredictiveScaling"
  
  predictive_scaling_configuration {
    metric_specification {
      target_value = 70
      
      customized_load_metric_specification {
        metric_data_queries {
          id = "load_metric"
          
          metric_stat {
            metric {
              namespace   = "AWS/ApplicationELB"
              metric_name = "RequestCountPerTarget"
              
              dimensions {
                name  = "TargetGroup"
                value = aws_lb_target_group.main.arn_suffix
              }
            }
            stat = "Average"
          }
        }
      }
      
      customized_capacity_metric_specification {
        metric_data_queries {
          id = "capacity_metric"
          
          metric_stat {
            metric {
              namespace   = "AWS/AutoScaling"
              metric_name = "GroupDesiredCapacity"
              
              dimensions {
                name  = "AutoScalingGroupName"
                value = aws_autoscaling_group.ecs_asg.name
              }
            }
            stat = "Average"
          }
        }
      }
    }
    
    mode                          = "ForecastAndScale"
    scheduling_buffer_time        = 120
    max_capacity_breach_behavior  = "IncreaseMaxCapacity"
    max_capacity_buffer           = 10
  }
}

# Scheduled scaling for predictable patterns
resource "aws_autoscaling_schedule" "business_hours" {
  scheduled_action_name  = "business-hours-scaling"
  autoscaling_group_name = aws_autoscaling_group.ecs_asg.name
  min_size              = 3
  max_size              = 10
  desired_capacity      = 5
  recurrence            = "0 8 * * MON-FRI"
}

resource "aws_autoscaling_schedule" "after_hours" {
  scheduled_action_name  = "after-hours-scaling"
  autoscaling_group_name = aws_autoscaling_group.ecs_asg.name
  min_size              = 1
  max_size              = 3
  desired_capacity      = 1
  recurrence            = "0 20 * * MON-FRI"
}

resource "aws_autoscaling_schedule" "weekend" {
  scheduled_action_name  = "weekend-scaling"
  autoscaling_group_name = aws_autoscaling_group.ecs_asg.name
  min_size              = 1
  max_size              = 2
  desired_capacity      = 1
  recurrence            = "0 0 * * SAT"
}

# S3 Intelligent-Tiering for cost-effective storage
resource "aws_s3_bucket_intelligent_tiering_configuration" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id
  name   = "EntireBucket"
  
  status = "Enabled"
  
  tiering {
    access_tier = "ARCHIVE_ACCESS"
    days        = 90
  }
  
  tiering {
    access_tier = "DEEP_ARCHIVE_ACCESS"
    days        = 180
  }
  
  filter {
    prefix = "archives/"
  }
}

# DynamoDB auto-scaling for cost optimization
resource "aws_appautoscaling_target" "dynamodb_read" {
  max_capacity       = 100
  min_capacity       = 5
  resource_id        = "table/${aws_dynamodb_table.sessions.name}"
  scalable_dimension = "dynamodb:table:ReadCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "dynamodb_read_policy" {
  name               = "${var.environment}-dynamodb-read-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.dynamodb_read.resource_id
  scalable_dimension = aws_appautoscaling_target.dynamodb_read.scalable_dimension
  service_namespace  = aws_appautoscaling_target.dynamodb_read.service_namespace
  
  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBReadCapacityUtilization"
    }
    target_value = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Reserved Capacity planning
resource "aws_budgets_budget" "cost_management" {
  name              = "${var.environment}-candlefish-monthly-budget"
  budget_type       = "COST"
  limit_amount      = var.monthly_budget_limit
  limit_unit        = "USD"
  time_period_start = "2024-01-01_00:00"
  time_unit         = "MONTHLY"
  
  cost_filters = {
    Service = "Amazon Elastic Compute Cloud - Compute"
  }
  
  cost_types {
    include_credit             = false
    include_discount           = true
    include_other_subscription = false
    include_recurring          = true
    include_refund            = false
    include_subscription       = true
    include_support            = false
    include_tax                = false
    include_upfront            = false
    use_amortized              = true
    use_blended                = false
  }
  
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "FORECASTED"
    subscriber_email_addresses = var.budget_notification_emails
  }
  
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = var.budget_notification_emails
  }
}

# Lambda for cost optimization recommendations
resource "aws_lambda_function" "cost_optimizer" {
  filename         = "${path.module}/lambdas/cost-optimizer.zip"
  function_name    = "${var.environment}-candlefish-cost-optimizer"
  role            = aws_iam_role.cost_optimizer.arn
  handler         = "index.handler"
  source_code_hash = filebase64sha256("${path.module}/lambdas/cost-optimizer.zip")
  runtime         = "nodejs20.x"
  timeout         = 300
  memory_size     = 1024
  
  environment {
    variables = {
      ENVIRONMENT = var.environment
      SNS_TOPIC   = aws_sns_topic.cost_alerts.arn
      S3_BUCKET   = aws_s3_bucket.cost_reports.id
    }
  }
  
  tags = var.tags
}

# CloudWatch Events rule to run cost optimizer daily
resource "aws_cloudwatch_event_rule" "cost_optimizer_schedule" {
  name                = "${var.environment}-cost-optimizer-schedule"
  description         = "Trigger cost optimizer Lambda daily"
  schedule_expression = "cron(0 6 * * ? *)"
}

resource "aws_cloudwatch_event_target" "cost_optimizer_target" {
  rule      = aws_cloudwatch_event_rule.cost_optimizer_schedule.name
  target_id = "CostOptimizerLambda"
  arn       = aws_lambda_function.cost_optimizer.arn
}

resource "aws_lambda_permission" "allow_cloudwatch" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cost_optimizer.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.cost_optimizer_schedule.arn
}

# Cost allocation tags
resource "aws_ce_cost_allocation_tag" "environment" {
  tag_key = "Environment"
  status  = "Active"
}

resource "aws_ce_cost_allocation_tag" "project" {
  tag_key = "Project"
  status  = "Active"
}

resource "aws_ce_cost_allocation_tag" "cost_center" {
  tag_key = "CostCenter"
  status  = "Active"
}

# Compute Savings Plan
resource "aws_savingsplans_plan" "compute" {
  commitment          = var.savings_plan_commitment
  payment_option     = "ALL_UPFRONT"
  savings_plan_type  = "COMPUTE"
  term_in_years      = 1
  
  tags = var.tags
}

# CloudWatch Dashboard for cost monitoring
resource "aws_cloudwatch_dashboard" "cost_monitoring" {
  dashboard_name = "${var.environment}-candlefish-cost-monitoring"
  
  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/Billing", "EstimatedCharges", { stat = "Maximum", label = "Estimated Monthly Charges" }]
          ]
          period = 86400
          stat = "Maximum"
          region = "us-east-1"
          title = "Estimated Monthly AWS Charges"
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/EC2", "InstanceCount", { stat = "Average", label = "EC2 Instance Count" }],
            ["AWS/ECS", "ServiceCount", { stat = "Average", label = "ECS Service Count" }]
          ]
          period = 3600
          stat = "Average"
          region = var.aws_region
          title = "Resource Utilization"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/Lambda", "Invocations", { stat = "Sum", label = "Lambda Invocations" }],
            ["AWS/Lambda", "Duration", { stat = "Average", label = "Lambda Duration (ms)" }]
          ]
          period = 3600
          stat = "Sum"
          region = var.aws_region
          title = "Serverless Utilization"
        }
      }
    ]
  })
}

# Outputs for cost tracking
output "monthly_budget_id" {
  value = aws_budgets_budget.cost_management.id
  description = "ID of the monthly cost budget"
}

output "cost_dashboard_url" {
  value = "https://console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.cost_monitoring.dashboard_name}"
  description = "URL to the cost monitoring dashboard"
}

output "savings_plan_id" {
  value = aws_savingsplans_plan.compute.id
  description = "ID of the compute savings plan"
}