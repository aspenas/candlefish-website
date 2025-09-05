# Development Environment Variables

variable "aws_region" {
  description = "AWS region for development environment"
  type        = string
  default     = "us-east-1"
}

variable "availability_zones" {
  description = "Availability zones for development environment"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "enable_detailed_monitoring" {
  description = "Enable detailed CloudWatch monitoring (costs extra)"
  type        = bool
  default     = false
}

variable "enable_backup_services" {
  description = "Enable backup services (RDS automated backups, etc.)"
  type        = bool
  default     = false
}

variable "developer_access_ips" {
  description = "List of IP addresses for developer access"
  type        = list(string)
  default     = []
}

variable "auto_shutdown_schedule" {
  description = "Cron expression for auto-shutdown (cost optimization)"
  type        = string
  default     = "cron(0 22 * * MON-FRI)"  # Shutdown at 10 PM weekdays
}

variable "auto_startup_schedule" {
  description = "Cron expression for auto-startup (cost optimization)"
  type        = string
  default     = "cron(0 8 * * MON-FRI)"   # Start at 8 AM weekdays
}

variable "force_delete_resources" {
  description = "Allow force deletion of resources (useful for dev environment cleanup)"
  type        = bool
  default     = true
}

variable "enable_experimental_features" {
  description = "Enable experimental features for testing"
  type        = bool
  default     = true
}

variable "log_level" {
  description = "Application log level for development"
  type        = string
  default     = "debug"
  validation {
    condition     = contains(["debug", "info", "warn", "error"], var.log_level)
    error_message = "Log level must be debug, info, warn, or error."
  }
}

variable "resource_prefix" {
  description = "Prefix for resource names (useful for developer isolation)"
  type        = string
  default     = "dev"
}

variable "tags" {
  description = "Additional tags for development resources"
  type        = map(string)
  default = {
    AutoShutdown = "enabled"
    CostCenter   = "development"
    Owner        = "dev-team"
  }
}