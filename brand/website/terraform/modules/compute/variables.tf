# Compute Module Variables
# ECS Fargate, Lambda, Auto Scaling for Candlefish.ai

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

variable "vpc_id" {
  description = "VPC ID where resources will be created"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for ECS services"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for ECS services"
  type        = list(string)
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs for load balancers"
  type        = list(string)
}

# ECS Cluster Configuration
variable "cluster_name" {
  description = "ECS cluster name"
  type        = string
  default     = null
}

variable "enable_container_insights" {
  description = "Enable ECS container insights"
  type        = bool
  default     = true
}

variable "cluster_capacity_providers" {
  description = "ECS cluster capacity providers"
  type        = list(string)
  default     = ["FARGATE", "FARGATE_SPOT"]
}

variable "default_capacity_provider_strategy" {
  description = "Default capacity provider strategy"
  type = list(object({
    capacity_provider = string
    weight           = number
    base            = number
  }))
  default = [
    {
      capacity_provider = "FARGATE"
      weight           = 1
      base            = 0
    }
  ]
}

# ECS Service Configuration
variable "services" {
  description = "ECS services configuration"
  type = map(object({
    image             = string
    cpu              = number
    memory           = number
    port             = number
    protocol         = string
    health_check_path = string
    environment_variables = map(string)
    secrets          = map(string)
    
    # Auto-scaling configuration
    min_capacity     = number
    max_capacity     = number
    target_cpu       = number
    target_memory    = number
    
    # Deployment configuration
    deployment_minimum_healthy_percent = number
    deployment_maximum_percent        = number
    
    # Load balancer configuration
    enable_load_balancer = bool
    domain_name         = optional(string)
    
    # Spot instance configuration
    use_spot_instances  = bool
    spot_allocation     = optional(number, 50)
  }))
  default = {}
}

# Lambda Functions Configuration
variable "lambda_functions" {
  description = "Lambda functions configuration"
  type = map(object({
    filename         = string
    function_name    = string
    handler         = string
    runtime         = string
    timeout         = number
    memory_size     = number
    environment_variables = map(string)
    
    # VPC configuration (optional)
    vpc_config = optional(object({
      subnet_ids         = list(string)
      security_group_ids = list(string)
    }))
    
    # Event triggers
    api_gateway_integration = optional(bool, false)
    cloudwatch_event_rule  = optional(string)
    s3_bucket_notification = optional(string)
    
    # Provisioned concurrency
    provisioned_concurrency = optional(number, 0)
    reserved_concurrent_executions = optional(number, -1)
  }))
  default = {}
}

# Auto Scaling Configuration
variable "auto_scaling_config" {
  description = "Auto-scaling configuration for ECS services"
  type = object({
    scale_up_cooldown   = number
    scale_down_cooldown = number
    target_cpu_utilization = number
    target_memory_utilization = number
  })
  default = {
    scale_up_cooldown   = 300  # 5 minutes
    scale_down_cooldown = 300  # 5 minutes
    target_cpu_utilization = 70
    target_memory_utilization = 80
  }
}

# Load Balancer Configuration
variable "load_balancer_config" {
  description = "Application Load Balancer configuration"
  type = object({
    enable_deletion_protection = bool
    idle_timeout              = number
    enable_cross_zone_load_balancing = bool
    access_logs_bucket        = optional(string)
    ssl_certificate_arn       = optional(string)
  })
  default = {
    enable_deletion_protection = true
    idle_timeout              = 60
    enable_cross_zone_load_balancing = true
  }
}

# Security Groups
variable "allow_inbound_cidr_blocks" {
  description = "CIDR blocks allowed to access the load balancer"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "additional_security_group_ids" {
  description = "Additional security group IDs to attach to ECS services"
  type        = list(string)
  default     = []
}

# Monitoring and Logging
variable "enable_execute_command" {
  description = "Enable ECS Exec for debugging"
  type        = bool
  default     = false
}

variable "log_retention_days" {
  description = "CloudWatch Logs retention period in days"
  type        = number
  default     = 30
}

# Cost Optimization
variable "enable_spot_instances" {
  description = "Enable Fargate Spot for cost optimization"
  type        = bool
  default     = false
}

variable "spot_allocation_percentage" {
  description = "Percentage of tasks to run on Spot instances"
  type        = number
  default     = 50
  validation {
    condition     = var.spot_allocation_percentage >= 0 && var.spot_allocation_percentage <= 100
    error_message = "Spot allocation percentage must be between 0 and 100."
  }
}

# Blue/Green Deployment Configuration
variable "enable_blue_green_deployment" {
  description = "Enable blue/green deployment using CodeDeploy"
  type        = bool
  default     = false
}

variable "deployment_configuration" {
  description = "CodeDeploy deployment configuration"
  type        = string
  default     = "CodeDeployDefault.ECSAllAtOnce"
  validation {
    condition = contains([
      "CodeDeployDefault.ECSAllAtOnce",
      "CodeDeployDefault.ECSLinear10PercentEvery1Minutes",
      "CodeDeployDefault.ECSLinear10PercentEvery3Minutes",
      "CodeDeployDefault.ECSCanary10Percent5Minutes",
      "CodeDeployDefault.ECSCanary10Percent15Minutes"
    ], var.deployment_configuration)
    error_message = "Invalid CodeDeploy configuration."
  }
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}