# Variables for Security Module

variable "environment" {
  description = "Environment name (staging, production)"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs"
  type        = list(string)
}

variable "rate_limit_per_5min" {
  description = "Rate limit per 5 minutes for WAF"
  type        = number
  default     = 2000
}

variable "blocked_countries" {
  description = "List of country codes to block"
  type        = list(string)
  default     = []
}

variable "max_animation_particles" {
  description = "Maximum number of animation particles"
  type        = number
  default     = 10000
}

variable "max_websocket_connections" {
  description = "Maximum number of WebSocket connections"
  type        = number
  default     = 1000
}

variable "analytics_api_key" {
  description = "API key for analytics service"
  type        = string
  sensitive   = true
  default     = ""
}

variable "monitoring_api_key" {
  description = "API key for monitoring service"
  type        = string
  sensitive   = true
  default     = ""
}

variable "enable_guardduty" {
  description = "Enable GuardDuty threat detection"
  type        = bool
  default     = true
}

variable "enable_config_compliance" {
  description = "Enable AWS Config for compliance monitoring"
  type        = bool
  default     = true
}

variable "enable_cloudtrail" {
  description = "Enable CloudTrail for audit logging"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}