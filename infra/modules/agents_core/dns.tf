resource "aws_route53_record" "agents_core_service" {
  zone_id = var.hosted_zone_id
  name    = "agents-core.${var.environment}.clancy.systems"
  type    = "A"
  alias {
    name                   = var.lb_dns_name
    zone_id                = var.lb_zone_id
    evaluate_target_health = true
  }
}
