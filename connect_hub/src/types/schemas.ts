import { Type } from '@sinclair/typebox';




// OAuth Complete Schema
export const OAuthCompleteRequestSchema = Type.Object({
  orgId: Type.String(),
  connectionId: Type.String(),
  authCode: Type.String(),
  state: Type.Optional(Type.String()),
}, { $id: 'OAuthCompleteRequest' });

export const OAuthCompleteResponseSchema = Type.Object({
  success: Type.Boolean(),
  connectionId: Type.String(),
  provider: Type.String(),
  scopes: Type.Array(Type.String()),
}, { $id: 'OAuthCompleteResponse' });

// Proxy Request Schema
export const ProxyRequestSchema = Type.Object({
  orgId: Type.String(),
  params: Type.Record(Type.String(), Type.Unknown()),
  correlationId: Type.Optional(Type.String()),
}, { $id: 'ProxyRequest' });

export const ProxyResponseSchema = Type.Object({
  status: Type.Union([Type.Literal('success'), Type.Literal('error')]),
  data: Type.Optional(Type.Unknown()),
  error: Type.Optional(Type.String()),
  correlationId: Type.Optional(Type.String()),
  provider: Type.String(),
  action: Type.String(),
}, { $id: 'ProxyResponse' });

// Integration Catalog Schema
export const IntegrationActionSchema = Type.Object({
  name: Type.String(),
  description: Type.String(),
  parameters: Type.Array(Type.Object({
    name: Type.String(),
    type: Type.String(),
    required: Type.Boolean(),
    description: Type.String(),
  })),
  requiredScopes: Type.Array(Type.String()),
}, { $id: 'IntegrationAction' });

export const IntegrationSchema = Type.Object({
  provider: Type.String(),
  displayName: Type.String(),
  description: Type.String(),
  iconUrl: Type.Optional(Type.String()),
  actions: Type.Array(IntegrationActionSchema),
  oauthScopes: Type.Array(Type.String()),
  status: Type.Union([Type.Literal('active'), Type.Literal('beta'), Type.Literal('deprecated')]),
}, { $id: 'Integration' });

export const CatalogResponseSchema = Type.Array(IntegrationSchema, { $id: 'CatalogResponse' });

// Connection Schema
export const ConnectionSchema = Type.Object({
  id: Type.String(),
  orgId: Type.String(),
  connectionId: Type.String(),
  provider: Type.String(),
  displayName: Type.String(),
  status: Type.Union([Type.Literal('active'), Type.Literal('inactive'), Type.Literal('error')]),
  scopes: Type.Array(Type.String()),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
}, { $id: 'Connection' }); 
