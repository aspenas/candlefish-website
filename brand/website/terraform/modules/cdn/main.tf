# CloudFront CDN Module for Candlefish.ai
# Optimized for operational atelier with real-time WebGL performance

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Origin Access Control for S3 (preferred over OAI)
resource "aws_cloudfront_origin_access_control" "main" {
  name                              = "${var.project_name}-${var.environment}-oac"
  description                       = "OAC for ${var.project_name} ${var.environment}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# S3 bucket for CloudFront access logs
resource "aws_s3_bucket" "cdn_logs" {
  count  = var.enable_logging ? 1 : 0
  bucket = "${var.project_name}-${var.environment}-cdn-logs-${random_id.log_suffix.hex}"

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-cdn-logs"
    Purpose     = "CloudFront Access Logs"
    Environment = var.environment
  })
}

resource "aws_s3_bucket_public_access_block" "cdn_logs" {
  count  = var.enable_logging ? 1 : 0
  bucket = aws_s3_bucket.cdn_logs[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "cdn_logs" {
  count  = var.enable_logging ? 1 : 0
  bucket = aws_s3_bucket.cdn_logs[0].id

  rule {
    id     = "log_retention"
    status = "Enabled"

    expiration {
      days = var.environment == "production" ? 90 : 30
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

resource "random_id" "log_suffix" {
  byte_length = 4
}

# Kinesis Data Stream for Real-time Logs
resource "aws_kinesis_stream" "realtime_logs" {
  count       = var.enable_real_time_logs ? 1 : 0
  name        = "${var.project_name}-${var.environment}-cloudfront-logs"
  shard_count = var.environment == "production" ? 2 : 1

  retention_period = var.environment == "production" ? 168 : 24 # 7 days or 1 day

  encryption_type = "KMS"
  kms_key_id      = "alias/aws/kinesis"

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-realtime-logs"
    Environment = var.environment
  })
}

# CloudFront Real-time Log Configuration
resource "aws_cloudfront_realtime_log_config" "main" {
  count = var.enable_real_time_logs ? 1 : 0
  name  = "${var.project_name}-${var.environment}-realtime-logs"

  endpoint {
    stream_type = "Kinesis"

    kinesis_stream_config {
      role_arn   = aws_iam_role.realtime_logs[0].arn
      stream_arn = aws_kinesis_stream.realtime_logs[0].arn
    }
  }

  fields = [
    "timestamp",
    "c-ip",
    "time-to-first-byte",
    "sc-status",
    "sc-bytes",
    "cs-method",
    "cs-protocol",
    "cs-host",
    "cs-uri-stem",
    "cs-bytes",
    "x-edge-location",
    "x-edge-request-id",
    "x-host-header"
  ]
}

# IAM role for CloudFront real-time logs
resource "aws_iam_role" "realtime_logs" {
  count = var.enable_real_time_logs ? 1 : 0
  name  = "${var.project_name}-${var.environment}-cloudfront-realtime-logs"

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

resource "aws_iam_role_policy" "realtime_logs" {
  count = var.enable_real_time_logs ? 1 : 0
  name  = "${var.project_name}-${var.environment}-cloudfront-realtime-logs"
  role  = aws_iam_role.realtime_logs[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kinesis:PutRecords",
          "kinesis:PutRecord"
        ]
        Resource = aws_kinesis_stream.realtime_logs[0].arn
      }
    ]
  })
}

