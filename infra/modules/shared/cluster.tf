resource "aws_cloudwatch_log_group" "clancy_ecs_cluster_log_group" {
  name = "/aws/ecs/clancy-cluster-${var.environment}"
}


resource "aws_ecs_cluster" "clancy_ecs_cluster" {
  name = "clancy_${var.environment}"
  service_connect_defaults {
    namespace = aws_service_discovery_private_dns_namespace.clancy.arn
  }

  ## PRICEY!!!!!
  #setting {
  #  name  = "containerInsights"
  #  value = "enhanced"
  #}
  configuration {
    execute_command_configuration {
      logging = "OVERRIDE"
      log_configuration {
        cloud_watch_log_group_name = aws_cloudwatch_log_group.clancy_ecs_cluster_log_group.name
      }
    }
  }
}