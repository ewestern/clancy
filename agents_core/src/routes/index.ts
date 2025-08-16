import { FastifyTypeBox } from "../types/fastify.js";
import { healthRoutes } from "./health.js";
import { agentRoutes } from "./agents.js";
import { approvalRoutes } from "./approvals.js";
import { webhookRoutes } from "./webhook.js";
import { websocketRoutes } from "./ws.js";
import { employeeRoutes } from "./employees.js";
import { runRoutes } from "./runs.js";

export async function registerRoutes(app: FastifyTypeBox) {
  await app.register(healthRoutes, { prefix: "" });
  await app.register(agentRoutes, { prefix: "/v1" });
  await app.register(employeeRoutes, { prefix: "/v1" });
  await app.register(approvalRoutes, { prefix: "/v1" });
  await app.register(runRoutes, { prefix: "/v1" });
  await app.register(webhookRoutes, { prefix: "" });
  await app.register(websocketRoutes, { prefix: "/ws" });
}
