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
  security_group_id = aws_security_group.agents_core_sg.id
}

resource "aws_security_group_rule" "agents_core_sg_rule_egress_all" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "all"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.agents_core_sg.id
}


