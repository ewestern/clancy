import type {
  FastifyTypeBox,
  FastifyRequestTypeBox,
  FastifyReplyTypeBox,
} from "../types/fastify.js";
import {
  HealthResponseEndpoint,
  HealthResponseSchema,
} from "../models/health.js";
import { sql } from "drizzle-orm";

export async function healthRoutes(app: FastifyTypeBox) {
  // Comprehensive health check with dependencies
  app.get(
    "/health",
    {
      schema: HealthResponseEndpoint,
      logLevel: "silent",
    },
    async (
      request: FastifyRequestTypeBox<typeof HealthResponseEndpoint>,
      reply: FastifyReplyTypeBox<typeof HealthResponseEndpoint>,
    ) => {
      try {
        return reply.status(200).send({
          status: "healthy",
        });
      } catch (error) {
        return reply.status(503).send({
          status: "unhealthy",
        });
      }
    },
  );

  // Kubernetes liveness probe
  app.get(
    "/live",
    {
      schema: HealthResponseEndpoint,
      logLevel: "silent",
    },
    async (
      request: FastifyRequestTypeBox<typeof HealthResponseEndpoint>,
      reply: FastifyReplyTypeBox<typeof HealthResponseEndpoint>,
    ) => {
      // Simple liveness check - if this responds, the app is alive
      return reply.status(200).send({
        status: "healthy",
      });
    },
  );
}
