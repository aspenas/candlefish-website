# WAF Module - Comprehensive Web Application Firewall Configuration
# Advanced security rules for Candlefish Operational Design Atelier

# WAF Web ACL
resource "aws_wafv2_web_acl" "main" {
  name  = "${var.environment}-candlefish-waf"
  scope = "CLOUDFRONT"
  
  default_action {
    allow {}
  }
  
  # Rate Limiting Rule - Global
  rule {
    name     = "RateLimitGlobal"
    priority = 1
    
    statement {
      rate_based_statement {
        limit              = 10000
        aggregate_key_type = "IP"
      }
    }
    
    action {
      block {
        custom_response {
          response_code = 429
          custom_response_body_key = "rate_limit_exceeded"
        }
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitGlobal"
      sampled_requests_enabled   = true
    }
  }
  
  # Rate Limiting Rule - API Endpoints
  rule {
    name     = "RateLimitAPI"
    priority = 2
    
    statement {
      and_statement {
        statement {
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
        
        statement {
          rate_based_statement {
            limit              = 1000
            aggregate_key_type = "IP"
          }
        }
      }
    }
    
    action {
      block {
        custom_response {
          response_code = 429
          custom_response_body_key = "api_rate_limit_exceeded"
        }
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitAPI"
      sampled_requests_enabled   = true
    }
  }
  
  # AWS Managed Core Rule Set (OWASP Top 10)
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
        
        # Custom exclusions for specific rules
        excluded_rule {
          name = "SizeRestrictions_BODY"
        }
        
        excluded_rule {
          name = "GenericRFI_BODY"
        }
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "CommonRuleSet"
      sampled_requests_enabled   = true
    }
  }
  
  # SQL Injection Protection
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 20
    
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
      metric_name                = "SQLiRuleSet"
      sampled_requests_enabled   = true
    }
  }
  
  # Known Bad Inputs
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 30
    
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
      metric_name                = "KnownBadInputs"
      sampled_requests_enabled   = true
    }
  }
  
  # Linux Operating System Protection
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
      cloudwatch_metrics_enabled = true
      metric_name                = "LinuxRuleSet"
      sampled_requests_enabled   = true
    }
  }
  
  # IP Reputation List
  rule {
    name     = "AWSManagedRulesAmazonIpReputationList"
    priority = 50
    
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
      metric_name                = "IpReputationList"
      sampled_requests_enabled   = true
    }
  }
  
  # Anonymous IP List
  rule {
    name     = "AWSManagedRulesAnonymousIpList"
    priority = 60
    
    override_action {
      none {}
    }
    
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesAnonymousIpList"
        vendor_name = "AWS"
        
        excluded_rule {
          name = "HostingProviderIPList"
        }
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AnonymousIpList"
      sampled_requests_enabled   = true
    }
  }
  
  # Bot Control Rule Set (Advanced)
  dynamic "rule" {
    for_each = var.enable_bot_control ? [1] : []
    
    content {
      name     = "AWSManagedRulesBotControlRuleSet"
      priority = 70
      
      override_action {
        none {}
      }
      
      statement {
        managed_rule_group_statement {
          name        = "AWSManagedRulesBotControlRuleSet"
          vendor_name = "AWS"
          
          scope_down_statement {
            not_statement {
              statement {
                byte_match_statement {
                  search_string = "/health"
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
            }
          }
        }
      }
      
      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "BotControlRuleSet"
        sampled_requests_enabled   = true
      }
    }
  }
  
  # Custom XSS Protection
  rule {
    name     = "CustomXSSProtection"
    priority = 80
    
    statement {
      xss_match_statement {
        field_to_match {
          body {}
        }
        
        text_transformation {
          priority = 0
          type     = "URL_DECODE"
        }
        
        text_transformation {
          priority = 1
          type     = "HTML_ENTITY_DECODE"
        }
      }
    }
    
    action {
      block {
        custom_response {
          response_code = 403
          custom_response_body_key = "xss_detected"
        }
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "CustomXSSProtection"
      sampled_requests_enabled   = true
    }
  }
  
  # Geo-blocking Rule
  dynamic "rule" {
    for_each = length(var.blocked_countries) > 0 ? [1] : []
    
    content {
      name     = "GeoBlockingRule"
      priority = 90
      
      statement {
        geo_match_statement {
          country_codes = var.blocked_countries
        }
      }
      
      action {
        block {
          custom_response {
            response_code = 403
            custom_response_body_key = "geo_blocked"
          }
        }
      }
      
      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "GeoBlocking"
        sampled_requests_enabled   = true
      }
    }
  }
  
  # Size Constraints
  rule {
    name     = "SizeConstraints"
    priority = 100
    
    statement {
      or_statement {
        statement {
          size_constraint_statement {
            field_to_match {
              body {}
            }
            comparison_operator = "GT"
            size                = 8192
            
            text_transformation {
              priority = 0
              type     = "NONE"
            }
          }
        }
        
        statement {
          size_constraint_statement {
            field_to_match {
              single_header {
                name = "content-length"
              }
            }
            comparison_operator = "GT"
            size                = 8192
            
            text_transformation {
              priority = 0
              type     = "NONE"
            }
          }
        }
      }
    }
    
    action {
      block {
        custom_response {
          response_code = 413
          custom_response_body_key = "request_too_large"
        }
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "SizeConstraints"
      sampled_requests_enabled   = true
    }
  }
  
  # Custom IP Allowlist
  dynamic "rule" {
    for_each = length(var.allowed_ips) > 0 ? [1] : []
    
    content {
      name     = "IPAllowlist"
      priority = 0
      
      statement {
        ip_set_reference_statement {
          arn = aws_wafv2_ip_set.allowed.arn
        }
      }
      
      action {
        allow {}
      }
      
      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "IPAllowlist"
        sampled_requests_enabled   = true
      }
    }
  }
  
  # Custom IP Blocklist
  dynamic "rule" {
    for_each = length(var.blocked_ips) > 0 ? [1] : []
    
    content {
      name     = "IPBlocklist"
      priority = 5
      
      statement {
        ip_set_reference_statement {
          arn = aws_wafv2_ip_set.blocked.arn
        }
      }
      
      action {
        block {
          custom_response {
            response_code = 403
            custom_response_body_key = "ip_blocked"
          }
        }
      }
      
      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "IPBlocklist"
        sampled_requests_enabled   = true
      }
    }
  }
  
  # Request Header Validation
  rule {
    name     = "HeaderValidation"
    priority = 110
    
    statement {
      and_statement {
        statement {
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
        
        statement {
          not_statement {
            statement {
              byte_match_statement {
                search_string = "application/json"
                field_to_match {
                  single_header {
                    name = "content-type"
                  }
                }
                text_transformation {
                  priority = 0
                  type     = "LOWERCASE"
                }
                positional_constraint = "CONTAINS"
              }
            }
          }
        }
      }
    }
    
    action {
      block {
        custom_response {
          response_code = 415
          custom_response_body_key = "unsupported_media_type"
        }
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "HeaderValidation"
      sampled_requests_enabled   = true
    }
  }
  
  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.environment}-candlefish-waf"
    sampled_requests_enabled   = true
  }
  
  # Custom response bodies
  custom_response_body {
    key          = "rate_limit_exceeded"
    content      = "{\"error\": \"Rate limit exceeded. Please try again later.\"}"
    content_type = "APPLICATION_JSON"
  }
  
  custom_response_body {
    key          = "api_rate_limit_exceeded"
    content      = "{\"error\": \"API rate limit exceeded. Please reduce request frequency.\"}"
    content_type = "APPLICATION_JSON"
  }
  
  custom_response_body {
    key          = "xss_detected"
    content      = "{\"error\": \"Potential XSS attack detected and blocked.\"}"
    content_type = "APPLICATION_JSON"
  }
  
  custom_response_body {
    key          = "geo_blocked"
    content      = "{\"error\": \"Access denied from your location.\"}"
    content_type = "APPLICATION_JSON"
  }
  
  custom_response_body {
    key          = "request_too_large"
    content      = "{\"error\": \"Request payload too large.\"}"
    content_type = "APPLICATION_JSON"
  }
  
  custom_response_body {
    key          = "ip_blocked"
    content      = "{\"error\": \"Access denied.\"}"
    content_type = "APPLICATION_JSON"
  }
  
  custom_response_body {
    key          = "unsupported_media_type"
    content      = "{\"error\": \"Unsupported media type. API expects application/json.\"}"
    content_type = "APPLICATION_JSON"
  }
  
  tags = var.tags
}

