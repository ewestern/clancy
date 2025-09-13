resource "aws_secretsmanager_secret" "postgres_password" {
  name = "clancy/${var.environment}/postgres"
  description = "PostgreSQL password for Clancy services"
}

resource "aws_secretsmanager_secret" "clerk_secrets" {
  name = "clancy/${var.environment}/clerk"
  description = "Clerk authentication secrets for Clancy services"
}

resource "aws_secretsmanager_secret" "openai_api_key" {
  name = "clancy/${var.environment}/openai"
  description = "OpenAI API key for Clancy services"
}
resource "aws_secretsmanager_secret" "anthropic_api_key" {
  name = "clancy/${var.environment}/anthropic"
  description = "Anthropic API key for Clancy services"
}
resource "aws_secretsmanager_secret" "tavily_api_key" {
  name = "clancy/${var.environment}/tavily"
  description = "Tavily API key for Clancy services"
}
resource "aws_secretsmanager_secret" "twilio_secrets" {
  name = "clancy/${var.environment}/twilio"
  description = "Twilio secrets for Clancy services"
}

data "aws_secretsmanager_secret_version" "clerk_secrets" {
  secret_id = aws_secretsmanager_secret.clerk_secrets.id
}
data "aws_secretsmanager_secret_version" "openai_api_key" {
  secret_id = aws_secretsmanager_secret.openai_api_key.id
}

locals {
  agents_core_clerk_publishable_key = jsondecode(data.aws_secretsmanager_secret_version.clerk_secrets.secret_string).publishable_key
  agents_core_clerk_secret_key = jsondecode(data.aws_secretsmanager_secret_version.clerk_secrets.secret_string).secret_key
  openai_api_key = jsondecode(data.aws_secretsmanager_secret_version.openai_api_key.secret_string).api_key
  tavily_api_key = jsondecode(data.aws_secretsmanager_secret_version.tavily_api_key.secret_string).api_key
  twilio_account_sid = jsondecode(data.aws_secretsmanager_secret_version.twilio_secrets.secret_string).account_sid
  twilio_auth_token = jsondecode(data.aws_secretsmanager_secret_version.twilio_secrets.secret_string).auth_token
}

output "openai_api_key_secret_arn" {
  value = aws_secretsmanager_secret.openai_api_key.arn
}
output "anthropic_api_key_secret_arn" {
  value = aws_secretsmanager_secret.anthropic_api_key.arn
}

# Add outputs so the service modules can reference these
output "postgres_secret_id" {
  value = aws_secretsmanager_secret.postgres_password.id
}

output "clerk_secret_id" {
  value = aws_secretsmanager_secret.clerk_secrets.id
}

output "clerk_publishable_key" {
  value = local.agents_core_clerk_publishable_key
}
output "clerk_secret_key" {
  value = local.agents_core_clerk_secret_key
}
output "openai_api_key" {
  value = local.openai_api_key
}