# Enhanced Security Module Variables for Candlefish.ai
# Complete security configuration including KMS, IAM, Secrets Manager

variable "project_name" {
  description = "Name of the project/application"
  type        = string
}

# ============================================
# KMS Configuration
# ============================================
variable "kms_keys" {
  description = "KMS keys configuration"
  type = map(object({
    description             = string
    key_usage              = string
    deletion_window_in_days = number
    enable_key_rotation     = bool
    multi_region           = bool
    
    # Key policy
    key_administrators = list(string)
    key_users         = list(string)
    key_services      = list(string)
    
    # Aliases
    aliases = list(string)
  }))
  
  default = {
    general = {
      description             = "General purpose encryption key"
      key_usage              = "ENCRYPT_DECRYPT"
      deletion_window_in_days = 7
      enable_key_rotation     = true
      multi_region           = false
      
      key_administrators = []
      key_users         = []
      key_services      = ["s3.amazonaws.com", "rds.amazonaws.com", "secretsmanager.amazonaws.com"]
      
      aliases = ["general", "default"]
    }
    
    secrets = {
      description             = "Encryption key for secrets and sensitive data"
      key_usage              = "ENCRYPT_DECRYPT"
      deletion_window_in_days = 30
      enable_key_rotation     = true
      multi_region           = false
      
      key_administrators = []
      key_users         = []
      key_services      = ["secretsmanager.amazonaws.com", "ssm.amazonaws.com"]
      
      aliases = ["secrets", "ssm"]
    }
    
    logs = {
      description             = "Encryption key for CloudWatch Logs"
      key_usage              = "ENCRYPT_DECRYPT"
      deletion_window_in_days = 7
      enable_key_rotation     = true
      multi_region           = false
      
      key_administrators = []
      key_users         = []
      key_services      = ["logs.amazonaws.com"]
      
      aliases = ["logs", "cloudwatch"]
    }
  }
}

# ============================================
# Secrets Manager Configuration
# ============================================
variable "secrets" {
  description = "Secrets Manager secrets configuration"
  type = map(object({
    description                = string
    kms_key_id                = optional(string)
    rotation_enabled          = bool
    recovery_window_in_days   = number
    
    # Initial values (will be set externally in production)
    initial_value = optional(map(string), {})
  }))
  
  default = {
    database_credentials = {
      description             = "Database connection credentials"
      rotation_enabled        = false
      recovery_window_in_days = 7
    }
    
    api_keys = {
      description             = "External API keys and tokens"
      rotation_enabled        = false
      recovery_window_in_days = 7
    }
    
    app_secrets = {
      description             = "Application secrets and configuration"
      rotation_enabled        = false
      recovery_window_in_days = 7
    }
    
    operational_keys = {
      description             = "Operational system access keys"
      rotation_enabled        = false
      recovery_window_in_days = 30
      initial_value = {
        analytics_api_key = ""
        monitoring_api_key = ""
      }
    }
  }
}

# ============================================
# IAM Roles Configuration
# ============================================
variable "iam_roles" {
  description = "IAM roles configuration"
  type = map(object({
    description                = string
    max_session_duration       = number
    path                      = string
    force_detach_policies     = bool
    
    # Trust policy (assume role policy)
    trusted_entities = object({
      services        = list(string)
      aws_principals  = list(string)
      federated_principals = optional(list(object({
        type       = string
        identifiers = list(string)
        conditions = map(object({
          test     = string
          variable = string
          values   = list(string)
        }))
      })), [])
    })
    
    # Attached policies
    managed_policy_arns = list(string)
    inline_policies     = map(string)
    
    # Instance profile
    create_instance_profile = bool
  }))
  
  default = {
    ecs_task_execution = {
      description           = "ECS Task Execution Role"
      max_session_duration  = 3600
      path                 = "/"
      force_detach_policies = true
      
      trusted_entities = {
        services = ["ecs-tasks.amazonaws.com"]
        aws_principals = []
      }
      
      managed_policy_arns = [
        "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
      ]
      inline_policies = {}
      
      create_instance_profile = false
    }
    
    ecs_task_role = {
      description           = "ECS Task Role"
      max_session_duration  = 3600
      path                 = "/"
      force_detach_policies = true
      
      trusted_entities = {
        services = ["ecs-tasks.amazonaws.com"]
        aws_principals = []
      }
      
      managed_policy_arns = []
      inline_policies = {
        "operational_access" = jsonencode({
          Version = "2012-10-17"
          Statement = [
            {
              Effect = "Allow"
              Action = [
                "secretsmanager:GetSecretValue",
                "s3:GetObject",
                "s3:PutObject",
                "cloudwatch:PutMetricData",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
              ]
              Resource = "*"
            }
          ]
        })
      }
      
      create_instance_profile = false
    }
    
    lambda_execution = {
      description           = "Lambda Execution Role"
      max_session_duration  = 3600
      path                 = "/"
      force_detach_policies = true
      
      trusted_entities = {
        services = ["lambda.amazonaws.com"]
        aws_principals = []
      }
      
      managed_policy_arns = [
        "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
      ]
      inline_policies = {}
      
      create_instance_profile = false
    }
    
    github_actions = {
      description           = "GitHub Actions OIDC Role"
      max_session_duration  = 3600
      path                 = "/"
      force_detach_policies = true
      
      trusted_entities = {
        services = []
        aws_principals = []
        federated_principals = []
      }
      
      managed_policy_arns = []
      inline_policies = {
        "deployment_access" = jsonencode({
          Version = "2012-10-17"
          Statement = [
            {
              Effect = "Allow"
              Action = [
                "s3:PutObject",
                "s3:PutObjectAcl",
                "s3:GetObject",
                "s3:DeleteObject",
                "cloudfront:CreateInvalidation",
                "ecs:UpdateService",
                "ecs:DescribeServices",
                "secretsmanager:GetSecretValue"
              ]
              Resource = "*"
            }
          ]
        })
      }
      
      create_instance_profile = false
    }
  }
}

