resource "aws_secretsmanager_secret" "postgres_password" {
  name = "/${var.environment}/clancy/postgres"
  description = "PostgreSQL password for Clancy services"
}

resource "aws_secretsmanager_secret" "clerk_secrets" {
  name = "/${var.environment}/clancy/clerk"
  description = "Clerk authentication secrets for Clancy services"
}
resource "aws_secretsmanager_secret" "openai_api_key" {
  name = "/${var.environment}/clancy/openai"
  description = "OpenAI API key for Clancy services"
}
output "openai_api_key_secret_id" {
  value = aws_secretsmanager_secret.openai_api_key.id
}

# Add outputs so the service modules can reference these
output "postgres_secret_id" {
  value = aws_secretsmanager_secret.postgres_password.id
}

output "clerk_secret_id" {
  value = aws_secretsmanager_secret.clerk_secrets.id
}