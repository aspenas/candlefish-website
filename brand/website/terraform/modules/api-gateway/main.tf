# API Gateway Module - REST and WebSocket APIs
# High-performance API infrastructure with Lambda integration

# REST API
resource "aws_api_gateway_rest_api" "main" {
  name        = "${var.environment}-candlefish-api"
  description = "Candlefish Operational Design Atelier REST API"
  
  endpoint_configuration {
    types = ["EDGE"]
  }
  
  binary_media_types = [
    "application/octet-stream",
    "image/*",
    "multipart/form-data"
  ]
  
  tags = var.tags
}

# API Gateway Domain
resource "aws_api_gateway_domain_name" "api" {
  domain_name              = "api.${var.domain_name}"
  regional_certificate_arn = var.certificate_arn
  
  endpoint_configuration {
    types = ["EDGE"]
  }
  
  tags = var.tags
}

# Base Path Mapping
resource "aws_api_gateway_base_path_mapping" "api" {
  api_id      = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_deployment.main.stage_name
  domain_name = aws_api_gateway_domain_name.api.domain_name
}

# Request Validator
resource "aws_api_gateway_request_validator" "main" {
  name                        = "request-validator"
  rest_api_id                 = aws_api_gateway_rest_api.main.id
  validate_request_body       = true
  validate_request_parameters = true
}

# API Resources
resource "aws_api_gateway_resource" "operational" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "operational"
}

resource "aws_api_gateway_resource" "metrics" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.operational.id
  path_part   = "metrics"
}

resource "aws_api_gateway_resource" "telemetry" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.operational.id
  path_part   = "telemetry"
}

resource "aws_api_gateway_resource" "queue" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "queue"
}

# Lambda Functions for API endpoints
resource "aws_lambda_function" "api_handler" {
  function_name    = "${var.environment}-api-handler"
  runtime          = "nodejs20.x"
  handler          = "index.handler"
  role            = aws_iam_role.lambda_api.arn
  timeout         = 30
  memory_size     = 1024
  architectures   = ["arm64"]
  
  environment {
    variables = {
      ENVIRONMENT = var.environment
      REDIS_URL   = var.redis_endpoint
      DB_URL      = var.database_url
    }
  }
  
  filename         = data.archive_file.api_handler.output_path
  source_code_hash = data.archive_file.api_handler.output_base64sha256
  
  reserved_concurrent_executions = 100
  
  dead_letter_config {
    target_arn = aws_sqs_queue.lambda_dlq.arn
  }
  
  tracing_config {
    mode = "Active"
  }
  
  tags = var.tags
}

data "archive_file" "api_handler" {
  type        = "zip"
  output_path = "/tmp/api-handler.zip"
  
  source {
    content  = file("${path.module}/lambda/api-handler.js")
    filename = "index.js"
  }
}

# Lambda Async Configuration
resource "aws_lambda_function_event_invoke_config" "api_handler" {
  function_name                = aws_lambda_function.api_handler.function_name
  maximum_event_age_in_seconds = 21600
  maximum_retry_attempts       = 2
  
  on_failure {
    destination = aws_sqs_queue.lambda_dlq.arn
  }
}

# API Gateway Methods
resource "aws_api_gateway_method" "metrics_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.metrics.id
  http_method   = "GET"
  authorization = "AWS_IAM"
  
  request_parameters = {
    "method.request.querystring.start_date" = false
    "method.request.querystring.end_date"   = false
    "method.request.querystring.metric_type" = false
  }
}

resource "aws_api_gateway_integration" "metrics_get" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.metrics.id
  http_method = aws_api_gateway_method.metrics_get.http_method
  
  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.api_handler.invoke_arn
  
  timeout_milliseconds = 29000
}

# Lambda Permissions for API Gateway
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.operational.id,
      aws_api_gateway_resource.metrics.id,
      aws_api_gateway_resource.telemetry.id,
      aws_api_gateway_resource.queue.id,
      aws_api_gateway_method.metrics_get.id,
      aws_api_gateway_integration.metrics_get.id,
    ]))
  }
  
  lifecycle {
    create_before_destroy = true
  }
}

