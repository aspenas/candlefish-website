# CloudFront Distribution for RTPM Frontend
# Optimized for global performance and security

################################################################################
# S3 Bucket for CloudFront Logs
################################################################################

resource "aws_s3_bucket" "cloudfront_logs" {
  bucket = "${local.name}-cloudfront-logs"

  tags = local.tags
}

resource "aws_s3_bucket_versioning" "cloudfront_logs" {
  bucket = aws_s3_bucket.cloudfront_logs.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "cloudfront_logs" {
  bucket = aws_s3_bucket.cloudfront_logs.id

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "cloudfront_logs" {
  bucket = aws_s3_bucket.cloudfront_logs.id

  rule {
    id     = "delete_old_logs"
    status = "Enabled"

    expiration {
      days = 90
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

resource "aws_s3_bucket_public_access_block" "cloudfront_logs" {
  bucket = aws_s3_bucket.cloudfront_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

################################################################################
# WAF for CloudFront
################################################################################

resource "aws_wafv2_web_acl" "cloudfront" {
  count = var.enable_waf ? 1 : 0

  name  = "${local.name}-cloudfront-waf"
  scope = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # Rate limiting rule
  rule {
    name     = "RateLimitRule"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = var.waf_rate_limit
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name}-RateLimitRule"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules - Core Rule Set
  rule {
    name     = "AWSManagedRulesCore"
    priority = 2

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
      metric_name                = "${local.name}-AWSManagedRulesCore"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules - Known Bad Inputs
  rule {
    name     = "AWSManagedRulesKnownBadInputs"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name}-AWSManagedRulesKnownBadInputs"
      sampled_requests_enabled   = true
    }
  }

  # Block requests from specific countries (if needed)
  # rule {
  #   name     = "GeoBlockRule"
  #   priority = 4

  #   action {
  #     block {}
  #   }

  #   statement {
  #     geo_match_statement {
  #       country_codes = ["CN", "RU"]  # Example: block China and Russia
  #     }
  #   }

  #   visibility_config {
  #     cloudwatch_metrics_enabled = true
  #     metric_name                = "${local.name}-GeoBlockRule"
  #     sampled_requests_enabled   = true
  #   }
  # }

  tags = local.tags

  # Ensure it's created in us-east-1 for CloudFront
  provider = aws.us_east_1
}

# CloudWatch log group for WAF
resource "aws_cloudwatch_log_group" "waf_log_group" {
  count = var.enable_waf ? 1 : 0

  name              = "/aws/wafv2/${local.name}-cloudfront"
  retention_in_days = var.cloudwatch_log_retention_days

  tags = local.tags

  provider = aws.us_east_1
}

# WAF logging configuration
resource "aws_wafv2_web_acl_logging_configuration" "cloudfront" {
  count = var.enable_waf ? 1 : 0

  resource_arn            = aws_wafv2_web_acl.cloudfront[0].arn
  log_destination_configs = [aws_cloudwatch_log_group.waf_log_group[0].arn]

  redacted_fields {
    single_header {
      name = "authorization"
    }
  }

  redacted_fields {
    single_header {
      name = "cookie"
    }
  }

  provider = aws.us_east_1
}

################################################################################
# CloudFront Distribution
################################################################################

resource "aws_cloudfront_distribution" "rtpm_frontend" {
  comment             = "RTPM Frontend Distribution"
  default_root_object = "index.html"
  enabled             = true
  is_ipv6_enabled     = true
  price_class         = var.cloudfront_price_class
  web_acl_id          = var.enable_waf ? aws_wafv2_web_acl.cloudfront[0].arn : null

  # Origin for the ALB (dynamic content)
  origin {
    domain_name = "rtpm.${var.domain_name}"  # This will be the ALB domain
    origin_id   = "ALB-${local.name}"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }

    custom_header {
      name  = "X-Forwarded-Host"
      value = var.domain_name
    }
  }

  # Default cache behavior (for dynamic content)
  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    target_origin_id       = "ALB-${local.name}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    # Cache policy for dynamic content
    cache_policy_id = data.aws_cloudfront_cache_policy.caching_disabled.id

    # Origin request policy
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.cors_s3origin.id

    # Response headers policy
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id

    # Real-time logs
    realtime_log_config_arn = aws_cloudfront_realtime_log_config.rtpm.arn
  }

  # Cache behavior for static assets
  ordered_cache_behavior {
    path_pattern           = "/static/*"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "ALB-${local.name}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    # Cache policy for static content
    cache_policy_id = data.aws_cloudfront_cache_policy.caching_optimized.id

    # Response headers policy
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
  }

  # Cache behavior for API requests
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    target_origin_id       = "ALB-${local.name}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    # No caching for API requests
    cache_policy_id = data.aws_cloudfront_cache_policy.caching_disabled.id

    # Origin request policy for API
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.cors_s3origin.id

    # Response headers policy
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
  }

  # Cache behavior for WebSocket connections
  ordered_cache_behavior {
    path_pattern           = "/ws/*"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "ALB-${local.name}"
    compress               = false
    viewer_protocol_policy = "redirect-to-https"

    # No caching for WebSocket
    cache_policy_id = data.aws_cloudfront_cache_policy.caching_disabled.id

    # Origin request policy
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.cors_s3origin.id

    # Response headers policy
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
  }

  # Geographic restrictions
  restrictions {
    geo_restriction {
      restriction_type = "none"
      # locations        = ["US", "CA", "GB", "DE"]  # Whitelist specific countries if needed
    }
  }

  # SSL/TLS Configuration
  viewer_certificate {
    acm_certificate_arn      = var.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = var.cloudfront_minimum_protocol_version
  }

  # Aliases
  aliases = [
    var.domain_name,
    "www.${var.domain_name}",
    "dashboard.${var.domain_name}"
  ]

  # Logging configuration
  logging_config {
    include_cookies = false
    bucket          = aws_s3_bucket.cloudfront_logs.bucket_domain_name
    prefix          = "cloudfront-logs/"
  }

  # Custom error responses
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
    error_caching_min_ttl = 300
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
    error_caching_min_ttl = 300
  }

  custom_error_response {
    error_code         = 500
    response_code      = 500
    response_page_path = "/error.html"
    error_caching_min_ttl = 300
  }

  custom_error_response {
    error_code         = 502
    response_code      = 502
    response_page_path = "/error.html"
    error_caching_min_ttl = 300
  }

  custom_error_response {
    error_code         = 503
    response_code      = 503
    response_page_path = "/maintenance.html"
    error_caching_min_ttl = 300
  }

  custom_error_response {
    error_code         = 504
    response_code      = 504
    response_page_path = "/error.html"
    error_caching_min_ttl = 300
  }

  tags = local.tags
}

################################################################################
# CloudFront Response Headers Policy
################################################################################

resource "aws_cloudfront_response_headers_policy" "security_headers" {
  name    = "${local.name}-security-headers"
  comment = "Security headers for RTPM"

  cors_config {
    access_control_allow_credentials = false

    access_control_allow_headers {
      items = ["*"]
    }

    access_control_allow_methods {
      items = ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"]
    }

    access_control_allow_origins {
      items = ["https://${var.domain_name}", "https://dashboard.${var.domain_name}"]
    }

    access_control_expose_headers {
      items = ["*"]
    }

    access_control_max_age_sec = 600
    origin_override           = false
  }

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      override                   = true
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
  }

  custom_headers_config {
    items {
      header   = "X-Custom-Header"
      value    = "RTPM-CDN"
      override = false
    }
  }
}

