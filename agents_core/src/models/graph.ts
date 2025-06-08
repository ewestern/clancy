import { Static, Type } from "@sinclair/typebox";
import { ErrorSchema, StringEnum, UnionOneOf } from "./shared.js";
import { P } from "pino";


/// 

export const TaskDecompositionSchema = Type.Object({
  taskDescription: Type.String(),
  category: Type.String({description: "A best-effort attempt to categorize the task, such that agents performing similar tasks can be grouped together."}),
  dependencies: Type.Array(Type.String(), {description: "A list of other task descriptions this depends on."}),
});

export const TaskDecompositionLLMResponseSchema = Type.Object({
  tasks: Type.Array(TaskDecompositionSchema),
});

export const IntegrationOptionSchema = Type.Intersect([
  TaskDecompositionSchema,
  Type.Object({
    capabilities: Type.Array(Type.String(), {description: "A list of all capabilities that the agent could use to perform the task."}),
  }),
]);

export const IntegrationEngineerLLMResponseSchema = Type.Object({
  tasks: Type.Array(IntegrationOptionSchema),
});

export const AgentGroupingLLMResponseSchema = Type.Object({
  agentGroups: Type.Array(Type.Object({
    agentName: Type.String(),
    tasks: Type.Array(Type.Object({
      taskDescription: Type.String(),
      capabilityId: Type.String(),
    })),
  })),
});

export enum IntegrationType {
  Specific = "specific",
  Generic = "generic",
}

export const SpecificIntegrationSchema = Type.Object({
  integrationType: Type.Literal("specific"),
  providerName: Type.String({description: "The name of the provider. (E.g, 'Slack', 'Google Sheets', 'Salesforce', 'Hubspot', etc.)"}),
  providerCapabilities: Type.Array(Type.String(), {description: "A list of needed capabilities to accomplish the task. (E.g., 'send emails', 'read documents', 'add customers', etc.)"}),
})

export const GenericIntegrationSchema = Type.Object({
  integrationType: Type.Literal("generic"),
  providerDescription: Type.String({description: "A description of the provider. (E.g, 'CRM', 'Email', 'SMS', 'Calendar', etc.)"}),
  providerCapabilities: Type.Array(Type.String(), {description: "A list of needed capabilities to accomplish the task. (E.g., 'send emails', 'read documents', 'add customers', etc.)"}),
})

export const IntegrationTypeSchema = UnionOneOf([SpecificIntegrationSchema, GenericIntegrationSchema]);



export const CapabilitiesAssessmentSchema = Type.Object({
  taskDescription: Type.String(),
  integrationType: IntegrationTypeSchema,
})


export const CapabilitiesAssessmentLLMResponseSchema = Type.Object({
  assessments: Type.Array(CapabilitiesAssessmentSchema),
})

//// 
export const TaskNodeSpecSchema = Type.Object(
  {
    id: Type.String(),
    type: Type.Literal("task"),
    metadata: Type.Object({}),
    description: Type.String({
      description: "A step-by-step description of the task.",
    }),
    capability: Type.Array(Type.String(), {
      description: "The capability id.",
      minItems: 1,
    }),
    handoff: Type.Optional(
      Type.Object({
        to: Type.String({ description: "The id of the agent to handoff to." }),
        message: Type.String({ description: "The message to handoff." }),
      }),
    ),
  },
  { description: `A task node is a node that represents a task. ` },
);

export const PlaceholderNodeSpecSchema = Type.Object({
  id: Type.Literal("placeholder"),
  type: Type.Literal("placeholder"),
  metadata: Type.Object({}),
  description: Type.String({
    description: "A step-by-step description of the task.",
  }),
  options: Type.Array(Type.String(), {
    description: "A list of potential capabilities that might be used to perform the task.",
  }),
})


export const WorkflowNodeSpecSchema = Type.Object(
  {
    id: Type.String(),
    metadata: Type.Object({}),
    nodes: Type.Array(UnionOneOf([TaskNodeSpecSchema, PlaceholderNodeSpecSchema]), {
      description: `A series of discrete actions for the agent to perform. If we don't know which provider or capability to use,
      or if we do not have the correct capability for the task, we use a placeholder node with a detailed description of the task.
      `,
    }),
    edges: Type.Array(Type.Tuple([Type.String(), Type.String()]), {
      description:
        "The edges of the workflow. The first element is the source node id, the second is the target node id.",
    }),
  },
  {
    description: `
  A workflow is a subgraph of related tasks. Tasks within a workflow may be grouped together based on the following heuristics:
  - Trigger source:
    * "When an email arrives ... " -> email workflow
    * "Monthly on the first..." -> scheduler workflow
  - Temporal coupling:
    * Steps that must happen in sequence usually belong to the same workflow.
  - Degree of automation:
    * Highly manual steps often make natural boundaries for workflows.`,
  },
);

export const EmployeeGraphSpecSchema = Type.Object({
  graphId: Type.String({ format: "uuid" }),
  version: Type.String(),
  jobDescription: Type.String({
    description: "The job description supplied by the user.",
  }),
  metadata: Type.Object({}),
  nodes: Type.Array(WorkflowNodeSpecSchema),
  edges: Type.Array(Type.Tuple([Type.String(), Type.String()]), {
    description:
      "The edges of the workflow. The first element is the source node id, the second is the target node id.",
  }),
});
export type EmployeeGraphSpec = Static<typeof EmployeeGraphSpecSchema>;

////
// Multi-Agent System Creation Schema
export const CreateMultiAgentSystemSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 255 }),
  jobDescription: Type.String({ minLength: 1, maxLength: 5000 }),
  metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
});
// Multi-Agent Spec Schema
// Node Spec Schema
export const NodeSpecSchema = Type.Object({
  id: Type.String(),
  type: Type.String(),
  config: Type.Record(Type.String(), Type.Unknown()),
});

// Agent Spec Schema
export const AgentSpecSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  description: Type.String(),
  category: Type.String(),
  nodes: Type.Array(NodeSpecSchema),
  edges: Type.Array(Type.Array(Type.String())),
  specification: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
});
export const InterAgentMessageSchema = Type.Object({
  from: Type.String(),
  to: Type.String(),
  messageType: Type.String(),
  schema: Type.Record(Type.String(), Type.Unknown()),
});

export const MultiAgentSpecSchema = Type.Object({
  version: Type.String(),
  jobDescription: Type.String(),
  agents: Type.Array(AgentSpecSchema),
  interAgentMessages: Type.Array(InterAgentMessageSchema),
  executionMode: Type.String(),
});
// Inter-Agent Message Schema

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
  params: Type.Object({
    orgId: Type.String({ format: "uuid" }),
  }),
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
  params: Type.Object({
    orgId: Type.String({ format: "uuid" }),
  }),
  querystring: GraphListQuerySchema,
  response: {
    200: GraphListResponseSchema,
    500: ErrorSchema,
  },
  security: [{ bearerAuth: [] }],
};
