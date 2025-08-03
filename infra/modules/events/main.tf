resource "aws_cognito_user_pool" "clancy_user_pool" {
  name = "clancy-user-pool-${var.environment}"
}
/*
Client metadata for machine-to-machine (M2M) client credentials

You can pass client metadata in M2M requests. Client metadata is additional information from a user or application environment that can contribute to the outcomes of a Pre token generation Lambda trigger. In authentication operations with a user principal, you can pass client metadata to the pre token generation trigger in the body of AdminRespondToAuthChallenge and RespondToAuthChallenge API requests. Because applications conduct the flow for generation of access tokens for M2M with direct requests to the Token endpoint, they have a different model. In the POST body of token requests for client credentials, pass an aws_client_metadata parameter with the client metadata object URL-encoded (x-www-form-urlencoded) to string. For an example request, see Client credentials with basic authorization. The following is an example parameter that passes the key-value pairs {"environment": "dev", "language": "en-US"}.
*/

resource "aws_cognito_user_pool_client" "clancy_user_pool_client" {
  name = "clancy-user-pool-client-${var.environment}"
  generate_secret     = true
  user_pool_id = aws_cognito_user_pool.clancy_user_pool.id
  allowed_oauth_flows = ["client_credentials"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes = ["https://clancyai.com/all"]
  depends_on = [aws_cognito_resource_server.clancy_resource_server]
}


resource "aws_cognito_resource_server" "clancy_resource_server" {
  identifier = "https://clancyai.com"
  name       = "clancy-resource-server-${var.environment}"

  scope {
    scope_name        = "all"
    scope_description = "All permissions"
  }

  user_pool_id = aws_cognito_user_pool.clancy_user_pool.id
}


resource "aws_kinesis_stream" "clancy_stream" {
  name             = "clancy-main-${var.environment}"

  stream_mode_details {
    stream_mode = "ON_DEMAND"
  }
}
resource "aws_cloudwatch_event_bus" "clancy_main_event_bus" {
  name = "clancy-main-${var.environment}"
}

resource "aws_glue_catalog_database" "clancy_events_database" {
  name = "clancy-events-${var.environment}"
}


resource "aws_kinesis_firehose_delivery_stream" "extended_s3_stream" {
  name        = "clancy-events-${var.environment}"
  destination = "extended_s3"

  extended_s3_configuration {
    role_arn   = aws_iam_role.firehose_role.arn
    bucket_arn = aws_s3_bucket.clancy_events_bucket.arn

    buffering_size = 128

    # https://docs.aws.amazon.com/firehose/latest/dev/dynamic-partitioning.html
    dynamic_partitioning_configuration {
      enabled = "true"
    }

    # Example prefix using partitionKeyFromQuery, applicable to JQ processor
    prefix              = "events/date=!{partitionKeyFromQuery:date}/"
    error_output_prefix = "errors/!{firehose:error-output-type}/"

    processing_configuration {
      enabled = "true"

      # Multi-record deaggregation processor example
      processors {
        type = "MetadataExtraction"
        parameters {
          parameter_name  = "JsonParsingEngine"
          parameter_value = "JQ-1.6"
        }
        parameters {
          parameter_name  = "MetadataExtractionQuery"
          parameter_value = "{date:.timestamp | fromdate | strftime(\"%Y-%m-%d\")}"
        }
      }
      #processors {
      #  type = "AppendDelimiterToRecord"
      #  parameters {
      #    parameter_name  = "Delimiter"
      #    parameter_value = "\n"
      #  }
      #}
    }
  }
    kinesis_source_configuration { # forces replacement
        kinesis_stream_arn = aws_kinesis_stream.clancy_stream.arn
        role_arn           = aws_iam_role.firehose_role.arn
    }
}

resource "aws_s3_bucket" "clancy_events_bucket" {
  bucket = "clancy-events-${var.environment}"
}

data "aws_iam_policy_document" "firehose_assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["firehose.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}
resource "aws_iam_role" "firehose_role" {
  name               = "KinesisFirehoseServiceRole-clancy-events-us-east-1-1753025128345"
  assume_role_policy = data.aws_iam_policy_document.firehose_assume_role.json
  path = "/service-role/"
  lifecycle {
    ignore_changes = [
      managed_policy_arns
    ]
  }
}
data "aws_caller_identity" "main" {}

