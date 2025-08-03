variable "environment" {
  type        = string
  description = "The environment to deploy the events module to"
}

variable "graph_creator_executor_function_arn" {
  type        = string
  description = "The ARN of the Graph Creator Executor lambda function"
}

variable "main_agent_executor_function_arn" {
  type        = string
  description = "The ARN of the Main Agent Executor lambda function"
}
variable "connect_hub_lb_endpoint" {
  type        = string
  description = "The endpoint of the Connect Hub load balancer"
}
variable "agents_core_lb_endpoint" {
  type        = string
  description = "The endpoint of the Agents Core load balancer"
}

output "kinesis_stream_arn" {
  value = aws_kinesis_stream.clancy_stream.arn
}