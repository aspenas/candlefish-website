# Auto Scaling Configuration for ECS Services

# Auto Scaling Targets for each service
resource "aws_appautoscaling_target" "ecs_services" {
  for_each = local.services

  max_capacity       = each.value.max_capacity
  min_capacity       = each.value.min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.services[each.key].name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"

  depends_on = [aws_ecs_service.services]
}

# CPU-based Auto Scaling Policy
resource "aws_appautoscaling_policy" "ecs_cpu" {
  for_each = local.services

  name               = "${local.name_prefix}-${each.value.name}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_services[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_services[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_services[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }

    target_value       = var.autoscaling_target_cpu
    scale_in_cooldown  = var.autoscaling_scale_in_cooldown
    scale_out_cooldown = var.autoscaling_scale_out_cooldown
  }
}

# Memory-based Auto Scaling Policy
resource "aws_appautoscaling_policy" "ecs_memory" {
  for_each = local.services

  name               = "${local.name_prefix}-${each.value.name}-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_services[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_services[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_services[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }

    target_value       = var.autoscaling_target_memory
    scale_in_cooldown  = var.autoscaling_scale_in_cooldown
    scale_out_cooldown = var.autoscaling_scale_out_cooldown
  }
}

# Request Count based Auto Scaling Policy
resource "aws_appautoscaling_policy" "ecs_requests" {
  for_each = local.services

  name               = "${local.name_prefix}-${each.value.name}-request-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_services[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_services[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_services[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label        = "${aws_lb.main.arn_suffix}/${aws_lb_target_group.services[each.key].arn_suffix}"
    }

    target_value       = var.autoscaling_target_requests
    scale_in_cooldown  = var.autoscaling_scale_in_cooldown
    scale_out_cooldown = var.autoscaling_scale_out_cooldown
  }
}

# Scheduled Scaling for predictable traffic patterns
resource "aws_appautoscaling_scheduled_action" "scale_up_morning" {
  for_each = var.enable_scheduled_scaling ? local.services : {}

  name               = "${local.name_prefix}-${each.value.name}-scale-up-morning"
  service_namespace  = aws_appautoscaling_target.ecs_services[each.key].service_namespace
  resource_id        = aws_appautoscaling_target.ecs_services[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_services[each.key].scalable_dimension

  schedule = "cron(0 6 * * MON-FRI *)"  # 6 AM UTC on weekdays

  scalable_target_action {
    min_capacity = each.value.min_capacity * 2
    max_capacity = each.value.max_capacity
  }
}

resource "aws_appautoscaling_scheduled_action" "scale_down_evening" {
  for_each = var.enable_scheduled_scaling ? local.services : {}

  name               = "${local.name_prefix}-${each.value.name}-scale-down-evening"
  service_namespace  = aws_appautoscaling_target.ecs_services[each.key].service_namespace
  resource_id        = aws_appautoscaling_target.ecs_services[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_services[each.key].scalable_dimension

  schedule = "cron(0 22 * * * *)"  # 10 PM UTC daily

  scalable_target_action {
    min_capacity = each.value.min_capacity
    max_capacity = each.value.max_capacity
  }
}

# RDS Auto Scaling (for read replicas in production)
resource "aws_appautoscaling_target" "rds_read_replicas" {
  count = var.environment == "production" && var.enable_rds_autoscaling ? 1 : 0

  max_capacity       = var.rds_max_read_replicas
  min_capacity       = var.rds_min_read_replicas
  resource_id        = "cluster:${aws_db_instance.postgres.id}"
  scalable_dimension = "rds:cluster:ReadReplicaCount"
  service_namespace  = "rds"
}

resource "aws_appautoscaling_policy" "rds_cpu" {
  count = var.environment == "production" && var.enable_rds_autoscaling ? 1 : 0

  name               = "${local.name_prefix}-rds-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.rds_read_replicas[0].resource_id
  scalable_dimension = aws_appautoscaling_target.rds_read_replicas[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.rds_read_replicas[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "RDSReaderAverageCPUUtilization"
    }

    target_value = 70
  }
}

# Cost Optimization - Spot Instance Weighting
resource "aws_ecs_capacity_provider" "fargate_spot" {
  count = var.use_spot_instances ? 1 : 0

  name = "${local.name_prefix}-fargate-spot"

  auto_scaling_group_provider {
    auto_scaling_group_arn = aws_autoscaling_group.ecs_spot[0].arn

    managed_scaling {
      maximum_scaling_step_size = 10
      minimum_scaling_step_size = 1
      status                     = "ENABLED"
      target_capacity            = 80
    }

    managed_termination_protection = "ENABLED"
  }

  tags = local.common_tags
}

# Predictive Scaling Policy (for production)
resource "aws_autoscaling_policy" "predictive_scaling" {
  count = var.environment == "production" && var.enable_predictive_scaling ? 1 : 0

  name                   = "${local.name_prefix}-predictive-scaling"
  autoscaling_group_name = aws_autoscaling_group.ecs_spot[0].name
  policy_type            = "PredictiveScaling"

  predictive_scaling_configuration {
    metric_specification {
      target_value = 70

      predefined_load_metric_specification {
        predefined_metric_type = "ALBTargetGroupRequestCount"
        resource_label         = "${aws_lb.main.arn_suffix}/${aws_lb_target_group.services["main_api"].arn_suffix}"
      }

      predefined_scaling_metric_specification {
        predefined_metric_type = "ASGAverageCPUUtilization"
      }
    }

    mode                          = "ForecastAndScale"
    scheduling_buffer_time        = 120
    max_capacity_breach_behavior  = "IncreaseMaxCapacity"
    max_capacity_buffer           = 10
  }
}