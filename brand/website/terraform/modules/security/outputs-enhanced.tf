# Enhanced Security Module Outputs
# Comprehensive outputs for KMS, IAM, Secrets Manager, Security Groups

# ============================================
# KMS Outputs
# ============================================
output "kms_key_ids" {
  description = "Map of KMS key IDs"
  value       = { for k, v in aws_kms_key.main : k => v.key_id }
}

output "kms_key_arns" {
  description = "Map of KMS key ARNs"
  value       = { for k, v in aws_kms_key.main : k => v.arn }
}

output "kms_aliases" {
  description = "Map of KMS key aliases"
  value       = { for k, v in aws_kms_alias.main : k => v.name }
}

output "kms_alias_arns" {
  description = "Map of KMS alias ARNs"
  value       = { for k, v in aws_kms_alias.main : k => v.arn }
}

# ============================================
# IAM Role Outputs
# ============================================
output "iam_role_names" {
  description = "Map of IAM role names"
  value       = { for k, v in aws_iam_role.main : k => v.name }
}

output "iam_role_arns" {
  description = "Map of IAM role ARNs"
  value       = { for k, v in aws_iam_role.main : k => v.arn }
}

output "iam_role_ids" {
  description = "Map of IAM role IDs"
  value       = { for k, v in aws_iam_role.main : k => v.id }
}

output "iam_instance_profile_names" {
  description = "Map of IAM instance profile names"
  value       = { for k, v in aws_iam_instance_profile.main : k => v.name }
}

output "iam_instance_profile_arns" {
  description = "Map of IAM instance profile ARNs"
  value       = { for k, v in aws_iam_instance_profile.main : k => v.arn }
}

# ============================================
# Secrets Manager Outputs
# ============================================
output "secret_arns" {
  description = "Map of secret ARNs"
  value       = { for k, v in aws_secretsmanager_secret.main : k => v.arn }
}

output "secret_ids" {
  description = "Map of secret IDs"
  value       = { for k, v in aws_secretsmanager_secret.main : k => v.id }
}

output "secret_names" {
  description = "Map of secret names"
  value       = { for k, v in aws_secretsmanager_secret.main : k => v.name }
}

output "secret_kms_key_ids" {
  description = "Map of KMS key IDs used by secrets"
  value       = { for k, v in aws_secretsmanager_secret.main : k => v.kms_key_id }
}

# ============================================
# Security Group Outputs
# ============================================
output "security_group_ids" {
  description = "Map of security group IDs"
  value       = { for k, v in aws_security_group.main : k => v.id }
}

output "security_group_arns" {
  description = "Map of security group ARNs"
  value       = { for k, v in aws_security_group.main : k => v.arn }
}

output "security_group_names" {
  description = "Map of security group names"
  value       = { for k, v in aws_security_group.main : k => v.name }
}

output "security_group_vpc_ids" {
  description = "Map of security group VPC IDs"
  value       = { for k, v in aws_security_group.main : k => v.vpc_id }
}

# ============================================
# CloudTrail Outputs
# ============================================
output "cloudtrail_id" {
  description = "CloudTrail ID"
  value       = var.enable_cloudtrail ? aws_cloudtrail.main[0].id : null
}

output "cloudtrail_arn" {
  description = "CloudTrail ARN"
  value       = var.enable_cloudtrail ? aws_cloudtrail.main[0].arn : null
}

output "cloudtrail_s3_bucket" {
  description = "CloudTrail S3 bucket name"
  value       = var.enable_cloudtrail ? aws_s3_bucket.cloudtrail[0].bucket : null
}

output "cloudtrail_s3_bucket_arn" {
  description = "CloudTrail S3 bucket ARN"
  value       = var.enable_cloudtrail ? aws_s3_bucket.cloudtrail[0].arn : null
}

# ============================================
# GuardDuty Outputs
# ============================================
output "guardduty_detector_id" {
  description = "GuardDuty detector ID"
  value       = var.enable_guardduty ? aws_guardduty_detector.main[0].id : null
}

output "guardduty_detector_arn" {
  description = "GuardDuty detector ARN"
  value       = var.enable_guardduty ? aws_guardduty_detector.main[0].arn : null
}

# ============================================
# Config Outputs
# ============================================
output "config_recorder_name" {
  description = "Config recorder name"
  value       = var.enable_config_compliance ? aws_config_configuration_recorder.main[0].name : null
}

output "config_delivery_channel_name" {
  description = "Config delivery channel name"
  value       = var.enable_config_compliance ? aws_config_delivery_channel.main[0].name : null
}

output "config_s3_bucket" {
  description = "Config S3 bucket name"
  value       = var.enable_config_compliance ? aws_s3_bucket.config[0].bucket : null
}

output "config_role_arn" {
  description = "Config service role ARN"
  value       = var.enable_config_compliance ? aws_iam_role.config[0].arn : null
}

# ============================================
# Security Hub Outputs
# ============================================
output "security_hub_account_id" {
  description = "Security Hub account ID"
  value       = var.enable_security_hub ? aws_securityhub_account.main[0].id : null
}

# ============================================
# Parameter Store Outputs
# ============================================
output "ssm_parameter_names" {
  description = "SSM parameter names for operational configuration"
  value = {
    animation_config = aws_ssm_parameter.operational_config.name
    websocket_config = aws_ssm_parameter.websocket_config.name
  }
}

output "ssm_parameter_arns" {
  description = "SSM parameter ARNs for operational configuration"
  value = {
    animation_config = aws_ssm_parameter.operational_config.arn
    websocket_config = aws_ssm_parameter.websocket_config.arn
  }
}

