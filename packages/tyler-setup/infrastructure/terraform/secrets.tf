# AWS Secrets Manager Configuration for Tyler Setup Platform

# Generate random values for secrets
resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

resource "random_password" "claude_api_key_placeholder" {
  length  = 64
  special = false
  upper   = true
  lower   = true
  numeric = true
}

resource "random_password" "encryption_key" {
  length  = 32
  special = false
  upper   = true
  lower   = true
  numeric = true
}

# Database Connection Secret
resource "aws_secretsmanager_secret" "database_url" {
  name                    = "${var.project_name}/database/connection-url"
  description             = "Database connection URL for Tyler Setup Platform"
  kms_key_id             = aws_kms_key.main.arn
  recovery_window_in_days = 7

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-db-url-secret"
    Type = "Database"
  })
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id = aws_secretsmanager_secret.database_url.id
  secret_string = jsonencode({
    url = "postgresql://${var.db_username}:${random_password.db_password.result}@${aws_db_instance.main.endpoint}:5432/${var.db_name}?sslmode=require"
    host = aws_db_instance.main.endpoint
    port = 5432
    database = var.db_name
    username = var.db_username
    password = random_password.db_password.result
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# Redis Connection Secret
resource "aws_secretsmanager_secret" "redis_url" {
  name                    = "${var.project_name}/redis/connection-url"
  description             = "Redis connection URL for Tyler Setup Platform"
  kms_key_id             = aws_kms_key.main.arn
  recovery_window_in_days = 7

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-redis-url-secret"
    Type = "Cache"
  })
}

resource "aws_secretsmanager_secret_version" "redis_url" {
  secret_id = aws_secretsmanager_secret.redis_url.id
  secret_string = jsonencode({
    url = "rediss://${aws_elasticache_replication_group.main.primary_endpoint_address}:6379"
    host = aws_elasticache_replication_group.main.primary_endpoint_address
    port = 6379
    tls = true
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# Claude API Key Secret (placeholder - must be updated manually)
resource "aws_secretsmanager_secret" "claude_api_key" {
  name                    = "${var.project_name}/claude/api-key"
  description             = "Claude API key for AI functionality"
  kms_key_id             = aws_kms_key.main.arn
  recovery_window_in_days = 7

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-claude-api-key-secret"
    Type = "API"
    Service = "Claude"
  })
}

resource "aws_secretsmanager_secret_version" "claude_api_key" {
  secret_id = aws_secretsmanager_secret.claude_api_key.id
  secret_string = jsonencode({
    api_key = "REPLACE_WITH_ACTUAL_CLAUDE_API_KEY"
    model = var.claude_model
    max_tokens = var.claude_max_tokens
    rate_limit = "2000000" # 2M tokens per minute
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# JWT Secret
resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "${var.project_name}/auth/jwt-secret"
  description             = "JWT signing secret for authentication"
  kms_key_id             = aws_kms_key.main.arn
  recovery_window_in_days = 7

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-jwt-secret"
    Type = "Authentication"
  })
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id = aws_secretsmanager_secret.jwt_secret.id
  secret_string = jsonencode({
    secret = random_password.jwt_secret.result
    algorithm = "HS256"
    expires_in = "24h"
  })
}

# Field-level Encryption Key
resource "aws_secretsmanager_secret" "encryption_key" {
  name                    = "${var.project_name}/encryption/field-level-key"
  description             = "Field-level encryption key for sensitive data"
  kms_key_id             = aws_kms_key.main.arn
  recovery_window_in_days = 7

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-encryption-key"
    Type = "Encryption"
  })
}

resource "aws_secretsmanager_secret_version" "encryption_key" {
  secret_id = aws_secretsmanager_secret.encryption_key.id
  secret_string = jsonencode({
    key = base64encode(random_password.encryption_key.result)
    algorithm = "AES-256-GCM"
    key_derivation = "PBKDF2"
  })
}

# OAuth/SSO Configuration Secret
resource "aws_secretsmanager_secret" "oauth_config" {
  name                    = "${var.project_name}/auth/oauth-config"
  description             = "OAuth/SSO configuration for authentication"
  kms_key_id             = aws_kms_key.main.arn
  recovery_window_in_days = 7

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-oauth-config"
    Type = "Authentication"
  })
}

