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
export enum AgentScope {
  Org = "org",
  User = "user",
}

export const AgentScopeSchema = StringEnum([AgentScope.Org, AgentScope.User], {
  $id: "AgentScope",
});

export const AgentSchema = Type.Recursive((This) =>
  Type.Object(
    {
      id: Type.ReadonlyOptional(Type.String()),
      orgId: Type.String(),
      name: Type.String(),
      description: Type.String(),
      scope: Ref(AgentScopeSchema),
      ownerId: Type.String(),
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
      }),
      prompt: Type.String(),
      subagents: Type.Optional(Type.Array(This)),
    },
    {
      $id: "Agent",
    },
  ),
);

export type Agent = Static<typeof AgentSchema>;

export const CreateAgentEndpoint = {
  tags: ["Agents"],
  summary: "Create an agent",
  description: "Create an agent",
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
  params: Type.Object({
    id: Type.String(),
  }),
  body: Type.Partial(Type.Omit(AgentSchema, ["id"])),
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
  params: Type.Object({
    id: Type.String(),
  }),
  response: {
    204: Type.Null(),
    404: ErrorSchema,
  },
};
