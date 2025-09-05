# Compute Module - ECS Fargate, Lambda, Auto Scaling
# Optimized for Candlefish.ai operational atelier

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# ============================================
# ECS Cluster
# ============================================
resource "aws_ecs_cluster" "main" {
  name = coalesce(var.cluster_name, "${var.project_name}-${var.environment}")

  setting {
    name  = "containerInsights"
    value = var.enable_container_insights ? "enabled" : "disabled"
  }

  configuration {
    execute_command_configuration {
      logging = "OVERRIDE"

      log_configuration {
        cloud_watch_encryption_enabled = true
        cloud_watch_log_group_name     = aws_cloudwatch_log_group.ecs_exec.name
      }
    }
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-cluster"
    Environment = var.environment
    Purpose     = "ECS Cluster"
  })
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = var.cluster_capacity_providers

  dynamic "default_capacity_provider_strategy" {
    for_each = var.default_capacity_provider_strategy
    content {
      capacity_provider = default_capacity_provider_strategy.value.capacity_provider
      weight           = default_capacity_provider_strategy.value.weight
      base            = default_capacity_provider_strategy.value.base
    }
  }
}

# CloudWatch Log Group for ECS Exec
resource "aws_cloudwatch_log_group" "ecs_exec" {
  name              = "/aws/ecs/${var.project_name}-${var.environment}/exec"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

# ============================================
# Security Groups
# ============================================
resource "aws_security_group" "alb" {
  name_prefix = "${var.project_name}-${var.environment}-alb"
  vpc_id      = var.vpc_id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = var.allow_inbound_cidr_blocks
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = var.allow_inbound_cidr_blocks
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-alb-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group" "ecs_service" {
  name_prefix = "${var.project_name}-${var.environment}-ecs"
  vpc_id      = var.vpc_id

  ingress {
    description     = "From ALB"
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Allow communication between ECS services
  ingress {
    description = "Inter-service communication"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    self        = true
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-ecs-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# ============================================
# Application Load Balancer
# ============================================
resource "aws_lb" "main" {
  name               = "${var.project_name}-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets           = var.public_subnet_ids

  enable_deletion_protection       = var.load_balancer_config.enable_deletion_protection
  idle_timeout                    = var.load_balancer_config.idle_timeout
  enable_cross_zone_load_balancing = var.load_balancer_config.enable_cross_zone_load_balancing

  dynamic "access_logs" {
    for_each = var.load_balancer_config.access_logs_bucket != null ? [1] : []
    content {
      bucket  = var.load_balancer_config.access_logs_bucket
      prefix  = "${var.project_name}-${var.environment}-alb"
      enabled = true
    }
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-alb"
    Environment = var.environment
    Purpose     = "Application Load Balancer"
  })
}

# Default target group (catch-all)
resource "aws_lb_target_group" "default" {
  name     = "${var.project_name}-${var.environment}-default"
  port     = 80
  protocol = "HTTP"
  vpc_id   = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = "/"
    matcher             = "200,404"
    port                = "traffic-port"
    protocol            = "HTTP"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-default-tg"
  })
}

# Default HTTP listener
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# HTTPS listener (if certificate provided)
resource "aws_lb_listener" "https" {
  count             = var.load_balancer_config.ssl_certificate_arn != null ? 1 : 0
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = var.load_balancer_config.ssl_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.default.arn
  }
}

# ============================================
# ECS Services
# ============================================
locals {
  services_with_lb = { for k, v in var.services : k => v if v.enable_load_balancer }
}

# IAM Role for ECS Task Execution
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "${var.project_name}-${var.environment}-ecs-task-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Additional IAM permissions for Secrets Manager and parameter store
resource "aws_iam_role_policy" "ecs_task_execution_secrets" {
  name = "${var.project_name}-${var.environment}-ecs-task-execution-secrets"
  role = aws_iam_role.ecs_task_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "ssm:GetParameters",
          "ssm:GetParameter",
          "ssm:GetParametersByPath",
          "kms:Decrypt"
        ]
        Resource = "*"
      }
    ]
  })
}

# IAM Role for ECS Tasks
resource "aws_iam_role" "ecs_task_role" {
  name = "${var.project_name}-${var.environment}-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

# ECS Task Role permissions for operational telemetry
resource "aws_iam_role_policy" "ecs_task_permissions" {
  name = "${var.project_name}-${var.environment}-ecs-task-permissions"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "secretsmanager:GetSecretValue",
          "ssm:GetParameter",
          "cloudwatch:PutMetricData",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      }
    ]
  })
}