################################################################################
# CloudFront Real-time Logs
################################################################################

resource "aws_kinesis_stream" "cloudfront_realtime_logs" {
  name        = "${local.name}-cloudfront-realtime-logs"
  shard_count = 2

  shard_level_metrics = [
    "IncomingRecords",
    "OutgoingRecords",
  ]

  retention_period = 24

  encryption_type = "KMS"
  kms_key_id      = "alias/aws/kinesis"

  tags = local.tags
}

resource "aws_cloudfront_realtime_log_config" "rtpm" {
  name          = "${local.name}-realtime-logs"
  endpoint_type = "Kinesis"
  kinesis_stream_config {
    role_arn   = aws_iam_role.cloudfront_realtime_logs.arn
    stream_arn = aws_kinesis_stream.cloudfront_realtime_logs.arn
  }

  fields = [
    "timestamp",
    "c-ip",
    "sc-status",
    "sc-bytes",
    "cs-method",
    "cs-protocol",
    "cs-host",
    "cs-uri-stem",
    "cs-uri-query",
    "c-referrer",
    "c-user-agent",
    "cs-cookie",
    "time-taken",
    "x-forwarded-for",
    "ssl-protocol",
    "ssl-cipher",
    "x-edge-response-result-type",
    "x-edge-request-id",
    "x-host-header"
  ]
}

resource "aws_iam_role" "cloudfront_realtime_logs" {
  name = "${local.name}-cloudfront-realtime-logs"

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

  tags = local.tags
}

resource "aws_iam_role_policy" "cloudfront_realtime_logs" {
  name = "${local.name}-cloudfront-realtime-logs"
  role = aws_iam_role.cloudfront_realtime_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kinesis:PutRecord",
          "kinesis:PutRecords"
        ]
        Resource = aws_kinesis_stream.cloudfront_realtime_logs.arn
      }
    ]
  })
}

################################################################################
# Data Sources for CloudFront Policies
################################################################################

data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_origin_request_policy" "cors_s3origin" {
  name = "Managed-CORS-S3Origin"
}

################################################################################
# Additional AWS Provider for us-east-1 (required for CloudFront)
################################################################################

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "RTPM"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = "Candlefish"
      CostCenter  = "Engineering"
    }
  }
}

################################################################################
# CloudFront Outputs
################################################################################

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.rtpm_frontend.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.rtpm_frontend.domain_name
}

output "cloudfront_hosted_zone_id" {
  description = "CloudFront distribution hosted zone ID"
  value       = aws_cloudfront_distribution.rtpm_frontend.hosted_zone_id
}

output "cloudfront_arn" {
  description = "CloudFront distribution ARN"
  value       = aws_cloudfront_distribution.rtpm_frontend.arn
}
