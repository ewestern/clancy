resource "aws_security_group" "shared_sg" {
  name_prefix = "shared-sg-${var.environment}"
  vpc_id      = aws_vpc.vpc.id
}
resource "aws_security_group_rule" "shared_sg_rule_internal" {
  type              = "ingress"
  from_port         = 0
  to_port           = 65535
  protocol          = "tcp"
  self              = true
  security_group_id = aws_security_group.shared_sg.id
}
resource "aws_security_group_rule" "shared_sg_rule_external" {
  type              = "ingress"
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  ipv6_cidr_blocks  = ["::/0"]
  security_group_id = aws_security_group.shared_sg.id
}
resource "aws_security_group_rule" "shared_sg_rule_external_https" {
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  ipv6_cidr_blocks  = ["::/0"]
  security_group_id = aws_security_group.shared_sg.id
}


resource "aws_vpc" "vpc" {
  assign_generated_ipv6_cidr_block     = "false"
  cidr_block                           = "10.0.0.0/16"
  enable_dns_hostnames                 = "true"
  enable_dns_support                   = "true"
  enable_network_address_usage_metrics = "false"
  instance_tenancy                     = "default"
  tags = {
    Name = "clancy-${var.environment}-vpc"
  }
}
resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.vpc.id
}

locals {
  # Determine NAT AZs based on strategy
  nat_azs = var.nat_strategy == "single" ? [var.single_nat_az] : var.ecs_azs
  
  # All subnet maps for outputs
  all_public_subnets = {
    for az in var.alb_azs : az => aws_subnet.public_subnets[az].id
  }

  all_ecs_private_subnets = {
    for az in var.ecs_azs : az => aws_subnet.ecs_private_subnets[az].id
  }
  
  all_db_private_subnets = {
    for az in var.db_azs : az => aws_subnet.db_subnets[az].id
  }
}

# EIPs for NAT Gateways
resource "aws_eip" "nat_gateways" {
  for_each = toset(local.nat_azs)
  domain   = "vpc"
  tags = {
    Name = "${var.environment}-nat-eip-${each.key}"
  }
}

# NAT Gateways
resource "aws_nat_gateway" "nat_gateways" {
  for_each      = toset(local.nat_azs)
  allocation_id = aws_eip.nat_gateways[each.key].id
  subnet_id     = aws_subnet.public_subnets[each.key].id
  depends_on    = [aws_internet_gateway.gw]
  tags = {
    Name = "${var.environment}-nat-${each.key}"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }
  tags = {
    Name = "clancy-${var.environment}-public-route-table"
  }
}

# ECS Private route tables (with NAT Gateway routes)
resource "aws_route_table" "ecs_private" {
  for_each = var.nat_strategy == "single" ? toset(["single"]) : toset(var.ecs_azs)
  vpc_id   = aws_vpc.vpc.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = var.nat_strategy == "single" ? aws_nat_gateway.nat_gateways[var.single_nat_az].id : aws_nat_gateway.nat_gateways[each.key].id
  }
  tags = {
    Name = var.nat_strategy == "single" ? "${var.environment}-ecs-private-route-table" : "${var.environment}-ecs-private-route-table-${each.key}"
  }
}

# DB Private route table (no NAT Gateway, VPC-local only)
resource "aws_route_table" "db_private" {
  vpc_id = aws_vpc.vpc.id
  tags = {
    Name = "${var.environment}-db-private-route-table"
  }
}

# Subnets

# Public subnets for ALB
resource "aws_subnet" "public_subnets" {
  for_each                        = toset(var.alb_azs)
  assign_ipv6_address_on_creation = false
  availability_zone               = each.key
  cidr_block                     = var.subnet_cidrs.public[each.key]
  enable_dns64                   = false
  enable_resource_name_dns_a_record_on_launch    = false
  enable_resource_name_dns_aaaa_record_on_launch = false
  ipv6_native                    = false
  map_public_ip_on_launch        = true
  private_dns_hostname_type_on_launch = "ip-name"
  vpc_id                         = aws_vpc.vpc.id
  tags = {
    Name = "${var.environment}-public-subnet-${each.key}"
  }
}

# ECS Private subnets (with NAT Gateway access)
resource "aws_subnet" "ecs_private_subnets" {
  for_each                        = toset(var.ecs_azs)
  assign_ipv6_address_on_creation = false
  availability_zone               = each.key
  cidr_block                     = var.subnet_cidrs.ecs_private[each.key]
  enable_dns64                   = false
  enable_resource_name_dns_a_record_on_launch    = false
  enable_resource_name_dns_aaaa_record_on_launch = false
  ipv6_native                    = false
  map_public_ip_on_launch        = false
  private_dns_hostname_type_on_launch = "ip-name"
  vpc_id                         = aws_vpc.vpc.id
  tags = {
    Name = "${var.environment}-ecs-private-subnet-${each.key}"
  }
}

# DB Private subnets (no NAT Gateway, VPC-local only)
resource "aws_subnet" "db_subnets" {
  for_each                        = toset(var.db_azs)
  assign_ipv6_address_on_creation = false
  availability_zone               = each.key
  cidr_block                     = var.subnet_cidrs.db_private[each.key]
  enable_dns64                   = false
  enable_resource_name_dns_a_record_on_launch    = false
  enable_resource_name_dns_aaaa_record_on_launch = false
  ipv6_native                    = false
  map_public_ip_on_launch        = false
  private_dns_hostname_type_on_launch = "ip-name"
  vpc_id                         = aws_vpc.vpc.id
  tags = {
    Name = "${var.environment}-db-subnet-${each.key}"
  }
}



# Route table associations

# Public subnet associations
resource "aws_route_table_association" "public" {
  for_each       = toset(var.alb_azs)
  subnet_id      = aws_subnet.public_subnets[each.key].id
  route_table_id = aws_route_table.public.id
}

# ECS private subnet associations
resource "aws_route_table_association" "ecs_private" {
  for_each = toset(var.ecs_azs)
  subnet_id = aws_subnet.ecs_private_subnets[each.key].id
  route_table_id = var.nat_strategy == "single" ? aws_route_table.ecs_private["single"].id : aws_route_table.ecs_private[each.key].id
}

# DB private subnet associations (no NAT Gateway)
resource "aws_route_table_association" "db_private" {
  for_each       = toset(var.db_azs)
  subnet_id      = aws_subnet.db_subnets[each.key].id
  route_table_id = aws_route_table.db_private.id
}