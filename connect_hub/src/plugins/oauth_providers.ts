import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { SecretsManager } from "@aws-sdk/client-secrets-manager";
import dotenv from "dotenv";
dotenv.config();

async function getProviderMetadata(
  providerId: string,
): Promise<Record<string, any> | undefined> {
  const secretsManager = new SecretsManager({
    region: "us-east-1",
    profile: "clancy",
  });
  const secret = await secretsManager.getSecretValue({
    SecretId: `clancy/oauth/${process.env.ENVIRONMENT}/${providerId}`,
  });
  if (!secret.SecretString) {
    return undefined;
  }
  return JSON.parse(secret.SecretString);
}
const registerOauthProviders: FastifyPluginAsync = async (fastify) => {
  // create function to get the provider metadata, as well as a cache of the metadata
  const providerMetadataCache = new Map<string, Record<string, any>>();
  const getCachedProviderMetadata = async (
    providerId: string,
  ): Promise<Record<string, any> | undefined> => {
    if (providerMetadataCache.has(providerId)) {
      return providerMetadataCache.get(providerId);
    }
    const metadata = await getProviderMetadata(providerId);
    if (metadata) {
      providerMetadataCache.set(providerId, metadata);
    }
    return metadata;
  };
  fastify.decorate("getProviderSecrets", getCachedProviderMetadata);
};

export default fp(registerOauthProviders, {
  name: "oauth-providers",
});
