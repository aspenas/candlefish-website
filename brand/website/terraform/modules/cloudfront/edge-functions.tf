# Lambda@Edge Functions for CloudFront
# Performance optimization, security, and adaptive content delivery

# IAM Role for Lambda@Edge
resource "aws_iam_role" "lambda_edge" {
  name = "${var.environment}-candlefish-lambda-edge"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = [
            "lambda.amazonaws.com",
            "edgelambda.amazonaws.com"
          ]
        }
      }
    ]
  })
  
  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "lambda_edge_basic" {
  role       = aws_iam_role.lambda_edge.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Viewer Request Function - Device Detection & A/B Testing
resource "aws_lambda_function" "viewer_request" {
  provider         = aws.us_east_1
  function_name    = "${var.environment}-cf-viewer-request"
  role            = aws_iam_role.lambda_edge.arn
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  timeout         = 5
  memory_size     = 128
  publish         = true
  
  filename         = data.archive_file.viewer_request.output_path
  source_code_hash = data.archive_file.viewer_request.output_base64sha256
  
  environment {
    variables = {
      ENVIRONMENT = var.environment
      AB_TEST_ENABLED = "true"
    }
  }
  
  tags = var.tags
}

data "archive_file" "viewer_request" {
  type        = "zip"
  output_path = "/tmp/viewer-request.zip"
  
  source {
    content  = file("${path.module}/lambda/viewer-request.js")
    filename = "index.js"
  }
}

# Viewer Response Function - Security Headers & Performance Hints
resource "aws_lambda_function" "viewer_response" {
  provider         = aws.us_east_1
  function_name    = "${var.environment}-cf-viewer-response"
  role            = aws_iam_role.lambda_edge.arn
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  timeout         = 5
  memory_size     = 128
  publish         = true
  
  filename         = data.archive_file.viewer_response.output_path
  source_code_hash = data.archive_file.viewer_response.output_base64sha256
  
  tags = var.tags
}

data "archive_file" "viewer_response" {
  type        = "zip"
  output_path = "/tmp/viewer-response.zip"
  
  source {
    content  = file("${path.module}/lambda/viewer-response.js")
    filename = "index.js"
  }
}

# Origin Request Function - Content Routing & Optimization
resource "aws_lambda_function" "origin_request" {
  provider         = aws.us_east_1
  function_name    = "${var.environment}-cf-origin-request"
  role            = aws_iam_role.lambda_edge.arn
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  timeout         = 10
  memory_size     = 256
  publish         = true
  
  filename         = data.archive_file.origin_request.output_path
  source_code_hash = data.archive_file.origin_request.output_base64sha256
  
  tags = var.tags
}

data "archive_file" "origin_request" {
  type        = "zip"
  output_path = "/tmp/origin-request.zip"
  
  source {
    content  = file("${path.module}/lambda/origin-request.js")
    filename = "index.js"
  }
}

# Origin Response Function - Content Optimization & Compression
resource "aws_lambda_function" "origin_response" {
  provider         = aws.us_east_1
  function_name    = "${var.environment}-cf-origin-response"
  role            = aws_iam_role.lambda_edge.arn
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  timeout         = 10
  memory_size     = 512
  publish         = true
  
  filename         = data.archive_file.origin_response.output_path
  source_code_hash = data.archive_file.origin_response.output_base64sha256
  
  tags = var.tags
}

data "archive_file" "origin_response" {
  type        = "zip"
  output_path = "/tmp/origin-response.zip"
  
  source {
    content  = file("${path.module}/lambda/origin-response.js")
    filename = "index.js"
  }
}

# Image Optimization Function - WebP/AVIF Conversion
resource "aws_lambda_function" "image_optimization" {
  provider         = aws.us_east_1
  function_name    = "${var.environment}-cf-image-optimization"
  role            = aws_iam_role.lambda_edge_image.arn
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  timeout         = 30
  memory_size     = 1024
  publish         = true
  
  layers = [aws_lambda_layer_version.sharp.arn]
  
  filename         = data.archive_file.image_optimization.output_path
  source_code_hash = data.archive_file.image_optimization.output_base64sha256
  
  environment {
    variables = {
      ENABLE_WEBP  = "true"
      ENABLE_AVIF  = "true"
      QUALITY      = "85"
    }
  }
  
  tags = var.tags
}

# Lambda Layer for Sharp (Image Processing)
resource "aws_lambda_layer_version" "sharp" {
  provider            = aws.us_east_1
  layer_name          = "${var.environment}-sharp-layer"
  description         = "Sharp library for image processing"
  compatible_runtimes = ["nodejs20.x"]
  
  filename         = data.archive_file.sharp_layer.output_path
  source_code_hash = data.archive_file.sharp_layer.output_base64sha256
}

data "archive_file" "sharp_layer" {
  type        = "zip"
  output_path = "/tmp/sharp-layer.zip"
  
  source_dir = "${path.module}/layers/sharp"
}

data "archive_file" "image_optimization" {
  type        = "zip"
  output_path = "/tmp/image-optimization.zip"
  
  source {
    content  = file("${path.module}/lambda/image-optimization.js")
    filename = "index.js"
  }
}

# Enhanced IAM Role for Image Processing
resource "aws_iam_role" "lambda_edge_image" {
  name = "${var.environment}-candlefish-lambda-edge-image"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = [
            "lambda.amazonaws.com",
            "edgelambda.amazonaws.com"
          ]
        }
      }
    ]
  })
  
  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "lambda_edge_image_basic" {
  role       = aws_iam_role.lambda_edge_image.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# S3 Read Policy for Image Processing
resource "aws_iam_role_policy" "lambda_edge_s3" {
  name = "${var.environment}-lambda-edge-s3"
  role = aws_iam_role.lambda_edge_image.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = [
          "${var.s3_bucket_arn}/*"
        ]
      }
    ]
  })
}

