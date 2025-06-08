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
    agent_enrichment      = "${var.project_name}-${var.environment}-agent-enrichment"
    graph_creator         = "${var.project_name}-${var.environment}-graph-creator-executor"
    main_agent_executor   = "${var.project_name}-${var.environment}-main-agent-executor"
  }

  # Path to lambdas directory relative to module
  lambdas_path = var.lambdas_path

  # Common environment variables for all lambda functions
  common_env_vars = {
    NODE_ENV             = var.environment
    KINESIS_STREAM_NAME  = var.kinesis_stream_name
  }

  # Environment variables specific to agent enrichment
  enrichment_env_vars = merge(local.common_env_vars, {
    AGENTS_CORE_API_URL = var.agents_core_api_url
  })

  # Environment variables specific to executor functions
  executor_env_vars = merge(local.common_env_vars, {
    CONNECT_HUB_API_URL = var.connect_hub_api_url
  })

  # VPC configuration
  vpc_config = length(var.vpc_subnet_ids) > 0 ? {
    subnet_ids         = var.vpc_subnet_ids
    security_group_ids = var.vpc_security_group_ids
  } : null

  # Determine if VPC configuration is enabled
  vpc_enabled = length(var.vpc_subnet_ids) > 0
} 