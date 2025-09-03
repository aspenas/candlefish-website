# Enhanced Terraform Configuration for Candlefish Animation Production Deployment
# Focuses on animation performance, analytics, and blue-green deployment

# DynamoDB Tables for Candlefish Analytics
resource "aws_dynamodb_table" "candlefish_analytics" {
  name           = "${var.environment}-candlefish-animation-analytics"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "session_id"
  range_key      = "timestamp"

  attribute {
    name = "session_id"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "N"
  }

  attribute {
    name = "mood_state"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  # Global Secondary Index for mood state analysis
  global_secondary_index {
    name     = "MoodStateIndex"
    hash_key = "mood_state"
    range_key = "timestamp"
  }

  # Global Secondary Index for user analysis
  global_secondary_index {
    name     = "UserAnalyticsIndex" 
    hash_key = "user_id"
    range_key = "timestamp"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(local.common_tags, {
    Component = "CandlefishAnalytics"
    DataType  = "UserInteractions"
  })
}

# A/B Testing Configuration Table
resource "aws_dynamodb_table" "ab_testing_config" {
  name         = "${var.environment}-candlefish-ab-testing"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "experiment_id"

  attribute {
    name = "experiment_id"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  global_secondary_index {
    name     = "StatusIndex"
    hash_key = "status"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(local.common_tags, {
    Component = "ABTesting"
    Purpose   = "FeatureToggling"
  })
}

# Candlefish Memory Persistence Table
resource "aws_dynamodb_table" "candlefish_memory" {
  name         = "${var.environment}-candlefish-memory"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "user_hash"

  attribute {
    name = "user_hash"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(local.common_tags, {
    Component = "CandlefishMemory"
    DataType  = "PersonalityData"
  })
}

# Lambda Function for Analytics Processing
resource "aws_lambda_function" "candlefish_analytics_processor" {
  filename         = "candlefish-analytics.zip"
  function_name    = "${var.environment}-candlefish-analytics-processor"
  role            = aws_iam_role.candlefish_lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 30
  memory_size     = 256

  environment {
    variables = {
      ANALYTICS_TABLE_NAME = aws_dynamodb_table.candlefish_analytics.name
      MEMORY_TABLE_NAME    = aws_dynamodb_table.candlefish_memory.name
      ENVIRONMENT         = var.environment
      CORS_ORIGIN         = "https://${var.domain_name}"
    }
  }

  reserved_concurrent_executions = 50

  dead_letter_config {
    target_arn = aws_sqs_queue.candlefish_dlq.arn
  }

  tags = merge(local.common_tags, {
    Component = "AnalyticsProcessor"
    Runtime   = "nodejs18.x"
  })
}

# Lambda Function for A/B Testing Configuration
resource "aws_lambda_function" "candlefish_ab_config" {
  filename         = "candlefish-ab-config.zip"
  function_name    = "${var.environment}-candlefish-ab-config"
  role            = aws_iam_role.candlefish_lambda_role.arn
  handler         = "ab-config.handler"
  runtime         = "nodejs18.x"
  timeout         = 15
  memory_size     = 128

  environment {
    variables = {
      AB_TESTING_TABLE_NAME = aws_dynamodb_table.ab_testing_config.name
      ENVIRONMENT          = var.environment
    }
  }

  tags = merge(local.common_tags, {
    Component = "ABTesting"
    Purpose   = "ConfigurationAPI"
  })
}

# IAM Role for Candlefish Lambda Functions
resource "aws_iam_role" "candlefish_lambda_role" {
  name = "${var.environment}-candlefish-lambda-role"

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

# IAM Policies for Lambda Functions
resource "aws_iam_role_policy_attachment" "candlefish_lambda_basic" {
  role       = aws_iam_role.candlefish_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "candlefish_lambda_dynamodb" {
  name = "${var.environment}-candlefish-lambda-dynamodb"
  role = aws_iam_role.candlefish_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.candlefish_analytics.arn,
          "${aws_dynamodb_table.candlefish_analytics.arn}/*",
          aws_dynamodb_table.candlefish_memory.arn,
          "${aws_dynamodb_table.candlefish_memory.arn}/*",
          aws_dynamodb_table.ab_testing_config.arn,
          "${aws_dynamodb_table.ab_testing_config.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage"
        ]
        Resource = aws_sqs_queue.candlefish_dlq.arn
      }
    ]
  })
}

# SQS Dead Letter Queue
resource "aws_sqs_queue" "candlefish_dlq" {
  name                       = "${var.environment}-candlefish-analytics-dlq"
  message_retention_seconds  = 1209600 # 14 days
  visibility_timeout_seconds = 300

  tags = merge(local.common_tags, {
    Component = "DeadLetterQueue"
    Purpose   = "ErrorHandling"
  })
}

# API Gateway for Candlefish Animation APIs
resource "aws_api_gateway_rest_api" "candlefish_api" {
  name        = "${var.environment}-candlefish-animation-api"
  description = "API endpoints for Candlefish animation analytics and configuration"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = merge(local.common_tags, {
    Component = "APIGateway"
    Purpose   = "CandlefishAPIs"
  })
}

# API Gateway Resources and Methods
resource "aws_api_gateway_resource" "analytics" {
  rest_api_id = aws_api_gateway_rest_api.candlefish_api.id
  parent_id   = aws_api_gateway_rest_api.candlefish_api.root_resource_id
  path_part   = "analytics"
}

resource "aws_api_gateway_resource" "ab_config" {
  rest_api_id = aws_api_gateway_rest_api.candlefish_api.id
  parent_id   = aws_api_gateway_rest_api.candlefish_api.root_resource_id
  path_part   = "ab-config"
}

resource "aws_api_gateway_resource" "memory" {
  rest_api_id = aws_api_gateway_rest_api.candlefish_api.id
  parent_id   = aws_api_gateway_rest_api.candlefish_api.root_resource_id
  path_part   = "memory"
}

# Analytics POST endpoint
resource "aws_api_gateway_method" "analytics_post" {
  rest_api_id   = aws_api_gateway_rest_api.candlefish_api.id
  resource_id   = aws_api_gateway_resource.analytics.id
  http_method   = "POST"
  authorization = "NONE"
  
  request_parameters = {
    "method.request.header.Origin" = false
  }
}

resource "aws_api_gateway_integration" "analytics_lambda" {
  rest_api_id = aws_api_gateway_rest_api.candlefish_api.id
  resource_id = aws_api_gateway_resource.analytics.id
  http_method = aws_api_gateway_method.analytics_post.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.candlefish_analytics_processor.invoke_arn
}

# Lambda permissions for API Gateway
resource "aws_lambda_permission" "allow_api_gateway_analytics" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.candlefish_analytics_processor.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.candlefish_api.execution_arn}/*/*/*"
}

