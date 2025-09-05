# Route 53 Module with Health Checks and Advanced Routing
# DNS management for Candlefish Operational Design Atelier

# Primary Hosted Zone
resource "aws_route53_zone" "main" {
  name    = var.domain_name
  comment = "Managed by Terraform - Candlefish ${var.environment}"
  
  tags = merge(
    var.tags,
    {
      Name        = var.domain_name
      Environment = var.environment
      DNSSEC      = "enabled"
    }
  )
}

# Enable DNSSEC
resource "aws_route53_key_signing_key" "main" {
  hosted_zone_id             = aws_route53_zone.main.id
  key_management_service_arn = aws_kms_key.dnssec.arn
  name                       = "${var.environment}-dnssec-ksk"
  
  depends_on = [aws_route53_zone.main]
}

resource "aws_route53_hosted_zone_dnssec" "main" {
  hosted_zone_id = aws_route53_key_signing_key.main.hosted_zone_id
  
  depends_on = [aws_route53_key_signing_key.main]
}

# KMS Key for DNSSEC
resource "aws_kms_key" "dnssec" {
  description             = "KMS key for Route53 DNSSEC"
  deletion_window_in_days = 7
  key_usage              = "SIGN_VERIFY"
  
  customer_master_key_spec = "ECC_NIST_P256"
  
  tags = var.tags
}

resource "aws_kms_alias" "dnssec" {
  name          = "alias/${var.environment}-route53-dnssec"
  target_key_id = aws_kms_key.dnssec.key_id
}

# Health Checks
resource "aws_route53_health_check" "primary" {
  fqdn              = var.domain_name
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 2
  request_interval  = 30
  
  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-primary-health-check"
      Type = "Primary"
    }
  )
}

resource "aws_route53_health_check" "secondary" {
  fqdn              = "failover.${var.domain_name}"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 2
  request_interval  = 30
  
  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-secondary-health-check"
      Type = "Secondary"
    }
  )
}

# Calculated Health Check (Aggregate)
resource "aws_route53_health_check" "aggregate" {
  type                   = "CALCULATED"
  child_health_threshold = 1
  child_healthchecks = [
    aws_route53_health_check.primary.id,
    aws_route53_health_check.secondary.id
  ]
  
  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-aggregate-health-check"
      Type = "Aggregate"
    }
  )
}

# CloudWatch Alarms for Health Checks
resource "aws_cloudwatch_metric_alarm" "health_check_primary" {
  alarm_name          = "${var.environment}-route53-health-primary"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "HealthCheckStatus"
  namespace          = "AWS/Route53"
  period             = "60"
  statistic          = "Minimum"
  threshold          = "1"
  alarm_description  = "Primary endpoint health check"
  alarm_actions      = [var.sns_topic_arn]
  
  dimensions = {
    HealthCheckId = aws_route53_health_check.primary.id
  }
  
  tags = var.tags
}

# A Records with Failover
resource "aws_route53_record" "www_primary" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"
  
  set_identifier = "Primary"
  failover_routing_policy {
    type = "PRIMARY"
  }
  
  alias {
    name                   = var.cloudfront_distribution_domain
    zone_id               = var.cloudfront_distribution_zone_id
    evaluate_target_health = true
  }
  
  health_check_id = aws_route53_health_check.primary.id
}

resource "aws_route53_record" "www_secondary" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"
  
  set_identifier = "Secondary"
  failover_routing_policy {
    type = "SECONDARY"
  }
  
  alias {
    name                   = var.alb_dns_name
    zone_id               = var.alb_zone_id
    evaluate_target_health = true
  }
}

# Geolocation Routing for API
resource "aws_route53_record" "api_us" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"
  ttl     = 60
  
  set_identifier = "US"
  geolocation_routing_policy {
    continent = "NA"
  }
  
  records = [var.api_gateway_us_ip]
}

resource "aws_route53_record" "api_eu" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"
  ttl     = 60
  
  set_identifier = "EU"
  geolocation_routing_policy {
    continent = "EU"
  }
  
  records = [var.api_gateway_eu_ip]
}

resource "aws_route53_record" "api_ap" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"
  ttl     = 60
  
  set_identifier = "AP"
  geolocation_routing_policy {
    continent = "AS"
  }
  
  records = [var.api_gateway_ap_ip]
}

# Default API record (fallback)
resource "aws_route53_record" "api_default" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"
  ttl     = 60
  
  set_identifier = "Default"
  geolocation_routing_policy {
    country = "*"
  }
  
  records = [var.api_gateway_us_ip]
}

# Weighted Routing for Canary Deployments
resource "aws_route53_record" "canary_stable" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "app.${var.domain_name}"
  type    = "CNAME"
  ttl     = 60
  
  set_identifier = "Stable"
  weighted_routing_policy {
    weight = var.stable_weight
  }
  
  records = ["stable.${var.domain_name}"]
}

resource "aws_route53_record" "canary_new" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "app.${var.domain_name}"
  type    = "CNAME"
  ttl     = 60
  
  set_identifier = "Canary"
  weighted_routing_policy {
    weight = var.canary_weight
  }
  
  records = ["canary.${var.domain_name}"]
}

# Latency-based Routing for WebSocket
resource "aws_route53_record" "ws_us_east" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "ws.${var.domain_name}"
  type    = "A"
  ttl     = 60
  
  set_identifier = "US-East"
  latency_routing_policy {
    region = "us-east-1"
  }
  
  records = [var.websocket_us_east_ip]
  
  health_check_id = aws_route53_health_check.ws_us_east.id
}

