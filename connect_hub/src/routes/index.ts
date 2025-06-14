import type { FastifyTypeBox } from "../types/fastify.js";
import { healthRoutes } from "./health.routes.js";
import { capabilitiesRoutes } from "./capabilities.js";
import { promptRoutes } from "./prompt.js";

export async function registerRoutes(app: FastifyTypeBox) {
  // Register health routes
  await app.register(healthRoutes);
  await app.register(capabilitiesRoutes);
  await app.register(promptRoutes);

  app.log.info("All routes registered successfully");
}
