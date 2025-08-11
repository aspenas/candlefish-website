# AWS WAF Configuration for Tyler Setup Platform

# WAF Web ACL for Application Load Balancer
resource "aws_wafv2_web_acl" "main" {
  name  = "${var.project_name}-web-acl"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  # Rate limiting rule
  rule {
    name     = "RateLimitRule"
    priority = 1

    override_action {
      none {}
    }

    statement {
      rate_based_statement {
        limit              = var.api_rate_limit
        aggregate_key_type = "IP"

        scope_down_statement {
          byte_match_statement {
            search_string = "/api/"
            field_to_match {
              uri_path {}
            }
            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
            positional_constraint = "STARTS_WITH"
          }
        }
      }
    }

    action {
      block {}
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRule"
      sampled_requests_enabled   = true
    }
  }

  # Authentication rate limiting
  rule {
    name     = "AuthRateLimitRule"
    priority = 2

    override_action {
      none {}
    }

    statement {
      rate_based_statement {
        limit              = var.auth_rate_limit
        aggregate_key_type = "IP"

        scope_down_statement {
          or_statement {
            statement {
              byte_match_statement {
                search_string = "/api/auth/"
                field_to_match {
                  uri_path {}
                }
                text_transformation {
                  priority = 0
                  type     = "LOWERCASE"
                }
                positional_constraint = "STARTS_WITH"
              }
            }
            statement {
              byte_match_statement {
                search_string = "/api/login"
                field_to_match {
                  uri_path {}
                }
                text_transformation {
                  priority = 0
                  type     = "LOWERCASE"
                }
                positional_constraint = "STARTS_WITH"
              }
            }
          }
        }
      }
    }

    action {
      block {}
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AuthRateLimitRule"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules - Core Rule Set
  rule {
    name     = "AWSManagedRulesCore"
    priority = 10

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"

        # Exclude specific rules that might cause false positives
        excluded_rule {
          name = "GenericRFI_BODY"
        }
        excluded_rule {
          name = "SizeRestrictions_BODY"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCore"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules - Known Bad Inputs
  rule {
    name     = "AWSManagedRulesKnownBadInputs"
    priority = 20

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesKnownBadInputs"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules - SQL Injection
  rule {
    name     = "AWSManagedRulesSQLi"
    priority = 30

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesSQLi"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules - Linux Operating System
  rule {
    name     = "AWSManagedRulesLinux"
    priority = 40

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesLinuxRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesLinux"
      sampled_requests_enabled   = true
    }
  }

  # Custom rule for GraphQL query depth
  rule {
    name     = "GraphQLDepthLimitRule"
    priority = 50

    action {
      block {}
    }

    statement {
      and_statement {
        statement {
          byte_match_statement {
            search_string = "/graphql"
            field_to_match {
              uri_path {}
            }
            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
            positional_constraint = "EXACTLY"
          }
        }
        statement {
          regex_pattern_set_reference_statement {
            arn = aws_wafv2_regex_pattern_set.graphql_depth.arn
            field_to_match {
              body {}
            }
            text_transformation {
              priority = 0
              type     = "NONE"
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "GraphQLDepthLimitRule"
      sampled_requests_enabled   = true
    }
  }

  # IP reputation rule
  rule {
    name     = "AWSManagedRulesAmazonIpReputationList"
    priority = 60

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesAmazonIpReputationList"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesAmazonIpReputationList"
      sampled_requests_enabled   = true
    }
  }

  # Anonymous IP list
  rule {
    name     = "AWSManagedRulesAnonymousIpList"
    priority = 70

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesAnonymousIpList"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesAnonymousIpList"
      sampled_requests_enabled   = true
    }
  }

  # Bot control rule
  rule {
    name     = "AWSManagedRulesBotControlRuleSet"
    priority = 80

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesBotControlRuleSet"
        vendor_name = "AWS"

        managed_rule_group_configs {
          aws_managed_rules_bot_control_rule_set {
            inspection_level = "COMMON"
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesBotControlRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # Custom rule for large payloads
  rule {
    name     = "LargePayloadRule"
    priority = 90

    action {
      block {}
    }

    statement {
      size_constraint_statement {
        field_to_match {
          body {}
        }
        comparison_operator = "GT"
        size                = 1048576  # 1MB
        text_transformation {
          priority = 0
          type     = "NONE"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "LargePayloadRule"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project_name}WebAcl"
    sampled_requests_enabled   = true
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-web-acl"
  })
}

# Regex pattern set for GraphQL depth limiting
resource "aws_wafv2_regex_pattern_set" "graphql_depth" {
  name  = "${var.project_name}-graphql-depth-pattern"
  scope = "REGIONAL"

  # Pattern to detect deeply nested GraphQL queries (more than 10 levels)
  regular_expression {
    regex_string = "\\{[^{}]*\\{[^{}]*\\{[^{}]*\\{[^{}]*\\{[^{}]*\\{[^{}]*\\{[^{}]*\\{[^{}]*\\{[^{}]*\\{[^{}]*\\{"
  }

  tags = var.common_tags
}

# WAF Web ACL Association with ALB
resource "aws_wafv2_web_acl_association" "alb" {
  resource_arn = aws_lb.main.arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}

# CloudFront WAF (Global scope)
resource "aws_wafv2_web_acl" "cloudfront" {
  provider = aws.us_east_1
  name     = "${var.project_name}-cloudfront-web-acl"
  scope    = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # Rate limiting for CloudFront
  rule {
    name     = "CloudFrontRateLimitRule"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000  # Higher limit for CDN
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "CloudFrontRateLimitRule"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules for CloudFront
  rule {
    name     = "AWSManagedRulesCloudFrontCore"
    priority = 10

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCloudFrontCore"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project_name}CloudFrontWebAcl"
    sampled_requests_enabled   = true
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-cloudfront-web-acl"
  })
}

# Provider for us-east-1 (required for CloudFront)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = var.common_tags
  }
}

# Shield Advanced (optional, for DDoS protection)
resource "aws_shield_protection" "alb" {
  count        = var.enable_shield_advanced ? 1 : 0
  name         = "${var.project_name}-alb-shield"
  resource_arn = aws_lb.main.arn

  tags = var.common_tags
}

resource "aws_shield_protection" "cloudfront" {
  count        = var.enable_shield_advanced ? 1 : 0
  name         = "${var.project_name}-cloudfront-shield"
  resource_arn = aws_cloudfront_distribution.main.arn

  tags = var.common_tags
}

# CloudWatch Alarms for WAF
resource "aws_cloudwatch_metric_alarm" "waf_blocked_requests" {
  alarm_name          = "${var.project_name}-waf-blocked-requests"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "BlockedRequests"
  namespace           = "AWS/WAFV2"
  period              = "300"
  statistic           = "Sum"
  threshold           = "100"
  alarm_description   = "High number of requests blocked by WAF"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    WebACL = aws_wafv2_web_acl.main.name
    Region = var.aws_region
    Rule   = "ALL"
  }

  tags = var.common_tags
}

resource "aws_cloudwatch_metric_alarm" "waf_rate_limit_triggered" {
  alarm_name          = "${var.project_name}-waf-rate-limit-triggered"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "BlockedRequests"
  namespace           = "AWS/WAFV2"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "Rate limiting triggered in WAF"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    WebACL = aws_wafv2_web_acl.main.name
    Region = var.aws_region
    Rule   = "RateLimitRule"
  }

  tags = var.common_tags
}

# Custom logging configuration for WAF
resource "aws_wafv2_web_acl_logging_configuration" "main" {
  resource_arn            = aws_wafv2_web_acl.main.arn
  log_destination_configs = [aws_cloudwatch_log_group.waf.arn]

  redacted_fields {
    single_header {
      name = "authorization"
    }
  }

  redacted_fields {
    single_header {
      name = "cookie"
    }
  }

  logging_filter {
    default_behavior = "KEEP"

    filter {
      behavior = "KEEP"
      condition {
        action_condition {
          action = "BLOCK"
        }
      }
      requirement = "MEETS_ANY"
    }
  }
}

# CloudWatch Log Group for WAF
resource "aws_cloudwatch_log_group" "waf" {
  name              = "/aws/wafv2/${var.project_name}"
  retention_in_days = 30
  kms_key_id       = aws_kms_key.main.arn

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-waf-logs"
  })
}
