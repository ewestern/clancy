import { Type, Static } from '@sinclair/typebox';
import { ErrorSchema } from './index.js';

export type PromptTemplate = Static<typeof PromptTemplateSchema>;

// Prompt template schema using TypeBox
export const PromptTemplateSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  version: Type.String(),
  content: Type.String(),
  variables: Type.Array(Type.String()),
  metadata: Type.Object({
    description: Type.String(),
    author: Type.String(),
    createdAt: Type.String(),
    tags: Type.Optional(Type.Array(Type.String())),
    modelRecommendations: Type.Optional(Type.Array(Type.String())),
  }),
  performance: Type.Optional(Type.Object({
    successRate: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
    avgResponseTime: Type.Optional(Type.Number({ minimum: 0 })),
    qualityScore: Type.Optional(Type.Number({ minimum: 0, maximum: 10 })),
    totalUsage: Type.Number({ minimum: 0, default: 0 }),
  })),
});

// Request/Response schemas
export const PromptVersionComparisonSchema = Type.Object({
  version1: Type.Object({
    version: Type.String(),
    performance: Type.Any(),
  }),
  version2: Type.Object({
    version: Type.String(),
    performance: Type.Any(),
  }),
  comparison: Type.Object({
    successRateDiff: Type.Number(),
    qualityScoreDiff: Type.Number(),
    responseTimeDiff: Type.Number(),
  }),
});

export const ABTestRequestSchema = Type.Object({
  promptId: Type.String(),
  versions: Type.Array(Type.String()),
  testInput: Type.Object({
    jobDescription: Type.String(),
  }),
  iterations: Type.Optional(Type.Number({ minimum: 1, maximum: 10 })),
});

export const ABTestResultSchema = Type.Object({
  promptId: Type.String(),
  versions: Type.Array(Type.String()),
  results: Type.Array(Type.Object({
    version: Type.String(),
    iterations: Type.Number(),
    results: Type.Array(Type.Any()),
    metrics: Type.Any(),
  })),
  recommendation: Type.Object({
    bestVersion: Type.String(),
    reason: Type.String(),
    confidence: Type.Number(),
  }),
});

export const SetActivePromptResponseSchema = Type.Object({
  message: Type.String(),
  promptId: Type.String(),
  activeVersion: Type.String(),
});

export const PromptMetricsSchema = Type.Object({
  version: Type.String(),
  metrics: Type.Any(),
});

// Parameter schemas
export const PromptIdParamSchema = Type.Object({
  promptId: Type.String(),
});

export const PromptVersionParamSchema = Type.Object({
  promptId: Type.String(),
  version: Type.String(),
});

export const PromptCompareParamSchema = Type.Object({
  promptId: Type.String(),
  version1: Type.String(),
  version2: Type.String(),
});

// Endpoint schemas
export const GetPromptsEndpoint = {
  tags: ['Prompts'],
  summary: 'List all prompt templates',
  response: {
    200: Type.Array(PromptTemplateSchema),
  },
};

export const GetPromptEndpoint = {
  tags: ['Prompts'],
  summary: 'Get all versions of a specific prompt',
  params: PromptIdParamSchema,
  response: {
    200: Type.Array(PromptTemplateSchema),
    404: ErrorSchema,
  },
};

export const GetActivePromptEndpoint = {
  tags: ['Prompts'],
  summary: 'Get the active version of a prompt',
  params: PromptIdParamSchema,
  response: {
    200: PromptTemplateSchema,
    404: ErrorSchema,
  },
};

export const SetActivePromptEndpoint = {
  tags: ['Prompts'],
  summary: 'Set the active version of a prompt',
  params: PromptVersionParamSchema,
  response: {
    200: SetActivePromptResponseSchema,
    404: ErrorSchema,
  },
};

export const ComparePromptVersionsEndpoint = {
  tags: ['Prompts'],
  summary: 'Compare performance between two prompt versions',
  params: PromptCompareParamSchema,
  response: {
    200: PromptVersionComparisonSchema,
    404: ErrorSchema,
  },
};

export const ABTestPromptsEndpoint = {
  tags: ['Prompts'],
  summary: 'Run A/B tests between prompt versions',
  body: ABTestRequestSchema,
  response: {
    200: ABTestResultSchema,
    400: ErrorSchema,
  },
};

export const GetPromptMetricsEndpoint = {
  tags: ['Prompts'],
  summary: 'Get performance metrics for all versions of a prompt',
  params: PromptIdParamSchema,
  response: {
    200: Type.Array(PromptMetricsSchema),
    404: ErrorSchema,
  },
}; 