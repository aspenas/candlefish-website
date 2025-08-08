resource "random_password" "db_password" {
  length  = 24
  special = true
}

resource "aws_db_subnet_group" "rtpm" {
  name       = "${var.project}-db-subnets"
  subnet_ids = [aws_subnet.rtpm_private_a.id, aws_subnet.rtpm_private_b.id]
}

resource "aws_db_instance" "rtpm" {
  identifier               = "${var.project}-postgres"
  engine                   = "postgres"
  engine_version           = "15"
  instance_class           = "db.t4g.micro"
  allocated_storage        = 20
  username                 = "rtpm_user"
  password                 = random_password.db_password.result
  db_name                  = "rtpm_db"
  db_subnet_group_name     = aws_db_subnet_group.rtpm.name
  vpc_security_group_ids   = [aws_security_group.db_sg.id]
  skip_final_snapshot      = true
  publicly_accessible      = false
  backup_retention_period  = 7
  deletion_protection      = false
  apply_immediately        = true
}

locals {
  db_url = "postgresql+asyncpg://rtpm_user:${random_password.db_password.result}@${aws_db_instance.rtpm.address}:5432/rtpm_db"
}
