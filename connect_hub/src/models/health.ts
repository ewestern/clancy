// Health Check Schema
import { Type } from '@sinclair/typebox';

export const HealthResponseSchema = Type.Object({
  status: Type.Union([Type.Literal('healthy'), Type.Literal('unhealthy')]),
  timestamp: Type.String({ format: 'date-time' }),
  version: Type.String(),
  uptime: Type.Number(),
  dependencies: Type.Object({
    database: Type.Union([Type.Literal('connected'), Type.Literal('disconnected')]),
    auth0: Type.Union([Type.Literal('connected'), Type.Literal('disconnected')]),
  }),
}, { $id: 'HealthResponse' });