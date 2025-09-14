data "aws_secretsmanager_secret_version" "openai_api_key" {
  secret_id     = var.openai_api_key_secret_arn
  version_stage = "AWSCURRENT"
}

data "aws_secretsmanager_secret_version" "anthropic_api_key" {
  secret_id     = var.anthropic_api_key_secret_arn
  version_stage = "AWSCURRENT"
}

locals {
  # Common tags for all resources
  common_tags = merge(var.tags, {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Module      = "lambdas"
  })

  # Lambda function names
  function_names = {
    agent_enrichment    = "${var.project_name}-${var.environment}-agent-enrichment"
    graph_creator       = "${var.project_name}-${var.environment}-graph-creator-executor"
    main_agent_executor = "${var.project_name}-${var.environment}-main-agent-executor"
    document_ingest     = "${var.project_name}-${var.environment}-document-ingest"
  }

  # Path to lambdas directory relative to module
  lambdas_path      = var.lambdas_path
  sam_build_path    = "${local.lambdas_path}/.aws-sam/build"
  openai_api_key    = jsondecode(data.aws_secretsmanager_secret_version.openai_api_key.secret_string)["api_key"]
  anthropic_api_key = jsondecode(data.aws_secretsmanager_secret_version.anthropic_api_key.secret_string)["api_key"]

  # Common environment variables for all lambda functions
  common_env_vars = {
    NODE_ENV            = var.environment
    KINESIS_STREAM_NAME = var.kinesis_stream_name
    AGENTS_CORE_API_URL = var.agents_core_api_url
    CONNECT_HUB_API_URL = var.connect_hub_api_url
    OPENAI_API_KEY      = local.openai_api_key
    ANTHROPIC_API_KEY   = local.anthropic_api_key
    CHECKPOINTER_DB_URL = var.checkpointer_db_url
  }

  # Environment variables specific to executor functions
  executor_env_vars = merge(local.common_env_vars, {
    COGNITO_CLIENT_ID     = var.cognito_client_id
    COGNITO_CLIENT_SECRET = var.cognito_client_secret
    COGNITO_DOMAIN        = var.cognito_domain

  })

  # Environment variables specific to document ingestion
  document_ingest_env_vars = merge(local.common_env_vars, {
    DOCUMENTS_BUCKET_NAME = local.documents_bucket_name
    CONNECT_HUB_API_URL   = var.connect_hub_api_url
    OPENAI_API_KEY        = local.openai_api_key
    COGNITO_CLIENT_ID     = var.cognito_client_id
    COGNITO_CLIENT_SECRET = var.cognito_client_secret
    COGNITO_DOMAIN        = var.cognito_domain
  })

  # S3 bucket name for documents
  documents_bucket_name = "${var.project_name}-documents-${var.environment}"

  # VPC configuration
  vpc_config = length(var.vpc_subnet_ids) > 0 ? {
    subnet_ids         = var.vpc_subnet_ids
    security_group_ids = var.vpc_security_group_ids
  } : null

} 