import {
  FastifyTypeBox,
  FastifyRequestTypeBox,
  FastifyReplyTypeBox,
} from "../types/fastify.d.js";
import {
  CapabilitiesEndpointSchema,
  CapabilityEndpointSchema,
  CapabilitySchema,
  CapabilitySummarySchema,
  ProviderCapabilitiesSchema,
  ProviderCapabilitySchema,
  OwnershipScopeSchema,
  CapabilityRiskSchema,
} from "../models/capabilities.js";
import { ProviderKindSchema, ProviderAuthSchema } from "../models/providers.js";
import { registry } from "../integrations.js";
import { PromptSpecSchema } from "../models/prompts.js";
import { drizzle } from "drizzle-orm/node-postgres";
import { schemaAndRelations } from "../database/index.js";
import { connections, tokens } from "../database/schema.js";
import { eq, gt, and } from "drizzle-orm";

function hasPermissions(
  capabilityId: string,
  tokenScopes: Set<string>,
  scopeMapping: Record<string, string[]>,
): boolean {
  const requiredScopes = scopeMapping[capabilityId];
  if (!requiredScopes) {
    return false;
  }

  return requiredScopes.every((scope) => tokenScopes.has(scope));
}

async function getActiveProviderScopes(
  db: ReturnType<typeof drizzle<typeof schemaAndRelations>>,
  orgId: string,
): Promise<Set<string>> {
  const result = await db
    .select({
      scopes: tokens.scopes,
    })
    .from(connections)
    .innerJoin(tokens, eq(connections.id, tokens.connectionId))
    .where(and(eq(connections.orgId, orgId)));

  return new Set(result.flatMap((r) => r.scopes));
}

export async function capabilitiesRoutes(app: FastifyTypeBox) {
  app.addSchema(ProviderCapabilitiesSchema);
  app.addSchema(ProviderCapabilitySchema);
  app.addSchema(ProviderKindSchema);
  app.addSchema(ProviderAuthSchema);
  app.addSchema(CapabilitySchema);
  app.addSchema(CapabilitySummarySchema);
  app.addSchema(PromptSpecSchema);
  app.addSchema(CapabilityRiskSchema);
  app.addSchema(OwnershipScopeSchema);
  app.get(
    "/capabilities",
    {
      schema: CapabilitiesEndpointSchema,
    },
    async (
      request: FastifyRequestTypeBox<typeof CapabilitiesEndpointSchema>,
      reply: FastifyReplyTypeBox<typeof CapabilitiesEndpointSchema>,
    ) => {
      //const activeScopes = await getActiveProviderScopes(
      //  request.server.db,
      //  request.query.orgId,
      //);

      const capabilities = registry.getCapabilities();

      return reply.status(200).send(
        capabilities.map((provider) => {
          return {
            ...provider,
            capabilities: provider.capabilities.map((capability) => {
              return {
                ...capability,
                //available: hasPermissions(
                //  capability.id,
                //  activeScopes,
                //  provider.scopeMapping,
                //),
              };
            }),
          };
        }),
      );
    },
  );

  //registry.getCapabilities().forEach((provider) => {
  //  provider.capabilities.forEach((capability) => {
  //    app.get(`/capabilities/${provider.id}/${capability.id}`, {
  //      schema: CapabilityEndpointSchema,
  //    }, async (request: FastifyRequestTypeBox<typeof CapabilityEndpointSchema>, reply: FastifyReplyTypeBox<typeof CapabilityEndpointSchema>) => {
  //      const activeScopes = await getActiveProviderScopes(request.server.db, request.query.orgId);

  //      return reply.status(200).send({
  //        ...provider,
  //        capability: {
  //          ...capability,
  //          available: hasPermissions(capability.id, activeScopes, provider.scopeMapping),
  //        }
  //      });
  //    })
  //  })
  //});

  app.get(
    `/capabilities/:providerId/:capabilityId`,
    {
      schema: CapabilityEndpointSchema,
    },
    async (
      request: FastifyRequestTypeBox<typeof CapabilityEndpointSchema>,
      reply: FastifyReplyTypeBox<typeof CapabilityEndpointSchema>,
    ) => {
      const activeScopes = await getActiveProviderScopes(
        request.server.db,
        request.query.orgId,
      );

      const provider = registry.getProvider(request.params.providerId);
      const capability = provider?.getCapability(request.params.capabilityId);
      if (!capability) {
        return reply.status(404).send({
          error: "Capability not found",
        });
      }

      return reply.status(200).send({
        ...provider!.metadata,
        capability: {
          ...capability.meta,
          available: hasPermissions(
            capability.meta.id,
            activeScopes,
            provider!.scopeMapping,
          ),
        },
      });
    },
  );
}
