resource "aws_lb_target_group" "agents_core" {
  name = "agents-core-tg-${var.environment}"
  port = 3000
  target_type = "ip"
  deregistration_delay  = "30"
  protocol = "HTTP"
  vpc_id = var.vpc_id
  # Use the simple liveness endpoint that always returns 200 OK.
  # The comprehensive /health route connects to the database and can
  # transiently return 503 during startup, causing the target to flap.
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

resource "aws_lb_listener_rule" "agents_core_lb_rule" {
  listener_arn = var.lb_listener_arn
  priority     = 2

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.agents_core.arn
  }

  condition {
    host_header {
      values = [
        "agents-core.${var.environment}.clancy.systems"
      ]
    }
  }
}