# ============================================
# Legacy Compatibility Outputs
# ============================================
output "waf_web_acl_id" {
  description = "WAF Web ACL ID (legacy compatibility - use WAF module instead)"
  value       = null
}

output "alb_security_group_id" {
  description = "ALB security group ID (legacy compatibility)"
  value       = try(aws_security_group.main["web_tier"].id, null)
}

output "application_security_group_id" {
  description = "Application security group ID (legacy compatibility)"
  value       = try(aws_security_group.main["app_tier"].id, null)
}

output "database_security_group_id" {
  description = "Database security group ID (legacy compatibility)"
  value       = try(aws_security_group.main["data_tier"].id, null)
}

# ============================================
# Integration Data
# ============================================
output "integration_data" {
  description = "Data for integration with other modules"
  value = {
    vpc_id = var.vpc_id
    environment = var.environment
    project_name = var.project_name
    
    kms_keys = {
      general_key_arn = aws_kms_key.main["general"].arn
      secrets_key_arn = aws_kms_key.main["secrets"].arn
      logs_key_arn    = aws_kms_key.main["logs"].arn
    }
    
    iam_roles = {
      for role_name, role in aws_iam_role.main : role_name => {
        name = role.name
        arn  = role.arn
      }
    }
    
    security_groups = {
      for sg_name, sg in aws_security_group.main : sg_name => {
        id   = sg.id
        name = sg.name
        arn  = sg.arn
      }
    }
    
    secrets = {
      for secret_name, secret in aws_secretsmanager_secret.main : secret_name => {
        arn  = secret.arn
        name = secret.name
      }
    }
  }
}

# ============================================
# Security Configuration Summary
# ============================================
output "security_configuration" {
  description = "Security configuration summary"
  value = {
    encryption = {
      kms_keys_count = length(var.kms_keys)
      key_rotation_enabled = alltrue([for k, v in var.kms_keys : v.enable_key_rotation])
      multi_region_keys = length([for k, v in var.kms_keys : k if v.multi_region])
    }
    
    access_management = {
      iam_roles_count = length(var.iam_roles)
      instance_profiles_count = length([for k, v in var.iam_roles : k if v.create_instance_profile])
      federated_access_enabled = length(flatten([for k, v in var.iam_roles : v.trusted_entities.federated_principals])) > 0
    }
    
    secrets_management = {
      secrets_count = length(var.secrets)
      rotation_enabled_count = length([for k, v in var.secrets : k if v.rotation_enabled])
      kms_encrypted = true
    }
    
    network_security = {
      security_groups_count = length(var.security_groups)
      ingress_rules_count = sum([for k, v in var.security_groups : length(v.ingress_rules)])
      egress_rules_count = sum([for k, v in var.security_groups : length(v.egress_rules)])
    }
    
    compliance_monitoring = {
      cloudtrail_enabled = var.enable_cloudtrail
      guardduty_enabled = var.enable_guardduty
      config_enabled = var.enable_config_compliance
      security_hub_enabled = var.enable_security_hub
    }
  }
}

# ============================================
# Cost Optimization Summary
# ============================================
output "cost_optimization_summary" {
  description = "Cost optimization configuration summary"
  value = {
    kms_costs = {
      keys_count = length(var.kms_keys)
      estimated_monthly = "$${length(var.kms_keys)} (KMS keys) + usage-based encryption costs"
    }
    
    secrets_costs = {
      secrets_count = length(var.secrets)
      estimated_monthly = "$${length(var.secrets) * 0.40} (Secrets Manager)"
    }
    
    logging_costs = {
      cloudtrail = var.enable_cloudtrail ? "$2-10/month" : "$0"
      config = var.enable_config_compliance ? "$10-50/month" : "$0"
      guardduty = var.enable_guardduty ? "$30-100/month" : "$0"
    }
    
    optimization_features = {
      s3_lifecycle_policies = var.enable_cloudtrail || var.enable_config_compliance
      intelligent_tiering = "Enabled for audit logs"
      cost_allocation_tags = "Enabled on all resources"
    }
  }
}

# ============================================
# Compliance and Audit Information
# ============================================
output "compliance_status" {
  description = "Compliance and audit configuration status"
  value = {
    audit_logging = {
      cloudtrail = {
        enabled = var.enable_cloudtrail
        multi_region = var.enable_cloudtrail ? var.cloudtrail_config.is_multi_region_trail : false
        log_file_validation = var.enable_cloudtrail ? var.cloudtrail_config.enable_log_file_validation : false
      }
    }
    
    threat_detection = {
      guardduty = {
        enabled = var.enable_guardduty
        s3_protection = var.enable_guardduty ? var.guardduty_config.enable_s3_protection : false
        malware_protection = var.enable_guardduty ? var.guardduty_config.enable_malware_protection : false
      }
    }
    
    configuration_compliance = {
      config = {
        enabled = var.enable_config_compliance
        all_resources_monitored = var.enable_config_compliance
        global_resources_included = var.enable_config_compliance
      }
    }
    
    centralized_security = {
      security_hub = {
        enabled = var.enable_security_hub
        default_standards = var.enable_security_hub
      }
    }
    
    encryption_at_rest = {
      kms_managed = true
      key_rotation = alltrue([for k, v in var.kms_keys : v.enable_key_rotation])
      secrets_encrypted = true
      logs_encrypted = var.enable_cloudtrail
    }
  }
}