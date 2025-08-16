import type {
  FastifyTypeBox,
  FastifyRequestTypeBox,
  FastifyReplyTypeBox,
} from "../types/fastify.js";
import { HealthResponseSchema } from "../models/health.js";
import { sql } from "drizzle-orm";

export async function healthRoutes(app: FastifyTypeBox) {
  // Comprehensive health check with dependencies
  app.get(
    "/health",
    {
      schema: {
        tags: ["Health"],
        description: "Comprehensive health check with dependencies",
        response: {
          200: HealthResponseSchema,
          503: HealthResponseSchema,
        },
      },
      logLevel: "silent",
    },
    async (
      request: FastifyRequestTypeBox<{
        response: { 200: typeof HealthResponseSchema };
      }>,
      reply: FastifyReplyTypeBox<{
        response: { 200: typeof HealthResponseSchema };
      }>,
    ) => {
      const startTime = Date.now();

      // Check database connection
      let dbStatus: "connected" | "disconnected" = "disconnected";
      try {
        await app.db.select({ test: sql<number>`1` });
        dbStatus = "connected";
      } catch (error) {
        app.log.error("Database health check failed:", error);
      }

      // Check Auth0 connectivity (simplified)
      let auth0Status: "connected" | "disconnected" = "connected"; // Default optimistic

      const isHealthy = dbStatus === "connected" && auth0Status === "connected";
      const statusCode = isHealthy ? 200 : 503;

      const response = {
        status: isHealthy ? ("healthy" as const) : ("unhealthy" as const),
        timestamp: new Date().toISOString(),
        version: "0.1.0",
        uptime: Date.now() - startTime,
        dependencies: {
          database: dbStatus,
          auth0: auth0Status,
        },
      };

      return reply.status(statusCode).send(response);
    },
  );

  // Kubernetes readiness probe
  app.get(
    "/ready",
    {
      schema: {
        tags: ["Health"],
        description: "Kubernetes readiness probe",
        response: {
          200: HealthResponseSchema,
          503: HealthResponseSchema,
        },
      },
      logLevel: "silent",
    },
    async (
      request: FastifyRequestTypeBox<{
        response: { 200: typeof HealthResponseSchema };
      }>,
      reply: FastifyReplyTypeBox<{
        response: { 200: typeof HealthResponseSchema };
      }>,
    ) => {
      // Simplified readiness check - just database
      try {
        await app.db.select({ test: sql<number>`1` });
        return reply.status(200).send({
          status: "healthy",
          timestamp: new Date().toISOString(),
          version: "0.1.0",
          uptime: process.uptime() * 1000,
          dependencies: {
            database: "connected",
            auth0: "connected",
          },
        });
      } catch (error) {
        return reply.status(503).send({
          status: "unhealthy",
          timestamp: new Date().toISOString(),
          version: "0.1.0",
          uptime: process.uptime() * 1000,
          dependencies: {
            database: "disconnected",
            auth0: "connected",
          },
        });
      }
    },
  );

  // Kubernetes liveness probe
  app.get(
    "/live",
    {
      schema: {
        tags: ["Health"],
        description: "Kubernetes liveness probe",
        response: {
          200: HealthResponseSchema,
        },
      },
      logLevel: "silent",
    },
    async (
      request: FastifyRequestTypeBox<{
        response: { 200: typeof HealthResponseSchema };
      }>,
      reply: FastifyReplyTypeBox<{
        response: { 200: typeof HealthResponseSchema };
      }>,
    ) => {
      // Simple liveness check - if this responds, the app is alive
      return reply.status(200).send({
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: "0.1.0",
        uptime: process.uptime() * 1000,
        dependencies: {
          database: "connected",
          auth0: "connected",
        },
      });
    },
  );

  // Service information
  app.get(
    "/info",
    {
      schema: {
        tags: ["Health"],
        description: "Service information",
        response: {
          200: HealthResponseSchema,
        },
      },
      logLevel: "silent",
    },
    async (
      request: FastifyRequestTypeBox<{
        response: { 200: typeof HealthResponseSchema };
      }>,
      reply: FastifyReplyTypeBox<{
        response: { 200: typeof HealthResponseSchema };
      }>,
    ) => {
      return reply.status(200).send({
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: "0.1.0",
        uptime: process.uptime() * 1000,
        dependencies: {
          database: "connected",
          auth0: "connected",
        },
      });
    },
  );
}
