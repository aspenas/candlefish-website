# Compute Module Outputs
# Comprehensive outputs for ECS, Lambda, and Load Balancer resources

# ============================================
# ECS Cluster Outputs
# ============================================
output "cluster_id" {
  description = "ECS cluster ID"
  value       = aws_ecs_cluster.main.id
}

output "cluster_arn" {
  description = "ECS cluster ARN"
  value       = aws_ecs_cluster.main.arn
}

output "cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

# ============================================
# ECS Services Outputs
# ============================================
output "service_arns" {
  description = "ARNs of ECS services"
  value       = { for k, v in aws_ecs_service.main : k => v.id }
}

output "service_names" {
  description = "Names of ECS services"
  value       = { for k, v in aws_ecs_service.main : k => v.name }
}

output "task_definition_arns" {
  description = "ARNs of ECS task definitions"
  value       = { for k, v in aws_ecs_task_definition.service : k => v.arn }
}

output "task_definition_revisions" {
  description = "Revisions of ECS task definitions"
  value       = { for k, v in aws_ecs_task_definition.service : k => v.revision }
}

# ============================================
# Load Balancer Outputs
# ============================================
output "load_balancer_arn" {
  description = "ARN of the Application Load Balancer"
  value       = aws_lb.main.arn
}

output "load_balancer_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "load_balancer_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = aws_lb.main.zone_id
}

output "load_balancer_url" {
  description = "URL of the Application Load Balancer"
  value       = "https://${aws_lb.main.dns_name}"
}

output "target_group_arns" {
  description = "ARNs of target groups"
  value       = { for k, v in aws_lb_target_group.service : k => v.arn }
}

output "listener_arns" {
  description = "ARNs of load balancer listeners"
  value = {
    http  = aws_lb_listener.http.arn
    https = var.load_balancer_config.ssl_certificate_arn != null ? aws_lb_listener.https[0].arn : null
  }
}

# ============================================
# Lambda Function Outputs
# ============================================
output "lambda_function_arns" {
  description = "ARNs of Lambda functions"
  value       = { for k, v in aws_lambda_function.main : k => v.arn }
}

output "lambda_function_names" {
  description = "Names of Lambda functions"
  value       = { for k, v in aws_lambda_function.main : k => v.function_name }
}

output "lambda_function_invoke_arns" {
  description = "Invoke ARNs of Lambda functions"
  value       = { for k, v in aws_lambda_function.main : k => v.invoke_arn }
}

output "lambda_function_qualified_arns" {
  description = "Qualified ARNs of Lambda functions"
  value       = { for k, v in aws_lambda_function.main : k => v.qualified_arn }
}

# ============================================
# Security Group Outputs
# ============================================
output "security_group_ids" {
  description = "Security group IDs"
  value = {
    alb         = aws_security_group.alb.id
    ecs_service = aws_security_group.ecs_service.id
  }
}

output "security_group_arns" {
  description = "Security group ARNs"
  value = {
    alb         = aws_security_group.alb.arn
    ecs_service = aws_security_group.ecs_service.arn
  }
}

# ============================================
# IAM Role Outputs
# ============================================
output "iam_role_arns" {
  description = "ARNs of IAM roles"
  value = {
    ecs_task_execution = aws_iam_role.ecs_task_execution_role.arn
    ecs_task_role     = aws_iam_role.ecs_task_role.arn
    lambda_execution  = length(var.lambda_functions) > 0 ? aws_iam_role.lambda_execution_role[0].arn : null
  }
}

# ============================================
# Auto Scaling Outputs
# ============================================
output "autoscaling_target_arns" {
  description = "ARNs of auto scaling targets"
  value       = { for k, v in aws_appautoscaling_target.ecs_service : k => v.arn }
}

output "autoscaling_policy_arns" {
  description = "ARNs of auto scaling policies"
  value = {
    cpu_policies    = { for k, v in aws_appautoscaling_policy.ecs_service_cpu : k => v.arn }
    memory_policies = { for k, v in aws_appautoscaling_policy.ecs_service_memory : k => v.arn }
  }
}

