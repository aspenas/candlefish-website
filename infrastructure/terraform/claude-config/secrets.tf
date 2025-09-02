# Secrets Management Configuration

# API Keys Secret
resource "aws_secretsmanager_secret" "api_keys" {
  name                    = "${local.name_prefix}-api-keys"
  description             = "API keys for Claude Configuration System"
  recovery_window_in_days = var.secret_recovery_window

  rotation_rules {
    automatically_after_days = var.rotate_secrets ? var.secret_rotation_days : 0
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-api-keys"
    }
  )
}

resource "aws_secretsmanager_secret_version" "api_keys" {
  secret_id = aws_secretsmanager_secret.api_keys.id
  secret_string = jsonencode({
    anthropic_api_key = var.anthropic_api_key
    openai_api_key    = var.openai_api_key
    aws_bedrock_key   = var.aws_bedrock_key
    github_token      = var.github_token
    slack_webhook     = var.slack_webhook_url
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# JWT Secret
resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "${local.name_prefix}-jwt-secret"
  description             = "JWT secret for authentication"
  recovery_window_in_days = var.secret_recovery_window

  rotation_rules {
    automatically_after_days = var.rotate_secrets ? var.secret_rotation_days : 0
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-jwt-secret"
    }
  )
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = random_password.jwt_secret.result
}

# Encryption Keys Secret
resource "random_password" "encryption_key" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "encryption_key" {
  name                    = "${local.name_prefix}-encryption-key"
  description             = "Encryption key for sensitive data"
  recovery_window_in_days = var.secret_recovery_window

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-encryption-key"
    }
  )
}

resource "aws_secretsmanager_secret_version" "encryption_key" {
  secret_id     = aws_secretsmanager_secret.encryption_key.id
  secret_string = base64encode(random_password.encryption_key.result)
}

# OAuth Secrets
resource "aws_secretsmanager_secret" "oauth_secrets" {
  name                    = "${local.name_prefix}-oauth-secrets"
  description             = "OAuth secrets for third-party integrations"
  recovery_window_in_days = var.secret_recovery_window

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-oauth-secrets"
    }
  )
}

resource "aws_secretsmanager_secret_version" "oauth_secrets" {
  secret_id = aws_secretsmanager_secret.oauth_secrets.id
  secret_string = jsonencode({
    google_client_id     = var.google_oauth_client_id
    google_client_secret = var.google_oauth_client_secret
    github_client_id     = var.github_oauth_client_id
    github_client_secret = var.github_oauth_client_secret
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# Lambda function for secret rotation
resource "aws_lambda_function" "rotate_secrets" {
  count = var.rotate_secrets ? 1 : 0

  filename         = "${path.module}/lambda/rotate-secrets.zip"
  function_name    = "${local.name_prefix}-rotate-secrets"
  role            = aws_iam_role.lambda_rotation[0].arn
  handler         = "index.handler"
  source_code_hash = filebase64sha256("${path.module}/lambda/rotate-secrets.zip")
  runtime         = "python3.11"
  timeout         = 30

  environment {
    variables = {
      SECRETS_PREFIX = local.name_prefix
      SNS_TOPIC_ARN  = aws_sns_topic.alerts.arn
    }
  }

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda[0].id]
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-rotate-secrets"
    }
  )
}

# IAM Role for Lambda Secret Rotation
resource "aws_iam_role" "lambda_rotation" {
  count = var.rotate_secrets ? 1 : 0

  name = "${local.name_prefix}-lambda-rotation-role"

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

resource "aws_iam_role_policy" "lambda_rotation" {
  count = var.rotate_secrets ? 1 : 0

  name = "${local.name_prefix}-lambda-rotation-policy"
  role = aws_iam_role.lambda_rotation[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:DescribeSecret",
          "secretsmanager:GetSecretValue",
          "secretsmanager:PutSecretValue",
          "secretsmanager:UpdateSecretVersionStage"
        ]
        Resource = [
          aws_secretsmanager_secret.api_keys.arn,
          aws_secretsmanager_secret.jwt_secret.arn,
          aws_secretsmanager_secret.oauth_secrets.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetRandomPassword"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.alerts.arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*"
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
  count = var.rotate_secrets ? 1 : 0

  role       = aws_iam_role.lambda_rotation[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# Security Group for Lambda Functions
resource "aws_security_group" "lambda" {
  count = var.rotate_secrets ? 1 : 0

  name        = "${local.name_prefix}-lambda-sg"
  description = "Security group for Lambda functions"
  vpc_id      = aws_vpc.main.id

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-lambda-sg"
    }
  )
}

# EventBridge Rule for Secret Rotation
resource "aws_cloudwatch_event_rule" "rotate_secrets" {
  count = var.rotate_secrets ? 1 : 0

  name                = "${local.name_prefix}-rotate-secrets"
  description         = "Trigger secret rotation"
  schedule_expression = "rate(${var.secret_rotation_days} days)"

  tags = local.common_tags
}

resource "aws_cloudwatch_event_target" "rotate_secrets" {
  count = var.rotate_secrets ? 1 : 0

  rule      = aws_cloudwatch_event_rule.rotate_secrets[0].name
  target_id = "RotateSecretsLambda"
  arn       = aws_lambda_function.rotate_secrets[0].arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  count = var.rotate_secrets ? 1 : 0

  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.rotate_secrets[0].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.rotate_secrets[0].arn
}