# API Gateway Stage
resource "aws_api_gateway_stage" "main" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = var.environment
  
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip            = "$context.identity.sourceIp"
      requestTime   = "$context.requestTime"
      httpMethod    = "$context.httpMethod"
      routeKey      = "$context.routeKey"
      status        = "$context.status"
      protocol      = "$context.protocol"
      responseLength = "$context.responseLength"
      error         = "$context.error.message"
      latency       = "$context.responseLatency"
      path          = "$context.path"
    })
  }
  
  xray_tracing_enabled = true
  
  cache_cluster_enabled = true
  cache_cluster_size    = "1.6"
  
  tags = var.tags
}

# API Gateway Method Settings
resource "aws_api_gateway_method_settings" "all" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  method_path = "*/*"
  
  settings {
    metrics_enabled        = true
    logging_level         = "INFO"
    data_trace_enabled    = true
    throttling_rate_limit = 10000
    throttling_burst_limit = 5000
    caching_enabled       = true
    cache_ttl_in_seconds  = 300
    cache_data_encrypted  = true
  }
}

# Usage Plan
resource "aws_api_gateway_usage_plan" "main" {
  name         = "${var.environment}-candlefish-usage-plan"
  description  = "Usage plan for Candlefish API"
  
  api_stages {
    api_id = aws_api_gateway_rest_api.main.id
    stage  = aws_api_gateway_stage.main.stage_name
  }
  
  quota_settings {
    limit  = 100000
    period = "DAY"
  }
  
  throttle_settings {
    rate_limit  = 10000
    burst_limit = 5000
  }
  
  tags = var.tags
}

# API Keys
resource "aws_api_gateway_api_key" "client" {
  name = "${var.environment}-candlefish-api-key"
  
  tags = var.tags
}

resource "aws_api_gateway_usage_plan_key" "main" {
  key_id        = aws_api_gateway_api_key.client.id
  key_type      = "API_KEY"
  usage_plan_id = aws_api_gateway_usage_plan.main.id
}

# WebSocket API
resource "aws_apigatewayv2_api" "websocket" {
  name                       = "${var.environment}-candlefish-websocket"
  protocol_type             = "WEBSOCKET"
  route_selection_expression = "$request.body.action"
  
  tags = var.tags
}

# WebSocket Lambda Function
resource "aws_lambda_function" "websocket_handler" {
  function_name    = "${var.environment}-websocket-handler"
  runtime          = "nodejs20.x"
  handler          = "index.handler"
  role            = aws_iam_role.lambda_websocket.arn
  timeout         = 30
  memory_size     = 512
  architectures   = ["arm64"]
  
  environment {
    variables = {
      ENVIRONMENT     = var.environment
      CONNECTIONS_TABLE = aws_dynamodb_table.websocket_connections.name
    }
  }
  
  filename         = data.archive_file.websocket_handler.output_path
  source_code_hash = data.archive_file.websocket_handler.output_base64sha256
  
  tags = var.tags
}

data "archive_file" "websocket_handler" {
  type        = "zip"
  output_path = "/tmp/websocket-handler.zip"
  
  source {
    content  = file("${path.module}/lambda/websocket-handler.js")
    filename = "index.js"
  }
}

# WebSocket Routes
resource "aws_apigatewayv2_route" "connect" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$connect"
  target    = "integrations/${aws_apigatewayv2_integration.websocket.id}"
}

resource "aws_apigatewayv2_route" "disconnect" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$disconnect"
  target    = "integrations/${aws_apigatewayv2_integration.websocket.id}"
}

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.websocket.id}"
}

# WebSocket Integration
resource "aws_apigatewayv2_integration" "websocket" {
  api_id           = aws_apigatewayv2_api.websocket.id
  integration_type = "AWS_PROXY"
  
  connection_type           = "INTERNET"
  content_handling_strategy = "CONVERT_TO_TEXT"
  integration_method        = "POST"
  integration_uri          = aws_lambda_function.websocket_handler.invoke_arn
  passthrough_behavior     = "WHEN_NO_MATCH"
}

