terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
    google = {
      source = "hashicorp/google"
    }
  }
  backend "s3" {
    profile = "clancy"
    bucket = "clancy-terraform-state"
    key    = "staging/main.tfstate"
    region = "us-east-1"
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
    push_endpoint = "${local.connect_hub_lb_endpoint}/webhooks/google"
    #push_endpoint = "https://connect-hub.staging.clancy.systems/webhooks/google"
  }
}


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
  
  # ALB needs minimum 2 AZs
  alb_azs = ["us-east-1a", "us-east-1b"]
  # ECS starts with 1 AZ
  ecs_azs = ["us-east-1a"]
  # DB uses 2 AZs for HA
  db_azs  = ["us-east-1a", "us-east-1b"]
  
  # Single NAT Gateway for cost efficiency
  nat_strategy  = "single"
  single_nat_az = "us-east-1a"
  
  subnet_cidrs = {
    public = {
      "us-east-1a" = "10.0.1.0/24"
      "us-east-1b" = "10.0.2.0/24"
    }
    ecs_private = {
      "us-east-1a" = "10.0.11.0/24"
    }
    db_private = {
      "us-east-1a" = "10.0.21.0/24"
      "us-east-1b" = "10.0.22.0/24"
    }
  }
}
module "lambdas" {
  source = "../../modules/lambdas"
  environment = "staging"
  project_name = "clancy"
  vpc_subnet_ids = module.shared.ecs_private_subnet_ids
  vpc_security_group_ids = [module.shared.lb_security_group_id]
  agents_core_api_url = local.agents_core_lb_endpoint
  connect_hub_api_url = local.connect_hub_lb_endpoint

  kinesis_stream_name = "clancy-main-staging"
  kinesis_stream_arn = module.events.kinesis_stream_arn
  lambdas_path = "${path.module}/../../../lambdas"
  openai_api_key_secret_arn = module.shared.openai_api_key_secret_arn
  anthropic_api_key_secret_arn = module.shared.anthropic_api_key_secret_arn
  checkpointer_db_url = module.checkpointer.db_url
  cognito_client_id = module.shared.cognito_user_pool_client_id
  cognito_client_secret = module.shared.cognito_user_pool_client_secret
  cognito_domain = module.shared.cognito_user_pool_domain
  allowed_cors_origins = [
    "http://localhost:5173",  # Local UI development
    "http://localhost:3000",  # Alternative local port
    "https://ui.staging.clancy.systems",  # Staging UI domain
    "https://admin.staging.clancy.systems",  # Admin UI domain
  ]
  tags = {
    Environment = "staging"
    Project = "clancy"
  }
}


module "connect_hub" {
  source = "../../modules/connect_hub"
  environment = "staging"
  vpc_id = module.shared.vpc_id
  db_subnet_ids = module.shared.db_private_subnet_ids
  subnet_ids = module.shared.ecs_private_subnet_ids
  lb_security_group_id = module.shared.lb_security_group_id
  lb_zone_id = module.shared.lb_zone_id
  lb_dns_name = module.shared.lb_dns_name
  lb_listener_arn = module.shared.lb_listener_arn
  image_uri = "${aws_ecr_repository.connect_hub.repository_url}:latest"
  service_discovery_namespace_arn = module.shared.service_discovery_namespace_arn
  cluster_arn = module.shared.cluster_arn
  clerk_publishable_key = module.shared.clerk_publishable_key
  clerk_secret_key = module.shared.clerk_secret_key
  hosted_zone_id = data.aws_route53_zone.clancy_domain.id
  kinesis_stream_name = module.events.kinesis_stream_name
}
module "agents_core" {
  source = "../../modules/agents_core"
  environment = "staging"
  vpc_id = module.shared.vpc_id
  db_subnet_ids = module.shared.db_private_subnet_ids
  subnet_ids = module.shared.ecs_private_subnet_ids
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
  connect_hub_api_url = module.connect_hub.lb_endpoint
  kinesis_stream_name = module.events.kinesis_stream_name
}

module "checkpointer" {
  source = "../../modules/checkpointer"
  environment = "staging"
  vpc_id = module.shared.vpc_id
  subnet_ids = module.shared.db_private_subnet_ids
}

module "events" {
  source = "../../modules/events"
  environment = "staging"
  graph_creator_executor_function_arn = module.lambdas.graph_creator_executor_function_arn
  main_agent_executor_function_arn = module.lambdas.main_agent_executor_function_arn
  agents_core_lb_endpoint = local.agents_core_lb_endpoint
  connect_hub_lb_endpoint = local.connect_hub_lb_endpoint
  cognito_user_pool_client_id = module.shared.cognito_user_pool_client_id
  cognito_user_pool_client_secret = module.shared.cognito_user_pool_client_secret
  cognito_authorization_endpoint = module.shared.cognito_authorization_endpoint
}


locals {
  agents_core_lb_endpoint = module.agents_core.lb_endpoint
  connect_hub_lb_endpoint = module.connect_hub.lb_endpoint
  #agents_core_lb_endpoint = "https://6dd64cbde246.ngrok-free.app"
  #connect_hub_lb_endpoint = "https://99d8eadafaaa.ngrok-free.app"
}

output "shared_subnet_ids" {
  value = module.shared.private_subnet_ids
}

output "shared_security_group_id" {
  value = module.shared.lb_security_group_id
}
