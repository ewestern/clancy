import type { FastifyTypeBox } from "../types/fastify.js";
import { healthRoutes } from "./health.routes.js";
import { capabilitiesRoutes } from "./capabilities.js";
import { oauthRoutes } from "./oauth.js";
import { proxyRoutes } from "./proxy.js";
import { webhookRoutes } from "./webhooks.js";
import { websocketRoutes } from "./ws.js";

export async function registerRoutes(app: FastifyTypeBox) {
  // Register health routes
  await app.register(healthRoutes);
  await app.register(capabilitiesRoutes);
  await app.register(oauthRoutes);
  await app.register(proxyRoutes);
  await app.register(webhookRoutes);
  
  // Register WebSocket routes
  await app.register(websocketRoutes, { prefix: "/ws" });

  app.log.info("All routes registered successfully");
}
