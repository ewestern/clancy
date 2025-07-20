resource "aws_lb_target_group" "connect_hub" {
  name = "connect-hub-tg-${var.environment}"
  port = 3000
  target_type = "ip"
  deregistration_delay  = "30"
  protocol = "HTTP"
  vpc_id = var.vpc_id
  health_check {
    path = "/live"
    port = "traffic-port"
    healthy_threshold = 3
    unhealthy_threshold = 2
    timeout = 5
    interval = 30
  }
  tags = {
    Environment = var.environment
  }
}

resource "aws_lb_listener_rule" "connect_hub_lb_rule" {
  listener_arn = var.lb_listener_arn
  priority     = 3

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.connect_hub.arn
  }

  condition {
    host_header {
      values = [
        "connect-hub.${var.environment}.clancy.systems"
      ]
    }
  }
}
