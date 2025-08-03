resource "aws_route53_record" "connect_hub_service" {
  zone_id = var.hosted_zone_id
  name    = "connect-hub.${var.environment}.clancy.systems"
  type    = "A"
  alias {
    name                   = var.lb_dns_name
    zone_id                = var.lb_zone_id
    evaluate_target_health = true
  }
}
