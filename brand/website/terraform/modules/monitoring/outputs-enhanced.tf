# Enhanced Monitoring Module Outputs
# Comprehensive outputs for CloudWatch, X-Ray, SNS, and monitoring infrastructure

# ============================================
# CloudWatch Log Groups Outputs
# ============================================
output "log_group_names" {
  description = "Map of CloudWatch log group names"
  value       = { for k, v in aws_cloudwatch_log_group.main : k => v.name }
}

output "log_group_arns" {
  description = "Map of CloudWatch log group ARNs"
  value       = { for k, v in aws_cloudwatch_log_group.main : k => v.arn }
}

output "log_group_retention_days" {
  description = "Map of log group retention periods"
  value       = { for k, v in aws_cloudwatch_log_group.main : k => v.retention_in_days }
}

# ============================================
# SNS Topics Outputs
# ============================================
output "sns_topic_arns" {
  description = "Map of SNS topic ARNs"
  value       = { for k, v in aws_sns_topic.main : k => v.arn }
}

output "sns_topic_names" {
  description = "Map of SNS topic names"
  value       = { for k, v in aws_sns_topic.main : k => v.name }
}

output "sns_topic_ids" {
  description = "Map of SNS topic IDs"
  value       = { for k, v in aws_sns_topic.main : k => v.id }
}

# ============================================
# CloudWatch Alarms Outputs
# ============================================
output "alarm_names" {
  description = "Map of CloudWatch alarm names"
  value       = { for k, v in aws_cloudwatch_metric_alarm.main : k => v.alarm_name }
}

output "alarm_arns" {
  description = "Map of CloudWatch alarm ARNs"
  value       = { for k, v in aws_cloudwatch_metric_alarm.main : k => v.arn }
}

output "custom_alarm_names" {
  description = "Map of custom metric alarm names"
  value       = { for k, v in aws_cloudwatch_metric_alarm.custom : k => v.alarm_name }
}

output "custom_alarm_arns" {
  description = "Map of custom metric alarm ARNs"
  value       = { for k, v in aws_cloudwatch_metric_alarm.custom : k => v.arn }
}

# ============================================
# Dashboard Outputs
# ============================================
output "dashboard_names" {
  description = "Map of CloudWatch dashboard names"
  value       = { for k, v in aws_cloudwatch_dashboard.main : k => v.dashboard_name }
}

output "dashboard_arns" {
  description = "Map of CloudWatch dashboard ARNs"
  value       = { for k, v in aws_cloudwatch_dashboard.main : k => v.dashboard_arn }
}

output "dashboard_urls" {
  description = "Map of CloudWatch dashboard URLs"
  value = { for k, v in aws_cloudwatch_dashboard.main : k => 
    "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${v.dashboard_name}"
  }
}

# ============================================
# X-Ray Outputs
# ============================================
output "xray_encryption_config" {
  description = "X-Ray encryption configuration"
  value = var.xray_config.enable_tracing && var.xray_config.enable_encryption ? {
    type   = aws_xray_encryption_config.main[0].type
    key_id = aws_xray_encryption_config.main[0].key_id
  } : null
}

output "xray_sampling_rules" {
  description = "Map of X-Ray sampling rule names"
  value       = { for k, v in aws_xray_sampling_rule.main : k => v.rule_name }
}

output "xray_service_map_url" {
  description = "URL to X-Ray service map"
  value = var.xray_config.enable_tracing ? 
    "https://${var.aws_region}.console.aws.amazon.com/xray/home?region=${var.aws_region}#/service-map" : 
    null
}

# ============================================
# Cost Monitoring Outputs
# ============================================
output "budget_names" {
  description = "Map of AWS budget names"
  value       = { for k, v in aws_budgets_budget.main : k => v.name }
}

output "budget_arns" {
  description = "Map of AWS budget ARNs"
  value       = { for k, v in aws_budgets_budget.main : k => v.arn }
}

# ============================================
# Synthetics Canary Outputs
# ============================================
output "canary_name" {
  description = "CloudWatch Synthetics canary name"
  value       = var.environment == "production" ? aws_synthetics_canary.operational_health[0].name : null
}