# ECS Exec permissions
resource "aws_iam_role_policy" "ecs_exec_permissions" {
  count = var.enable_execute_command ? 1 : 0
  name  = "${var.project_name}-${var.environment}-ecs-exec"
  role  = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssmmessages:CreateControlChannel",
          "ssmmessages:CreateDataChannel",
          "ssmmessages:OpenControlChannel",
          "ssmmessages:OpenDataChannel"
        ]
        Resource = "*"
      }
    ]
  })
}

# Target Groups for each service
resource "aws_lb_target_group" "service" {
  for_each = local.services_with_lb

  name        = "${var.project_name}-${var.environment}-${each.key}"
  port        = each.value.port
  protocol    = upper(each.value.protocol)
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 10
    interval            = 30
    path                = each.value.health_check_path
    matcher             = "200"
    port                = "traffic-port"
    protocol            = upper(each.value.protocol)
  }

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-${each.key}-tg"
    Service = each.key
  })
}

# Listener Rules for each service
resource "aws_lb_listener_rule" "service" {
  for_each = local.services_with_lb

  listener_arn = var.load_balancer_config.ssl_certificate_arn != null ? aws_lb_listener.https[0].arn : aws_lb_listener.http.arn
  priority     = 100 + index(keys(local.services_with_lb), each.key)

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service[each.key].arn
  }

  condition {
    host_header {
      values = each.value.domain_name != null ? [each.value.domain_name] : ["${each.key}.${var.project_name}.local"]
    }
  }

  depends_on = [aws_lb_target_group.service]
}

# CloudWatch Log Groups for ECS services
resource "aws_cloudwatch_log_group" "ecs_service" {
  for_each = var.services

  name              = "/ecs/${var.project_name}-${var.environment}/${each.key}"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, {
    Service = each.key
  })
}

# ECS Task Definitions
resource "aws_ecs_task_definition" "service" {
  for_each = var.services

  family                   = "${var.project_name}-${var.environment}-${each.key}"
  requires_compatibilities = ["FARGATE"]
  network_mode            = "awsvpc"
  cpu                     = each.value.cpu
  memory                  = each.value.memory
  execution_role_arn      = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn           = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = each.key
      image = each.value.image
      
      portMappings = [
        {
          containerPort = each.value.port
          protocol      = each.value.protocol
        }
      ]

      environment = [
        for key, value in each.value.environment_variables : {
          name  = key
          value = value
        }
      ]

      secrets = [
        for key, value in each.value.secrets : {
          name      = key
          valueFrom = value
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs_service[each.key].name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "ecs"
        }
      }

      essential = true

      # Health check
      healthCheck = {
        command = [
          "CMD-SHELL",
          "curl -f http://localhost:${each.value.port}${each.value.health_check_path} || exit 1"
        ]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = merge(var.tags, {
    Service = each.key
  })
}

# ECS Services
resource "aws_ecs_service" "main" {
  for_each = var.services

  name            = "${var.project_name}-${var.environment}-${each.key}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.service[each.key].arn
  desired_count   = each.value.min_capacity

  # Capacity provider strategy for cost optimization
  capacity_provider_strategy {
    capacity_provider = each.value.use_spot_instances ? "FARGATE_SPOT" : "FARGATE"
    weight           = each.value.use_spot_instances ? each.value.spot_allocation : 100
    base            = each.value.use_spot_instances ? 0 : 1
  }

  dynamic "capacity_provider_strategy" {
    for_each = each.value.use_spot_instances ? [1] : []
    content {
      capacity_provider = "FARGATE"
      weight           = 100 - each.value.spot_allocation
      base            = 1
    }
  }

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = concat([aws_security_group.ecs_service.id], var.additional_security_group_ids)
    assign_public_ip = false
  }

  # Load balancer configuration
  dynamic "load_balancer" {
    for_each = each.value.enable_load_balancer ? [1] : []
    content {
      target_group_arn = aws_lb_target_group.service[each.key].arn
      container_name   = each.key
      container_port   = each.value.port
    }
  }

  deployment_configuration {
    maximum_percent         = each.value.deployment_maximum_percent
    minimum_healthy_percent = each.value.deployment_minimum_healthy_percent
    deployment_circuit_breaker {
      enable   = true
      rollback = true
    }
  }

  # Enable ECS Exec for debugging
  enable_execute_command = var.enable_execute_command

  tags = merge(var.tags, {
    Service = each.key
  })

  depends_on = [
    aws_lb_listener.http,
    aws_lb_listener.https
  ]

  lifecycle {
    ignore_changes = [desired_count]
  }
}