# CloudFront Cache Policies
resource "aws_cloudfront_cache_policy" "static_assets" {
  name        = "${var.environment}-static-assets"
  comment     = "Cache policy for static assets with long TTL"
  default_ttl = 86400
  max_ttl     = 31536000
  min_ttl     = 1
  
  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    
    headers_config {
      header_behavior = "none"
    }
    
    query_strings_config {
      query_string_behavior = "none"
    }
    
    enable_accept_encoding_gzip   = true
    enable_accept_encoding_brotli = true
  }
}

resource "aws_cloudfront_cache_policy" "optimized_images" {
  name        = "${var.environment}-optimized-images"
  comment     = "Cache policy for optimized images"
  default_ttl = 86400
  max_ttl     = 31536000
  min_ttl     = 1
  
  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    
    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Accept", "CloudFront-Viewer-Device-Type"]
      }
    }
    
    query_strings_config {
      query_string_behavior = "whitelist"
      query_strings {
        items = ["w", "h", "q", "format"]
      }
    }
    
    enable_accept_encoding_gzip   = true
    enable_accept_encoding_brotli = true
  }
}

# Origin Request Policies
resource "aws_cloudfront_origin_request_policy" "cors_s3" {
  name    = "${var.environment}-cors-s3"
  comment = "CORS policy for S3 origins"
  
  cookies_config {
    cookie_behavior = "none"
  }
  
  headers_config {
    header_behavior = "whitelist"
    headers {
      items = [
        "Origin",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers"
      ]
    }
  }
  
  query_strings_config {
    query_string_behavior = "none"
  }
}

resource "aws_cloudfront_origin_request_policy" "image_optimization" {
  name    = "${var.environment}-image-optimization"
  comment = "Origin request policy for image optimization"
  
  cookies_config {
    cookie_behavior = "none"
  }
  
  headers_config {
    header_behavior = "whitelist"
    headers {
      items = [
        "Accept",
        "Accept-Encoding",
        "CloudFront-Viewer-Device-Type"
      ]
    }
  }
  
  query_strings_config {
    query_string_behavior = "all"
  }
}

# Response Headers Policies
resource "aws_cloudfront_response_headers_policy" "cors_preflight" {
  name = "${var.environment}-cors-preflight"
  
  cors_config {
    access_control_allow_credentials = false
    
    access_control_allow_headers {
      items = ["*"]
    }
    
    access_control_allow_methods {
      items = ["GET", "HEAD", "PUT", "POST", "DELETE", "OPTIONS"]
    }
    
    access_control_allow_origins {
      items = ["*"]
    }
    
    access_control_max_age_sec = 86400
    origin_override            = true
  }
}

resource "aws_cloudfront_response_headers_policy" "cors_permissive" {
  name = "${var.environment}-cors-permissive"
  
  cors_config {
    access_control_allow_credentials = true
    
    access_control_allow_headers {
      items = ["*"]
    }
    
    access_control_allow_methods {
      items = ["GET", "HEAD", "PUT", "POST", "DELETE", "OPTIONS", "PATCH"]
    }
    
    access_control_allow_origins {
      items = [var.domain_name, "https://${var.domain_name}", "https://www.${var.domain_name}"]
    }
    
    access_control_expose_headers {
      items = ["ETag", "Content-Length", "Content-Type"]
    }
    
    access_control_max_age_sec = 86400
    origin_override            = true
  }
}

# Real-time Logging to Kinesis
resource "aws_kinesis_stream" "cloudfront_logs" {
  name             = "${var.environment}-candlefish-cf-logs"
  shard_count      = 2
  retention_period = 24
  
  encryption_type = "KMS"
  kms_key_id      = aws_kms_key.cloudfront_logs.arn
  
  stream_mode_details {
    stream_mode = "PROVISIONED"
  }
  
  tags = var.tags
}

resource "aws_kms_key" "cloudfront_logs" {
  description = "KMS key for CloudFront real-time logs"
  
  tags = var.tags
}

resource "aws_cloudfront_realtime_log_config" "kinesis" {
  name = "${var.environment}-candlefish-realtime"
  
  endpoint {
    stream_type = "Kinesis"
    
    kinesis_stream_config {
      role_arn   = aws_iam_role.cloudfront_kinesis.arn
      stream_arn = aws_kinesis_stream.cloudfront_logs.arn
    }
  }
  
  fields = [
    "timestamp",
    "c-ip",
    "sc-status",
    "sc-bytes",
    "time-taken",
    "cs-uri-stem",
    "cs-user-agent",
    "x-edge-location",
    "x-edge-response-result-type",
    "cs-protocol",
    "cs-referer",
    "x-host-header",
    "cs-protocol-version",
    "c-country"
  ]
  
  sampling_rate = 100
}

resource "aws_iam_role" "cloudfront_kinesis" {
  name = "${var.environment}-cloudfront-kinesis"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
      }
    ]
  })
  
  tags = var.tags
}

resource "aws_iam_role_policy" "cloudfront_kinesis" {
  name = "${var.environment}-cloudfront-kinesis"
  role = aws_iam_role.cloudfront_kinesis.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kinesis:PutRecord",
          "kinesis:PutRecords"
        ]
        Resource = aws_kinesis_stream.cloudfront_logs.arn
      },
      {
        Effect = "Allow"
        Action = [
          "kms:GenerateDataKey"
        ]
        Resource = aws_kms_key.cloudfront_logs.arn
      }
    ]
  })
}