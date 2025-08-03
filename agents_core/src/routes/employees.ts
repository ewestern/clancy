import { FastifyPluginAsync } from "fastify";
import {
  EmployeeSchema,
  EmployeeStatus,
  EmployeeStatusSchema,
} from "../models/employees.js";
import {
  CreateEmployeeEndpoint,
  GetEmployeesEndpoint,
} from "../models/employees.js";
import {
  FastifyRequestTypeBox,
  FastifyReplyTypeBox,
} from "../types/fastify.js";
import {
  AgentSchema,
  AgentScopeSchema,
  AgentStatusSchema,
} from "../models/agents.js";
import { agents, aiEmployees } from "../database/schema.js";
import { Static } from "@sinclair/typebox";

export const employeeRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addSchema(EmployeeSchema);
  fastify.addSchema(AgentSchema);
  fastify.addSchema(EmployeeStatusSchema);
  fastify.addSchema(AgentScopeSchema);
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
          .values(
            newAgents.map((agent: Static<typeof AgentSchema>) => ({
              ...agent,
            })),
          )
          .returning();
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
      return reply.status(200).send(
        employees.map((employee) => ({
          ...employee,
          status: EmployeeStatus.Active,
        })),
      );
    },
  );
};