resource "aws_lambda_permission" "allow_api_gateway_ab_config" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.candlefish_ab_config.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.candlefish_api.execution_arn}/*/*/*"
}

# CORS configuration for all endpoints
resource "aws_api_gateway_method" "analytics_options" {
  rest_api_id   = aws_api_gateway_rest_api.candlefish_api.id
  resource_id   = aws_api_gateway_resource.analytics.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "analytics_options" {
  rest_api_id = aws_api_gateway_rest_api.candlefish_api.id
  resource_id = aws_api_gateway_resource.analytics.id
  http_method = aws_api_gateway_method.analytics_options.http_method

  type                 = "MOCK"
  passthrough_behavior = "WHEN_NO_MATCH"

  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

resource "aws_api_gateway_method_response" "analytics_options" {
  rest_api_id = aws_api_gateway_rest_api.candlefish_api.id
  resource_id = aws_api_gateway_resource.analytics.id
  http_method = aws_api_gateway_method.analytics_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "analytics_options" {
  rest_api_id = aws_api_gateway_rest_api.candlefish_api.id
  resource_id = aws_api_gateway_resource.analytics.id
  http_method = aws_api_gateway_method.analytics_options.http_method
  status_code = aws_api_gateway_method_response.analytics_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Session-Id'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS,GET'"
    "method.response.header.Access-Control-Allow-Origin"  = "'https://${var.domain_name}'"
  }
}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "candlefish_api" {
  rest_api_id = aws_api_gateway_rest_api.candlefish_api.id
  stage_name  = var.environment

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.analytics.id,
      aws_api_gateway_method.analytics_post.id,
      aws_api_gateway_integration.analytics_lambda.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_api_gateway_method.analytics_post,
    aws_api_gateway_integration.analytics_lambda,
    aws_api_gateway_method.analytics_options,
    aws_api_gateway_integration.analytics_options
  ]
}

# CloudWatch Log Groups for Lambda Functions
resource "aws_cloudwatch_log_group" "candlefish_analytics_logs" {
  name              = "/aws/lambda/${aws_lambda_function.candlefish_analytics_processor.function_name}"
  retention_in_days = 14

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "candlefish_ab_config_logs" {
  name              = "/aws/lambda/${aws_lambda_function.candlefish_ab_config.function_name}"
  retention_in_days = 14

  tags = local.common_tags
}

# CloudWatch Alarms for Performance Monitoring
resource "aws_cloudwatch_metric_alarm" "candlefish_high_error_rate" {
  alarm_name          = "${var.environment}-candlefish-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors Lambda error rates for Candlefish animation"
  alarm_actions       = [aws_sns_topic.candlefish_alerts.arn]

  dimensions = {
    FunctionName = aws_lambda_function.candlefish_analytics_processor.function_name
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "candlefish_high_duration" {
  alarm_name          = "${var.environment}-candlefish-high-duration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Average"
  threshold           = "10000"
  alarm_description   = "This metric monitors Lambda duration for Candlefish animation"
  alarm_actions       = [aws_sns_topic.candlefish_alerts.arn]

  dimensions = {
    FunctionName = aws_lambda_function.candlefish_analytics_processor.function_name
  }

  tags = local.common_tags
}

# SNS Topic for Candlefish-specific Alerts
resource "aws_sns_topic" "candlefish_alerts" {
  name = "${var.environment}-candlefish-animation-alerts"

  tags = merge(local.common_tags, {
    Component = "Alerting"
    Purpose   = "CandlefishMonitoring"
  })
}

# Custom CloudWatch Metrics for Animation Performance
resource "aws_cloudwatch_dashboard" "candlefish_animation" {
  dashboard_name = "${var.environment}-CandlefishAnimationMetrics"

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
            ["AWS/Lambda", "Duration", "FunctionName", aws_lambda_function.candlefish_analytics_processor.function_name],
            [".", "Errors", ".", "."],
            [".", "Invocations", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Candlefish Analytics Processing Metrics"
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
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", aws_dynamodb_table.candlefish_analytics.name],
            [".", "ConsumedWriteCapacityUnits", ".", "."],
            [".", "SuccessfulRequestLatency", ".", ".", "Operation", "GetItem"],
            [".", "SuccessfulRequestLatency", ".", ".", "Operation", "PutItem"]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Candlefish Analytics Database Performance"
          period  = 300
        }
      },
      {
        type   = "log"
        x      = 0
        y      = 12
        width  = 24
        height = 6

        properties = {
          query   = "SOURCE '${aws_cloudwatch_log_group.candlefish_analytics_logs.name}' | fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 100"
          region  = var.aws_region
          title   = "Candlefish Animation Errors"
        }
      }
    ]
  })

  tags = local.common_tags
}

