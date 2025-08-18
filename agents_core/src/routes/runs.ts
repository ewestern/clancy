import { FastifyPluginAsync } from "fastify";
import {
  RunSchema,
  RunActionSchema,
  ActivityEventSchema,
  AgentRunStatusSchema,
  ListRunsEndpoint,
  GetRunEndpoint,
  ListRunEventsEndpoint,
  type Run,
  type RunAction,
  type ActivityEvent,
  AgentActionStatusSchema,
} from "../models/runs.js";
import {
  FastifyRequestTypeBox,
  FastifyReplyTypeBox,
} from "../types/fastify.js";
import { agentRuns, agentRunActions, agents } from "../database/schema.js";
import { eq, and, inArray, desc } from "drizzle-orm";
import { Database } from "../plugins/database.js";
import { getAuth } from "@clerk/fastify";

function formatMessage(action: any): string {
  // Try to extract a meaningful message from result or formattedRequest
  if (action.result?.summary) {
    return action.result.summary;
  }
  if (action.result?.message) {
    return action.result.message;
  }
  if (action.formattedRequest?.summary) {
    return action.formattedRequest.summary;
  }
  // Fallback to capability action
  return `${action.capabilityId} ${action.status}`;
}

async function getAgentIdsByEmployeeId(
  db: Database,
  employeeId: string,
): Promise<string[]> {
  const agentsList = await db.query.agents.findMany({
    where: eq(agents.employeeId, employeeId),
    columns: { id: true },
  });
  return agentsList.map((agent) => agent.id);
}