# WebSocket Lambda Permission
resource "aws_lambda_permission" "websocket" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.websocket_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*/*"
}

# WebSocket Deployment
resource "aws_apigatewayv2_deployment" "websocket" {
  api_id      = aws_apigatewayv2_api.websocket.id
  description = "WebSocket deployment"
  
  depends_on = [
    aws_apigatewayv2_route.connect,
    aws_apigatewayv2_route.disconnect,
    aws_apigatewayv2_route.default
  ]
}

# WebSocket Stage
resource "aws_apigatewayv2_stage" "websocket" {
  api_id        = aws_apigatewayv2_api.websocket.id
  name          = var.environment
  deployment_id = aws_apigatewayv2_deployment.websocket.id
  
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.websocket.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip            = "$context.identity.sourceIp"
      requestTime   = "$context.requestTime"
      routeKey      = "$context.routeKey"
      status        = "$context.status"
      error         = "$context.error.message"
      connectionId  = "$context.connectionId"
    })
  }
  
  default_route_settings {
    data_trace_enabled       = true
    detailed_metrics_enabled = true
    logging_level           = "INFO"
    throttling_rate_limit   = 10000
    throttling_burst_limit  = 5000
  }
  
  tags = var.tags
}

# DynamoDB Table for WebSocket Connections
resource "aws_dynamodb_table" "websocket_connections" {
  name           = "${var.environment}-websocket-connections"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "connectionId"
  
  attribute {
    name = "connectionId"
    type = "S"
  }
  
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }
  
  point_in_time_recovery {
    enabled = true
  }
  
  server_side_encryption {
    enabled = true
  }
  
  tags = var.tags
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/${var.environment}-candlefish-api"
  retention_in_days = 30
  
  tags = var.tags
}

resource "aws_cloudwatch_log_group" "websocket" {
  name              = "/aws/apigateway/${var.environment}-candlefish-websocket"
  retention_in_days = 30
  
  tags = var.tags
}

resource "aws_cloudwatch_log_group" "lambda_api" {
  name              = "/aws/lambda/${var.environment}-api-handler"
  retention_in_days = 30
  
  tags = var.tags
}

resource "aws_cloudwatch_log_group" "lambda_websocket" {
  name              = "/aws/lambda/${var.environment}-websocket-handler"
  retention_in_days = 30
  
  tags = var.tags
}

# SQS Dead Letter Queue
resource "aws_sqs_queue" "lambda_dlq" {
  name                       = "${var.environment}-lambda-dlq"
  delay_seconds             = 0
  max_message_size          = 262144
  message_retention_seconds = 1209600
  receive_wait_time_seconds = 10
  
  tags = var.tags
}

# IAM Roles
resource "aws_iam_role" "lambda_api" {
  name = "${var.environment}-lambda-api-role"
  
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
  
  tags = var.tags
}

resource "aws_iam_role" "lambda_websocket" {
  name = "${var.environment}-lambda-websocket-role"
  
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
  
  tags = var.tags
}

# IAM Policies
resource "aws_iam_role_policy_attachment" "lambda_api_basic" {
  role       = aws_iam_role.lambda_api.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_api_xray" {
  role       = aws_iam_role.lambda_api.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

resource "aws_iam_role_policy" "lambda_api_sqs" {
  name = "${var.environment}-lambda-api-sqs"
  role = aws_iam_role.lambda_api.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.lambda_dlq.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_websocket_basic" {
  role       = aws_iam_role.lambda_websocket.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_websocket_dynamodb" {
  name = "${var.environment}-lambda-websocket-dynamodb"
  role = aws_iam_role.lambda_websocket.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:DeleteItem",
          "dynamodb:Scan"
        ]
        Resource = aws_dynamodb_table.websocket_connections.arn
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_websocket_apigateway" {
  name = "${var.environment}-lambda-websocket-apigateway"
  role = aws_iam_role.lambda_websocket.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "execute-api:ManageConnections"
        ]
        Resource = "${aws_apigatewayv2_api.websocket.execution_arn}/*"
      }
    ]
  })
}