# S3 + CloudFront Module for Static Sites
# Cost-optimized for startup scale

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Variables
variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "domain_name" {
  description = "Domain name for the site"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "cloudfront_price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100"
}

variable "s3_lifecycle_rules" {
  description = "S3 lifecycle rules for cost optimization"
  type = object({
    transition_to_ia_days      = number
    transition_to_glacier_days = number
    expiration_days           = number
  })
  default = {
    transition_to_ia_days      = 30
    transition_to_glacier_days = 90
    expiration_days           = 0
  }
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

# Locals
locals {
  bucket_name = "candlefish-${var.project_name}-${var.environment}"
  origin_id   = "S3-${local.bucket_name}"
}

# ============================================
# S3 Bucket for Static Content
# ============================================
resource "aws_s3_bucket" "static_site" {
  bucket = local.bucket_name

  tags = merge(var.tags, {
    Name = local.bucket_name
    Type = "StaticSite"
  })
}

# Bucket versioning (disabled for cost savings in non-production)
resource "aws_s3_bucket_versioning" "static_site" {
  bucket = aws_s3_bucket.static_site.id

  versioning_configuration {
    status = var.environment == "production" ? "Enabled" : "Suspended"
  }
}

# Bucket encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "static_site" {
  bucket = aws_s3_bucket.static_site.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Public access block (CloudFront will access via OAC)
resource "aws_s3_bucket_public_access_block" "static_site" {
  bucket = aws_s3_bucket.static_site.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle rules for cost optimization
resource "aws_s3_bucket_lifecycle_configuration" "static_site" {
  bucket = aws_s3_bucket.static_site.id

  rule {
    id     = "cost-optimization"
    status = "Enabled"

    # Transition to Infrequent Access
    dynamic "transition" {
      for_each = var.s3_lifecycle_rules.transition_to_ia_days > 0 ? [1] : []
      content {
        days          = var.s3_lifecycle_rules.transition_to_ia_days
        storage_class = "STANDARD_IA"
      }
    }

    # Transition to Glacier
    dynamic "transition" {
      for_each = var.s3_lifecycle_rules.transition_to_glacier_days > 0 ? [1] : []
      content {
        days          = var.s3_lifecycle_rules.transition_to_glacier_days
        storage_class = "GLACIER_FLEXIBLE_RETRIEVAL"
      }
    }

    # Expiration (for non-production environments)
    dynamic "expiration" {
      for_each = var.s3_lifecycle_rules.expiration_days > 0 ? [1] : []
      content {
        days = var.s3_lifecycle_rules.expiration_days
      }
    }

    # Clean up incomplete multipart uploads
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }

  # Clean up old versions (if versioning is enabled)
  rule {
    id     = "delete-old-versions"
    status = var.environment == "production" ? "Enabled" : "Disabled"

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

# ============================================
# CloudFront Distribution
# ============================================

# Origin Access Control for S3
resource "aws_cloudfront_origin_access_control" "static_site" {
  name                              = "${local.bucket_name}-oac"
  description                       = "OAC for ${var.project_name}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront distribution
resource "aws_cloudfront_distribution" "static_site" {
  enabled             = true
  is_ipv6_enabled    = true
  default_root_object = "index.html"
  price_class        = var.cloudfront_price_class

  aliases = var.environment == "production" ? [var.domain_name] : []

  origin {
    domain_name              = aws_s3_bucket.static_site.bucket_regional_domain_name
    origin_id                = local.origin_id
    origin_access_control_id = aws_cloudfront_origin_access_control.static_site.id
  }

  # Default cache behavior
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.origin_id

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
    compress               = true
  }

  # Cache behavior for static assets
  ordered_cache_behavior {
    path_pattern     = "*.js"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.origin_id

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 31536000
    default_ttl            = 31536000
    max_ttl                = 31536000
    compress               = true
  }

  ordered_cache_behavior {
    path_pattern     = "*.css"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.origin_id

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 31536000
    default_ttl            = 31536000
    max_ttl                = 31536000
    compress               = true
  }

  # Custom error pages
  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.environment != "production"
    acm_certificate_arn            = var.environment == "production" ? aws_acm_certificate.static_site[0].arn : null
    ssl_support_method             = var.environment == "production" ? "sni-only" : null
    minimum_protocol_version       = "TLSv1.2_2021"
  }

  # Logging (disabled for non-production to save costs)
  dynamic "logging_config" {
    for_each = var.environment == "production" ? [1] : []
    content {
      bucket          = aws_s3_bucket.logs[0].bucket_domain_name
      prefix          = "cloudfront/${var.project_name}/"
      include_cookies = false
    }
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-cdn"
  })
}

# ============================================
# S3 Bucket Policy for CloudFront
# ============================================
resource "aws_s3_bucket_policy" "static_site" {
  bucket = aws_s3_bucket.static_site.id

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
        Resource = "${aws_s3_bucket.static_site.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.static_site.arn
          }
        }
      }
    ]
  })
}

# ============================================
# SSL Certificate (Production Only)
# ============================================
resource "aws_acm_certificate" "static_site" {
  count = var.environment == "production" ? 1 : 0

  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-cert"
  })
}

# ============================================
# Logging Bucket (Production Only)
# ============================================
resource "aws_s3_bucket" "logs" {
  count = var.environment == "production" ? 1 : 0

  bucket = "${local.bucket_name}-logs"

  tags = merge(var.tags, {
    Name = "${local.bucket_name}-logs"
    Type = "Logs"
  })
}

resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  count = var.environment == "production" ? 1 : 0

  bucket = aws_s3_bucket.logs[0].id

  rule {
    id     = "delete-old-logs"
    status = "Enabled"

    expiration {
      days = 30
    }
  }
}

# ============================================
# Outputs
# ============================================
output "bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.static_site.id
}

output "bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.static_site.arn
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.static_site.id
}

output "cloudfront_url" {
  description = "CloudFront distribution URL"
  value       = "https://${aws_cloudfront_distribution.static_site.domain_name}"
}

output "cloudfront_arn" {
  description = "CloudFront distribution ARN"
  value       = aws_cloudfront_distribution.static_site.arn
}
