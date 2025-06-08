#!/usr/bin/env tsx

import { SecretsManagerClient, CreateSecretCommand, UpdateSecretCommand, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { config } from "dotenv";

// Load environment variables
config();

interface OAuthSecretData {
  clientId: string;
  clientSecret: string;
  signingSecret?: string;
  createdAt: string;
  updatedAt: string;
}

class OAuthSecretManager {
  private secretsClient: SecretsManagerClient;

  constructor() {
    this.secretsClient = new SecretsManagerClient({
      region: process.env.AWS_REGION || "us-east-1",
      profile: "clancy"
    });
  }

  /**
   * Create or update an OAuth secret in AWS Secrets Manager
   */
  async createOrUpdateSecret(environment: string, providerId: string, clientId: string, clientSecret: string, signingSecret?: string): Promise<void> {
    const secretName = `clancy/oauth/${environment}/${providerId}`;
    const secretValue: OAuthSecretData = {
      clientId,
      clientSecret,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add signing secret if provided
    if (signingSecret) {
      secretValue.signingSecret = signingSecret;
    }

    try {
      // Try to get the existing secret first
      const getCommand = new GetSecretValueCommand({ SecretId: secretName });
      const existingSecret = await this.secretsClient.send(getCommand);
      
      if (existingSecret.SecretString) {
        const existingData: OAuthSecretData = JSON.parse(existingSecret.SecretString);
        secretValue.createdAt = existingData.createdAt;
        // Preserve existing signing secret if no new one is provided
        if (!signingSecret && existingData.signingSecret) {
          secretValue.signingSecret = existingData.signingSecret;
        }
      }

      // Update the existing secret
      const updateCommand = new UpdateSecretCommand({
        SecretId: secretName,
        SecretString: JSON.stringify(secretValue, null, 2),
        Description: `OAuth credentials for ${providerId} provider`,
      });
      
      await this.secretsClient.send(updateCommand);
      console.log(`✅ Successfully updated OAuth secret for provider: ${providerId}`);
      
    } catch (error) {
      if (error instanceof Error && error.name === "ResourceNotFoundException") {
        // Secret doesn't exist, create it
        try {
          const createCommand = new CreateSecretCommand({
            Name: secretName,
            SecretString: JSON.stringify(secretValue, null, 2),
            Description: `OAuth credentials for ${providerId} provider`,
          });
          
          await this.secretsClient.send(createCommand);
          console.log(`✅ Successfully created OAuth secret for provider: ${providerId}`);
          
        } catch (createError) {
          console.error(`❌ Failed to create secret for provider ${providerId}:`, createError);
          throw createError;
        }
      } else {
        console.error(`❌ Failed to update secret for provider ${providerId}:`, error);
        throw error;
      }
    }
  }

  /**
   * Retrieve and display an OAuth secret
   */
  async getSecret(environment: string, providerId: string): Promise<void> {
    const secretName = `clancy/oauth/${environment}/${providerId}`;
    
    try {
      const command = new GetSecretValueCommand({ SecretId: secretName });
      const result = await this.secretsClient.send(command);
      
      if (result.SecretString) {
        const secretData: OAuthSecretData = JSON.parse(result.SecretString);
        console.log(`\n📋 OAuth Secret for ${providerId}:`);
        console.log(`   Client ID: ${secretData.clientId}`);
        console.log(`   Client Secret: ${secretData.clientSecret.substring(0, 8)}...`);
        if (secretData.signingSecret) {
          console.log(`   Signing Secret: ${secretData.signingSecret.substring(0, 8)}...`);
        }
        console.log(`   Created At: ${secretData.createdAt}`);
        console.log(`   Updated At: ${secretData.updatedAt}`);
      } else {
        console.log(`❌ No secret data found for provider: ${providerId}`);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "ResourceNotFoundException") {
        console.log(`❌ Secret not found for provider: ${providerId}`);
      } else {
        console.error(`❌ Failed to retrieve secret for provider ${providerId}:`, error);
      }
    }
  }

  /**
   * List all OAuth secrets
   */
  async listSecrets(): Promise<void> {
    console.log("🔍 Listing OAuth secrets is not implemented yet.");
    console.log("   Use AWS CLI or console to view all secrets with prefix 'clancy/oauth/'");
  }
}

function showUsage(): void {
  console.log(`
🔐 OAuth Secret Manager for Clancy

Usage:
  tsx scripts/storeOauthSecret.ts create <environment> <provider> <client_id> <client_secret> [signing_secret]
  tsx scripts/storeOauthSecret.ts get <environment> <provider>
  tsx scripts/storeOauthSecret.ts list

Commands:
  create    Create or update OAuth credentials for a provider
  get       Retrieve OAuth credentials for a provider (client secret masked)
  list      List all OAuth providers (coming soon)

Arguments:
  environment     Environment name (e.g., 'staging', 'production', 'dev')
  provider        Provider ID (e.g., 'google', 'slack', 'quickbooks', 'github')
  client_id       OAuth client ID from the provider
  client_secret   OAuth client secret from the provider
  signing_secret  Optional signing secret (required for some providers like Slack)

Examples:
  # Create/update Google OAuth credentials for staging
  tsx scripts/storeOauthSecret.ts create staging google \\
    "123456789-abcdef.apps.googleusercontent.com" \\
    "GOCSPX-your-client-secret"

  # Create/update Slack OAuth credentials with signing secret for staging
  tsx scripts/storeOauthSecret.ts create staging slack \\
    "your-slack-client-id" \\
    "your-slack-client-secret" \\
    "your-slack-signing-secret"

  # Create/update GitHub OAuth credentials for production
  tsx scripts/storeOauthSecret.ts create production github \\
    "your-github-client-id" \\
    "your-github-client-secret"

  # Get existing credentials (with masked secret)
  tsx scripts/storeOauthSecret.ts get staging google

Environment Variables:
  AWS_REGION              AWS region (defaults to us-east-1)
  AWS_ACCESS_KEY_ID       AWS access key
  AWS_SECRET_ACCESS_KEY   AWS secret key

Provider Requirements:
  - Provider ID must contain only letters, numbers, hyphens, and underscores
  - Any OAuth provider can be configured using this script

Notes:
  - Secrets are stored at path: clancy/oauth/{environment}/{providerId}
  - Make sure your AWS credentials have SecretsManager permissions
  - The script preserves the original creation timestamp when updating
`);
}

function validateProvider(provider: string): boolean {
  // Allow any provider - new providers can be added without updating this script
  return provider.length > 0 && /^[a-zA-Z0-9_-]+$/.test(provider);
}

function validateEnvironment(environment: string): boolean {
  // Environment names should be lowercase and contain only letters, numbers, hyphens
  return environment.length > 0 && /^[a-z0-9-]+$/.test(environment);
}

function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    showUsage();
    process.exit(1);
  }

  const command = args[0];
  const manager = new OAuthSecretManager();

  try {
    switch (command) {
      case "create": {
        if (args.length !== 5 && args.length !== 6) {
          console.error("❌ Error: 'create' command requires 4 or 5 arguments");
          console.error("   Usage: tsx scripts/storeOauthSecret.ts create <environment> <provider> <client_id> <client_secret> [signing_secret]");
          process.exit(1);
        }

        console.log(args);
        const [, environment, providerId, clientId, clientSecret, signingSecret] = args;
        console.log(environment, providerId, clientId, clientSecret, signingSecret);

        // Validate environment
        if (!validateEnvironment(environment)) {
          console.error(`❌ Error: Invalid environment '${environment}'`);
          console.error("   Environment must be lowercase and contain only letters, numbers, and hyphens");
          process.exit(1);
        }

        // Validate provider
        if (!validateProvider(providerId)) {
          console.error(`❌ Error: Invalid provider ID '${providerId}'`);
          console.error("   Provider ID must contain only letters, numbers, hyphens, and underscores");
          process.exit(1);
        }

        // Validate required fields
        if (!clientId || !clientSecret) {
          console.error("❌ Error: Client ID and Client Secret cannot be empty");
          process.exit(1);
        }

        console.log(`🔐 Creating/updating OAuth secret for provider: ${providerId} in environment: ${environment}`);
        await manager.createOrUpdateSecret(environment, providerId, clientId, clientSecret, signingSecret);
        break;
      }

      case "get": {
        if (args.length !== 3) {
          console.error("❌ Error: 'get' command requires exactly 2 arguments");
          console.error("   Usage: tsx scripts/storeOauthSecret.ts get <environment> <provider>");
          process.exit(1);
        }

        const [, environment, providerId] = args;

        // Validate environment
        if (!validateEnvironment(environment)) {
          console.error(`❌ Error: Invalid environment '${environment}'`);
          console.error("   Environment must be lowercase and contain only letters, numbers, and hyphens");
          process.exit(1);
        }

        if (!validateProvider(providerId)) {
          console.error(`❌ Error: Invalid provider ID '${providerId}'`);
          console.error("   Provider ID must contain only letters, numbers, hyphens, and underscores");
          process.exit(1);
        }

        await manager.getSecret(environment, providerId);
        break;
      }

      case "list": {
        await manager.listSecrets();
        break;
      }

      case "help":
      case "--help":
      case "-h":
        showUsage();
        break;

      default:
        console.error(`❌ Error: Unknown command '${command}'`);
        console.error("   Use 'tsx scripts/storeOauthSecret.ts help' for usage information");
        process.exit(1);
    }
  } catch (error) {
    console.error("❌ Script failed:", error);
    process.exit(1);
  }
}

// Run the script
main();
