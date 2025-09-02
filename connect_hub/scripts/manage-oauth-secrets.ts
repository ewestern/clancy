#!/usr/bin/env ts-node

import { SecretsManager } from "@aws-sdk/client-secrets-manager";
import { Command } from "commander";
import dotenv from "dotenv";

dotenv.config();

interface OauthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  signingSecret?: string;
}

class OAuthSecretsManager {
  private secretsManager: SecretsManager;
  private environment: string;

  constructor() {
    this.secretsManager = new SecretsManager({
      region: "us-east-1",
      profile: "clancy",
    });
    this.environment = process.env.ENVIRONMENT || "staging";
  }

  private getSecretId(providerId: string): string {
    return `clancy/oauth/${this.environment}/${providerId}`;
  }

  async secretExists(providerId: string): Promise<boolean> {
    try {
      await this.secretsManager.getSecretValue({
        SecretId: this.getSecretId(providerId),
      });
      return true;
    } catch (error: any) {
      if (error.name === "ResourceNotFoundException") {
        return false;
      }
      throw error;
    }
  }

  async createSecret(providerId: string, config: OauthConfig): Promise<void> {
    const secretId = this.getSecretId(providerId);

    console.log(`Creating new secret: ${secretId}`);

    await this.secretsManager.createSecret({
      Name: secretId,
      SecretString: JSON.stringify(config),
      Description: `OAuth configuration for ${providerId} provider in ${this.environment} environment`,
    });

    console.log(`✅ Successfully created secret: ${secretId}`);
  }

  async updateSecret(providerId: string, config: OauthConfig): Promise<void> {
    const secretId = this.getSecretId(providerId);

    console.log(`Updating existing secret: ${secretId}`);

    await this.secretsManager.updateSecret({
      SecretId: secretId,
      SecretString: JSON.stringify(config),
    });

    console.log(`✅ Successfully updated secret: ${secretId}`);
  }

  async manageSecret(
    providerId: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    signingSecret?: string,
  ): Promise<void> {
    const config: OauthConfig = {
      clientId,
      clientSecret,
      redirectUri,
    };

    if (signingSecret) {
      config.signingSecret = signingSecret;
    }

    try {
      const exists = await this.secretExists(providerId);

      if (exists) {
        await this.updateSecret(providerId, config);
      } else {
        await this.createSecret(providerId, config);
      }
    } catch (error: any) {
      console.error(
        `❌ Error managing secret for provider ${providerId}:`,
        error.message,
      );
      process.exit(1);
    }
  }
}

async function main() {
  const program = new Command();

  program
    .name("manage-oauth-secrets")
    .description("Manage OAuth provider secrets in AWS Secrets Manager")
    .version("1.0.0");

  program
    .requiredOption(
      "-p, --provider-id <providerId>",
      "Provider ID (e.g., google, slack, microsoft)",
    )
    .requiredOption("-c, --client-id <clientId>", "OAuth client ID")
    .requiredOption("-s, --client-secret <clientSecret>", "OAuth client secret")
    .requiredOption("-r, --redirect-uri <redirectUri>", "OAuth redirect URI")
    .option(
      "-S, --signing-secret <signingSecret>",
      "Optional signing secret (for providers like Slack)",
    )
    .option(
      "-e, --environment <environment>",
      "Environment (defaults to ENVIRONMENT env var or 'staging')",
    )
    .action(async (options) => {
      if (options.environment) {
        process.env.ENVIRONMENT = options.environment;
      }

      const manager = new OAuthSecretsManager();

      console.log(`Managing OAuth secrets for provider: ${options.providerId}`);
      console.log(`Environment: ${process.env.ENVIRONMENT || "staging"}`);
      console.log(`Client ID: ${options.clientId}`);
      console.log(`Redirect URI: ${options.redirectUri}`);
      if (options.signingSecret) {
        console.log(`Signing Secret: [REDACTED]`);
      }
      console.log("");

      await manager.manageSecret(
        options.providerId,
        options.clientId,
        options.clientSecret,
        options.redirectUri,
        options.signingSecret,
      );
    });

  await program.parseAsync();
}

// Check if this file is being run directly (ES module equivalent of require.main === module)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  });
}

export { OAuthSecretsManager };
