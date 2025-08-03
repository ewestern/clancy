variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "subnet_ids" {
  type = list(string)
}

variable "db_allocated_storage" {
  type    = number
  default = 20
}

variable "db_backup_retention_period" {
  type    = number
  default = 7
}

variable "db_max_allocated_storage" {
  type    = number
  default = 50
}

variable "db_instance_class" {
  type    = string
  default = "db.t3.micro"
}

output "db_url" {
  value = "postgresql://postgres:${local.url_encoded_db_password}@${aws_db_instance.checkpointer_db.endpoint}/${aws_db_instance.checkpointer_db.db_name}"
}

output "db_port" {
  value = aws_db_instance.checkpointer_db.port
}