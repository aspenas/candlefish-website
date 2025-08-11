# CloudFront Distribution and SSL Configuration for Tyler Setup Platform

# SSL Certificate for the domain
resource "aws_acm_certificate" "main" {
  domain_name               = var.domain_name
  subject_alternative_names = [
    "*.${var.domain_name}",
    var.api_domain_name,
    "ws.${var.domain_name}"
  ]
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-ssl-cert"
  })
}

# Route53 Hosted Zone
resource "aws_route53_zone" "main" {
  name = var.domain_name

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-hosted-zone"
  })
}

# Certificate validation records
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.main.zone_id
}

resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# S3 Bucket for Frontend Static Assets
resource "aws_s3_bucket" "frontend" {
  bucket = "${var.project_name}-frontend-${random_id.bucket_suffix.hex}"

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-frontend-bucket"
    Type = "Static Website"
  })
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        kms_master_key_id = aws_kms_key.main.arn
        sse_algorithm     = "aws:kms"
      }
    }
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Origin Access Control for CloudFront
resource "aws_cloudfront_origin_access_control" "main" {
  name                              = "${var.project_name}-oac"
  description                       = "OAC for Tyler Setup Platform"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# S3 Bucket Policy for CloudFront
resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

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
        Resource = "${aws_s3_bucket.frontend.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.main.arn
          }
        }
      }
    ]
  })
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = var.cloudfront_price_class
  aliases             = [var.domain_name, "www.${var.domain_name}"]

  # S3 Origin for static assets
  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.frontend.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.main.id
  }

  # ALB Origin for API requests
  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "ALB-${aws_lb.main.name}"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default cache behavior for static assets
  default_cache_behavior {
    allowed_methods            = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods             = ["GET", "HEAD"]
    target_origin_id           = "S3-${aws_s3_bucket.frontend.id}"
    compress                   = true
    viewer_protocol_policy     = "redirect-to-https"
    cache_policy_id           = aws_cloudfront_cache_policy.static_assets.id
    origin_request_policy_id  = aws_cloudfront_origin_request_policy.static_assets.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
  }

  # API cache behavior
  ordered_cache_behavior {
    path_pattern               = "/api/*"
    allowed_methods            = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods             = ["GET", "HEAD", "OPTIONS"]
    target_origin_id           = "ALB-${aws_lb.main.name}"
    compress                   = true
    viewer_protocol_policy     = "https-only"
    cache_policy_id           = aws_cloudfront_cache_policy.api.id
    origin_request_policy_id  = aws_cloudfront_origin_request_policy.api.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
  }

  # GraphQL cache behavior
  ordered_cache_behavior {
    path_pattern               = "/graphql"
    allowed_methods            = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods             = ["GET", "HEAD", "OPTIONS"]
    target_origin_id           = "ALB-${aws_lb.main.name}"
    compress                   = true
    viewer_protocol_policy     = "https-only"
    cache_policy_id           = aws_cloudfront_cache_policy.api.id
    origin_request_policy_id  = aws_cloudfront_origin_request_policy.api.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
  }

  # WebSocket cache behavior (pass-through)
  ordered_cache_behavior {
    path_pattern               = "/ws/*"
    allowed_methods            = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods             = ["GET", "HEAD"]
    target_origin_id           = "ALB-${aws_lb.main.name}"
    compress                   = false
    viewer_protocol_policy     = "https-only"
    cache_policy_id           = aws_cloudfront_cache_policy.websocket.id
    origin_request_policy_id  = aws_cloudfront_origin_request_policy.websocket.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.main.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-cloudfront"
  })
}

# Cache Policies
resource "aws_cloudfront_cache_policy" "static_assets" {
  name        = "${var.project_name}-static-assets"
  comment     = "Cache policy for static assets"
  default_ttl = 86400
  max_ttl     = 31536000
  min_ttl     = 0

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

resource "aws_cloudfront_cache_policy" "api" {
  name        = "${var.project_name}-api"
  comment     = "Cache policy for API requests"
  default_ttl = 0
  max_ttl     = 300
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
          "Origin",
          "Referer",
          "User-Agent",
          "X-Forwarded-For",
          "X-Requested-With"
        ]
      }
    }

    cookies_config {
      cookie_behavior = "all"
    }
  }
}

