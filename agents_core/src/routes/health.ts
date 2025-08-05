import { FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";
import { HealthResponseSchema } from "../models/shared.js";
import packageJson from "../../package.json" with { type: "json" };
import { sql } from "drizzle-orm";

const healthSchema = {
  response: {
    200: HealthResponseSchema,
    503: HealthResponseSchema,
  },
};

const simpleHealthSchema = {
  response: {
    200: Type.Object({
      status: Type.String(),
      timestamp: Type.String({ format: "date-time" }),
    }),
  },
};

const infoSchema = {
  response: {
    200: Type.Object({
      name: Type.String(),
      version: Type.String(),
      description: Type.String(),
      nodeEnv: Type.String(),
    }),
  },
};

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  // Comprehensive health check
  fastify.get("/health", {
    schema: healthSchema,
    logLevel: "silent",
    handler: async (request, reply) => {
      const timestamp = new Date().toISOString();

      try {
        // Check database connection
        await fastify.db.execute(sql`SELECT 1`);
        const dbStatus = "healthy";

        // TODO: Add other health checks (Redis, external services)
        const redisStatus = "healthy"; // Placeholder
        const connectHubStatus = "healthy"; // Placeholder
        const authServiceStatus = "healthy"; // Placeholder

        const isHealthy =
          dbStatus === "healthy" &&
          redisStatus === "healthy" &&
          connectHubStatus === "healthy" &&
          authServiceStatus === "healthy";

        const response = {
          status: isHealthy ? ("healthy" as const) : ("unhealthy" as const),
          timestamp,
          version: packageJson.version,
          dependencies: {
            database: dbStatus as "healthy" | "unhealthy",
            redis: redisStatus as "healthy" | "unhealthy",
            connectHub: connectHubStatus as "healthy" | "unhealthy",
            authService: authServiceStatus as "healthy" | "unhealthy",
          },
        };

        return reply.status(isHealthy ? 200 : 503).send(response);
      } catch (error) {
        const response = {
          status: "unhealthy" as const,
          timestamp,
          version: packageJson.version,
          dependencies: {
            database: "unhealthy" as const,
            redis: "unhealthy" as const,
            connectHub: "unhealthy" as const,
            authService: "unhealthy" as const,
          },
        };

        return reply.status(503).send(response);
      }
    },
  });

  // Kubernetes readiness probe
  fastify.get("/ready", {
    schema: simpleHealthSchema,
    logLevel: "silent",
    handler: async (request, reply) => {
      try {
        await fastify.db.execute(sql`SELECT 1`);
        return reply.send({
          status: "ready",
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        return reply.status(503).send({
          status: "not ready",
          timestamp: new Date().toISOString(),
        });
      }
    },
  });

  // Kubernetes liveness probe
  fastify.get("/live", {
    schema: simpleHealthSchema,
    logLevel: "silent",
    handler: async (request, reply) => {
      return reply.send({
        status: "alive",
        timestamp: new Date().toISOString(),
      });
    },
  });

  // Service information
  fastify.get("/info", {
    schema: infoSchema,
    logLevel: "silent",
    handler: async (request, reply) => {
      return reply.send({
        name: packageJson.name,
        version: packageJson.version,
        description: packageJson.description,
        nodeEnv: process.env.NODE_ENV,
      });
    },
  });

  // Metrics endpoint (placeholder)
  fastify.get("/metrics", {
    logLevel: "silent",
    handler: async (request, reply) => {
      // TODO: Implement Prometheus metrics
      return reply.type("text/plain").send("# Metrics not implemented yet\n");
    },
  });
};
