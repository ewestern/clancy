import { FastifyPluginAsync } from "fastify";
import {
  GetApprovalRequestsEndpoint,
  GetApprovalRequestEndpoint,
  CreateApprovalRequestEndpoint,
  UpdateApprovalRequestEndpoint,
  ApprovalRequestSchema,
} from "../models/approvals.js";
import { FastifyRequestTypeBox } from "../types/fastify.js";
import { approvalRequests } from "../database/schema.js";
import { and, eq } from "drizzle-orm";

export const approvalRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addSchema(ApprovalRequestSchema);

  fastify.get(
    "/approvals",
    {
      schema: GetApprovalRequestsEndpoint,
    },
    async (
      request: FastifyRequestTypeBox<typeof GetApprovalRequestsEndpoint>,
      reply,
    ) => {
      const filters = [];
      if (request.query.status) {
        filters.push(eq(approvalRequests.status, request.query.status));
      }
      const approvals = await fastify.db.query.approvalRequests.findMany({
        where: and(...filters),
      });
      return reply.status(200).send(approvals);
    },
  );

  fastify.get(
    "/approvals/:id",
    {
      schema: GetApprovalRequestEndpoint,
    },
    async (
      request: FastifyRequestTypeBox<typeof GetApprovalRequestEndpoint>,
      reply,
    ) => {
      const approval = await fastify.db.query.approvalRequests.findFirst({
        where: eq(approvalRequests.id, request.params.id),
      });
      return reply.status(200).send(approval);
    },
  );

  fastify.post(
    "/approvals",
    {
      schema: CreateApprovalRequestEndpoint,
    },
    async (
      request: FastifyRequestTypeBox<typeof CreateApprovalRequestEndpoint>,
      reply,
    ) => {
      const { createdAt, updatedAt, ...toInsert } = request.body;
      const approval = await fastify.db
        .insert(approvalRequests)
        .values(toInsert)
        .returning();
      return reply.status(200).send(approval[0]);
    },
  );

  fastify.put(
    "/approvals/:id",
    {
      schema: UpdateApprovalRequestEndpoint,
    },
    async (
      request: FastifyRequestTypeBox<typeof UpdateApprovalRequestEndpoint>,
      reply,
    ) => {
      const id = request.params.id;
      const { ...toUpdate } = request.body;
      const approvals = await fastify.db
        .update(approvalRequests)
        .set(toUpdate)
        .where(eq(approvalRequests.id, id))
        .returning();
      return reply.status(200).send(approvals[0]);
    },
  );
};
