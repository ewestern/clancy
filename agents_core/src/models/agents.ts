import { Static, Type } from "@sinclair/typebox";
import { ErrorSchema, Ref, StringEnum } from "./shared.js";

export enum AgentStatus {
  Active = "active",
  Inactive = "inactive",
}
export const AgentStatusSchema = StringEnum(
  [AgentStatus.Active, AgentStatus.Inactive],
  { $id: "AgentStatus" },
);

export const AgentSchema = Type.Object(
  {
    id: Type.ReadonlyOptional(Type.String()),
    orgId: Type.String(),
    name: Type.String(),
    description: Type.String(),
    userId: Type.String(),
    employeeId: Type.ReadonlyOptional(Type.String()),
    status: Ref(AgentStatusSchema),
    capabilities: Type.Array(
      Type.Object({
        providerId: Type.String(),
        id: Type.String(),
      }),
    ),
    trigger: Type.Object({
      providerId: Type.String(),
      id: Type.String(),
      triggerParams: Type.Any(),
    }),
    prompt: Type.String(),
  },
  {
    $id: "Agent",
  },
);

export type Agent = Static<typeof AgentSchema>;

export const CreateAgentEndpoint = {
  tags: ["Agents"],
  summary: "Create an agent",
  description: "Create an agent",
  security: [{ bearerAuth: [] }],
  body: Ref(AgentSchema),
  response: {
    200: Ref(AgentSchema),
    400: ErrorSchema,
  },
};

export const GetAgentEndpoint = {
  tags: ["Agents"],
  summary: "Get an agent",
  description: "Get an agent",
  security: [{ bearerAuth: [] }],
  params: Type.Object({
    id: Type.String(),
  }),
  response: {
    200: Ref(AgentSchema),
    404: ErrorSchema,
  },
};

export const ListAgentsEndpoint = {
  tags: ["Agents"],
  summary: "List agents",
  description: "List agents",
  security: [{ bearerAuth: [] }],
  querystring: Type.Object({
    orgId: Type.String(),
  }),
  response: {
    200: Type.Array(Ref(AgentSchema)),
  },
};

export const UpdateAgentEndpoint = {
  tags: ["Agents"],
  summary: "Update an agent",
  description: "Update an agent",
  security: [{ bearerAuth: [] }],
  params: Type.Object({
    id: Type.String(),
  }),
  body: Type.Partial(Type.Omit(AgentSchema, ["id"]), {
    $id: "UpdateAgentBody",
  }),
  response: {
    200: Ref(AgentSchema),
    400: ErrorSchema,
    404: ErrorSchema,
  },
};

export const DeleteAgentEndpoint = {
  tags: ["Agents"],
  summary: "Delete an agent",
  description: "Delete an agent",
  security: [{ bearerAuth: [] }],
  params: Type.Object({
    id: Type.String(),
  }),
  response: {
    204: Type.Null(),
    404: ErrorSchema,
  },
};
