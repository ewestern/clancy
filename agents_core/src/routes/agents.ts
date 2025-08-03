import { FastifyPluginAsync } from "fastify";
import {
  AgentSchema,
  CreateAgentEndpoint,
  GetAgentEndpoint,
  ListAgentsEndpoint,
  UpdateAgentEndpoint,
  DeleteAgentEndpoint,
  AgentStatusSchema,
  AgentScopeSchema,
} from "../models/agents.js";
import {
  FastifyRequestTypeBox,
  FastifyReplyTypeBox,
} from "../types/fastify.js";
import { agents } from "../database/schema.js";
import { eq, and } from "drizzle-orm";
import { Database } from "../plugins/database.js";
import { Static } from "@sinclair/typebox";

async function createAgentHandler(
  db: Database,
  agent: Static<typeof AgentSchema>,
) {
  const [createdAgent] = await db.insert(agents).values(agent).returning();
  return createdAgent;
}

export const agentRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addSchema(AgentSchema);
  fastify.addSchema(AgentStatusSchema);
  fastify.addSchema(AgentScopeSchema);

  fastify.get(
    "/agents",
    {
      schema: ListAgentsEndpoint,
    },
    async (
      request: FastifyRequestTypeBox<typeof ListAgentsEndpoint>,
      reply: FastifyReplyTypeBox<typeof ListAgentsEndpoint>,
    ) => {
      const filters = [];
      if (request.query.orgId) {
        filters.push(eq(agents.orgId, request.query.orgId));
      }
      const agentsList = await fastify.db.query.agents.findMany({
        where: and(...filters),
      });
      return reply.status(200).send(agentsList);
    },
  );

  fastify.get(
    "/agents/:id",
    {
      schema: GetAgentEndpoint,
    },
    async (
      request: FastifyRequestTypeBox<typeof GetAgentEndpoint>,
      reply: FastifyReplyTypeBox<typeof GetAgentEndpoint>,
    ) => {
      const agent = await fastify.db.query.agents.findFirst({
        where: eq(agents.id, request.params.id),
      });
      if (!agent) {
        return reply.status(404).send({
          error: "Not Found",
          message: "Agent not found",
          statusCode: 404,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      }
      return reply.status(200).send(agent);
    },
  );

  fastify.post(
    "/agents",
    {
      schema: CreateAgentEndpoint,
    },
    async (
      request: FastifyRequestTypeBox<typeof CreateAgentEndpoint>,
      reply: FastifyReplyTypeBox<typeof CreateAgentEndpoint>,
    ) => {
      const createdAgent = await createAgentHandler(fastify.db, request.body);
      return reply.status(201).send(createdAgent);
    },
  );

  fastify.put(
    "/agents/:id",
    {
      schema: UpdateAgentEndpoint,
    },
    async (
      request: FastifyRequestTypeBox<typeof UpdateAgentEndpoint>,
      reply: FastifyReplyTypeBox<typeof UpdateAgentEndpoint>,
    ) => {
      const id = request.params.id;
      const { ...toUpdate } = request.body;
      const [updatedAgent] = await fastify.db
        .update(agents)
        .set(toUpdate)
        .where(eq(agents.id, id))
        .returning();
      if (!updatedAgent) {
        return reply.status(404).send({
          error: "Not Found",
          message: "Agent not found",
          statusCode: 404,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      }
      return reply.status(200).send(updatedAgent);
    },
  );

  fastify.delete(
    "/agents/:id",
    {
      schema: DeleteAgentEndpoint,
    },
    async (
      request: FastifyRequestTypeBox<typeof DeleteAgentEndpoint>,
      reply,
    ) => {
      const id = request.params.id;
      const [deletedAgent] = await fastify.db
        .delete(agents)
        .where(eq(agents.id, id))
        .returning();
      if (!deletedAgent) {
        return reply.status(404).send({
          error: "Not Found",
          message: "Agent not found",
          statusCode: 404,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      }
      return reply.status(204).send();
    },
  );
};
