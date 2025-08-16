resource "aws_cognito_user_pool" "clancy_user_pool" {
  name = "clancy-user-pool-${var.environment}"
}

/*
Client metadata for machine-to-machine (M2M) client credentials

You can pass client metadata in M2M requests. Client metadata is additional information from a user or application environment that can contribute to the outcomes of a Pre token generation Lambda trigger. In authentication operations with a user principal, you can pass client metadata to the pre token generation trigger in the body of AdminRespondToAuthChallenge and RespondToAuthChallenge API requests. Because applications conduct the flow for generation of access tokens for M2M with direct requests to the Token endpoint, they have a different model. In the POST body of token requests for client credentials, pass an aws_client_metadata parameter with the client metadata object URL-encoded (x-www-form-urlencoded) to string. For an example request, see Client credentials with basic authorization. The following is an example parameter that passes the key-value pairs {"environment": "dev", "language": "en-US"}.
*/

resource "aws_cognito_user_pool_client" "clancy_user_pool_client" {
  name = "clancy-user-pool-client-${var.environment}"
  user_pool_id = aws_cognito_user_pool.clancy_user_pool.id
  allowed_oauth_flows = ["client_credentials"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes = ["https://clancyai.com/all"]
  depends_on = [aws_cognito_resource_server.clancy_resource_server]
}

resource "aws_cognito_resource_server" "clancy_resource_server" {
  identifier = "https://clancyai.com"
  name       = "clancy-resource-server-${var.environment}"

  scope {
    scope_name        = "all"
    scope_description = "All permissions"
  }

  user_pool_id = aws_cognito_user_pool.clancy_user_pool.id
}

resource "aws_cognito_user_pool_domain" "main" {
  domain       = "clancy"
  user_pool_id = aws_cognito_user_pool.clancy_user_pool.id
}

# Outputs for other modules to use
output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.clancy_user_pool.id
}

output "cognito_user_pool_client_id" {
  value = aws_cognito_user_pool_client.clancy_user_pool_client.id
}

output "cognito_user_pool_client_secret" {
  value = aws_cognito_user_pool_client.clancy_user_pool_client.client_secret
  sensitive = true
}

output "cognito_user_pool_domain" {
  value = aws_cognito_user_pool_domain.main.domain
}

output "cognito_authorization_endpoint" {
  value = "https://${aws_cognito_user_pool_domain.main.domain}.auth.us-east-1.amazoncognito.com/oauth2/token"
}
