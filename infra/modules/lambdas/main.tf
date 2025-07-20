# Build the lambda functions using npm
resource "null_resource" "build_lambdas" {
  # Trigger rebuild when package.json or source files change
  triggers = {
    package_json = filemd5("${local.lambdas_path}/package.json")
    # You could add more specific triggers for source files if needed
    tsconfig = filemd5("${local.lambdas_path}/tsconfig.json")
    tsconfig = filemd5("${local.lambdas_path}/template.yaml")
    graph_creator_executor = filemd5("${local.lambdas_path}/src/graph-creator-executor/handler.ts")
    main_agent_executor = filemd5("${local.lambdas_path}/src/main-agent-executor/handler.ts")
    shared_graphCreator = filemd5("${local.lambdas_path}/src/shared/graphCreator.ts")
    shared_index = filemd5("${local.lambdas_path}/src/shared/index.ts")
    shared_utils = filemd5("${local.lambdas_path}/src/shared/utils.ts")
    agent_enrichment = filemd5("${local.lambdas_path}/src/agent-enrichment/handler.ts")
  }

  provisioner "local-exec" {
    command = "cd ${local.lambdas_path} && npm ci && npm run build && sam build"
  }
}

# Archive data sources for each lambda function
data "archive_file" "agent_enrichment" {
  type        = "zip"
  source_dir  = "${local.sam_build_path}/AgentEnrichmentFunction"
  output_path = "${path.module}/.terraform/archives/agent-enrichment.zip"
  
  depends_on = [null_resource.build_lambdas]
}

data "archive_file" "graph_creator_executor" {
  type        = "zip"
  source_dir  = "${local.sam_build_path}/GraphCreatorExecutorFunction"
  output_path = "${path.module}/.terraform/archives/graph-creator-executor.zip"
  
  depends_on = [null_resource.build_lambdas]
}

data "archive_file" "main_agent_executor" {
  type        = "zip"
  source_dir  = "${local.sam_build_path}/MainAgentExecutorFunction"
  output_path = "${path.module}/.terraform/archives/main-agent-executor.zip"
  
  depends_on = [null_resource.build_lambdas]
}


# IAM role for lambda execution
resource "aws_iam_role" "lambda_execution_role" {
  name = "${var.project_name}-${var.environment}-lambda-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

# Basic lambda execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Kinesis publishing policy
resource "aws_iam_role_policy" "kinesis_publish" {
  name = "${var.project_name}-${var.environment}-lambda-kinesis-policy"
  role = aws_iam_role.lambda_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kinesis:PutRecord",
          "kinesis:PutRecords"
        ]
        Resource = var.kinesis_stream_arn
      }
    ]
  })
}

# VPC access policy (only created if VPC is enabled)
resource "aws_iam_role_policy_attachment" "lambda_vpc_access" {
  count      = local.vpc_enabled ? 1 : 0
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# CloudWatch log groups
resource "aws_cloudwatch_log_group" "agent_enrichment" {
  name              = "/aws/lambda/${local.function_names.agent_enrichment}"
  retention_in_days = var.log_retention_days
  tags              = local.common_tags
}

resource "aws_cloudwatch_log_group" "graph_creator_executor" {
  name              = "/aws/lambda/${local.function_names.graph_creator}"
  retention_in_days = var.log_retention_days
  tags              = local.common_tags
}

resource "aws_cloudwatch_log_group" "main_agent_executor" {
  name              = "/aws/lambda/${local.function_names.main_agent_executor}"
  retention_in_days = var.log_retention_days
  tags              = local.common_tags
}


# Lambda function: Agent Enrichment
resource "aws_lambda_function" "agent_enrichment" {
  filename         = data.archive_file.agent_enrichment.output_path
  function_name    = local.function_names.agent_enrichment
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "handler.lambdaHandler"
  runtime         = "nodejs22.x"
  timeout         = var.lambda_timeout
  memory_size     = var.lambda_memory_size
  
  source_code_hash = data.archive_file.agent_enrichment.output_base64sha256

  environment {
    variables = local.enrichment_env_vars
  }

  dynamic "vpc_config" {
    for_each = local.vpc_config != null ? [local.vpc_config] : []
    content {
      subnet_ids         = vpc_config.value.subnet_ids
      security_group_ids = vpc_config.value.security_group_ids
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_cloudwatch_log_group.agent_enrichment,
  ]

  tags = local.common_tags
}

# Lambda function: Graph Creator Executor
resource "aws_lambda_function" "graph_creator_executor" {
  filename         = data.archive_file.graph_creator_executor.output_path
  function_name    = local.function_names.graph_creator
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "handler.lambdaHandler"
  runtime         = "nodejs22.x"
  timeout         = var.executor_timeout
  memory_size     = var.lambda_memory_size
  
  source_code_hash = data.archive_file.graph_creator_executor.output_base64sha256

  environment {
    variables = local.executor_env_vars
  }

  dynamic "vpc_config" {
    for_each = local.vpc_config != null ? [local.vpc_config] : []
    content {
      subnet_ids         = vpc_config.value.subnet_ids
      security_group_ids = vpc_config.value.security_group_ids
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_cloudwatch_log_group.graph_creator_executor,
  ]

  tags = local.common_tags
}

# Lambda function: Main Agent Executor
resource "aws_lambda_function" "main_agent_executor" {
  filename         = data.archive_file.main_agent_executor.output_path
  function_name    = local.function_names.main_agent_executor
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "handler.lambdaHandler"
  runtime         = "nodejs22.x"
  timeout         = var.executor_timeout
  memory_size     = var.lambda_memory_size
  
  source_code_hash = data.archive_file.main_agent_executor.output_base64sha256

  environment {
    variables = local.executor_env_vars
  }

  dynamic "vpc_config" {
    for_each = local.vpc_config != null ? [local.vpc_config] : []
    content {
      subnet_ids         = vpc_config.value.subnet_ids
      security_group_ids = vpc_config.value.security_group_ids
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_cloudwatch_log_group.main_agent_executor,
  ]

  tags = local.common_tags
}