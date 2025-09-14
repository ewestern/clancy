
resource "aws_db_subnet_group" "checkpointer_db_subnet_group" {
  name       = "checkpointer-db-subnet-group-${var.environment}"
  subnet_ids = var.subnet_ids
}

resource "aws_db_parameter_group" "checkpointer_db_parameter_group" {
  name       = "checkpointer-db-parameter-group-${var.environment}"
  family     = "postgres17"
  parameter {
    name  = "log_connections"
    value = "1"
  }
  parameter {
    name         = "rds.force_ssl"
    value        = "0"
  }
}

resource "aws_security_group" "checkpointer_sg" {
  name        = "checkpointer-sg-${var.environment}"
  description = "Security group for checkpointer"
  vpc_id      = var.vpc_id
}
locals {
  db_password = jsondecode(aws_secretsmanager_secret_version.checkpointer_db_password.secret_string)["password"]
  url_encoded_db_password = urlencode(local.db_password)
}

resource "aws_db_instance" "checkpointer_db" {
  final_snapshot_identifier             = "checkpointer-db-${var.environment}-final-snapshot"
  publicly_accessible                   = true
  allocated_storage                     = var.db_allocated_storage
  auto_minor_version_upgrade            = "true"
  backup_retention_period               = var.db_backup_retention_period
  backup_target                         = "region"
  backup_window                         = "09:20-09:50"
  copy_tags_to_snapshot                 = "true"
  customer_owned_ip_enabled             = "false"
  db_subnet_group_name                  = aws_db_subnet_group.checkpointer_db_subnet_group.name
  password                              = local.db_password
  dedicated_log_volume                  = "false"
  deletion_protection                   = "false"
  engine                                = "postgres"
  engine_version                        = "17.5"
  iam_database_authentication_enabled   = "false"
  identifier                            = "checkpointer-db-${var.environment}"
  instance_class                        = var.db_instance_class
  iops                                  = "0"
  license_model                         = "postgresql-license"
  maintenance_window                    = "sat:06:12-sat:06:42"
  max_allocated_storage                 = var.db_max_allocated_storage
  monitoring_interval                   = "0"
  multi_az                              = "false"
  network_type                          = "IPV4"
  option_group_name                     = "default:postgres-17"
  #performance_insights_enabled          = "true"
  #performance_insights_retention_period = var.performance_insights_retention_period
  port                                  = "5432"
  storage_encrypted                     = "true"
  storage_throughput                    = "0"
  storage_type                          = "gp2"
  username                              = "postgres"
  vpc_security_group_ids                = [aws_security_group.checkpointer_sg.id]
  parameter_group_name                  = aws_db_parameter_group.checkpointer_db_parameter_group.name
  lifecycle {
    ignore_changes = [
      password
    ]
  }
}
// generate random password
resource "random_password" "checkpointer_db_password" {
  length  = 16
  special = false
}

resource "aws_secretsmanager_secret" "checkpointer_db_password" {

  name        = "clancy/checkpointer/${var.environment}"
  description = "Password for checkpointer database"
}

resource "aws_secretsmanager_secret_version" "checkpointer_db_password" {
  secret_id = aws_secretsmanager_secret.checkpointer_db_password.id
  secret_string = jsonencode({
    password = random_password.checkpointer_db_password.result
  })
}
