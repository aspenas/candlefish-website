# AWS WAF v2 with OWASP Managed Rules and Bot Control - REMEDIATION CR-006
# Comprehensive WAF protection for PromoterOS

resource "aws_wafv2_web_acl" "promoteros_waf" {
  name  = "${var.project_name}-waf-acl"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  # Rate limiting rule - prevent DDoS
  rule {
    name     = "RateLimitPerIP"
    priority = 1

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    action {
      block {
        custom_response {
          response_code = 429
          custom_response_body_key = "rate_limit_body"
        }
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitPerIP"
    }
  }

  # AWS Managed Rules - Core Rule Set (OWASP Top 10)
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 10

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"

        # Allow specific rules to be tuned if needed
        excluded_rule {
          name = "SizeRestrictions_BODY"
        }

        excluded_rule {
          name = "GenericRFI_BODY"
        }
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "CommonRuleSetMetric"
    }
  }

  # AWS Managed Rules - Known Bad Inputs
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
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
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "KnownBadInputsMetric"
    }
  }

  # AWS Managed Rules - SQL Injection Protection
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
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
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "SQLiRuleSetMetric"
    }
  }

  # AWS Managed Rules - Linux Protection
  rule {
    name     = "AWSManagedRulesLinuxRuleSet"
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
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "LinuxRuleSetMetric"
    }
  }

  # AWS Bot Control Rule Set
  rule {
    name     = "AWSManagedRulesBotControlRuleSet"
    priority = 50

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesBotControlRuleSet"
        vendor_name = "AWS"

        # Bot Control configuration
        managed_rule_group_configs {
          aws_managed_rules_bot_control_rule_set {
            inspection_level = "TARGETED"

            # Enable CAPTCHAs for suspicious bots
            enable_machine_learning = true
          }
        }

        # Allow verified bots (e.g., Google, Bing)
        scope_down_statement {
          not_statement {
            statement {
              label_match_statement {
                scope = "LABEL"
                key   = "awswaf:managed:aws:bot-control:bot:verified"
              }
            }
          }
        }
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "BotControlMetric"
    }
  }

  # Geographic restriction - optional
  rule {
    name     = "GeoBlockingRule"
    priority = 60

    statement {
      geo_match_statement {
        # Block high-risk countries (customize as needed)
        country_codes = ["CN", "RU", "KP", "IR"]
      }
    }

    action {
      block {
        custom_response {
          response_code = 403
        }
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "GeoBlockingMetric"
    }
  }

  # Custom rule for API endpoint protection
  rule {
    name     = "ProtectAPIEndpoints"
    priority = 70

    statement {
      and_statement {
        statement {
          byte_match_statement {
            search_string         = "/api/"
            field_to_match {
              uri_path {}
            }
            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
            positional_constraint = "CONTAINS"
          }
        }

        statement {
          not_statement {
            statement {
              byte_match_statement {
                search_string = "Bearer "
                field_to_match {
                  single_header {
                    name = "authorization"
                  }
                }
                text_transformation {
                  priority = 0
                  type     = "NONE"
                }
                positional_constraint = "STARTS_WITH"
              }
            }
          }
        }
      }
    }

    action {
      block {
        custom_response {
          response_code = 401
          custom_response_body_key = "unauthorized_body"
        }
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "ProtectAPIEndpointsMetric"
    }
  }

  visibility_config {
    sampled_requests_enabled   = true
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project_name}-waf-acl"
  }

  # Custom response bodies
  custom_response_body {
    key          = "rate_limit_body"
    content      = "{\"error\": \"Too many requests. Please try again later.\"}"
    content_type = "APPLICATION_JSON"
  }

  custom_response_body {
    key          = "unauthorized_body"
    content      = "{\"error\": \"Authorization required\"}"
    content_type = "APPLICATION_JSON"
  }

  tags = {
    Name        = "${var.project_name}-waf-acl"
    Environment = var.environment
    Remediation = "CR-006"
  }
}

# Associate WAF with ALB
resource "aws_wafv2_web_acl_association" "alb" {
  resource_arn = aws_lb.main.arn
  web_acl_arn  = aws_wafv2_web_acl.promoteros_waf.arn
}

# CloudWatch Log Group for WAF Logs
resource "aws_cloudwatch_log_group" "waf_logs" {
  name              = "/aws/wafv2/${var.project_name}"
  retention_in_days = 30
  kms_key_id        = aws_kms_key.logs.arn

  tags = {
    Name        = "${var.project_name}-waf-logs"
    Environment = var.environment
  }
}

# WAF Logging Configuration
resource "aws_wafv2_web_acl_logging_configuration" "main" {
  resource_arn            = aws_wafv2_web_acl.promoteros_waf.arn
  log_destination_configs = [aws_cloudwatch_log_group.waf_logs.arn]

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

  redacted_fields {
    single_header {
      name = "x-api-key"
    }
  }
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
  threshold           = "1000"
  alarm_description   = "This metric monitors blocked requests"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    WebACL = aws_wafv2_web_acl.promoteros_waf.name
    Region = data.aws_region.current.name
    Rule   = "ALL"
  }

  tags = {
    Name        = "${var.project_name}-waf-blocked-alarm"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_metric_alarm" "waf_rate_limit" {
  alarm_name          = "${var.project_name}-waf-rate-limit-triggered"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "BlockedRequests"
  namespace           = "AWS/WAFV2"
  period              = "60"
  statistic           = "Sum"
  threshold           = "100"
  alarm_description   = "Rate limiting is blocking significant traffic"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    WebACL = aws_wafv2_web_acl.promoteros_waf.name
    Region = data.aws_region.current.name
    Rule   = "RateLimitPerIP"
  }

  tags = {
    Name        = "${var.project_name}-waf-rate-limit-alarm"
    Environment = var.environment
  }
}
