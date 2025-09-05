# CDN Module Variables
# Optimized for Candlefish.ai brand website with operational atelier

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "project_name" {
  description = "Name of the project/application"
  type        = string
}

variable "domain_name" {
  description = "Primary domain name for the CDN distribution"
  type        = string
}

variable "alternate_domain_names" {
  description = "List of alternate domain names (CNAMEs)"
  type        = list(string)
  default     = []
}

variable "origin_domain_name" {
  description = "Domain name of the origin (S3 bucket or load balancer)"
  type        = string
}

variable "origin_path" {
  description = "Path prefix for the origin"
  type        = string
  default     = ""
}

variable "price_class" {
  description = "CloudFront distribution price class"
  type        = string
  default     = "PriceClass_All"
  validation {
    condition     = contains(["PriceClass_100", "PriceClass_200", "PriceClass_All"], var.price_class)
    error_message = "Price class must be PriceClass_100, PriceClass_200, or PriceClass_All."
  }
}

variable "default_ttl" {
  description = "Default TTL for objects in seconds"
  type        = number
  default     = 86400 # 24 hours
}

variable "max_ttl" {
  description = "Maximum TTL for objects in seconds"
  type        = number
  default     = 31536000 # 1 year
}

variable "enable_logging" {
  description = "Enable CloudFront access logging"
  type        = bool
  default     = true
}

variable "enable_real_time_logs" {
  description = "Enable CloudFront real-time logs"
  type        = bool
  default     = false
}

variable "web_acl_id" {
  description = "WAF Web ACL ID for CloudFront"
  type        = string
  default     = null
}

variable "lambda_edge_functions" {
  description = "Lambda@Edge functions configuration"
  type = map(object({
    event_type   = string
    function_arn = string
  }))
  default = {}
}

variable "custom_error_response" {
  description = "Custom error response configuration"
  type = list(object({
    error_code            = number
    response_code         = number
    response_page_path    = string
    error_caching_min_ttl = number
  }))
  default = [
    {
      error_code            = 404
      response_code         = 200
      response_page_path    = "/index.html"
      error_caching_min_ttl = 300
    }
  ]
}

variable "geo_restriction" {
  description = "Geographic restriction configuration"
  type = object({
    restriction_type = string
    locations        = list(string)
  })
  default = {
    restriction_type = "none"
    locations        = []
  }
}

variable "minimum_protocol_version" {
  description = "Minimum SSL/TLS protocol version"
  type        = string
  default     = "TLSv1.2_2021"
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# Cache behavior configurations for different content types
variable "cache_behaviors" {
  description = "Additional cache behaviors for specific path patterns"
  type = list(object({
    path_pattern           = string
    target_origin_id       = string
    viewer_protocol_policy = string
    allowed_methods        = list(string)
    cached_methods         = list(string)
    compress              = bool
    ttl_settings = object({
      default_ttl = number
      max_ttl     = number
      min_ttl     = number
    })
    forwarded_values = object({
      query_string = bool
      headers      = list(string)
      cookies = object({
        forward           = string
        whitelisted_names = list(string)
      })
    })
  }))
  default = []
}

# Origin configuration for multiple origins
variable "origins" {
  description = "Additional origins for the distribution"
  type = list(object({
    origin_id   = string
    domain_name = string
    origin_path = string
    custom_origin_config = optional(object({
      http_port              = number
      https_port             = number
      origin_protocol_policy = string
      origin_ssl_protocols   = list(string)
    }))
    s3_origin_config = optional(object({
      origin_access_identity = string
    }))
  }))
  default = []
}