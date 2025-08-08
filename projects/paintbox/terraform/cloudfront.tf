# CloudFront CDN Configuration for Paintbox Application

# ACM Certificate for CloudFront (must be in us-east-1)
resource "aws_acm_certificate" "cloudfront_cert" {
  count = var.create_certificate && var.domain_name != "" ? 1 : 0

  provider                  = aws.us_east_1
  domain_name              = var.domain_name
  subject_alternative_names = ["www.${var.domain_name}"]
  validation_method        = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(local.common_tags, {
    Name = "paintbox-cloudfront-${var.environment}"
  })
}

# Certificate validation
resource "aws_acm_certificate_validation" "cloudfront_cert" {
  count = var.create_certificate && var.domain_name != "" ? 1 : 0

  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.cloudfront_cert[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]

  timeouts {
    create = "5m"
  }
}

# Route53 records for certificate validation
resource "aws_route53_record" "cert_validation" {
  for_each = var.create_certificate && var.domain_name != "" ? {
    for dvo in aws_acm_certificate.cloudfront_cert[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main[0].zone_id
}

# Route53 hosted zone (if domain is provided)
data "aws_route53_zone" "main" {
  count = var.domain_name != "" ? 1 : 0
  name  = var.domain_name
}

# CloudFront Origin Access Control
resource "aws_cloudfront_origin_access_control" "paintbox" {
  name                              = "paintbox-oac-${var.environment}"
  description                       = "OAC for Paintbox ${var.environment}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# S3 bucket for static assets
resource "aws_s3_bucket" "static_assets" {
  bucket        = "paintbox-static-${var.environment}-${random_id.bucket_suffix.hex}"
  force_destroy = var.environment == "staging"

  tags = merge(local.common_tags, {
    Name = "paintbox-static-${var.environment}"
  })
}

resource "aws_s3_bucket_public_access_block" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id
  versioning_configuration {
    status = var.environment == "production" ? "Enabled" : "Suspended"
  }
}

# S3 bucket policy for CloudFront
resource "aws_s3_bucket_policy" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.static_assets.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.paintbox.arn
          }
        }
      }
    ]
  })
}