# IP Sets
resource "aws_wafv2_ip_set" "allowed" {
  name               = "${var.environment}-allowed-ips"
  description        = "Allowed IP addresses"
  scope              = "CLOUDFRONT"
  ip_address_version = "IPV4"
  addresses          = var.allowed_ips
  
  tags = var.tags
}

resource "aws_wafv2_ip_set" "blocked" {
  name               = "${var.environment}-blocked-ips"
  description        = "Blocked IP addresses"
  scope              = "CLOUDFRONT"
  ip_address_version = "IPV4"
  addresses          = var.blocked_ips
  
  tags = var.tags
}

# Regex Pattern Set for Custom Rules
resource "aws_wafv2_regex_pattern_set" "malicious_patterns" {
  name        = "${var.environment}-malicious-patterns"
  description = "Patterns for detecting malicious requests"
  scope       = "CLOUDFRONT"
  
  regular_expression {
    regex_string = "(?i)(union.*select|select.*from|insert.*into|delete.*from)"
  }
  
  regular_expression {
    regex_string = "(?i)(<script|javascript:|onerror=|onload=)"
  }
  
  regular_expression {
    regex_string = "(?i)(eval\\(|base64_decode\\(|shell_exec\\(|system\\()"
  }
  
  tags = var.tags
}

