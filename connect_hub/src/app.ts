import Fastify from "fastify";
import swagger from "@fastify/swagger";
import apiReference from "@scalar/fastify-api-reference";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import packageJson from "../package.json" with { type: "json" };
import { registerServices } from "./services/index.js";
import { registerRoutes } from "./routes/index.js";
import { registerMiddleware } from "./middleware/index.js";
import { registerDatabase } from "./plugins/database.js";

export async function createApp() {
  const app = Fastify({
    logger: {
      level: "info",
    },
  }).withTypeProvider<TypeBoxTypeProvider>();

  // Register Swagger for OpenAPI generation
  await app.register(swagger, {
    hideUntagged: true,
    openapi: {
      openapi: "3.0.0",
      info: {
        title: "ConnectHub API",
        description:
          "Unified integration, token, and proxy layer for Clancy Digital-Employees",
        version: packageJson.version,
      },
      servers: [
        {
          url: `http://localhost:3000`,
          description: "Development server",
        },
      ],
      tags: [
        { name: "Health", description: "Health check endpoints" },
        { name: "OAuth", description: "OAuth flow endpoints" },
        { name: "Proxy", description: "API proxy endpoints" },
        { name: "Catalog", description: "Integration catalog endpoints" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
      externalDocs: {
        url: "https://swagger.io",
        description: "Find more info here",
      },
    },
    refResolver: {
      buildLocalReference(json, baseUri, fragment, i) {
        if (!json.title && json.$id) {
          json.title = json.$id;
        }
        // Fallback if no $id is present
        if (!json.$id) {
          return `def-${i}`;
        }
        return `${json.$id}`;
      },
    },
  });

  // OpenAPI JSON endpoint
  app.get("/openapi.json", async () => {
    return app.swagger();
  });

  // API Reference UI
  await app.register(apiReference, {
    routePrefix: "/reference",
    configuration: {
      url: "/openapi.json",
    },
  });

  // Register database
  await app.register(registerDatabase);

  // Register services
  await registerServices(app);

  // Register middleware
  await registerMiddleware(app);

  // Register routes
  await registerRoutes(app);

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down gracefully`);

    try {
      await app.close();
      app.log.info("Application closed successfully");
      process.exit(0);
    } catch (error) {
      app.log.error("Error during shutdown:", error);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  return app;
}
