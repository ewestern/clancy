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

resource "aws_cloudwatch_event_bus" "clancy_main_event_bus" {
  name = "clancy-main-staging"
}

resource "aws_schemas_registry" "clancy_schema_registry" {
  name        = "clancy-schema-registry-staging"
  description = "Clancy schema registry"
}

resource "aws_cognito_user_pool" "clancy_user_pool" {
  name = "clancy-user-pool-staging"
}

resource "aws_cognito_user_pool_client" "clancy_user_pool_client" {
  name = "clancy-user-pool-client-staging"
  generate_secret     = true
  user_pool_id = aws_cognito_user_pool.clancy_user_pool.id
  allowed_oauth_flows = ["client_credentials"]
  allowed_oauth_scopes = ["https://clancyai.com/all"]
  depends_on = [aws_cognito_resource_server.clancy_resource_server]
}

resource "aws_cloudwatch_event_connection" "clancy_staging_connection" {
  name               = "clancy-connection-staging"
  description        = "Clancy Staging Connection"
  authorization_type = "OAUTH_CLIENT_CREDENTIALS"

  auth_parameters {
    oauth {
      client_parameters {
        client_id = aws_cognito_user_pool_client.clancy_user_pool_client.id
        client_secret = aws_cognito_user_pool_client.clancy_user_pool_client.client_secret
      }
      http_method = "POST"
      authorization_endpoint = "https://clancy.auth.us-east-1.amazoncognito.com/oauth2/token"
      oauth_http_parameters {
        body {
          key             = "scope"
          value           = "https://clancyai.com/all"
          is_value_secret = false
        }
        body {
          key             = "grant_type"
          value           = "client_credentials"
          is_value_secret = false
        }
      }
    }
  }
}
resource "aws_cognito_resource_server" "clancy_resource_server" {
  identifier = "https://clancyai.com"
  name       = "clancy-resource-server-staging"

  scope {
    scope_name        = "all"
    scope_description = "All permissions"
  }

  user_pool_id = aws_cognito_user_pool.clancy_user_pool.id
}


resource "aws_cloudwatch_event_api_destination" "agents_core" {
  name                             = "agents-core-staging"
  description                      = "Agents Core Staging"
  invocation_endpoint              = "https://7e8808c80e54.ngrok-free.app/*"
  http_method                      = "POST"
  invocation_rate_limit_per_second = 20
  connection_arn                   = aws_cloudwatch_event_connection.clancy_staging_connection.arn
}
import {
  to = aws_cloudwatch_event_api_destination.agents_core
  id = "agents-core-staging"
}


resource "aws_cognito_user_pool_domain" "main" {
  domain       = "clancy"
  user_pool_id = aws_cognito_user_pool.clancy_user_pool.id
}



resource "aws_schemas_schema" "event_schema" {
  name          = "event_schema"
  registry_name = aws_schemas_registry.clancy_schema_registry.name
  type          = "OpenApi3"
  description   = "The schema definition for event"

  content = jsonencode({
    "openapi" : "3.0.0",
    "info" : {
      "version" : "1.0.0",
      "title" : "Event"
    },
    "paths" : {},
    "components" : {
      "schemas" : {
        "Event" : {
          "type" : "object",
          "properties" : {
            "type" : {
              "type" : "string"
            },
            "data" : {
              "type" : "object"
            },
            "event_time" : {
              "type" : "number"
            }
          }
        }
      }
    }
  })
}

resource "aws_cloudwatch_event_rule" "human_approval_rule" {
  name        = "human-approval-rule"
  description = "Capture each human approval"
  event_bus_name = aws_cloudwatch_event_bus.clancy_main_event_bus.name

  event_pattern = jsonencode({
    detail = {
      type = [
        "request_approval"
      ]
    }
  })
}
resource "aws_cloudwatch_event_target" "agents_core_target" {
  rule = aws_cloudwatch_event_rule.human_approval_rule.name
  arn = aws_cloudwatch_event_api_destination.agents_core.arn
  event_bus_name = aws_cloudwatch_event_bus.clancy_main_event_bus.name
  role_arn = "arn:aws:iam::702853186114:role/service-role/Amazon_EventBridge_Invoke_Api_Destination_336818126"
  input_path = "$.detail.data"
  http_target {
    path_parameter_values = [
      "v1/approvals"
    ]
  }
}

#data "aws_caller_identity" "main" {}
#
#resource "aws_iam_role" "clancy_pipe_role" {
#  assume_role_policy = jsonencode({
#    Version = "2012-10-17"
#    Statement = {
#      Effect = "Allow"
#      Action = "sts:AssumeRole"
#      Principal = {
#        Service = "pipes.amazonaws.com"
#      }
#      Condition = {
#        StringEquals = {
#          "aws:SourceAccount" = data.aws_caller_identity.main.account_id
#        }
#      }
#    }
#  })
#}

#resource "aws_iam_role_policy" "clancy_pipe_source_policy" {
#  provider = aws.aws
#  role = aws_iam_role.clancy_pipe_role.id
#  policy = jsonencode({
#    Version = "2012-10-17"
#    Statement = {
#      Effect = "Allow"
#      Action = [
#        "kinesis:GetRecords", 
#        "kinesis:DescribeStream",
#        "kinesis:ListStreams"
#      ]
#      Resource = aws_kinesis_stream.clancy_stream.arn
#      Condition = {
#        StringEquals = {
#          "aws:SourceAccount" = data.aws_caller_identity.main.account_id
#        }
#      }
#    }
#  })
#}
#
#resource "aws_pipes_pipe" "clancy_pipe" {
#  name       = "clancy-main-staging"
#  lifecycle {
#    ignore_changes = [
#      role_arn,
#      log_configuration[0].cloudwatch_logs_log_destination[0].log_group_arn
#    ]
#  }
#  role_arn   = ""
#  source     = aws_kinesis_stream.clancy_stream.arn
#  target     = aws_cloudwatch_event_api_destination.agents_core.arn
#  log_configuration {
#    level = "ERROR"
#    cloudwatch_logs_log_destination {
#      log_group_arn = ""
#    }
#  }
#  target_parameters {
#    http_parameters {
#      path_parameter_values = [
#        "$.detail.data"
#      ]
#      query_string_parameters = {}
#    }
#  }
#}


resource "aws_kinesis_stream" "clancy_stream" {
  name             = "clancy-main-staging"

  stream_mode_details {
    stream_mode = "ON_DEMAND"
  }
}


module "shared" {
  source = "../../modules/shared"
  environment = "staging"
  certificate_arn = "arn:aws:acm:us-east-1:702853186114:certificate/e16386cb-42ab-489d-a05b-5ab5a193648c"
  availability_zones = ["us-east-1a", "us-east-1b"]

}
module "lambdas" {
  source = "../../modules/lambdas"
  environment = "staging"
  project_name = "clancy"
  vpc_subnet_ids = values(module.shared.private_subnet_ids)
  vpc_security_group_ids = [module.shared.lb_security_group_id]
  agents_core_api_url = "https://agents-core-staging.onrender.com"
  connect_hub_api_url = "https://clancy-connect-hub-staging.onrender.com"
  kinesis_stream_name = "clancy-main-staging"
  kinesis_stream_arn = aws_kinesis_stream.clancy_stream.arn
  lambdas_path = "${path.module}/../../../lambdas"
  tags = {
    Environment = "staging"
    Project = "clancy"
  }
}
output "shared_subnet_ids" {
  value = module.shared.private_subnet_ids
}

output "shared_security_group_id" {
  value = module.shared.lb_security_group_id
}