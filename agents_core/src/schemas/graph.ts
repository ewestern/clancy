import { Type } from '@sinclair/typebox';
import { 
  CreateMultiAgentSystemSchema, 
  MultiAgentSpecSchema, 
  ErrorSchema,
  OrgIdParamSchema 
} from './index.js';

// Path parameter schemas
export const GraphParamsSchema = Type.Object({
  orgId: Type.String({ format: 'uuid' }),
  systemId: Type.String({ format: 'uuid' }),
});

// Query parameter schemas
export const GraphListQuerySchema = Type.Object({
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 20 })),
  offset: Type.Optional(Type.Number({ minimum: 0, default: 0 })),
  status: Type.Optional(Type.String()),
});

// Response schemas
export const CreateGraphResponseSchema = Type.Object({
  systemId: Type.String({ format: 'uuid' }),
  specification: MultiAgentSpecSchema,
});

export const GraphSystemResponseSchema = Type.Object({
  systemId: Type.String({ format: 'uuid' }),
  name: Type.String(),
  jobDescription: Type.String(),
  specification: MultiAgentSpecSchema,
  status: Type.String(),
  createdAt: Type.String({ format: 'date-time' }),
});

export const GraphSystemSummarySchema = Type.Object({
  systemId: Type.String({ format: 'uuid' }),
  name: Type.String(),
  jobDescription: Type.String(),
  status: Type.String(),
  agentCount: Type.Number(),
  createdAt: Type.String({ format: 'date-time' }),
});

export const GraphListResponseSchema = Type.Object({
  systems: Type.Array(GraphSystemSummarySchema),
  total: Type.Number(),
  limit: Type.Number(),
  offset: Type.Number(),
});

// Endpoint schemas
export const CreateGraphEndpoint = {
  tags: ['graphs'],
  summary: 'Create a multi-agent system from job description',
  description: 'Analyzes a job description and creates a complete multi-agent workflow specification',
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
  tags: ['graphs'],
  summary: 'Get multi-agent system specification',
  params: GraphParamsSchema,
  response: {
    200: GraphSystemResponseSchema,
    404: ErrorSchema,
    500: ErrorSchema,
  },
  security: [{ bearerAuth: [] }],
};

export const ListGraphsEndpoint = {
  tags: ['graphs'],
  summary: 'List multi-agent systems for organization',
  params: OrgIdParamSchema,
  querystring: GraphListQuerySchema,
  response: {
    200: GraphListResponseSchema,
    500: ErrorSchema,
  },
  security: [{ bearerAuth: [] }],
}; 