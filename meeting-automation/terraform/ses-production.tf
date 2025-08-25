# AWS SES Production Configuration for Candlefish.ai
# This configuration sets up comprehensive email infrastructure

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "candlefish-terraform-state"
    key    = "ses/production/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = "us-east-1"
}

# Variables
variable "domain" {
  default = "candlefish.ai"
}

variable "notification_email" {
  default = "patrick@candlefish.ai"
}

# Configuration Set for tracking
resource "aws_ses_configuration_set" "main" {
  name = "candlefish-main"
  
  reputation_tracking_enabled = true
  
  delivery_options {
    tls_policy = "REQUIRE"
  }
}

# Event publishing to CloudWatch
resource "aws_ses_configuration_set_event_destination" "cloudwatch" {
  name                   = "cloudwatch-event-destination"
  configuration_set_name = aws_ses_configuration_set.main.name
  enabled               = true

  cloudwatch_destination {
    default_value  = "default"
    dimension_name = "MessageTag"
    value_source   = "messageTag"
  }

  event_type = ["send", "bounce", "complaint", "delivery", "reject"]
}

# SNS Topics for notifications
resource "aws_sns_topic" "ses_bounces" {
  name = "ses-bounces"
  
  tags = {
    Environment = "production"
    Service     = "SES"
  }
}

resource "aws_sns_topic" "ses_complaints" {
  name = "ses-complaints"
  
  tags = {
    Environment = "production"
    Service     = "SES"
  }
}

# SNS Topic Subscriptions
resource "aws_sns_topic_subscription" "bounce_email" {
  topic_arn = aws_sns_topic.ses_bounces.arn
  protocol  = "email"
  endpoint  = var.notification_email
}

resource "aws_sns_topic_subscription" "complaint_email" {
  topic_arn = aws_sns_topic.ses_complaints.arn
  protocol  = "email"
  endpoint  = var.notification_email
}

# Lambda function for bounce processing
resource "aws_lambda_function" "process_bounces" {
  filename         = "lambda_bounces.zip"
  function_name    = "ses-process-bounces"
  role            = aws_iam_role.lambda_execution.arn
  handler         = "index.handler"
  source_code_hash = filebase64sha256("lambda_bounces.zip")
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      SUPPRESSION_TABLE = aws_dynamodb_table.suppression_list.name
    }
  }
}

# Lambda function for complaint processing
resource "aws_lambda_function" "process_complaints" {
  filename         = "lambda_complaints.zip"
  function_name    = "ses-process-complaints"
  role            = aws_iam_role.lambda_execution.arn
  handler         = "index.handler"
  source_code_hash = filebase64sha256("lambda_complaints.zip")
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      SUPPRESSION_TABLE = aws_dynamodb_table.suppression_list.name
    }
  }
}

# IAM Role for Lambda
resource "aws_iam_role" "lambda_execution" {
  name = "ses-lambda-execution"

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
}

# Lambda execution policy
resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# DynamoDB table for suppression list
resource "aws_dynamodb_table" "suppression_list" {
  name           = "ses-suppression-list"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "email"
  
  attribute {
    name = "email"
    type = "S"
  }
  
  attribute {
    name = "reason"
    type = "S"
  }
  
  attribute {
    name = "timestamp"
    type = "N"
  }
  
  global_secondary_index {
    name            = "reason-index"
    hash_key        = "reason"
    range_key       = "timestamp"
    projection_type = "ALL"
  }
  
  tags = {
    Environment = "production"
    Service     = "SES"
  }
}

# Lambda permissions for SNS
resource "aws_lambda_permission" "allow_sns_bounce" {
  statement_id  = "AllowExecutionFromSNS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.process_bounces.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.ses_bounces.arn
}

resource "aws_lambda_permission" "allow_sns_complaint" {
  statement_id  = "AllowExecutionFromSNS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.process_complaints.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.ses_complaints.arn
}

# SNS subscriptions to Lambda
resource "aws_sns_topic_subscription" "bounce_lambda" {
  topic_arn = aws_sns_topic.ses_bounces.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.process_bounces.arn
}

resource "aws_sns_topic_subscription" "complaint_lambda" {
  topic_arn = aws_sns_topic.ses_complaints.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.process_complaints.arn
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "high_bounce_rate" {
  alarm_name          = "ses-high-bounce-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "Bounce"
  namespace          = "AWS/SES"
  period             = "300"
  statistic          = "Average"
  threshold          = "0.05"
  alarm_description  = "This metric monitors bounce rate"
  alarm_actions      = [aws_sns_topic.ses_complaints.arn]

  dimensions = {
    MessageTag = "default"
  }
}

resource "aws_cloudwatch_metric_alarm" "high_complaint_rate" {
  alarm_name          = "ses-high-complaint-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "Complaint"
  namespace          = "AWS/SES"
  period             = "300"
  statistic          = "Average"
  threshold          = "0.001"
  alarm_description  = "This metric monitors complaint rate"
  alarm_actions      = [aws_sns_topic.ses_complaints.arn]

  dimensions = {
    MessageTag = "default"
  }
}

# S3 bucket for email logs
resource "aws_s3_bucket" "email_logs" {
  bucket = "candlefish-ses-logs"
  
  tags = {
    Environment = "production"
    Service     = "SES"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "email_logs" {
  bucket = aws_s3_bucket.email_logs.id

  rule {
    id     = "delete-old-logs"
    status = "Enabled"

    expiration {
      days = 30
    }
  }
}

# Kinesis Firehose for streaming logs to S3
resource "aws_kinesis_firehose_delivery_stream" "ses_logs" {
  name        = "ses-email-logs"
  destination = "extended_s3"

  extended_s3_configuration {
    role_arn   = aws_iam_role.firehose.arn
    bucket_arn = aws_s3_bucket.email_logs.arn
    prefix     = "ses-logs/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/"
    
    buffer_size     = 5
    buffer_interval = 300
    
    compression_format = "GZIP"
  }
}

# IAM role for Kinesis Firehose
resource "aws_iam_role" "firehose" {
  name = "ses-firehose-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "firehose.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "firehose" {
  name = "ses-firehose-policy"
  role = aws_iam_role.firehose.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:AbortMultipartUpload",
          "s3:GetBucketLocation",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:ListBucketMultipartUploads",
          "s3:PutObject"
        ]
        Resource = [
          aws_s3_bucket.email_logs.arn,
          "${aws_s3_bucket.email_logs.arn}/*"
        ]
      }
    ]
  })
}

# Outputs
output "configuration_set_name" {
  value = aws_ses_configuration_set.main.name
}

output "bounce_topic_arn" {
  value = aws_sns_topic.ses_bounces.arn
}

output "complaint_topic_arn" {
  value = aws_sns_topic.ses_complaints.arn
}

output "suppression_table_name" {
  value = aws_dynamodb_table.suppression_list.name
}

output "email_logs_bucket" {
  value = aws_s3_bucket.email_logs.id
}

output "firehose_stream_name" {
  value = aws_kinesis_firehose_delivery_stream.ses_logs.name
}