resource "aws_route53_record" "ws_us_west" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "ws.${var.domain_name}"
  type    = "A"
  ttl     = 60
  
  set_identifier = "US-West"
  latency_routing_policy {
    region = "us-west-2"
  }
  
  records = [var.websocket_us_west_ip]
  
  health_check_id = aws_route53_health_check.ws_us_west.id
}

resource "aws_route53_record" "ws_eu" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "ws.${var.domain_name}"
  type    = "A"
  ttl     = 60
  
  set_identifier = "EU"
  latency_routing_policy {
    region = "eu-west-1"
  }
  
  records = [var.websocket_eu_ip]
  
  health_check_id = aws_route53_health_check.ws_eu.id
}

# Health Checks for WebSocket Endpoints
resource "aws_route53_health_check" "ws_us_east" {
  ip_address        = var.websocket_us_east_ip
  port              = 443
  type              = "HTTPS"
  resource_path     = "/ws/health"
  failure_threshold = 2
  request_interval  = 30
  
  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-ws-us-east-health"
      Region = "us-east-1"
    }
  )
}

resource "aws_route53_health_check" "ws_us_west" {
  ip_address        = var.websocket_us_west_ip
  port              = 443
  type              = "HTTPS"
  resource_path     = "/ws/health"
  failure_threshold = 2
  request_interval  = 30
  
  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-ws-us-west-health"
      Region = "us-west-2"
    }
  )
}

resource "aws_route53_health_check" "ws_eu" {
  ip_address        = var.websocket_eu_ip
  port              = 443
  type              = "HTTPS"
  resource_path     = "/ws/health"
  failure_threshold = 2
  request_interval  = 30
  
  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-ws-eu-health"
      Region = "eu-west-1"
    }
  )
}

# MX Records for Email
resource "aws_route53_record" "mx" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "MX"
  ttl     = 3600
  
  records = [
    "10 mail.${var.domain_name}",
    "20 mail2.${var.domain_name}"
  ]
}

# TXT Records
resource "aws_route53_record" "txt_root" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "TXT"
  ttl     = 300
  
  records = [
    "v=spf1 include:_spf.google.com ~all",
    var.domain_verification,
    "candlefish-operational-atelier=true"
  ]
}

# CAA Records for Certificate Authority Authorization
resource "aws_route53_record" "caa" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "CAA"
  ttl     = 300
  
  records = [
    "0 issue \"amazon.com\"",
    "0 issue \"letsencrypt.org\"",
    "0 issuewild \"amazon.com\"",
    "0 iodef \"mailto:security@${var.domain_name}\""
  ]
}

# CNAME for www subdomain
resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  
  records = [var.domain_name]
}

# Service Discovery Namespace
resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = "internal.${var.domain_name}"
  description = "Private DNS namespace for service discovery"
  vpc         = var.vpc_id
  
  tags = var.tags
}

# Service Discovery Services
resource "aws_service_discovery_service" "api" {
  name = "api"
  
  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id
    
    dns_records {
      ttl  = 10
      type = "A"
    }
    
    routing_policy = "MULTIVALUE"
  }
  
  health_check_custom_config {
    failure_threshold = 1
  }
  
  tags = var.tags
}

# Traffic Policy for Advanced Routing
resource "aws_route53_traffic_policy" "main" {
  name     = "${var.environment}-traffic-policy"
  type     = "A"
  comment  = "Traffic policy for advanced routing"
  document = jsonencode({
    AWSPolicyFormatVersion = "2015-10-01"
    RecordType = "A"
    Endpoints = {
      primary-cloudfront = {
        Type = "cloudfront"
        Value = var.cloudfront_distribution_domain
      }
      secondary-alb = {
        Type = "elastic-load-balancer"
        Value = var.alb_dns_name
      }
    }
    Rules = {
      primary-rule = {
        RuleType = "failover"
        Primary = {
          EndpointReference = "primary-cloudfront"
          EvaluateTargetHealth = true
        }
        Secondary = {
          EndpointReference = "secondary-alb"
          EvaluateTargetHealth = true
        }
      }
    }
  })
}

# Traffic Policy Instance
resource "aws_route53_traffic_policy_instance" "main" {
  hosted_zone_id         = aws_route53_zone.main.zone_id
  name                   = "policy.${var.domain_name}"
  traffic_policy_id      = aws_route53_traffic_policy.main.id
  traffic_policy_version = aws_route53_traffic_policy.main.version
  ttl                    = 60
}

# Query Logging Configuration
resource "aws_route53_query_log" "main" {
  depends_on = [aws_cloudwatch_log_resource_policy.route53_query_logging]
  
  cloudwatch_log_group_arn = aws_cloudwatch_log_group.route53_query.arn
  zone_id                  = aws_route53_zone.main.zone_id
}

# CloudWatch Log Group for Query Logs
resource "aws_cloudwatch_log_group" "route53_query" {
  name              = "/aws/route53/${var.domain_name}"
  retention_in_days = 30
  
  tags = var.tags
}

# CloudWatch Log Resource Policy
resource "aws_cloudwatch_log_resource_policy" "route53_query_logging" {
  policy_name = "${var.environment}-route53-query-logging"
  
  policy_document = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "route53.amazonaws.com"
        }
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:log-group:/aws/route53/*"
      }
    ]
  })
}