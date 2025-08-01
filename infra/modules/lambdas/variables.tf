variable "project_name" {
  description = "Name of the project, used for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "agents_core_api_url" {
  description = "URL for the agents_core API"
  type        = string
}

variable "connect_hub_api_url" {
  description = "URL for the connect_hub API"
  type        = string
}

variable "kinesis_stream_name" {
  description = "Name of the Kinesis stream for event publishing"
  type        = string
}

variable "kinesis_stream_arn" {
  description = "ARN of the Kinesis stream for IAM permissions"
  type        = string
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "lambda_timeout" {
  description = "Timeout for lambda functions in seconds"
  type        = number
  default     = 30
}

variable "lambda_memory_size" {
  description = "Memory size for lambda functions in MB"
  type        = number
  default     = 512
}

variable "executor_timeout" {
  description = "Timeout for executor lambda functions in seconds"
  type        = number
  default     = 300
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 14
}

variable "vpc_subnet_ids" {
  description = "List of VPC subnet IDs for lambda functions. If provided, lambdas will be deployed in VPC"
  type        = list(string)
  default     = []
}

variable "vpc_security_group_ids" {
  description = "List of VPC security group IDs for lambda functions. Required if vpc_subnet_ids is provided"
  type        = list(string)
  default     = []
  validation {
    condition = (
      (length(var.vpc_subnet_ids) == 0 && length(var.vpc_security_group_ids) == 0) ||
      (length(var.vpc_subnet_ids) > 0 && length(var.vpc_security_group_ids) > 0)
    )
    error_message = "If vpc_subnet_ids is provided, vpc_security_group_ids must also be provided, and vice versa."
  }
} 

variable "lambdas_path" {
  description = "Path to the lambdas directory"
  type        = string
}