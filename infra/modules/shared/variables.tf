variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "certificate_arn" {
  type = string
}

variable "alb_azs" {
  description = "List of availability zones for the Application Load Balancer (minimum 2 required)"
  type        = list(string)
  validation {
    condition     = length(var.alb_azs) >= 2
    error_message = "ALB requires at least 2 availability zones."
  }
}

variable "ecs_azs" {
  description = "List of availability zones for ECS tasks"
  type        = list(string)
}

variable "db_azs" {
  description = "List of availability zones for database resources"
  type        = list(string)
}

variable "subnet_cidrs" {
  description = "CIDR blocks for subnets organized by tier and AZ"
  type = object({
    public      = map(string)  # az -> cidr for ALB subnets
    ecs_private = map(string)  # az -> cidr for ECS subnets  
    db_private  = map(string)  # az -> cidr for DB subnets
  })
}

variable "nat_strategy" {
  description = "NAT Gateway strategy: 'single' for one NAT or 'per_az' for NAT per AZ"
  type        = string
  default     = "single"
  validation {
    condition     = contains(["single", "per_az"], var.nat_strategy)
    error_message = "nat_strategy must be either 'single' or 'per_az'."
  }
}

variable "single_nat_az" {
  description = "AZ for single NAT Gateway (required when nat_strategy = 'single')"
  type        = string
  default     = null
}

output "lb_security_group_id" {
  value = aws_security_group.shared_sg.id
}

output "lb_arn" {
  value = aws_lb.shared_lb.arn
}
output "lb_listener_arn" {
  value = aws_lb_listener.shared_lb_listener.arn
}

output "lb_dns_name" {
  value = aws_lb.shared_lb.dns_name
}

output "lb_zone_id" {
  value = aws_lb.shared_lb.zone_id
}

output "cluster_arn" {
  value = aws_ecs_cluster.clancy_ecs_cluster.arn
}

output "vpc_id" {
  value = aws_vpc.vpc.id
}

output "public_subnet_ids" {
  description = "List of public subnet IDs for ALB"
  value = values(local.all_public_subnets)
}

output "public_subnets_by_az" {
  description = "Map of public subnet IDs by AZ for ALB"
  value = local.all_public_subnets
}

output "ecs_private_subnet_ids" {
  description = "List of ECS private subnet IDs"
  value = values(local.all_ecs_private_subnets)
}

output "ecs_private_subnets_by_az" {
  description = "Map of ECS private subnet IDs by AZ"
  value = local.all_ecs_private_subnets
}

output "db_private_subnet_ids" {
  description = "List of DB private subnet IDs"
  value = values(local.all_db_private_subnets)
}

output "db_private_subnets_by_az" {
  description = "Map of DB private subnet IDs by AZ"
  value = local.all_db_private_subnets
}

# Legacy output for backward compatibility
output "private_subnet_ids" {
  description = "Legacy output - use ecs_private_subnet_ids instead"
  value = local.all_ecs_private_subnets
}

output "service_discovery_namespace_arn" {
  value = aws_service_discovery_private_dns_namespace.clancy.arn
}

output "loadbalancer_dns_name" {
  value = aws_lb.shared_lb.dns_name
}