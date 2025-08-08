# ECS Fargate Configuration for Paintbox Application
# Production-ready container orchestration

# Application Load Balancer
resource "aws_lb" "paintbox" {
  name               = "paintbox-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = var.environment == "production"

  access_logs {
    bucket  = aws_s3_bucket.alb_logs.bucket
    prefix  = "alb-access-logs"
    enabled = true
  }

  tags = merge(local.common_tags, {
    Name = "paintbox-${var.environment}-alb"
  })

  depends_on = [aws_s3_bucket_policy.alb_logs]
}

# ALB Target Group
resource "aws_lb_target_group" "paintbox" {
  name        = "paintbox-${var.environment}-tg"
  port        = var.container_port
  protocol    = "HTTP"
  vpc_id      = aws_vpc.paintbox.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/api/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 10
    unhealthy_threshold = 3
  }

  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = true
  }

  tags = merge(local.common_tags, {
    Name = "paintbox-${var.environment}-tg"
  })
}

# ALB Listeners
resource "aws_lb_listener" "paintbox_http" {
  load_balancer_arn = aws_lb.paintbox.arn
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

resource "aws_lb_listener" "paintbox_https" {
  load_balancer_arn = aws_lb.paintbox.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.paintbox.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.paintbox.arn
  }
}

# Security Group for ALB
resource "aws_security_group" "alb" {
  name_prefix = "paintbox-${var.environment}-alb-"
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
    Name = "paintbox-${var.environment}-alb-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Security Group for ECS Tasks
resource "aws_security_group" "ecs_tasks" {
  name_prefix = "paintbox-${var.environment}-ecs-tasks-"
  vpc_id      = aws_vpc.paintbox.id

  ingress {
    description     = "HTTP from ALB"
    from_port       = var.container_port
    to_port         = var.container_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "paintbox-${var.environment}-ecs-tasks-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# S3 Bucket for ALB logs
resource "aws_s3_bucket" "alb_logs" {
  bucket        = "paintbox-${var.environment}-alb-logs-${random_string.bucket_suffix.result}"
  force_destroy = var.environment != "production"

  tags = merge(local.common_tags, {
    Name        = "paintbox-${var.environment}-alb-logs"
    Purpose     = "ALB Access Logs"
    Compliance  = "Required"
  })
}

resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
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
      kms_master_key_id = aws_kms_key.paintbox.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  rule {
    id     = "alb_logs_lifecycle"
    status = "Enabled"

    expiration {
      days = var.environment == "production" ? 90 : 30
    }

    noncurrent_version_expiration {
      noncurrent_days = 7
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# S3 Bucket Policy for ALB logs
data "aws_elb_service_account" "main" {}

resource "aws_s3_bucket_policy" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id
  policy = data.aws_iam_policy_document.alb_logs.json
}

data "aws_iam_policy_document" "alb_logs" {
  statement {
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = [data.aws_elb_service_account.main.arn]
    }

    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.alb_logs.arn}/*"]

    condition {
      test     = "StringEquals"
      variable = "s3:x-amz-acl"
      values   = ["bucket-owner-full-control"]
    }
  }

  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["delivery.logs.amazonaws.com"]
    }

    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.alb_logs.arn}/*"]

    condition {
      test     = "StringEquals"
      variable = "s3:x-amz-acl"
      values   = ["bucket-owner-full-control"]
    }
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "paintbox" {
  name = "paintbox-${var.environment}"

  configuration {
    execute_command_configuration {
      kms_key_id = aws_kms_key.paintbox.arn
      logging    = "OVERRIDE"

      log_configuration {
        cloud_watch_encryption_enabled = true
        cloud_watch_log_group_name     = aws_cloudwatch_log_group.ecs_exec.name
      }
    }
  }

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = merge(local.common_tags, {
    Name = "paintbox-${var.environment}-cluster"
  })
}

resource "aws_cloudwatch_log_group" "ecs_exec" {
  name              = "/aws/ecs/exec/${var.environment}"
  retention_in_days = 7
  kms_key_id        = aws_kms_key.paintbox.arn

  tags = local.common_tags
}

# ECS Task Definition
resource "aws_ecs_task_definition" "paintbox" {
  family                   = "paintbox-${var.environment}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.fargate_cpu
  memory                   = var.fargate_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "paintbox"
      image = var.app_image

      essential = true

      portMappings = [
        {
          containerPort = var.container_port
          hostPort      = var.container_port
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "PORT"
          value = tostring(var.container_port)
        },
        {
          name  = "ENVIRONMENT"
          value = var.environment
        }
      ]

      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = aws_secretsmanager_secret.paintbox_secrets.arn
        },
        {
          name      = "REDIS_URL"
          valueFrom = aws_secretsmanager_secret.paintbox_secrets.arn
        },
        {
          name      = "SALESFORCE_CLIENT_ID"
          valueFrom = aws_secretsmanager_secret.paintbox_secrets.arn
        },
        {
          name      = "SALESFORCE_CLIENT_SECRET"
          valueFrom = aws_secretsmanager_secret.paintbox_secrets.arn
        },
        {
          name      = "COMPANYCAM_API_TOKEN"
          valueFrom = aws_secretsmanager_secret.paintbox_secrets.arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs_app.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:${var.container_port}/api/health || exit 1"]
        interval    = 30
        timeout     = 10
        retries     = 3
        startPeriod = 60
      }

      stopTimeout = 30

      # Resource limits
      memoryReservation = var.fargate_memory * 0.8

      # Security
      readonlyRootFilesystem = false
      user = "1001:1001"

      # Networking
      dnsSearchDomains = ["${var.aws_region}.compute.internal"]
      dnsServers       = ["169.254.169.253"]
    }
  ])

  tags = merge(local.common_tags, {
    Name = "paintbox-${var.environment}-task-definition"
  })
}

resource "aws_cloudwatch_log_group" "ecs_app" {
  name              = "/aws/ecs/paintbox-${var.environment}/app"
  retention_in_days = var.environment == "production" ? 30 : 14
  kms_key_id        = aws_kms_key.paintbox.arn

  tags = merge(local.common_tags, {
    Name = "paintbox-${var.environment}-ecs-app-logs"
  })
}

# ECS Service
resource "aws_ecs_service" "paintbox" {
  name            = "paintbox-${var.environment}-service"
  cluster         = aws_ecs_cluster.paintbox.id
  task_definition = aws_ecs_task_definition.paintbox.arn
  desired_count   = var.app_count
  launch_type     = "FARGATE"

  platform_version = "LATEST"

  network_configuration {
    security_groups  = [aws_security_group.ecs_tasks.id]
    subnets          = aws_subnet.private[*].id
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.paintbox.arn
    container_name   = "paintbox"
    container_port   = var.container_port
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100

    deployment_circuit_breaker {
      enable   = true
      rollback = true
    }
  }

  # Enable execute command for debugging
  enable_execute_command = var.environment != "production"

  # Service discovery
  service_registries {
    registry_arn = aws_service_discovery_service.paintbox.arn
  }

  depends_on = [
    aws_lb_listener.paintbox_https,
    aws_iam_role_policy_attachment.ecs_task_execution_role,
  ]

  tags = merge(local.common_tags, {
    Name = "paintbox-${var.environment}-service"
  })

  lifecycle {
    ignore_changes = [task_definition]
  }
}

# Service Discovery
resource "aws_service_discovery_private_dns_namespace" "paintbox" {
  name        = "paintbox.local"
  description = "Service discovery namespace for Paintbox"
  vpc         = aws_vpc.paintbox.id

  tags = merge(local.common_tags, {
    Name = "paintbox-${var.environment}-namespace"
  })
}

resource "aws_service_discovery_service" "paintbox" {
  name = "paintbox-${var.environment}"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.paintbox.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_grace_period_seconds = 60

  tags = merge(local.common_tags, {
    Name = "paintbox-${var.environment}-service-discovery"
  })
}

# Auto Scaling
resource "aws_appautoscaling_target" "ecs_target" {
  max_capacity       = var.max_capacity
  min_capacity       = var.min_capacity
  resource_id        = "service/${aws_ecs_cluster.paintbox.name}/${aws_ecs_service.paintbox.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"

  tags = merge(local.common_tags, {
    Name = "paintbox-${var.environment}-autoscaling-target"
  })
}

resource "aws_appautoscaling_policy" "ecs_policy_cpu" {
  name               = "paintbox-${var.environment}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }

    target_value       = 70.0
    scale_out_cooldown = 300
    scale_in_cooldown  = 300
  }
}

resource "aws_appautoscaling_policy" "ecs_policy_memory" {
  name               = "paintbox-${var.environment}-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }

    target_value       = 80.0
    scale_out_cooldown = 300
    scale_in_cooldown  = 600
  }
}

resource "aws_appautoscaling_policy" "ecs_policy_requests" {
  name               = "paintbox-${var.environment}-request-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = "${aws_lb.paintbox.arn_suffix}/${aws_lb_target_group.paintbox.arn_suffix}"
    }

    target_value       = 1000.0
    scale_out_cooldown = 300
    scale_in_cooldown  = 600
  }
}

# IAM Roles for ECS
resource "aws_iam_role" "ecs_task_execution" {
  name_prefix = "paintbox-${var.environment}-ecs-task-execution-"

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

  tags = merge(local.common_tags, {
    Name = "paintbox-${var.environment}-ecs-task-execution"
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_task_execution_secrets" {
  name_prefix = "paintbox-${var.environment}-ecs-secrets-"
  role        = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
        ]
        Resource = [
          aws_secretsmanager_secret.paintbox_secrets.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
        ]
        Resource = [
          aws_kms_key.paintbox.arn
        ]
      }
    ]
  })
}

resource "aws_iam_role" "ecs_task" {
  name_prefix = "paintbox-${var.environment}-ecs-task-"

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

  tags = merge(local.common_tags, {
    Name = "paintbox-${var.environment}-ecs-task"
  })
}

resource "aws_iam_role_policy" "ecs_task_policy" {
  name_prefix = "paintbox-${var.environment}-ecs-task-"
  role        = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "${aws_cloudwatch_log_group.ecs_app.arn}:*"
      },
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

# ACM Certificate for HTTPS
resource "aws_acm_certificate" "paintbox" {
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = [
    "*.${var.domain_name}",
    var.environment != "production" ? "${var.environment}.${var.domain_name}" : null
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(local.common_tags, {
    Name = "paintbox-${var.environment}-cert"
  })
}

# Route53 DNS validation
data "aws_route53_zone" "paintbox" {
  name         = var.domain_name
  private_zone = false
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.paintbox.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.paintbox.zone_id
}

resource "aws_acm_certificate_validation" "paintbox" {
  certificate_arn         = aws_acm_certificate.paintbox.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]

  timeouts {
    create = "10m"
  }
}

# Route53 DNS record for the application
resource "aws_route53_record" "paintbox" {
  zone_id = data.aws_route53_zone.paintbox.zone_id
  name    = var.environment == "production" ? var.domain_name : "${var.environment}.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.paintbox.dns_name
    zone_id                = aws_lb.paintbox.zone_id
    evaluate_target_health = true
  }
}
