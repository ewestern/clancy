resource "aws_secretsmanager_secret" "agents_core_service_db_password" {

  name        = "clancy/agents-core/database/${var.environment}"
  description = "Password for agents core service database"
}

resource "aws_secretsmanager_secret_version" "agents_core_service_db_password" {
  secret_id     = aws_secretsmanager_secret.agents_core_service_db_password.id
  #secret_string = jsonencode({
  #  password = random_password.agents_core_service_db_password.result
  #})
  lifecycle {
    ignore_changes = [
      secret_string
    ]
  }
}

#resource "aws_secretsmanager_secret" "agents_core_service_clerk_secrets" {
#
#  name        = "clancy/agents-core/clerk-secrets/${var.environment}"
#  description = "Clerk secrets for agents core service"
#}
#
#resource "aws_secretsmanager_secret_version" "agents_core_service_clerk_secrets" {
#  secret_id     = aws_secretsmanager_secret.agents_core_service_clerk_secrets.id
#}

locals {

  agents_core_service_db_password = jsondecode(aws_secretsmanager_secret_version.agents_core_service_db_password.secret_string).password
}