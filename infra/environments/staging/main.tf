terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
    google = {
      source = "hashicorp/google"
    }
  }
}

provider "aws" {
  profile = "clancy"
  region = "us-east-1"
}

provider "google" {
  alias = "google"
  project     = "clancy-464816"
}


resource "google_pubsub_topic" "clancy_connect_hub_staging" {
  provider = google.google
  name = "clancy-connect-hub-staging"
}


resource "google_pubsub_subscription" "clancy_connect_hub_staging" {
  provider = google.google
  name = "clancy-connect-hub-staging-subscription"
  topic = google_pubsub_topic.clancy_connect_hub_staging.name
  push_config {
    push_endpoint = "https://clancy-connect-hub-staging.onrender.com/webhook"
  }
}



resource "aws_schemas_registry" "clancy_schema_registry" {
  name        = "clancy-schema-registry-staging"
  description = "Clancy schema registry"
}

#resource "aws_cognito_user_pool" "clancy_user_pool" {
#  name = "clancy-user-pool-staging"
#}
#
#resource "aws_cognito_user_pool_client" "clancy_user_pool_client" {
#  name = "clancy-user-pool-client-staging"
#  generate_secret     = true
#  user_pool_id = aws_cognito_user_pool.clancy_user_pool.id
#  allowed_oauth_flows = ["client_credentials"]
#  allowed_oauth_scopes = ["https://clancyai.com/all"]
#  depends_on = [aws_cognito_resource_server.clancy_resource_server]
#}
#
#
#resource "aws_cognito_resource_server" "clancy_resource_server" {
#  identifier = "https://clancyai.com"
#  name       = "clancy-resource-server-staging"
#
#  scope {
#    scope_name        = "all"
#    scope_description = "All permissions"
#  }
#
#  user_pool_id = aws_cognito_user_pool.clancy_user_pool.id
#}
#
#
#resource "aws_kinesis_stream" "clancy_stream" {
#  name             = "clancy-main-staging"
#
#  stream_mode_details {
#    stream_mode = "ON_DEMAND"
#  }
#}

resource "aws_ecr_repository" "connect_hub" {
  name                 = "clancy/connect-hub"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}
resource "aws_ecr_repository" "agents_core" {
  name                 = "clancy/agents-core"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

data "aws_route53_zone" "clancy_domain" {
  name         = "clancy.systems."
  private_zone = false
}
data "aws_acm_certificate" "issued" {
  domain   = "*.staging.clancy.systems"
  statuses = ["ISSUED"]
}

module "shared" {
  source = "../../modules/shared"
  environment = "staging"
  certificate_arn = data.aws_acm_certificate.issued.arn
  availability_zones = ["us-east-1a", "us-east-1b"]

}
module "lambdas" {
  source = "../../modules/lambdas"
  environment = "staging"
  project_name = "clancy"
  vpc_subnet_ids = values(module.shared.private_subnet_ids)
  vpc_security_group_ids = [module.shared.lb_security_group_id]
  agents_core_api_url = "https://283eed2afd74.ngrok-free.app"
  connect_hub_api_url = "https://f84eda44776c.ngrok-free.app"
  #agents_core_api_url = module.agents_core.lb_endpoint
  #connect_hub_api_url = module.connect_hub.lb_endpoint

  kinesis_stream_name = "clancy-main-staging"
  kinesis_stream_arn = module.events.kinesis_stream_arn
  lambdas_path = "${path.module}/../../../lambdas"
  openai_api_key_secret_arn = module.shared.openai_api_key_secret_arn
  anthropic_api_key_secret_arn = module.shared.anthropic_api_key_secret_arn
  checkpointer_db_url = module.checkpointer.db_url
  tags = {
    Environment = "staging"
    Project = "clancy"
  }
}
module "connect_hub" {
  source = "../../modules/connect_hub"
  environment = "staging"
  vpc_id = module.shared.vpc_id
  subnet_ids = values(module.shared.private_subnet_ids)
  lb_security_group_id = module.shared.lb_security_group_id
  lb_zone_id = module.shared.lb_zone_id
  lb_dns_name = module.shared.lb_dns_name
  lb_listener_arn = module.shared.lb_listener_arn
  image_uri = "${aws_ecr_repository.agents_core.repository_url}:latest"
  service_discovery_namespace_arn = module.shared.service_discovery_namespace_arn
  cluster_arn = module.shared.cluster_arn
  clerk_publishable_key = module.shared.clerk_publishable_key
  clerk_secret_key = module.shared.clerk_secret_key
  hosted_zone_id = data.aws_route53_zone.clancy_domain.id
}
module "agents_core" {
  source = "../../modules/agents_core"
  environment = "staging"
  vpc_id = module.shared.vpc_id
  subnet_ids = values(module.shared.private_subnet_ids)
  lb_security_group_id = module.shared.lb_security_group_id
  lb_zone_id = module.shared.lb_zone_id
  lb_dns_name = module.shared.lb_dns_name
  lb_listener_arn = module.shared.lb_listener_arn
  image_uri = "${aws_ecr_repository.agents_core.repository_url}:latest"
  service_discovery_namespace_arn = module.shared.service_discovery_namespace_arn
  cluster_arn = module.shared.cluster_arn
  clerk_publishable_key = module.shared.clerk_publishable_key
  clerk_secret_key = module.shared.clerk_secret_key
  hosted_zone_id = data.aws_route53_zone.clancy_domain.id
}

module "checkpointer" {
  source = "../../modules/checkpointer"
  environment = "staging"
  vpc_id = module.shared.vpc_id
  subnet_ids = values(module.shared.private_subnet_ids)
}

module "events" {
  source = "../../modules/events"
  environment = "staging"
  graph_creator_executor_function_arn = module.lambdas.graph_creator_executor_function_arn
  main_agent_executor_function_arn = module.lambdas.main_agent_executor_function_arn
  agents_core_lb_endpoint = "https://283eed2afd74.ngrok-free.app"
  connect_hub_lb_endpoint = "https://f84eda44776c.ngrok-free.app"
  //connect_hub_lb_endpoint = module.connect_hub.lb_endpoint
}

output "shared_subnet_ids" {
  value = module.shared.private_subnet_ids
}

output "shared_security_group_id" {
  value = module.shared.lb_security_group_id
}