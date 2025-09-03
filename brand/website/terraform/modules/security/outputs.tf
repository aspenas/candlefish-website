# Outputs for Security Module

output "waf_web_acl_arn" {
  description = "WAF Web ACL ARN"
  value       = aws_wafv2_web_acl.candlefish_waf.arn
}

output "alb_security_group_id" {
  description = "ALB security group ID"
  value       = aws_security_group.alb_security_group.id
}

output "application_security_group_id" {
  description = "Application security group ID"
  value       = aws_security_group.application_security_group.id
}

output "database_security_group_id" {
  description = "Database security group ID"
  value       = aws_security_group.database_security_group.id
}

output "animation_config_secret_arn" {
  description = "Animation configuration secret ARN"
  value       = aws_secretsmanager_secret.animation_config.arn
}

output "guardduty_detector_id" {
  description = "GuardDuty detector ID"
  value       = var.enable_guardduty ? aws_guardduty_detector.candlefish[0].id : null
}

output "config_recorder_name" {
  description = "Config recorder name"
  value       = var.enable_config_compliance ? aws_config_configuration_recorder.candlefish[0].name : null
}

output "cloudtrail_name" {
  description = "CloudTrail name"
  value       = var.enable_cloudtrail ? aws_cloudtrail.candlefish_audit[0].name : null
}

output "cloudtrail_bucket" {
  description = "CloudTrail S3 bucket name"
  value       = var.enable_cloudtrail ? aws_s3_bucket.cloudtrail_bucket[0].bucket : null
}

output "config_bucket" {
  description = "Config S3 bucket name"
  value       = var.enable_config_compliance ? aws_s3_bucket.config_bucket[0].bucket : null
}