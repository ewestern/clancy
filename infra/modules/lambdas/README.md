# Lambdas Module

This Terraform module manages the deployment of Clancy's agent execution lambda functions.

## Features

- **Automated Building**: Uses `null_resource` to automatically run `npm ci && npm run build` when source files change
- **Lambda Functions**: Deploys all four lambda functions with proper configuration
- **IAM Setup**: Creates execution role with necessary permissions for Kinesis publishing
- **CloudWatch Logs**: Sets up log groups with configurable retention
- **Environment Variables**: Configures all required environment variables
- **Archive Management**: Automatically packages built lambda functions as ZIP files

## Lambda Functions Deployed

1. **AgentEnrichment** - EventBridge pipe enrichment step
2. **GraphCreatorExecutor** - Handles graph creator workflows  
3. **MainAgentExecutor** - Handles general agent workflows
4. **HelloWorld** - Reference/testing function

## Usage

```hcl
module "lambdas" {
  source = "./modules/lambdas"

  project_name        = "clancy"
  environment         = "dev"
  agents_core_api_url = "https://agents-core.dev.example.com"
  connect_hub_api_url = "https://connect-hub.dev.example.com"
  kinesis_stream_name = "clancy-dev-events"
  kinesis_stream_arn  = aws_kinesis_stream.events.arn

  # Optional VPC configuration
  vpc_subnet_ids         = ["subnet-12345", "subnet-67890"]
  vpc_security_group_ids = ["sg-lambda-functions"]

  tags = {
    Owner = "platform-team"
    Cost  = "development"
  }
}
```

For a complete working example, see the `examples/lambdas/` directory in the repository root.

## Requirements

| Name | Version |
|------|---------|
| terraform | >= 1.0 |
| aws | >= 5.0 |
| archive | >= 2.0 |
| null | >= 3.0 |

## Providers

| Name | Version |
|------|---------|
| aws | >= 5.0 |
| archive | >= 2.0 |
| null | >= 3.0 |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| project_name | Name of the project, used for resource naming | `string` | n/a | yes |
| environment | Environment (dev, staging, prod) | `string` | n/a | yes |
| agents_core_api_url | URL for the agents_core API | `string` | n/a | yes |
| connect_hub_api_url | URL for the connect_hub API | `string` | n/a | yes |
| kinesis_stream_name | Name of the Kinesis stream for event publishing | `string` | n/a | yes |
| kinesis_stream_arn | ARN of the Kinesis stream for IAM permissions | `string` | n/a | yes |
| tags | Tags to apply to all resources | `map(string)` | `{}` | no |
| lambda_timeout | Timeout for lambda functions in seconds | `number` | `30` | no |
| lambda_memory_size | Memory size for lambda functions in MB | `number` | `512` | no |
| executor_timeout | Timeout for executor lambda functions in seconds | `number` | `300` | no |
| log_retention_days | CloudWatch log retention in days | `number` | `14` | no |
| vpc_subnet_ids | List of VPC subnet IDs for lambda functions. If provided, lambdas will be deployed in VPC | `list(string)` | `[]` | no |
| vpc_security_group_ids | List of VPC security group IDs for lambda functions. Required if vpc_subnet_ids is provided | `list(string)` | `[]` | no |

## Outputs

| Name | Description |
|------|-------------|
| agent_enrichment_function_arn | ARN of the Agent Enrichment lambda function |
| agent_enrichment_function_name | Name of the Agent Enrichment lambda function |
| graph_creator_executor_function_arn | ARN of the Graph Creator Executor lambda function |
| graph_creator_executor_function_name | Name of the Graph Creator Executor lambda function |
| main_agent_executor_function_arn | ARN of the Main Agent Executor lambda function |
| main_agent_executor_function_name | Name of the Main Agent Executor lambda function |
| hello_world_function_arn | ARN of the Hello World lambda function |
| hello_world_function_name | Name of the Hello World lambda function |
| lambda_execution_role_arn | ARN of the lambda execution IAM role |
| function_arns | Map of all lambda function ARNs |
| function_names | Map of all lambda function names |

## Build Process

The module automatically builds the lambda functions using a `null_resource` that:

1. Runs `npm ci` to install dependencies
2. Runs `npm run build` to compile TypeScript and bundle with esbuild
3. Creates ZIP archives from the built artifacts
4. Deploys the lambda functions with the latest code

The build is triggered when:
- `package.json` changes
- `tsconfig.json` changes

You can add more triggers by modifying the `triggers` block in the `null_resource`.

## IAM Permissions

The lambda execution role includes:
- Basic lambda execution permissions (CloudWatch Logs)
- Kinesis `PutRecord` and `PutRecords` permissions on the specified stream
- VPC access permissions (when VPC configuration is provided)

## Notes

- The module expects the lambda source code to be in `../../../lambdas` relative to the module directory
- All lambda functions share the same IAM execution role
- CloudWatch log groups are created with the specified retention period
- Environment variables are automatically configured based on the input variables
- VPC configuration is optional - if `vpc_subnet_ids` is provided, lambdas will be deployed in VPC
- When using VPC, ensure subnets have internet access (via NAT Gateway) for external API calls
- VPC security groups should allow outbound HTTPS (443) and HTTP (80) traffic 