# ACM Certificate for custom domain (must be in us-east-1 for CloudFront)
data "aws_acm_certificate" "main" {
  domain      = var.domain_name
  statuses    = ["ISSUED"]
  most_recent = true

  provider = aws.us_east_1
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  # Primary origin
  origin {
    domain_name              = var.origin_domain_name
    origin_id                = "primary-${var.project_name}"
    origin_path              = var.origin_path
    origin_access_control_id = aws_cloudfront_origin_access_control.main.id

    # Custom headers for operational telemetry
    custom_header {
      name  = "X-Candlefish-Environment"
      value = var.environment
    }

    custom_header {
      name  = "X-Candlefish-Project"
      value = var.project_name
    }
  }

  # Additional origins
  dynamic "origin" {
    for_each = var.origins
    content {
      domain_name = origin.value.domain_name
      origin_id   = origin.value.origin_id
      origin_path = origin.value.origin_path

      dynamic "custom_origin_config" {
        for_each = origin.value.custom_origin_config != null ? [origin.value.custom_origin_config] : []
        content {
          http_port              = custom_origin_config.value.http_port
          https_port             = custom_origin_config.value.https_port
          origin_protocol_policy = custom_origin_config.value.origin_protocol_policy
          origin_ssl_protocols   = custom_origin_config.value.origin_ssl_protocols
        }
      }

      dynamic "s3_origin_config" {
        for_each = origin.value.s3_origin_config != null ? [origin.value.s3_origin_config] : []
        content {
          origin_access_identity = s3_origin_config.value.origin_access_identity
        }
      }
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  comment             = "CloudFront distribution for ${var.project_name} ${var.environment}"

  # Logging configuration
  dynamic "logging_config" {
    for_each = var.enable_logging ? [1] : []
    content {
      include_cookies = false
      bucket          = aws_s3_bucket.cdn_logs[0].bucket_domain_name
      prefix          = "cloudfront-access-logs/"
    }
  }

  # Real-time logs
  realtime_log_config_arn = var.enable_real_time_logs ? aws_cloudfront_realtime_log_config.main[0].arn : null

  # Domain configuration
  aliases = concat([var.domain_name], var.alternate_domain_names)

  # Default cache behavior - optimized for SPA with WebGL
  default_cache_behavior {
    allowed_methods            = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods             = ["GET", "HEAD"]
    target_origin_id           = "primary-${var.project_name}"
    compress                   = true
    viewer_protocol_policy     = "redirect-to-https"
    cache_policy_id            = aws_cloudfront_cache_policy.spa_optimized.id
    origin_request_policy_id   = aws_cloudfront_origin_request_policy.cors_s3.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id

    # Lambda@Edge functions
    dynamic "lambda_function_association" {
      for_each = var.lambda_edge_functions
      content {
        event_type   = lambda_function_association.value.event_type
        lambda_arn   = lambda_function_association.value.function_arn
        include_body = false
      }
    }
  }

  # Additional cache behaviors
  dynamic "ordered_cache_behavior" {
    for_each = var.cache_behaviors
    content {
      path_pattern           = ordered_cache_behavior.value.path_pattern
      allowed_methods        = ordered_cache_behavior.value.allowed_methods
      cached_methods         = ordered_cache_behavior.value.cached_methods
      target_origin_id       = ordered_cache_behavior.value.target_origin_id
      compress               = ordered_cache_behavior.value.compress
      viewer_protocol_policy = ordered_cache_behavior.value.viewer_protocol_policy

      # Use custom TTL settings
      default_ttl = ordered_cache_behavior.value.ttl_settings.default_ttl
      max_ttl     = ordered_cache_behavior.value.ttl_settings.max_ttl
      min_ttl     = ordered_cache_behavior.value.ttl_settings.min_ttl

      forwarded_values {
        query_string = ordered_cache_behavior.value.forwarded_values.query_string
        headers      = ordered_cache_behavior.value.forwarded_values.headers

        cookies {
          forward           = ordered_cache_behavior.value.forwarded_values.cookies.forward
          whitelisted_names = ordered_cache_behavior.value.forwarded_values.cookies.whitelisted_names
        }
      }
    }
  }

  # API cache behavior - optimized for real-time data
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    target_origin_id       = "primary-${var.project_name}"
    compress               = true
    viewer_protocol_policy = "https-only"
    cache_policy_id        = aws_cloudfront_cache_policy.api_optimized.id
    origin_request_policy_id = aws_cloudfront_origin_request_policy.all_viewer.id
  }

  # Static assets cache behavior - optimized for long-term caching
  ordered_cache_behavior {
    path_pattern           = "/_next/static/*"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "primary-${var.project_name}"
    compress               = true
    viewer_protocol_policy = "https-only"
    cache_policy_id        = aws_cloudfront_cache_policy.static_assets.id
  }

  # WebGL assets cache behavior
  ordered_cache_behavior {
    path_pattern           = "*.{wasm,glb,gltf,bin}"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "primary-${var.project_name}"
    compress               = false # Don't compress binary WebGL assets
    viewer_protocol_policy = "https-only"
    cache_policy_id        = aws_cloudfront_cache_policy.webgl_assets.id
  }

  price_class = var.price_class

  restrictions {
    geo_restriction {
      restriction_type = var.geo_restriction.restriction_type
      locations        = var.geo_restriction.locations
    }
  }

  viewer_certificate {
    acm_certificate_arn            = data.aws_acm_certificate.main.arn
    ssl_support_method             = "sni-only"
    minimum_protocol_version       = var.minimum_protocol_version
    cloudfront_default_certificate = false
  }

  # Custom error responses for SPA
  dynamic "custom_error_response" {
    for_each = var.custom_error_response
    content {
      error_code            = custom_error_response.value.error_code
      response_code         = custom_error_response.value.response_code
      response_page_path    = custom_error_response.value.response_page_path
      error_caching_min_ttl = custom_error_response.value.error_caching_min_ttl
    }
  }

  # WAF integration
  web_acl_id = var.web_acl_id

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-cloudfront"
    Environment = var.environment
    Purpose     = "CDN Distribution"
  })

  # Prevent deployment during maintenance windows
  depends_on = [
    aws_cloudfront_origin_access_control.main
  ]
}

# Cache Policies for different content types
resource "aws_cloudfront_cache_policy" "spa_optimized" {
  name        = "${var.project_name}-${var.environment}-spa-optimized"
  comment     = "Optimized cache policy for SPA with WebGL"
  default_ttl = 86400  # 24 hours
  max_ttl     = 31536000 # 1 year
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    query_strings_config {
      query_string_behavior = "none"
    }

    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["CloudFront-Viewer-Country", "CloudFront-Is-Mobile-Viewer"]
      }
    }

    cookies_config {
      cookie_behavior = "none"
    }
  }
}

