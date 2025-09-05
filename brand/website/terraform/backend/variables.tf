# Terraform Backend Variables

variable "aws_region" {
  description = "AWS region for the Terraform backend"
  type        = string
  default     = "us-east-1"
}

variable "backup_region" {
  description = "AWS region for backup replication"
  type        = string
  default     = "us-west-2"
}

variable "s3_bucket_name" {
  description = "S3 bucket name for Terraform state (leave empty for auto-generated name)"
  type        = string
  default     = ""
}

variable "dynamodb_table_name" {
  description = "DynamoDB table name for Terraform locks"
  type        = string
  default     = "candlefish-terraform-locks"
}

variable "kms_deletion_window" {
  description = "KMS key deletion window in days"
  type        = number
  default     = 30
  validation {
    condition     = var.kms_deletion_window >= 7 && var.kms_deletion_window <= 30
    error_message = "KMS deletion window must be between 7 and 30 days."
  }
}

variable "state_version_retention_days" {
  description = "Number of days to retain old versions of state files"
  type        = number
  default     = 90
}

variable "enable_state_notifications" {
  description = "Enable SNS notifications for state changes"
  type        = bool
  default     = false
}

variable "notification_email_addresses" {
  description = "List of email addresses for state change notifications"
  type        = list(string)
  default     = []
}

variable "enable_cross_region_backup" {
  description = "Enable cross-region replication for state backup"
  type        = bool
  default     = false
}

variable "environment_prefixes" {
  description = "Environment prefixes for organizing state files"
  type        = list(string)
  default     = ["dev", "staging", "production"]
}

variable "allowed_principals" {
  description = "List of IAM principal ARNs allowed to access the backend"
  type        = list(string)
  default     = []
}

variable "enable_versioning" {
  description = "Enable S3 bucket versioning"
  type        = bool
  default     = true
}

variable "enable_mfa_delete" {
  description = "Enable MFA delete for S3 bucket (requires root user)"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Additional tags for backend resources"
  type        = map(string)
  default     = {}
}