# WAF Web ACL for API Protection
resource "aws_wafv2_web_acl" "candlefish_api_protection" {
  name        = "${var.environment}-candlefish-api-protection"
  description = "WAF rules for Candlefish Animation API protection"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # Rate limiting rule
  rule {
    name     = "RateLimitRule"
    priority = 1

    override_action {
      none {}
    }

    statement {
      rate_based_statement {
        limit          = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRule"
      sampled_requests_enabled   = true
    }

    action {
      block {}
    }
  }

  # AWS Managed Rules - Core Rule Set
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 10

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "CommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "CandlefishAPIProtection"
    sampled_requests_enabled   = true
  }

  tags = merge(local.common_tags, {
    Component = "WAF"
    Purpose   = "APIProtection"
  })
}

# Associate WAF with API Gateway
resource "aws_wafv2_web_acl_association" "candlefish_api_association" {
  resource_arn = aws_api_gateway_deployment.candlefish_api.execution_arn
  web_acl_arn  = aws_wafv2_web_acl.candlefish_api_protection.arn
}

# Outputs for Candlefish Animation Infrastructure
output "candlefish_api_endpoint" {
  description = "API Gateway endpoint for Candlefish animation"
  value       = "${aws_api_gateway_rest_api.candlefish_api.execution_arn}/${var.environment}"
}

output "candlefish_analytics_table" {
  description = "DynamoDB table for Candlefish analytics"
  value       = aws_dynamodb_table.candlefish_analytics.name
}

output "candlefish_memory_table" {
  description = "DynamoDB table for Candlefish memory persistence"
  value       = aws_dynamodb_table.candlefish_memory.name
}

output "candlefish_ab_testing_table" {
  description = "DynamoDB table for A/B testing configuration"
  value       = aws_dynamodb_table.ab_testing_config.name
}

output "candlefish_dashboard_url" {
  description = "CloudWatch dashboard for Candlefish animation metrics"
  value       = "https://console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.candlefish_animation.dashboard_name}"
}