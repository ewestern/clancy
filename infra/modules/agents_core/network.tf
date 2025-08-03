resource "aws_security_group" "agents_core_sg" {
  name_prefix = "agents-core-sg-${var.environment}"
  vpc_id      = var.vpc_id
}
resource "aws_security_group_rule" "agents_core_sg_rule_internal" {
  type              = "ingress"
  from_port         = 0
  to_port           = 65535
  protocol          = "tcp"
  self              = true
  security_group_id = aws_security_group.agents_core_sg.id
}
resource "aws_security_group_rule" "agents_core_sg_rule_lb" {
  type              = "ingress"
  from_port         = 0
  to_port           = 65535
  protocol          = "tcp"
  security_group_id = aws_security_group.agents_core_sg.id
  source_security_group_id = var.lb_security_group_id
}

resource "aws_security_group_rule" "agents_core_sg_rule_external" {
  type              = "ingress"
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  ipv6_cidr_blocks  = ["::/0"]
  security_group_id = aws_security_group.agents_core_sg.id
}
resource "aws_vpc_security_group_egress_rule" "allow_all_traffic_ipv4" {
  security_group_id = aws_security_group.agents_core_sg.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1" # semantically equivalent to all ports
} 