# Logging Configuration
resource "aws_wafv2_web_acl_logging_configuration" "main" {
  resource_arn            = aws_wafv2_web_acl.main.arn
  log_destination_configs = [aws_kinesis_firehose_delivery_stream.waf_logs.arn]
  
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

# Kinesis Firehose for WAF Logs
resource "aws_kinesis_firehose_delivery_stream" "waf_logs" {
  name        = "aws-waf-logs-${var.environment}-candlefish"
  destination = "extended_s3"
  
  extended_s3_configuration {
    role_arn   = aws_iam_role.firehose.arn
    bucket_arn = aws_s3_bucket.waf_logs.arn
    prefix     = "waf-logs/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/"
    
    compression_format = "GZIP"
    
    buffer_size     = 5
    buffer_interval = 300
    
    processing_configuration {
      enabled = true
      
      processors {
        type = "Lambda"
        
        parameters {
          parameter_name  = "LambdaArn"
          parameter_value = "${aws_lambda_function.waf_log_processor.arn}:$LATEST"
        }
      }
    }
    
    data_format_conversion_configuration {
      output_format_configuration {
        serializer {
          parquet_ser_de {}
        }
      }
      
      schema_configuration {
        database_name = aws_glue_catalog_database.waf_logs.name
        role_arn      = aws_iam_role.firehose.arn
        table_name    = aws_glue_catalog_table.waf_logs.name
      }
    }
  }
}

# S3 Bucket for WAF Logs
resource "aws_s3_bucket" "waf_logs" {
  bucket = "${var.environment}-candlefish-waf-logs"
  
  tags = var.tags
}

# Lambda for Processing WAF Logs
resource "aws_lambda_function" "waf_log_processor" {
  function_name = "${var.environment}-waf-log-processor"
  role          = aws_iam_role.waf_log_processor.arn
  handler       = "index.handler"
  runtime       = "python3.11"
  timeout       = 60
  memory_size   = 256
  
  filename         = data.archive_file.waf_log_processor.output_path
  source_code_hash = data.archive_file.waf_log_processor.output_base64sha256
  
  environment {
    variables = {
      ENVIRONMENT = var.environment
    }
  }
  
  tags = var.tags
}

data "archive_file" "waf_log_processor" {
  type        = "zip"
  output_path = "/tmp/waf-log-processor.zip"
  
  source {
    content  = file("${path.module}/lambda/waf-log-processor.py")
    filename = "index.py"
  }
}

# Glue Database for WAF Logs
resource "aws_glue_catalog_database" "waf_logs" {
  name = "${var.environment}_waf_logs"
  
  description = "Database for WAF logs analysis"
}

# Glue Table for WAF Logs
resource "aws_glue_catalog_table" "waf_logs" {
  database_name = aws_glue_catalog_database.waf_logs.name
  name          = "waf_logs"
  
  table_type = "EXTERNAL_TABLE"
  
  parameters = {
    "projection.enabled"      = "true"
    "projection.year.type"    = "integer"
    "projection.year.range"   = "2024,2030"
    "projection.month.type"   = "integer"
    "projection.month.range"  = "1,12"
    "projection.month.digits" = "2"
    "projection.day.type"     = "integer"
    "projection.day.range"    = "1,31"
    "projection.day.digits"   = "2"
  }
  
  storage_descriptor {
    location      = "s3://${aws_s3_bucket.waf_logs.bucket}/waf-logs/"
    input_format  = "org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat"
    output_format = "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat"
    
    ser_de_info {
      serialization_library = "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
    }
    
    columns {
      name = "timestamp"
      type = "bigint"
    }
    
    columns {
      name = "formatversion"
      type = "int"
    }
    
    columns {
      name = "webaclid"
      type = "string"
    }
    
    columns {
      name = "terminatingruleid"
      type = "string"
    }
    
    columns {
      name = "terminatingruletype"
      type = "string"
    }
    
    columns {
      name = "action"
      type = "string"
    }
    
    columns {
      name = "httpsourcename"
      type = "string"
    }
    
    columns {
      name = "httpsourceid"
      type = "string"
    }
    
    columns {
      name = "rulegrouplist"
      type = "array<struct<rulegroupid:string,terminatingrule:string,action:string>>"
    }
    
    columns {
      name = "ratebasedrulelist"
      type = "array<struct<ratebasedruleid:string,limitkey:string,maxrateallowed:int>>"
    }
    
    columns {
      name = "nonterminatingmatchingrules"
      type = "array<struct<ruleid:string,action:string>>"
    }
    
    columns {
      name = "httprequest"
      type = "struct<clientip:string,country:string,headers:array<struct<name:string,value:string>>,uri:string,args:string,httpversion:string,httpmethod:string,requestid:string>"
    }
  }
}

# IAM Roles
resource "aws_iam_role" "firehose" {
  name = "${var.environment}-waf-firehose-role"
  
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
  
  tags = var.tags
}

resource "aws_iam_role" "waf_log_processor" {
  name = "${var.environment}-waf-log-processor-role"
  
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
  
  tags = var.tags
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "waf_blocked_requests" {
  alarm_name          = "${var.environment}-waf-blocked-requests"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name        = "BlockedRequests"
  namespace          = "AWS/WAFV2"
  period             = 300
  statistic          = "Sum"
  threshold          = 100
  alarm_description  = "Alert when WAF blocks more than 100 requests in 5 minutes"
  alarm_actions      = [var.sns_topic_arn]
  
  dimensions = {
    WebACL = aws_wafv2_web_acl.main.name
    Region = "GLOBAL"
    Rule   = "ALL"
  }
  
  tags = var.tags
}