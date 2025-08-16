import type { FastifyTypeBox } from "../types/fastify.js";
import { healthRoutes } from "./health.routes.js";
import { capabilitiesRoutes } from "./capabilities.js";
import { oauthRoutes } from "./oauth.js";
import { proxyRoutes } from "./proxy.js";
import { webhookRoutes } from "./webhooks.js";
import { triggerRoutes } from "./triggers.js";
import { providersRoutes } from "./providers.js";
import { connectionRoutes } from "./connection.js";
import { documentsRoutes } from "./documents.js";
import { tagsRoutes } from "./tags.js";

export async function registerRoutes(app: FastifyTypeBox) {
  // Register health routes
  await app.register(healthRoutes);
  await app.register(capabilitiesRoutes);
  await app.register(oauthRoutes);
  await app.register(proxyRoutes);
  await app.register(webhookRoutes);
  await app.register(triggerRoutes);
  await app.register(providersRoutes);
  await app.register(connectionRoutes);
  await app.register(documentsRoutes);
  await app.register(tagsRoutes);

  app.log.info("All routes registered successfully");
}