output "canary_arn" {
  description = "CloudWatch Synthetics canary ARN"
  value       = var.environment == "production" ? aws_synthetics_canary.operational_health[0].arn : null
}

output "canary_id" {
  description = "CloudWatch Synthetics canary ID"
  value       = var.environment == "production" ? aws_synthetics_canary.operational_health[0].id : null
}

output "canary_source_location" {
  description = "CloudWatch Synthetics canary source location"
  value       = var.environment == "production" ? aws_synthetics_canary.operational_health[0].artifact_s3_location : null
}

# ============================================
# Application Insights Outputs
# ============================================
output "application_insights_id" {
  description = "Application Insights application ID"
  value       = var.environment == "production" ? aws_applicationinsights_application.main[0].id : null
}

output "application_insights_arn" {
  description = "Application Insights application ARN"
  value       = var.environment == "production" ? aws_applicationinsights_application.main[0].arn : null
}

output "resource_group_name" {
  description = "Resource group name for Application Insights"
  value       = var.environment == "production" ? aws_resourcegroups_group.main[0].name : null
}

output "resource_group_arn" {
  description = "Resource group ARN for Application Insights"
  value       = var.environment == "production" ? aws_resourcegroups_group.main[0].arn : null
}

# ============================================
# Integration Data
# ============================================
output "integration_data" {
  description = "Data for integration with other modules"
  value = {
    environment    = var.environment
    project_name   = var.project_name
    aws_region     = var.aws_region
    
    # SNS topics for alerting
    alert_topics = var.notification_config.create_topics ? {
      for k, v in aws_sns_topic.main : k => {
        arn  = v.arn
        name = v.name
      }
    } : {}
    
    # Log groups for application logging
    log_groups = {
      for k, v in aws_cloudwatch_log_group.main : k => {
        name = v.name
        arn  = v.arn
      }
    }
    
    # Alarms for integration with auto-scaling
    alarms = {
      for k, v in aws_cloudwatch_metric_alarm.main : k => {
        name = v.alarm_name
        arn  = v.arn
      }
    }
    
    # X-Ray configuration
    xray = {
      enabled           = var.xray_config.enable_tracing
      encryption_enabled = var.xray_config.enable_encryption
      sampling_rate     = var.xray_config.sampling_rate
    }
  }
}

# ============================================
# Monitoring Configuration Summary
# ============================================
output "monitoring_configuration" {
  description = "Complete monitoring configuration summary"
  value = {
    log_groups = {
      count              = length(aws_cloudwatch_log_group.main)
      retention_days     = var.cloudwatch_config.log_retention_days
      metric_filters     = var.cloudwatch_config.create_metric_filters
      cross_region_replication = var.cloudwatch_config.enable_cross_region_replication
    }
    
    alerting = {
      sns_topics_count     = length(aws_sns_topic.main)
      alarms_count         = length(aws_cloudwatch_metric_alarm.main)
      custom_alarms_count  = length(aws_cloudwatch_metric_alarm.custom)
      email_subscribers    = length(local.alert_email_addresses)
    }
    
    dashboards = {
      count     = length(aws_cloudwatch_dashboard.main)
      available = [for k, v in aws_cloudwatch_dashboard.main : k]
    }
    
    tracing = {
      xray_enabled         = var.xray_config.enable_tracing
      sampling_rules_count = length(aws_xray_sampling_rule.main)
      encryption_enabled   = var.xray_config.enable_encryption
      insights_enabled     = var.xray_config.enable_insights
    }
    
    synthetic_monitoring = {
      canary_enabled = var.environment == "production"
      canary_frequency = var.environment == "production" ? "5 minutes" : "disabled"
    }
    
    cost_monitoring = {
      budgets_enabled = var.cost_monitoring.enable_budgets
      budgets_count   = length(aws_budgets_budget.main)
    }
    
    application_insights = {
      enabled = var.environment == "production"
      auto_config = var.environment == "production"
    }
  }
}

