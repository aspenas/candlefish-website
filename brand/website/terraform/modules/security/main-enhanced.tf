# Enhanced Security Module for Candlefish.ai
# Comprehensive security with KMS, IAM, Secrets Manager, Security Groups

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Random suffixes for unique resource names
resource "random_id" "suffix" {
  byte_length = 4
}

locals {
  common_tags = merge(var.tags, {
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "Security Infrastructure"
  })
}

# ============================================
# KMS Keys
# ============================================
resource "aws_kms_key" "main" {
  for_each = var.kms_keys

  description             = each.value.description
  key_usage              = each.value.key_usage
  deletion_window_in_days = each.value.deletion_window_in_days
  enable_key_rotation     = each.value.enable_key_rotation
  multi_region           = each.value.multi_region

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow key administrators"
        Effect = "Allow"
        Principal = {
          AWS = length(each.value.key_administrators) > 0 ? each.value.key_administrators : ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
        }
        Action = [
          "kms:Create*",
          "kms:Describe*",
          "kms:Enable*",
          "kms:List*",
          "kms:Put*",
          "kms:Update*",
          "kms:Revoke*",
          "kms:Disable*",
          "kms:Get*",
          "kms:Delete*",
          "kms:TagResource",
          "kms:UntagResource",
          "kms:ScheduleKeyDeletion",
          "kms:CancelKeyDeletion"
        ]
        Resource = "*"
      },
      {
        Sid    = "Allow use of the key"
        Effect = "Allow"
        Principal = {
          AWS = concat(
            length(each.value.key_users) > 0 ? each.value.key_users : [],
            [for service in each.value.key_services : "arn:aws:iam::${data.aws_caller_identity.current.account_id}:service-linked-role/${service}"]
          )
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      },
      {
        Sid    = "Allow services to use the key"
        Effect = "Allow"
        Principal = {
          Service = each.value.key_services
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-${each.key}-key"
    Type = each.key
  })
}

# KMS Aliases
resource "aws_kms_alias" "main" {
  for_each = { for key_name, key_config in var.kms_keys : 
    "${key_name}-${alias}" => {
      key_name = key_name
      alias    = alias
    }
    for alias in key_config.aliases
  }

  name          = "alias/${var.project_name}-${var.environment}-${each.value.alias}"
  target_key_id = aws_kms_key.main[each.value.key_name].key_id
}

# ============================================
# IAM Roles
# ============================================
resource "aws_iam_role" "main" {
  for_each = var.iam_roles

  name                 = "${var.project_name}-${var.environment}-${each.key}"
  description          = each.value.description
  max_session_duration = each.value.max_session_duration
  path                 = each.value.path
  force_detach_policies = each.value.force_detach_policies

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat(
      # Service principals
      length(each.value.trusted_entities.services) > 0 ? [
        {
          Effect = "Allow"
          Principal = {
            Service = each.value.trusted_entities.services
          }
          Action = "sts:AssumeRole"
        }
      ] : [],
      
      # AWS principals
      length(each.value.trusted_entities.aws_principals) > 0 ? [
        {
          Effect = "Allow"
          Principal = {
            AWS = each.value.trusted_entities.aws_principals
          }
          Action = "sts:AssumeRole"
        }
      ] : [],
      
      # Federated principals (like OIDC)
      [for federated in each.value.trusted_entities.federated_principals : {
        Effect = "Allow"
        Principal = {
          (federated.type) = federated.identifiers
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = federated.conditions
      }]
    )
  })

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-${each.key}"
    Role = each.key
  })
}

# Attach managed policies to roles
resource "aws_iam_role_policy_attachment" "managed" {
  for_each = { for combo in flatten([
    for role_name, role_config in var.iam_roles : [
      for policy_arn in role_config.managed_policy_arns : {
        role_name  = role_name
        policy_arn = policy_arn
      }
    ]
  ]) : "${combo.role_name}-${replace(combo.policy_arn, "/[^a-zA-Z0-9]/", "-")}" => combo }

  role       = aws_iam_role.main[each.value.role_name].name
  policy_arn = each.value.policy_arn
}

# Attach inline policies to roles
resource "aws_iam_role_policy" "inline" {
  for_each = { for combo in flatten([
    for role_name, role_config in var.iam_roles : [
      for policy_name, policy_document in role_config.inline_policies : {
        role_name = role_name
        policy_name = policy_name
        policy_document = policy_document
      }
    ]
  ]) : "${combo.role_name}-${combo.policy_name}" => combo }

  name   = each.value.policy_name
  role   = aws_iam_role.main[each.value.role_name].id
  policy = each.value.policy_document
}

# Instance profiles for EC2 roles
resource "aws_iam_instance_profile" "main" {
  for_each = { for role_name, role_config in var.iam_roles : role_name => role_config if role_config.create_instance_profile }

  name = "${var.project_name}-${var.environment}-${each.key}-instance-profile"
  role = aws_iam_role.main[each.key].name

  tags = local.common_tags
}

