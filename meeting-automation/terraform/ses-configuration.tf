# AWS SES Configuration for candlefish.ai
# This configuration sets up email sending capabilities for patrick@candlefish.ai

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "candlefish-terraform-state"
    key    = "ses/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = "us-east-1"
}

# Variables
variable "domain" {
  description = "Primary domain for SES"
  default     = "candlefish.ai"
}

variable "primary_email" {
  description = "Primary email address"
  default     = "patrick@candlefish.ai"
}

variable "bounce_email" {
  description = "Email for bounce notifications"
  default     = "bounces@candlefish.ai"
}

variable "complaint_email" {
  description = "Email for complaint notifications"
  default     = "complaints@candlefish.ai"
}

# SES Domain Identity
resource "aws_ses_domain_identity" "candlefish" {
  domain = var.domain
}

# SES Domain DKIM
resource "aws_ses_domain_dkim" "candlefish" {
  domain = aws_ses_domain_identity.candlefish.domain
}

# SES Email Identity
resource "aws_ses_email_identity" "patrick" {
  email = var.primary_email
}

# Additional email identities for bounce/complaint handling
resource "aws_ses_email_identity" "bounces" {
  email = var.bounce_email
}

resource "aws_ses_email_identity" "complaints" {
  email = var.complaint_email
}

# SES Configuration Set
resource "aws_ses_configuration_set" "main" {
  name = "candlefish-main"
  
  reputation_tracking_enabled = true
  sending_enabled            = true
}

# SNS Topic for Bounces
resource "aws_sns_topic" "ses_bounces" {
  name = "ses-bounces-candlefish"
  
  tags = {
    Environment = "production"
    Service     = "SES"
    Type        = "bounces"
  }
}

# SNS Topic for Complaints
resource "aws_sns_topic" "ses_complaints" {
  name = "ses-complaints-candlefish"
  
  tags = {
    Environment = "production"
    Service     = "SES"
    Type        = "complaints"
  }
}

# SNS Topic for Deliveries (optional but useful for tracking)
resource "aws_sns_topic" "ses_deliveries" {
  name = "ses-deliveries-candlefish"
  
  tags = {
    Environment = "production"
    Service     = "SES"
    Type        = "deliveries"
  }
}

# Event destination for bounces
resource "aws_ses_event_destination" "bounces" {
  name                   = "bounce-notifications"
  configuration_set_name = aws_ses_configuration_set.main.name
  enabled               = true
  matching_types        = ["bounce"]

  sns_destination {
    topic_arn = aws_sns_topic.ses_bounces.arn
  }
}

# Event destination for complaints
resource "aws_ses_event_destination" "complaints" {
  name                   = "complaint-notifications"
  configuration_set_name = aws_ses_configuration_set.main.name
  enabled               = true
  matching_types        = ["complaint"]

  sns_destination {
    topic_arn = aws_sns_topic.ses_complaints.arn
  }
}

# Event destination for successful deliveries
resource "aws_ses_event_destination" "deliveries" {
  name                   = "delivery-notifications"
  configuration_set_name = aws_ses_configuration_set.main.name
  enabled               = true
  matching_types        = ["delivery"]

  sns_destination {
    topic_arn = aws_sns_topic.ses_deliveries.arn
  }
}

# CloudWatch log group for SES events
resource "aws_cloudwatch_log_group" "ses_events" {
  name              = "/aws/ses/candlefish"
  retention_in_days = 30
  
  tags = {
    Environment = "production"
    Service     = "SES"
  }
}

# IAM role for SES to write to CloudWatch
resource "aws_iam_role" "ses_cloudwatch" {
  name = "ses-cloudwatch-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ses.amazonaws.com"
        }
      }
    ]
  })
}

# IAM policy for CloudWatch access
resource "aws_iam_role_policy" "ses_cloudwatch" {
  name = "ses-cloudwatch-policy"
  role = aws_iam_role.ses_cloudwatch.id

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
        Resource = "${aws_cloudwatch_log_group.ses_events.arn}:*"
      }
    ]
  })
}

# Outputs
output "domain_verification_token" {
  value = aws_ses_domain_identity.candlefish.verification_token
  description = "Add this as a TXT record to verify domain ownership"
}

output "dkim_tokens" {
  value = aws_ses_domain_dkim.candlefish.dkim_tokens
  description = "Add these as CNAME records for DKIM signing"
}

output "sns_bounce_topic_arn" {
  value = aws_sns_topic.ses_bounces.arn
  description = "ARN for bounce notifications topic"
}

output "sns_complaint_topic_arn" {
  value = aws_sns_topic.ses_complaints.arn
  description = "ARN for complaint notifications topic"
}

output "configuration_set_name" {
  value = aws_ses_configuration_set.main.name
  description = "Name of the SES configuration set to use when sending emails"
}

output "required_dns_records" {
  value = <<-EOT
    Required DNS Records for candlefish.ai:
    
    1. Domain Verification (TXT Record):
       Name: _amazonses.candlefish.ai
       Type: TXT
       Value: ${aws_ses_domain_identity.candlefish.verification_token}
    
    2. DKIM Records (CNAME Records):
       ${join("\n       ", [for token in aws_ses_domain_dkim.candlefish.dkim_tokens : 
         "Name: ${token}._domainkey.candlefish.ai\n       Type: CNAME\n       Value: ${token}.dkim.amazonses.com\n"])}
    
    3. SPF Record (TXT Record):
       Name: candlefish.ai
       Type: TXT
       Value: "v=spf1 include:amazonses.com ~all"
    
    4. DMARC Record (TXT Record):
       Name: _dmarc.candlefish.ai
       Type: TXT
       Value: "v=DMARC1; p=quarantine; rua=mailto:dmarc@candlefish.ai; ruf=mailto:dmarc@candlefish.ai; fo=1"
    
    5. MX Record (for receiving bounces/complaints):
       Name: candlefish.ai
       Type: MX
       Priority: 10
       Value: inbound-smtp.us-east-1.amazonaws.com
  EOT
  description = "DNS records that need to be configured"
}