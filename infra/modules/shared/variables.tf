variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "certificate_arn" {
  type = string
}

variable "availability_zones" {
  description = "List of availability zones to use for the VPC resources"
  type        = list(string)
}

variable "subnet_cidrs" {
  description = "Map of subnet names to CIDR blocks"
  type        = map(string)
  default = {
    "public_2a"  = "10.0.1.0/24"
    "private_2a" = "10.0.5.0/24"
    "public_2b"  = "10.0.4.0/24"
    "private_2b" = "10.0.2.0/24"
    "public_2c"  = "10.0.6.0/24"
    "private_2c" = "10.0.3.0/24"
  }
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
  value = local.all_public_subnets
}

output "private_subnet_ids" {
  value = local.all_private_subnets
}

output "service_discovery_namespace_arn" {
  value = aws_service_discovery_private_dns_namespace.clancy.arn
}

output "loadbalancer_dns_name" {
  value = aws_lb.shared_lb.dns_name
}