# Enhanced Staging Infrastructure with Blue-Green Deployment
# This file extends main.tf with staging-specific configurations

# Blue-Green Deployment Infrastructure
resource "aws_lb" "paintbox_alb" {
  count = var.environment == "staging" ? 1 : 0

  name               = "paintbox-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets           = aws_subnet.public[*].id

  enable_deletion_protection = false
  enable_http2              = true
  drop_invalid_header_fields = true

  access_logs {
    bucket  = aws_s3_bucket.alb_logs[0].bucket
    prefix  = "alb-access-logs"
    enabled = true
  }

  tags = merge(local.common_tags, {
    Name = "paintbox-alb-${var.environment}"
  })
}

# ALB Security Group
resource "aws_security_group" "alb" {
  name        = "paintbox-alb-${var.environment}"
  description = "Security group for Application Load Balancer"
  vpc_id      = aws_vpc.paintbox.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "paintbox-alb-sg-${var.environment}"
  })
}

# S3 bucket for ALB logs
resource "aws_s3_bucket" "alb_logs" {
  count = var.environment == "staging" ? 1 : 0

  bucket        = "paintbox-alb-logs-${var.environment}-${random_id.alb_bucket_suffix[0].hex}"
  force_destroy = true

  tags = local.common_tags
}

resource "aws_s3_bucket_server_side_encryption_configuration" "alb_logs" {
  count = var.environment == "staging" ? 1 : 0

  bucket = aws_s3_bucket.alb_logs[0].id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.paintbox.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "alb_logs" {
  count = var.environment == "staging" ? 1 : 0

  bucket = aws_s3_bucket.alb_logs[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "random_id" "alb_bucket_suffix" {
  count = var.environment == "staging" ? 1 : 0

  byte_length = 8
}

# ECS Cluster for Blue-Green Deployment
resource "aws_ecs_cluster" "paintbox" {
  count = var.environment == "staging" ? 1 : 0

  name = "paintbox-${var.environment}"

  configuration {
    execute_command_configuration {
      kms_key_id = aws_kms_key.paintbox.arn
      logging    = "OVERRIDE"

      log_configuration {
        cloud_watch_encryption_enabled = true
        cloud_watch_log_group_name     = aws_cloudwatch_log_group.ecs_exec[0].name
      }
    }
  }

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = local.common_tags
}

# ECS Service for Blue Environment
resource "aws_ecs_service" "paintbox_blue" {
  count = var.environment == "staging" ? 1 : 0

  name            = "paintbox-blue-${var.environment}"
  cluster         = aws_ecs_cluster.paintbox[0].id
  task_definition = aws_ecs_task_definition.paintbox_blue[0].arn
  desired_count   = var.min_capacity

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100

    deployment_circuit_breaker {
      enable   = true
      rollback = true
    }
  }

  network_configuration {
    security_groups  = [aws_security_group.ecs_tasks.id]
    subnets         = aws_subnet.private[*].id
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.paintbox_blue[0].arn
    container_name   = "paintbox-app"
    container_port   = 3000
  }

  health_check_grace_period_seconds = 300

  depends_on = [aws_lb_listener.paintbox_blue[0]]

  tags = merge(local.common_tags, {
    Environment = "blue"
  })
}

# ECS Service for Green Environment
resource "aws_ecs_service" "paintbox_green" {
  count = var.environment == "staging" ? 1 : 0

  name            = "paintbox-green-${var.environment}"
  cluster         = aws_ecs_cluster.paintbox[0].id
  task_definition = aws_ecs_task_definition.paintbox_green[0].arn
  desired_count   = 0  # Start with 0, scale up during deployment

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100

    deployment_circuit_breaker {
      enable   = true
      rollback = true
    }
  }

  network_configuration {
    security_groups  = [aws_security_group.ecs_tasks.id]
    subnets         = aws_subnet.private[*].id
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.paintbox_green[0].arn
    container_name   = "paintbox-app"
    container_port   = 3000
  }

  health_check_grace_period_seconds = 300

  depends_on = [aws_lb_listener.paintbox_green[0]]

  tags = merge(local.common_tags, {
    Environment = "green"
  })
}

# ECS Task Definition for Blue Environment
resource "aws_ecs_task_definition" "paintbox_blue" {
  count = var.environment == "staging" ? 1 : 0

  family                   = "paintbox-blue-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn           = aws_iam_role.paintbox_app.arn

  container_definitions = jsonencode([
    {
      name  = "paintbox-app"
      image = "ghcr.io/candlefish-ai/paintbox-frontend:staging-latest"

      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "ENVIRONMENT"
          value = var.environment
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        }
      ]

      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = "${aws_secretsmanager_secret.paintbox_secrets.arn}:DATABASE_URL::"
        },
        {
          name      = "REDIS_URL"
          valueFrom = "${aws_secretsmanager_secret.paintbox_secrets.arn}:REDIS_URL::"
        },
        {
          name      = "SALESFORCE_CLIENT_ID"
          valueFrom = "${aws_secretsmanager_secret.paintbox_secrets.arn}:SALESFORCE_CLIENT_ID::"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.paintbox_app.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "blue"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = merge(local.common_tags, {
    Environment = "blue"
  })
}

# ECS Task Definition for Green Environment
resource "aws_ecs_task_definition" "paintbox_green" {
  count = var.environment == "staging" ? 1 : 0

  family                   = "paintbox-green-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn           = aws_iam_role.paintbox_app.arn

  container_definitions = jsonencode([
    {
      name  = "paintbox-app"
      image = "ghcr.io/candlefish-ai/paintbox-frontend:staging-latest"

      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "ENVIRONMENT"
          value = var.environment
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        }
      ]

      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = "${aws_secretsmanager_secret.paintbox_secrets.arn}:DATABASE_URL::"
        },
        {
          name      = "REDIS_URL"
          valueFrom = "${aws_secretsmanager_secret.paintbox_secrets.arn}:REDIS_URL::"
        },
        {
          name      = "SALESFORCE_CLIENT_ID"
          valueFrom = "${aws_secretsmanager_secret.paintbox_secrets.arn}:SALESFORCE_CLIENT_ID::"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.paintbox_app.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "green"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = merge(local.common_tags, {
    Environment = "green"
  })
}

# Security Group for ECS Tasks
resource "aws_security_group" "ecs_tasks" {
  name        = "paintbox-ecs-tasks-${var.environment}"
  description = "Security group for ECS tasks"
  vpc_id      = aws_vpc.paintbox.id

  ingress {
    description     = "HTTP from ALB"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "paintbox-ecs-tasks-sg-${var.environment}"
  })
}

# ECS Execution Role
resource "aws_iam_role" "ecs_execution" {
  name = "paintbox-ecs-execution-${var.environment}"

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

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name = "ecs-execution-secrets-policy"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = aws_secretsmanager_secret.paintbox_secrets.arn
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = aws_kms_key.paintbox.arn
      }
    ]
  })
}

