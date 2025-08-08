# Lambda function ARNs
output "graph_creator_executor_function_arn" {
  description = "ARN of the Graph Creator Executor lambda function"
  value       = aws_lambda_function.graph_creator_executor.arn
}

output "graph_creator_executor_function_name" {
  description = "Name of the Graph Creator Executor lambda function"
  value       = aws_lambda_function.graph_creator_executor.function_name
}

output "main_agent_executor_function_arn" {
  description = "ARN of the Main Agent Executor lambda function"
  value       = aws_lambda_function.main_agent_executor.arn
}

output "main_agent_executor_function_name" {
  description = "Name of the Main Agent Executor lambda function"
  value       = aws_lambda_function.main_agent_executor.function_name
}

output "document_ingest_function_arn" {
  description = "ARN of the Document Ingest lambda function"
  value       = aws_lambda_function.document_ingest.arn
}

output "document_ingest_function_name" {
  description = "Name of the Document Ingest lambda function"
  value       = aws_lambda_function.document_ingest.function_name
}

# S3 bucket outputs
output "documents_bucket_name" {
  description = "Name of the S3 bucket for document storage"
  value       = aws_s3_bucket.documents.bucket
}

output "documents_bucket_arn" {
  description = "ARN of the S3 bucket for document storage"
  value       = aws_s3_bucket.documents.arn
}


# IAM role
output "lambda_execution_role_arn" {
  description = "ARN of the lambda execution IAM role"
  value       = aws_iam_role.lambda_execution_role.arn
}

# All function ARNs as a map for easy reference
output "function_arns" {
  description = "Map of all lambda function ARNs"
  value = {
    graph_creator         = aws_lambda_function.graph_creator_executor.arn
    main_agent_executor   = aws_lambda_function.main_agent_executor.arn
    document_ingest       = aws_lambda_function.document_ingest.arn
  }
}

# All function names as a map for easy reference
output "function_names" {
  description = "Map of all lambda function names"
  value = {
    graph_creator         = aws_lambda_function.graph_creator_executor.function_name
    main_agent_executor   = aws_lambda_function.main_agent_executor.function_name
    document_ingest       = aws_lambda_function.document_ingest.function_name
  }
} 