# ============================================
# Cost Optimization Summary
# ============================================
output "cost_optimization_summary" {
  description = "Cost optimization configuration summary"
  value = {
    log_retention = {
      strategy = "Tiered retention based on environment and log type"
      production_retention = "${var.cloudwatch_config.log_retention_days} days"
      development_retention = "${var.cloudwatch_config.log_retention_days} days"
    }
    
    estimated_monthly_costs = {
      log_ingestion = "$${length(aws_cloudwatch_log_group.main) * 10}-50 (varies by volume)"
      log_storage = "$${length(aws_cloudwatch_log_group.main) * 0.50}/GB/month"
      dashboards = "$${length(aws_cloudwatch_dashboard.main) * 3}/month"
      alarms = "$${(length(aws_cloudwatch_metric_alarm.main) + length(aws_cloudwatch_metric_alarm.custom)) * 0.10}/month"
      synthetics = var.environment == "production" ? "$0.0012 per canary run" : "$0"
      xray_traces = var.xray_config.enable_tracing ? "$5.00 per 1M traces" : "$0"
    }
    
    cost_controls = {
      log_retention_lifecycle = "Automated based on environment"
      metric_filters = var.cloudwatch_config.create_metric_filters ? "Enabled for error tracking" : "Disabled"
      detailed_monitoring = var.cloudwatch_config.enable_detailed_monitoring ? "Enabled" : "Basic monitoring only"
      x_ray_sampling = var.xray_config.enable_tracing ? "${var.xray_config.sampling_rate * 100}% sampling rate" : "Disabled"
    }
  }
}

# ============================================
# Performance Metrics
# ============================================
output "performance_monitoring" {
  description = "Performance monitoring capabilities"
  value = {
    metrics_available = {
      application_metrics = var.cloudwatch_config.enable_detailed_monitoring
      container_insights = var.cloudwatch_config.enable_container_insights
      custom_metrics = length(var.custom_metrics) > 0
      x_ray_tracing = var.xray_config.enable_tracing
    }
    
    real_time_monitoring = {
      log_streaming = var.cloudwatch_config.create_log_groups
      metric_streaming = true
      alarm_notifications = var.notification_config.create_topics
      dashboard_refresh = "1 minute intervals"
    }
    
    synthetic_testing = {
      uptime_monitoring = var.environment == "production"
      performance_testing = var.environment == "production"
      api_health_checks = var.environment == "production"
      mobile_testing = var.environment == "production"
    }
    
    troubleshooting = {
      x_ray_traces = var.xray_config.enable_tracing
      log_insights = var.cloudwatch_config.create_log_groups
      application_map = var.xray_config.create_service_map
      correlation_ids = var.xray_config.enable_tracing
    }
  }
}

# ============================================
# Legacy Compatibility Outputs
# ============================================
output "cloudwatch_log_group_name" {
  description = "Primary CloudWatch log group name (legacy compatibility)"
  value       = try(aws_cloudwatch_log_group.main["application"].name, null)
}

output "cloudwatch_log_group_arn" {
  description = "Primary CloudWatch log group ARN (legacy compatibility)"
  value       = try(aws_cloudwatch_log_group.main["application"].arn, null)
}

output "prometheus_endpoint" {
  description = "Prometheus endpoint (legacy - not used in enhanced monitoring)"
  value       = null
}

output "grafana_url" {
  description = "Grafana URL (legacy - not used in enhanced monitoring)"
  value       = null
}

# ============================================
# Monitoring Endpoints
# ============================================
output "monitoring_endpoints" {
  description = "Monitoring service endpoints and URLs"
  value = {
    cloudwatch_console = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}"
    xray_console = var.xray_config.enable_tracing ? "https://${var.aws_region}.console.aws.amazon.com/xray/home?region=${var.aws_region}" : null
    
    dashboards = { for k, v in aws_cloudwatch_dashboard.main : k =>
      "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${v.dashboard_name}"
    }
    
    log_groups = { for k, v in aws_cloudwatch_log_group.main : k =>
      "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#logsV2:log-groups/log-group/${replace(v.name, "/", "$252F")}"
    }
    
    synthetics_console = var.environment == "production" ? 
      "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#synthetics:canaries" : null
    
    cost_explorer = var.cost_monitoring.enable_budgets ?
      "https://console.aws.amazon.com/billing/home#/budgets" : null
  }
}