resource "aws_cloudfront_cache_policy" "websocket" {
  name        = "${var.project_name}-websocket"
  comment     = "Cache policy for WebSocket connections"
  default_ttl = 0
  max_ttl     = 0
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = false
    enable_accept_encoding_gzip   = false

    query_strings_config {
      query_string_behavior = "all"
    }

    headers_config {
      header_behavior = "whitelist"
      headers {
        items = [
          "Authorization",
          "Connection",
          "Sec-WebSocket-Extensions",
          "Sec-WebSocket-Key",
          "Sec-WebSocket-Protocol",
          "Sec-WebSocket-Version",
          "Upgrade"
        ]
      }
    }

    cookies_config {
      cookie_behavior = "all"
    }
  }
}

# Origin Request Policies
resource "aws_cloudfront_origin_request_policy" "static_assets" {
  name    = "${var.project_name}-static-assets-origin"
  comment = "Origin request policy for static assets"

  cookies_config {
    cookie_behavior = "none"
  }

  headers_config {
    header_behavior = "whitelist"
    headers {
      items = ["Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers"]
    }
  }

  query_strings_config {
    query_string_behavior = "none"
  }
}

resource "aws_cloudfront_origin_request_policy" "api" {
  name    = "${var.project_name}-api-origin"
  comment = "Origin request policy for API requests"

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

resource "aws_cloudfront_origin_request_policy" "websocket" {
  name    = "${var.project_name}-websocket-origin"
  comment = "Origin request policy for WebSocket connections"

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

# Response Headers Policy for Security
resource "aws_cloudfront_response_headers_policy" "security_headers" {
  name    = "${var.project_name}-security-headers"
  comment = "Security headers for Tyler Setup Platform"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
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

  custom_headers_config {
    items {
      header   = "X-XSS-Protection"
      value    = "1; mode=block"
      override = true
    }

    items {
      header   = "Permissions-Policy"
      value    = "geolocation=(), microphone=(), camera=()"
      override = true
    }

    items {
      header   = "X-Content-Type-Options"
      value    = "nosniff"
      override = true
    }
  }

  cors_config {
    access_control_allow_credentials = true

    access_control_allow_headers {
      items = [
        "Authorization",
        "Content-Type",
        "X-Requested-With",
        "Accept",
        "Origin",
        "Cache-Control"
      ]
    }

    access_control_allow_methods {
      items = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
    }

    access_control_allow_origins {
      items = ["https://${var.domain_name}", "https://www.${var.domain_name}"]
    }

    access_control_max_age_sec = 86400
    origin_override            = true
  }
}

# Route53 Records
resource "aws_route53_record" "main" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.api_domain_name
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "ws" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "ws.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# DynamoDB Tables for session management and real-time features
resource "aws_dynamodb_table" "sessions" {
  name           = "${var.project_name}-sessions"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "session_id"

  attribute {
    name = "session_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  global_secondary_index {
    name            = "UserSessions"
    hash_key        = "user_id"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.main.arn
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-sessions-table"
    Type = "DynamoDB"
  })
}

resource "aws_dynamodb_table" "websocket_connections" {
  name           = "${var.project_name}-websocket-connections"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "connection_id"

  attribute {
    name = "connection_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  global_secondary_index {
    name            = "UserConnections"
    hash_key        = "user_id"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.main.arn
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-websocket-connections-table"
    Type = "DynamoDB"
  })
}

resource "aws_dynamodb_table" "real_time_events" {
  name           = "${var.project_name}-real-time-events"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "event_id"
  range_key      = "timestamp"

  attribute {
    name = "event_id"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "N"
  }

  attribute {
    name = "room_id"
    type = "S"
  }

  global_secondary_index {
    name            = "RoomEvents"
    hash_key        = "room_id"
    range_key       = "timestamp"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.main.arn
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-real-time-events-table"
    Type = "DynamoDB"
  })
}