# ============================================
# Security Groups Configuration
# ============================================
variable "security_groups" {
  description = "Security groups configuration"
  type = map(object({
    description                = string
    revoke_rules_on_delete    = optional(bool, false)
    
    # Ingress rules
    ingress_rules = list(object({
      description              = string
      from_port               = number
      to_port                 = number
      protocol                = string
      cidr_blocks             = optional(list(string), [])
      ipv6_cidr_blocks        = optional(list(string), [])
      security_group_ids      = optional(list(string), [])
      self                    = optional(bool, false)
    }))
    
    # Egress rules
    egress_rules = list(object({
      description              = string
      from_port               = number
      to_port                 = number
      protocol                = string
      cidr_blocks             = optional(list(string), [])
      ipv6_cidr_blocks        = optional(list(string), [])
      security_group_ids      = optional(list(string), [])
      self                    = optional(bool, false)
    }))
  }))
  
  default = {
    web_tier = {
      description = "Security group for web tier (ALB)"
      
      ingress_rules = [
        {
          description = "HTTP"
          from_port   = 80
          to_port     = 80
          protocol    = "tcp"
          cidr_blocks = ["0.0.0.0/0"]
        },
        {
          description = "HTTPS"
          from_port   = 443
          to_port     = 443
          protocol    = "tcp"
          cidr_blocks = ["0.0.0.0/0"]
        }
      ]
      
      egress_rules = [
        {
          description = "All outbound"
          from_port   = 0
          to_port     = 0
          protocol    = "-1"
          cidr_blocks = ["0.0.0.0/0"]
        }
      ]
    }
    
    app_tier = {
      description = "Security group for application tier (ECS)"
      
      ingress_rules = [
        {
          description = "HTTP from web tier"
          from_port   = 80
          to_port     = 80
          protocol    = "tcp"
          self        = false
        },
        {
          description = "Custom app port"
          from_port   = 8080
          to_port     = 8080
          protocol    = "tcp"
          self        = false
        },
        {
          description = "WebSocket port"
          from_port   = 8001
          to_port     = 8001
          protocol    = "tcp"
          self        = false
        }
      ]
      
      egress_rules = [
        {
          description = "All outbound"
          from_port   = 0
          to_port     = 0
          protocol    = "-1"
          cidr_blocks = ["0.0.0.0/0"]
        }
      ]
    }
    
    data_tier = {
      description = "Security group for data tier (RDS/ElastiCache)"
      
      ingress_rules = [
        {
          description = "PostgreSQL"
          from_port   = 5432
          to_port     = 5432
          protocol    = "tcp"
          self        = false
        },
        {
          description = "Redis"
          from_port   = 6379
          to_port     = 6379
          protocol    = "tcp"
          self        = false
        }
      ]
      
      egress_rules = []
    }
  }
}

# ============================================
# Security Services Configuration
# ============================================
variable "cloudtrail_config" {
  description = "CloudTrail configuration"
  type = object({
    enable_logging                = bool
    include_global_service_events = bool
    is_multi_region_trail         = bool
    enable_log_file_validation    = bool
    s3_key_prefix                = optional(string, "cloudtrail")
  })
  
  default = {
    enable_logging                = true
    include_global_service_events = true
    is_multi_region_trail         = true
    enable_log_file_validation    = true
  }
}

variable "guardduty_config" {
  description = "GuardDuty configuration"
  type = object({
    finding_publishing_frequency  = string
    enable_s3_protection         = bool
    enable_kubernetes_protection = bool
    enable_malware_protection    = bool
  })
  
  default = {
    finding_publishing_frequency  = "FIFTEEN_MINUTES"
    enable_s3_protection         = true
    enable_kubernetes_protection = false
    enable_malware_protection    = true
  }
}