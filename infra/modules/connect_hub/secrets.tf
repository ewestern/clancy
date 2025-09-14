resource "aws_secretsmanager_secret" "connect_hub_db_password" {

  name        = "clancy/connect-hub/database/${var.environment}"
  description = "Password for connect hub database"
}

// generate random password
resource "random_password" "connect_hub_db_password" {
  length  = 16
  special = false
}

resource "aws_secretsmanager_secret_version" "connect_hub_db_password" {
  secret_id     = aws_secretsmanager_secret.connect_hub_db_password.id
  secret_string = jsonencode({
    password = random_password.connect_hub_db_password.result
  })
}

resource "aws_secretsmanager_secret" "oauth_microsoft_provider" {
  name        = "clancy/oauth/${var.environment}/microsoft"
  description = "Microsoft OAuth provider secrets"
}


locals {

  connect_hub_db_password = jsondecode(aws_secretsmanager_secret_version.connect_hub_db_password.secret_string).password
}