# ============================================
# CloudWatch Log Groups
# ============================================
output "log_group_arns" {
  description = "ARNs of CloudWatch Log Groups"
  value = {
    ecs_services = { for k, v in aws_cloudwatch_log_group.ecs_service : k => v.arn }
    lambda_functions = { for k, v in aws_cloudwatch_log_group.lambda : k => v.arn }
    ecs_exec = aws_cloudwatch_log_group.ecs_exec.arn
  }
}

output "log_group_names" {
  description = "Names of CloudWatch Log Groups"
  value = {
    ecs_services = { for k, v in aws_cloudwatch_log_group.ecs_service : k => v.name }
    lambda_functions = { for k, v in aws_cloudwatch_log_group.lambda : k => v.name }
    ecs_exec = aws_cloudwatch_log_group.ecs_exec.name
  }
}

# ============================================
# Monitoring and Alarms
# ============================================
output "cloudwatch_alarm_arns" {
  description = "ARNs of CloudWatch alarms"
  value = {
    cpu_alarms    = { for k, v in aws_cloudwatch_metric_alarm.ecs_service_cpu_high : k => v.arn }
    memory_alarms = { for k, v in aws_cloudwatch_metric_alarm.ecs_service_memory_high : k => v.arn }
  }
}

# ============================================
# Cost Optimization Summary
# ============================================
output "cost_optimization_summary" {
  description = "Cost optimization configuration summary"
  value = {
    spot_instances_enabled = var.enable_spot_instances
    spot_allocation_percentage = var.spot_allocation_percentage
    fargate_spot_services = length([for k, v in var.services : k if v.use_spot_instances])
    total_services = length(var.services)
    lambda_functions_count = length(var.lambda_functions)
    estimated_monthly_savings = "${var.enable_spot_instances ? 30 : 0}-50%"
  }
}

# ============================================
# Performance Metrics
# ============================================
output "performance_configuration" {
  description = "Performance configuration summary"
  value = {
    total_cpu_units = sum([for k, v in var.services : v.cpu])
    total_memory_mb = sum([for k, v in var.services : v.memory])
    autoscaling_enabled = length(var.services) > 0
    container_insights_enabled = var.enable_container_insights
    execute_command_enabled = var.enable_execute_command
    deployment_circuit_breaker = true
  }
}

# ============================================
# Service URLs and Endpoints
# ============================================
output "service_endpoints" {
  description = "Service endpoint URLs"
  value = {
    for k, v in var.services : k => v.enable_load_balancer ? (
      v.domain_name != null ? 
        "https://${v.domain_name}" : 
        "https://${aws_lb.main.dns_name}"
    ) : null
  }
}

# ============================================
# Integration Points
# ============================================
output "integration_data" {
  description = "Integration data for other modules"
  value = {
    vpc_id = var.vpc_id
    cluster_name = aws_ecs_cluster.main.name
    load_balancer_dns = aws_lb.main.dns_name
    security_groups = {
      alb = aws_security_group.alb.id
      ecs = aws_security_group.ecs_service.id
    }
    subnet_configuration = {
      private_subnets = var.private_subnet_ids
      public_subnets = var.public_subnet_ids
    }
    iam_roles = {
      ecs_task_execution = aws_iam_role.ecs_task_execution_role.name
      ecs_task_role = aws_iam_role.ecs_task_role.name
    }
  }
}

# ============================================
# Deployment Information
# ============================================
output "deployment_info" {
  description = "Deployment configuration information"
  value = {
    environment = var.environment
    cluster_capacity_providers = var.cluster_capacity_providers
    services_configuration = {
      for k, v in var.services : k => {
        image = v.image
        cpu = v.cpu
        memory = v.memory
        min_capacity = v.min_capacity
        max_capacity = v.max_capacity
        spot_enabled = v.use_spot_instances
        load_balancer_enabled = v.enable_load_balancer
      }
    }
  }
}