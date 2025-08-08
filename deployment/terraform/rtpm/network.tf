data "aws_availability_zones" "available" {}

resource "aws_vpc" "rtpm" {
  cidr_block           = "10.50.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = { Name = "${var.project}-vpc" }
}

resource "aws_subnet" "rtpm_private_a" {
  vpc_id                  = aws_vpc.rtpm.id
  cidr_block              = "10.50.1.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = false
  tags = { Name = "${var.project}-private-a" }
}

resource "aws_subnet" "rtpm_private_b" {
  vpc_id                  = aws_vpc.rtpm.id
  cidr_block              = "10.50.2.0/24"
  availability_zone       = data.aws_availability_zones.available.names[1]
  map_public_ip_on_launch = false
  tags = { Name = "${var.project}-private-b" }
}

resource "aws_security_group" "db_sg" {
  name        = "${var.project}-db-sg"
  description = "DB access"
  vpc_id      = aws_vpc.rtpm.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.rtpm.cidr_block]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "redis_sg" {
  name        = "${var.project}-redis-sg"
  description = "Redis access"
  vpc_id      = aws_vpc.rtpm.id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.rtpm.cidr_block]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
