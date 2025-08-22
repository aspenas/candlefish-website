aws_region = "us-east-1"
environment = "production"
project_name = "nanda-index"
domain_name = "nanda.candlefish.ai"
redis_auth_token = "secure-redis-token-change-me-123"

# VPC Configuration
vpc_cidr = "10.0.0.0/16"
public_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
private_subnet_cidrs = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]

# ECS Configuration
ecs_min_capacity = 2
ecs_max_capacity = 10
ecs_desired_capacity = 3
cpu_units = 512
memory = 1024

# Redis Configuration
redis_instance_type = "cache.r6g.large"
redis_num_nodes = 3

# Feature flags
enable_waf = true
enable_detailed_monitoring = true
seed_sample_agents = true
enable_privacy_layer = true
enable_enterprise_connector = true

# Enterprise integration
enterprise_registries = [
  "https://registry.openai.com",
  "https://registry.anthropic.com",
  "https://registry.microsoft.com/copilot"
]

trusted_registries = [
  "https://registry.openai.com",
  "https://registry.anthropic.com"
]

# Mix nodes for privacy layer
mix_nodes = [
  "mix1.nanda.candlefish.ai",
  "mix2.nanda.candlefish.ai",
  "mix3.nanda.candlefish.ai"
]
