resource "aws_secretsmanager_secret" "connect_hub_db_password" {

  name        = "clancy/connect-hub/database/${var.environment}"
  description = "Password for connect hub database"
}

resource "aws_secretsmanager_secret_version" "connect_hub_db_password" {
  secret_id     = aws_secretsmanager_secret.connect_hub_db_password.id
  lifecycle {
    ignore_changes = [
      secret_string
    ]
  }
}

resource "aws_secretsmanager_secret" "oauth_microsoft_provider" {
  name        = "clancy/oauth/${var.environment}/microsoft"
  description = "Microsoft OAuth provider secrets"
}


locals {

  connect_hub_db_password = jsondecode(aws_secretsmanager_secret_version.connect_hub_db_password.secret_string).password
}