resource "aws_secretsmanager_secret_version" "oauth_config" {
  secret_id = aws_secretsmanager_secret.oauth_config.id
  secret_string = jsonencode({
    google_client_id = "REPLACE_WITH_GOOGLE_CLIENT_ID"
    google_client_secret = "REPLACE_WITH_GOOGLE_CLIENT_SECRET"
    microsoft_client_id = "REPLACE_WITH_MICROSOFT_CLIENT_ID"
    microsoft_client_secret = "REPLACE_WITH_MICROSOFT_CLIENT_SECRET"
    redirect_uri = "https://${var.domain_name}/auth/callback"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# SMTP Configuration Secret
resource "aws_secretsmanager_secret" "smtp_config" {
  name                    = "${var.project_name}/email/smtp-config"
  description             = "SMTP configuration for email notifications"
  kms_key_id             = aws_kms_key.main.arn
  recovery_window_in_days = 7

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-smtp-config"
    Type = "Email"
  })
}

resource "aws_secretsmanager_secret_version" "smtp_config" {
  secret_id = aws_secretsmanager_secret.smtp_config.id
  secret_string = jsonencode({
    host = "smtp.amazonaws.com"
    port = 587
    username = "REPLACE_WITH_SES_SMTP_USERNAME"
    password = "REPLACE_WITH_SES_SMTP_PASSWORD"
    from_email = "noreply@${var.domain_name}"
    from_name = "Tyler Setup Platform"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# Mobile Push Notification Secrets
resource "aws_secretsmanager_secret" "push_notifications" {
  name                    = "${var.project_name}/mobile/push-notifications"
  description             = "Push notification credentials for mobile apps"
  kms_key_id             = aws_kms_key.main.arn
  recovery_window_in_days = 7

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-push-notifications"
    Type = "Mobile"
  })
}

resource "aws_secretsmanager_secret_version" "push_notifications" {
  secret_id = aws_secretsmanager_secret.push_notifications.id
  secret_string = jsonencode({
    fcm_server_key = "REPLACE_WITH_FCM_SERVER_KEY"
    apns_key_id = "REPLACE_WITH_APNS_KEY_ID"
    apns_team_id = "REPLACE_WITH_APNS_TEAM_ID"
    apns_private_key = "REPLACE_WITH_APNS_PRIVATE_KEY"
    apns_bundle_id = "ai.candlefish.tylersetup"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# Third-party API Keys
resource "aws_secretsmanager_secret" "third_party_apis" {
  name                    = "${var.project_name}/api/third-party-keys"
  description             = "Third-party API keys and configurations"
  kms_key_id             = aws_kms_key.main.arn
  recovery_window_in_days = 7

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-third-party-apis"
    Type = "API"
  })
}

resource "aws_secretsmanager_secret_version" "third_party_apis" {
  secret_id = aws_secretsmanager_secret.third_party_apis.id
  secret_string = jsonencode({
    slack_webhook_url = "REPLACE_WITH_SLACK_WEBHOOK_URL"
    slack_bot_token = "REPLACE_WITH_SLACK_BOT_TOKEN"
    github_token = "REPLACE_WITH_GITHUB_TOKEN"
    jira_api_token = "REPLACE_WITH_JIRA_API_TOKEN"
    salesforce_client_id = "REPLACE_WITH_SALESFORCE_CLIENT_ID"
    salesforce_client_secret = "REPLACE_WITH_SALESFORCE_CLIENT_SECRET"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# Monitoring and Analytics Secrets
resource "aws_secretsmanager_secret" "monitoring_config" {
  name                    = "${var.project_name}/monitoring/analytics-keys"
  description             = "Monitoring and analytics service configurations"
  kms_key_id             = aws_kms_key.main.arn
  recovery_window_in_days = 7

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-monitoring-config"
    Type = "Monitoring"
  })
}

resource "aws_secretsmanager_secret_version" "monitoring_config" {
  secret_id = aws_secretsmanager_secret.monitoring_config.id
  secret_string = jsonencode({
    datadog_api_key = "REPLACE_WITH_DATADOG_API_KEY"
    new_relic_license_key = "REPLACE_WITH_NEW_RELIC_LICENSE_KEY"
    sentry_dsn = "REPLACE_WITH_SENTRY_DSN"
    mixpanel_token = "REPLACE_WITH_MIXPANEL_TOKEN"
    google_analytics_id = "REPLACE_WITH_GA_ID"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# Secret Rotation Lambda Function
resource "aws_lambda_function" "secret_rotation" {
  filename         = "secret_rotation.zip"
  function_name    = "${var.project_name}-secret-rotation"
  role            = aws_iam_role.lambda_rotation.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.secret_rotation_zip.output_base64sha256
  runtime         = var.lambda_runtime
  timeout         = var.lambda_timeout
  memory_size     = var.lambda_memory_size

  environment {
    variables = {
      KMS_KEY_ID = aws_kms_key.main.arn
    }
  }

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-secret-rotation"
    Type = "Lambda"
  })
}

# Archive for Lambda deployment package
data "archive_file" "secret_rotation_zip" {
  type        = "zip"
  output_path = "secret_rotation.zip"
  source {
    content = templatefile("${path.module}/lambda/secret-rotation.js", {
      kms_key_id = aws_kms_key.main.arn
      project_name = var.project_name
    })
    filename = "index.js"
  }
}

# Security Group for Lambda
resource "aws_security_group" "lambda" {
  name_prefix = "${var.project_name}-lambda-"
  vpc_id      = aws_vpc.main.id

  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-lambda-sg"
  })
}

# IAM Role for Lambda Secret Rotation
resource "aws_iam_role" "lambda_rotation" {
  name = "${var.project_name}-lambda-rotation-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = var.common_tags
}

# IAM Policy for Lambda Secret Rotation
resource "aws_iam_role_policy" "lambda_rotation" {
  name = "${var.project_name}-lambda-rotation-policy"
  role = aws_iam_role.lambda_rotation.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:*"
        ]
        Resource = "arn:aws:secretsmanager:${var.aws_region}:*:secret:${var.project_name}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey",
          "kms:CreateGrant"
        ]
        Resource = aws_kms_key.main.arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:CreateNetworkInterface",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DeleteNetworkInterface"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_rotation_vpc" {
  role       = aws_iam_role.lambda_rotation.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# Secret Rotation Configuration
resource "aws_secretsmanager_secret_rotation" "jwt_rotation" {
  secret_id           = aws_secretsmanager_secret.jwt_secret.id
  rotation_lambda_arn = aws_lambda_function.secret_rotation.arn

  rotation_rules {
    automatically_after_days = 30
  }

  depends_on = [aws_lambda_permission.secret_rotation]
}

# Lambda Permission for Secrets Manager
resource "aws_lambda_permission" "secret_rotation" {
  statement_id  = "AllowSecretsManagerInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.secret_rotation.function_name
  principal     = "secretsmanager.amazonaws.com"
}
