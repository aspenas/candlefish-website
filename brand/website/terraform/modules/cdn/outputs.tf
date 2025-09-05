# CDN Module Outputs
# Comprehensive output values for cross-module integration

output "distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.main.id
}

output "distribution_arn" {
  description = "CloudFront distribution ARN"
  value       = aws_cloudfront_distribution.main.arn
}

output "distribution_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "distribution_hosted_zone_id" {
  description = "CloudFront distribution hosted zone ID"
  value       = aws_cloudfront_distribution.main.hosted_zone_id
}

output "cloudfront_url" {
  description = "Full CloudFront URL"
  value       = "https://${aws_cloudfront_distribution.main.domain_name}"
}

output "custom_domain_url" {
  description = "Custom domain URL"
  value       = "https://${var.domain_name}"
}

output "origin_access_control_id" {
  description = "Origin Access Control ID"
  value       = aws_cloudfront_origin_access_control.main.id
}

# Cache Policy IDs for reuse
output "cache_policy_ids" {
  description = "Cache policy IDs for different content types"
  value = {
    spa_optimized  = aws_cloudfront_cache_policy.spa_optimized.id
    api_optimized  = aws_cloudfront_cache_policy.api_optimized.id
    static_assets  = aws_cloudfront_cache_policy.static_assets.id
    webgl_assets   = aws_cloudfront_cache_policy.webgl_assets.id
  }
}

# Origin Request Policy IDs
output "origin_request_policy_ids" {
  description = "Origin request policy IDs"
  value = {
    cors_s3      = aws_cloudfront_origin_request_policy.cors_s3.id
    all_viewer   = aws_cloudfront_origin_request_policy.all_viewer.id
  }
}

# Response Headers Policy ID
output "response_headers_policy_id" {
  description = "Response headers policy ID"
  value       = aws_cloudfront_response_headers_policy.security_headers.id
}

# Logging configuration outputs
output "access_logs_bucket" {
  description = "S3 bucket for CloudFront access logs"
  value       = var.enable_logging ? aws_s3_bucket.cdn_logs[0].id : null
}

output "realtime_logs_stream" {
  description = "Kinesis stream for real-time logs"
  value       = var.enable_real_time_logs ? aws_kinesis_stream.realtime_logs[0].name : null
}

output "realtime_logs_stream_arn" {
  description = "Kinesis stream ARN for real-time logs"
  value       = var.enable_real_time_logs ? aws_kinesis_stream.realtime_logs[0].arn : null
}

# Monitoring outputs
output "cache_hit_rate_alarm_arn" {
  description = "CloudWatch alarm ARN for cache hit rate"
  value       = aws_cloudwatch_metric_alarm.cache_hit_rate.arn
}

output "origin_latency_alarm_arn" {
  description = "CloudWatch alarm ARN for origin latency"
  value       = aws_cloudwatch_metric_alarm.origin_latency.arn
}

# Cost optimization metrics
output "cost_optimization_summary" {
  description = "Cost optimization summary"
  value = {
    price_class           = var.price_class
    compression_enabled   = true
    cache_behaviors_count = length(var.cache_behaviors) + 4 # Default + API + Static + WebGL
    logging_cost_per_month = var.enable_logging ? "$5-10" : "$0"
    realtime_logs_cost     = var.enable_real_time_logs ? "$10-50/month" : "$0"
  }
}

# Performance metrics
output "performance_configuration" {
  description = "Performance configuration summary"
  value = {
    ipv6_enabled          = true
    compression_enabled   = true
    http2_supported       = true
    http3_supported       = false
    gzip_enabled         = true
    brotli_enabled       = true
    webgl_optimized      = true
    api_caching_ttl      = "0-300 seconds"
    static_assets_ttl    = "30 days"
    spa_content_ttl      = "24 hours"
  }
}

# Security configuration
output "security_configuration" {
  description = "Security configuration summary"
  value = {
    https_only                = true
    hsts_enabled             = true
    csp_enabled              = true
    xfo_enabled              = true
    minimum_tls_version      = var.minimum_protocol_version
    origin_access_controlled = true
    waf_enabled              = var.web_acl_id != null
    cors_configured          = true
  }
}

# Integration points for other modules
output "integration_endpoints" {
  description = "Endpoints for integration with other services"
  value = {
    invalidation_endpoint = "https://cloudfront.amazonaws.com/"
    metrics_namespace     = "AWS/CloudFront"
    distribution_tag      = aws_cloudfront_distribution.main.tags_all
    cache_policies        = {
      spa      = aws_cloudfront_cache_policy.spa_optimized.name
      api      = aws_cloudfront_cache_policy.api_optimized.name
      static   = aws_cloudfront_cache_policy.static_assets.name
      webgl    = aws_cloudfront_cache_policy.webgl_assets.name
    }
  }
}