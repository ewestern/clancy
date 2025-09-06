// Health Check Schema
import { Type } from "@sinclair/typebox";

export const HealthResponseSchema = Type.Object(
  {
    status: Type.Union([Type.Literal("healthy"), Type.Literal("unhealthy")]),
  },
  { $id: "HealthResponse" },
);

export const HealthResponseEndpoint = {
  tags: ["Health"],
  description: "Comprehensive health check with dependencies",
  response: {
    200: HealthResponseSchema,
    503: HealthResponseSchema,
  },
};
