import { FastifyTypeBox } from "../types/fastify.js";
import { ProxyEndpointSchema } from "../models/proxy.js";
import { registry } from "../integrations.js";
import { ExecutionContext } from "../providers/types.js";
import { OwnershipScopeSchema } from "../models/capabilities.js";
import { ProviderKind } from "../models/providers.js";
import { connections, tokens } from "../database/schema.js";
import { eq, and, isNotNull } from "drizzle-orm";
import { OwnershipScope } from "../models/shared.js";

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
        });
      }

      const capability = provider.getCapability(capabilityId);
      if (!capability) {
        return reply.status(404).send({
          error: "Capability not found",
        });
      }

      let token: Record<string, unknown> | null = null;
      if (provider.metadata.kind === ProviderKind.External) {
        // Query tokens based on ownership scope
        const results = await request.server.db
          .select({
            tokenPayload: tokens.tokenPayload,
            scopes: tokens.scopes,
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
          });
        }

        token = tokenRecord.tokenPayload;
      }

      const context: ExecutionContext = {
        db: request.server.db,
        orgId: orgId,
        tokenPayload: token,
        retryCount: 0,
      };

      const result = await capability.execute(params, context);
      return reply.status(200).send(result);
    },
  );
}