# ============================================
# Secrets Manager
# ============================================
resource "aws_secretsmanager_secret" "main" {
  for_each = var.secrets

  name        = "${var.project_name}/${var.environment}/${each.key}"
  description = each.value.description
  kms_key_id  = each.value.kms_key_id != null ? each.value.kms_key_id : aws_kms_key.main["secrets"].arn

  recovery_window_in_days = each.value.recovery_window_in_days

  # Rotation configuration
  dynamic "rotation_rules" {
    for_each = each.value.rotation_enabled ? [1] : []
    content {
      automatically_after_days = 30
    }
  }

  tags = merge(local.common_tags, {
    Name   = "${var.project_name}-${var.environment}-${each.key}"
    Secret = each.key
  })
}

# Initial secret values (only if provided)
resource "aws_secretsmanager_secret_version" "main" {
  for_each = { for secret_name, secret_config in var.secrets : secret_name => secret_config if length(secret_config.initial_value) > 0 }

  secret_id     = aws_secretsmanager_secret.main[each.key].id
  secret_string = jsonencode(each.value.initial_value)

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# ============================================
# Security Groups
# ============================================
resource "aws_security_group" "main" {
  for_each = var.security_groups

  name_prefix            = "${var.project_name}-${var.environment}-${each.key}"
  description            = each.value.description
  vpc_id                 = var.vpc_id
  revoke_rules_on_delete = each.value.revoke_rules_on_delete

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-${each.key}"
    Tier = each.key
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Ingress rules
resource "aws_security_group_rule" "ingress" {
  for_each = { for combo in flatten([
    for sg_name, sg_config in var.security_groups : [
      for idx, rule in sg_config.ingress_rules : {
        sg_name     = sg_name
        rule_key    = "${sg_name}-ingress-${idx}"
        type        = "ingress"
        from_port   = rule.from_port
        to_port     = rule.to_port
        protocol    = rule.protocol
        description = rule.description
        cidr_blocks = rule.cidr_blocks
        ipv6_cidr_blocks = rule.ipv6_cidr_blocks
        security_group_ids = rule.security_group_ids
        self        = rule.self
      }
    ]
  ]) : combo.rule_key => combo }

  type                     = each.value.type
  from_port               = each.value.from_port
  to_port                 = each.value.to_port
  protocol                = each.value.protocol
  description             = each.value.description
  cidr_blocks             = each.value.cidr_blocks
  ipv6_cidr_blocks        = each.value.ipv6_cidr_blocks
  source_security_group_id = length(each.value.security_group_ids) > 0 ? each.value.security_group_ids[0] : null
  self                    = each.value.self
  security_group_id       = aws_security_group.main[each.value.sg_name].id
}

# Egress rules
resource "aws_security_group_rule" "egress" {
  for_each = { for combo in flatten([
    for sg_name, sg_config in var.security_groups : [
      for idx, rule in sg_config.egress_rules : {
        sg_name     = sg_name
        rule_key    = "${sg_name}-egress-${idx}"
        type        = "egress"
        from_port   = rule.from_port
        to_port     = rule.to_port
        protocol    = rule.protocol
        description = rule.description
        cidr_blocks = rule.cidr_blocks
        ipv6_cidr_blocks = rule.ipv6_cidr_blocks
        security_group_ids = rule.security_group_ids
        self        = rule.self
      }
    ]
  ]) : combo.rule_key => combo }

  type                     = each.value.type
  from_port               = each.value.from_port
  to_port                 = each.value.to_port
  protocol                = each.value.protocol
  description             = each.value.description
  cidr_blocks             = each.value.cidr_blocks
  ipv6_cidr_blocks        = each.value.ipv6_cidr_blocks
  source_security_group_id = length(each.value.security_group_ids) > 0 ? each.value.security_group_ids[0] : null
  self                    = each.value.self
  security_group_id       = aws_security_group.main[each.value.sg_name].id
}

# ============================================
# CloudTrail for Audit Logging
# ============================================
resource "aws_s3_bucket" "cloudtrail" {
  count = var.enable_cloudtrail ? 1 : 0
  
  bucket = "${var.project_name}-${var.environment}-cloudtrail-${random_id.suffix.hex}"

  tags = merge(local.common_tags, {
    Name    = "${var.project_name}-${var.environment}-cloudtrail"
    Purpose = "CloudTrail Logs"
  })
}

resource "aws_s3_bucket_versioning" "cloudtrail" {
  count = var.enable_cloudtrail ? 1 : 0
  
  bucket = aws_s3_bucket.cloudtrail[0].id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "cloudtrail" {
  count = var.enable_cloudtrail ? 1 : 0
  
  bucket = aws_s3_bucket.cloudtrail[0].id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.main["logs"].arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "cloudtrail" {
  count = var.enable_cloudtrail ? 1 : 0
  
  bucket = aws_s3_bucket.cloudtrail[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "cloudtrail" {
  count = var.enable_cloudtrail ? 1 : 0
  
  bucket = aws_s3_bucket.cloudtrail[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.cloudtrail[0].arn}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      },
      {
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.cloudtrail[0].arn
      }
    ]
  })
}

resource "aws_cloudtrail" "main" {
  count = var.enable_cloudtrail ? 1 : 0
  
  name           = "${var.project_name}-${var.environment}-cloudtrail"
  s3_bucket_name = aws_s3_bucket.cloudtrail[0].bucket
  s3_key_prefix  = var.cloudtrail_config.s3_key_prefix

  include_global_service_events = var.cloudtrail_config.include_global_service_events
  is_multi_region_trail        = var.cloudtrail_config.is_multi_region_trail
  enable_logging               = var.cloudtrail_config.enable_logging
  enable_log_file_validation   = var.cloudtrail_config.enable_log_file_validation

  kms_key_id = aws_kms_key.main["logs"].arn

  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3:::*/*"]
    }

    data_resource {
      type   = "AWS::Lambda::Function"
      values = ["arn:aws:lambda:*"]
    }
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-cloudtrail"
  })

  depends_on = [aws_s3_bucket_policy.cloudtrail]
}

# ============================================
# GuardDuty
# ============================================
resource "aws_guardduty_detector" "main" {
  count = var.enable_guardduty ? 1 : 0
  
  enable                       = true
  finding_publishing_frequency = var.guardduty_config.finding_publishing_frequency

  datasources {
    s3_logs {
      enable = var.guardduty_config.enable_s3_protection
    }
    
    kubernetes {
      audit_logs {
        enable = var.guardduty_config.enable_kubernetes_protection
      }
    }
    
    malware_protection {
      scan_ec2_instance_with_findings {
        ebs_volumes {
          enable = var.guardduty_config.enable_malware_protection
        }
      }
    }
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-guardduty"
  })
}

# ============================================
# AWS Config (Enhanced)
# ============================================
resource "aws_s3_bucket" "config" {
  count = var.enable_config_compliance ? 1 : 0
  
  bucket = "${var.project_name}-${var.environment}-config-${random_id.suffix.hex}"

  tags = merge(local.common_tags, {
    Name    = "${var.project_name}-${var.environment}-config"
    Purpose = "AWS Config"
  })
}

resource "aws_s3_bucket_versioning" "config" {
  count = var.enable_config_compliance ? 1 : 0
  
  bucket = aws_s3_bucket.config[0].id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "config" {
  count = var.enable_config_compliance ? 1 : 0
  
  bucket = aws_s3_bucket.config[0].id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.main["general"].arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_iam_role" "config" {
  count = var.enable_config_compliance ? 1 : 0
  
  name = "${var.project_name}-${var.environment}-config-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "config" {
  count = var.enable_config_compliance ? 1 : 0
  
  role       = aws_iam_role.config[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/ConfigRole"
}

resource "aws_iam_role_policy" "config_s3" {
  count = var.enable_config_compliance ? 1 : 0
  
  name = "${var.project_name}-${var.environment}-config-s3-policy"
  role = aws_iam_role.config[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetBucketAcl",
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.config[0].arn
      },
      {
        Effect = "Allow"
        Action = "s3:PutObject"
        Resource = "${aws_s3_bucket.config[0].arn}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      }
    ]
  })
}

resource "aws_config_configuration_recorder" "main" {
  count = var.enable_config_compliance ? 1 : 0
  
  name     = "${var.project_name}-${var.environment}-config-recorder"
  role_arn = aws_iam_role.config[0].arn

  recording_group {
    all_supported = true
    include_global_resource_types = true
  }
}

resource "aws_config_delivery_channel" "main" {
  count = var.enable_config_compliance ? 1 : 0
  
  name           = "${var.project_name}-${var.environment}-config-delivery"
  s3_bucket_name = aws_s3_bucket.config[0].bucket
}

# ============================================
# Security Hub (Optional)
# ============================================
resource "aws_securityhub_account" "main" {
  count = var.enable_security_hub ? 1 : 0
  
  enable_default_standards = true

  control_finding_generator = "SECURITY_CONTROL"
}

# ============================================
# Parameter Store for Non-Secret Configuration
# ============================================
resource "aws_ssm_parameter" "operational_config" {
  name  = "/${var.project_name}/${var.environment}/config/max_animation_particles"
  type  = "String"
  value = var.max_animation_particles

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-animation-config"
  })
}

resource "aws_ssm_parameter" "websocket_config" {
  name  = "/${var.project_name}/${var.environment}/config/max_websocket_connections"
  type  = "String"
  value = var.max_websocket_connections

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-websocket-config"
  })
}

# Store legacy API keys in secrets (migration path)
resource "aws_secretsmanager_secret_version" "legacy_keys" {
  count = (var.analytics_api_key != "" || var.monitoring_api_key != "") ? 1 : 0
  
  secret_id = aws_secretsmanager_secret.main["operational_keys"].id
  secret_string = jsonencode({
    analytics_api_key  = var.analytics_api_key
    monitoring_api_key = var.monitoring_api_key
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}