# Target Groups for Blue-Green
resource "aws_lb_target_group" "paintbox_blue" {
  count = var.environment == "staging" ? 1 : 0

  name        = "paintbox-blue-${var.environment}"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.paintbox.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 10
    interval            = 30
    path                = "/api/health"
    matcher             = "200"
    port                = "traffic-port"
    protocol            = "HTTP"
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(local.common_tags, {
    Name        = "paintbox-blue-tg-${var.environment}"
    Environment = "blue"
  })
}

resource "aws_lb_target_group" "paintbox_green" {
  count = var.environment == "staging" ? 1 : 0

  name        = "paintbox-green-${var.environment}"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.paintbox.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 10
    interval            = 30
    path                = "/api/health"
    matcher             = "200"
    port                = "traffic-port"
    protocol            = "HTTP"
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(local.common_tags, {
    Name        = "paintbox-green-tg-${var.environment}"
    Environment = "green"
  })
}

# ALB Listeners
resource "aws_lb_listener" "paintbox_blue" {
  count = var.environment == "staging" ? 1 : 0

  load_balancer_arn = aws_lb.paintbox_alb[0].arn
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

  tags = local.common_tags
}

resource "aws_lb_listener" "paintbox_blue_https" {
  count = var.environment == "staging" ? 1 : 0

  load_balancer_arn = aws_lb.paintbox_alb[0].arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = var.create_certificate ? aws_acm_certificate.paintbox[0].arn : null

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.paintbox_blue[0].arn
  }

  tags = local.common_tags
}

resource "aws_lb_listener" "paintbox_green" {
  count = var.environment == "staging" ? 1 : 0

  load_balancer_arn = aws_lb.paintbox_alb[0].arn
  port              = "8080"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.paintbox_green[0].arn
  }

  tags = local.common_tags
}

# CloudWatch Log Group for ECS Exec
resource "aws_cloudwatch_log_group" "ecs_exec" {
  count = var.environment == "staging" ? 1 : 0

  name              = "/aws/ecs/exec/paintbox-${var.environment}"
  retention_in_days = 14
  kms_key_id        = aws_kms_key.paintbox.arn

  tags = local.common_tags
}

# Certificate for HTTPS (optional)
resource "aws_acm_certificate" "paintbox" {
  count = var.create_certificate && var.domain_name != "" ? 1 : 0

  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = local.common_tags
}

# Auto Scaling for ECS Services
resource "aws_appautoscaling_target" "paintbox_blue" {
  count = var.environment == "staging" ? 1 : 0

  max_capacity       = var.max_capacity
  min_capacity       = var.min_capacity
  resource_id        = "service/${aws_ecs_cluster.paintbox[0].name}/${aws_ecs_service.paintbox_blue[0].name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "paintbox_blue_scale_up" {
  count = var.environment == "staging" ? 1 : 0

  name               = "paintbox-blue-scale-up-${var.environment}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.paintbox_blue[0].resource_id
  scalable_dimension = aws_appautoscaling_target.paintbox_blue[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.paintbox_blue[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }

    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 300
  }
}

resource "aws_appautoscaling_target" "paintbox_green" {
  count = var.environment == "staging" ? 1 : 0

  max_capacity       = var.max_capacity
  min_capacity       = 0  # Green starts at 0
  resource_id        = "service/${aws_ecs_cluster.paintbox[0].name}/${aws_ecs_service.paintbox_green[0].name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "paintbox_green_scale_up" {
  count = var.environment == "staging" ? 1 : 0

  name               = "paintbox-green-scale-up-${var.environment}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.paintbox_green[0].resource_id
  scalable_dimension = aws_appautoscaling_target.paintbox_green[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.paintbox_green[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }

    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 300
  }
}
