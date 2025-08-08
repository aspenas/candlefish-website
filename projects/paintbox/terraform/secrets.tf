# AWS Secrets Manager Configuration for Paintbox Application

# Database password secret
resource "aws_secretsmanager_secret" "database_password" {
  name                    = "paintbox/${var.environment}/database/password"
  description             = "Database master password for Paintbox ${var.environment}"
  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = merge(local.common_tags, {
    Name = "paintbox-db-password-${var.environment}"
    Type = "database-credential"
  })
}

resource "aws_secretsmanager_secret_version" "database_password" {
  secret_id = aws_secretsmanager_secret.database_password.id
  secret_string = jsonencode({
    username = var.db_username
    password = random_password.db_password.result
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# Generate secure database password
resource "random_password" "db_password" {
  length  = 32
  special = true
}

# Redis authentication token secret
resource "aws_secretsmanager_secret" "redis_auth_token" {
  name                    = "paintbox/${var.environment}/redis/auth-token"
  description             = "Redis authentication token for Paintbox ${var.environment}"
  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = merge(local.common_tags, {
    Name = "paintbox-redis-token-${var.environment}"
    Type = "cache-credential"
  })
}

resource "aws_secretsmanager_secret_version" "redis_auth_token" {
  secret_id = aws_secretsmanager_secret.redis_auth_token.id
  secret_string = jsonencode({
    auth_token = random_password.redis_auth_token.result
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# Generate secure Redis auth token
resource "random_password" "redis_auth_token" {
  length  = 64
  special = false
}

# Application encryption keys
resource "aws_secretsmanager_secret" "app_encryption_keys" {
  name                    = "paintbox/${var.environment}/app/encryption-keys"
  description             = "Application encryption keys for Paintbox ${var.environment}"
  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = merge(local.common_tags, {
    Name = "paintbox-encryption-keys-${var.environment}"
    Type = "application-credential"
  })
}

resource "aws_secretsmanager_secret_version" "app_encryption_keys" {
  secret_id = aws_secretsmanager_secret.app_encryption_keys.id
  secret_string = jsonencode({
    encryption_key  = random_password.encryption_key.result
    jwt_secret     = random_password.jwt_secret.result
    nextauth_secret = random_password.nextauth_secret.result
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# Generate secure encryption keys
resource "random_password" "encryption_key" {
  length  = 64
  special = false
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

resource "random_password" "nextauth_secret" {
  length  = 64
  special = true
}

# Salesforce credentials secret
resource "aws_secretsmanager_secret" "salesforce_credentials" {
  name                    = "paintbox/${var.environment}/salesforce/credentials"
  description             = "Salesforce API credentials for Paintbox ${var.environment}"
  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = merge(local.common_tags, {
    Name = "paintbox-salesforce-creds-${var.environment}"
    Type = "external-api-credential"
  })
}

resource "aws_secretsmanager_secret_version" "salesforce_credentials" {
  secret_id = aws_secretsmanager_secret.salesforce_credentials.id
  secret_string = jsonencode({
    client_id       = "PLACEHOLDER_CLIENT_ID"
    client_secret   = "PLACEHOLDER_CLIENT_SECRET"
    username        = "PLACEHOLDER_USERNAME"
    password        = "PLACEHOLDER_PASSWORD"
    security_token  = "PLACEHOLDER_SECURITY_TOKEN"
    instance_url    = var.salesforce_instance_url
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# Company Cam credentials secret
resource "aws_secretsmanager_secret" "companycam_credentials" {
  name                    = "paintbox/${var.environment}/companycam/credentials"
  description             = "Company Cam API credentials for Paintbox ${var.environment}"
  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = merge(local.common_tags, {
    Name = "paintbox-companycam-creds-${var.environment}"
    Type = "external-api-credential"
  })
}

resource "aws_secretsmanager_secret_version" "companycam_credentials" {
  secret_id = aws_secretsmanager_secret.companycam_credentials.id
  secret_string = jsonencode({
    api_token      = "PLACEHOLDER_API_TOKEN"
    webhook_secret = "PLACEHOLDER_WEBHOOK_SECRET"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# Anthropic API key secret
resource "aws_secretsmanager_secret" "anthropic_api_key" {
  name                    = "paintbox/${var.environment}/anthropic/api-key"
  description             = "Anthropic API key for Paintbox ${var.environment}"
  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = merge(local.common_tags, {
    Name = "paintbox-anthropic-key-${var.environment}"
    Type = "external-api-credential"
  })
}

resource "aws_secretsmanager_secret_version" "anthropic_api_key" {
  secret_id = aws_secretsmanager_secret.anthropic_api_key.id
  secret_string = jsonencode({
    api_key = "PLACEHOLDER_ANTHROPIC_API_KEY"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# Email service credentials (SendGrid, etc.)
resource "aws_secretsmanager_secret" "email_credentials" {
  name                    = "paintbox/${var.environment}/email/credentials"
  description             = "Email service credentials for Paintbox ${var.environment}"
  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = merge(local.common_tags, {
    Name = "paintbox-email-creds-${var.environment}"
    Type = "external-api-credential"
  })
}

resource "aws_secretsmanager_secret_version" "email_credentials" {
  secret_id = aws_secretsmanager_secret.email_credentials.id
  secret_string = jsonencode({
    sendgrid_api_key = "PLACEHOLDER_SENDGRID_API_KEY"
    smtp_host       = "smtp.sendgrid.net"
    smtp_port       = "587"
    smtp_username   = "apikey"
    smtp_password   = "PLACEHOLDER_SENDGRID_API_KEY"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# IAM role for ECS tasks to access secrets
resource "aws_iam_role" "ecs_secrets_role" {
  name = "paintbox-ecs-secrets-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

# IAM policy for accessing secrets
resource "aws_iam_policy" "ecs_secrets_policy" {
  name        = "paintbox-ecs-secrets-policy-${var.environment}"
  description = "Policy for ECS tasks to access secrets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          aws_secretsmanager_secret.database_password.arn,
          aws_secretsmanager_secret.redis_auth_token.arn,
          aws_secretsmanager_secret.app_encryption_keys.arn,
          aws_secretsmanager_secret.salesforce_credentials.arn,
          aws_secretsmanager_secret.companycam_credentials.arn,
          aws_secretsmanager_secret.anthropic_api_key.arn,
          aws_secretsmanager_secret.email_credentials.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = [
          aws_kms_key.paintbox.arn
        ]
        Condition = {
          StringEquals = {
            "kms:ViaService" = "secretsmanager.${var.aws_region}.amazonaws.com"
          }
        }
      }
    ]
  })
}

# Attach policy to role
resource "aws_iam_role_policy_attachment" "ecs_secrets_policy_attachment" {
  role       = aws_iam_role.ecs_secrets_role.name
  policy_arn = aws_iam_policy.ecs_secrets_policy.arn
}

# Lambda function for secret rotation (production only)
resource "aws_lambda_function" "secret_rotation" {
  count = var.environment == "production" ? 1 : 0

  filename         = "secret_rotation.zip"
  function_name    = "paintbox-secret-rotation-${var.environment}"
  role            = aws_iam_role.lambda_rotation_role[0].arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.secret_rotation_zip[0].output_base64sha256
  runtime         = "python3.9"
  timeout         = 30

  environment {
    variables = {
      ENVIRONMENT = var.environment
    }
  }

  tags = local.common_tags
}

# Lambda function code for secret rotation
data "archive_file" "secret_rotation_zip" {
  count = var.environment == "production" ? 1 : 0

  type        = "zip"
  output_path = "secret_rotation.zip"
  source {
    content = <<EOF
import json
import boto3
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def handler(event, context):
    """
    AWS Lambda function for automatic secret rotation
    """
    try:
        # Implementation for secret rotation would go here
        # This is a placeholder for the rotation logic
        logger.info("Secret rotation triggered")

        return {
            'statusCode': 200,
            'body': json.dumps('Secret rotation completed successfully')
        }
    except Exception as e:
        logger.error(f"Error during secret rotation: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps(f'Error: {str(e)}')
        }
EOF
    filename = "index.py"
  }
}

# IAM role for Lambda rotation function
resource "aws_iam_role" "lambda_rotation_role" {
  count = var.environment == "production" ? 1 : 0

  name = "paintbox-lambda-rotation-role-${var.environment}"

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

  tags = local.common_tags
}

# IAM policy for Lambda rotation function
resource "aws_iam_policy" "lambda_rotation_policy" {
  count = var.environment == "production" ? 1 : 0

  name        = "paintbox-lambda-rotation-policy-${var.environment}"
  description = "Policy for Lambda secret rotation function"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
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
          "secretsmanager:GetSecretValue",
          "secretsmanager:UpdateSecretVersionStage",
          "secretsmanager:PutSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = "*"
      }
    ]
  })
}

# Attach policy to Lambda role
resource "aws_iam_role_policy_attachment" "lambda_rotation_policy_attachment" {
  count = var.environment == "production" ? 1 : 0

  role       = aws_iam_role.lambda_rotation_role[0].name
  policy_arn = aws_iam_policy.lambda_rotation_policy[0].arn
}

# CloudWatch Alarms for secret access
resource "aws_cloudwatch_metric_alarm" "secret_access_alarm" {
  count = var.environment == "production" ? 1 : 0

  alarm_name          = "paintbox-secret-access-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "SecretAccess"
  namespace           = "AWS/SecretsManager"
  period              = "300"
  statistic           = "Sum"
  threshold           = "100"
  alarm_description   = "High number of secret access attempts"
  alarm_actions       = [aws_sns_topic.paintbox_alerts.arn]

  tags = local.common_tags
}

# Outputs for secret ARNs (to be used in application configuration)
output "secrets_arns" {
  description = "ARNs of all secrets for application configuration"
  value = {
    database_password     = aws_secretsmanager_secret.database_password.arn
    redis_auth_token     = aws_secretsmanager_secret.redis_auth_token.arn
    app_encryption_keys  = aws_secretsmanager_secret.app_encryption_keys.arn
    salesforce_credentials = aws_secretsmanager_secret.salesforce_credentials.arn
    companycam_credentials = aws_secretsmanager_secret.companycam_credentials.arn
    anthropic_api_key    = aws_secretsmanager_secret.anthropic_api_key.arn
    email_credentials    = aws_secretsmanager_secret.email_credentials.arn
  }
  sensitive = true
}

output "ecs_secrets_role_arn" {
  description = "ARN of the ECS task role for accessing secrets"
  value       = aws_iam_role.ecs_secrets_role.arn
}
