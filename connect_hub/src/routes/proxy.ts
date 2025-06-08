import { FastifyTypeBox } from "../types/fastify.js";
import { ProxyEndpointSchema } from "../models/proxy.js";
import { registry } from "../integrations.js";
import { Type } from "@sinclair/typebox";
import { ExecutionContext} from "../providers/types.js";
import { ProviderKind } from "../models/capabilities.js";
import { connections, tokens } from "../database/schema.js";
import { eq, and, isNotNull } from "drizzle-orm";

export async function proxyRoutes(app: FastifyTypeBox) {

    app.post(
      `/proxy/:providerId/:capabilityId`,
      {
        schema: ProxyEndpointSchema,
      },
      async (request, reply) => {
        console.log("Proxy request", JSON.stringify(request.body));
        const { providerId, capabilityId } = request.params;
        const provider = registry.getProvider(providerId);
        if (!provider) {
          return reply.status(404).send({
            error: "Provider not found",
          });
        }
        let token: Record<string, unknown> | null = null;
        if (provider.metadata.kind === ProviderKind.External) {
          const results = await request.server.db
            .select({
              tokenPayload: tokens.tokenPayload,
            })
            .from(tokens)
            .innerJoin(connections, eq(tokens.connectionId, connections.id))
            .where(
              and(
                eq(connections.providerId, providerId),
                isNotNull(tokens.tokenPayload),
                eq(connections.orgId, request.query.orgId),
              ),
            );
          if (results.length === 0) {
            return reply.status(400).send({
              error: "Unauthorized",
              message: "No token found for this provider and capability",
            });
          }

          token = results[0].tokenPayload;
        }

        const context: ExecutionContext = {
          db: request.server.db,
          orgId: request.query.orgId,
          tokenPayload: token,
          retryCount: 0,
        };
        const capability = provider.getCapability(capabilityId);
        if (!capability) {
          return reply.status(404).send({
            error: "Capability not found",
          });
        }
        const result = await capability.execute(request.body, context);
        return reply.status(200).send(result);
      },
    );

  //registry.getCapabilities().map((provider) => {
  //  provider.capabilities.map((capability) => {
  //    const providerId = provider.id;
  //    const capabilityId = capability.id;
  //    app.post(
  //      `/proxy/${providerId}/${capabilityId}`,
  //      {
  //        schema: {
  //          tags: ["Proxy"],
  //          querystring: Type.Object({
  //            orgId: Type.String(),
  //          }),
  //          body: capability.paramsSchema,
  //          response: {
  //            200: capability.resultSchema,
  //            400: Type.Object({
  //              error: Type.String(),
  //              message: Type.String(),
  //            }),
  //          },
  //        },
  //      },
  //      async (request, reply) => {
  //        //const { capabilityId, providerId } = request.params;
  //        const results = await request.server.db
  //          .select({
  //            tokenPayload: tokens.tokenPayload,
  //          })
  //          .from(tokens)
  //          .innerJoin(connections, eq(tokens.connectionId, connections.id))
  //          .where(
  //            and(
  //              eq(connections.providerId, providerId),
  //              isNotNull(tokens.tokenPayload),
  //              eq(connections.orgId, request.query.orgId),
  //            ),
  //          );
  //        if (results.length === 0) {
  //          return reply.status(400).send({
  //            error: "Unauthorized",
  //            message: "No token found for this provider and capability",
  //          });
  //        }
  //        const token = results[0];
  //        const context: ExecutionContext = {
  //          tokenPayload: token.tokenPayload,
  //          retryCount: 0,
  //        };
  //        const result = await registry
  //          .getProvider(providerId)
  //          .getCapability(capabilityId)
  //          .execute(request.body, context);
  //        return reply.status(200).send(result);
  //      },
  //    );
  //  });
  //});
}
