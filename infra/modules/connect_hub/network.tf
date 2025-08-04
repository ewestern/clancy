resource "aws_security_group" "connect_hub_sg" {
  name_prefix = "connect-hub-sg-${var.environment}"
  vpc_id      = var.vpc_id
}
resource "aws_security_group_rule" "connect_hub_sg_rule_internal" {
  type              = "ingress"
  from_port         = 0
  to_port           = 65535
  protocol          = "tcp"
  self              = true
  security_group_id = aws_security_group.connect_hub_sg.id
}
resource "aws_security_group_rule" "connect_hub_sg_rule_lb" {
  type              = "ingress"
  from_port         = 0
  to_port           = 65535
  protocol          = "tcp"
  security_group_id = aws_security_group.connect_hub_sg.id
  source_security_group_id = var.lb_security_group_id
}

resource "aws_security_group_rule" "connect_hub_sg_rule_external" {
  type              = "ingress"
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.connect_hub_sg.id
}