# CloudFront distribution
resource "aws_cloudfront_distribution" "paintbox" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  comment             = "Paintbox ${var.environment} CDN"
  price_class         = var.environment == "production" ? "PriceClass_All" : "PriceClass_100"

  # ALB origin for dynamic content
  origin {
    domain_name = aws_lb.paintbox.dns_name
    origin_id   = "ALB-${var.environment}"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }

    custom_header {
      name  = "X-Forwarded-Host"
      value = var.domain_name != "" ? var.domain_name : aws_lb.paintbox.dns_name
    }
  }

  # S3 origin for static assets
  origin {
    domain_name              = aws_s3_bucket.static_assets.bucket_regional_domain_name
    origin_id                = "S3-${var.environment}"
    origin_access_control_id = aws_cloudfront_origin_access_control.paintbox.id
  }

  # Default cache behavior (ALB for dynamic content)
  default_cache_behavior {
    target_origin_id       = "ALB-${var.environment}"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    allowed_methods = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods  = ["GET", "HEAD", "OPTIONS"]

    forwarded_values {
      query_string = true
      headers      = [
        "Authorization",
        "CloudFront-Forwarded-Proto",
        "Host",
        "User-Agent",
        "X-Forwarded-For",
        "X-Forwarded-Host",
        "X-Forwarded-Proto",
        "Accept",
        "Accept-Language",
        "Accept-Encoding",
        "Referer"
      ]

      cookies {
        forward = "all"
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0

    # Security headers
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
  }

  # Static assets cache behavior
  ordered_cache_behavior {
    path_pattern     = "/static/*"
    target_origin_id = "S3-${var.environment}"

    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 31536000  # 1 year
    default_ttl = 31536000  # 1 year
    max_ttl     = 31536000  # 1 year
  }

  # Images and media cache behavior
  ordered_cache_behavior {
    path_pattern     = "*.{jpg,jpeg,png,gif,ico,svg,webp,pdf}"
    target_origin_id = "ALB-${var.environment}"

    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 86400   # 1 day
    default_ttl = 604800  # 1 week
    max_ttl     = 2592000 # 30 days
  }

  # API endpoints - no caching
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    target_origin_id = "ALB-${var.environment}"

    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    viewer_protocol_policy = "redirect-to-https"
    compress               = false

    forwarded_values {
      query_string = true
      headers      = ["*"]

      cookies {
        forward = "all"
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  # Geographic restrictions
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # SSL/TLS configuration
  viewer_certificate {
    cloudfront_default_certificate = var.domain_name == ""
    acm_certificate_arn           = var.domain_name != "" ? aws_acm_certificate_validation.cloudfront_cert[0].certificate_arn : null
    ssl_support_method            = var.domain_name != "" ? "sni-only" : null
    minimum_protocol_version      = "TLSv1.2_2021"
  }

  # Custom domain configuration
  aliases = var.domain_name != "" ? [var.domain_name, "www.${var.domain_name}"] : []

  # Custom error pages
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
    error_caching_min_ttl = 300
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
    error_caching_min_ttl = 300
  }

  # Logging
  logging_config {
    bucket          = aws_s3_bucket.cloudfront_logs.bucket_domain_name
    prefix          = "cloudfront-logs/"
    include_cookies = false
  }

  tags = merge(local.common_tags, {
    Name = "paintbox-cdn-${var.environment}"
  })

  depends_on = [aws_acm_certificate_validation.cloudfront_cert]
}

# CloudFront Response Headers Policy
resource "aws_cloudfront_response_headers_policy" "security_headers" {
  name    = "paintbox-security-headers-${var.environment}"
  comment = "Security headers for Paintbox ${var.environment}"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      override                   = true
      preload                    = true
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

  cors_config {
    access_control_allow_credentials = false

    access_control_allow_headers {
      items = ["Authorization", "Content-Type", "X-Requested-With"]
    }

    access_control_allow_methods {
      items = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"]
    }

    access_control_allow_origins {
      items = var.domain_name != "" ? [
        "https://${var.domain_name}",
        "https://www.${var.domain_name}"
      ] : ["*"]
    }

    access_control_max_age_sec = 86400
    origin_override            = true
  }

  custom_headers_config {
    items {
      header   = "X-Frame-Options"
      value    = "DENY"
      override = true
    }

    items {
      header   = "X-Content-Type-Options"
      value    = "nosniff"
      override = true
    }

    items {
      header   = "X-XSS-Protection"
      value    = "1; mode=block"
      override = true
    }

    items {
      header   = "Content-Security-Policy"
      value    = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https:; media-src 'self' https:; object-src 'none'; frame-src 'none';"
      override = true
    }
  }
}

# S3 bucket for CloudFront logs
resource "aws_s3_bucket" "cloudfront_logs" {
  bucket        = "paintbox-cf-logs-${var.environment}-${random_id.bucket_suffix.hex}"
  force_destroy = var.environment == "staging"

  tags = merge(local.common_tags, {
    Name = "paintbox-cloudfront-logs-${var.environment}"
  })
}

resource "aws_s3_bucket_public_access_block" "cloudfront_logs" {
  bucket = aws_s3_bucket.cloudfront_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "cloudfront_logs" {
  bucket = aws_s3_bucket.cloudfront_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Log retention policy
resource "aws_s3_bucket_lifecycle_configuration" "cloudfront_logs" {
  bucket = aws_s3_bucket.cloudfront_logs.id

  rule {
    id     = "cloudfront_logs_lifecycle"
    status = "Enabled"

    expiration {
      days = var.environment == "production" ? 90 : 30
    }

    noncurrent_version_expiration {
      noncurrent_days = 7
    }
  }
}

# Route53 records for custom domain
resource "aws_route53_record" "main" {
  count = var.domain_name != "" ? 2 : 0

  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = count.index == 0 ? var.domain_name : "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.paintbox.domain_name
    zone_id                = aws_cloudfront_distribution.paintbox.hosted_zone_id
    evaluate_target_health = false
  }
}

# CloudFront monitoring and alarms
resource "aws_cloudwatch_metric_alarm" "cloudfront_error_rate" {
  count = var.environment == "production" || var.environment == "staging" ? 1 : 0

  alarm_name          = "paintbox-cloudfront-error-rate-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "4xxErrorRate"
  namespace           = "AWS/CloudFront"
  period              = "300"
  statistic           = "Average"
  threshold           = "5"
  alarm_description   = "CloudFront 4xx error rate is too high"
  alarm_actions       = [aws_sns_topic.paintbox_alerts.arn]

  dimensions = {
    DistributionId = aws_cloudfront_distribution.paintbox.id
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "cloudfront_origin_latency" {
  count = var.environment == "production" || var.environment == "staging" ? 1 : 0

  alarm_name          = "paintbox-cloudfront-origin-latency-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "OriginLatency"
  namespace           = "AWS/CloudFront"
  period              = "300"
  statistic           = "Average"
  threshold           = "5000" # 5 seconds
  alarm_description   = "CloudFront origin latency is too high"
  alarm_actions       = [aws_sns_topic.paintbox_alerts.arn]

  dimensions = {
    DistributionId = aws_cloudfront_distribution.paintbox.id
  }

  tags = local.common_tags
}

# CloudWatch dashboard update for CloudFront metrics
resource "aws_cloudwatch_dashboard" "paintbox_cloudfront" {
  count = var.environment == "production" || var.environment == "staging" ? 1 : 0

  dashboard_name = "Paintbox-CloudFront-${var.environment}"

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
            ["AWS/CloudFront", "Requests", "DistributionId", aws_cloudfront_distribution.paintbox.id],
            [".", "BytesDownloaded", ".", "."],
            [".", "BytesUploaded", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "CloudFront Traffic"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/CloudFront", "4xxErrorRate", "DistributionId", aws_cloudfront_distribution.paintbox.id],
            [".", "5xxErrorRate", ".", "."],
            [".", "CacheHitRate", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "CloudFront Error Rates and Cache Performance"
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
            ["AWS/CloudFront", "OriginLatency", "DistributionId", aws_cloudfront_distribution.paintbox.id]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Origin Latency"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/CloudFront", "EdgeLocation", "DistributionId", aws_cloudfront_distribution.paintbox.id, {"stat": "SampleCount"}]
          ]
          view    = "pie"
          stacked = false
          region  = var.aws_region
          title   = "Requests by Edge Location"
          period  = 300
        }
      }
    ]
  })

  tags = local.common_tags
}

# Random ID for unique bucket naming
resource "random_id" "bucket_suffix" {
  byte_length = 8
}

# Provider configuration for us-east-1 (required for CloudFront certificates)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# Output values
output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.paintbox.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.paintbox.domain_name
}

output "static_assets_bucket" {
  description = "S3 bucket for static assets"
  value       = aws_s3_bucket.static_assets.bucket
}

output "ssl_certificate_arn" {
  description = "ACM certificate ARN for SSL/TLS"
  value       = var.create_certificate && var.domain_name != "" ? aws_acm_certificate_validation.cloudfront_cert[0].certificate_arn : null
}
