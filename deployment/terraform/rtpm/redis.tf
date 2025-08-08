resource "random_password" "redis_auth" {
  length  = 24
  special = false
}

resource "aws_elasticache_subnet_group" "rtpm" {
  name       = "${var.project}-redis-subnets"
  subnet_ids = [aws_subnet.rtpm_private_a.id, aws_subnet.rtpm_private_b.id]
}

resource "aws_elasticache_cluster" "rtpm" {
  cluster_id           = "${var.project}-redis"
  engine               = "redis"
  node_type            = "cache.t4g.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.rtpm.name
  security_group_ids   = [aws_security_group.redis_sg.id]
}

locals {
  redis_url = "redis://${aws_elasticache_cluster.rtpm.cache_nodes[0].address}:6379/0"
}
