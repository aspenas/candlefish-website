# Enhanced Monitoring Module Variables for Candlefish.ai
# CloudWatch, X-Ray, SNS, Custom Metrics, Dashboards

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "project_name" {
  description = "Name of the project/application"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

# ============================================
# CloudWatch Configuration
# ============================================
variable "cloudwatch_config" {
  description = "CloudWatch configuration"
  type = object({
    log_retention_days                = number
    create_log_groups                = bool
    enable_detailed_monitoring       = bool
    enable_container_insights        = bool
    
    # Metric filters
    create_metric_filters = bool
    error_log_patterns   = list(string)
    
    # Cross-region replication
    enable_cross_region_replication = bool
    replication_region             = optional(string, "us-west-2")
  })
  
  default = {
    log_retention_days                = 30
    create_log_groups                = true
    enable_detailed_monitoring       = true
    enable_container_insights        = true
    create_metric_filters            = true
    error_log_patterns              = ["ERROR", "CRITICAL", "FATAL", "[Ee]rror", "[Ee]xception"]
    enable_cross_region_replication  = false
  }
}

variable "log_groups" {
  description = "CloudWatch Log Groups configuration"
  type = map(object({
    retention_in_days = number
    kms_key_id       = optional(string)
    
    # Subscription filters
    subscription_filters = optional(list(object({
      name            = string
      filter_pattern  = string
      destination_arn = string
    })), [])
    
    # Metric filters
    metric_filters = optional(list(object({
      name           = string
      pattern        = string
      metric_name    = string
      metric_namespace = string
      metric_value   = optional(string, "1")
      default_value  = optional(number, 0)
    })), [])
  }))
  
  default = {
    application = {
      retention_in_days = 30
    }
    
    ecs_tasks = {
      retention_in_days = 14
    }
    
    lambda_functions = {
      retention_in_days = 14
    }
    
    api_gateway = {
      retention_in_days = 30
    }
    
    cloudfront = {
      retention_in_days = 7
    }
  }
}

# ============================================
# Dashboard Configuration
# ============================================
variable "dashboards" {
  description = "CloudWatch Dashboard configuration"
  type = map(object({
    description = string
    period      = optional(number, 300)
    widgets     = list(object({
      type   = string
      x      = number
      y      = number
      width  = number
      height = number
      
      properties = object({
        metrics = optional(list(list(string)), [])
        period  = optional(number)
        stat    = optional(string, "Average")
        region  = optional(string)
        title   = optional(string)
        view    = optional(string, "timeSeries")
        stacked = optional(bool, false)
        yAxis   = optional(object({
          left = optional(object({
            min = optional(number)
            max = optional(number)
          }))
        }))
        annotations = optional(object({
          horizontal = optional(list(object({
            label = optional(string)
            value = number
          })))
        }))
      })
    }))
  }))
  
  default = {
    operational = {
      description = "Candlefish Operational Dashboard"
      widgets = [
        {
          type   = "metric"
          x      = 0
          y      = 0
          width  = 12
          height = 6
          
          properties = {
            title   = "Application Performance"
            metrics = [
              ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", "candlefish-alb"],
              ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", "candlefish-alb"],
              ["AWS/ApplicationELB", "HTTPCode_Target_2XX_Count", "LoadBalancer", "candlefish-alb"]
            ]
            period = 300
            stat   = "Average"
            region = "us-east-1"
            view   = "timeSeries"
          }
        }
      ]
    }
    
    infrastructure = {
      description = "Infrastructure Monitoring Dashboard"
      widgets = [
        {
          type   = "metric"
          x      = 0
          y      = 0
          width  = 12
          height = 6
          
          properties = {
            title = "ECS Service Health"
            metrics = [
              ["AWS/ECS", "CPUUtilization", "ServiceName", "candlefish-service", "ClusterName", "candlefish-cluster"],
              ["AWS/ECS", "MemoryUtilization", "ServiceName", "candlefish-service", "ClusterName", "candlefish-cluster"]
            ]
            period = 300
            stat   = "Average"
          }
        }
      ]
    }
  }
}

# ============================================
# Alerting Configuration
# ============================================
variable "alerts" {
  description = "CloudWatch Alarms configuration"
  type = map(object({
    description         = string
    metric_name        = string
    namespace          = string
    statistic          = string
    period             = number
    evaluation_periods = number
    threshold          = number
    comparison_operator = string
    
    # Dimensions
    dimensions = map(string)
    
    # Actions
    alarm_actions             = list(string)
    ok_actions               = list(string)
    insufficient_data_actions = list(string)
    
    # Advanced settings
    datapoints_to_alarm = optional(number)
    treat_missing_data  = optional(string, "missing")
    
    # Composite alarms
    alarm_rule = optional(string)
  }))
  
  default = {
    high_cpu = {
      description         = "High CPU utilization"
      metric_name        = "CPUUtilization"
      namespace          = "AWS/ECS"
      statistic          = "Average"
      period             = 300
      evaluation_periods = 2
      threshold          = 80
      comparison_operator = "GreaterThanThreshold"
      dimensions = {
        ServiceName = "candlefish-service"
        ClusterName = "candlefish-cluster"
      }
      alarm_actions             = []
      ok_actions               = []
      insufficient_data_actions = []
    }
    
    high_memory = {
      description         = "High memory utilization"
      metric_name        = "MemoryUtilization"
      namespace          = "AWS/ECS"
      statistic          = "Average"
      period             = 300
      evaluation_periods = 2
      threshold          = 85
      comparison_operator = "GreaterThanThreshold"
      dimensions = {
        ServiceName = "candlefish-service"
        ClusterName = "candlefish-cluster"
      }
      alarm_actions             = []
      ok_actions               = []
      insufficient_data_actions = []
    }
    
    api_latency = {
      description         = "High API response time"
      metric_name        = "TargetResponseTime"
      namespace          = "AWS/ApplicationELB"
      statistic          = "Average"
      period             = 300
      evaluation_periods = 3
      threshold          = 1.0
      comparison_operator = "GreaterThanThreshold"
      dimensions = {
        LoadBalancer = "app/candlefish-alb"
      }
      alarm_actions             = []
      ok_actions               = []
      insufficient_data_actions = []
    }
    
    error_rate = {
      description         = "High error rate"
      metric_name        = "HTTPCode_Target_5XX_Count"
      namespace          = "AWS/ApplicationELB"
      statistic          = "Sum"
      period             = 300
      evaluation_periods = 2
      threshold          = 10
      comparison_operator = "GreaterThanThreshold"
      dimensions = {
        LoadBalancer = "app/candlefish-alb"
      }
      alarm_actions             = []
      ok_actions               = []
      insufficient_data_actions = []
    }
  }
}

# ============================================
# SNS Configuration
# ============================================
variable "notification_config" {
  description = "SNS notification configuration"
  type = object({
    create_topics = bool
    
    topics = map(object({
      name                        = string
      display_name               = optional(string)
      kms_master_key_id         = optional(string)
      
      # Subscriptions
      email_endpoints    = list(string)
      sms_endpoints     = list(string)
      slack_endpoints   = list(string)
      lambda_endpoints  = list(string)
      
      # Message filtering
      message_filtering_enabled = optional(bool, false)
      
      # Delivery policies
      delivery_policy = optional(string)
      
      # Dead letter queue
      enable_dlq = optional(bool, false)
    }))
  })
  
  default = {
    create_topics = true
    
    topics = {
      alerts = {
        name         = "candlefish-alerts"
        display_name = "Candlefish Alerts"
        
        email_endpoints  = []
        sms_endpoints   = []
        slack_endpoints = []
        lambda_endpoints = []
      }
      
      critical_alerts = {
        name         = "candlefish-critical"
        display_name = "Candlefish Critical Alerts"
        
        email_endpoints  = []
        sms_endpoints   = []
        slack_endpoints = []
        lambda_endpoints = []
      }
    }
  }
}

# ============================================
# X-Ray Configuration
# ============================================
variable "xray_config" {
  description = "X-Ray tracing configuration"
  type = object({
    enable_tracing           = bool
    sampling_rate           = number
    create_service_map      = bool
    enable_insights         = bool
    
    # Encryption
    enable_encryption = bool
    kms_key_id       = optional(string)
    
    # Sampling rules
    sampling_rules = list(object({
      rule_name      = string
      priority       = number
      fixed_rate     = number
      reservoir_size = number
      service_name   = string
      service_type   = string
      host           = string
      http_method    = string
      url_path       = string
      version        = number
    }))
  })
  
  default = {
    enable_tracing           = true
    sampling_rate           = 0.1
    create_service_map      = true
    enable_insights         = true
    enable_encryption       = true
    
    sampling_rules = [
      {
        rule_name      = "CandlefishAPITracing"
        priority       = 9000
        fixed_rate     = 0.1
        reservoir_size = 1
        service_name   = "candlefish-api"
        service_type   = "*"
        host           = "*"
        http_method    = "*"
        url_path       = "/api/*"
        version        = 1
      }
    ]
  }
}

# ============================================
# Custom Metrics Configuration
# ============================================
variable "custom_metrics" {
  description = "Custom CloudWatch metrics configuration"
  type = map(object({
    namespace   = string
    metric_name = string
    dimensions  = map(string)
    unit        = string
    value       = number
    
    # Alarms for custom metrics
    create_alarm = bool
    alarm_config = optional(object({
      threshold          = number
      comparison_operator = string
      evaluation_periods = number
      period            = number
      statistic         = string
    }))
  }))
  
  default = {
    operational_health = {
      namespace   = "Candlefish/Operations"
      metric_name = "SystemHealth"
      dimensions = {
        Environment = "production"
        Component   = "operational-atelier"
      }
      unit         = "Count"
      value        = 1
      create_alarm = false
    }
    
    animation_performance = {
      namespace   = "Candlefish/Animation"
      metric_name = "FrameRate"
      dimensions = {
        Environment = "production"
        Component   = "webgl-renderer"
      }
      unit         = "Count/Second"
      value        = 60
      create_alarm = true
      alarm_config = {
        threshold          = 30
        comparison_operator = "LessThanThreshold"
        evaluation_periods = 3
        period            = 300
        statistic         = "Average"
      }
    }
    
    websocket_connections = {
      namespace   = "Candlefish/WebSocket"
      metric_name = "ActiveConnections"
      dimensions = {
        Environment = "production"
        Component   = "realtime-api"
      }
      unit         = "Count"
      value        = 0
      create_alarm = true
      alarm_config = {
        threshold          = 1000
        comparison_operator = "GreaterThanThreshold"
        evaluation_periods = 2
        period            = 300
        statistic         = "Maximum"
      }
    }
  }
}

# ============================================
# Cost Monitoring Configuration
# ============================================
variable "cost_monitoring" {
  description = "Cost monitoring and budgets configuration"
  type = object({
    enable_budgets = bool
    
    budgets = map(object({
      budget_type    = string
      limit_amount   = number
      limit_unit     = string
      time_unit      = string
      time_period_start = string
      
      cost_filters = optional(map(list(string)), {})
      
      notifications = list(object({
        comparison_operator        = string
        threshold                 = number
        threshold_type            = string
        notification_type         = string
        subscriber_email_addresses = list(string)
        subscriber_sns_topic_arns  = list(string)
      }))
    }))
  })
  
  default = {
    enable_budgets = true
    
    budgets = {
      monthly_budget = {
        budget_type    = "COST"
        limit_amount   = 500
        limit_unit     = "USD"
        time_unit      = "MONTHLY"
        time_period_start = "2024-01-01_00:00"
        
        notifications = [
          {
            comparison_operator = "GREATER_THAN"
            threshold          = 80
            threshold_type     = "PERCENTAGE"
            notification_type  = "ACTUAL"
            subscriber_email_addresses = []
            subscriber_sns_topic_arns  = []
          },
          {
            comparison_operator = "GREATER_THAN"
            threshold          = 100
            threshold_type     = "PERCENTAGE"
            notification_type  = "FORECASTED"
            subscriber_email_addresses = []
            subscriber_sns_topic_arns  = []
          }
        ]
      }
    }
  }
}

# ============================================
# Legacy Configuration (Backward Compatibility)
# ============================================
variable "cluster_name" {
  description = "ECS/EKS cluster name (legacy compatibility)"
  type        = string
  default     = ""
}

variable "alb_arn_suffix" {
  description = "Application Load Balancer ARN suffix (legacy compatibility)"
  type        = string
  default     = ""
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for alerts (legacy - use notification_config instead)"
  type        = string
  default     = null
  sensitive   = true
}

variable "alert_email_addresses" {
  description = "List of email addresses for alert notifications (legacy - use notification_config instead)"
  type        = list(string)
  default     = []
}

variable "grafana_admin_password" {
  description = "Admin password for Grafana (legacy - not used in enhanced version)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "grafana_domain" {
  description = "Domain name for Grafana (legacy - not used in enhanced version)"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}