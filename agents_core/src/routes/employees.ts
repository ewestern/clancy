import { FastifyPluginAsync } from "fastify";
import {
  EmployeeSchema,
  EmployeeStatus,
  EmployeeStatusSchema,
  GetEmployeeEndpoint,
} from "../models/employees.js";
import {
  CreateEmployeeEndpoint,
  GetEmployeesEndpoint,
} from "../models/employees.js";
import {
  FastifyRequestTypeBox,
  FastifyReplyTypeBox,
} from "../types/fastify.js";
import { Agent, AgentSchema, AgentStatusSchema } from "../models/agents.js";
import { agents, aiEmployees } from "../database/schema.js";
import { TriggersApi, Configuration } from "@ewestern/connect_hub_sdk";
import { getAuth } from "@clerk/fastify";
import { eq } from "drizzle-orm";
import { getCurrentTimestamp, publishToKinesis } from "../utils.js";
import { EventType } from "@ewestern/events";

async function createTriggerRegistration(agent: Agent, token: Promise<string>) {
  const configuration = new Configuration({
    basePath: process.env.CONNECT_HUB_API_URL!,
    accessToken: token,
  });
  const triggersApi = new TriggersApi(configuration);
  const triggerRegistrations = await triggersApi.triggerRegistrationsPost({
    triggerRegistration: {
      agentId: agent.id!,
      params: agent.trigger.triggerParams,
      providerId: agent.trigger.providerId,
      triggerId: agent.trigger.id!,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    },
  });
  return triggerRegistrations;
}

export const employeeRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addSchema(EmployeeSchema);
  fastify.addSchema(AgentSchema);
  fastify.addSchema(EmployeeStatusSchema);
  fastify.addSchema(AgentStatusSchema);

  fastify.post(
    "/employees",
    {
      schema: CreateEmployeeEndpoint,
    },
    async (
      request: FastifyRequestTypeBox<typeof CreateEmployeeEndpoint>,
      reply: FastifyReplyTypeBox<typeof CreateEmployeeEndpoint>,
    ) => {
      // steps: create employee, create agents, create trigger-registrations, publish event
      const auth = getAuth(request);
      if (!auth.userId) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "Unauthorized",
          statusCode: 401,
          timestamp: getCurrentTimestamp(),
        });
      }

      const orgId = auth.orgId;
      const { agents: newAgents, ...employee } = request.body;
      return fastify.db.transaction(async (tx) => {
        const [createdEmployee] = await tx
          .insert(aiEmployees)
          .values(employee)
          .returning();
        if (!createdEmployee) {
          throw new Error("Failed to create employee");
        }
        const createdAgents = await tx
          .insert(agents)
          .values(newAgents)
          .returning();
        const triggerRegistrations = await Promise.all(
          createdAgents.map((agent) =>
            createTriggerRegistration(
              agent,
              auth.getToken() as Promise<string>,
            ),
          ),
        );
        await publishToKinesis(
          [
            {
              type: EventType.EmployeeCreated,
              orgId: createdEmployee.orgId,
              userId: createdEmployee.userId,
              employeeId: createdEmployee.id,
              timestamp: getCurrentTimestamp(),
            },
          ],
          (event) => event.orgId,
        );
        return {
          ...createdEmployee,
          agents: createdAgents,
        };
      });
    },
  );

  fastify.get(
    "/employees",
    {
      schema: GetEmployeesEndpoint,
    },
    async (
      request: FastifyRequestTypeBox<typeof GetEmployeesEndpoint>,
      reply: FastifyReplyTypeBox<typeof GetEmployeesEndpoint>,
    ) => {
      const employees = await fastify.db.query.aiEmployees.findMany({
        with: {
          agents: true,
        },
      });
      return reply.status(200).send(employees);
    },
  );

  fastify.get(
    "/employees/:id",
    {
      schema: GetEmployeeEndpoint,
    },
    async (
      request: FastifyRequestTypeBox<typeof GetEmployeeEndpoint>,
      reply: FastifyReplyTypeBox<typeof GetEmployeeEndpoint>,
    ) => {
      const { id } = request.params;
      const employee = await fastify.db.query.aiEmployees.findFirst({
        where: eq(aiEmployees.id, id),
        with: {
          agents: true,
        },
      });
      if (!employee) {
        return reply.status(404).send({
          id: id,
          orgId: "",
          userId: "",
          name: "",
          status: EmployeeStatus.Inactive,
          agents: [],
        });
      }
      return reply.status(200).send(employee);
    },
  );
};
