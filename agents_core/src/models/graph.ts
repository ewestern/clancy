import { Type } from "@sinclair/typebox";
import {
  CreateMultiAgentSystemSchema,
  MultiAgentSpecSchema,
  ErrorSchema,
  OrgIdParamSchema,
  GraphType,
  StringEnum,
} from "./index.js";

export const ProviderSchema = StringEnum([
  "quickbooks",
  "salesforce",
  "zendesk",
  "hubspot",
  "zendesk",
]);

export const ScopeSchema = StringEnum(["read", "write", "admin"]);

/*
export type Permission = {
  provider: string;                 // e.g. "quickbooks"
  scopes: string[];                 // provider-native strings
  resourceFilter?: Record<string,string>;
};
interface EmployeeGraphSpec {
    graphId: string;
    type: "employee";
    version: string;
    jobDescription: string;
    metadata: {
        role: string;
        organizationId: string;
    };
    nodes: SkillNodeSpec[];
    edges: string[][];
}
*/

export const ActionSchema = StringEnum(["read", "write", "admin"]);

export const PermissionSchema = Type.Object({
  provider: ProviderSchema,
  scopes: Type.Array(ScopeSchema),
  resourceFilter: Type.Record(Type.String(), Type.String()),
});

export const GraphTypeEnum = StringEnum([
  GraphType.DIGITAL_EMPLOYEE,
  GraphType.SKILL,
]);

export const NodeSpecSchema = Type.Object({
  id: Type.String(),
  action: ActionSchema,
  metadata: Type.Object({}),
  permissions: Type.Array(PermissionSchema),
});
export const GraphSpecSchema = Type.Object({
  graphId: Type.String({ format: "uuid" }),
  type: GraphTypeEnum,
  version: Type.String(),
  jobDescription: Type.String(),
  metadata: Type.Object({}),
  nodes: Type.Array(NodeSpecSchema),
  edges: Type.Array(Type.Tuple([Type.String(), Type.String()])),
});

export const GraphParamsSchema = Type.Object({
  orgId: Type.String({ format: "uuid" }),
  systemId: Type.String({ format: "uuid" }),
});

// Query parameter schemas
export const GraphListQuerySchema = Type.Object({
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 20 })),
  offset: Type.Optional(Type.Number({ minimum: 0, default: 0 })),
  status: Type.Optional(Type.String()),
});

// Response schemas
export const CreateGraphResponseSchema = Type.Object({
  systemId: Type.String({ format: "uuid" }),
  specification: MultiAgentSpecSchema,
});

export const GraphSystemResponseSchema = Type.Object({
  systemId: Type.String({ format: "uuid" }),
  name: Type.String(),
  jobDescription: Type.String(),
  specification: MultiAgentSpecSchema,
  status: Type.String(),
  createdAt: Type.String({ format: "date-time" }),
});

export const GraphSystemSummarySchema = Type.Object({
  systemId: Type.String({ format: "uuid" }),
  name: Type.String(),
  jobDescription: Type.String(),
  status: Type.String(),
  agentCount: Type.Number(),
  createdAt: Type.String({ format: "date-time" }),
});

export const GraphListResponseSchema = Type.Object({
  systems: Type.Array(GraphSystemSummarySchema),
  total: Type.Number(),
  limit: Type.Number(),
  offset: Type.Number(),
});

// Endpoint schemas
export const CreateGraphEndpoint = {
  tags: ["graphs"],
  summary: "Create a multi-agent system from job description",
  description:
    "Analyzes a job description and creates a complete multi-agent workflow specification",
  params: OrgIdParamSchema,
  body: CreateMultiAgentSystemSchema,
  response: {
    201: CreateGraphResponseSchema,
    400: ErrorSchema,
    500: ErrorSchema,
  },
  security: [{ bearerAuth: [] }],
};

export const GetGraphEndpoint = {
  tags: ["graphs"],
  summary: "Get multi-agent system specification",
  params: GraphParamsSchema,
  response: {
    200: GraphSystemResponseSchema,
    404: ErrorSchema,
    500: ErrorSchema,
  },
  security: [{ bearerAuth: [] }],
};

export const ListGraphsEndpoint = {
  tags: ["graphs"],
  summary: "List multi-agent systems for organization",
  params: OrgIdParamSchema,
  querystring: GraphListQuerySchema,
  response: {
    200: GraphListResponseSchema,
    500: ErrorSchema,
  },
  security: [{ bearerAuth: [] }],
};