data "aws_iam_policy_document" "pipes_policy" {
  statement {
    effect    = "Allow"
    actions   = [
      "kinesis:*",
      "lambda:*",
      "events:*"
      ]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "pipes_policy" {
  name        = "pipes-policy-clancy-staging"
  description = "Pipes policy for clancy-staging"
  policy      = data.aws_iam_policy_document.pipes_policy.json
}

resource "aws_iam_role" "pipes_role" {
  name = "pipes-role-clancy-staging"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = {
      Effect = "Allow"
      Action = "sts:AssumeRole"
      Principal = {
        Service = "pipes.amazonaws.com"
      }
      Condition = {
        StringEquals = {
          "aws:SourceAccount" = data.aws_caller_identity.main.account_id
        }
      }
    }
  })
}

resource "aws_iam_role_policy_attachment" "pipes_role_policy_attachment" {
  role       = aws_iam_role.pipes_role.name
  policy_arn = aws_iam_policy.pipes_policy.arn
}

resource "aws_cloudwatch_log_group" "pipes_log_group" {
  name = "pipes-log-group-clancy-staging"
}

resource "aws_pipes_pipe" "event_bus_pipe" {
  name       = "clancy-eventbus-staging"
  role_arn   = aws_iam_role.pipes_role.arn
  source     = aws_kinesis_stream.clancy_stream.arn
  target     = aws_cloudwatch_event_bus.clancy_main_event_bus.arn
  log_configuration {
    level = "ERROR"
    cloudwatch_logs_log_destination {
      log_group_arn = aws_cloudwatch_log_group.pipes_log_group.arn
    }
  }
  source_parameters {
    kinesis_stream_parameters {
      batch_size                         = 10
      maximum_batching_window_in_seconds = 0
      maximum_record_age_in_seconds      = 60
      maximum_retry_attempts             = 10
      starting_position                  = "LATEST"
      parallelization_factor             = 1
    }
  }
  target_parameters {
    input_template = "{\"event\": <$.data>}" 
    eventbridge_event_bus_parameters {
      detail_type = "clancy.event"
      source = aws_kinesis_stream.clancy_stream.name
    }
  }
}


resource "aws_cloudwatch_event_api_destination" "connect_hub" {
  name                             = "connect-hub-staging"
  description                      = "Connect Hub Staging"
  invocation_endpoint              = "${var.connect_hub_lb_endpoint}/*"
  http_method                      = "POST"
  invocation_rate_limit_per_second = 20
  connection_arn                   = aws_cloudwatch_event_connection.clancy_staging_connection.arn
}

resource "aws_cloudwatch_event_api_destination" "agents_core" {
  name                             = "agents-core-staging"
  description                      = "Agents Core Staging"
  invocation_endpoint              = "${var.agents_core_lb_endpoint}/*"
  http_method                      = "POST"
  invocation_rate_limit_per_second = 20
  connection_arn                   = aws_cloudwatch_event_connection.clancy_staging_connection.arn
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
      authorization_endpoint = "https://${aws_cognito_user_pool_domain.main.domain}.auth.us-east-1.amazoncognito.com/oauth2/token"
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


resource "aws_cognito_user_pool_domain" "main" {
  domain       = "clancy"
  user_pool_id = aws_cognito_user_pool.clancy_user_pool.id
}




resource "aws_lambda_permission" "allow_eventbridge_invoke_main_agent_executor" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = var.main_agent_executor_function_arn
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.agent_execution_rule.arn
}



resource "aws_lambda_permission" "allow_eventbridge_invoke_graph_creator_executor" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = var.graph_creator_executor_function_arn
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.graph_creator_execution_rule.arn
}