# ============================================
# Auto Scaling
# ============================================
resource "aws_appautoscaling_target" "ecs_service" {
  for_each = var.services

  max_capacity       = each.value.max_capacity
  min_capacity       = each.value.min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.main[each.key].name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"

  tags = merge(var.tags, {
    Service = each.key
  })
}

# CPU-based auto scaling
resource "aws_appautoscaling_policy" "ecs_service_cpu" {
  for_each = var.services

  name               = "${var.project_name}-${var.environment}-${each.key}-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_service[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_service[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_service[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }

    target_value       = each.value.target_cpu
    scale_in_cooldown  = var.auto_scaling_config.scale_down_cooldown
    scale_out_cooldown = var.auto_scaling_config.scale_up_cooldown
  }
}

# Memory-based auto scaling
resource "aws_appautoscaling_policy" "ecs_service_memory" {
  for_each = var.services

  name               = "${var.project_name}-${var.environment}-${each.key}-memory"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_service[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_service[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_service[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }

    target_value       = each.value.target_memory
    scale_in_cooldown  = var.auto_scaling_config.scale_down_cooldown
    scale_out_cooldown = var.auto_scaling_config.scale_up_cooldown
  }
}

# ============================================
# Lambda Functions
# ============================================
# IAM Role for Lambda Functions
resource "aws_iam_role" "lambda_execution_role" {
  count = length(var.lambda_functions) > 0 ? 1 : 0
  name  = "${var.project_name}-${var.environment}-lambda-execution"

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

resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  count      = length(var.lambda_functions) > 0 ? 1 : 0
  role       = aws_iam_role.lambda_execution_role[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_vpc_execution" {
  count      = length(var.lambda_functions) > 0 ? 1 : 0
  role       = aws_iam_role.lambda_execution_role[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# CloudWatch Log Groups for Lambda functions
resource "aws_cloudwatch_log_group" "lambda" {
  for_each = var.lambda_functions

  name              = "/aws/lambda/${each.value.function_name}"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, {
    Function = each.value.function_name
  })
}

# Lambda Functions
resource "aws_lambda_function" "main" {
  for_each = var.lambda_functions

  filename         = each.value.filename
  function_name    = "${var.project_name}-${var.environment}-${each.value.function_name}"
  role            = aws_iam_role.lambda_execution_role[0].arn
  handler         = each.value.handler
  source_code_hash = filebase64sha256(each.value.filename)
  runtime         = each.value.runtime
  timeout         = each.value.timeout
  memory_size     = each.value.memory_size

  environment {
    variables = merge(
      each.value.environment_variables,
      {
        ENVIRONMENT   = var.environment
        PROJECT_NAME  = var.project_name
      }
    )
  }

  dynamic "vpc_config" {
    for_each = each.value.vpc_config != null ? [each.value.vpc_config] : []
    content {
      subnet_ids         = vpc_config.value.subnet_ids
      security_group_ids = vpc_config.value.security_group_ids
    }
  }

  reserved_concurrent_executions = each.value.reserved_concurrent_executions

  tags = merge(var.tags, {
    Function = each.value.function_name
  })

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_cloudwatch_log_group.lambda
  ]
}

# Provisioned Concurrency
resource "aws_lambda_provisioned_concurrency_config" "main" {
  for_each = { for k, v in var.lambda_functions : k => v if v.provisioned_concurrency > 0 }

  function_name                     = aws_lambda_function.main[each.key].function_name
  provisioned_concurrent_executions = each.value.provisioned_concurrency
  qualifier                         = aws_lambda_function.main[each.key].version
}

# ============================================
# CloudWatch Alarms for Monitoring
# ============================================
resource "aws_cloudwatch_metric_alarm" "ecs_service_cpu_high" {
  for_each = var.services

  alarm_name          = "${var.project_name}-${var.environment}-${each.key}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ECS service CPU utilization"
  alarm_actions       = []

  dimensions = {
    ServiceName = aws_ecs_service.main[each.key].name
    ClusterName = aws_ecs_cluster.main.name
  }

  tags = merge(var.tags, {
    Service = each.key
  })
}

resource "aws_cloudwatch_metric_alarm" "ecs_service_memory_high" {
  for_each = var.services

  alarm_name          = "${var.project_name}-${var.environment}-${each.key}-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "This metric monitors ECS service memory utilization"
  alarm_actions       = []

  dimensions = {
    ServiceName = aws_ecs_service.main[each.key].name
    ClusterName = aws_ecs_cluster.main.name
  }

  tags = merge(var.tags, {
    Service = each.key
  })
}