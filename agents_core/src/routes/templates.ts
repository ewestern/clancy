import { FastifyPluginAsync } from "fastify";
import {
  GetPublicTemplateEndpoint,
  ListPublicTemplatesEndpoint,
  TemplatePublicSchema,
  TemplateStatus,
  TemplateStatusSchema,
} from "../models/templates.js";
import {
  FastifyReplyTypeBox,
  FastifyRequestTypeBox,
  FastifyTypeBox,
} from "../types/fastify.js";
import { and, eq } from "drizzle-orm";
import { templates } from "../database/schema.js";

export const templateRoutes: FastifyPluginAsync = async (
  fastify: FastifyTypeBox,
) => {
  fastify.addSchema(TemplatePublicSchema);
  fastify.addSchema(TemplateStatusSchema);

  fastify.get(
    "/public/templates",
    { schema: ListPublicTemplatesEndpoint },
    async (_request, reply: FastifyReplyTypeBox<typeof ListPublicTemplatesEndpoint>) => {
      const rows = await fastify.db.query.templates.findMany({
        where: eq(templates.status, TemplateStatus.Active),
      });
      return reply.status(200).send(rows);
    },
  );

  fastify.get(
    "/public/templates/:id",
    { schema: GetPublicTemplateEndpoint },
    async (
      request: FastifyRequestTypeBox<typeof GetPublicTemplateEndpoint>,
      reply: FastifyReplyTypeBox<typeof GetPublicTemplateEndpoint>,
    ) => {
      const row = await fastify.db.query.templates.findFirst({
        where: and(
          eq(templates.id, request.params.id),
          eq(templates.status, TemplateStatus.Active),
        ),
      });
      if (!row) {
        return reply.status(404).send({
          error: "Not Found",
          message: "Template not found",
          statusCode: 404,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      }
      return reply.status(200).send(row);
    },
  );
};