export const runRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addSchema(RunSchema);
  fastify.addSchema(RunActionSchema);
  fastify.addSchema(ActivityEventSchema);
  fastify.addSchema(AgentRunStatusSchema);
  fastify.addSchema(AgentActionStatusSchema);

  // GET /runs
  fastify.get(
    "/runs",
    {
      schema: ListRunsEndpoint,
    },
    async (
      request: FastifyRequestTypeBox<typeof ListRunsEndpoint>,
      reply: FastifyReplyTypeBox<typeof ListRunsEndpoint>,
    ) => {
      const { userId } = getAuth(request);
      if (!userId) {
        return reply.status(401).send([]);
      }
      const {
        employeeId,
        agentId,
        status,
        limit = 50,
        offset = 0,
        includeActions = false,
      } = request.query;

      const filters = [];

      if (employeeId) {
        const agentIds = await getAgentIdsByEmployeeId(fastify.db, employeeId);
        if (agentIds.length === 0) {
          return reply.status(200).send([]);
        }
        filters.push(inArray(agentRuns.agentId, agentIds));
      }

      if (agentId) {
        filters.push(eq(agentRuns.agentId, agentId));
      }

      if (status) {
        filters.push(eq(agentRuns.status, status));
      }

      const runs = await fastify.db.query.agentRuns.findMany({
        where: and(...filters),
        orderBy: [desc(agentRuns.runStartedAt)],
        limit,
        offset,
        with: includeActions
          ? {
              actions: {
                orderBy: [desc(agentRunActions.createdAt)],
              },
            }
          : undefined,
      });

      const result: Run[] = runs.map((run) => ({
        id: run.id,
        agentId: run.agentId,
        executionId: run.executionId,
        status: run.status,
        result: run.result,
        runStartedAt: run.runStartedAt.toISOString(),
        runCompletedAt: run.runCompletedAt?.toISOString(),
        actions: includeActions
          ? (run as any).actions?.map((action: any) => ({
              id: action.id,
              agentRunId: action.agentRunId,
              providerId: action.providerId,
              capabilityId: action.capabilityId,
              formattedRequest: action.formattedRequest,
              result: action.result,
              status: action.status,
              createdAt: action.createdAt.toISOString(),
            }))
          : undefined,
      }));

      return reply.status(200).send(result);
    },
  );

  // GET /runs/:id
  fastify.get(
    "/runs/:id",
    {
      schema: GetRunEndpoint,
    },
    async (
      request: FastifyRequestTypeBox<typeof GetRunEndpoint>,
      reply: FastifyReplyTypeBox<typeof GetRunEndpoint>,
    ) => {
      const { userId } = getAuth(request);
      if (!userId) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "Unauthorized",
          statusCode: 401,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      }
      const run = await fastify.db.query.agentRuns.findFirst({
        where: eq(agentRuns.id, request.params.id),
        with: {
          actions: {
            orderBy: [desc(agentRunActions.createdAt)],
          },
        },
      });

      if (!run) {
        return reply.status(404).send({
          error: "Not Found",
          message: "Run not found",
          statusCode: 404,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      }

      const result: Run = {
        id: run.id,
        agentId: run.agentId,
        executionId: run.executionId,
        status: run.status,
        result: run.result,
        runStartedAt: run.runStartedAt.toISOString(),
        runCompletedAt: run.runCompletedAt?.toISOString(),
        actions: (run as any).actions?.map((action: any) => ({
          id: action.id,
          agentRunId: action.agentRunId,
          providerId: action.providerId,
          capabilityId: action.capabilityId,
          formattedRequest: action.formattedRequest,
          result: action.result,
          status: action.status,
          createdAt: action.createdAt.toISOString(),
        })),
      };

      return reply.status(200).send(result);
    },
  );

  // GET /runs/events
  fastify.get(
    "/runs/events",
    {
      schema: ListRunEventsEndpoint,
    },
    async (
      request: FastifyRequestTypeBox<typeof ListRunEventsEndpoint>,
      reply: FastifyReplyTypeBox<typeof ListRunEventsEndpoint>,
    ) => {
      const { userId } = getAuth(request);
      if (!userId) {
        return reply.status(401).send([]);
      }
      const { employeeId, agentId, limit = 50, offset = 0 } = request.query;

      const filters = [];

      // Get agent IDs for the employee
      let agentIds: string[];
      if (agentId) {
        agentIds = [agentId];
      } else {
        agentIds = await getAgentIdsByEmployeeId(fastify.db, employeeId);
        if (agentIds.length === 0) {
          return reply.status(200).send([]);
        }
      }

      filters.push(inArray(agentRuns.agentId, agentIds));

      // Join runs, actions, and agents to create activity events
      const query = fastify.db
        .select({
          actionId: agentRunActions.id,
          actionCreatedAt: agentRunActions.createdAt,
          actionStatus: agentRunActions.status,
          providerId: agentRunActions.providerId,
          capabilityId: agentRunActions.capabilityId,
          formattedRequest: agentRunActions.formattedRequest,
          result: agentRunActions.result,
          runId: agentRuns.executionId,
          runStartedAt: agentRuns.runStartedAt,
          runCompletedAt: agentRuns.runCompletedAt,
          agentId: agentRuns.agentId,
          agentName: agents.name,
        })
        .from(agentRunActions)
        .innerJoin(agentRuns, eq(agentRunActions.agentRunId, agentRuns.id))
        .innerJoin(agents, eq(agentRuns.agentId, agents.id))
        .where(and(...filters))
        .orderBy(desc(agentRunActions.createdAt))
        .limit(limit)
        .offset(offset);

      const results = await query;

      const events: ActivityEvent[] = results.map((row) => {
        const durationMs =
          row.runCompletedAt && row.runStartedAt
            ? row.runCompletedAt.getTime() - row.runStartedAt.getTime()
            : undefined;

        return {
          id: row.actionId,
          timestamp: row.actionCreatedAt.toISOString(),
          type: row.actionStatus,
          message: formatMessage(row),
          durationMs,
          runId: row.runId,
          workflowId: row.agentId,
          workflowName: row.agentName,
        };
      });

      return reply.status(200).send(events);
    },
  );
};
