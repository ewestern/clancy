# Build the lambda functions using npm
resource "null_resource" "build_lambdas" {
  # Trigger rebuild when package.json or source files change
  triggers = {
    package_json = filemd5("${local.lambdas_path}/package.json")
    # You could add more specific triggers for source files if needed
    tsconfig = filemd5("${local.lambdas_path}/tsconfig.json")
    template = filemd5("${local.lambdas_path}/template.yaml")
    graph_creator_executor = filemd5("${local.lambdas_path}/src/graph-creator-executor/handler.ts")
    main_agent_executor = filemd5("${local.lambdas_path}/src/main-agent-executor/handler.ts")
    document_ingest = filemd5("${local.lambdas_path}/src/document-ingest/handler.ts")
    shared_graphCreator = filemd5("${local.lambdas_path}/src/shared/graphCreator.ts")
    shared_index = filemd5("${local.lambdas_path}/src/shared/index.ts")
    shared_utils = filemd5("${local.lambdas_path}/src/shared/utils.ts")
  }

  provisioner "local-exec" {
    command = "cd ${local.lambdas_path} && npm ci && npm run build && sam build"
  }
}

# Archive data sources for each lambda function


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

data "archive_file" "document_ingest" {
  type        = "zip"
  source_dir  = "${local.sam_build_path}/DocumentIngestFunction"
  output_path = "${path.module}/.terraform/archives/document-ingest.zip"
  
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
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# CloudWatch log groups


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
    aws_iam_role_policy_attachment.lambda_vpc_access,
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
    aws_iam_role_policy_attachment.lambda_vpc_access,
    aws_cloudwatch_log_group.main_agent_executor,
  ]

  tags = local.common_tags
}

# =============================================================================
# S3 Bucket for Document Storage
# =============================================================================

resource "aws_s3_bucket" "documents" {
  bucket = local.documents_bucket_name
  tags   = local.common_tags
}

resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = var.allowed_cors_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    id     = "document_lifecycle"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

resource "aws_s3_bucket_public_access_block" "documents" {
  bucket = aws_s3_bucket.documents.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# =============================================================================
# Document Ingestion Lambda Function
# =============================================================================

# Additional IAM role for document ingestion Lambda
resource "aws_iam_role" "document_ingest_role" {
  name = "${var.project_name}-${var.environment}-document-ingest-role"

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

# Basic execution policy for document ingest Lambda
resource "aws_iam_role_policy_attachment" "document_ingest_basic_execution" {
  role       = aws_iam_role.document_ingest_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# VPC access policy for document ingest Lambda (if VPC enabled)
resource "aws_iam_role_policy_attachment" "document_ingest_vpc_access" {
  role       = aws_iam_role.document_ingest_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# S3 access policy for document ingest Lambda
resource "aws_iam_role_policy" "document_ingest_s3_access" {
  name = "${var.project_name}-${var.environment}-document-ingest-s3-policy"
  role = aws_iam_role.document_ingest_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion"
        ]
        Resource = "${aws_s3_bucket.documents.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.documents.arn
      }
    ]
  })
}

# CloudWatch log group for document ingest Lambda
resource "aws_cloudwatch_log_group" "document_ingest" {
  name              = "/aws/lambda/${local.function_names.document_ingest}"
  retention_in_days = var.log_retention_days
  tags              = local.common_tags
}

# Document Ingestion Lambda Function
resource "aws_lambda_function" "document_ingest" {
  filename         = data.archive_file.document_ingest.output_path
  function_name    = local.function_names.document_ingest
  role            = aws_iam_role.document_ingest_role.arn
  handler         = "handler.handler"
  runtime         = "nodejs22.x"
  timeout         = var.document_ingest_timeout
  memory_size     = var.document_ingest_memory_size
  
  source_code_hash = data.archive_file.document_ingest.output_base64sha256

  environment {
    variables = local.document_ingest_env_vars
  }

  dynamic "vpc_config" {
    for_each = local.vpc_config != null ? [local.vpc_config] : []
    content {
      subnet_ids         = vpc_config.value.subnet_ids
      security_group_ids = vpc_config.value.security_group_ids
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.document_ingest_basic_execution,
    aws_iam_role_policy_attachment.document_ingest_vpc_access,
    aws_cloudwatch_log_group.document_ingest,
  ]

  tags = local.common_tags
}

# S3 bucket notification to trigger document ingest Lambda
resource "aws_s3_bucket_notification" "document_ingest_trigger" {
  bucket = aws_s3_bucket.documents.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.document_ingest.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "org/"
    filter_suffix       = ""
  }

  depends_on = [aws_lambda_permission.allow_bucket]
}

# Lambda permission to allow S3 to invoke the function
resource "aws_lambda_permission" "allow_bucket" {
  statement_id  = "AllowExecutionFromS3Bucket"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.document_ingest.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.documents.arn
}