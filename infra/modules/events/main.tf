


resource "aws_kinesis_stream" "clancy_stream" {
  name             = "clancy-main-${var.environment}"

  stream_mode_details {
    stream_mode = "ON_DEMAND"
  }
}
data "aws_cloudwatch_event_bus" "default" {
  name = "default"
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

# IAM policy document for Firehose permissions
data "aws_iam_policy_document" "firehose_policy" {
  # Kinesis stream permissions
  statement {
    effect = "Allow"
    actions = [
      "kinesis:DescribeStream",
      "kinesis:GetShardIterator",
      "kinesis:GetRecords",
      "kinesis:ListShards"
    ]
    resources = [aws_kinesis_stream.clancy_stream.arn]
  }

  # S3 permissions
  statement {
    effect = "Allow"
    actions = [
      "s3:AbortMultipartUpload",
      "s3:GetBucketLocation",
      "s3:GetObject",
      "s3:ListBucket",
      "s3:ListBucketMultipartUploads",
      "s3:PutObject"
    ]
    resources = [
      aws_s3_bucket.clancy_events_bucket.arn,
      "${aws_s3_bucket.clancy_events_bucket.arn}/*"
    ]
  }

  # Glue permissions for dynamic partitioning
  statement {
    effect = "Allow"
    actions = [
      "glue:GetTable",
      "glue:GetTableVersion",
      "glue:GetTableVersions"
    ]
    resources = [
      "arn:aws:glue:*:${data.aws_caller_identity.main.account_id}:catalog",
      "arn:aws:glue:*:${data.aws_caller_identity.main.account_id}:database/${aws_glue_catalog_database.clancy_events_database.name}",
      "arn:aws:glue:*:${data.aws_caller_identity.main.account_id}:table/${aws_glue_catalog_database.clancy_events_database.name}/*"
    ]
  }

  # CloudWatch Logs permissions
  statement {
    effect = "Allow"
    actions = [
      "logs:PutLogEvents"
    ]
    resources = ["arn:aws:logs:*:${data.aws_caller_identity.main.account_id}:*"]
  }
}

# IAM policy for Firehose
resource "aws_iam_policy" "firehose_policy" {
  name        = "firehose-policy-clancy-${var.environment}"
  description = "Policy for Kinesis Firehose to access Kinesis stream and S3 bucket"
  policy      = data.aws_iam_policy_document.firehose_policy.json
}

# Attach policy to Firehose role
resource "aws_iam_role_policy_attachment" "firehose_policy_attachment" {
  role       = aws_iam_role.firehose_role.name
  policy_arn = aws_iam_policy.firehose_policy.arn
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
  name        = "pipes-policy-clancy-${var.environment}"
  description = "Pipes policy for clancy-${var.environment}"
  policy      = data.aws_iam_policy_document.pipes_policy.json
}

resource "aws_iam_role" "pipes_role" {
  name = "pipes-role-clancy-${var.environment}"
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
  name = "pipes-log-group-clancy-${var.environment}"
}

resource "aws_pipes_pipe" "event_bus_pipe" {
  name       = "clancy-eventbus-${var.environment}"
  role_arn   = aws_iam_role.pipes_role.arn
  source     = aws_kinesis_stream.clancy_stream.arn
  target     = data.aws_cloudwatch_event_bus.default.arn
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
  name                             = "connect-hub-${var.environment}"
  description                      = "Connect Hub ${title(var.environment)}"
  invocation_endpoint              = "${var.connect_hub_lb_endpoint}/*"
  http_method                      = "POST"
  invocation_rate_limit_per_second = 20
  connection_arn                   = aws_cloudwatch_event_connection.clancy_connection.arn
}

resource "aws_cloudwatch_event_api_destination" "agents_core" {
  name                             = "agents-core-${var.environment}"
  description                      = "Agents Core ${title(var.environment)}"
  invocation_endpoint              = "${var.agents_core_lb_endpoint}/*"
  http_method                      = "POST"
  invocation_rate_limit_per_second = 20
  connection_arn                   = aws_cloudwatch_event_connection.clancy_connection.arn
}
locals {
  authorization_endpoint = var.cognito_authorization_endpoint
}

resource "aws_cloudwatch_event_connection" "clancy_connection" {
  name               = "clancy-connection-${var.environment}"
  description        = "Clancy Connection"
  authorization_type = "OAUTH_CLIENT_CREDENTIALS"

  auth_parameters {
    ##invocation_http_parameters {
    ##}
          oauth {
        client_parameters {
          client_id = var.cognito_user_pool_client_id
          client_secret = var.cognito_user_pool_client_secret
        }
      http_method = "POST"
      authorization_endpoint = local.authorization_endpoint
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

# IAM role for EventBridge to invoke Agents Core API destination
resource "aws_iam_role" "eventbridge_agents_core_role" {
  name = "eventbridge-agents-core-role-${var.environment}"
  path = "/service-role/"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

# IAM policy for invoking API destinations
resource "aws_iam_policy" "eventbridge_agents_core_policy" {
  name        = "eventbridge-agents-core-policy-${var.environment}"
  description = "Policy for EventBridge to invoke Agents Core API destination"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "events:InvokeApiDestination",
        ]
        Resource = aws_cloudwatch_event_api_destination.agents_core.arn
      }
    ]
  })
}

# Attach policy to Agents Core role
resource "aws_iam_role_policy_attachment" "eventbridge_agents_core_attachment" {
  role       = aws_iam_role.eventbridge_agents_core_role.name
  policy_arn = aws_iam_policy.eventbridge_agents_core_policy.arn
}

# IAM role for EventBridge to invoke Connect Hub API destination
resource "aws_iam_role" "eventbridge_connect_hub_role" {
  name = "eventbridge-connect-hub-role-${var.environment}"
  path = "/service-role/"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

# IAM policy for invoking Connect Hub API destination
resource "aws_iam_policy" "eventbridge_connect_hub_policy" {
  name        = "eventbridge-connect-hub-policy-${var.environment}"
  description = "Policy for EventBridge to invoke Connect Hub API destination"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "events:InvokeApiDestination"
        ]
        Resource = aws_cloudwatch_event_api_destination.connect_hub.arn
      }
    ]
  })
}

# Attach policy to Connect Hub role
resource "aws_iam_role_policy_attachment" "eventbridge_connect_hub_attachment" {
  role       = aws_iam_role.eventbridge_connect_hub_role.name
  policy_arn = aws_iam_policy.eventbridge_connect_hub_policy.arn
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
