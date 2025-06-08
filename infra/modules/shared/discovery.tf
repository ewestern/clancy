resource "aws_service_discovery_private_dns_namespace" "clancy" {
  name        = "clancy-${var.environment}"
  vpc         = aws_vpc.vpc.id
}