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

  all_public_subnets = {
    for az in var.availability_zones : az =>
    az == "us-east-1a" ? aws_subnet.subnet_public_2a[0].id :
    az == "us-east-1b" ? aws_subnet.subnet_public_2b[0].id :
    az == "us-east-1c" ? aws_subnet.subnet_public_2c[0].id : null
  }

  all_private_subnets = {
    for az in var.availability_zones : az =>
    az == "us-east-1a" ? aws_subnet.subnet_private_2a[0].id :
    az == "us-east-1b" ? aws_subnet.subnet_private_2b[0].id :
    az == "us-east-1c" ? aws_subnet.subnet_private_2c[0].id : null
  }
}

# EIPs for NAT Gateways
resource "aws_eip" "nat_2a" {
  count  = contains(var.availability_zones, "us-east-1a") ? 1 : 0
  domain = "vpc"
}
resource "aws_eip" "nat_2b" {
  count  = contains(var.availability_zones, "us-east-1b") ? 1 : 0
  domain = "vpc"
}
resource "aws_eip" "nat_2c" {
  count  = contains(var.availability_zones, "us-east-1c") ? 1 : 0
  domain = "vpc"
}

# NAT Gateways
resource "aws_nat_gateway" "nat_2a" {
  count         = contains(var.availability_zones, "us-east-1a") ? 1 : 0
  allocation_id = aws_eip.nat_2a[0].id
  subnet_id     = aws_subnet.subnet_public_2a[0].id
  depends_on    = [aws_internet_gateway.gw]
}
resource "aws_nat_gateway" "nat_2b" {
  count         = contains(var.availability_zones, "us-east-1b") ? 1 : 0
  allocation_id = aws_eip.nat_2b[0].id
  subnet_id     = aws_subnet.subnet_public_2b[0].id
  depends_on    = [aws_internet_gateway.gw]
}
resource "aws_nat_gateway" "nat_2c" {
  count         = contains(var.availability_zones, "us-east-1c") ? 1 : 0
  allocation_id = aws_eip.nat_2c[0].id
  subnet_id     = aws_subnet.subnet_public_2c[0].id
  depends_on    = [aws_internet_gateway.gw]
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

# Private route tables
resource "aws_route_table" "private_2a" {
  count  = contains(var.availability_zones, "us-east-1a") ? 1 : 0
  vpc_id = aws_vpc.vpc.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat_2a[0].id
  }
  tags = {
    Name = "clancy-${var.environment}-private-route-table-2a"
  }
}

resource "aws_route_table" "private_2b" {
  count  = contains(var.availability_zones, "us-east-1b") ? 1 : 0
  vpc_id = aws_vpc.vpc.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat_2b[0].id
  }
  tags = {
    Name = "clancy-${var.environment}-private-route-table-2b"
  }
}

resource "aws_route_table" "private_2c" {
  count  = contains(var.availability_zones, "us-east-1c") ? 1 : 0
  vpc_id = aws_vpc.vpc.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat_2c[0].id
  }
  tags = {
    Name = "clancy-${var.environment}-private-route-table-2c"
  }
}

