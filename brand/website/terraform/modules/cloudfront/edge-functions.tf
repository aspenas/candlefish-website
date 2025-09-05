# CloudFront Edge Functions with Lambda@Edge
# Performance optimization at the edge of the network

resource "aws_iam_role" "lambda_edge" {
  name = "${var.environment}-candlefish-lambda-edge-role"
  
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

# Performance Optimizer Function
resource "aws_lambda_function" "performance_optimizer" {
  function_name    = "${var.environment}-cf-performance-optimizer"
  filename         = data.archive_file.performance_optimizer.output_path
  source_code_hash = data.archive_file.performance_optimizer.output_base64sha256
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  role            = aws_iam_role.lambda_edge.arn
  publish         = true
  timeout         = 5
  memory_size     = 128
  
  environment {
    variables = {
      ENVIRONMENT = var.environment
      DOMAIN      = var.domain_name
    }
  }
  
  tags = var.tags
}

data "archive_file" "performance_optimizer" {
  type        = "zip"
  output_path = "${path.module}/lambda/performance-optimizer.zip"
  
  source {
    content  = file("${path.module}/lambda/performance-optimizer.js")
    filename = "index.js"
  }
}

# Security Headers Function
resource "aws_lambda_function" "security_headers" {
  function_name    = "${var.environment}-cf-security-headers"
  filename         = data.archive_file.security_headers.output_path
  source_code_hash = data.archive_file.security_headers.output_base64sha256
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  role            = aws_iam_role.lambda_edge.arn
  publish         = true
  timeout         = 3
  memory_size     = 128
  
  tags = var.tags
}

data "archive_file" "security_headers" {
  type        = "zip"
  output_path = "${path.module}/lambda/security-headers.zip"
  
  source {
    content  = file("${path.module}/lambda/security-headers.js")
    filename = "index.js"
  }
}

# A/B Testing Router Function
resource "aws_lambda_function" "ab_testing_router" {
  function_name    = "${var.environment}-cf-ab-testing-router"
  filename         = data.archive_file.ab_testing_router.output_path
  source_code_hash = data.archive_file.ab_testing_router.output_base64sha256
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  role            = aws_iam_role.lambda_edge.arn
  publish         = true
  timeout         = 5
  memory_size     = 128
  
  environment {
    variables = {
      EXPERIMENT_CONFIG = jsonencode({
        hero_animation = {
          control = 50
          variant_a = 25
          variant_b = 25
        }
        bundle_optimization = {
          control = 70
          experimental = 30
        }
      })
    }
  }
  
  tags = var.tags
}

data "archive_file" "ab_testing_router" {
  type        = "zip"
  output_path = "${path.module}/lambda/ab-testing-router.zip"
  
  source {
    content  = file("${path.module}/lambda/ab-testing-router.js")
    filename = "index.js"
  }
}

# CloudFront Cache Policy for optimized caching
resource "aws_cloudfront_cache_policy" "optimized" {
  name    = "${var.environment}-candlefish-optimized-cache"
  comment = "Optimized cache policy for Candlefish.ai"
  
  min_ttl     = 0
  default_ttl = 86400    # 1 day
  max_ttl     = 31536000 # 1 year
  
  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_gzip   = true
    enable_accept_encoding_brotli = true
    
    cookies_config {
      cookie_behavior = "none"
    }
    
    headers_config {
      header_behavior = "whitelist"
      headers {
        items = [
          "X-Render-Mode",
          "X-Quality-Preset",
          "CloudFront-Is-Mobile-Viewer",
          "CloudFront-Is-Desktop-Viewer"
        ]
      }
    }
    
    query_strings_config {
      query_string_behavior = "whitelist"
      query_strings {
        items = ["v", "quality", "experiment"]
      }
    }
  }
}

# Origin Request Policy for dynamic content
resource "aws_cloudfront_origin_request_policy" "dynamic" {
  name    = "${var.environment}-candlefish-dynamic-origin"
  comment = "Origin request policy for dynamic content"
  
  cookies_config {
    cookie_behavior = "all"
  }
  
  headers_config {
    header_behavior = "allViewer"
  }
  
  query_strings_config {
    query_string_behavior = "all"
  }
}

# Response Headers Policy for security and performance
resource "aws_cloudfront_response_headers_policy" "security_performance" {
  name    = "${var.environment}-candlefish-response-headers"
  comment = "Security and performance headers for Candlefish.ai"
  
  security_headers_config {
    content_security_policy {
      content_security_policy = join("; ", [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net https://*.cloudfront.net",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self' wss://*.candlefish.ai https://*.amazonaws.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "upgrade-insecure-requests",
        "block-all-mixed-content"
      ])
      override = true
    }
    
    content_type_options {
      override = true
    }
    
    frame_options {
      frame_option = "DENY"
      override     = true
    }
    
    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
    
    strict_transport_security {
      access_control_max_age_sec = 63072000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }
    
    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }
  }
  
  custom_headers_config {
    items = [
      {
        header   = "X-Content-Type-Options"
        value    = "nosniff"
        override = true
      },
      {
        header   = "Permissions-Policy"
        value    = "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"
        override = true
      },
      {
        header   = "X-DNS-Prefetch-Control"
        value    = "on"
        override = false
      },
      {
        header   = "X-Permitted-Cross-Domain-Policies"
        value    = "none"
        override = false
      }
    ]
  }
  
  server_timing_headers_config {
    enabled       = true
    sampling_rate = 0.1  # 10% sampling
  }
  
  cors_config {
    access_control_allow_credentials = true
    
    access_control_allow_headers {
      items = ["*"]
    }
    
    access_control_allow_methods {
      items = ["GET", "HEAD", "PUT", "POST", "DELETE", "OPTIONS"]
    }
    
    access_control_allow_origins {
      items = [
        "https://${var.domain_name}",
        "https://www.${var.domain_name}"
      ]
    }
    
    access_control_expose_headers {
      items = ["Server-Timing", "X-Request-Id"]
    }
    
    access_control_max_age_sec = 86400
    origin_override            = false
  }
}