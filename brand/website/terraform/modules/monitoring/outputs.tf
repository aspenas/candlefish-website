# Outputs for Monitoring Module

output "cloudwatch_log_groups" {
  description = "CloudWatch log group names"
  value = {
    application  = aws_cloudwatch_log_group.application_logs.name
    animation    = aws_cloudwatch_log_group.animation_logs.name
    performance  = aws_cloudwatch_log_group.performance_logs.name
  }
}

output "sns_topic_arn" {
  description = "SNS topic ARN for alerts"
  value       = aws_sns_topic.alerts.arn
}

output "cloudwatch_dashboard_url" {
  description = "URL to the CloudWatch dashboard"
  value       = "https://console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.candlefish_animation.dashboard_name}"
}

output "prometheus_endpoint" {
  description = "Prometheus server endpoint"
  value       = "http://prometheus-stack-kube-prom-prometheus.monitoring.svc.cluster.local:9090"
}

output "grafana_service_name" {
  description = "Grafana service name in Kubernetes"
  value       = "prometheus-stack-grafana.monitoring.svc.cluster.local"
}

output "jaeger_query_endpoint" {
  description = "Jaeger query service endpoint"
  value       = "http://jaeger-query.monitoring.svc.cluster.local:16686"
}

output "elasticsearch_endpoint" {
  description = "Elasticsearch endpoint for Jaeger"
  value       = aws_elasticsearch_domain.jaeger.endpoint
}

output "kms_key_id" {
  description = "KMS key ID for log encryption"
  value       = aws_kms_key.logs.key_id
}