# Subnets
resource "aws_subnet" "subnet_public_2a" {
  count                                          = contains(var.availability_zones, "us-east-1a") ? 1 : 0
  assign_ipv6_address_on_creation                = "false"
  availability_zone                              = "us-east-1a"
  cidr_block                                     = var.subnet_cidrs["public_2a"]
  enable_dns64                                   = "false"
  enable_resource_name_dns_a_record_on_launch    = "false"
  enable_resource_name_dns_aaaa_record_on_launch = "false"
  ipv6_native                                    = "false"
  map_public_ip_on_launch                        = true
  private_dns_hostname_type_on_launch            = "ip-name"
  vpc_id                                         = aws_vpc.vpc.id
  tags = {
    Name = "${var.environment}-public-subnet-2a"
  }
}
resource "aws_subnet" "subnet_private_2a" {
  count                                          = contains(var.availability_zones, "us-east-1a") ? 1 : 0
  assign_ipv6_address_on_creation                = "false"
  availability_zone                              = "us-east-1a"
  cidr_block                                     = var.subnet_cidrs["private_2a"]
  enable_dns64                                   = "false"
  enable_resource_name_dns_a_record_on_launch    = "false"
  enable_resource_name_dns_aaaa_record_on_launch = "false"
  ipv6_native                                    = "false"
  map_public_ip_on_launch                        = "false"
  private_dns_hostname_type_on_launch            = "ip-name"
  vpc_id                                         = aws_vpc.vpc.id
  tags = {
    Name = "${var.environment}-private-subnet-2a"
  }
}
resource "aws_subnet" "subnet_private_2b" {
  count                                          = contains(var.availability_zones, "us-east-1b") ? 1 : 0
  assign_ipv6_address_on_creation                = "false"
  availability_zone                              = "us-east-1b"
  cidr_block                                     = var.subnet_cidrs["private_2b"]
  enable_dns64                                   = "false"
  enable_resource_name_dns_a_record_on_launch    = "false"
  enable_resource_name_dns_aaaa_record_on_launch = "false"
  ipv6_native                                    = "false"
  map_public_ip_on_launch                        = false
  private_dns_hostname_type_on_launch            = "ip-name"
  vpc_id                                         = aws_vpc.vpc.id
  tags = {
    Name = "${var.environment}-private-subnet-2b"
  }
}
resource "aws_subnet" "subnet_public_2b" {
  count                                          = contains(var.availability_zones, "us-east-1b") ? 1 : 0
  assign_ipv6_address_on_creation                = "false"
  availability_zone                              = "us-east-1b"
  cidr_block                                     = var.subnet_cidrs["public_2b"]
  enable_dns64                                   = "false"
  enable_resource_name_dns_a_record_on_launch    = "false"
  enable_resource_name_dns_aaaa_record_on_launch = "false"
  ipv6_native                                    = "false"
  map_public_ip_on_launch                        = true
  private_dns_hostname_type_on_launch            = "ip-name"
  vpc_id                                         = aws_vpc.vpc.id
  tags = {
    Name = "${var.environment}-public-subnet-2b"
  }
}
resource "aws_subnet" "subnet_private_2c" {
  count                                          = contains(var.availability_zones, "us-east-1c") ? 1 : 0
  assign_ipv6_address_on_creation                = "false"
  availability_zone                              = "us-east-1c"
  cidr_block                                     = var.subnet_cidrs["private_2c"]
  enable_dns64                                   = "false"
  enable_resource_name_dns_a_record_on_launch    = "false"
  enable_resource_name_dns_aaaa_record_on_launch = "false"
  ipv6_native                                    = "false"
  map_public_ip_on_launch                        = false
  private_dns_hostname_type_on_launch            = "ip-name"
  vpc_id                                         = aws_vpc.vpc.id
  tags = {
    Name = "${var.environment}-private-subnet-2c"
  }
}
resource "aws_subnet" "subnet_public_2c" {
  count                                          = contains(var.availability_zones, "us-east-1c") ? 1 : 0
  assign_ipv6_address_on_creation                = "false"
  availability_zone                              = "us-east-1c"
  cidr_block                                     = var.subnet_cidrs["public_2c"]
  enable_dns64                                   = "false"
  enable_resource_name_dns_a_record_on_launch    = "false"
  enable_resource_name_dns_aaaa_record_on_launch = "false"
  ipv6_native                                    = "false"
  map_public_ip_on_launch                        = "true"
  private_dns_hostname_type_on_launch            = "ip-name"
  vpc_id                                         = aws_vpc.vpc.id
  tags = {
    Name = "${var.environment}-public-subnet-2c"
  }
}

# Route table associations
resource "aws_route_table_association" "public_2a" {
  count          = contains(var.availability_zones, "us-east-1a") ? 1 : 0
  subnet_id      = aws_subnet.subnet_public_2a[0].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private_2a" {
  count          = contains(var.availability_zones, "us-east-1a") ? 1 : 0
  subnet_id      = aws_subnet.subnet_private_2a[0].id
  #route_table_id = aws_route_table.public.id
  route_table_id = aws_route_table.private_2a[0].id
}

resource "aws_route_table_association" "private_2b" {
  count          = contains(var.availability_zones, "us-east-1b") ? 1 : 0
  subnet_id      = aws_subnet.subnet_private_2b[0].id
  #route_table_id = aws_route_table.public.id
  route_table_id = aws_route_table.private_2b[0].id
}

resource "aws_route_table_association" "public_2b" {
  count          = contains(var.availability_zones, "us-east-1b") ? 1 : 0
  subnet_id      = aws_subnet.subnet_public_2b[0].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_2c" {
  count          = contains(var.availability_zones, "us-east-1c") ? 1 : 0
  subnet_id      = aws_subnet.subnet_public_2c[0].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private_2c" {
  count          = contains(var.availability_zones, "us-east-1c") ? 1 : 0
  subnet_id      = aws_subnet.subnet_private_2c[0].id
  route_table_id = aws_route_table.private_2c[0].id
  #route_table_id = aws_route_table.public.id
}