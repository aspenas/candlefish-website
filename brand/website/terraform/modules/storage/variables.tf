# Storage Module Variables
# S3, DynamoDB, ElastiCache, Aurora for Candlefish.ai

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

variable "vpc_id" {
  description = "VPC ID where resources will be created"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for database resources"
  type        = list(string)
}

variable "database_subnet_ids" {
  description = "List of database subnet IDs for RDS"
  type        = list(string)
  default     = []
}

# ============================================
# S3 Configuration
# ============================================
variable "s3_buckets" {
  description = "S3 buckets configuration"
  type = map(object({
    purpose                = string
    versioning_enabled     = bool
    lifecycle_rules_enabled = bool
    public_access_block    = bool
    cors_enabled          = bool
    website_hosting       = bool
    
    # Lifecycle configuration
    lifecycle_rules = optional(object({
      transition_to_ia_days      = number
      transition_to_glacier_days = number
      transition_to_deep_archive_days = number
      expiration_days           = number
      noncurrent_version_expiration_days = number
      incomplete_multipart_upload_days = number
    }))
    
    # CORS configuration
    cors_rules = optional(list(object({
      allowed_headers = list(string)
      allowed_methods = list(string)
      allowed_origins = list(string)
      expose_headers  = list(string)
      max_age_seconds = number
    })))
    
    # Notification configuration
    notifications = optional(object({
      lambda_configurations = list(object({
        lambda_function_arn = string
        events             = list(string)
        filter_prefix      = optional(string)
        filter_suffix      = optional(string)
      }))
      
      sqs_configurations = list(object({
        queue_arn     = string
        events        = list(string)
        filter_prefix = optional(string)
        filter_suffix = optional(string)
      }))
    }))
  }))
  
  default = {
    assets = {
      purpose                = "Static Assets"
      versioning_enabled     = true
      lifecycle_rules_enabled = true
      public_access_block    = false
      cors_enabled          = true
      website_hosting       = true
    }
    
    data = {
      purpose                = "Application Data"
      versioning_enabled     = true
      lifecycle_rules_enabled = true
      public_access_block    = true
      cors_enabled          = false
      website_hosting       = false
    }
    
    backups = {
      purpose                = "Database Backups"
      versioning_enabled     = true
      lifecycle_rules_enabled = true
      public_access_block    = true
      cors_enabled          = false
      website_hosting       = false
    }
  }
}

# ============================================
# DynamoDB Configuration
# ============================================
variable "dynamodb_tables" {
  description = "DynamoDB tables configuration"
  type = map(object({
    hash_key        = string
    range_key       = optional(string)
    billing_mode    = string
    read_capacity   = optional(number)
    write_capacity  = optional(number)
    
    attributes = list(object({
      name = string
      type = string
    }))
    
    global_secondary_indexes = optional(list(object({
      name            = string
      hash_key        = string
      range_key       = optional(string)
      projection_type = string
      non_key_attributes = optional(list(string))
      read_capacity   = optional(number)
      write_capacity  = optional(number)
    })))
    
    local_secondary_indexes = optional(list(object({
      name            = string
      range_key       = string
      projection_type = string
      non_key_attributes = optional(list(string))
    })))
    
    # Auto-scaling configuration
    autoscaling = optional(object({
      read_capacity = object({
        min_capacity     = number
        max_capacity     = number
        target_value     = number
      })
      write_capacity = object({
        min_capacity     = number
        max_capacity     = number
        target_value     = number
      })
    }))
    
    # Point-in-time recovery
    point_in_time_recovery = bool
    
    # Backup configuration
    backup_retention_period = optional(number, 7)
    
    # Encryption
    server_side_encryption = bool
    kms_key_arn           = optional(string)
    
    # TTL configuration
    ttl_attribute = optional(string)
    ttl_enabled   = optional(bool, false)
  }))
  
  default = {
    sessions = {
      hash_key     = "session_id"
      billing_mode = "PAY_PER_REQUEST"
      
      attributes = [
        {
          name = "session_id"
          type = "S"
        }
      ]
      
      point_in_time_recovery = false
      server_side_encryption = true
      ttl_attribute         = "expires_at"
      ttl_enabled          = true
    }
    
    user_data = {
      hash_key     = "user_id"
      range_key    = "data_type"
      billing_mode = "PAY_PER_REQUEST"
      
      attributes = [
        {
          name = "user_id"
          type = "S"
        },
        {
          name = "data_type"
          type = "S"
        },
        {
          name = "created_at"
          type = "S"
        }
      ]
      
      global_secondary_indexes = [
        {
          name            = "CreatedAtIndex"
          hash_key        = "data_type"
          range_key       = "created_at"
          projection_type = "ALL"
        }
      ]
      
      point_in_time_recovery = true
      server_side_encryption = true
    }
    
    analytics_events = {
      hash_key     = "event_id"
      range_key    = "timestamp"
      billing_mode = "PAY_PER_REQUEST"
      
      attributes = [
        {
          name = "event_id"
          type = "S"
        },
        {
          name = "timestamp"
          type = "S"
        },
        {
          name = "event_type"
          type = "S"
        }
      ]
      
      global_secondary_indexes = [
        {
          name            = "EventTypeIndex"
          hash_key        = "event_type"
          range_key       = "timestamp"
          projection_type = "ALL"
        }
      ]
      
      point_in_time_recovery = true
      server_side_encryption = true
      ttl_attribute         = "expires_at"
      ttl_enabled          = true
    }
  }
}