resource "aws_cloudfront_cache_policy" "api_optimized" {
  name        = "${var.project_name}-${var.environment}-api-optimized"
  comment     = "Cache policy for API endpoints with real-time data"
  default_ttl = 0      # No caching for API calls
  max_ttl     = 300    # Maximum 5 minutes
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    query_strings_config {
      query_string_behavior = "all"
    }

    headers_config {
      header_behavior = "whitelist"
      headers {
        items = [
          "Authorization",
          "Content-Type",
          "X-Requested-With",
          "X-Candlefish-Session",
          "CloudFront-Viewer-Country"
        ]
      }
    }

    cookies_config {
      cookie_behavior = "whitelist"
      cookies {
        items = ["session", "csrf-token"]
      }
    }
  }
}

resource "aws_cloudfront_cache_policy" "static_assets" {
  name        = "${var.project_name}-${var.environment}-static-assets"
  comment     = "Long-term cache policy for static assets"
  default_ttl = 2592000  # 30 days
  max_ttl     = 31536000 # 1 year
  min_ttl     = 86400    # 1 day

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    query_strings_config {
      query_string_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    cookies_config {
      cookie_behavior = "none"
    }
  }
}

resource "aws_cloudfront_cache_policy" "webgl_assets" {
  name        = "${var.project_name}-${var.environment}-webgl-assets"
  comment     = "Cache policy for WebGL binary assets (WASM, GLB, GLTF)"
  default_ttl = 2592000  # 30 days
  max_ttl     = 31536000 # 1 year
  min_ttl     = 86400    # 1 day

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = false # Don't compress binary files
    enable_accept_encoding_gzip   = false

    query_strings_config {
      query_string_behavior = "none"
    }

    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers"]
      }
    }

    cookies_config {
      cookie_behavior = "none"
    }
  }
}

# Origin Request Policies
resource "aws_cloudfront_origin_request_policy" "cors_s3" {
  name    = "${var.project_name}-${var.environment}-cors-s3"
  comment = "Origin request policy for S3 with CORS support"

  cookies_config {
    cookie_behavior = "none"
  }

  headers_config {
    header_behavior = "whitelist"
    headers {
      items = [
        "Origin",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers",
        "CloudFront-Viewer-Country"
      ]
    }
  }

  query_strings_config {
    query_string_behavior = "none"
  }
}

resource "aws_cloudfront_origin_request_policy" "all_viewer" {
  name    = "${var.project_name}-${var.environment}-all-viewer"
  comment = "Forward all viewer data to origin"

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

# Response Headers Policy for security
resource "aws_cloudfront_response_headers_policy" "security_headers" {
  name    = "${var.project_name}-${var.environment}-security-headers"
  comment = "Security headers for Candlefish operational atelier"

  cors_config {
    access_control_allow_credentials = false
    access_control_allow_headers {
      items = ["*"]
    }
    access_control_allow_methods {
      items = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"]
    }
    access_control_allow_origins {
      items = ["https://${var.domain_name}"]
    }
    access_control_max_age_sec = 86400
    origin_override            = true
  }

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                   = true
      override                  = true
    }

    content_security_policy {
      content_security_policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: https:; worker-src 'self' blob:; child-src 'self' blob:;"
      override                = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }

    frame_options {
      frame_option = "SAMEORIGIN"
      override     = true
    }

    content_type_options {
      override = true
    }
  }

  # Custom headers for operational telemetry
  custom_headers_config {
    items {
      header   = "X-Candlefish-Environment"
      value    = var.environment
      override = true
    }

    items {
      header   = "X-Candlefish-Version"
      value    = "operational-atelier-v1"
      override = true
    }

    items {
      header   = "Cross-Origin-Embedder-Policy"
      value    = "require-corp"
      override = true
    }

    items {
      header   = "Cross-Origin-Opener-Policy"
      value    = "same-origin"
      override = true
    }
  }
}

# CloudWatch Alarms for CDN monitoring
resource "aws_cloudwatch_metric_alarm" "cache_hit_rate" {
  alarm_name          = "${var.project_name}-${var.environment}-cdn-cache-hit-rate"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CacheHitRate"
  namespace           = "AWS/CloudFront"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "This metric monitors CloudFront cache hit rate"
  alarm_actions       = []

  dimensions = {
    DistributionId = aws_cloudfront_distribution.main.id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "origin_latency" {
  alarm_name          = "${var.project_name}-${var.environment}-cdn-origin-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "OriginLatency"
  namespace           = "AWS/CloudFront"
  period              = "300"
  statistic           = "Average"
  threshold           = "1000" # 1 second
  alarm_description   = "This metric monitors CloudFront origin latency"
  alarm_actions       = []

  dimensions = {
    DistributionId = aws_cloudfront_distribution.main.id
  }

  tags = var.tags
}

# AWS Provider alias for us-east-1 (required for ACM certificates with CloudFront)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}