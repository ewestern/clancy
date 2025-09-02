import { FastifyTypeBox } from "../types/fastify.js";
import { ProxyEndpointSchema } from "../models/proxy.js";
import { registry } from "../integrations.js";
import { ExecutionContext } from "../providers/types.js";
import { OwnershipScopeSchema } from "../models/capabilities.js";
import { ProviderKind } from "../models/providers.js";
import { connections, tokens } from "../database/schema.js";
import { eq, and, isNotNull } from "drizzle-orm";

export async function proxyRoutes(app: FastifyTypeBox) {
  app.addSchema(OwnershipScopeSchema);
  app.post(
    `/proxy/:providerId/:capabilityId`,
    {
      schema: ProxyEndpointSchema,
    },
    async (request, reply) => {
      const { providerId, capabilityId } = request.params;
      const { orgId, userId, params } = request.body;

      const provider = registry.getProvider(providerId);
      if (!provider) {
        return reply.status(404).send({
          error: "Provider not found",
          message: `Provider ${providerId} not found`,
          statusCode: 404,
        });
      }

      const capability = provider.getCapability(capabilityId);
      if (!capability) {
        return reply.status(404).send({
          error: "Capability not found",
          message: `Capability ${capabilityId} not found`,
          statusCode: 404,
        });
      }

      let token: Record<string, unknown> | null = null;
      let externalAccountId: string | undefined = undefined;
      if (provider.metadata.kind === ProviderKind.External) {
        // Query tokens and connection metadata based on ownership scope
        const results = await request.server.db
          .select({
            tokenPayload: tokens.tokenPayload,
            scopes: tokens.scopes,
            externalAccountMetadata: connections.externalAccountMetadata,
          })
          .from(tokens)
          .innerJoin(connections, eq(tokens.connectionId, connections.id))
          .where(
            and(
              eq(connections.providerId, providerId),
              eq(connections.userId, userId),
              eq(connections.orgId, orgId),
              isNotNull(tokens.tokenPayload),
            ),
          );

        if (results.length === 0) {
          return reply.status(401).send({
            error: "Unauthorized",
            message: `No token found for provider ${providerId} for user ${userId} in org ${orgId}`,
            statusCode: 401,
          });
        }

        const tokenRecord = results[0]!;

        // Check if token has required scopes
        const requiredScopes = capability.meta.requiredScopes;
        const tokenScopes = tokenRecord.scopes || [];
        const hasRequiredScopes = requiredScopes.every((scope) =>
          tokenScopes.includes(scope),
        );

        if (!hasRequiredScopes) {
          return reply.status(403).send({
            error: "Insufficient permissions",
            message: `Token lacks required scopes: ${requiredScopes.filter((scope) => !tokenScopes.includes(scope)).join(", ")}`,
            statusCode: 403,
          });
        }

        token = tokenRecord.tokenPayload;

        // Extract external account ID from metadata based on provider
        if (
          providerId === "quickbooks" &&
          tokenRecord.externalAccountMetadata?.realmId
        ) {
          externalAccountId = tokenRecord.externalAccountMetadata
            .realmId as string;
        }
      }

      const providerSecrets = await app.getProviderSecrets(providerId);
      if (!providerSecrets) {
        return reply.status(400).send({
          error: "provider_not_found",
          message: `Provider ${providerId} not found`,
          statusCode: 400,
        });
      }
      const context: ExecutionContext = {
        db: request.server.db,
        orgId: orgId,
        tokenPayload: token,
        externalAccountId: externalAccountId,
        retryCount: 0,
        oauthContext: {
          provider: providerId,
          clientId: providerSecrets.clientId,
          clientSecret: providerSecrets.clientSecret,
          redirectUri: providerSecrets.redirectUri,
          orgId: orgId,
        },
      };

      const result = await capability.execute(params, context);
      return reply.status(200).send(result);
    },
  );
}
