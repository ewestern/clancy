

locals {
}


resource "aws_db_subnet_group" "agents_core_service_db_subnet_group" {
  description = "Agents Core Service Database Subnet Group"
  name        = "agents-core-service-db-subnet-group-${var.environment}"
  subnet_ids  = var.subnet_ids
}
resource "aws_db_parameter_group" "agents_core_service_db_parameter_group" {
  name_prefix = "agents-core-service-pg-${var.environment}"
  family      = "postgres17"

  parameter {
    name  = "rds.force_ssl"
    value = "0"
  }

  lifecycle {
    create_before_destroy = true
  }
}
resource "aws_db_instance" "agents_core_service_db" {
  lifecycle {
    ignore_changes = [
      password
    ]
  }
  publicly_accessible                   = true
  allocated_storage                     = var.db_allocated_storage
  auto_minor_version_upgrade            = "true"
  backup_retention_period               = var.db_backup_retention_period
  backup_target                         = "region"
  backup_window                         = "09:20-09:50"
  copy_tags_to_snapshot                 = "true"
  customer_owned_ip_enabled             = "false"
  db_subnet_group_name                  = aws_db_subnet_group.agents_core_service_db_subnet_group.name
  password                              = local.agents_core_service_db_password
  dedicated_log_volume                  = "false"
  deletion_protection                   = "false"
  engine                                = "postgres"
  engine_version                        = "17.5"
  iam_database_authentication_enabled   = "false"
  identifier                            = "agents-core-db-${var.environment}"
  instance_class                        = var.db_instance_class
  iops                                  = "0"
  license_model                         = "postgresql-license"
  maintenance_window                    = "sat:06:12-sat:06:42"
  max_allocated_storage                 = var.db_max_allocated_storage
  monitoring_interval                   = "0"
  multi_az                              = "false"
  network_type                          = "IPV4"
  option_group_name                     = "default:postgres-17"
  port                                  = "5432"
  storage_encrypted                     = "true"
  storage_throughput                    = "0"
  storage_type                          = "gp2"
  username                              = "postgres"
  vpc_security_group_ids                = [aws_security_group.agents_core_sg.id]
  parameter_group_name                  = aws_db_parameter_group.agents_core_service_db_parameter_group.name
}

locals {
  database_url = "postgresql://postgres:${local.agents_core_service_db_password}@${aws_db_instance.agents_core_service_db.endpoint}/${aws_db_instance.agents_core_service_db.db_name}"
}