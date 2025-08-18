import Fastify from "fastify";
import swagger from "@fastify/swagger";
import apiReference from "@scalar/fastify-api-reference";
import fastifyWebsocket from "@fastify/websocket";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import packageJson from "../package.json" with { type: "json" };
import { registerRoutes } from "./routes/index.js";
import registerOauthProviders from "./plugins/oauth_providers.js";
import registerDatabase from "./plugins/database.js";
import { registerAuth } from "./plugins/auth.js";
import fastifyRawBody from "fastify-raw-body";
import { clerkPlugin } from "@clerk/fastify";
import { startScheduler, stopScheduler } from "./subscriptions/scheduler.js";
const __dirname = import.meta.dirname;
import path from "path";
const publicDir = path.join(__dirname, "../public");

export async function createApp() {
  const app = Fastify({
    logger: {
      level: "info",
    },
  }).withTypeProvider<TypeBoxTypeProvider>();
  await app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "HEAD", "PUT", "DELETE", "OPTIONS"],
  });
  // Promote ?sessionToken=... to Authorization header so Clerk can validate websocket requests
  // This must run before the clerkPlugin registration so it executes earlier in the onRequest phase.
  app.addHook("onRequest", async (request) => {
    const { sessionToken } = request.query as {
      sessionToken?: string;
    };
    if (sessionToken && !request.headers.authorization) {
      request.headers.authorization = `Bearer ${sessionToken}`;
    }
  });
  await app.register(clerkPlugin, {
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY!,
    secretKey: process.env.CLERK_SECRET_KEY!,
  });

  await app.register(registerAuth);

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
  await app.register(registerOauthProviders);

  // Register raw body
  await app.register(fastifyRawBody, {
    global: false,
  });

  await app.register(fastifyStatic, {
    root: publicDir,
    prefix: "/public/",
  });

  // Register routes
  await registerRoutes(app);

  // Start subscription renewal scheduler
  startScheduler(app.db);

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down gracefully`);

    try {
      stopScheduler();
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
