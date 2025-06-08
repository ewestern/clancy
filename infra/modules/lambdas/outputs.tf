# Lambda function ARNs
output "agent_enrichment_function_arn" {
  description = "ARN of the Agent Enrichment lambda function"
  value       = aws_lambda_function.agent_enrichment.arn
}

output "agent_enrichment_function_name" {
  description = "Name of the Agent Enrichment lambda function"
  value       = aws_lambda_function.agent_enrichment.function_name
}

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


# IAM role
output "lambda_execution_role_arn" {
  description = "ARN of the lambda execution IAM role"
  value       = aws_iam_role.lambda_execution_role.arn
}

# All function ARNs as a map for easy reference
output "function_arns" {
  description = "Map of all lambda function ARNs"
  value = {
    agent_enrichment      = aws_lambda_function.agent_enrichment.arn
    graph_creator         = aws_lambda_function.graph_creator_executor.arn
    main_agent_executor   = aws_lambda_function.main_agent_executor.arn
  }
}

# All function names as a map for easy reference
output "function_names" {
  description = "Map of all lambda function names"
  value = {
    agent_enrichment      = aws_lambda_function.agent_enrichment.function_name
    graph_creator         = aws_lambda_function.graph_creator_executor.function_name
    main_agent_executor   = aws_lambda_function.main_agent_executor.function_name
  }
} 