# ============================================
# ElastiCache Configuration
# ============================================
variable "elasticache_config" {
  description = "ElastiCache configuration"
  type = object({
    enabled                = bool
    engine                = string
    engine_version        = string
    node_type             = string
    num_cache_nodes       = number
    parameter_group_family = string
    port                  = number
    
    # Subnet group
    subnet_group_name = optional(string)
    
    # Security groups
    security_group_ids = optional(list(string))
    
    # Backup and maintenance
    backup_retention_period = number
    backup_window          = string
    maintenance_window     = string
    
    # Encryption
    at_rest_encryption_enabled = bool
    transit_encryption_enabled = bool
    auth_token                = optional(string)
    
    # Notifications
    notification_topic_arn = optional(string)
    
    # Auto failover (for Redis Cluster)
    automatic_failover_enabled = optional(bool, false)
    multi_az_enabled          = optional(bool, false)
    
    # Scaling
    auto_minor_version_upgrade = bool
  })
  
  default = {
    enabled                = true
    engine                = "redis"
    engine_version        = "7.0"
    node_type             = "cache.t3.micro"
    num_cache_nodes       = 1
    parameter_group_family = "redis7.x"
    port                  = 6379
    
    backup_retention_period = 5
    backup_window          = "03:00-05:00"
    maintenance_window     = "sun:05:00-sun:06:00"
    
    at_rest_encryption_enabled = true
    transit_encryption_enabled = true
    
    auto_minor_version_upgrade = true
  }
}

# ============================================
# RDS Aurora Configuration
# ============================================
variable "aurora_config" {
  description = "RDS Aurora Serverless configuration"
  type = object({
    enabled               = bool
    engine                = string
    engine_version        = string
    database_name         = string
    master_username       = string
    
    # Serverless v2 scaling
    serverlessv2_scaling_configuration = object({
      max_capacity = number
      min_capacity = number
    })
    
    # Backup configuration
    backup_retention_period = number
    backup_window          = string
    maintenance_window     = string
    
    # Security
    storage_encrypted               = bool
    kms_key_id                     = optional(string)
    iam_database_authentication_enabled = bool
    
    # Monitoring
    enabled_cloudwatch_logs_exports = list(string)
    monitoring_interval            = number
    monitoring_role_arn           = optional(string)
    performance_insights_enabled   = bool
    performance_insights_retention_period = optional(number)
    
    # Network
    db_subnet_group_name   = optional(string)
    vpc_security_group_ids = optional(list(string))
    
    # Cluster parameters
    db_cluster_parameter_group_family = string
    
    # Deletion protection
    deletion_protection = bool
    skip_final_snapshot = bool
    final_snapshot_identifier = optional(string)
    
    # Global cluster (for multi-region)
    global_cluster_identifier = optional(string)
  })
  
  default = {
    enabled               = false
    engine                = "aurora-postgresql"
    engine_version        = "15.4"
    database_name         = "candlefish"
    master_username       = "postgres"
    
    serverlessv2_scaling_configuration = {
      max_capacity = 1.0
      min_capacity = 0.5
    }
    
    backup_retention_period = 7
    backup_window          = "03:00-04:00"
    maintenance_window     = "sun:04:00-sun:05:00"
    
    storage_encrypted               = true
    iam_database_authentication_enabled = true
    
    enabled_cloudwatch_logs_exports = ["postgresql"]
    monitoring_interval            = 60
    performance_insights_enabled   = true
    performance_insights_retention_period = 7
    
    db_cluster_parameter_group_family = "aurora-postgresql15"
    
    deletion_protection = true
    skip_final_snapshot = false
  }
}

# ============================================
# Common Configuration
# ============================================
variable "enable_cross_region_replication" {
  description = "Enable cross-region replication for critical data"
  type        = bool
  default     = false
}

variable "backup_region" {
  description = "AWS region for backup replication"
  type        = string
  default     = "us-west-2"
}

variable "kms_key_arn" {
  description = "KMS key ARN for encryption"
  type        = string
  default     = null
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}