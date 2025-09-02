# Claude Configuration System - ECS Configuration

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = var.ecs_cluster_name

  configuration {
    execute_command_configuration {
      kms_key_id = aws_kms_key.main.arn
      logging    = "OVERRIDE"

      log_configuration {
        cloud_watch_encryption_enabled = true
        cloud_watch_log_group_name     = aws_cloudwatch_log_group.ecs_exec.name
      }
    }
  }

  setting {
    name  = "containerInsights"
    value = var.enable_detailed_monitoring ? "enabled" : "disabled"
  }

  tags = {
    Name = var.ecs_cluster_name
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = var.alb_enable_deletion_protection
  idle_timeout              = var.alb_idle_timeout

  access_logs {
    bucket  = aws_s3_bucket.alb_logs.bucket
    prefix  = "alb-access-logs"
    enabled = true
  }

  tags = {
    Name = "${var.project_name}-alb"
  }

  depends_on = [aws_s3_bucket_policy.alb_logs]
}

# Target Groups for each service
resource "aws_lb_target_group" "services" {
  for_each = var.ecs_services

  name     = "${each.value.name}-tg"
  port     = each.value.port
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = each.value.health_check_path
    matcher             = "200"
    protocol            = "HTTP"
  }

  target_type = "ip"

  tags = {
    Name = "${each.value.name}-tg"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ALB Listener (HTTP -> HTTPS redirect)
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

# ALB Listener (HTTPS)
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = aws_acm_certificate_validation.main.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.services["api"].arn
  }

  tags = {
    Name = "${var.project_name}-https-listener"
  }
}

# ALB Listener Rules for routing
resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.services["api"].arn
  }

  condition {
    path_pattern {
      values = ["/api/*", "/health"]
    }
  }
}

resource "aws_lb_listener_rule" "analytics" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 200

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.services["analytics"].arn
  }

  condition {
    path_pattern {
      values = ["/analytics/*"]
    }
  }
}

resource "aws_lb_listener_rule" "router" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 300

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.services["router"].arn
  }

  condition {
    path_pattern {
      values = ["/router/*"]
    }
  }
}

resource "aws_lb_listener_rule" "monitor" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 400

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.services["monitor"].arn
  }

  condition {
    path_pattern {
      values = ["/monitor/*"]
    }
  }
}

# ECS Task Definitions
resource "aws_ecs_task_definition" "services" {
  for_each = var.ecs_services

  family                   = each.value.name
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = each.value.cpu
  memory                   = each.value.memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn           = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = each.value.name
      image = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${each.value.name}:latest"
      
      essential = true
      
      portMappings = [
        {
          containerPort = each.value.port
          hostPort      = each.value.port
          protocol      = "tcp"
        }
      ]
      
      environment = [
        {
          name  = "ENV"
          value = var.environment
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        },
        {
          name  = "DATABASE_URL"
          value = "postgresql://${var.db_username}:${random_password.db_password.result}@${aws_db_instance.main.endpoint}/${var.db_name}"
        },
        {
          name  = "REDIS_URL"
          value = "redis://${aws_elasticache_replication_group.main.primary_endpoint_address}:6379"
        },
        {
          name  = "S3_BUCKET"
          value = aws_s3_bucket.config_storage.id
        }
      ]
      
      secrets = [
        {
          name      = "CLAUDE_API_KEY"
          valueFrom = aws_secretsmanager_secret.main["claude_api_key"].arn
        },
        {
          name      = "JWT_SECRET"
          valueFrom = aws_secretsmanager_secret.main["jwt_secret"].arn
        },
        {
          name      = "ENCRYPTION_KEY"
          valueFrom = aws_secretsmanager_secret.main["encryption_key"].arn
        }
      ]
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.ecs[each.key].name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
      
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

  tags = {
    Name = each.value.name
  }
}

# ECS Services
resource "aws_ecs_service" "services" {
  for_each = var.ecs_services

  name            = each.value.name
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.services[each.key].arn
  desired_count   = each.value.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = [aws_security_group.ecs.id]
    subnets          = aws_subnet.private[*].id
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.services[each.key].arn
    container_name   = each.value.name
    container_port   = each.value.port
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
    
    deployment_circuit_breaker {
      enable   = true
      rollback = true
    }
  }

  enable_execute_command = true

  depends_on = [
    aws_lb_listener.https,
    aws_iam_role_policy_attachment.ecs_task_execution,
    aws_iam_role_policy_attachment.ecs_task_policy
  ]

  tags = {
    Name = each.value.name
  }

  lifecycle {
    ignore_changes = [desired_count]
  }
}

# Auto Scaling Targets
resource "aws_appautoscaling_target" "ecs" {
  for_each = var.ecs_services

  max_capacity       = each.value.max_capacity
  min_capacity       = each.value.min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.services[each.key].name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
  role_arn           = aws_iam_role.ecs_autoscaling.arn

  tags = {
    Name = "${each.value.name}-autoscaling-target"
  }
}

# CloudWatch Log Groups for ECS
resource "aws_cloudwatch_log_group" "ecs" {
  for_each = var.ecs_services

  name              = "/ecs/${each.value.name}"
  retention_in_days = var.log_retention_days
  kms_key_id        = aws_kms_key.main.arn

  tags = {
    Name = "${each.value.name}-log-group"
  }
}

# ECS Execute Command Log Group
resource "aws_cloudwatch_log_group" "ecs_exec" {
  name              = "/aws/ecs/exec/${var.project_name}"
  retention_in_days = var.log_retention_days
  kms_key_id        = aws_kms_key.main.arn

  tags = {
    Name = "${var.project_name}-ecs-exec-log-group"
  }
}

# S3 Bucket for ALB Logs
resource "aws_s3_bucket" "alb_logs" {
  bucket        = "${var.s3_bucket_prefix}-alb-logs-${random_id.suffix.hex}"
  force_destroy = var.s3_force_destroy

  tags = {
    Name = "${var.project_name}-alb-logs"
  }
}

resource "aws_s3_bucket_versioning" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.main.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket Policy for ALB Logs
data "aws_elb_service_account" "main" {}

resource "aws_s3_bucket_policy" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = data.aws_elb_service_account.main.arn
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.alb_logs.arn}/alb-access-logs/AWSLogs/${data.aws_caller_identity.current.account_id}/*"
      },
      {
        Effect = "Allow"
        Principal = {
          Service = "delivery.logs.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.alb_logs.arn}/alb-access-logs/AWSLogs/${data.aws_caller_identity.current.account_id}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      },
      {
        Effect = "Allow"
        Principal = {
          Service = "delivery.logs.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.alb_logs.arn
      }
    ]
  })
}

# S3 Bucket for Config Storage
resource "aws_s3_bucket" "config_storage" {
  bucket        = "${var.s3_bucket_prefix}-config-${random_id.suffix.hex}"
  force_destroy = var.s3_force_destroy

  tags = {
    Name = "${var.project_name}-config-storage"
  }
}

resource "aws_s3_bucket_versioning" "config_storage" {
  bucket = aws_s3_bucket.config_storage.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "config_storage" {
  bucket = aws_s3_bucket.config_storage.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.main.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "config_storage" {
  bucket = aws_s3_bucket.config_storage.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}