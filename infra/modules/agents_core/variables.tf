variable "environment" {
  type        = string
  description = "The environment to deploy the service to"
}

variable "service_discovery_namespace_arn" {
  type        = string
  description = "The ARN of the service discovery namespace to use for the service"
}

variable "cluster_arn" {
  type        = string
  description = "The ARN of the cluster to deploy the service to"
}
variable "image_uri" {
  type        = string
  description = "The URI of the image to use for the service"
}

variable "vpc_id" {
  type        = string
  description = "The ID of the VPC to deploy the service to"
}

variable "subnet_ids" {
  type        = list(string)
  description = "The IDs of the subnets to deploy the service to"
}

#variable "hosted_zone_id" {
#  type        = string
#  description = "The ID of the hosted zone to create the DNS record in"
#}

variable "lb_listener_arn" {
  type        = string
  description = "The ARN of the load balancer listener to deploy the service to"
}

variable "lb_security_group_id" {
  type        = string
  description = "The ID of the security group for the load balancer"
}

variable "lb_dns_name" {
  type        = string
  description = "The DNS name of the load balancer"
}

variable "lb_zone_id" {
  type        = string
  description = "The zone ID of the load balancer"
}

variable "task_cpu" {
  type        = number
  description = "The amount of CPU units to allocate to the task"
  default     = 512
}

variable "task_memory" {
  type        = number
  description = "The amount of memory (in MiB) to allocate to the task"
  default     = 1024
}

variable "ephemeral_storage_size" {
  type        = number
  description = "The size (in GiB) of ephemeral storage to allocate to the task"
  default     = 21
}

variable "desired_count" {
  type        = number
  description = "The number of task instances to run"
  default     = 1
}

variable "db_instance_class" {
  type        = string
  description = "The instance class for the database"
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  type        = number
  description = "The amount of storage (in GB) to allocate to the database"
  default     = 20
}

variable "db_max_allocated_storage" {
  type        = number
  description = "The maximum storage (in GB) to which the database can scale"
  default     = 1000
}

variable "db_backup_retention_period" {
  type        = number
  description = "The number of days to retain database backups"
  default     = 1
}

variable "clerk_secret_key" {
  type        = string
  description = "The Clerk secret key to use for the service"
}
variable "clerk_publishable_key" {
  type = string
}

variable "hosted_zone_id" {
  type        = string
  description = "The ID of the hosted zone to create the DNS record in"
}

variable "connect_hub_api_url" {
  type        = string
  description = "The URL of the Connect Hub API"
}

output "lb_endpoint" {
  value = "https://${aws_route53_record.agents_core_service.fqdn}"
}

output "db_connection_block" {
  value = {
    url               = aws_db_instance.agents_core_service_db.endpoint
    db_name           = "postgres"
    username          = "postgres"
    password          = local.agents_core_service_db_password
    availability_zone = aws_db_instance.agents_core_service_db.availability_zone
  }
}